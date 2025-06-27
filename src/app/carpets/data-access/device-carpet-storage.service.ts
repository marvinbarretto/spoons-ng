// src/app/carpets/data-access/device-carpet-storage.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { IndexedDbService } from '@shared/data-access/indexed-db.service';
import { AuthStore } from '@auth/data-access/auth.store';
import { environment } from '../../../environments/environment';
import { CarpetPhotoData, PhotoStats } from '@shared/utils/carpet-photo.models';
import { Pub } from '../../pubs/utils/pub.models';


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
export class DeviceCarpetStorageService {
  private readonly indexedDb = inject(IndexedDbService);
  private readonly authStore = inject(AuthStore);

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
      await this.indexedDb.openDatabase({
        name: environment.database.name,
        version: environment.database.version,
        stores: [{
          name: environment.database.stores.carpets,
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
   * Detect which modern image formats are supported
   */
  private async detectSupportedFormats(): Promise<void> {
    console.log('[CarpetStorage] Detecting supported image formats...');

    // Test AVIF support
    try {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const blob = await new Promise<Blob | null>(resolve =>
        canvas.toBlob(resolve, 'image/avif', 0.8)
      );
      if (blob) this.supportedFormats.add('avif');
    } catch {}

    // Test WebP support
    try {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const blob = await new Promise<Blob | null>(resolve =>
        canvas.toBlob(resolve, 'image/webp', 0.8)
      );
      if (blob) this.supportedFormats.add('webp');
    } catch {}

    // JPEG is always supported
    this.supportedFormats.add('jpeg');

    console.log('[CarpetStorage] Supported formats:', Array.from(this.supportedFormats));
  }


/**
 * ✅ Save photo from carpet data (replaces PhotoStorageService method)
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

    // Create carpet data compatible with existing format
    const carpetData: CarpetImageData = {
      userId: userId,
      pubId: pub.id,
      pubName: pub.name,
      date: new Date().toISOString(),
      dateKey: photoData.filename.replace('.webp', '').replace('.jpeg', ''),
      blob: photoData.blob,
      size: photoData.blob.size,
      type: photoData.blob.type || `image/${photoData.format}`,
      width: 400, // Default values - could be extracted from metadata
      height: 400
    };

    // Use existing save method
    const key = `${userId}_${carpetData.pubId}_${carpetData.dateKey}`;
    await this.indexedDb.put(
      environment.database.name,
      environment.database.stores.carpets,
      carpetData,
      key
    );
    await this.updateStats();
    console.log('✅ [CarpetStorage] Photo saved successfully');

  } catch (error) {
    console.error('❌ [CarpetStorage] Save photo failed:', error);
    throw error;
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
 * ✅ Helper to revoke object URLs (prevent memory leaks)
 */
revokePhotoUrl(url: string): void {
  URL.revokeObjectURL(url);
  console.log(`🧹 [CarpetStorage] Revoked object URL`);
}



  /**
   * Get best available image format
   */
  private getBestFormat(): { format: ImageFormat; mimeType: string; quality: number } {
    if (this.supportedFormats.has('avif')) {
      return { format: 'avif', mimeType: 'image/avif', quality: 0.8 };
    }
    if (this.supportedFormats.has('webp')) {
      return { format: 'webp', mimeType: 'image/webp', quality: 0.8 };
    }
    return { format: 'jpeg', mimeType: 'image/jpeg', quality: 0.85 };
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

    // Create square crop canvas
    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = captureCanvas.height = 400;
    const ctx = captureCanvas.getContext('2d')!;

    // Draw centered square crop - scaled to fit
    const sourceSize = Math.min(canvas.width, canvas.height);
    const sx = (canvas.width - sourceSize) / 2;
    const sy = (canvas.height - sourceSize) / 2;

    ctx.drawImage(
      canvas,
      sx, sy, sourceSize, sourceSize,  // Source rectangle
      0, 0, 400, 400                     // Destination rectangle
    );

    // Convert to blob with best supported format
    const { format, mimeType, quality } = this.getBestFormat();
    console.log('[CarpetStorage] Using format:', format, 'quality:', quality);

    const blob = await new Promise<Blob>((resolve, reject) => {
      captureCanvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        mimeType,
        quality
      );
    });

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

    await this.indexedDb.put(environment.database.name, environment.database.stores.carpets, data, key);

    console.log('[CarpetStorage] Image saved successfully:', {
      key,
      userId,
      format,
      size: `${(blob.size / 1024).toFixed(1)}KB`
    });

    // Update stats
    await this.updateStats();

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

    const data = await this.indexedDb.get<CarpetImageData>(environment.database.name, environment.database.stores.carpets, key);
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

    const allCarpets = await this.indexedDb.getAll<CarpetImageData>(environment.database.name, environment.database.stores.carpets);
    return allCarpets.filter(carpet => carpet.userId === userId);
  }

  /**
   * ✅ Get carpets for specific user
   */
  async getCarpetsForUser(userId: string): Promise<CarpetImageData[]> {
    console.log('[CarpetStorage] Getting carpets for user:', userId);
    await this.ensureInitialized();

    const allCarpets = await this.indexedDb.getAll<CarpetImageData>(environment.database.name, environment.database.stores.carpets);
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

    return this.indexedDb.getAll<CarpetImageData>(environment.database.name, environment.database.stores.carpets);
  }

  /**
   * Get all carpet keys
   */
  async getAllCarpetKeys(): Promise<string[]> {
    console.log('[CarpetStorage] Getting all carpet keys');

    await this.ensureInitialized();

    const keys = await this.indexedDb.getAllKeys(environment.database.name, environment.database.stores.carpets);
    return keys as string[];
  }

  /**
   * Delete a carpet image
   */
  async deleteCarpet(key: string): Promise<void> {
    console.log('[CarpetStorage] Deleting carpet:', key);

    await this.ensureInitialized();

    await this.indexedDb.delete(environment.database.name, environment.database.stores.carpets, key);
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
      await this.indexedDb.delete(environment.database.name, environment.database.stores.carpets, key);
    }

    await this.updateStats();
  }

  /**
   * Clear all carpet images (admin/debug use)
   */
  async clearAllCarpets(): Promise<void> {
    console.log('[CarpetStorage] Clearing all carpets (admin mode)');

    await this.ensureInitialized();

    await this.indexedDb.clear(environment.database.name, environment.database.stores.carpets);
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
}
