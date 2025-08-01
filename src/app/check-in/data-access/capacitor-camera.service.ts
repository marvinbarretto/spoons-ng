import { inject, Injectable, signal } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { CapacitorPlatformService } from '@shared/data-access/capacitor-platform.service';
import { 
  AbstractCameraService, 
  CameraPermissionState, 
  CapturedPhoto, 
  CameraRequestOptions 
} from '@shared/data-access/abstract-camera.service';

// Remove duplicate interfaces - they're now in AbstractCameraService

@Injectable({ providedIn: 'root' })
export class CapacitorCameraService extends AbstractCameraService {
  private readonly platformService = inject(CapacitorPlatformService);
  
  // Service name for logging
  private readonly SERVICE_NAME = 'CapacitorCameraService';

  // State signals
  readonly permissionStatus = signal<CameraPermissionState>({
    camera: 'unknown',
  });
  readonly isCapturing = signal(false);
  readonly error = signal<string | null>(null);
  
  constructor() {
    super();
    this.logServiceInitialization(this.SERVICE_NAME, 'native');
    console.log(`[${this.SERVICE_NAME}] 📱 Platform service info:`, {
      isNative: this.platformService.isNative(),
      isIOS: this.platformService.isIOS(),
      isAndroid: this.platformService.isAndroid(),
      platformName: this.platformService.platformName(),
      hasCamera: this.platformService.hasCamera(),
      initialized: this.platformService.initialized()
    });
  }

  /**
   * Check current camera permissions
   */
  async checkPermissions(): Promise<CameraPermissionState> {
    console.log(`[${this.SERVICE_NAME}] 🔍 Checking camera permissions...`);
    
    if (!this.platformService.isNative()) {
      console.log(`[${this.SERVICE_NAME}] 🌐 Non-native platform detected, returning granted`);
      return { camera: 'granted' }; // Web doesn't use this permission model
    }

    try {
      console.log(`[${this.SERVICE_NAME}] 📱 Calling Camera.checkPermissions()...`);
      const permissions = await Camera.checkPermissions();
      
      console.log(`[${this.SERVICE_NAME}] 📱 Raw camera permissions response:`, {
        permissions,
        cameraPermission: permissions.camera,
        photosPermission: permissions.photos
      });
      
      const state: CameraPermissionState = {
        camera: permissions.camera as any,
      };

      this.permissionStatus.set(state);
      this.logPermissionOperation(this.SERVICE_NAME, 'check', state);
      
      return state;
    } catch (error) {
      this.logError(this.SERVICE_NAME, 'permission check', error);
      this.error.set('Failed to check camera permissions');
      return { camera: 'unknown' };
    }
  }

  /**
   * Request camera permissions
   */
  async requestPermissions(): Promise<CameraPermissionState> {
    console.log(`[${this.SERVICE_NAME}] 🔐 Requesting camera permissions...`);
    
    if (!this.platformService.isNative()) {
      console.log(`[${this.SERVICE_NAME}] 🌐 Non-native platform, returning granted`);
      return { camera: 'granted' }; // Web handles permissions differently
    }

    try {
      console.log(`[${this.SERVICE_NAME}] 📱 Calling Camera.requestPermissions()...`);
      const permissions = await Camera.requestPermissions();
      
      console.log(`[${this.SERVICE_NAME}] 📱 Raw permission request response:`, {
        permissions,
        cameraPermission: permissions.camera,
        photosPermission: permissions.photos
      });
      
      const state: CameraPermissionState = {
        camera: permissions.camera as any,
      };

      this.permissionStatus.set(state);
      this.error.set(null);
      
      this.logPermissionOperation(this.SERVICE_NAME, 'request', state);
      
      return state;
    } catch (error) {
      this.logError(this.SERVICE_NAME, 'permission request', error);
      this.error.set('Failed to request camera permissions');
      return { camera: 'denied' };
    }
  }

