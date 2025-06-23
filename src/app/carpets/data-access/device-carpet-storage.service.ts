// src/app/carpets/data-access/device-carpet-storage.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { IndexedDbService } from '@shared/data-access/indexed-db.service';

type CarpetImageData = {
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

  // Signals for reactive state
  private readonly _carpetCount = signal(0);
  private readonly _totalSize = signal(0);
  private readonly _loading = signal(false);

  readonly carpetCount = this._carpetCount.asReadonly();
  readonly totalSize = this._totalSize.asReadonly();
  readonly loading = this._loading.asReadonly();

  private initialized = false;
  private supportedFormats: Set<ImageFormat> = new Set();

  /**
   * Initialize the database and detect supported formats
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[CarpetStorage] Already initialized');
      return;
    }

    console.log('[CarpetStorage] Initializing IndexedDB for carpet storage...');

    // Open database with carpet store
    await this.indexedDb.openDatabase({
      name: 'SpoonsCarpets',
      version: 1,
      stores: [{
        name: 'carpets',
        indexes: [
          { name: 'pubId', keyPath: 'pubId' },
          { name: 'dateKey', keyPath: 'dateKey' },
          { name: 'date', keyPath: 'date' }
        ]
      }]
    });

    // Detect supported image formats
    await this.detectSupportedFormats();

    // Load initial stats
    await this.updateStats();

    this.initialized = true;
    console.log('[CarpetStorage] Initialization complete');
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
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/avif', 0.8);
      });
      if (blob && blob.type === 'image/avif') {
        this.supportedFormats.add('avif');
        console.log('[CarpetStorage] ✅ AVIF supported');
      }
    } catch {
      console.log('[CarpetStorage] ❌ AVIF not supported');
    }

    // Test WebP support
    try {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/webp', 0.8);
      });
      if (blob && blob.type === 'image/webp') {
        this.supportedFormats.add('webp');
        console.log('[CarpetStorage] ✅ WebP supported');
      }
    } catch {
      console.log('[CarpetStorage] ❌ WebP not supported');
    }

    // JPEG is always supported
    this.supportedFormats.add('jpeg');
    console.log('[CarpetStorage] ✅ JPEG supported (fallback)');
  }

  /**
   * Get the best supported image format
   */
  private getBestFormat(): { format: ImageFormat; mimeType: string; quality: number } {
    if (this.supportedFormats.has('avif')) {
      return { format: 'avif', mimeType: 'image/avif', quality: 0.75 };
    }
    if (this.supportedFormats.has('webp')) {
      return { format: 'webp', mimeType: 'image/webp', quality: 0.75 };
    }
    return { format: 'jpeg', mimeType: 'image/jpeg', quality: 0.75 };
  }

  /**
   * Capture and save a carpet image from canvas
   */
  async captureCarpetImage(
    canvas: HTMLCanvasElement,
    pubId: string,
    pubName: string
  ): Promise<string> {
    console.log('[CarpetStorage] Capturing carpet image for pub:', pubId);

    await this.ensureInitialized();

    this._loading.set(true);

    try {
      // Create a 400x400 canvas for the captured image
      const captureCanvas = document.createElement('canvas');
      captureCanvas.width = 400;
      captureCanvas.height = 400;
      const ctx = captureCanvas.getContext('2d');

      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Draw the source canvas centered and scaled to fit
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

      // Generate key and save
      const dateKey = new Date().toISOString().split('T')[0];
      const key = `${pubId}_${dateKey}`;

      const data: CarpetImageData = {
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

      await this.indexedDb.put('SpoonsCarpets', 'carpets', data, key);

      console.log('[CarpetStorage] Image saved successfully:', {
        key,
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


  async storeCarpetBlob(
    photoBlob: Blob,
    pubId: string,
    pubName: string
  ): Promise<string> {
    console.log('[CarpetStorage] 💾 Storing carpet blob for:', pubName);

    try {
      // Create storage key
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const slugName = pubName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const imageKey = `${slugName}_${timestamp}`;

      console.log('[CarpetStorage] 🔑 Generated storage key:', imageKey);

      // Convert blob to base64 for localStorage (temporary)
      const base64Data = await this._blobToBase64(photoBlob);

      console.log('[CarpetStorage] 📊 Image stats:', {
        size: `${Math.round(photoBlob.size / 1024)}KB`,
        type: photoBlob.type
      });

      // Store in localStorage for now
      localStorage.setItem(`carpet_${imageKey}`, base64Data);

      console.log('[CarpetStorage] ✅ Blob stored successfully with key:', imageKey);

      return imageKey;

    } catch (error) {
      console.error('[CarpetStorage] ❌ Failed to store blob:', error);
      throw error;
    }
  }

  

  private _blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Get a carpet image by key
   */
  async getCarpetImage(key: string): Promise<Blob | undefined> {
    console.log('[CarpetStorage] Retrieving carpet image:', key);

    await this.ensureInitialized();

    const data = await this.indexedDb.get<CarpetImageData>('SpoonsCarpets', 'carpets', key);
    return data?.blob;
  }

  /**
   * Get all carpet images for a pub
   */
  async getCarpetsByPub(pubId: string): Promise<CarpetImageData[]> {
    console.log('[CarpetStorage] Getting all carpets for pub:', pubId);

    await this.ensureInitialized();

    const allCarpets = await this.indexedDb.getAll<CarpetImageData>('SpoonsCarpets', 'carpets');
    return allCarpets.filter(carpet => carpet.pubId === pubId);
  }

  /**
   * Get all carpet images
   */
  async getAllCarpets(): Promise<CarpetImageData[]> {
    console.log('[CarpetStorage] Getting all carpets');

    await this.ensureInitialized();

    return this.indexedDb.getAll<CarpetImageData>('SpoonsCarpets', 'carpets');
  }

  /**
   * Get all carpet keys
   */
  async getAllCarpetKeys(): Promise<string[]> {
    console.log('[CarpetStorage] Getting all carpet keys');

    await this.ensureInitialized();

    const keys = await this.indexedDb.getAllKeys('SpoonsCarpets', 'carpets');
    return keys as string[];
  }



// Add this method to DeviceCarpetStorageService

/**
 * Store a carpet image from base64 data (for check-in integration)
 * @param photoData - Base64 image data from scanner
 * @param pubId - Pub ID for naming
 * @param pubName - Pub name for naming
 * @returns Promise<string> - Storage key for the saved image
 */
async storeCarpetImage(
  photoData: string,
  pubId: string,
  pubName: string
): Promise<string> {
  console.log('[CarpetStorage] 💾 Storing carpet image for:', pubName);

  await this.ensureInitialized();
  this._loading.set(true);

  try {
    // Create storage key
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const slugName = pubName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const imageKey = `${slugName}_${timestamp}`;

    console.log('[CarpetStorage] 🔑 Generated storage key:', imageKey);

    // Convert base64 to blob
    const response = await fetch(photoData);
    const blob = await response.blob();

    // Compress if needed
    const format = 'jpeg'; // Default to JPEG for simplicity
    const mimeType = 'image/jpeg';
    const quality = 0.8;
    const compressedBlob = await this._compressImage(blob, mimeType, quality);

    console.log('[CarpetStorage] 📊 Image stats:', {
      originalSize: `${Math.round(blob.size / 1024)}KB`,
      compressedSize: `${Math.round(compressedBlob.size / 1024)}KB`,
      format
    });

    // Store in IndexedDB (or localStorage for now)
    const compressedDataUrl = await this._blobToDataUrl(compressedBlob);

    // TODO: Switch to IndexedDB when implemented
    localStorage.setItem(`carpet_${imageKey}`, compressedDataUrl);

    console.log('[CarpetStorage] ✅ Image stored successfully with key:', imageKey);

    return imageKey;

  } catch (error) {
    console.error('[CarpetStorage] ❌ Failed to store image:', error);
    throw error;
  } finally {
    this._loading.set(false);
  }
}

/**
 * Convert blob to data URL
 */
private _blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Compress image blob
 */
private async _compressImage(blob: Blob, mimeType: string, quality: number): Promise<Blob> {
  // For now, return original blob
  // TODO: Implement actual compression when needed
  console.log('[CarpetStorage] 📐 Image compression skipped (returning original)');
  return blob;
}



  /**
   * Delete a carpet image
   */
  async deleteCarpet(key: string): Promise<void> {
    console.log('[CarpetStorage] Deleting carpet:', key);

    await this.ensureInitialized();

    await this.indexedDb.delete('SpoonsCarpets', 'carpets', key);
    await this.updateStats();
  }

  /**
   * Clear all carpet images
   */
  async clearAllCarpets(): Promise<void> {
    console.log('[CarpetStorage] Clearing all carpets');

    await this.ensureInitialized();

    await this.indexedDb.clear('SpoonsCarpets', 'carpets');
    await this.updateStats();
  }

  /**
   * Update statistics
   */
  private async updateStats(): Promise<void> {
    const count = await this.indexedDb.count('SpoonsCarpets', 'carpets');
    this._carpetCount.set(count);

    const allCarpets = await this.indexedDb.getAll<CarpetImageData>('SpoonsCarpets', 'carpets');
    const totalSize = allCarpets.reduce((sum, carpet) => sum + carpet.size, 0);
    this._totalSize.set(totalSize);

    console.log('[CarpetStorage] Stats updated:', {
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
   * Migrate from localStorage if needed (one-time operation)
   */
  async migrateFromLocalStorage(): Promise<void> {
    console.log('[CarpetStorage] Checking for localStorage migration...');

    await this.ensureInitialized();

    let migrated = 0;
    const keysToRemove: string[] = [];

    // Look for carpet entries in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('carpet_')) {
        try {
          const dataUrl = localStorage.getItem(key);
          if (dataUrl) {
            // Convert data URL to blob
            const response = await fetch(dataUrl);
            const blob = await response.blob();

            // Extract pub ID and date from key
            const [, pubId, dateKey] = key.split('_');

            if (pubId && dateKey) {
              const data: CarpetImageData = {
                pubId,
                pubName: '', // We don't have this in old data
                date: new Date().toISOString(),
                dateKey,
                blob,
                size: blob.size,
                type: blob.type,
                width: 400,
                height: 400
              };

              await this.indexedDb.put('SpoonsCarpets', 'carpets', data, `${pubId}_${dateKey}`);
              keysToRemove.push(key);
              migrated++;
            }
          }
        } catch (error) {
          console.error('[CarpetStorage] Failed to migrate:', key, error);
        }
      }
    }

    // Remove migrated items from localStorage
    keysToRemove.forEach(key => localStorage.removeItem(key));

    if (migrated > 0) {
      console.log('[CarpetStorage] Migrated', migrated, 'carpets from localStorage');
      await this.updateStats();
    } else {
      console.log('[CarpetStorage] No carpets to migrate');
    }
  }

  /**
   * Ensure service is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}
