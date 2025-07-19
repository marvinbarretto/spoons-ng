import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface CameraState {
  isActive: boolean;
  hasPermission: boolean;
  error: string | null;
  streamId: string | null;
}

/**
 * Centralized Camera Management Service
 * 
 * SCOPE:
 * - Camera permissions and MediaStream lifecycle management
 * - Video element attachment and stream management  
 * - Photo capture from video streams to various formats (canvas, blob, dataURL)
 * - Camera hardware cleanup and error recovery
 * - Cross-browser compatibility for getUserMedia
 * 
 * DOES NOT HANDLE:
 * - Photo quality validation or analysis
 * - Device orientation monitoring
 * - UI state management or flow control
 * - Business logic for specific features (check-ins, profiles, etc.)
 * 
 * Based on research from:
 * - MDN MediaDevices.getUserMedia() best practices
 * - Stack Overflow solutions for persistent camera issues
 * - Angular singleton service patterns
 * 
 * Addresses common issue where camera light stays on after getUserMedia usage
 */
@Injectable({
  providedIn: 'root'
})
export class CameraService {
  // REACTIVE STATE: BehaviorSubject to track camera state changes
  // Components can subscribe to this to react to camera status changes
  private readonly _state = new BehaviorSubject<CameraState>({
    isActive: false,        // Whether camera is currently streaming
    hasPermission: false,   // Whether user has granted camera permission
    error: null,           // Any error message from camera operations
    streamId: null         // ID of current MediaStream (for debugging)
  });

  // STREAM MANAGEMENT: Keep reference to the active MediaStream
  // This ensures we only have ONE MediaStream active at a time (prevents camera light issue)
  private _currentStream: MediaStream | null = null;
  
  // VIDEO ELEMENT TRACKING: Keep reference to attached video element for cleanup
  // Allows us to properly clean up video element when releasing camera
  private _videoElement: HTMLVideoElement | null = null;
  
  // CLEANUP TRACKING: Count cleanup attempts to prevent infinite loops
  // Helps debug persistent camera issues and limits emergency cleanup attempts
  private _cleanupAttempts = 0;
  
  // SAFETY LIMIT: Maximum cleanup attempts before giving up
  // Prevents infinite emergency cleanup loops that could affect performance
  private readonly MAX_CLEANUP_ATTEMPTS = 3;

  // Public observables
  readonly state$: Observable<CameraState> = this._state.asObservable();
  
  get currentState(): CameraState {
    return this._state.value;
  }

  get isActive(): boolean {
    return this._state.value.isActive;
  }

  get currentStream(): MediaStream | null {
    return this._currentStream;
  }

  /**
   * Request camera access with proper error handling
   * Based on MDN getUserMedia best practices
   */
  async requestCamera(constraints: MediaStreamConstraints = { video: true, audio: false }): Promise<MediaStream> {
    console.log('[Camera] Service requesting camera access...');
    
    try {
      // OPTIMIZATION: Reuse existing stream if already active to avoid multiple getUserMedia calls
      // This prevents the "multiple MediaStream" issue that causes camera light persistence
      if (this._currentStream && this.isActive) {
        console.log('[Camera] Reusing existing stream');
        return this._currentStream;
      }

      // CLEANUP: Ensure any previous streams are properly stopped before requesting new one
      // This prevents orphaned MediaStreams that keep camera light on
      await this.releaseCamera();

      // CORE: Request new MediaStream from browser - this is the main camera access point
      console.log('[Camera] Calling navigator.mediaDevices.getUserMedia');
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // STATE: Store the stream reference so we can manage it later
      this._currentStream = stream;
      
      // RESET: Reset cleanup attempt counter for fresh start
      this._cleanupAttempts = 0;

      // STATE UPDATE: Update reactive state to reflect camera is now active
      this._state.next({
        isActive: true,           // Camera is now actively streaming
        hasPermission: true,      // User granted camera permission
        error: null,              // Clear any previous errors
        streamId: stream.id       // Store stream ID for debugging
      });

      // DEBUG: Log success info for troubleshooting
      console.log('[Camera] Camera access granted, stream ID:', stream.id);
      console.log('[Camera] Stream has', stream.getTracks().length, 'tracks');

      return stream;

    } catch (error: any) {
      // ERROR HANDLING: Log the specific error for debugging
      console.log('[Camera] Failed to get camera access:', error.message);
      
      // STATE UPDATE: Update state to reflect camera access failed
      this._state.next({
        isActive: false,          // Camera is not active
        hasPermission: false,     // Permission was denied or unavailable
        error: error.message,     // Store error message for UI display
        streamId: null            // No stream available
      });

      // PROPAGATE: Re-throw error so calling code can handle it
      throw error;
    }
  }

