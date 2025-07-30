import { computed, Injectable, signal } from '@angular/core';

export type CapturedPhoto = {
  dataUrl: string;
  blob: Blob;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  timestamp: number;
};

@Injectable({ providedIn: 'root' })
export class CheckinCaptureService {
  // Private state
  private readonly _capturedPhoto = signal<CapturedPhoto | null>(null);
  private readonly _isProcessing = signal(false);
  private readonly _error = signal<string | null>(null);

  // Public readonly signals
  readonly capturedPhoto = this._capturedPhoto.asReadonly();
  readonly isProcessing = this._isProcessing.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed helpers
  readonly hasPhoto = computed(() => this.capturedPhoto() !== null);
  readonly photoDataUrl = computed(() => this.capturedPhoto()?.dataUrl || null);
  readonly photoBlob = computed(() => this.capturedPhoto()?.blob || null);

  /**
   * Capture photo from video element
   */
  async capturePhoto(videoElement: HTMLVideoElement): Promise<CapturedPhoto> {
    console.log('[CheckinCapture] 📸 Photo capture triggered');

    this._isProcessing.set(true);
    this._error.set(null);

    try {
      // Validate video element
      if (!videoElement) {
        throw new Error('No video element provided');
      }

      if (videoElement.readyState < 2) {
        throw new Error('Video not ready for capture');
      }

      const width = videoElement.videoWidth;
      const height = videoElement.videoHeight;

      if (width <= 0 || height <= 0) {
        throw new Error(`Invalid video dimensions: ${width}x${height}`);
      }

      console.log('[CheckinCapture] 📐 Capturing with dimensions:', width, 'x', height);

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Draw video frame to canvas
      ctx.drawImage(videoElement, 0, 0);

      // Convert to data URL (for display)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

      // Convert to blob (for storage)
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          blob => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          },
          'image/jpeg',
          0.8
        );
      });

      console.log('[CheckinCapture] 📸 Photo captured:', {
        dimensions: `${width}x${height}`,
        blobSize: `${(blob.size / 1024).toFixed(1)}KB`,
      });

      const photo: CapturedPhoto = {
        dataUrl,
        blob,
        canvas,
        width,
        height,
        timestamp: Date.now(),
      };

      this._capturedPhoto.set(photo);

      return photo;
    } catch (error: any) {
      console.error('[CheckinCapture] ❌ Capture failed:', error);
      this._error.set(error?.message || 'Photo capture failed');
      throw error;
    } finally {
      this._isProcessing.set(false);
    }
  }

  /**
   * Clear captured photo and free resources
   */
  clearPhoto(): void {
    console.log('[CheckinCapture] 🧹 Clearing captured photo');

    const photo = this._capturedPhoto();
    if (photo) {
      // Clear canvas
      const ctx = photo.canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, photo.canvas.width, photo.canvas.height);
      }

      // Revoke object URL if it's a blob URL
      if (photo.dataUrl.startsWith('blob:')) {
        URL.revokeObjectURL(photo.dataUrl);
      }
    }

    this._capturedPhoto.set(null);
    this._error.set(null);
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    console.log('[CheckinCapture] 🧹 Cleaning up capture service');
    this.clearPhoto();
  }
}
