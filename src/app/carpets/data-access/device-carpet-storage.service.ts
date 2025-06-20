// src/app/carpets/data-access/device-carpet-storage.service.ts
import { Injectable, signal } from '@angular/core';

type CarpetPhoto = {
  id: string;
  pubId: string;
  pubName: string;
  imageDataUrl: string;     // Full resolution for badges
  thumbnailDataUrl: string; // Small for lists/patchwork
  timestamp: Date;
  confidence: number;
  location?: {
    lat: number;
    lng: number;
  };
};

type StorageStats = {
  totalPhotos: number;
  estimatedSizeMB: number;
  oldestPhoto: Date | null;
  newestPhoto: Date | null;
};

@Injectable({ providedIn: 'root' })
export class DeviceCarpetStorage {

  private readonly STORAGE_KEY = 'spoons-carpet-photos';

  private readonly _photos = signal<CarpetPhoto[]>([]);
  private readonly _storageStats = signal<StorageStats>({
    totalPhotos: 0,
    estimatedSizeMB: 0,
    oldestPhoto: null,
    newestPhoto: null
  });

  readonly photos = this._photos.asReadonly();
  readonly storageStats = this._storageStats.asReadonly();

  constructor() {
    this.loadFromDevice();
  }

  /**
   * 📱 Save carpet photo to device storage
   */
  async saveCarpetPhoto(
    pubId: string,
    pubName: string,
    imageDataUrl: string,
    confidence: number,
    location?: { lat: number; lng: number }
  ): Promise<string> {

    const id = `carpet_${pubId}_${Date.now()}`;

    // Create optimized thumbnail
    const thumbnailDataUrl = await this.createThumbnail(imageDataUrl);

    const photo: CarpetPhoto = {
      id,
      pubId,
      pubName,
      imageDataUrl,
      thumbnailDataUrl,
      timestamp: new Date(),
      confidence,
      location
    };

    // Add to collection (newest first)
    const current = this._photos();
    const updated = [photo, ...current];

    this._photos.set(updated);
    this.saveToDevice(updated);
    this.updateStats(updated);

    console.log(`📱 Saved carpet photo for ${pubName} (${confidence}% confidence)`);
    return id;
  }

  /**
   * 🔍 Get photos for specific pub
   */
  getPhotosForPub(pubId: string): CarpetPhoto[] {
    return this._photos().filter(p => p.pubId === pubId);
  }

  /**
   * 📸 Get latest photo for badge background
   */
  getLatestPhoto(): CarpetPhoto | null {
    const photos = this._photos();
    return photos.length > 0 ? photos[0] : null;
  }

  /**
   * 🧩 Generate device patchwork from user's photos
   */
  generatePersonalPatchwork(maxPhotos = 30): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    const photos = this._photos().slice(0, maxPhotos);
    const gridSize = Math.ceil(Math.sqrt(photos.length));
    const tileSize = 100;

    canvas.width = gridSize * tileSize;
    canvas.height = gridSize * tileSize;

