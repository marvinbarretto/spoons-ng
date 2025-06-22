import { Injectable, inject } from '@angular/core';
import { IndexedDbService } from './indexed-db.service';

export type PhotoRecord = {
  id: string;
  data: string;
  timestamp: number;
  size: number;
  checkInId?: string;
};

@Injectable({ providedIn: 'root' })
export class PhotoStorageService {
  private readonly _indexedDb = inject(IndexedDbService);

  private readonly DB_NAME = 'spoons_photos';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'carpet_photos';

  private _initialized = false;

  private async ensureInitialized(): Promise<void> {
    if (this._initialized) return;

    console.log('🔧 [PhotoStorage] Initializing database...');

    await this._indexedDb.openDatabase({
      name: this.DB_NAME,
      version: this.DB_VERSION,
      stores: [{
        name: this.STORE_NAME,
        keyPath: 'id',
        indexes: [
          { name: 'checkInId', keyPath: 'checkInId', unique: false },
          { name: 'timestamp', keyPath: 'timestamp', unique: false }
        ]
      }]
    });

    this._initialized = true;
    console.log('✅ [PhotoStorage] Database initialized');
  }

  async savePhoto(filename: string, photoData: string, checkInId?: string): Promise<void> {
    console.log(`💾 [PhotoStorage] Saving photo: ${filename}`);

    try {
      await this.ensureInitialized();

      const photoRecord: PhotoRecord = {
        id: filename,
        data: photoData,
        timestamp: Date.now(),
        size: photoData.length,
        checkInId
      };

      await this._indexedDb.put(
        this.DB_NAME,
        this.STORE_NAME,
        photoRecord
      );

      console.log(`✅ [PhotoStorage] Photo saved: ${filename} (${Math.round(photoData.length / 1024)}KB)`);

    } catch (error) {
      console.error('❌ [PhotoStorage] Save failed:', error);
      throw error;
    }
  }

  async getPhoto(filename: string): Promise<string | null> {
    console.log(`📖 [PhotoStorage] Loading photo: ${filename}`);

    try {
      await this.ensureInitialized();

      const result = await this._indexedDb.get<PhotoRecord>(
        this.DB_NAME,
        this.STORE_NAME,
        filename
      );

      if (result) {
        console.log(`✅ [PhotoStorage] Photo loaded: ${filename}`);
        return result.data;
      } else {
        console.log(`❌ [PhotoStorage] Photo not found: ${filename}`);
        return null;
      }

    } catch (error) {
      console.error('❌ [PhotoStorage] Load failed:', error);
      return null;
    }
  }

  async deletePhoto(filename: string): Promise<void> {
    console.log(`🗑️ [PhotoStorage] Deleting photo: ${filename}`);

    try {
      await this.ensureInitialized();

      await this._indexedDb.delete(
        this.DB_NAME,
        this.STORE_NAME,
        filename
      );

      console.log(`✅ [PhotoStorage] Photo deleted: ${filename}`);
    } catch (error) {
      console.error('❌ [PhotoStorage] Delete failed:', error);
      throw error;
    }
  }

  async getPhotosByCheckIn(checkInId: string): Promise<PhotoRecord[]> {
    console.log(`📋 [PhotoStorage] Loading photos for check-in: ${checkInId}`);

    try {
      await this.ensureInitialized();

      // Use index to query by checkInId
      const photos = await this._indexedDb.getByIndex<PhotoRecord>(
        this.DB_NAME,
        this.STORE_NAME,
        'checkInId',
        checkInId
      );

      console.log(`✅ [PhotoStorage] Found ${photos.length} photos for check-in: ${checkInId}`);
      return photos;

    } catch (error) {
      console.error('❌ [PhotoStorage] Failed to load photos by check-in:', error);
      return [];
    }
  }

  async getAllPhotos(): Promise<PhotoRecord[]> {
    console.log('📋 [PhotoStorage] Loading all photos...');

    try {
      await this.ensureInitialized();

      const photos = await this._indexedDb.getAll<PhotoRecord>(
        this.DB_NAME,
        this.STORE_NAME
      );

      console.log(`✅ [PhotoStorage] Found ${photos.length} total photos`);
      return photos;

    } catch (error) {
      console.error('❌ [PhotoStorage] Failed to load all photos:', error);
      return [];
    }
  }

  async getStorageStats(): Promise<{ count: number; totalSizeKB: number }> {
    console.log('📊 [PhotoStorage] Getting storage stats...');

    try {
      await this.ensureInitialized();

      const photos = await this.getAllPhotos();
      const totalSize = photos.reduce((sum, photo) => sum + photo.size, 0);

      const stats = {
        count: photos.length,
        totalSizeKB: Math.round(totalSize / 1024)
      };

      console.log(`📊 [PhotoStorage] Stats:`, stats);
      return stats;

    } catch (error) {
      console.error('❌ [PhotoStorage] Failed to get stats:', error);
      return { count: 0, totalSizeKB: 0 };
    }
  }

  async clearAllPhotos(): Promise<void> {
    console.log('🧹 [PhotoStorage] Clearing all photos...');

    try {
      await this.ensureInitialized();

      await this._indexedDb.clear(
        this.DB_NAME,
        this.STORE_NAME
      );

      console.log('✅ [PhotoStorage] All photos cleared');

    } catch (error) {
      console.error('❌ [PhotoStorage] Failed to clear photos:', error);
      throw error;
    }
  }
}
