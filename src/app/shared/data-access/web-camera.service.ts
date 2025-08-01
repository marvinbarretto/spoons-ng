import { Injectable, inject, signal, computed } from '@angular/core';
import { CameraService } from '@fourfold/angular-foundation';
import { 
  AbstractCameraService, 
  CameraPermissionState, 
  CapturedPhoto, 
  CameraRequestOptions,
  CameraPermissionStatus 
} from './abstract-camera.service';

/**
 * Web implementation of AbstractCameraService
 * Wraps @fourfold/angular-foundation CameraService for browser compatibility
 */
@Injectable({ providedIn: 'root' })
export class WebCameraService extends AbstractCameraService {
  private readonly foundationCameraService = inject(CameraService);
  
  // Service name for logging
  private readonly SERVICE_NAME = 'WebCameraService';
  
  // State signals
  private readonly _permissionStatus = signal<CameraPermissionState>({ camera: 'unknown' });
  private readonly _isCapturing = signal(false);
  private readonly _error = signal<string | null>(null);
  
  // Current stream reference for cleanup
  private currentStream: MediaStream | null = null;
  
  readonly permissionStatus = this._permissionStatus.asReadonly();
  readonly isCapturing = this._isCapturing.asReadonly();
  readonly error = this._error.asReadonly();
  
  constructor() {
    super();
    this.logServiceInitialization(this.SERVICE_NAME, 'web');
    console.log(`[${this.SERVICE_NAME}] 🌐 Foundation CameraService injected:`, {
      hasFoundationService: !!this.foundationCameraService,
      serviceType: typeof this.foundationCameraService
    });
  }
  
  async checkPermissions(): Promise<CameraPermissionState> {
    console.log(`[${this.SERVICE_NAME}] 🔍 Checking camera permissions...`);
    
    try {
      // Web browsers don't have a direct permission check API
      // We'll determine permissions based on getUserMedia capability
      const hasCamera = await this.hasCamera();
      const status: CameraPermissionStatus = hasCamera ? 'unknown' : 'denied';
      
      const result: CameraPermissionState = { camera: status };
      this._permissionStatus.set(result);
      
      this.logPermissionOperation(this.SERVICE_NAME, 'check', result);
      return result;
    } catch (error) {
      this.logError(this.SERVICE_NAME, 'permission check', error);
      const result: CameraPermissionState = { camera: 'denied' };
      this._permissionStatus.set(result);
      return result;
    }
  }
  
  async requestPermissions(): Promise<CameraPermissionState> {
    console.log(`[${this.SERVICE_NAME}] 🔐 Requesting camera permissions...`);
    
    try {
      // For web, requesting permissions means trying to access the camera
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, 
        audio: false 
      });
      
      console.log(`[${this.SERVICE_NAME}] 🔐 Camera stream acquired for permission test:`, {
        streamId: stream.id,
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length
      });
      
      // Stop the test stream immediately
      stream.getTracks().forEach(track => {
        track.stop();
        console.log(`[${this.SERVICE_NAME}] 🛑 Test stream track stopped:`, {
          kind: track.kind,
          label: track.label
        });
      });
      
      const result: CameraPermissionState = { camera: 'granted' };
      this._permissionStatus.set(result);
      
