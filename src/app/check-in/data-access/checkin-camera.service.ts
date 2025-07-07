import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CheckinCameraService {
  // Private state
  private readonly _stream = signal<MediaStream | null>(null);
  private readonly _videoElement = signal<HTMLVideoElement | null>(null);
  private readonly _isReady = signal(false);
  private readonly _error = signal<string | null>(null);
  
  // Timeout tracking
  private activeTimeouts = new Set<number>();
  
  // Public readonly signals
  readonly stream = this._stream.asReadonly();
  readonly videoElement = this._videoElement.asReadonly();
  readonly isReady = this._isReady.asReadonly();
  readonly error = this._error.asReadonly();
  
  // Computed helpers
  readonly hasError = computed(() => this.error() !== null);
  readonly canCapture = computed(() => {
    const ready = this.isReady();
    const video = this.videoElement();
    
    if (!ready || !video) return false;
    
    return video.readyState >= 2 && 
           video.videoWidth > 0 && 
           video.videoHeight > 0;
  });

  /**
   * Start camera with environment-facing preference
   */
  async startCamera(videoElement: HTMLVideoElement): Promise<void> {
    console.log('[CheckinCamera] 📹 === STARTING CAMERA ===');
    console.log('[CheckinCamera] 📹 Video element provided:', !!videoElement);
    
    try {
      // Clean up any existing stream first
      this.stopCamera();
      
      // Request camera access
      console.log('[CheckinCamera] 📹 Requesting user media...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      console.log('[CheckinCamera] 📹 User media stream created successfully');
      
      // Assign stream to video element
      videoElement.srcObject = stream;
      console.log('[CheckinCamera] 📹 Stream assigned to video element');
      
      // Wait for video to be ready
      await this.waitForVideoReady(videoElement);
      
      // Update state
      this._stream.set(stream);
      this._videoElement.set(videoElement);
      this._isReady.set(true);
      this._error.set(null);
      
      console.log('[CheckinCamera] 📹 === CAMERA STARTED SUCCESSFULLY ===');
      console.log('[CheckinCamera] 📹 Final state:', {
        dimensions: `${videoElement.videoWidth}x${videoElement.videoHeight}`,
        readyState: videoElement.readyState,
        isReady: true
      });
      
    } catch (error: any) {
      console.error('[CheckinCamera] ❌ Camera start failed:', error);
      this._error.set(error?.message || 'Failed to start camera');
      this._isReady.set(false);
      throw error;
    }
  }

  /**
   * Stop camera and clean up resources
   */
  stopCamera(): void {
    const stream = this._stream();
    
    if (stream) {
      console.log('[CheckinCamera] 📹 Stopping camera with', stream.getTracks().length, 'tracks');
      
      stream.getTracks().forEach(track => {
        console.log('[CheckinCamera] 📹 Stopping track:', track.kind, track.readyState);
        track.stop();
      });
      
      // Clear video element source
      const video = this._videoElement();
      if (video) {
        video.srcObject = null;
        console.log('[CheckinCamera] 📹 Video element srcObject cleared');
      }
      
      // Reset state
      this._stream.set(null);
      this._videoElement.set(null);
      this._isReady.set(false);
      
      console.log('[CheckinCamera] 📹 Camera stopped and resources cleaned');
    }
  }

  /**
   * Wait for video element to be ready with proper event handling
   */
  private async waitForVideoReady(video: HTMLVideoElement): Promise<void> {
    console.log('[CheckinCamera] ⏳ Waiting for video to be ready...');
    
    return new Promise((resolve, reject) => {
      const timeoutId = this.safeSetTimeout(() => {
        cleanup();
        reject(new Error('Video ready timeout after 5 seconds'));
      }, 5000);
      
      const cleanup = () => {
        this.activeTimeouts.delete(timeoutId);
        clearTimeout(timeoutId);
        video.removeEventListener('loadedmetadata', onLoadedMetadata);
        video.removeEventListener('canplay', onCanPlay);
        video.removeEventListener('error', onError);
      };
      
      const checkReady = () => {
        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          console.log('[CheckinCamera] ✅ Video ready:', {
            readyState: video.readyState,
            dimensions: `${video.videoWidth}x${video.videoHeight}`
          });
          cleanup();
          resolve();
          return true;
        }
        return false;
      };
      
      const onLoadedMetadata = () => {
        console.log('[CheckinCamera] 📐 Video metadata loaded');
        checkReady();
      };
      
      const onCanPlay = () => {
        console.log('[CheckinCamera] 🎬 Video can play');
        checkReady();
      };
      
      const onError = () => {
        console.error('[CheckinCamera] ❌ Video error during loading');
        cleanup();
        reject(new Error('Video loading error'));
      };
      
      // Add event listeners
      video.addEventListener('loadedmetadata', onLoadedMetadata);
      video.addEventListener('canplay', onCanPlay);
      video.addEventListener('error', onError);
      
      // Start playing and check if already ready
      video.play().then(() => {
        console.log('[CheckinCamera] 🎬 Video play() completed');
        checkReady();
      }).catch((error) => {
        console.error('[CheckinCamera] ❌ Video play() failed:', error);
        cleanup();
        reject(error);
      });
    });
  }

  /**
   * Clean up all resources
   */
  cleanup(): void {
    console.log('[CheckinCamera] 🧹 Cleaning up camera service');
    
    // Stop camera
    this.stopCamera();
    
    // Clear timeouts
    this.clearTimeouts();
  }

  private safeSetTimeout(callback: () => void, delay: number): number {
    const timeoutId = window.setTimeout(() => {
      this.activeTimeouts.delete(timeoutId);
      callback();
    }, delay);
    this.activeTimeouts.add(timeoutId);
    return timeoutId;
  }

  private clearTimeouts(): void {
    console.log('[CheckinCamera] 🧹 Clearing', this.activeTimeouts.size, 'active timeouts');
    this.activeTimeouts.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    this.activeTimeouts.clear();
  }
}