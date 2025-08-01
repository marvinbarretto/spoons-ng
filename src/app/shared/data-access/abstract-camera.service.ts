import { Signal } from '@angular/core';

export type CameraPermissionStatus = 'granted' | 'denied' | 'prompt' | 'unknown';

export interface CameraPermissionState {
  camera: CameraPermissionStatus;
}

export interface CapturedPhoto {
  dataUrl: string;
  blob?: Blob;
  format: string;
  width?: number;
  height?: number;
}

export interface CameraRequestOptions {
  video?: MediaTrackConstraints | boolean;
  audio?: MediaTrackConstraints | boolean;
}

/**
 * Abstract camera service interface for platform-agnostic camera functionality
 * 
 * Implementations:
 * - WebCameraService: Uses @fourfold/angular-foundation for web browsers
 * - CapacitorCameraService: Uses @capacitor/camera for iOS/Android
 */
export abstract class AbstractCameraService {
  // State signals - consistent across all implementations
  abstract readonly permissionStatus: Signal<CameraPermissionState>;
  abstract readonly isCapturing: Signal<boolean>;
  abstract readonly error: Signal<string | null>;
  
  // Core camera methods
  abstract checkPermissions(): Promise<CameraPermissionState>;
  abstract requestPermissions(): Promise<CameraPermissionState>;
  abstract capturePhoto(): Promise<CapturedPhoto>;
  abstract isCameraReady(): Promise<boolean>;
  
  // Web-specific methods (no-op on native)
  abstract requestCamera(options: CameraRequestOptions): Promise<MediaStream | null>;
  abstract attachToVideoElement(element: HTMLVideoElement, stream: MediaStream): void;
  abstract waitForVideoReady(element: HTMLVideoElement): Promise<void>;
  abstract isCameraReadyForCapture(element: HTMLVideoElement): boolean;
  abstract captureFromVideoElement(element: HTMLVideoElement): Promise<CapturedPhoto>;
  abstract stopCamera(): void;
  
  // State management
  abstract clearError(): void;
  abstract reset(): void;
  abstract openDeviceSettings(): Promise<void>;
  
  // Helper methods
  abstract hasCamera(): boolean;
  abstract canRequestCamera(): boolean;
  
  /**
   * Log camera service initialization for debugging
   * Each implementation should call this with their platform info
   */
  protected logServiceInitialization(serviceName: string, platform: string): void {
    console.log(`[${serviceName}] 🎥 Camera service initialized`, {
      platform,
      serviceName,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Log permission operations for debugging
   */
  protected logPermissionOperation(serviceName: string, operation: string, result: any): void {
    console.log(`[${serviceName}] 🔐 Permission ${operation}:`, {
      operation,
      result,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Log camera operations for debugging
   */
  protected logCameraOperation(serviceName: string, operation: string, data?: any): void {
    console.log(`[${serviceName}] 📸 Camera ${operation}:`, {
      operation,
      data,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Log error operations for debugging
   */
  protected logError(serviceName: string, operation: string, error: any): void {
    console.error(`[${serviceName}] ❌ ${operation} failed:`, {
      operation,
      error: {
        message: error?.message,
        code: error?.code,
        name: error?.name,
        stack: error?.stack?.split('\n')[0] // Just first line of stack
      },
      timestamp: new Date().toISOString()
    });
  }
}