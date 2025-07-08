// src/app/carpets/data-access/carpet-storage.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { IndexedDbService } from '@shared/data-access/indexed-db.service';
import { AuthStore } from '@auth/data-access/auth.store';
import { environment } from '../../../environments/environment';
import { CarpetPhotoData, PhotoStats } from '@shared/utils/carpet-photo.models';
import { Pub } from '../../pubs/utils/pub.models';
import { Storage } from '@angular/fire/storage';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { PubStore } from '../../pubs/data-access/pub.store';


type CarpetImageData = {
  userId: string;        // ✅ Associate carpet with user
  pubId: string;
  pubName: string;
  date: string;
  dateKey: string;
  blob: Blob;
  size: number;
  type: string;
  width: number;
  height: number;
};

type ImageFormat = 'avif' | 'webp' | 'jpeg';

@Injectable({ providedIn: 'root' })
export class CarpetStorageService {
  private readonly indexedDb = inject(IndexedDbService);
  private readonly authStore = inject(AuthStore);
  private readonly storage = inject(Storage);
  private readonly pubStore = inject(PubStore);

  // Signals for reactive state
  private readonly _carpetCount = signal(0);
  private readonly _totalSize = signal(0);
  private readonly _loading = signal(false);

  readonly carpetCount = this._carpetCount.asReadonly();
  readonly totalSize = this._totalSize.asReadonly();
  readonly loading = this._loading.asReadonly();

  private initialized = false;
  private initializing = false; // ✅ Guard against multiple simultaneous initializations
  private supportedFormats: Set<ImageFormat> = new Set();

  private getDatabaseConfig() {
    if (!environment.database) {
      throw new Error('Database configuration is missing from environment');
    }
    return environment.database;
  }

