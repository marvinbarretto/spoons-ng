import { Injectable, inject, signal } from '@angular/core';
import { PlatformDetectionService } from '../platform-detection.service';
import { MobileLocationOptimizer } from './mobile-location-optimizer.service';
// MobileCameraOptimizer removed - using direct platform conditionals in components

/**
 * Mobile Initialization Service
 *
 * PURPOSE: Central coordinator for all mobile-specific optimizations.
 * Ensures proper initialization order and handles mobile platform setup.
 *
 * RESPONSIBILITIES:
 * - Detect mobile platform and capabilities
 * - Initialize location optimizations
 * - Initialize camera optimizations
 * - Provide mobile feature flags
 * - Handle initialization errors gracefully
 *
 * SEPARATION: Only active on native mobile platforms (Android/iOS).
 * Web initialization continues through existing app.config.ts setup.
 *
 * USAGE: Called once during app startup via app.config.ts APP_INITIALIZER
 */
@Injectable({ providedIn: 'root' })
export class MobileInitializationService {
  // Dependencies
  private readonly platformService = inject(PlatformDetectionService);
  private readonly locationOptimizer = inject(MobileLocationOptimizer);
  // Camera optimizer removed - using direct platform conditionals

  // Service identification
  private readonly SERVICE_NAME = 'MobileInitializationService';

  // Initialization state tracking
  readonly isInitialized = signal(false);
  readonly initializationStartTime = signal<number | null>(null);
  readonly initializationDuration = signal<number | null>(null);
  readonly initializationErrors = signal<string[]>([]);

  // Feature availability flags
  readonly mobileOptimizationsEnabled = signal(false);
  readonly locationOptimizationEnabled = signal(false);
  // Camera optimization removed - using direct platform conditionals

  // Platform detection results
  readonly platformInfo = signal<{
    isNative: boolean;
    isAndroid: boolean;
    isIOS: boolean;
    platform: string;
    hasCamera: boolean;
    hasLocation: boolean;
  } | null>(null);

  constructor() {
    console.log(`[${this.SERVICE_NAME}] 📱 Mobile initialization service created`);
  }

  /**
   * Initialize all mobile optimizations
   *
   * PURPOSE: Main entry point for mobile platform setup. Called during app startup.
   * Coordinates location and camera optimizations in proper order.
   *
   * FLOW:
   * 1. Detect platform and capabilities
   * 2. Initialize location optimizations (if supported)
   * 3. Initialize camera optimizations (if supported)
   * 4. Set feature flags for UI
   * 5. Handle any errors gracefully
   *
   * SAFE: Never throws errors, won't block app startup
   *
   * @returns Promise<boolean> - true if mobile optimizations are active
   */
  async initializeMobileOptimizations(): Promise<boolean> {
    console.log(`[${this.SERVICE_NAME}] 🚀 Starting mobile optimizations initialization...`);

    this.initializationStartTime.set(Date.now());
    this.clearErrors();

    try {
      // Step 1: Platform detection and capability check
      const platformInfo = this.detectPlatformCapabilities();
      this.platformInfo.set(platformInfo);

      console.log(`[${this.SERVICE_NAME}] 📱 Platform detection complete:`, platformInfo);

      // Skip mobile optimizations if not on native platform
      if (!platformInfo.isNative) {
        console.log(
          `[${this.SERVICE_NAME}] 🌐 Not on native platform - skipping mobile optimizations`
        );
        this.markInitializationComplete(false);
        return false;
      }

      // Step 2: Initialize location optimizations
      let locationSuccess = false;
      if (platformInfo.hasLocation) {
        console.log(`[${this.SERVICE_NAME}] 📍 Initializing location optimizations...`);
        try {
          await this.locationOptimizer.initializeMobileLocation();
          locationSuccess = true;
          this.locationOptimizationEnabled.set(true);
          console.log(`[${this.SERVICE_NAME}] ✅ Location optimizations initialized`);
        } catch (error) {
          console.warn(`[${this.SERVICE_NAME}] ⚠️ Location optimization failed:`, error);
          this.addError(`Location initialization failed: ${error}`);
        }
      } else {
        console.log(`[${this.SERVICE_NAME}] 📍 Device has no location capability - skipping`);
      }

      // Camera optimization removed - components handle camera directly

      // Step 3: Determine overall success
      const overallSuccess = locationSuccess;
      this.mobileOptimizationsEnabled.set(overallSuccess);

      console.log(`[${this.SERVICE_NAME}] 📊 Mobile optimizations summary:`, {
        location: locationSuccess,
        overall: overallSuccess,
        errors: this.initializationErrors().length,
      });

      this.markInitializationComplete(overallSuccess);
      return overallSuccess;
    } catch (error) {
      console.error(`[${this.SERVICE_NAME}] ❌ Mobile initialization failed:`, error);
      this.addError(`Overall initialization failed: ${error}`);
      this.markInitializationComplete(false);
      return false;
    }
  }

  /**
   * Detect platform capabilities
   *
   * PURPOSE: Comprehensive platform detection to determine what mobile
   * optimizations are possible and needed.
   */
  private detectPlatformCapabilities() {
    const capabilities = {
      isNative: this.platformService.isNative,
      isAndroid: this.platformService.isAndroid,
      isIOS: this.platformService.isIOS,
      platform: this.platformService.platform,
      hasCamera: this.platformService.hasCamera,
      hasLocation: this.platformService.hasGeolocation,
    };

    console.log(`[${this.SERVICE_NAME}] 🔍 Platform capabilities detected:`, capabilities);

    return capabilities;
  }

