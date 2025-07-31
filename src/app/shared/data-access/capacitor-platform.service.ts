import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CapacitorPlatformService {
  // Core platform detection signals
  readonly isNative = signal(false);
  readonly isIOS = signal(false);
  readonly isAndroid = signal(false);
  readonly isWeb = computed(() => !this.isNative());

  // Capacitor capability signals
  readonly hasCamera = signal(false);
  readonly hasGeolocation = signal(false);
  readonly hasPushNotifications = signal(false);
  readonly hasAppBadge = signal(false);
  readonly hasStatusBar = signal(false);
  readonly hasHaptics = signal(false);

  constructor() {
    this.initializeCapacitor();
  }

  /**
   * Initialize Capacitor platform detection and capabilities
   */
  private async initializeCapacitor(): Promise<void> {
    try {
      // Check if Capacitor is available
      const { Capacitor } = await import('@capacitor/core');
      
      if (Capacitor.isNativePlatform()) {
        this.isNative.set(true);
        
        // Detect specific platforms
        if (Capacitor.getPlatform() === 'ios') {
          this.isIOS.set(true);
        } else if (Capacitor.getPlatform() === 'android') {
          this.isAndroid.set(true);
        }

        // Initialize capability detection
        await this.detectCapabilities();
      }
    } catch (error) {
      // Capacitor not available - running on web
      console.debug('[CapacitorPlatform] Running on web platform');
    }
  }

  /**
   * Detect available Capacitor capabilities
   */
  private async detectCapabilities(): Promise<void> {
    try {
      // Camera detection
      try {
        const { Camera } = await import('@capacitor/camera');
        this.hasCamera.set(true);
      } catch {
        // Camera plugin not available
      }

      // Geolocation (available on web too)
      this.hasGeolocation.set(true);

      // Native-only capabilities
      if (this.isNative()) {
        try {
          const { PushNotifications } = await import('@capacitor/push-notifications');
          this.hasPushNotifications.set(true);
        } catch {
          // Push notifications not available
        }

        try {
          const { App } = await import('@capacitor/app');
          this.hasAppBadge.set(true);
        } catch {
          // App plugin not available
        }

        try {
          const { StatusBar } = await import('@capacitor/status-bar');
          this.hasStatusBar.set(true);
        } catch {
          // Status bar not available
        }

        try {
          const { Haptics } = await import('@capacitor/haptics');
          this.hasHaptics.set(true);
        } catch {
          // Haptics not available
        }
      }
    } catch (error) {
      console.warn('[CapacitorPlatform] Error detecting capabilities:', error);
    }
  }

  /**
   * Execute callback only on native platforms
   */
  onlyOnNative<T>(callback: () => Promise<T>): Promise<T | null> {
    if (!this.isNative()) {
      return Promise.resolve(null);
    }
    return callback();
  }

  /**
   * Execute callback only on iOS
   */
  onlyOnIOS<T>(callback: () => Promise<T>): Promise<T | null> {
    if (!this.isIOS()) {
      return Promise.resolve(null);
    }
    return callback();
  }

  /**
   * Execute callback only on Android
   */
  onlyOnAndroid<T>(callback: () => Promise<T>): Promise<T | null> {
    if (!this.isAndroid()) {
      return Promise.resolve(null);
    }
    return callback();
  }

  /**
   * Execute platform-specific callbacks with fallback
   */
  withPlatformFallback<T>(
    nativeCallback: () => Promise<T>,
    webCallback: () => T | Promise<T>
  ): Promise<T> {
    if (this.isNative()) {
      return nativeCallback();
    }
    return Promise.resolve(webCallback());
  }

  /**
   * Execute iOS/Android specific callbacks with web fallback
   */
  withMobileFallback<T>(
    iosCallback: () => Promise<T>,
    androidCallback: () => Promise<T>,
    webCallback: () => T | Promise<T>
  ): Promise<T> {
    if (this.isIOS()) {
      return iosCallback();
    }
    if (this.isAndroid()) {
      return androidCallback();
    }
    return Promise.resolve(webCallback());
  }

  /**
   * Get platform information as object
   */
  getPlatformInfo() {
    return {
      isNative: this.isNative(),
      isIOS: this.isIOS(),
      isAndroid: this.isAndroid(),
      isWeb: this.isWeb(),
      capabilities: {
        hasCamera: this.hasCamera(),
        hasGeolocation: this.hasGeolocation(),
        hasPushNotifications: this.hasPushNotifications(),
        hasAppBadge: this.hasAppBadge(),
        hasStatusBar: this.hasStatusBar(),
        hasHaptics: this.hasHaptics(),
      },
    };
  }
}