  /**
   * Capture photo using native camera
   */
  async capturePhoto(): Promise<CapturedPhoto> {
    console.log(`[${this.SERVICE_NAME}] 📸 Starting native camera photo capture...`);
    
    if (!this.platformService.isNative()) {
      const error = 'Native camera capture only available on mobile platforms';
      this.logError(this.SERVICE_NAME, 'capture validation', error);
      throw new Error(error);
    }

    this.isCapturing.set(true);
    this.error.set(null);
    
    console.log(`[${this.SERVICE_NAME}] 📸 Camera capture state set, calling Camera.getPhoto()...`);

    try {
      const cameraOptions = {
        quality: 95,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        correctOrientation: true,  
        width: 1024,
        height: 1024,
      };
      
      console.log(`[${this.SERVICE_NAME}] 📸 Camera options configured:`, cameraOptions);
      
      const image = await Camera.getPhoto(cameraOptions);
      
      console.log(`[${this.SERVICE_NAME}] 📸 Raw camera response:`, {
        hasDataUrl: !!image.dataUrl,
        format: image.format,
        dataUrlLength: image.dataUrl?.length || 0,
        webPath: image.webPath,
        exif: image.exif ? 'present' : 'none',
        saved: image.saved
      });

      if (!image.dataUrl) {
        throw new Error('No image data received from camera');
      }

      // Convert dataUrl to blob for consistency with web implementation
      console.log(`[${this.SERVICE_NAME}] 📸 Converting dataUrl to blob...`);
      const blob = await this.dataUrlToBlob(image.dataUrl);
      
      console.log(`[${this.SERVICE_NAME}] 📸 Blob conversion complete:`, {
        blobSize: blob.size,
        blobType: blob.type
      });

      const capturedPhoto: CapturedPhoto = {
        dataUrl: image.dataUrl,
        blob,
        format: image.format || 'jpeg',
        width: 1024, // Use the requested width since Photo interface doesn't include dimensions
        height: 1024, // Use the requested height since Photo interface doesn't include dimensions
      };

      console.log(`[${this.SERVICE_NAME}] 📸 Photo capture successful:`, {
        format: capturedPhoto.format,
        dimensions: `${capturedPhoto.width}x${capturedPhoto.height}`,
        dataUrlLength: capturedPhoto.dataUrl.length,
        blobSize: capturedPhoto.blob?.size || 0
      });
      
      this.logCameraOperation(this.SERVICE_NAME, 'photo captured', {
        dimensions: `${capturedPhoto.width}x${capturedPhoto.height}`,
        dataSize: capturedPhoto.dataUrl.length,
        format: capturedPhoto.format
      });

      return capturedPhoto;
    } catch (error: any) {
      console.error(`[${this.SERVICE_NAME}] 📸 Camera capture failed:`, {
        error: error.message,
        code: error.code,
        name: error.name
      });

      // Handle specific Capacitor errors with detailed logging
      let errorMessage = 'Failed to capture photo';
      
      if (error.message?.includes('User cancelled')) {
        errorMessage = 'Camera capture was cancelled';
        console.log(`[${this.SERVICE_NAME}] 📸 User cancelled camera capture`);
      } else if (error.message?.includes('permission')) {
        errorMessage = 'Camera permission denied';
        console.log(`[${this.SERVICE_NAME}] 📸 Camera permission denied during capture`);
      } else if (error.message?.includes('unavailable')) {
        errorMessage = 'Camera is not available on this device';
        console.log(`[${this.SERVICE_NAME}] 📸 Camera unavailable during capture`);
      } else {
        errorMessage = 'Failed to capture photo';
        console.log(`[${this.SERVICE_NAME}] 📸 Generic camera capture failure`);
      }
      
      this.error.set(errorMessage);
      this.logError(this.SERVICE_NAME, 'photo capture', error);

      throw error;
    } finally {
      this.isCapturing.set(false);
      console.log(`[${this.SERVICE_NAME}] 📸 Camera capture state cleared`);
    }
  }

  /**
   * Check if camera is available and permissions are granted
   */
  async isCameraReady(): Promise<boolean> {
    console.log(`[${this.SERVICE_NAME}] 🔍 Checking if camera is ready...`);
    
    if (!this.platformService.isNative()) {
      console.log(`[${this.SERVICE_NAME}] 🔍 Non-native platform, camera not ready`);
      return false; // Web uses different camera system
    }

    try {
      const permissions = await this.checkPermissions();
      const hasCamera = this.platformService.hasCamera();
      const isReady = permissions.camera === 'granted' && hasCamera;
      
      console.log(`[${this.SERVICE_NAME}] 🔍 Camera readiness check:`, {
        permissionStatus: permissions.camera,
        hasCamera,
        isReady
      });
      
      return isReady;
    } catch (error) {
      this.logError(this.SERVICE_NAME, 'camera ready check', error);
      return false;
    }
  }
  
