import { Injectable, signal } from '@angular/core';

/**
 * Mock implementation of CheckinCameraService for testing
 */
@Injectable()
export class MockCheckinCameraService {
  private readonly _stream = signal<MediaStream | null>(null);
  private readonly _videoElement = signal<HTMLVideoElement | null>(null);
  private readonly _isReady = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly stream = this._stream.asReadonly();
  readonly videoElement = this._videoElement.asReadonly();
  readonly isReady = this._isReady.asReadonly();
  readonly error = this._error.asReadonly();

  async startCamera(videoElement: HTMLVideoElement): Promise<void> {
    console.log('[MockCheckinCamera] startCamera called');
    
    // Simulate successful camera start
    this._videoElement.set(videoElement);
    this._isReady.set(true);
    this._error.set(null);
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  stopCamera(): void {
    console.log('[MockCheckinCamera] stopCamera called');
    this._stream.set(null);
    this._videoElement.set(null);
    this._isReady.set(false);
  }

  cleanup(): void {
    console.log('[MockCheckinCamera] cleanup called');
    this.stopCamera();
  }

  /**
   * Test helper to simulate camera errors
   */
  simulateError(error: string): void {
    this._error.set(error);
    this._isReady.set(false);
  }

  /**
   * Test helper to set ready state
   */
  setReady(ready: boolean): void {
    this._isReady.set(ready);
  }
}