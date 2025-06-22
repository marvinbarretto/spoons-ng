import { Injectable, inject } from '@angular/core';
import { IndexedDbService } from './indexed-db.service';

export type PhotoRecord = {
  id: string;
  data: Blob;                    // ✅ Store as Blob instead of Base64
  timestamp: number;
  size: number;                  // Actual blob size in bytes
  format: 'webp' | 'jpeg';      // Track format used
  checkInId?: string;
  metadata?: {
    edgeCount?: number;
    blurScore?: number;
    confidence?: number;
    orientationAngle?: number;
  };
};

export type CarpetPhotoData = {
  filename: string;
  format: 'webp' | 'jpeg';
  sizeKB: number;
  blob: Blob;
  metadata?: PhotoRecord['metadata'];
};

@Injectable({ providedIn: 'root' })
export class PhotoStorageService {
  private readonly _indexedDb = inject(IndexedDbService);

  private readonly DB_NAME = 'spoons_photos_v2';  // ✅ New version for binary storage
  private readonly DB_VERSION = 2;
  private readonly STORE_NAME = 'carpet_photos';

  private _initialized = false;

  private async ensureInitialized(): Promise<void> {
    if (this._initialized) return;

    console.log('🔧 [PhotoStorage] Initializing WebP binary storage...');

    await this._indexedDb.openDatabase({
      name: this.DB_NAME,
      version: this.DB_VERSION,
      stores: [{
        name: this.STORE_NAME,
        keyPath: 'id',
        indexes: [
          { name: 'checkInId', keyPath: 'checkInId', unique: false },
          { name: 'timestamp', keyPath: 'timestamp', unique: false },
          { name: 'format', keyPath: 'format', unique: false }
        ]
      }]
    });

    this._initialized = true;
    console.log('✅ [PhotoStorage] WebP binary storage initialized');
  }

  async savePhoto(
    filename: string,
    photoBlob: Blob,
    format: 'webp' | 'jpeg',
    checkInId?: string,
    metadata?: PhotoRecord['metadata']
  ): Promise<void> {
    const sizeKB = Math.round(photoBlob.size / 1024);
    console.log(`💾 [PhotoStorage] Saving ${format.toUpperCase()} photo: ${filename} (${sizeKB}KB)`);

    try {
      await this.ensureInitialized();

      const photoRecord: PhotoRecord = {
        id: filename,
        data: photoBlob,           // ✅ Store Blob directly
        timestamp: Date.now(),
        size: photoBlob.size,      // ✅ Actual binary size
        format,
        checkInId,
        metadata
      };

      await this._indexedDb.put(
        this.DB_NAME,
        this.STORE_NAME,
        photoRecord
      );

      const sizeSavings = this._calculateSizeSavings(photoBlob.size, format);
      console.log(`✅ [PhotoStorage] Photo saved: ${filename} (${sizeSavings})`);

    } catch (error) {
      console.error('❌ [PhotoStorage] Save failed:', error);
      throw error;
    }
  }

  async savePhotoFromCarpetData(photoData: CarpetPhotoData, checkInId?: string): Promise<void> {
    return this.savePhoto(
      photoData.filename,
      photoData.blob,
      photoData.format,
      checkInId,
      photoData.metadata
    );
  }

  async getPhoto(filename: string): Promise<PhotoRecord | null> {
    console.log(`📖 [PhotoStorage] Loading photo: ${filename}`);

    try {
      await this.ensureInitialized();

      const result = await this._indexedDb.get<PhotoRecord>(
        this.DB_NAME,
        this.STORE_NAME,
        filename
      );

      if (result) {
        const sizeKB = Math.round(result.size / 1024);
        console.log(`✅ [PhotoStorage] Photo loaded: ${filename} (${sizeKB}KB ${result.format})`);
        return result;
      } else {
        console.log(`❌ [PhotoStorage] Photo not found: ${filename}`);
        return null;
      }

    } catch (error) {
      console.error('❌ [PhotoStorage] Load failed:', error);
      return null;
    }
  }

  // ✅ Helper to get photo as displayable URL
  async getPhotoUrl(filename: string): Promise<string | null> {
    const photoRecord = await this.getPhoto(filename);
    if (!photoRecord) return null;

    const url = URL.createObjectURL(photoRecord.data);
    console.log(`🖼️ [PhotoStorage] Created display URL for: ${filename}`);
    return url;
  }

