// src/app/carpets/data-access/carpet-storage.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { Storage } from '@angular/fire/storage';
import { AuthStore } from '@auth/data-access/auth.store';
import { IndexedDbService } from '@fourfold/angular-foundation';
import { PubStore } from '@pubs/data-access/pub.store';
import { Pub } from '@pubs/utils/pub.models';
import { CarpetPhotoData, PhotoStats } from '@shared/utils/carpet-photo.models';
import { DebugService } from '@shared/utils/debug.service';
import { ImageFormatDetectionService } from '@shared/utils/image-format-detection.service';
import { canvasToBlob, resizeImageToSquare } from '@shared/utils/image-processing.helpers';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { environment } from '../../../environments/environment';

type CarpetImageData = {
  userId: string; // ✅ Associate carpet with user
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

@Injectable({ providedIn: 'root' })
export class CarpetStorageService {
  protected readonly indexedDb = inject(IndexedDbService);
  protected readonly authStore = inject(AuthStore);
  protected readonly storage = inject(Storage);
  protected readonly pubStore = inject(PubStore);
  private readonly debug = inject(DebugService);
  private readonly formatDetection = inject(ImageFormatDetectionService);

  // Signals for reactive state
  private readonly _carpetCount = signal(0);
  private readonly _totalSize = signal(0);
  private readonly _loading = signal(false);

  readonly carpetCount = this._carpetCount.asReadonly();
  readonly totalSize = this._totalSize.asReadonly();
  readonly loading = this._loading.asReadonly();

  private initialized = false;
  private initializing = false; // ✅ Guard against multiple simultaneous initializations

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
      return;
    }

    if (this.initializing) {
      // Wait for initialization to complete
      while (this.initializing && !this.initialized) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      return;
    }

    this.initializing = true;
    this.debug.standard('[CarpetStorage] Initializing IndexedDB...');

    try {
      const dbConfig = this.getDatabaseConfig();

      await this.indexedDb.openDatabase({
        name: dbConfig.name,
        version: dbConfig.version,
        stores: [
          {
            name: dbConfig.stores.carpets,
            indexes: [
              { name: 'userId', keyPath: 'userId' },
              { name: 'pubId', keyPath: 'pubId' },
              { name: 'dateKey', keyPath: 'dateKey' },
              { name: 'date', keyPath: 'date' },
            ],
          },
        ],
      });

      // Trigger format detection (cached after first call)
      await this.formatDetection.getSupportedFormats();
      this.initialized = true;
      this.initializing = false;

      await this.updateStats();
      this.debug.standard('[CarpetStorage] Initialization complete');
    } catch (error) {
      this.initializing = false;
      this.debug.error('[CarpetStorage] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * ✅ Save photo from carpet data (replaces PhotoStorageService method)
   * Now properly resizes images to 400x400 like saveCarpetImage()
   */
  async savePhotoFromCarpetData(photoData: CarpetPhotoData, pub: Pub): Promise<void> {
    this.debug.standard('[CarpetStorage] Saving photo from carpet data', {
      filename: photoData.filename,
      format: photoData.format,
      sizeKB: photoData.sizeKB,
      pubName: pub.name,
    });

    try {
      await this.ensureInitialized();

      const userId = this.authStore.uid();
      if (!userId) {
        throw new Error('User must be authenticated to save photos');
      }

      this._loading.set(true);

      // ✅ Resize image to 400x400 using helper function
      this.debug.standard('[CarpetStorage] Resizing image to 400x400...');

      const { format, mimeType, quality } = await this.formatDetection.getBestFormat();
      this.debug.extreme('[CarpetStorage] Using format and quality', { format, quality });

      const resizedBlob = await resizeImageToSquare(photoData.blob, 400, mimeType, quality);

      this.debug.extreme('[CarpetStorage] Image resized', {
        originalKB: (photoData.blob.size / 1024).toFixed(1),
        resizedKB: (resizedBlob.size / 1024).toFixed(1),
        reductionPercent: (
          ((photoData.blob.size - resizedBlob.size) / photoData.blob.size) *
          100
        ).toFixed(1),
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
        height: 400,
      };

      // Save resized image with unique timestamp key
      const timestamp = Date.now();
      const key = `${userId}_${carpetData.pubId}_${timestamp}`;
      const dbConfig = this.getDatabaseConfig();
      await this.indexedDb.put(dbConfig.name, dbConfig.stores.carpets, carpetData, key);
      await this.updateStats();
      this.debug.success('[CarpetStorage] Photo saved successfully with 400x400 resize');
    } catch (error) {
      this.debug.error('[CarpetStorage] Save photo failed:', error);
      throw error;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * ✅ Get storage statistics (replaces PhotoStorageService method)
   */
  async getStorageStats(): Promise<PhotoStats> {
    this.debug.standard('[CarpetStorage] Getting storage stats...');

    try {
      await this.ensureInitialized();

      const userCarpets = await this.getUserCarpets();
      const totalSize = userCarpets.reduce((sum, carpet) => sum + carpet.size, 0);

      // Format breakdown
      const formats = userCarpets.reduce(
        (acc, carpet) => {
          const format = carpet.type.includes('webp') ? 'webp' : 'jpeg';
          if (!acc[format]) {
            acc[format] = { count: 0, sizeKB: 0 };
          }
          acc[format].count++;
          acc[format].sizeKB += Math.round(carpet.size / 1024);
          return acc;
        },
        {} as Record<string, { count: number; sizeKB: number }>
      );

      // Calculate estimated savings vs Base64 JPEG
      const estimatedBase64Size = totalSize * 1.33; // Base64 overhead
      const webpCount = formats['webp']?.count || 0;
      const totalSavingsKB = Math.round((estimatedBase64Size - totalSize) / 1024);

      const stats: PhotoStats = {
        count: userCarpets.length,
        totalSizeKB: Math.round(totalSize / 1024),
        formats,
        estimatedSavings: `${totalSavingsKB}KB saved vs Base64 JPEG`,
        averageSizeKB:
          userCarpets.length > 0 ? Math.round(totalSize / 1024 / userCarpets.length) : 0,
      };

      this.debug.standard('[CarpetStorage] Storage stats retrieved', stats);
      return stats;
    } catch (error) {
      this.debug.error('[CarpetStorage] Failed to get stats:', error);
      return {
        count: 0,
        totalSizeKB: 0,
        formats: {},
        estimatedSavings: '0KB',
        averageSizeKB: 0,
      };
    }
  }

  /**
   * ✅ Get photo as displayable URL (replaces PhotoStorageService method)
   */
  async getPhotoUrl(filename: string): Promise<string | null> {
    this.debug.standard('[CarpetStorage] Getting photo URL for:', filename);

    // Type validation - ensure filename is a string
    if (typeof filename !== 'string' || !filename) {
      this.debug.error('[CarpetStorage] Invalid filename type', {
        type: typeof filename,
        value: filename,
      });
      return null;
    }

    try {
      // For carpet storage, we need to find by filename pattern
      const userCarpets = await this.getUserCarpets();
      const carpet = userCarpets.find(c =>
        c.dateKey.includes(filename.replace('.webp', '').replace('.jpeg', ''))
      );

      if (!carpet) {
        this.debug.standard('[CarpetStorage] Photo not found:', filename);
        return null;
      }

      const url = URL.createObjectURL(carpet.blob);
      this.debug.standard('[CarpetStorage] Created display URL for:', filename);
      return url;
    } catch (error) {
      this.debug.error('[CarpetStorage] Failed to get photo URL:', error);
      return null;
    }
  }

  /**
   * 💾 Store local version (600x600 AVIF for UI) - Used by CarpetStrategyService
   */
  async storeLocalVersion(blob: Blob, pubId: string, pubName: string): Promise<string> {
    this.debug.standard('[CarpetStorage] Storing local version', {
      pubName,
      blobSizeKB: (blob.size / 1024).toFixed(1),
    });

    const userId = this.authStore.uid();
    if (!userId) {
      throw new Error('No authenticated user found');
    }

    await this.ensureInitialized();

    const timestamp = Date.now();
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
      height: 600,
    };

    const key = `${userId}_${pubId}_${timestamp}`;
    const dbConfig = this.getDatabaseConfig();
    await this.indexedDb.put(dbConfig.name, dbConfig.stores.carpets, carpetData, key);

    await this.updateStats();

    console.log('[CarpetStorage] ✅ Local carpet stored with key:', key);
    return key;
  }

  /**
   * Helper to revoke object URLs (prevent memory leaks)
   */
  revokePhotoUrl(url: string): void {
    URL.revokeObjectURL(url);
  }

  /**
   * Save carpet image with user association
   */
  async saveCarpetImage(
    canvas: HTMLCanvasElement,
    pubId: string,
    pubName: string
  ): Promise<string> {
    const userId = this.authStore.uid();
    if (!userId) {
      throw new Error('[CarpetStorage] No authenticated user found');
    }

    this._loading.set(true);

    try {
      await this.ensureInitialized();

      // Create high-quality capture canvas with aspect ratio preservation
      const captureCanvas = document.createElement('canvas');
      const maxDimension = 1200;
      const aspectRatio = canvas.width / canvas.height;

      if (aspectRatio > 1) {
        captureCanvas.width = maxDimension;
        captureCanvas.height = Math.round(maxDimension / aspectRatio);
      } else {
        captureCanvas.height = maxDimension;
        captureCanvas.width = Math.round(maxDimension * aspectRatio);
      }

      const ctx = captureCanvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw with full source image preserving aspect ratio
      ctx.drawImage(
        canvas,
        0,
        0,
        canvas.width,
        canvas.height,
        0,
        0,
        captureCanvas.width,
        captureCanvas.height
      );

      // Convert to blob with best supported format
      const { format, mimeType, quality } = await this.formatDetection.getBestFormat();
      const blob = await canvasToBlob(captureCanvas, mimeType, quality);

      // Generate unique key with timestamp (never overwrites)
      const timestamp = Date.now();
      const dateKey = new Date().toISOString().split('T')[0]; // Keep for compatibility
      const key = `${userId}_${pubId}_${timestamp}`;

      const data: CarpetImageData = {
        userId,
        pubId,
        pubName,
        date: new Date().toISOString(),
        dateKey,
        blob,
        size: blob.size,
        type: blob.type,
        width: 400,
        height: 400,
      };

      const dbConfig = this.getDatabaseConfig();
      await this.indexedDb.put(dbConfig.name, dbConfig.stores.carpets, data, key);

      console.log('[CarpetStorage] Image saved successfully:', {
        key,
        userId,
        format,
        size: `${(blob.size / 1024).toFixed(1)}KB`,
      });

      await this.updateStats();

      // Clean up the temporary capture canvas
      captureCanvas.width = 0;
      captureCanvas.height = 0;

      // Fire-and-forget Firebase upload - don't await or block check-in
      this.handleFirebaseUpload(blob, pubId).catch(error => {
        this.debug.warn(
          '[CarpetStorage] Firebase upload failed, but check-in completed successfully:',
          error
        );
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
    this.debug.standard('[CarpetStorage] Retrieving carpet image:', key);

    await this.ensureInitialized();

    const dbConfig = this.getDatabaseConfig();
    const data = await this.indexedDb.get<CarpetImageData>(
      dbConfig.name,
      dbConfig.stores.carpets,
      key
    );
    return data?.blob;
  }

  /**
   * ✅ Get carpets for current user only
   */
  async getUserCarpets(): Promise<CarpetImageData[]> {
    const userId = this.authStore.uid();
    if (!userId) {
      this.debug.warn('[CarpetStorage] No authenticated user, returning empty array');
      return [];
    }

    console.log('[CarpetStorage] Getting carpets for user:', userId);
    await this.ensureInitialized();

    const dbConfig = this.getDatabaseConfig();
    const allCarpets = await this.indexedDb.getAll<CarpetImageData>(
      dbConfig.name,
      dbConfig.stores.carpets
    );
    return allCarpets.filter(carpet => carpet.userId === userId);
  }

  /**
   * ✅ Get carpets for specific user
   */
  async getCarpetsForUser(userId: string): Promise<CarpetImageData[]> {
    console.log('[CarpetStorage] Getting carpets for user:', userId);
    await this.ensureInitialized();

    const dbConfig = this.getDatabaseConfig();
    const allCarpets = await this.indexedDb.getAll<CarpetImageData>(
      dbConfig.name,
      dbConfig.stores.carpets
    );
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
   * Update statistics for current user
   */
  private async updateStats(): Promise<void> {
    const userId = this.authStore.uid();
    if (!userId) {
      this._carpetCount.set(0);
      this._totalSize.set(0);
      return;
    }

    if (!this.initialized) {
      this._carpetCount.set(0);
      this._totalSize.set(0);
      return;
    }

    const userCarpets = await this.getUserCarpets();
    const count = userCarpets.length;
    const totalSize = userCarpets.reduce((sum, carpet) => sum + carpet.size, 0);

    this._carpetCount.set(count);
    this._totalSize.set(totalSize);
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
        percentage: (estimate.usage / estimate.quota) * 100,
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
      const timestamp = Date.now();
      const extension = this.getBlobExtension(blob);
      const filename = `carpets/${pubId}_${timestamp}.${extension}`;

      const storageRef = ref(this.storage, filename);
      const snapshot = await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(snapshot.ref);

      console.log('[CarpetStorage] Firebase upload successful:', downloadURL);
      return downloadURL;
    } catch (error) {
      this.debug.error('[CarpetStorage] Firebase Storage upload failed:', error);
      return null;
    }
  }

  /**
   * Get file extension from blob type
   */
  private getBlobExtension(blob: Blob): string {
    switch (blob.type) {
      case 'image/avif':
        return 'avif';
      case 'image/webp':
        return 'webp';
      case 'image/jpeg':
        return 'jpg';
      case 'image/png':
        return 'png';
      default:
        return 'jpg';
    }
  }

  /**
   * Handle Firebase Storage upload (non-blocking)
   */
  private async handleFirebaseUpload(blob: Blob, pubId: string): Promise<void> {
    try {
      const needsUpload = await this.pubNeedsCarpetUpload(pubId);

      if (!needsUpload) {
        console.log('[CarpetStorage] Pub already has carpet, skipping upload');
        return;
      }

      const carpetUrl = await this.uploadToFirebaseStorage(blob, pubId);

      if (!carpetUrl) {
        this.debug.standard('[CarpetStorage] Firebase upload failed, but check-in continues');
        return;
      }

      await this.updatePubWithCarpetUrl(pubId, carpetUrl);
      console.log('[CarpetStorage] Firebase upload workflow completed successfully');
    } catch (error) {
      this.debug.error('[CarpetStorage] Firebase upload process failed:', error);
      throw error; // Let the caller handle it
    }
  }

  /**
   * Check if pub already has a carpet URL using in-memory lookup
   */
  private async pubNeedsCarpetUpload(pubId: string): Promise<boolean> {
    try {
      const pub = this.pubStore.pubs().find(p => p.id === pubId);

      if (!pub) {
        return true;
      }

      const hasCarpetUrl = pub?.carpetUrl && pub.carpetUrl.trim() !== '';
      return !hasCarpetUrl;
    } catch (error) {
      this.debug.error('[CarpetStorage] Error checking pub carpet status:', error);
      return true;
    }
  }

  /**
   * Update pub document with carpet URL
   */
  private async updatePubWithCarpetUrl(pubId: string, carpetUrl: string): Promise<void> {
    try {
      await this.pubStore.updatePubCarpetUrl(pubId, carpetUrl);
      console.log('[CarpetStorage] Pub carpet URL updated successfully');
    } catch (error) {
      this.debug.error('[CarpetStorage] Failed to update pub carpet URL:', error);
    }
  }
}