  /**
   * Mark initialization as complete and record metrics
   */
  private markInitializationComplete(success: boolean): void {
    const duration = Date.now() - this.initializationStartTime()!;
    this.initializationDuration.set(duration);
    this.isInitialized.set(true);

    console.log(`[${this.SERVICE_NAME}] ${success ? '✅' : '⚠️'} Mobile initialization complete:`, {
      success,
      duration: `${duration}ms`,
      errors: this.initializationErrors().length,
      locationEnabled: this.locationOptimizationEnabled(),
      // Camera optimization removed
    });
  }

  /**
   * Check if mobile optimizations are available and working
   *
   * PURPOSE: Quick check for UI and other services to determine if they
   * should use mobile-optimized code paths.
   *
   * @returns boolean - true if mobile optimizations are active
   */
  areMobileOptimizationsActive(): boolean {
    return this.mobileOptimizationsEnabled() && this.isInitialized();
  }

  /**
   * Check if location optimizations are available
   */
  isLocationOptimizationAvailable(): boolean {
    return this.locationOptimizationEnabled() && this.isInitialized();
  }

  // Camera optimization removed - components handle camera directly

  /**
   * Get comprehensive mobile status for debugging
   *
   * PURPOSE: Complete mobile optimization status for debugging, monitoring,
   * and troubleshooting mobile-specific issues.
   */
  getMobileStatus() {
    return {
      initialization: {
        isInitialized: this.isInitialized(),
        duration: this.initializationDuration(),
        errors: this.initializationErrors(),
        startTime: this.initializationStartTime(),
      },
      features: {
        mobileOptimizationsEnabled: this.mobileOptimizationsEnabled(),
        locationOptimizationEnabled: this.locationOptimizationEnabled(),
        // Camera optimization removed
      },
      platform: this.platformInfo(),
      services: {
        location: this.locationOptimizer.getOptimizationStatus(),
        // Camera optimizer removed
      },
    };
  }

  /**
   * Reset all mobile optimizations
   *
   * PURPOSE: Complete reset of mobile state. Useful for debugging
   * or when app returns from background.
   */
  reset(): void {
    console.log(`[${this.SERVICE_NAME}] 🔄 Resetting all mobile optimizations...`);

    // Reset state
    this.isInitialized.set(false);
    this.initializationStartTime.set(null);
    this.initializationDuration.set(null);
    this.mobileOptimizationsEnabled.set(false);
    this.locationOptimizationEnabled.set(false);
    // Camera optimization removed
    this.clearErrors();

    // Reset optimizers
    this.locationOptimizer.reset();
    // Camera optimizer removed

    console.log(`[${this.SERVICE_NAME}] 🔄 Mobile optimizations reset complete`);
  }

  /**
   * Enable mobile debugging console commands
   *
   * PURPOSE: Add debugging commands to browser console for mobile testing
   */
  enableMobileDebugCommands(): void {
    console.log(`[${this.SERVICE_NAME}] 🛠️ Attempting to enable mobile debug commands...`);

    if (typeof window !== 'undefined') {
      console.log(`[${this.SERVICE_NAME}] 🛠️ Window is available, setting up debug commands...`);

      // Add mobile debugging commands to global scope
      (window as any).mobileDebug = {
        status: () => {
          console.log('Getting mobile status...');
          return this.getMobileStatus();
        },
        reset: () => {
          console.log('Resetting mobile optimizations...');
          return this.reset();
        },
        reinitialize: () => {
          console.log('Reinitializing mobile optimizations...');
          return this.initializeMobileOptimizations();
        },
        location: () => {
          console.log('Getting location optimizer status...');
          return this.locationOptimizer.getOptimizationStatus();
        },
        camera: () => {
          console.log('Getting camera optimizer status...');
          return 'Camera optimizer removed';
        },
        test: () => {
          console.log('Mobile debug commands are working!');
          return 'Mobile debug commands are active';
        },
      };

      // Also add direct references for easier access
      (window as any).mobileLocationOptimizer = this.locationOptimizer;
      // (window as any).mobileCameraOptimizer = removed;
      (window as any).mobileInitService = this;

      console.log(`[${this.SERVICE_NAME}] ✅ Mobile debug commands enabled successfully!`);
      console.log(`[${this.SERVICE_NAME}] 🛠️ Available commands:`);
      console.log(`[${this.SERVICE_NAME}] 🛠️ - mobileDebug.test()`);
      console.log(`[${this.SERVICE_NAME}] 🛠️ - mobileDebug.status()`);
      console.log(`[${this.SERVICE_NAME}] 🛠️ - mobileDebug.location()`);
      console.log(`[${this.SERVICE_NAME}] 🛠️ - mobileDebug.camera()`);
      console.log(`[${this.SERVICE_NAME}] 🛠️ - window.mobileLocationOptimizer`);
      console.log(`[${this.SERVICE_NAME}] 🛠️ - window.mobileCameraOptimizer`);

      // Test that it's actually attached
      console.log(
        `[${this.SERVICE_NAME}] 🧪 Testing window.mobileDebug:`,
        !!(window as any).mobileDebug
      );
    } else {
      console.warn(
        `[${this.SERVICE_NAME}] ⚠️ Window is not available - debug commands not enabled`
      );
    }
  }

  /**
   * Add error to tracking
   */
  private addError(error: string): void {
    this.initializationErrors.update(errors => [...errors, error]);
  }

  /**
   * Clear all errors
   */
  private clearErrors(): void {
    this.initializationErrors.set([]);
  }
}
