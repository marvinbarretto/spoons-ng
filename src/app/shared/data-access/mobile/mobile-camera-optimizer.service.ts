import { Injectable, inject, signal } from '@angular/core';
import { CapacitorCameraService } from '../../../check-in/data-access/capacitor-camera.service';
import { PlatformDetectionService } from '../platform-detection.service';
import { CapturedPhoto } from '../abstract-camera.service';

/**
 * Mobile Camera Optimizer Service
 * 
 * PURPOSE: Provides Android/iOS-specific camera optimizations that solve
 * mobile camera issues without affecting the working web app.
 * 
 * ANDROID ISSUES ADDRESSED:
 * - Black camera preview screen
 * - Video element binding timing problems
 * - Camera permission edge cases
 * - Native camera fallback when video fails
 * 
 * iOS ISSUES ADDRESSED:
 * - Camera permission handling
 * - Video preview optimization
 * - Native camera integration
 * 
 * SEPARATION: This service is ONLY for native mobile platforms.
 * Web camera continues to work through existing WebCameraService.
 * 
 * DESIGN: Wraps and enhances CapacitorCameraService for mobile-specific optimizations.
 */
@Injectable({ providedIn: 'root' })
export class MobileCameraOptimizer {
  
  // Dependencies
  private readonly capacitorCameraService: CapacitorCameraService = inject(CapacitorCameraService);
  private readonly platformService = inject(PlatformDetectionService);
  
  // Service identification
  private readonly SERVICE_NAME = 'MobileCameraOptimizer';
  
  // Mobile-specific camera state
  readonly isInitialized = signal(false);
  readonly cameraReadinessChecked = signal(false);
  readonly videoElementReady = signal(false);
  readonly fallbackMode = signal(false);
  readonly lastCameraTest = signal<number | null>(null);
  
  // Error tracking for mobile debugging
  readonly initializationErrors = signal<string[]>([]);
  readonly cameraErrors = signal<string[]>([]);
  
  constructor() {
    console.log(`[${this.SERVICE_NAME}] 📱 Mobile camera optimizer initialized`);
    console.log(`[${this.SERVICE_NAME}] 📱 Platform info:`, {
      isNative: this.platformService.isNative,
      isAndroid: this.platformService.isAndroid,
      isIOS: this.platformService.isIOS,
      hasCamera: this.platformService.hasCamera,
      platform: this.platformService.platform
    });
  }

  /**
   * Initialize mobile camera optimizations
   * 
   * PURPOSE: Prepare camera services for mobile with platform-specific optimizations.
   * Called at app startup or when camera features are first needed.
   * 
   * ANDROID FOCUS: Handles timing issues and permission edge cases
   * iOS FOCUS: Ensures proper camera access and permission flow
   * 
   * SAFE: Won't affect web app, handles all errors gracefully
   */
  async initializeMobileCamera(): Promise<boolean> {
    console.log(`[${this.SERVICE_NAME}] 🚀 Starting mobile camera initialization...`);
    
    // Only run on native platforms
    if (!this.platformService.isNative) {
      console.log(`[${this.SERVICE_NAME}] 🌐 Not on native platform - skipping mobile camera optimizations`);
      return false;
    }

    // Check if device has camera capability
    if (!this.platformService.hasCamera) {
      console.log(`[${this.SERVICE_NAME}] 📷 Device has no camera - skipping initialization`);
      this.addError('Camera not available on this device');
      return false;
    }

    try {
      const startTime = Date.now();
      this.clearErrors();
      
      // Step 1: Check camera permissions early
      console.log(`[${this.SERVICE_NAME}] 🔍 Checking camera permissions...`);
      const permissionStatus = await this.capacitorCameraService.checkPermissions();
      
      console.log(`[${this.SERVICE_NAME}] 🔍 Camera permission status:`, permissionStatus);

      // Step 2: Test camera readiness (mobile-specific)
      console.log(`[${this.SERVICE_NAME}] 🧪 Testing camera readiness...`);
      const isCameraReady = await this.testCameraReadiness();
      
      console.log(`[${this.SERVICE_NAME}] 🧪 Camera readiness test result:`, isCameraReady);

      // Step 3: Determine if we need fallback mode
      const needsFallback = !isCameraReady || permissionStatus.camera === 'denied';
      this.fallbackMode.set(needsFallback);
      
      if (needsFallback) {
        console.log(`[${this.SERVICE_NAME}] 🔄 Camera will use fallback mode (native capture only)`);
      }

      // Step 4: Mark as initialized
      this.isInitialized.set(true);
      this.cameraReadinessChecked.set(true);
      this.lastCameraTest.set(Date.now());
      
      const duration = Date.now() - startTime;
      console.log(`[${this.SERVICE_NAME}] ✅ Mobile camera initialization complete (${duration}ms)`, {
        permissionStatus: permissionStatus.camera,
        cameraReady: isCameraReady,
        fallbackMode: needsFallback
      });

      return true;

    } catch (error) {
      console.error(`[${this.SERVICE_NAME}] ❌ Mobile camera initialization failed:`, error);
      this.addError(`Initialization failed: ${error}`);
      this.isInitialized.set(false);
      return false;
    }
  }

