import { Injectable, inject, signal } from '@angular/core';
import { LocationPosition } from '../abstract-location.service';
import { CapacitorLocationService } from '../capacitor-location.service';
import { PlatformDetectionService } from '../platform-detection.service';

/**
 * Mobile Location Optimizer Service
 *
 * PURPOSE: Provides Android/iOS-specific location optimizations that don't interfere
 * with the working web app. Focuses on solving mobile-specific issues:
 *
 * - Slow GPS cold start (10-30 seconds)
 * - Permission request timing
 * - Location caching for instant check-ins
 * - Android/iOS specific quirks
 *
 * SEPARATION: This service is ONLY for native mobile platforms.
 * Web location continues to work through existing WebLocationService.
 *
 * DESIGN: Wraps and enhances CapacitorLocationService without modifying it.
 * Can be disabled via feature flag if needed.
 */
@Injectable({ providedIn: 'root' })
export class MobileLocationOptimizer {
  // Dependencies
  private readonly capacitorLocationService = inject(CapacitorLocationService);
  private readonly platformService = inject(PlatformDetectionService);

  // Service identification
  private readonly SERVICE_NAME = 'MobileLocationOptimizer';

  // State signals for mobile-specific tracking
  readonly isWarming = signal(false);
  readonly warmingStartTime = signal<number | null>(null);
  readonly lastWarmingDuration = signal<number | null>(null);
  readonly warmingAttempts = signal(0);
  readonly isInitialized = signal(false);

  constructor() {
    console.log(`[${this.SERVICE_NAME}] 📱 Mobile location optimizer initialized`);
    console.log(`[${this.SERVICE_NAME}] 📱 Platform info:`, {
      isNative: this.platformService.isNative,
      isAndroid: this.platformService.isAndroid,
      isIOS: this.platformService.isIOS,
      platform: this.platformService.platform,
    });
  }

  /**
   * Initialize mobile location optimizations
   *
   * PURPOSE: Called at app startup to prepare location services for mobile.
   * This is the main entry point for all mobile location optimizations.
   *
   * WHAT IT DOES:
   * 1. Checks if we're on a mobile platform
   * 2. Performs early permission check (non-blocking)
   * 3. Starts background location warming if permitted
   * 4. Sets up mobile-specific configurations
   *
   * SAFE: Won't affect web app, won't block startup, handles all errors gracefully
   */
  async initializeMobileLocation(): Promise<void> {
    console.log(`[${this.SERVICE_NAME}] 🚀 Starting mobile location initialization...`);

    // Only run on native platforms
    if (!this.platformService.isNative) {
      console.log(
        `[${this.SERVICE_NAME}] 🌐 Not on native platform - skipping mobile optimizations`
      );
      return;
    }

    try {
      const startTime = Date.now();

      // Step 1: Early permission check (uses our enhanced methods)
      console.log(`[${this.SERVICE_NAME}] 🔍 Running early permission check...`);
      const hasPermission = await this.capacitorLocationService.initializeEarlyPermissionCheck();

      console.log(`[${this.SERVICE_NAME}] 🔍 Permission check result:`, {
        hasPermission,
        permissionStatus: this.capacitorLocationService.permissionStatus(),
        canRequest: this.capacitorLocationService.canRequestLocation(),
      });

      // Step 2: Start background warming if we have permission
      if (hasPermission) {
        console.log(`[${this.SERVICE_NAME}] 🔥 Starting background location warming...`);
        this.startLocationWarming();
      } else {
        console.log(
          `[${this.SERVICE_NAME}] 📍 Location permission not granted - will request when needed`
        );
      }

      // Step 3: Mark as initialized
      this.isInitialized.set(true);

      const duration = Date.now() - startTime;
      console.log(
        `[${this.SERVICE_NAME}] ✅ Mobile location initialization complete (${duration}ms)`
      );
    } catch (error) {
      console.error(`[${this.SERVICE_NAME}] ❌ Mobile location initialization failed:`, error);
      // Don't throw - this shouldn't break app startup
      this.isInitialized.set(false);
    }
  }

  /**
   * Start background location warming
   *
   * PURPOSE: Begin acquiring location in background so it's ready when needed.
   * This is the key mobile optimization - pre-warm GPS for instant check-ins.
   *
   * ANDROID SPECIFIC: Cold GPS start can take 15-30 seconds
   * SOLUTION: Start warming in background, cache result for instant use
   */
  private startLocationWarming(): void {
    if (this.isWarming()) {
      console.log(`[${this.SERVICE_NAME}] 🔥 Location warming already in progress - skipping`);
      return;
    }

    console.log(`[${this.SERVICE_NAME}] 🔥 Starting location warming process...`);

    this.isWarming.set(true);
    this.warmingStartTime.set(Date.now());
    this.warmingAttempts.update(count => count + 1);

    // Use enhanced warming method with mobile-optimized settings
    this.capacitorLocationService
      .warmLocation({
        timeout: 20000, // 20s timeout for Android cold start
        maxAge: 30000, // Accept 30s old location for warming
        highAccuracy: true, // Use GPS for best accuracy
      })
      .then(success => {
        const duration = Date.now() - this.warmingStartTime()!;
        this.lastWarmingDuration.set(duration);

        console.log(`[${this.SERVICE_NAME}] 🔥 Location warming completed:`, {
          success,
          duration: `${duration}ms`,
          attempts: this.warmingAttempts(),
          hasLocation: this.capacitorLocationService.hasFreshCachedLocation(),
        });

        if (success) {
          console.log(`[${this.SERVICE_NAME}] ✅ Location is now warmed and ready for instant use`);
        } else {
          console.log(
            `[${this.SERVICE_NAME}] ⚠️ Location warming failed - will retry on next app activation`
          );
        }
      })
      .catch(error => {
        const duration = Date.now() - this.warmingStartTime()!;
        this.lastWarmingDuration.set(duration);

        console.warn(`[${this.SERVICE_NAME}] 🔥 Location warming failed (${duration}ms):`, error);
      })
      .finally(() => {
        this.isWarming.set(false);
        this.warmingStartTime.set(null);
      });
  }