    // Background
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    return new Promise<string>((resolve) => {
      let loadedCount = 0;

      if (photos.length === 0) {
        resolve(canvas.toDataURL('image/jpeg', 0.8));
        return;
      }

      photos.forEach((photo, index) => {
        const img = new Image();
        img.onload = () => {
          const row = Math.floor(index / gridSize);
          const col = index % gridSize;
          const x = col * tileSize;
          const y = row * tileSize;

          // Draw photo
          ctx.drawImage(img, x, y, tileSize, tileSize);

          // Add pub name overlay
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(x, y + tileSize - 20, tileSize, 20);

          ctx.fillStyle = 'white';
          ctx.font = '10px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(photo.pubName.slice(0, 12), x + tileSize/2, y + tileSize - 6);

          // Border
          ctx.strokeStyle = '#ddd';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, tileSize, tileSize);

          loadedCount++;
          if (loadedCount === photos.length) {
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          }
        };
        img.src = photo.thumbnailDataUrl;
      });
    }) as any;
  }

  /**
   * 🏅 Create badge with user's carpet background
   */
  async createCarpetBadge(
    badgeText: string,
    pubId?: string
  ): Promise<string> {

    // Use specific pub photo or latest
    const photo = pubId
      ? this.getPhotosForPub(pubId)[0]
      : this.getLatestPhoto();

    if (!photo) {
      return this.createDefaultBadge(badgeText);
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 300;
    canvas.height = 300;

    return new Promise<string>((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Draw carpet background
        ctx.drawImage(img, 0, 0, 300, 300);

        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, 300, 300);

        // Badge design
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;

        // Text with outline
        ctx.strokeText(badgeText, 150, 140);
        ctx.fillText(badgeText, 150, 140);

        // Pub name
        ctx.font = 'bold 16px Arial';
        ctx.strokeText(photo.pubName, 150, 170);
        ctx.fillText(photo.pubName, 150, 170);

        // Date
        ctx.font = '14px Arial';
        const date = photo.timestamp.toLocaleDateString();
        ctx.strokeText(date, 150, 250);
        ctx.fillText(date, 150, 250);

        // Decorative border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 4;
        ctx.strokeRect(10, 10, 280, 280);

        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.src = photo.imageDataUrl;
    }) as any;
  }

  /**
   * 📊 Export user's carpet collection
   */
  exportCarpetCollection(): {
    photos: CarpetPhoto[];
    stats: StorageStats;
    exportDate: string;
  } {
    return {
      photos: this._photos(),
      stats: this._storageStats(),
      exportDate: new Date().toISOString()
    };
  }

  /**
   * 🗑️ Manual cleanup (user-initiated only)
   */
  removePhoto(photoId: string): boolean {
    const current = this._photos();
    const filtered = current.filter(p => p.id !== photoId);

    if (filtered.length < current.length) {
      this._photos.set(filtered);
      this.saveToDevice(filtered);
      this.updateStats(filtered);
      return true;
    }

    return false;
  }

  /**
   * 🗑️ Clear all photos (user-initiated only)
   */
  clearAllPhotos(): void {
    this._photos.set([]);
    this.saveToDevice([]);
    this.updateStats([]);
    console.log('🧹 All carpet photos cleared');
  }

  // Private helper methods

  private loadFromDevice(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const photos = JSON.parse(stored).map((p: any) => ({
          ...p,
          timestamp: new Date(p.timestamp)
        }));
        this._photos.set(photos);
        this.updateStats(photos);
        console.log(`📱 Loaded ${photos.length} carpet photos from device`);
      }
    } catch (error) {
      console.warn('Could not load carpet photos from device:', error);
    }
  }

  private saveToDevice(photos: CarpetPhoto[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(photos));
    } catch (error) {
      console.warn('Could not save carpet photos to device:', error);
      // If storage is somehow full, user can manually manage their collection
    }
  }

  private async createThumbnail(imageDataUrl: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        canvas.width = 150;
        canvas.height = 150;

        ctx.drawImage(img, 0, 0, 150, 150);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = imageDataUrl;
    });
  }

  private updateStats(photos: CarpetPhoto[]): void {
    if (photos.length === 0) {
      this._storageStats.set({
        totalPhotos: 0,
        estimatedSizeMB: 0,
        oldestPhoto: null,
        newestPhoto: null
      });
      return;
    }

    // Estimate size (rough calculation)
    const avgPhotoSize = 35; // KB per photo (full + thumbnail)
    const estimatedSizeMB = (photos.length * avgPhotoSize) / 1024;

    const timestamps = photos.map(p => p.timestamp);
    const oldestPhoto = new Date(Math.min(...timestamps.map(t => t.getTime())));
    const newestPhoto = new Date(Math.max(...timestamps.map(t => t.getTime())));

    this._storageStats.set({
      totalPhotos: photos.length,
      estimatedSizeMB: Math.round(estimatedSizeMB * 10) / 10,
      oldestPhoto,
      newestPhoto
    });
  }

  private createDefaultBadge(badgeText: string): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 300;
    canvas.height = 300;

    // Default background
    ctx.fillStyle = '#007bff';
    ctx.fillRect(0, 0, 300, 300);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(badgeText, 150, 150);

    return canvas.toDataURL('image/jpeg', 0.9);
  }
}