  /**
   * Test camera readiness for mobile platforms
   * 
   * PURPOSE: Perform Android/iOS-specific camera availability tests
   * before attempting to show video preview or capture photos.
   * 
   * ANDROID: Tests for common camera access issues
   * iOS: Verifies camera permissions and availability
   * 
   * @returns Promise<boolean> - true if camera is ready for use
   */
  private async testCameraReadiness(): Promise<boolean> {
    console.log(`[${this.SERVICE_NAME}] 🧪 Running camera readiness test...`);
    
    try {
      // Use existing camera service method
      const isReady = await this.capacitorCameraService.isCameraReady();
      
      console.log(`[${this.SERVICE_NAME}] 🧪 Camera readiness result:`, {
        isReady,
        hasCamera: this.capacitorCameraService.hasCamera(),
        canRequest: this.capacitorCameraService.canRequestCamera(),
        permissionStatus: this.capacitorCameraService.permissionStatus()
      });

      return isReady;

    } catch (error) {
      console.error(`[${this.SERVICE_NAME}] 🧪 Camera readiness test failed:`, error);
      this.addError(`Readiness test failed: ${error}`);
      return false;
    }
  }

  /**
   * Enhanced camera permission request with mobile UX
   * 
   * PURPOSE: Handle camera permission requests with mobile-friendly flow:
   * - Clear explanation of why camera is needed
   * - Platform-specific permission guidance
   * - Fallback options when denied
   * 
   * ANDROID: Handles different permission states
   * iOS: Provides clear user guidance
   */
  async requestCameraPermission(): Promise<boolean> {
    console.log(`[${this.SERVICE_NAME}] 🔐 Requesting camera permission with mobile UX...`);
    
    try {
      const result = await this.capacitorCameraService.requestPermissions();
      
      console.log(`[${this.SERVICE_NAME}] 🔐 Camera permission result:`, result);
      
      if (result.camera === 'granted') {
        console.log(`[${this.SERVICE_NAME}] ✅ Camera permission granted`);
        // Test camera again after permission granted
        const isReady = await this.testCameraReadiness();
        this.fallbackMode.set(!isReady);
        return true;
      }

      if (result.camera === 'denied') {
        console.log(`[${this.SERVICE_NAME}] ❌ Camera permission denied - enabling fallback mode`);
        this.fallbackMode.set(true);
        // TODO: Show user guidance for enabling in settings
        return false;
      }

      console.log(`[${this.SERVICE_NAME}] ⚠️ Camera permission status: ${result.camera}`);
      return false;

    } catch (error) {
      console.error(`[${this.SERVICE_NAME}] 🔐 Camera permission request failed:`, error);
      this.addError(`Permission request failed: ${error}`);
      return false;
    }
  }

  /**
   * Mobile-optimized photo capture
   * 
   * PURPOSE: Capture photos with mobile-specific optimizations and fallbacks.
   * Handles both video preview capture and native camera capture.
   * 
   * STRATEGY:
   * 1. Try video element capture if available (for preview UX)
   * 2. Fall back to native camera if video fails
   * 3. Handle Android/iOS-specific capture quirks
   * 
   * @param videoElement Optional video element for preview capture
   * @returns Promise<CapturedPhoto>
   */
  async capturePhotoOptimized(videoElement?: HTMLVideoElement): Promise<CapturedPhoto> {
    console.log(`[${this.SERVICE_NAME}] 📸 Starting mobile-optimized photo capture...`, {
      hasVideoElement: !!videoElement,
      fallbackMode: this.fallbackMode(),
      cameraReady: this.cameraReadinessChecked()
    });

    try {
      // Ensure camera is initialized
      if (!this.isInitialized()) {
        console.log(`[${this.SERVICE_NAME}] 🚀 Camera not initialized - initializing now...`);
        await this.initializeMobileCamera();
      }

      // Check permissions first
      const hasPermission = this.capacitorCameraService.permissionStatus().camera === 'granted';
      if (!hasPermission) {
        console.log(`[${this.SERVICE_NAME}] 🔐 No camera permission - requesting...`);
        const permissionGranted = await this.requestCameraPermission();
        if (!permissionGranted) {
          throw new Error('Camera permission is required to take photos');
        }
      }

      // Strategy 1: Try video element capture if available and not in fallback mode
      if (videoElement && !this.fallbackMode() && this.isVideoElementReady(videoElement)) {
        console.log(`[${this.SERVICE_NAME}] 📸 Attempting video element capture...`);
        
        try {
          // TODO: Implement video element capture when video preview is working
          // For now, skip to native capture
          console.log(`[${this.SERVICE_NAME}] 📸 Video element capture not implemented yet - using native`);
        } catch (videoError) {
          console.warn(`[${this.SERVICE_NAME}] 📸 Video element capture failed, falling back to native:`, videoError);
        }
      }

      // Strategy 2: Native camera capture (primary method for mobile)
      console.log(`[${this.SERVICE_NAME}] 📸 Using native camera capture...`);
      const photo = await this.capacitorCameraService.capturePhoto();
      
      console.log(`[${this.SERVICE_NAME}] 📸 Mobile photo capture successful:`, {
        format: photo.format,
        dataUrlLength: photo.dataUrl.length,
        blobSize: photo.blob?.size || 0
      });

      return photo;

    } catch (error) {
      console.error(`[${this.SERVICE_NAME}] 📸 Mobile photo capture failed:`, error);
      this.addError(`Photo capture failed: ${error}`);
      throw error;
    }
  }