      this.logPermissionOperation(this.SERVICE_NAME, 'request', result);
      return result;
    } catch (error: any) {
      this.logError(this.SERVICE_NAME, 'permission request', error);
      
      let status: CameraPermissionStatus = 'denied';
      if (error.name === 'NotAllowedError') {
        status = 'denied';
      } else if (error.name === 'NotFoundError') {
        status = 'denied'; // No camera available
      }
      
      const result: CameraPermissionState = { camera: status };
      this._permissionStatus.set(result);
      this._error.set(error.message || 'Camera permission denied');
      
      return result;
    }
  }
  
  async capturePhoto(): Promise<CapturedPhoto> {
    console.log(`[${this.SERVICE_NAME}] 📸 Starting photo capture (web mode - requires video element)...`);
    
    // Web camera service requires a video element to capture from
    // This method is mainly for interface compatibility
    throw new Error('Web camera capture requires video element. Use captureFromVideoElement() instead.');
  }
  
  async isCameraReady(): Promise<boolean> {
    console.log(`[${this.SERVICE_NAME}] 🔍 Checking if camera is ready...`);
    
    try {
      const hasCamera = await this.hasCamera();
      const permissionStatus = this._permissionStatus();
      const isReady = hasCamera && (permissionStatus.camera === 'granted' || permissionStatus.camera === 'unknown');
      
      console.log(`[${this.SERVICE_NAME}] 🔍 Camera readiness check:`, {
        hasCamera,
        permissionStatus: permissionStatus.camera,
        isReady
      });
      
      return isReady;
    } catch (error) {
      this.logError(this.SERVICE_NAME, 'camera ready check', error);
      return false;
    }
  }
  
  async requestCamera(options: CameraRequestOptions): Promise<MediaStream | null> {
    console.log(`[${this.SERVICE_NAME}] 🎥 Requesting camera stream...`, { options });
    
    try {
      this._error.set(null);
      
      // Use foundation service to request camera
      const stream = await this.foundationCameraService.requestCamera(options);
      this.currentStream = stream;
      
      console.log(`[${this.SERVICE_NAME}] 🎥 Camera stream acquired:`, {
        streamId: stream.id,
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length,
        videoConstraints: stream.getVideoTracks()[0]?.getSettings()
      });
      
      // Update permission status since we successfully got a stream
      this._permissionStatus.set({ camera: 'granted' });
      
      this.logCameraOperation(this.SERVICE_NAME, 'stream requested', {
        streamId: stream.id,
        trackCount: stream.getTracks().length
      });
      
      return stream;
    } catch (error: any) {
      this.logError(this.SERVICE_NAME, 'camera request', error);
      this._error.set(error.message || 'Failed to access camera');
      
      // Update permission status based on error
      if (error.name === 'NotAllowedError') {
        this._permissionStatus.set({ camera: 'denied' });
      }
      
      throw error;
    }
  }
  
  attachToVideoElement(element: HTMLVideoElement, stream: MediaStream): void {
    console.log(`[${this.SERVICE_NAME}] 🔗 Attaching stream to video element...`, {
      streamId: stream.id,
      videoElementId: element.id || 'no-id',
      videoElementTagName: element.tagName
    });
    
    try {
      this.foundationCameraService.attachToVideoElement(element, stream);
      
      console.log(`[${this.SERVICE_NAME}] 🔗 Stream attached successfully:`, {
        elementSrc: element.srcObject ? 'set' : 'not-set',
        streamActive: stream.active,
        videoTracks: stream.getVideoTracks().length
      });
      
      this.logCameraOperation(this.SERVICE_NAME, 'stream attached', {
        elementReady: !!element.srcObject
      });
    } catch (error) {
      this.logError(this.SERVICE_NAME, 'stream attachment', error);
      this._error.set('Failed to attach camera stream to video element');
      throw error;
    }
  }
  
  async waitForVideoReady(element: HTMLVideoElement): Promise<void> {
    console.log(`[${this.SERVICE_NAME}] ⏳ Waiting for video element to be ready...`, {
      videoWidth: element.videoWidth,
      videoHeight: element.videoHeight,
      readyState: element.readyState,
      networkState: element.networkState
    });
    
    try {
      await this.foundationCameraService.waitForVideoReady(element);
      
      console.log(`[${this.SERVICE_NAME}] ✅ Video element is ready:`, {
        videoWidth: element.videoWidth,
        videoHeight: element.videoHeight,
        readyState: element.readyState,
        currentTime: element.currentTime
      });
      
      this.logCameraOperation(this.SERVICE_NAME, 'video ready', {
        dimensions: `${element.videoWidth}x${element.videoHeight}`,
        readyState: element.readyState
      });
    } catch (error) {
      this.logError(this.SERVICE_NAME, 'video ready wait', error);
      this._error.set('Video element failed to initialize');
      throw error;
    }
  }
  
  isCameraReadyForCapture(element: HTMLVideoElement): boolean {
    const isReady = this.foundationCameraService.isCameraReadyForCapture(element);
    
    console.log(`[${this.SERVICE_NAME}] 🔍 Camera ready for capture check:`, {
      isReady,
      videoWidth: element.videoWidth,
      videoHeight: element.videoHeight,
      readyState: element.readyState,
      paused: element.paused,
      ended: element.ended
    });
    
    return isReady;
  }
  
  async captureFromVideoElement(element: HTMLVideoElement): Promise<CapturedPhoto> {
    console.log(`[${this.SERVICE_NAME}] 📸 Capturing photo from video element...`, {
      videoWidth: element.videoWidth,
      videoHeight: element.videoHeight,
      currentTime: element.currentTime
    });
    
    this._isCapturing.set(true);
    
    try {
      // Use foundation service to capture from video element
      const capturedData = await this.foundationCameraService.capturePhotoToCanvas(element);
      
      const result: CapturedPhoto = {
        dataUrl: capturedData.dataUrl,
        blob: capturedData.blob,
        format: 'jpeg', // Foundation service typically returns JPEG
        width: element.videoWidth,
        height: element.videoHeight
      };
      
      console.log(`[${this.SERVICE_NAME}] 📸 Photo captured from video:`, {
        format: result.format,
        dimensions: `${result.width}x${result.height}`,
        dataUrlLength: result.dataUrl.length,
        blobSize: result.blob?.size || 0
      });
      
      this.logCameraOperation(this.SERVICE_NAME, 'photo captured', {
        dimensions: `${result.width}x${result.height}`,
        dataSize: result.dataUrl.length
      });
      
      return result;
    } catch (error) {
      this.logError(this.SERVICE_NAME, 'video capture', error);
      this._error.set('Failed to capture photo from video');
      throw error;
    } finally {
      this._isCapturing.set(false);
    }
  }
  
  stopCamera(): void {
    console.log(`[${this.SERVICE_NAME}] 🛑 Stopping camera...`);
    
    try {
      if (this.currentStream) {
        const trackCount = this.currentStream.getTracks().length;
        
        this.currentStream.getTracks().forEach((track, index) => {
          console.log(`[${this.SERVICE_NAME}] 🛑 Stopping track ${index + 1}/${trackCount}:`, {
            kind: track.kind,
            label: track.label,
            enabled: track.enabled,
            readyState: track.readyState
          });
          track.stop();
        });
        
        this.currentStream = null;
        console.log(`[${this.SERVICE_NAME}] 🛑 All camera tracks stopped and stream cleared`);
      } else {
        console.log(`[${this.SERVICE_NAME}] 🛑 No active camera stream to stop`);
      }
      
      this.logCameraOperation(this.SERVICE_NAME, 'camera stopped', {
        hadActiveStream: !!this.currentStream
      });
    } catch (error) {
      this.logError(this.SERVICE_NAME, 'camera stop', error);
    }
  }
  
  clearError(): void {
    console.log(`[${this.SERVICE_NAME}] 🧹 Clearing error state`);
    this._error.set(null);
  }
  
  reset(): void {
    console.log(`[${this.SERVICE_NAME}] 🔄 Resetting camera service state...`);
    
    this.stopCamera();  // This will handle stream cleanup with logging
    this._isCapturing.set(false);
    this._error.set(null);
    this._permissionStatus.set({ camera: 'unknown' });
    
    console.log(`[${this.SERVICE_NAME}] 🔄 Camera service reset complete`);
  }
  
  async openDeviceSettings(): Promise<void> {
    console.log(`[${this.SERVICE_NAME}] ⚙️ Open device settings requested (web - not available)`);
    console.warn(`[${this.SERVICE_NAME}] ⚙️ Device settings not available on web platform. Users must enable camera permissions through browser settings.`);
  }
  
  hasCamera(): boolean {
    const hasUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    console.log(`[${this.SERVICE_NAME}] 🔍 Camera availability check:`, {
      hasNavigator: !!navigator,
      hasMediaDevices: !!navigator.mediaDevices,
      hasGetUserMedia: hasUserMedia,
      userAgent: navigator.userAgent.substring(0, 50) + '...'
    });
    
    return hasUserMedia;
  }
  
  canRequestCamera(): boolean {
    const canRequest = this.hasCamera() && this._permissionStatus().camera !== 'denied';
    console.log(`[${this.SERVICE_NAME}] 🔍 Can request camera check:`, {
      hasCamera: this.hasCamera(),
      permissionStatus: this._permissionStatus().camera,
      canRequest
    });
    
    return canRequest;
  }
}