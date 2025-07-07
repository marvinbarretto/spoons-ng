import { Injectable, signal, computed } from '@angular/core';
import { CapturedPhoto } from '../checkin-capture.service';

/**
 * Mock implementation of CheckinCaptureService for testing
 */
@Injectable()
export class MockCheckinCaptureService {
  private readonly mockPhoto: CapturedPhoto = {
    dataUrl: 'data:image/jpeg;base64,mock',
    blob: new Blob(['mock'], { type: 'image/jpeg' }),
    canvas: document.createElement('canvas'),
    width: 640,
    height: 480,
    timestamp: Date.now()
  };

  private readonly _capturedPhoto = signal<CapturedPhoto | null>(null);
  private readonly _isProcessing = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly capturedPhoto = this._capturedPhoto.asReadonly();
  readonly isProcessing = this._isProcessing.asReadonly();
  readonly error = this._error.asReadonly();

  readonly hasPhoto = computed(() => this.capturedPhoto() !== null);
  readonly photoDataUrl = computed(() => this.capturedPhoto()?.dataUrl || null);
  readonly photoBlob = computed(() => this.capturedPhoto()?.blob || null);

  async capturePhoto(videoElement: HTMLVideoElement): Promise<CapturedPhoto> {
    console.log('[MockCheckinCapture] capturePhoto called');
    
    this._isProcessing.set(true);
    
    // Simulate async capture
    await new Promise(resolve => setTimeout(resolve, 10));
    
    this._capturedPhoto.set(this.mockPhoto);
    this._isProcessing.set(false);
    
    return this.mockPhoto;
  }

  clearPhoto(): void {
    console.log('[MockCheckinCapture] clearPhoto called');
    this._capturedPhoto.set(null);
    this._error.set(null);
  }

  cleanup(): void {
    console.log('[MockCheckinCapture] cleanup called');
    this.clearPhoto();
  }

  /**
   * Test helper to simulate capture error
   */
  simulateError(error: string): void {
    this._error.set(error);
    this._isProcessing.set(false);
  }

  /**
   * Test helper to set a custom photo
   */
  setMockPhoto(photo: Partial<CapturedPhoto>): void {
    this._capturedPhoto.set({
      ...this.mockPhoto,
      ...photo
    });
  }
}