  /**
   * Check if video element is ready for capture
   * 
   * PURPOSE: Android-specific check for video element readiness.
   * Video preview often fails on Android, so we need proper validation.
   * 
   * @param videoElement HTML video element to check
   * @returns boolean - true if video element is ready for capture
   */
  isVideoElementReady(videoElement: HTMLVideoElement): boolean {
    if (!videoElement) {
      return false;
    }

    const isReady = videoElement.readyState >= 2 && // HAVE_CURRENT_DATA or higher
                   videoElement.videoWidth > 0 &&
                   videoElement.videoHeight > 0 &&
                   !videoElement.paused;

    console.log(`[${this.SERVICE_NAME}] 📹 Video element readiness check:`, {
      readyState: videoElement.readyState,
      videoWidth: videoElement.videoWidth,
      videoHeight: videoElement.videoHeight,
      paused: videoElement.paused,
      isReady
    });

    this.videoElementReady.set(isReady);
    return isReady;
  }

  /**
   * Open device camera settings
   * 
   * PURPOSE: Help users enable camera permissions when they've been denied.
   * Provides platform-specific guidance for Android/iOS.
   */
  async openCameraSettings(): Promise<void> {
    console.log(`[${this.SERVICE_NAME}] ⚙️ Opening camera settings...`);
    
    try {
      await this.capacitorCameraService.openDeviceSettings();
    } catch (error) {
      console.error(`[${this.SERVICE_NAME}] ⚙️ Failed to open camera settings:`, error);
      
      // Provide platform-specific guidance
      if (this.platformService.isAndroid) {
        console.log(`[${this.SERVICE_NAME}] 🤖 Android: Go to Settings > Apps > Spoons > Permissions > Camera`);
      } else if (this.platformService.isIOS) {
        console.log(`[${this.SERVICE_NAME}] 🍎 iOS: Go to Settings > Privacy & Security > Camera > Spoons`);
      }
    }
  }

  /**
   * Get mobile camera optimization status
   * 
   * PURPOSE: Debugging and monitoring helper for mobile camera state
   */
  getOptimizationStatus() {
    return {
      isInitialized: this.isInitialized(),
      cameraReadinessChecked: this.cameraReadinessChecked(),
      videoElementReady: this.videoElementReady(),
      fallbackMode: this.fallbackMode(),
      lastCameraTest: this.lastCameraTest(),
      errors: {
        initialization: this.initializationErrors(),
        camera: this.cameraErrors()
      },
      permissions: this.capacitorCameraService.permissionStatus(),
      platform: {
        isNative: this.platformService.isNative,
        isAndroid: this.platformService.isAndroid,
        isIOS: this.platformService.isIOS,
        hasCamera: this.platformService.hasCamera
      }
    };
  }

  /**
   * Reset mobile camera optimizations
   * 
   * PURPOSE: Clear all mobile-specific camera state and restart optimizations
   */
  reset(): void {
    console.log(`[${this.SERVICE_NAME}] 🔄 Resetting mobile camera optimizations...`);
    
    this.isInitialized.set(false);
    this.cameraReadinessChecked.set(false);
    this.videoElementReady.set(false);
    this.fallbackMode.set(false);
    this.lastCameraTest.set(null);
    this.clearErrors();
    
    // Also reset underlying camera service
    this.capacitorCameraService.reset();
    
    console.log(`[${this.SERVICE_NAME}] 🔄 Mobile camera optimizer reset complete`);
  }

  /**
   * Add error to tracking arrays
   */
  private addError(error: string): void {
    console.error(`[${this.SERVICE_NAME}] 📝 Adding error: ${error}`);
    this.cameraErrors.update(errors => [...errors, error].slice(-5)); // Keep last 5 errors
  }

  /**
   * Clear all tracked errors
   */
  private clearErrors(): void {
    this.initializationErrors.set([]);
    this.cameraErrors.set([]);
  }
}