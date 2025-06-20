// src/app/carpets/data-access/carpet-checkin-integration.service.ts
import { Injectable, signal, inject } from '@angular/core';
import { DynamicCarpetMatcher } from './dynamic-carpet-matcher.service';
import { DeviceCarpetStorage } from './device-carpet-storage.service';

type CarpetCheckInResult = {
  carpetDetected: boolean;
  confidence: number;
  photoSaved: boolean;
  photoId?: string;
  bonusPoints: number;
};

@Injectable({ providedIn: 'root' })
export class CarpetCheckInIntegration {

  private readonly matcher = inject(DynamicCarpetMatcher);
  private readonly deviceStorage = inject(DeviceCarpetStorage);

  private readonly _isCapturing = signal(false);
  private readonly _lastCaptureResult = signal<CarpetCheckInResult | null>(null);

  readonly isCapturing = this._isCapturing.asReadonly();
  readonly lastCaptureResult = this._lastCaptureResult.asReadonly();

  /**
   * 🎯 Main Integration: Capture carpet photo on check-in
   * Stores photo on device, returns result for check-in process
   */
  async captureForCheckIn(
    videoElement: HTMLVideoElement,
    pubId: string,
    pubName: string,
    userLocation?: { lat: number; lng: number }
  ): Promise<CarpetCheckInResult> {

    this._isCapturing.set(true);

    try {
      // 1. Check carpet match
      const match = this.matcher.matchFrame(videoElement, 65);

      const result: CarpetCheckInResult = {
        carpetDetected: match?.isMatch || false,
        confidence: match?.confidence || 0,
        photoSaved: false,
        bonusPoints: 0
      };

      // 2. If carpet detected, capture and store photo
      if (match?.isMatch) {
        console.log(`🎯 Carpet detected (${match.confidence}%)! Capturing photo...`);

        // Capture optimized image
        const imageDataUrl = this.captureOptimizedImage(videoElement);

        // Save to device storage
        const photoId = await this.deviceStorage.saveCarpetPhoto(
          pubId,
          pubName,
          imageDataUrl,
          match.confidence,
          userLocation
        );

        result.photoSaved = true;
        result.photoId = photoId;
        result.bonusPoints = 5; // Carpet bonus points

        console.log(`📱 Carpet photo saved to device: ${photoId}`);
      }

      this._lastCaptureResult.set(result);
      return result;

    } finally {
      this._isCapturing.set(false);
    }
  }

  /**
   * 🏅 Generate badge using user's carpet photos
   */
  async generateCarpetBadge(
    badgeText: string,
    pubId?: string
  ): Promise<string> {
    return this.deviceStorage.createCarpetBadge(badgeText, pubId);
  }

  /**
   * 🧩 Create personal patchwork from device photos
   */
  async createPersonalPatchwork(): Promise<string> {
    return this.deviceStorage.generatePersonalPatchwork();
  }

  /**
   * 📊 Get user's carpet collection stats
   */
  getUserCarpetStats(): {
    totalCarpets: number;
    uniquePubs: number;
    newestCapture: Date | null;
    storageUsed: string;
  } {
    const photos = this.deviceStorage.photos();
    const stats = this.deviceStorage.storageStats();

    const uniquePubs = new Set(photos.map(p => p.pubId)).size;

    return {
      totalCarpets: photos.length,
      uniquePubs,
      newestCapture: stats.newestPhoto,
      storageUsed: `${stats.estimatedSizeMB} MB`
    };
  }

  /**
   * 🔍 Check if user has visited this pub before (carpet-wise)
   */
  hasVisitedPubBefore(pubId: string): boolean {
    return this.deviceStorage.getPhotosForPub(pubId).length > 0;
  }

  /**
   * 🧹 Manual cleanup (user can manage their own collection)
   */
  removeOldPhotos(daysToKeep: number): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const current = this.deviceStorage.photos();
    const filtered = current.filter(p => p.timestamp > cutoffDate);
    const removed = current.length - filtered.length;

    if (removed > 0) {
      // User would need to manually trigger this through settings
      console.log(`Would remove ${removed} photos older than ${daysToKeep} days`);
    }

    return removed;
  }

  private captureOptimizedImage(videoElement: HTMLVideoElement): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    // Optimal size for badges/viewing - 400x400
    canvas.width = 400;
    canvas.height = 400;

    ctx.drawImage(videoElement, 0, 0, 400, 400);

    // 75% quality for good balance of size/quality
    return canvas.toDataURL('image/jpeg', 0.75);
  }
}