  /**
   * Release camera with aggressive cleanup strategy
   * Based on research into browser camera persistence issues
   */
  async releaseCamera(force = false): Promise<void> {
    console.log('[Camera] Service releasing camera...');
    
    // EARLY EXIT: Skip if no stream to clean up (unless forced)
    // This avoids unnecessary cleanup work when camera isn't active
    if (!this._currentStream && !force) {
      console.log('[Camera] No active stream to release');
      return;
    }

    // TRACKING: Increment cleanup attempts for debugging persistent issues
    // Helps identify if camera cleanup is being called repeatedly
    this._cleanupAttempts++;
    console.log('[Camera] Cleanup attempt #' + this._cleanupAttempts);

    try {
      // STRATEGY 1: Stop all tracks in the main MediaStream
      // This is the primary method - stops all video/audio tracks to release camera hardware
      if (this._currentStream) {
        await this._stopStreamTracks(this._currentStream);
        this._currentStream = null;  // Clear reference to prevent memory leaks
      }

      // STRATEGY 2: Clean up any attached video element
      // Video elements can hold references to MediaStreams even after tracks are stopped
      if (this._videoElement) {
        this._cleanupVideoElement(this._videoElement);
        this._videoElement = null;  // Clear reference
      }

      // STRATEGY 3: Find and clean up any orphaned video elements on the page
      // Other components might have created video elements that weren't properly cleaned up
      this._cleanupOrphanedVideoElements();

      // STRATEGY 4: Emergency cleanup using "fresh stream" technique
      // Some browsers require getting a new stream and immediately stopping it to clear hardware state
      // This was re-enabled after fixing the multiple getUserMedia issue
      if (this._cleanupAttempts <= this.MAX_CLEANUP_ATTEMPTS) {
        await this._emergencyCleanup();
      }
      console.log('[Camera] Emergency cleanup strategy completed');

      // STATE UPDATE: Mark camera as inactive but keep permission status
      // We keep hasPermission=true so we know user previously granted access
      this._state.next({
        isActive: false,          // Camera is no longer streaming
        hasPermission: true,      // Keep permission status (user already granted it)
        error: null,              // Clear any previous errors
        streamId: null            // No active stream
      });

      console.log('[Camera] Camera release complete');

    } catch (error: any) {
      // ERROR HANDLING: If cleanup fails, still mark camera as inactive
      console.log('[Camera] Error during release:', error);
      
      // STATE UPDATE: Mark as failed state
      this._state.next({
        isActive: false,          // Camera should be inactive even if cleanup failed
        hasPermission: false,     // Reset permission status on error
        error: error.message,     // Store error for debugging
        streamId: null            // No active stream
      });
    }
  }

  /**
   * Attach stream to video element with proper management
   */
  attachToVideoElement(videoElement: HTMLVideoElement, stream: MediaStream): void {
    console.log('[Camera] Attaching stream to video element');
    
    // Clean up previous video element
    if (this._videoElement && this._videoElement !== videoElement) {
      this._cleanupVideoElement(this._videoElement);
    }

    this._videoElement = videoElement;
    videoElement.srcObject = stream;
    
    console.log('[Camera] Video element attached');
  }

  /**
   * Emergency cleanup for persistent camera issues
   * Based on Stack Overflow solutions for browser camera bugs
   */
  async emergencyCleanup(): Promise<void> {
    console.log('[Camera] Emergency cleanup initiated');
    
    // Stop everything we can find
    this._cleanupOrphanedVideoElements();
    
    // Try the "get fresh stream and stop it" technique
    await this._emergencyCleanup();
    
    // Reset internal state
    this._currentStream = null;
    this._videoElement = null;
    this._cleanupAttempts = 0;
    
    this._state.next({
      isActive: false,
      hasPermission: false,
      error: null,
      streamId: null
    });
    
    console.log('[Camera] Emergency cleanup complete');
  }

  // Private helper methods

