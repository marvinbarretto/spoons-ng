import { inject, Injectable, signal } from '@angular/core';
import { CapacitorPlatformService } from '@shared/data-access/capacitor-platform.service';

export interface CameraPermissionState {
  camera: 'granted' | 'denied' | 'prompt' | 'unknown';
}

export interface CapturedPhoto {
  dataUrl: string;
  blob?: Blob;
  format: string;
  width?: number;
  height?: number;
}

@Injectable({ providedIn: 'root' })
export class CapacitorCameraService {
  private readonly platformService = inject(CapacitorPlatformService);

  // State signals
  readonly permissionStatus = signal<CameraPermissionState>({
    camera: 'unknown',
  });
  readonly isCapturing = signal(false);
  readonly error = signal<string | null>(null);

  /**
   * Check current camera permissions
   */
  async checkPermissions(): Promise<CameraPermissionState> {
    if (!this.platformService.isNative()) {
      return { camera: 'granted' }; // Web doesn't use this permission model
    }

    try {
      const cameraPlugin = await this.platformService.getPlugin<any>('@capacitor/camera');
      if (!cameraPlugin?.Camera) {
        return { camera: 'unknown' };
      }

      const permissions = await cameraPlugin.Camera.checkPermissions();
      const state: CameraPermissionState = {
        camera: permissions.camera as any,
      };

      this.permissionStatus.set(state);
      return state;
    } catch (error) {
      console.error('[CapacitorCamera] Error checking permissions:', error);
      this.error.set('Failed to check camera permissions');
      return { camera: 'unknown' };
    }
  }

  /**
   * Request camera permissions
   */
  async requestPermissions(): Promise<CameraPermissionState> {
    if (!this.platformService.isNative()) {
      return { camera: 'granted' }; // Web handles permissions differently
    }

    try {
      const cameraPlugin = await this.platformService.getPlugin<any>('@capacitor/camera');
      if (!cameraPlugin?.Camera) {
        this.error.set('Camera plugin not available');
        return { camera: 'denied' };
      }

      const permissions = await cameraPlugin.Camera.requestPermissions();
      const state: CameraPermissionState = {
        camera: permissions.camera as any,
      };

      this.permissionStatus.set(state);
      this.error.set(null);
      return state;
    } catch (error) {
      console.error('[CapacitorCamera] Error requesting permissions:', error);
      this.error.set('Failed to request camera permissions');
      return { camera: 'denied' };
    }
  }

  /**
   * Capture photo using native camera
   */
  async capturePhoto(): Promise<CapturedPhoto> {
    if (!this.platformService.isNative()) {
      throw new Error('Native camera capture only available on mobile platforms');
    }

    this.isCapturing.set(true);
    this.error.set(null);

    try {
      const cameraPlugin = await this.platformService.getPlugin<any>('@capacitor/camera');
      if (!cameraPlugin?.Camera || !cameraPlugin?.CameraResultType || !cameraPlugin?.CameraSource) {
        throw new Error('Camera plugin not available');
      }

      const { Camera, CameraResultType, CameraSource } = cameraPlugin;
      const image = await Camera.getPhoto({
        quality: 95,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        correctOrientation: true,
        width: 1024,
        height: 1024,
        preserveAspectRatio: true,
      });

      if (!image.dataUrl) {
        throw new Error('No image data received from camera');
      }

      // Convert dataUrl to blob for consistency with web implementation
      const blob = await this.dataUrlToBlob(image.dataUrl);

      const capturedPhoto: CapturedPhoto = {
        dataUrl: image.dataUrl,
        blob,
        format: image.format || 'jpeg',
        width: image.width,
        height: image.height,
      };

      console.log('[CapacitorCamera] Photo captured successfully', {
        format: capturedPhoto.format,
        width: capturedPhoto.width,
        height: capturedPhoto.height,
        dataUrlLength: capturedPhoto.dataUrl.length,
      });

      return capturedPhoto;
    } catch (error: any) {
      console.error('[CapacitorCamera] Capture failed:', error);

      // Handle specific Capacitor errors
      if (error.message?.includes('User cancelled')) {
        this.error.set('Camera capture was cancelled');
      } else if (error.message?.includes('permission')) {
        this.error.set('Camera permission denied');
      } else if (error.message?.includes('unavailable')) {
        this.error.set('Camera is not available on this device');
      } else {
        this.error.set('Failed to capture photo');
      }

      throw error;
    } finally {
      this.isCapturing.set(false);
    }
  }

  /**
   * Check if camera is available and permissions are granted
   */
  async isCameraReady(): Promise<boolean> {
    if (!this.platformService.isNative()) {
      return false; // Web uses different camera system
    }

    try {
      const permissions = await this.checkPermissions();
      return permissions.camera === 'granted' && this.platformService.hasCamera();
    } catch {
      return false;
    }
  }

  /**
   * Open device settings for camera permissions
   */
  async openDeviceSettings(): Promise<void> {
    if (!this.platformService.isNative()) {
      console.warn('[CapacitorCamera] Device settings only available on native platforms');
      return;
    }

    try {
      const appPlugin = await this.platformService.getPlugin<any>('@capacitor/app');
      if (!appPlugin?.App) {
        this.error.set('App plugin not available');
        return;
      }

      await appPlugin.App.openSettings();
    } catch (error) {
      console.error('[CapacitorCamera] Failed to open device settings:', error);
      this.error.set('Could not open device settings');
    }
  }

  /**
   * Clear any error state
   */
  clearError(): void {
    this.error.set(null);
  }

  /**
   * Reset service state
   */
  reset(): void {
    this.isCapturing.set(false);
    this.error.set(null);
    this.permissionStatus.set({ camera: 'unknown' });
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