  // ✅ Helper to get photo as Base64 (for API uploads if needed)
  async getPhotoAsBase64(filename: string): Promise<string | null> {
    const photoRecord = await this.getPhoto(filename);
    if (!photoRecord) return null;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        console.log(`📋 [PhotoStorage] Converted ${filename} to Base64`);
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(photoRecord.data);
    });
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

      const totalSizeKB = Math.round(photos.reduce((sum, p) => sum + p.size, 0) / 1024);
      console.log(`✅ [PhotoStorage] Found ${photos.length} photos for check-in: ${checkInId} (${totalSizeKB}KB total)`);
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

      const totalSizeKB = Math.round(photos.reduce((sum, p) => sum + p.size, 0) / 1024);
      console.log(`✅ [PhotoStorage] Found ${photos.length} total photos (${totalSizeKB}KB)`);
      return photos;

    } catch (error) {
      console.error('❌ [PhotoStorage] Failed to load all photos:', error);
      return [];
    }
  }

  async getStorageStats(): Promise<{
    count: number;
    totalSizeKB: number;
    formats: Record<string, { count: number; sizeKB: number }>;
    estimatedSavings: string;
    averageSizeKB: number;
  }> {
    console.log('📊 [PhotoStorage] Getting storage stats...');

    try {
      await this.ensureInitialized();

      const photos = await this.getAllPhotos();

      const totalSize = photos.reduce((sum, photo) => sum + photo.size, 0);
      const formats = photos.reduce((acc, photo) => {
        if (!acc[photo.format]) {
          acc[photo.format] = { count: 0, sizeKB: 0 };
        }
        acc[photo.format].count++;
        acc[photo.format].sizeKB += Math.round(photo.size / 1024);
        return acc;
      }, {} as Record<string, { count: number; sizeKB: number }>);

      // Calculate estimated savings vs Base64 JPEG
      const estimatedBase64Size = totalSize * 1.33; // Base64 overhead
      const webpCount = formats['webp']?.count || 0;
      const webpSavings = webpCount * 0.3; // WebP ~30% smaller than JPEG
      const totalSavingsKB = Math.round((estimatedBase64Size - totalSize) / 1024);

      const stats = {
        count: photos.length,
        totalSizeKB: Math.round(totalSize / 1024),
        formats,
        estimatedSavings: `${totalSavingsKB}KB saved vs Base64 JPEG`,
        averageSizeKB: photos.length > 0 ? Math.round(totalSize / 1024 / photos.length) : 0
      };

      console.log(`📊 [PhotoStorage] Stats:`, stats);
      return stats;

    } catch (error) {
      console.error('❌ [PhotoStorage] Failed to get stats:', error);
      return {
        count: 0,
        totalSizeKB: 0,
        formats: {},
        estimatedSavings: '0KB',
        averageSizeKB: 0
      };
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

  // ✅ Migration helper for existing Base64 photos
  async migrateBase64Photo(filename: string, base64Data: string): Promise<void> {
    console.log(`🔄 [PhotoStorage] Migrating Base64 photo: ${filename}`);

    try {
      // Convert Base64 to Blob
      const response = await fetch(base64Data);
      const blob = await response.blob();

      // Detect format from Base64 header
      const format = base64Data.includes('data:image/webp') ? 'webp' : 'jpeg';

      await this.savePhoto(filename, blob, format);
      console.log(`✅ [PhotoStorage] Migrated: ${filename} (${Math.round(blob.size / 1024)}KB)`);

    } catch (error) {
      console.error(`❌ [PhotoStorage] Migration failed for ${filename}:`, error);
    }
  }

  // ✅ Helper to revoke object URLs (prevent memory leaks)
  revokePhotoUrl(url: string): void {
    URL.revokeObjectURL(url);
    console.log(`🧹 [PhotoStorage] Revoked object URL`);
  }

  private _calculateSizeSavings(blobSize: number, format: 'webp' | 'jpeg'): string {
    const base64Size = blobSize * 1.33; // Base64 overhead
    const base64Savings = base64Size - blobSize;

    let formatSavings = '';
    if (format === 'webp') {
      const jpegEquivalent = blobSize * 1.4; // WebP is ~30% smaller than JPEG
      const webpSavings = jpegEquivalent - blobSize;
      formatSavings = ` + ${Math.round(webpSavings / 1024)}KB vs JPEG`;
    }

    return `${Math.round(base64Savings / 1024)}KB vs Base64${formatSavings}`;
  }
}