  /**
   * Initialize the database and detect supported formats
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[CarpetStorage] Already initialized');
      return;
    }

    if (this.initializing) {
      console.log('[CarpetStorage] ⚠️ Initialization already in progress, waiting...');
      // Wait for initialization to complete
      while (this.initializing && !this.initialized) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      return;
    }

    this.initializing = true;
    console.log('[CarpetStorage] Initializing IndexedDB for carpet storage...');

    try {
      // ✅ Using environment configuration
      const dbConfig = this.getDatabaseConfig();
      
      await this.indexedDb.openDatabase({
        name: dbConfig.name,
        version: dbConfig.version,
        stores: [{
          name: dbConfig.stores.carpets,
          indexes: [
            { name: 'userId', keyPath: 'userId' },     // ✅ Index by user
            { name: 'pubId', keyPath: 'pubId' },
            { name: 'dateKey', keyPath: 'dateKey' },
            { name: 'date', keyPath: 'date' }
          ]
        }]
      });

      // Detect supported image formats
      await this.detectSupportedFormats();

      // Load initial stats for current user
      await this.updateStats();

      this.initialized = true;
      this.initializing = false; // ✅ Clear initializing flag
      console.log('[CarpetStorage] Initialization complete');

      // ✅ Update stats after initialization is complete (safe to call getUserCarpets now)
      await this.updateStats();
    } catch (error) {
      this.initializing = false; // ✅ Clear flag on error
      console.error('[CarpetStorage] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Detect which modern image formats are supported with comprehensive testing
   */
  private async detectSupportedFormats(): Promise<void> {
    console.log('[CarpetStorage] 🚀 === FORMAT DETECTION STARTED ===');
    console.log('[CarpetStorage] 🔍 Testing browser support for modern image formats...');

    // Clear any existing formats
    this.supportedFormats.clear();

    // Test AVIF support
    console.log('[CarpetStorage] 🧪 Testing AVIF support...');
    try {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 10; // Slightly larger for better testing
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#FF0000'; // Red square for testing
      ctx.fillRect(0, 0, 10, 10);
      
      const blob = await new Promise<Blob | null>(resolve =>
        canvas.toBlob(resolve, 'image/avif', 0.8)
      );
      
      if (blob) {
        console.log('[CarpetStorage] 📋 AVIF blob created:', {
          size: blob.size,
          type: blob.type,
          expectedType: 'image/avif'
        });
        
        // Verify the blob type matches what we requested
        if (blob.type === 'image/avif') {
          this.supportedFormats.add('avif');
          console.log('[CarpetStorage] ✅ AVIF: SUPPORTED (blob type matches)');
        } else {
          console.log('[CarpetStorage] ❌ AVIF: FAILED (wrong blob type:', blob.type, ')');
        }
      } else {
        console.log('[CarpetStorage] ❌ AVIF: FAILED (no blob created)');
      }
    } catch (error) {
      console.log('[CarpetStorage] ❌ AVIF: FAILED (exception:', error, ')');
    }

    // Test WebP support
    console.log('[CarpetStorage] 🧪 Testing WebP support...');
    try {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 10;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#00FF00'; // Green square for testing
      ctx.fillRect(0, 0, 10, 10);
      
      const blob = await new Promise<Blob | null>(resolve =>
        canvas.toBlob(resolve, 'image/webp', 0.8)
      );
      
      if (blob) {
        console.log('[CarpetStorage] 📋 WebP blob created:', {
          size: blob.size,
          type: blob.type,
          expectedType: 'image/webp'
        });
        
        // Verify the blob type matches what we requested
        if (blob.type === 'image/webp') {
          this.supportedFormats.add('webp');
          console.log('[CarpetStorage] ✅ WebP: SUPPORTED (blob type matches)');
        } else {
          console.log('[CarpetStorage] ❌ WebP: FAILED (wrong blob type:', blob.type, ')');
        }
      } else {
        console.log('[CarpetStorage] ❌ WebP: FAILED (no blob created)');
      }
    } catch (error) {
      console.log('[CarpetStorage] ❌ WebP: FAILED (exception:', error, ')');
    }

    // Test JPEG support (should always work)
    console.log('[CarpetStorage] 🧪 Testing JPEG support...');
    try {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 10;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#0000FF'; // Blue square for testing
      ctx.fillRect(0, 0, 10, 10);
      
      const blob = await new Promise<Blob | null>(resolve =>
        canvas.toBlob(resolve, 'image/jpeg', 0.8)
      );
      
      if (blob && blob.type === 'image/jpeg') {
        this.supportedFormats.add('jpeg');
        console.log('[CarpetStorage] ✅ JPEG: SUPPORTED (as expected)');
      } else {
        console.log('[CarpetStorage] ⚠️ JPEG: Unexpected failure, adding anyway');
        this.supportedFormats.add('jpeg'); // Fallback
      }
    } catch (error) {
      console.log('[CarpetStorage] ⚠️ JPEG: Exception occurred, adding anyway:', error);
      this.supportedFormats.add('jpeg'); // Fallback
    }

    const finalFormats = Array.from(this.supportedFormats);
    console.log('[CarpetStorage] 🎯 === FORMAT DETECTION COMPLETE ===');
    console.log('[CarpetStorage] 📋 Final supported formats:', finalFormats);
    console.log('[CarpetStorage] 📊 Format count:', finalFormats.length);
    
    if (finalFormats.length === 0) {
      console.log('[CarpetStorage] ⚠️ WARNING: No formats detected, something is wrong!');
    }
  }


/**
 * ✅ Save photo from carpet data (replaces PhotoStorageService method)
 * Now properly resizes images to 400x400 like saveCarpetImage()
 */
async savePhotoFromCarpetData(photoData: CarpetPhotoData, pub: Pub): Promise<void> {
  console.log('📸 [CarpetStorage] === SAVE PHOTO FROM CARPET DATA ===');
  console.log('📸 [CarpetStorage] Input data:', {
    filename: photoData.filename,
    format: photoData.format,
    sizeKB: photoData.sizeKB,
    blobActualSize: photoData.blob.size,
    blobType: photoData.blob.type,
    pubId: pub.id,
    pubName: pub.name,
    hasMetadata: !!photoData.metadata
  });

  try {
    await this.ensureInitialized();

    const userId = this.authStore.uid();
    if (!userId) {
      throw new Error('User must be authenticated to save photos');
    }

    this._loading.set(true);

    // ✅ FIXED: Actually resize the image to 400x400 instead of just storing original blob
    console.log('📸 [CarpetStorage] Resizing image from blob to 400x400...');

    // Create image from blob to get original dimensions
    const img = new Image();
    const imageLoadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image from blob'));
      img.src = URL.createObjectURL(photoData.blob);
    });

    const loadedImg = await imageLoadPromise;
    console.log('📸 [CarpetStorage] Original image dimensions:', {
      width: loadedImg.width,
      height: loadedImg.height
    });

    // TODO: Revisit this
    // Create 400x400 square crop canvas (same logic as saveCarpetImage)
    const resizeCanvas = document.createElement('canvas');
    resizeCanvas.width = resizeCanvas.height = 400;
    const ctx = resizeCanvas.getContext('2d')!;

    // Draw centered square crop - scaled to fit
    const sourceSize = Math.min(loadedImg.width, loadedImg.height);
    const sx = (loadedImg.width - sourceSize) / 2;
    const sy = (loadedImg.height - sourceSize) / 2;

    ctx.drawImage(
      loadedImg,
      sx, sy, sourceSize, sourceSize,  // Source rectangle (square crop from center)
      0, 0, 400, 400                   // Destination rectangle (400x400)
    );

    // Clean up the object URL
    URL.revokeObjectURL(img.src);