  /**
   * Get instant location for check-ins
   *
   * PURPOSE: Mobile-optimized location retrieval for time-sensitive operations
   * like pub check-ins. Uses cached location when available for instant response.
   *
   * MOBILE OPTIMIZATION:
   * - Returns cached location immediately if fresh (< 2 minutes)
   * - Falls back to enhanced location request with longer timeout
   * - Handles Android-specific GPS quirks
   *
   * @param maxCacheAge Maximum age of cached location to accept (default: 2 minutes)
   * @returns Promise<LocationPosition>
   */
  async getLocationForCheckIn(maxCacheAge: number = 120000): Promise<LocationPosition> {
    console.log(`[${this.SERVICE_NAME}] 📍 Getting location for check-in...`);

    const startTime = Date.now();

    try {
      // Try cached location first for instant response
      if (this.capacitorLocationService.hasFreshCachedLocation(maxCacheAge)) {
        const cachedLocation = this.capacitorLocationService.currentPosition()!;
        const age = cachedLocation.timestamp ? Date.now() - cachedLocation.timestamp : 0;

        console.log(
          `[${this.SERVICE_NAME}] ⚡ Using cached location for check-in (age: ${Math.round(age / 1000)}s)`
        );
        return cachedLocation;
      }

      // No fresh cached location - get new one with mobile optimizations
      console.log(
        `[${this.SERVICE_NAME}] 📍 No fresh cached location - requesting new location...`
      );

      const location = await this.capacitorLocationService.getCurrentLocationEnhanced(false);

      const duration = Date.now() - startTime;
      console.log(`[${this.SERVICE_NAME}] 📍 Fresh location acquired for check-in (${duration}ms)`);

      return location;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(
        `[${this.SERVICE_NAME}] 📍 Failed to get location for check-in (${duration}ms):`,
        error
      );
      throw error;
    }
  }

  /**
   * Request location permission with mobile-friendly UX
   *
   * PURPOSE: Handle location permission requests with mobile-specific considerations:
   * - Clear explanation of why location is needed
   * - Handles "denied" vs "permanently denied" states
   * - Provides settings guidance for Android/iOS
   *
   * ANDROID: Can request approximate then precise location
   * iOS: Requests "when in use" permission
   */
  async requestLocationPermission(): Promise<boolean> {
    console.log(`[${this.SERVICE_NAME}] 🔐 Requesting location permission with mobile UX...`);

    try {
      const result = await this.capacitorLocationService.requestPermission();

      console.log(`[${this.SERVICE_NAME}] 🔐 Location permission result:`, result);

      if (result === 'granted') {
        console.log(`[${this.SERVICE_NAME}] ✅ Location permission granted - starting warming`);
        // Start warming immediately after permission granted
        this.startLocationWarming();
        return true;
      }

      if (result === 'denied') {
        console.log(`[${this.SERVICE_NAME}] ❌ Location permission denied`);
        // TODO: Show user guidance for enabling in settings
        return false;
      }

      console.log(`[${this.SERVICE_NAME}] ⚠️ Location permission status: ${result}`);
      return false;
    } catch (error) {
      console.error(`[${this.SERVICE_NAME}] 🔐 Location permission request failed:`, error);
      return false;
    }
  }

  /**
   * Get mobile location optimization status
   *
   * PURPOSE: Debugging and monitoring helper to see mobile optimization state
   *
   * @returns Object with current mobile optimization status
   */
  getOptimizationStatus() {
    return {
      isInitialized: this.isInitialized(),
      isWarming: this.isWarming(),
      warmingAttempts: this.warmingAttempts(),
      lastWarmingDuration: this.lastWarmingDuration(),
      hasPermission: this.capacitorLocationService.hasLocationPermission(),
      permissionStatus: this.capacitorLocationService.permissionStatus(),
      hasCachedLocation: this.capacitorLocationService.hasFreshCachedLocation(),
      platform: {
        isNative: this.platformService.isNative,
        isAndroid: this.platformService.isAndroid,
        isIOS: this.platformService.isIOS,
        platformName: this.platformService.platform,
      },
    };
  }

  /**
   * Reset mobile optimizations
   *
   * PURPOSE: Clear all mobile-specific state and restart optimizations.
   * Useful for debugging or when app returns from background.
   */
  reset(): void {
    console.log(`[${this.SERVICE_NAME}] 🔄 Resetting mobile location optimizations...`);

    this.isWarming.set(false);
    this.warmingStartTime.set(null);
    this.lastWarmingDuration.set(null);
    this.warmingAttempts.set(0);
    this.isInitialized.set(false);

    // Also reset underlying location service
    this.capacitorLocationService.reset();

    console.log(`[${this.SERVICE_NAME}] 🔄 Mobile location optimizer reset complete`);
  }
}