  // Web-specific methods (no-op on native)
  async requestCamera(options: CameraRequestOptions): Promise<MediaStream | null> {
    console.log(`[${this.SERVICE_NAME}] 🌐 requestCamera called on native (no-op)`, { options });
    return null;
  }
  
  attachToVideoElement(element: HTMLVideoElement, stream: MediaStream): void {
    console.log(`[${this.SERVICE_NAME}] 🌐 attachToVideoElement called on native (no-op)`);
  }
  
  async waitForVideoReady(element: HTMLVideoElement): Promise<void> {
    console.log(`[${this.SERVICE_NAME}] 🌐 waitForVideoReady called on native (no-op)`);
  }
  
  isCameraReadyForCapture(element: HTMLVideoElement): boolean {
    console.log(`[${this.SERVICE_NAME}] 🌐 isCameraReadyForCapture called on native (no-op)`);
    return false;
  }
  
  async captureFromVideoElement(element: HTMLVideoElement): Promise<CapturedPhoto> {
    console.log(`[${this.SERVICE_NAME}] 🌐 captureFromVideoElement called on native (no-op)`);
    throw new Error('Video capture not available on native platforms. Use capturePhoto() instead.');
  }
  
  stopCamera(): void {
    console.log(`[${this.SERVICE_NAME}] 🌐 stopCamera called on native (no-op)`);
  }

  /**
   * Open device settings for camera permissions
   */
  async openDeviceSettings(): Promise<void> {
    console.log(`[${this.SERVICE_NAME}] ⚙️  Opening device settings for camera permissions...`);
    
    if (!this.platformService.isNative()) {
      console.warn(`[${this.SERVICE_NAME}] ⚙️  Device settings only available on native platforms`);
      return;
    }

    try {
      // Note: Capacitor App plugin doesn't have openSettings method
      // This would typically redirect to system settings, but it's not available
      // Users must manually go to Settings > Privacy & Security > Camera to enable permissions
      console.log(`[${this.SERVICE_NAME}] ⚙️  Opening device settings not available via Capacitor App plugin`);
      console.log(`[${this.SERVICE_NAME}] ⚙️  User must manually enable camera permissions in device settings`);
      
      // For now, we'll just log instructions
      this.error.set('Please enable camera permissions in your device settings');
    } catch (error) {
      this.logError(this.SERVICE_NAME, 'open device settings', error);
      this.error.set('Could not open device settings');
    }
  }

  /**
   * Clear any error state
   */
  clearError(): void {
    console.log(`[${this.SERVICE_NAME}] 🧹 Clearing error state`);
    this.error.set(null);
  }

  /**
   * Reset service state
   */
  reset(): void {
    console.log(`[${this.SERVICE_NAME}] 🔄 Resetting camera service state...`);
    
    this.isCapturing.set(false);
    this.error.set(null);
    this.permissionStatus.set({ camera: 'unknown' });
    
    console.log(`[${this.SERVICE_NAME}] 🔄 Camera service reset complete`);
  }
  
  /**
   * Check if device has camera capability
   */
  hasCamera(): boolean {
    const hasCamera = this.platformService.hasCamera();
    console.log(`[${this.SERVICE_NAME}] 🔍 Camera capability check:`, {
      hasCamera,
      isNative: this.platformService.isNative(),
      platform: this.platformService.platformName()
    });
    
    return hasCamera;
  }
  
  /**
   * Check if we can request camera access
   */
  canRequestCamera(): boolean {
    const hasCamera = this.hasCamera();
    const permissionStatus = this.permissionStatus().camera;
    const canRequest = hasCamera && permissionStatus !== 'denied';
    
    console.log(`[${this.SERVICE_NAME}] 🔍 Can request camera check:`, {
      hasCamera,
      permissionStatus,
      canRequest
    });
    
    return canRequest;
  }

  /**
   * Convert data URL to blob for consistency with web camera implementation
   */
  private async dataUrlToBlob(dataUrl: string): Promise<Blob> {
    try {
      const response = await fetch(dataUrl);
      return await response.blob();
    } catch (error) {
      console.warn('[CapacitorCamera] Failed to convert dataUrl to blob:', error);
      // Return empty blob as fallback
      return new Blob([], { type: 'image/jpeg' });
    }
  }
}