  private async _stopStreamTracks(stream: MediaStream): Promise<void> {
    console.log('[Camera] Stopping stream tracks...');
    
    // GET ALL TRACKS: Both video and audio tracks need to be stopped
    // This is the most important step - any active track will keep camera light on
    const tracks = stream.getTracks();
    console.log('[Camera] Found', tracks.length, 'tracks to stop');
    
    // STOP EACH TRACK: Iterate through all tracks and stop them individually
    // We log before/after readyState to verify the track actually stopped
    tracks.forEach((track, index) => {
      console.log(`[Camera] Stopping track #${index}: ${track.kind} (${track.label}) - readyState: ${track.readyState}`);
      
      // CORE STOP: This is the main browser API call that releases camera hardware
      track.stop();
      
      // VERIFICATION: Log the new state to confirm track was stopped
      // readyState should change from 'live' to 'ended'
      console.log(`[Camera] Track #${index} stopped - new readyState: ${track.readyState}`);
    });
  }

  private _cleanupVideoElement(videoElement: HTMLVideoElement): void {
    console.log('[Camera] Cleaning up video element...');
    
    try {
      // CHECK FOR ATTACHED STREAM: Video elements can hold MediaStream references
      // Even after we stop our main stream, video elements might still reference it
      if (videoElement.srcObject) {
        const stream = videoElement.srcObject as MediaStream;
        if (stream && stream.getTracks) {
          // STOP VIDEO ELEMENT TRACKS: Stop any tracks attached to this specific video element
          // This catches cases where video element has a different stream reference
          stream.getTracks().forEach(track => {
            console.log('[Camera] Stopping video element track:', track.kind);
            track.stop();  // Stop track associated with this video element
          });
        }
      }
      
      // CLEAR VIDEO ELEMENT: Reset the video element to remove all stream references
      videoElement.pause();           // Stop video playback
      videoElement.srcObject = null;  // Remove MediaStream reference
      videoElement.load();            // Reset video element to initial state
      
      console.log('[Camera] Video element cleaned up');
    } catch (error) {
      // LOG BUT CONTINUE: Video element cleanup errors shouldn't break the whole cleanup process
      console.log('[Camera] Error cleaning video element:', error);
    }
  }

  private _cleanupOrphanedVideoElements(): void {
    console.log('[Camera] Searching for orphaned video elements...');
    
    // FIND ALL VIDEO ELEMENTS: Search the entire DOM for video elements
    // Other components might have created video elements that weren't properly cleaned up
    const videoElements = document.querySelectorAll('video');
    console.log('[Camera] Found', videoElements.length, 'video elements');
    
    // CLEAN EACH VIDEO ELEMENT: Check each video element for attached MediaStreams
    videoElements.forEach((video, index) => {
      if (video.srcObject) {
        // ORPHANED STREAM FOUND: This video element has a MediaStream attached
        // Clean it up using our standard video element cleanup method
        console.log(`[Camera] Cleaning orphaned video element #${index}`);
        this._cleanupVideoElement(video);
      }
    });
  }

  private async _emergencyCleanup(): Promise<void> {
    console.log('[Camera] Attempting emergency fresh stream cleanup...');
    
    try {
      // EMERGENCY TECHNIQUE: Request a fresh MediaStream and immediately stop it
      // This is a workaround for browser bugs where camera hardware doesn't release properly
      // Based on Stack Overflow research: some browsers need this to clear internal camera state
      const emergencyStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      console.log('[Camera] Got emergency stream, stopping immediately...');
      
      // IMMEDIATE STOP: Stop all tracks in the emergency stream right away
      // The goal isn't to use this stream, but to force browser to reset camera state
      emergencyStream.getTracks().forEach(track => {
        console.log('[Camera] Emergency stopping track:', track.kind);
        track.stop();  // Stop the emergency track immediately
      });
      
      console.log('[Camera] Emergency cleanup successful');
    } catch (error) {
      // ERROR IS OKAY: If this fails, it might mean camera is already properly released
      // Some browsers throw errors when camera isn't available, which can be a good sign
      console.log('[Camera] Emergency cleanup failed (this might be good):', error);
    }
  }

  // ==========================================
  // PHOTO CAPTURE METHODS
  // ==========================================