    // Convert to blob with best supported format (same logic as saveCarpetImage)
    const { format, mimeType, quality } = this.getBestFormat();
    console.log('📸 [CarpetStorage] Using format:', format, 'quality:', quality);

    const resizedBlob = await new Promise<Blob>((resolve, reject) => {
      resizeCanvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create resized blob'));
          }
        },
        mimeType,
        quality
      );
    });

    console.log('📸 [CarpetStorage] Resized image:', {
      originalSize: `${(photoData.blob.size / 1024).toFixed(1)}KB`,
      resizedSize: `${(resizedBlob.size / 1024).toFixed(1)}KB`,
      reduction: `${(((photoData.blob.size - resizedBlob.size) / photoData.blob.size) * 100).toFixed(1)}%`
    });

    // Create carpet data with properly resized blob
    const carpetData: CarpetImageData = {
      userId: userId,
      pubId: pub.id,
      pubName: pub.name,
      date: new Date().toISOString(),
      dateKey: photoData.filename.replace('.webp', '').replace('.jpeg', ''),
      blob: resizedBlob, // ✅ Now using properly resized blob
      size: resizedBlob.size,
      type: resizedBlob.type,
      width: 400, // ✅ Now actually 400x400
      height: 400
    };

    // Save resized image
    const key = `${userId}_${carpetData.pubId}_${carpetData.dateKey}`;
    const dbConfig = this.getDatabaseConfig();
    await this.indexedDb.put(
      dbConfig.name,
      dbConfig.stores.carpets,
      carpetData,
      key
    );
    await this.updateStats();
    console.log('✅ [CarpetStorage] Photo saved successfully with proper 400x400 resize');

  } catch (error) {
    console.error('❌ [CarpetStorage] Save photo failed:', error);
    throw error;
  } finally {
    this._loading.set(false);
  }
}


/**
 * ✅ Get storage statistics (replaces PhotoStorageService method)
 */
async getStorageStats(): Promise<PhotoStats> {
  console.log('📊 [CarpetStorage] Getting storage stats...');

  try {
    await this.ensureInitialized();

    const userCarpets = await this.getUserCarpets();
    const totalSize = userCarpets.reduce((sum, carpet) => sum + carpet.size, 0);

    // Format breakdown
    const formats = userCarpets.reduce((acc, carpet) => {
      const format = carpet.type.includes('webp') ? 'webp' : 'jpeg';
      if (!acc[format]) {
        acc[format] = { count: 0, sizeKB: 0 };
      }
      acc[format].count++;
      acc[format].sizeKB += Math.round(carpet.size / 1024);
      return acc;
    }, {} as Record<string, { count: number; sizeKB: number }>);

    // Calculate estimated savings vs Base64 JPEG
    const estimatedBase64Size = totalSize * 1.33; // Base64 overhead
    const webpCount = formats['webp']?.count || 0;
    const totalSavingsKB = Math.round((estimatedBase64Size - totalSize) / 1024);

    const stats: PhotoStats = {
      count: userCarpets.length,
      totalSizeKB: Math.round(totalSize / 1024),
      formats,
      estimatedSavings: `${totalSavingsKB}KB saved vs Base64 JPEG`,
      averageSizeKB: userCarpets.length > 0 ? Math.round(totalSize / 1024 / userCarpets.length) : 0
    };

    console.log('📊 [CarpetStorage] Stats:', stats);
    return stats;

  } catch (error) {
    console.error('❌ [CarpetStorage] Failed to get stats:', error);
    return {
      count: 0,
      totalSizeKB: 0,
      formats: {},
      estimatedSavings: '0KB',
      averageSizeKB: 0
    };
  }
}


/**
 * ✅ Get photo as displayable URL (replaces PhotoStorageService method)
 */
async getPhotoUrl(filename: string): Promise<string | null> {
  console.log(`🖼️ [CarpetStorage] Getting photo URL for: ${filename}`);

  // Type validation - ensure filename is a string
  if (typeof filename !== 'string' || !filename) {
    console.error(`❌ [CarpetStorage] Invalid filename type: ${typeof filename}, value:`, filename);
    return null;
  }

  try {
    // For carpet storage, we need to find by filename pattern
    const userCarpets = await this.getUserCarpets();
    const carpet = userCarpets.find(c =>
      c.dateKey.includes(filename.replace('.webp', '').replace('.jpeg', ''))
    );

    if (!carpet) {
      console.log(`❌ [CarpetStorage] Photo not found: ${filename}`);
      return null;
    }

    const url = URL.createObjectURL(carpet.blob);
    console.log(`✅ [CarpetStorage] Created display URL for: ${filename}`);
    return url;

  } catch (error) {
    console.error('❌ [CarpetStorage] Failed to get photo URL:', error);
    return null;
  }
}


