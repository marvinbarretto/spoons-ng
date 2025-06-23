// src/app/carpets/data-access/device-carpet-storage.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { IndexedDbService } from '@shared/data-access/indexed-db.service';
import { AuthStore } from '@auth/data-access/auth.store';
import { environment } from '../../../environments/environment';

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

    // ✅ Run migration if needed
    await this.migrateFromOldDatabase();

    // Load initial stats for current user
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
   * ✅ MIGRATION: Handle existing carpet data from old database
   */
  private async migrateFromOldDatabase(): Promise<void> {
    console.log('[CarpetStorage] 🔄 Checking for legacy carpet data...');

    const currentUser = this.authStore.user();
    if (!currentUser) {
      console.log('[CarpetStorage] No user authenticated, skipping migration');
      return;
    }

    try {
      // Try to open old database
      await this.indexedDb.openDatabase({
        name: environment.database.legacy.oldCarpetsDb, // Old database name
        version: 1,
        stores: [{
          name: environment.database.stores.carpets,
          indexes: [
            { name: 'pubId', keyPath: 'pubId' },
            { name: 'dateKey', keyPath: 'dateKey' },
            { name: 'date', keyPath: 'date' }
          ]
        }]
      });

      // Get all data from old database
      const oldCarpets = await this.indexedDb.getAll<any>(environment.database.legacy.oldCarpetsDb, environment.database.stores.carpets);

      if (oldCarpets.length === 0) {
        console.log('[CarpetStorage] No legacy data found');
        return;
      }

      console.log('[CarpetStorage] 📦 Found', oldCarpets.length, 'legacy carpets to migrate');

      // Migrate each carpet to new format with user association
      let migratedCount = 0;
      for (const oldCarpet of oldCarpets) {
        try {
          // Create new carpet data with userId
          const newCarpetData: CarpetImageData = {
            userId: currentUser.uid,  // Associate with current user
            pubId: oldCarpet.pubId,
            pubName: oldCarpet.pubName,
            date: oldCarpet.date,
            dateKey: oldCarpet.dateKey,
            blob: oldCarpet.blob,
            size: oldCarpet.size,
            type: oldCarpet.type,
            width: oldCarpet.width || 400,
            height: oldCarpet.height || 400
          };

          // Save to new database with new key format
          const newKey = `${currentUser.uid}_${oldCarpet.pubId}_${oldCarpet.dateKey}`;
          await this.indexedDb.put(environment.database.name, environment.database.stores.carpets, newCarpetData, newKey);

          migratedCount++;
        } catch (error) {
          console.warn('[CarpetStorage] Failed to migrate carpet:', oldCarpet, error);
        }
      }

      console.log('[CarpetStorage] ✅ Successfully migrated', migratedCount, 'carpets');

      // Optional: Clean up old database
      // await this.indexedDb.clear(environment.database.legacy.oldCarpetsDb, environment.database.stores.carpets);

    } catch (error) {
      console.log('[CarpetStorage] No legacy database found or migration failed:', error);
    }
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