  /**
   * Check if video element is ready for photo capture
   * 
   * SCOPE:
   * - Validates video readiness state and dimensions
   * - Ensures video has loaded frame data for capture
   * 
   * @param video HTMLVideoElement to check
   * @returns true if video is ready for photo capture
   */
  isCameraReadyForCapture(video: HTMLVideoElement): boolean {
    const isReady = video.readyState >= 2 && // HAVE_CURRENT_DATA or higher
                   video.videoWidth > 0 &&
                   video.videoHeight > 0;

    console.log('[Camera] Readiness check:', {
      readyState: video.readyState,
      dimensions: `${video.videoWidth}x${video.videoHeight}`,
      isReady
    });

    return isReady;
  }

  /**
   * Wait for video element to be ready for photo capture
   * 
   * SCOPE:
   * - Promise-based waiting for video metadata and playback readiness
   * - Handles video loading events with timeout protection
   * - Proper event listener cleanup
   * 
   * @param video HTMLVideoElement to monitor
   * @param timeoutMs Timeout in milliseconds (default 5000)
   * @returns Promise that resolves when video is ready
   */
  async waitForVideoReady(video: HTMLVideoElement, timeoutMs: number = 5000): Promise<void> {
    console.log('[Camera] Waiting for video to be ready...');

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`Video ready timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      const cleanup = () => {
        clearTimeout(timeout);
        video.removeEventListener('loadedmetadata', onLoadedMetadata);
        video.removeEventListener('canplay', onCanPlay);
        video.removeEventListener('error', onError);
      };

      const checkReady = () => {
        if (this.isCameraReadyForCapture(video)) {
          console.log('[Camera] Video ready for capture:', {
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
        console.log('[Camera] Video metadata loaded');
        checkReady();
      };

      const onCanPlay = () => {
        console.log('[Camera] Video can play');
        checkReady();
      };

      const onError = (event: Event) => {
        console.error('[Camera] Video error during loading', event);
        cleanup();
        reject(new Error('Video loading error'));
      };

      // Add event listeners
      video.addEventListener('loadedmetadata', onLoadedMetadata);
      video.addEventListener('canplay', onCanPlay);
      video.addEventListener('error', onError);

      // Start playing and check if already ready
      video.play().then(() => {
        console.log('[Camera] Video play() resolved');
        if (!checkReady()) {
          console.log('[Camera] Video playing but not ready, waiting for events...');
        }
      }).catch((playError) => {
        console.error('[Camera] Video play() failed:', playError);
        cleanup();
        reject(playError);
      });
    });
  }

  /**
   * Capture photo from video stream to canvas with multiple output formats
   * 
   * SCOPE:
   * - Captures current video frame to canvas element
   * - Provides canvas, data URL, and blob outputs
   * - Handles canvas creation and 2D context operations
   * 
   * DOES NOT HANDLE:
   * - Photo quality validation
   * - Camera readiness checking (call isCameraReadyForCapture first)
   * - Video stream management
   * 
   * @param video HTMLVideoElement showing camera stream
   * @param quality JPEG quality (0.0 to 1.0, default 0.95)
   * @returns Object containing canvas, dataUrl, and blob
   */
  async capturePhotoToCanvas(video: HTMLVideoElement, quality: number = 0.95): Promise<{
    canvas: HTMLCanvasElement;
    dataUrl: string;
    blob: Blob;
  }> {
    console.log('[Camera] Capturing photo...');
    
    if (!this.isCameraReadyForCapture(video)) {
      throw new Error('Camera is not ready for photo capture. Call isCameraReadyForCapture() first.');
    }

    try {
      // Create canvas with video dimensions
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas 2D context');
      }

      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      console.log('[Camera] Photo captured to canvas:', {
        dimensions: `${canvas.width}x${canvas.height}`,
        quality
      });

      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      
      // Convert to blob
      const blob = await this._canvasToBlob(canvas, quality);

      console.log('[Camera] Photo capture complete:', {
        dataUrlLength: dataUrl.length,
        blobSize: blob.size
      });

      return { canvas, dataUrl, blob };

    } catch (error) {
      console.error('[Camera] Photo capture failed:', error);
      throw error;
    }
  }

  /**
   * Convert canvas to blob using Promise-based API
   * 
   * @param canvas Canvas element to convert
   * @param quality JPEG quality (0.0 to 1.0)
   * @returns Promise that resolves to blob
   */
  private async _canvasToBlob(canvas: HTMLCanvasElement, quality: number = 0.95): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      }, 'image/jpeg', quality);
    });
  }
}