/**
 * 💾 Store local version (600x600 AVIF for UI) - Used by CarpetStrategyService
 */
async storeLocalVersion(blob: Blob, pubId: string, pubName: string): Promise<string> {
  console.log('[CarpetStorage] 💾 Storing local version for:', pubName);
  console.log('[CarpetStorage] 📊 Blob size:', (blob.size / 1024).toFixed(1) + 'KB');

  const userId = this.authStore.uid();
  if (!userId) {
    throw new Error('No authenticated user found');
  }

  await this.ensureInitialized();

  const dateKey = `${pubName.toLowerCase().replace(/\s+/g, '-')}_${new Date().toISOString().split('T')[0]}`;
  
  const carpetData: CarpetImageData = {
    userId,
    pubId,
    pubName,
    date: new Date().toISOString(),
    dateKey,
    blob,
    size: blob.size,
    type: blob.type,
    width: 600,
    height: 600
  };

  const key = `${userId}_${pubId}_${dateKey}`;
  const dbConfig = this.getDatabaseConfig();
  await this.indexedDb.put(dbConfig.name, dbConfig.stores.carpets, carpetData, key);
  
  await this.updateStats();
  
  console.log('[CarpetStorage] ✅ Local carpet stored with key:', key);
  return key;
}

/**
 * ✅ Helper to revoke object URLs (prevent memory leaks)
 */
revokePhotoUrl(url: string): void {
  URL.revokeObjectURL(url);
  console.log(`🧹 [CarpetStorage] Revoked object URL`);
}



  /**
   * Get best available image format with higher quality for storage
   */
  private getBestFormat(): { format: ImageFormat; mimeType: string; quality: number } {
    console.log('[CarpetStorage] 🎯 === FORMAT SELECTION PROCESS ===');
    console.log('[CarpetStorage] 📋 Available formats:', Array.from(this.supportedFormats));
    console.log('[CarpetStorage] 📊 Format count:', this.supportedFormats.size);
    
    // Check if we even have formats detected
    if (this.supportedFormats.size === 0) {
      console.log('[CarpetStorage] ⚠️ WARNING: No supported formats detected, defaulting to JPEG');
      return { format: 'jpeg', mimeType: 'image/jpeg', quality: 0.95 };
    }
    
    // Test AVIF first (best compression)
    console.log('[CarpetStorage] 🔍 Checking for AVIF support...');
    if (this.supportedFormats.has('avif')) {
      console.log('[CarpetStorage] ✅ AVIF is available - SELECTED');
      console.log('[CarpetStorage] 📋 Returning: { format: avif, mimeType: image/avif, quality: 0.95 }');
      return { format: 'avif', mimeType: 'image/avif', quality: 0.95 };
    } else {
      console.log('[CarpetStorage] ❌ AVIF not available, checking WebP...');
    }
    
    // Test WebP second (good compression)
    console.log('[CarpetStorage] 🔍 Checking for WebP support...');
    if (this.supportedFormats.has('webp')) {
      console.log('[CarpetStorage] ✅ WebP is available - SELECTED');
      console.log('[CarpetStorage] 📋 Returning: { format: webp, mimeType: image/webp, quality: 0.95 }');
      return { format: 'webp', mimeType: 'image/webp', quality: 0.95 };
    } else {
      console.log('[CarpetStorage] ❌ WebP not available, falling back to JPEG...');
    }
    
    // Fallback to JPEG (always supported)
    console.log('[CarpetStorage] 🔄 Using JPEG fallback - SELECTED');
    console.log('[CarpetStorage] 📋 Returning: { format: jpeg, mimeType: image/jpeg, quality: 0.95 }');
    console.log('[CarpetStorage] 🎯 === FORMAT SELECTION COMPLETE ===');
    return { format: 'jpeg', mimeType: 'image/jpeg', quality: 0.95 };
  }

/**
   * Save carpet image with user association
   */
async saveCarpetImage(
  canvas: HTMLCanvasElement,
  pubId: string,
  pubName: string
): Promise<string> {
  console.log('[CarpetStorage] Saving carpet image for pub:', pubName);

  // ✅ Get current user ID
  const userId = this.authStore.uid();
  if (!userId) {
    throw new Error('[CarpetStorage] No authenticated user found');
  }

  this._loading.set(true);

  try {
    await this.ensureInitialized();

    // Create high-quality capture canvas with aspect ratio preservation
    const captureCanvas = document.createElement('canvas');
    
    // Option 1: Preserve aspect ratio at high resolution
    const maxDimension = 1200;
    const aspectRatio = canvas.width / canvas.height;
    
    if (aspectRatio > 1) {
      // Landscape: width is larger
      captureCanvas.width = maxDimension;
      captureCanvas.height = Math.round(maxDimension / aspectRatio);
    } else {
      // Portrait or square: height is larger or equal
      captureCanvas.height = maxDimension;
      captureCanvas.width = Math.round(maxDimension * aspectRatio);
    }
    
    console.log('[CarpetStorage] 📐 Original canvas:', `${canvas.width}x${canvas.height}`);
    console.log('[CarpetStorage] 📐 Target canvas:', `${captureCanvas.width}x${captureCanvas.height}`);
    console.log('[CarpetStorage] 📐 Aspect ratio preserved:', aspectRatio.toFixed(2));
    
    const ctx = captureCanvas.getContext('2d')!;
    
    // Enable high-quality scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw with full source image preserving aspect ratio
    ctx.drawImage(
      canvas,
      0, 0, canvas.width, canvas.height,           // Full source
      0, 0, captureCanvas.width, captureCanvas.height  // Scaled destination
    );

    // Convert to blob with best supported format
    const { format, mimeType, quality } = this.getBestFormat();
    console.log('[CarpetStorage] 🎨 === BLOB CREATION PROCESS ===');
    console.log('[CarpetStorage] 📋 Target format:', format);
    console.log('[CarpetStorage] 📋 Target MIME type:', mimeType);
    console.log('[CarpetStorage] 📋 Target quality:', quality);

    console.log('[CarpetStorage] 🔄 Calling canvas.toBlob()...');
    const blob = await new Promise<Blob>((resolve, reject) => {
      captureCanvas.toBlob(
        (blob) => {
          if (blob) {
            console.log('[CarpetStorage] ✅ Blob created successfully');
            console.log('[CarpetStorage] 📊 Actual blob details:', {
              size: blob.size,
              type: blob.type,
              sizeKB: `${(blob.size / 1024).toFixed(1)}KB`
            });
            console.log('[CarpetStorage] 🔍 Format verification:', {
              requested: mimeType,
              actual: blob.type,
              matches: blob.type === mimeType ? '✅ MATCH' : '❌ MISMATCH'
            });
            resolve(blob);
          } else {
            console.log('[CarpetStorage] ❌ Blob creation failed - no blob returned');
            reject(new Error('Failed to create blob'));
          }
        },
        mimeType,
        quality
      );
    });
    console.log('[CarpetStorage] 🎨 === BLOB CREATION COMPLETE ===');

    // Generate key with user prefix for organization
    const dateKey = new Date().toISOString().split('T')[0];
    const key = `${userId}_${pubId}_${dateKey}`;

    // ✅ Include userId in data
    const data: CarpetImageData = {
      userId,                                      // ✅ User association
      pubId,
      pubName,
      date: new Date().toISOString(),
      dateKey,
      blob,
      size: blob.size,
      type: blob.type,
      width: 400,
      height: 400
    };

    const dbConfig = this.getDatabaseConfig();
    await this.indexedDb.put(dbConfig.name, dbConfig.stores.carpets, data, key);

    console.log('[CarpetStorage] Image saved successfully:', {
      key,
      userId,
      format,
      size: `${(blob.size / 1024).toFixed(1)}KB`
    });

    // Update stats
    await this.updateStats();

    // Clean up the temporary capture canvas
    captureCanvas.width = 0;
    captureCanvas.height = 0;
    console.log('[CarpetStorage] 🧹 Cleaned up capture canvas');

    // Check if pub needs Firebase Storage upload (async, don't block check-in)
    console.log('[CarpetStorage] 🔍 Checking if Firebase Storage upload is needed for pub:', pubId);
    this.handleFirebaseUpload(blob, pubId).catch(error => {
      console.error('[CarpetStorage] ❌ Firebase upload failed, but continuing with check-in:', error);
    });

    return key;

  } finally {
    this._loading.set(false);
  }
}
  /**
   * Get a carpet image by key
   */
  async getCarpetImage(key: string): Promise<Blob | undefined> {
    console.log('[CarpetStorage] Retrieving carpet image:', key);

    await this.ensureInitialized();

    const dbConfig = this.getDatabaseConfig();
    const data = await this.indexedDb.get<CarpetImageData>(dbConfig.name, dbConfig.stores.carpets, key);
    return data?.blob;
  }

  /**
   * ✅ Get carpets for current user only
   */
  async getUserCarpets(): Promise<CarpetImageData[]> {
    const userId = this.authStore.uid();
    if (!userId) {
      console.warn('[CarpetStorage] No authenticated user, returning empty array');
      return [];
    }

    console.log('[CarpetStorage] Getting carpets for user:', userId);
    await this.ensureInitialized();

    const dbConfig = this.getDatabaseConfig();
    const allCarpets = await this.indexedDb.getAll<CarpetImageData>(dbConfig.name, dbConfig.stores.carpets);
    return allCarpets.filter(carpet => carpet.userId === userId);
  }

  /**
   * ✅ Get carpets for specific user
   */
  async getCarpetsForUser(userId: string): Promise<CarpetImageData[]> {
    console.log('[CarpetStorage] Getting carpets for user:', userId);
    await this.ensureInitialized();

    const dbConfig = this.getDatabaseConfig();
    const allCarpets = await this.indexedDb.getAll<CarpetImageData>(dbConfig.name, dbConfig.stores.carpets);
    return allCarpets.filter(carpet => carpet.userId === userId);
  }

  /**
   * ✅ Get carpets by pub for current user only
   */
  async getCarpetsByPub(pubId: string): Promise<CarpetImageData[]> {
    const userId = this.authStore.uid();
    if (!userId) return [];

    console.log('[CarpetStorage] Getting carpets for pub:', pubId, 'user:', userId);
    await this.ensureInitialized();

    const userCarpets = await this.getUserCarpets();
    return userCarpets.filter(carpet => carpet.pubId === pubId);
  }

  /**
   * Get all carpet images (admin/debug use)
   */
  async getAllCarpets(): Promise<CarpetImageData[]> {
    console.log('[CarpetStorage] Getting all carpets (admin mode)');

    await this.ensureInitialized();

    const dbConfig = this.getDatabaseConfig();
    return this.indexedDb.getAll<CarpetImageData>(dbConfig.name, dbConfig.stores.carpets);
  }

  /**
   * Get all carpet keys
   */
  async getAllCarpetKeys(): Promise<string[]> {
    console.log('[CarpetStorage] Getting all carpet keys');

    await this.ensureInitialized();

    const dbConfig = this.getDatabaseConfig();
    const keys = await this.indexedDb.getAllKeys(dbConfig.name, dbConfig.stores.carpets);
    return keys as string[];
  }

  /**
   * Delete a carpet image
   */
  async deleteCarpet(key: string): Promise<void> {
    console.log('[CarpetStorage] Deleting carpet:', key);

    await this.ensureInitialized();

    const dbConfig = this.getDatabaseConfig();
    await this.indexedDb.delete(dbConfig.name, dbConfig.stores.carpets, key);
    await this.updateStats();
  }

  /**
   * ✅ Clear all carpets for current user only
   */
  async clearUserCarpets(): Promise<void> {
    const userId = this.authStore.uid();
    if (!userId) return;

    console.log('[CarpetStorage] Clearing carpets for user:', userId);
    await this.ensureInitialized();

    const userCarpets = await this.getUserCarpets();
    for (const carpet of userCarpets) {
      const key = `${carpet.userId}_${carpet.pubId}_${carpet.dateKey}`;
      const dbConfig = this.getDatabaseConfig();
    await this.indexedDb.delete(dbConfig.name, dbConfig.stores.carpets, key);
    }

    await this.updateStats();
  }

  /**
   * Clear all carpet images (admin/debug use)
   */
  async clearAllCarpets(): Promise<void> {
    console.log('[CarpetStorage] Clearing all carpets (admin mode)');

    await this.ensureInitialized();

    const dbConfig = this.getDatabaseConfig();
    await this.indexedDb.clear(dbConfig.name, dbConfig.stores.carpets);
    await this.updateStats();
  }

  /**
   * ✅ Update statistics for current user
   */
  private async updateStats(): Promise<void> {
    const userId = this.authStore.uid();
    if (!userId) {
      this._carpetCount.set(0);
      this._totalSize.set(0);
      return;
    }

    // ✅ Guard against calling getUserCarpets during initialization to prevent circular dependency
    if (!this.initialized) {
      console.log('[CarpetStorage] Skipping stats update during initialization');
      this._carpetCount.set(0);
      this._totalSize.set(0);
      return;
    }

    const userCarpets = await this.getUserCarpets();
    const count = userCarpets.length;
    const totalSize = userCarpets.reduce((sum, carpet) => sum + carpet.size, 0);

    this._carpetCount.set(count);
    this._totalSize.set(totalSize);

    console.log('[CarpetStorage] User stats updated:', {
      userId,
      count,
      totalSize: `${(totalSize / 1024 / 1024).toFixed(2)}MB`
    });
  }

  /**
   * Get storage estimate
   */
  async getStorageInfo(): Promise<{
    used: number;
    quota: number;
    percentage: number;
  } | null> {
    const estimate = await this.indexedDb.getStorageEstimate();

    if (estimate && estimate.usage && estimate.quota) {
      return {
        used: estimate.usage,
        quota: estimate.quota,
        percentage: (estimate.usage / estimate.quota) * 100
      };
    }

    return null;
  }

  /**
   * Ensure database is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Upload carpet image to Firebase Storage
   */
  private async uploadToFirebaseStorage(blob: Blob, pubId: string): Promise<string | null> {
    try {
      console.log('[CarpetStorage] 🔄 Starting Firebase Storage upload...');
      console.log('[CarpetStorage] 📋 Target pub:', pubId);
      console.log('[CarpetStorage] 📋 File size:', `${(blob.size / 1024).toFixed(1)}KB`);
      console.log('[CarpetStorage] 📋 File type:', blob.type);
      
      // Generate filename with timestamp
      const timestamp = Date.now();
      const extension = this.getBlobExtension(blob);
      const filename = `carpets/${pubId}_${timestamp}.${extension}`;
      console.log('[CarpetStorage] 📋 Generated filename:', filename);
      
      // Create a reference to the file in Firebase Storage
      console.log('[CarpetStorage] 🔍 Creating Firebase Storage reference...');
      const storageRef = ref(this.storage, filename);
      
      // Upload the blob to Firebase Storage
      console.log('[CarpetStorage] ⬆️ Uploading blob to Firebase Storage...');
      const snapshot = await uploadBytes(storageRef, blob);
      console.log('[CarpetStorage] ✅ Upload complete! Snapshot details:', {
        ref: snapshot.ref.fullPath,
        size: snapshot.metadata.size,
        contentType: snapshot.metadata.contentType
      });
      
      // Get the download URL
      console.log('[CarpetStorage] 🔗 Getting download URL...');
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('[CarpetStorage] ✅ Download URL obtained successfully');
      console.log('[CarpetStorage] 🔗 URL:', downloadURL);
      
      return downloadURL;
    } catch (error) {
      console.error('[CarpetStorage] ❌ Firebase Storage upload failed with error:', error);
      console.log('[CarpetStorage] 📋 Error details:', {
        errorType: error?.constructor?.name,
        errorMessage: error instanceof Error ? error.message : String(error),
        pubId,
        blobSize: blob?.size
      });
      return null; // Return null instead of throwing to keep check-in flow working
    }
  }

  /**
   * Get file extension from blob type with proper PNG handling
   */
  private getBlobExtension(blob: Blob): string {
    console.log('[CarpetStorage] 🔍 Mapping blob type to extension:', blob.type);
    
    switch (blob.type) {
      case 'image/avif': 
        console.log('[CarpetStorage] 📋 Extension: avif');
        return 'avif';
      case 'image/webp': 
        console.log('[CarpetStorage] 📋 Extension: webp');
        return 'webp';
      case 'image/jpeg': 
        console.log('[CarpetStorage] 📋 Extension: jpg');
        return 'jpg';
      case 'image/png': 
        console.log('[CarpetStorage] 📋 Extension: png');
        return 'png';
      default: 
        console.log('[CarpetStorage] ⚠️ Unknown blob type, defaulting to jpg');
        return 'jpg';
    }
  }

  /**
   * Handle Firebase Storage upload with comprehensive logging and checks
   */
  private async handleFirebaseUpload(blob: Blob, pubId: string): Promise<void> {
    console.log('[CarpetStorage] 🚀 === FIREBASE UPLOAD PROCESS STARTED ===');
    console.log('[CarpetStorage] 📋 Pub ID:', pubId);
    console.log('[CarpetStorage] 📋 Blob size:', `${(blob.size / 1024).toFixed(1)}KB`);
    console.log('[CarpetStorage] 📋 Blob type:', blob.type);

    try {
      // Step 1: Check if pub already has carpet
      console.log('[CarpetStorage] 🔍 STEP 1: Checking if pub already has carpet...');
      const needsUpload = await this.pubNeedsCarpetUpload(pubId);
      
      if (!needsUpload) {
        console.log('[CarpetStorage] ✋ DECISION: Pub already has carpet, politely declining upload');
        console.log('[CarpetStorage] 🎯 Continuing with local storage only');
        console.log('[CarpetStorage] 🚀 === FIREBASE UPLOAD PROCESS COMPLETED (SKIPPED) ===');
        return;
      }

      console.log('[CarpetStorage] ✅ DECISION: Pub needs carpet, proceeding with Firebase upload');
      
      // Step 2: Upload to Firebase Storage
      console.log('[CarpetStorage] 🔍 STEP 2: Uploading to Firebase Storage...');
      const carpetUrl = await this.uploadToFirebaseStorage(blob, pubId);
      
      if (!carpetUrl) {
        console.log('[CarpetStorage] ❌ RESULT: Firebase upload failed, but check-in continues');
        console.log('[CarpetStorage] 🚀 === FIREBASE UPLOAD PROCESS COMPLETED (FAILED) ===');
        return;
      }

      console.log('[CarpetStorage] ✅ RESULT: Firebase upload successful');
      console.log('[CarpetStorage] 📋 Carpet URL:', carpetUrl);

      // Step 3: Update pub document
      console.log('[CarpetStorage] 🔍 STEP 3: Updating pub document with carpet URL...');
      await this.updatePubWithCarpetUrl(pubId, carpetUrl);
      
      console.log('[CarpetStorage] 🎉 SUCCESS: Complete Firebase upload workflow finished');
      console.log('[CarpetStorage] 🚀 === FIREBASE UPLOAD PROCESS COMPLETED (SUCCESS) ===');

    } catch (error) {
      console.error('[CarpetStorage] ❌ ERROR: Firebase upload process failed:', error);
      console.log('[CarpetStorage] 🔄 Check-in will continue with local storage only');
      console.log('[CarpetStorage] 🚀 === FIREBASE UPLOAD PROCESS COMPLETED (ERROR) ===');
    }
  }

  /**
   * Check if pub already has a carpet URL using efficient in-memory lookup
   * 
   * 🚀 PERFORMANCE OPTIMIZATION:
   * Now uses PubStore.pubs() for in-memory lookup instead of PubService.getPub()
   * 
   * ✅ BENEFITS:
   * - No network requests needed (data already cached)
   * - Instant lookup from in-memory signal
   * - Eliminates unnecessary async Firebase calls
   * - Maintains same functionality with better performance
   * 
   * 📊 FLOW COMPARISON:
   * 
   * OLD FLOW (inefficient):
   * CarpetStorageService → PubService → Firebase network call → Response
   * 
   * NEW FLOW (optimized):
   * CarpetStorageService → PubStore → In-memory signal lookup → Instant result
   */
  private async pubNeedsCarpetUpload(pubId: string): Promise<boolean> {
    try {
      console.log('[CarpetStorage] 🔍 Checking pub carpet status from in-memory cache...');
      
      // Use efficient in-memory lookup instead of network call
      const pub = this.pubStore.pubs().find(p => p.id === pubId);
      
      if (!pub) {
        console.log('[CarpetStorage] ⚠️ Pub not found in cache, assuming upload needed');
        return true;
      }

      const hasCarpetUrl = pub?.carpetUrl && pub.carpetUrl.trim() !== '';
      console.log('[CarpetStorage] 📋 Pub carpet status (from cache):', { 
        pubId, 
        hasCarpetUrl, 
        carpetUrl: pub?.carpetUrl,
        pubName: pub?.name 
      });
      
      if (hasCarpetUrl) {
        console.log('[CarpetStorage] 🎯 Pub already has carpet URL:', pub.carpetUrl);
      } else {
        console.log('[CarpetStorage] 🎯 Pub does not have carpet URL, upload needed');
      }
      
      return !hasCarpetUrl; // Return true if pub needs carpet upload
    } catch (error) {
      console.error('[CarpetStorage] ❌ Error checking pub carpet status:', error);
      console.log('[CarpetStorage] 🔄 Assuming upload needed due to error');
      return true; // Assume it needs upload if we can't check
    }
  }

  /**
   * Update pub document with carpet URL using optimized signal updates
   * 
   * 🚀 PERFORMANCE OPTIMIZATION:
   * Now uses PubStore.updatePubCarpetUrl() instead of PubService.updatePubCarpetUrl()
   * 
   * ✅ BENEFITS:
   * - Instant UI updates via signal reactivity 
   * - No cache invalidation overhead
   * - No unnecessary network requests to reload all pubs
   * - Maintains cache efficiency for other pubs
   * 
   * 📊 FLOW COMPARISON:
   * 
   * OLD FLOW (inefficient):
   * CarpetStorageService → PubService → Firebase → Cache invalidation → Full reload
   * 
   * NEW FLOW (optimized):
   * CarpetStorageService → PubStore → Firebase + Signal update → Instant UI
   * 
   * 🎯 CACHE STRATEGY:
   * The PubStore method updates both Firebase AND the in-memory signal,
   * avoiding the need to invalidate and reload the entire pub cache.
   */
  private async updatePubWithCarpetUrl(pubId: string, carpetUrl: string): Promise<void> {
    try {
      console.log('[CarpetStorage] 🔄 Updating pub with carpet URL via PubStore:', { pubId, carpetUrl });
      
      // Use PubStore method instead of PubService for optimized signal updates
      await this.pubStore.updatePubCarpetUrl(pubId, carpetUrl);
      
      console.log('[CarpetStorage] ✅ Pub carpet URL updated successfully with instant UI reactivity');
    } catch (error) {
      console.error('[CarpetStorage] ❌ Failed to update pub carpet URL:', error);
      // Don't throw - this shouldn't break the check-in flow
    }
  }
}
