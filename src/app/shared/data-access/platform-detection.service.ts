import { Injectable, inject } from '@angular/core';
import { SsrPlatformService } from '@fourfold/angular-foundation';

/**
 * Platform Detection Service
 *
 * PURPOSE: Reliable, synchronous platform detection for web/Android/iOS
 * Replaces complex async platform detection with simple, immediate results
 *
 * KEY FEATURES:
 * - Synchronous detection (no async delays)
 * - SSR-safe (works during server-side rendering)
 * - User agent based (reliable, immediate)
 * - Capacitor integration for native app detection
 *
 * DESIGN DECISION: Uses user agent + window.location for immediate detection
 * rather than async Capacitor imports that can fail or be delayed
 */
@Injectable({ providedIn: 'root' })
export class PlatformDetectionService {
  private readonly ssrPlatform = inject(SsrPlatformService);

  // Cached detection results
  private _platformInfo: PlatformInfo | null = null;

  constructor() {
    // Detect platform immediately on service creation
    this._platformInfo = this.detectPlatform();

    console.log('[PlatformDetectionService] 🔍 Platform detected:', this._platformInfo);
  }

  /**
   * Detect platform synchronously
   */
  private detectPlatform(): PlatformInfo {
    // SSR-safe platform detection
    const window = this.ssrPlatform.getWindow();
    const userAgent = window?.navigator?.userAgent || '';
    const location = window?.location?.protocol || 'https:';

    // Native app detection
    const isCapacitorApp =
      location === 'capacitor:' ||
      location === 'file:' ||
      window?.location?.hostname === 'localhost';
    const isIOSUserAgent = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroidUserAgent = /Android/.test(userAgent);

    // Platform determination
    let platform: 'web' | 'ios' | 'android';
    let isNative: boolean;

    if (isCapacitorApp) {
      // We're in a Capacitor app
      isNative = true;
      if (isIOSUserAgent) {
        platform = 'ios';
      } else if (isAndroidUserAgent) {
        platform = 'android';
      } else {
        // Default to Android for unknown native platforms
        platform = 'android';
      }
    } else {
      // We're in a web browser
      isNative = false;
      platform = 'web';
    }

    // Device capabilities (conservative detection)
    const hasCamera = isNative || !!window?.navigator?.mediaDevices?.getUserMedia;
    const hasGeolocation = !!window?.navigator?.geolocation;
    const hasPushNotifications = isNative || 'serviceWorker' in (window?.navigator || {});

    return {
      platform,
      isNative,
      isWeb: !isNative,
      isIOS: platform === 'ios',
      isAndroid: platform === 'android',
      capabilities: {
        hasCamera,
        hasGeolocation,
        hasPushNotifications,
        hasStatusBar: isNative,
        hasHaptics: isNative,
        hasAppBadge: isNative,
      },
      detectionMethod: isCapacitorApp ? 'capacitor' : 'web',
      userAgent: userAgent.substring(0, 100), // Truncated for logging
      locationProtocol: location,
    };
  }

  // Public getters (synchronous, always available)

  get platform(): 'web' | 'ios' | 'android' {
    return this._platformInfo!.platform;
  }

  get isNative(): boolean {
    return this._platformInfo!.isNative;
  }

  get isWeb(): boolean {
    return this._platformInfo!.isWeb;
  }

  get isIOS(): boolean {
    return this._platformInfo!.isIOS;
  }

  get isAndroid(): boolean {
    return this._platformInfo!.isAndroid;
  }

  get hasCamera(): boolean {
    return this._platformInfo!.capabilities.hasCamera;
  }

  get hasGeolocation(): boolean {
    return this._platformInfo!.capabilities.hasGeolocation;
  }

  get hasPushNotifications(): boolean {
    return this._platformInfo!.capabilities.hasPushNotifications;
  }

  /**
   * Get complete platform information
   */
  getPlatformInfo(): PlatformInfo {
    return { ...this._platformInfo! };
  }

  /**
   * Execute callback only on native platforms
   */
  onlyOnNative<T>(callback: () => T): T | null {
    return this.isNative ? callback() : null;
  }

  /**
   * Execute callback only on iOS
   */
  onlyOnIOS<T>(callback: () => T): T | null {
    return this.isIOS ? callback() : null;
  }

  /**
   * Execute callback only on Android
   */
  onlyOnAndroid<T>(callback: () => T): T | null {
    return this.isAndroid ? callback() : null;
  }

  /**
   * Execute callback only on web
   */
  onlyOnWeb<T>(callback: () => T): T | null {
    return this.isWeb ? callback() : null;
  }

  /**
   * Platform-specific execution with fallback
   */
  withPlatformFallback<T>(nativeCallback: () => T, webCallback: () => T): T {
    return this.isNative ? nativeCallback() : webCallback();
  }

  /**
   * Mobile-specific execution (iOS/Android) with web fallback
   */
  withMobileFallback<T>(iosCallback: () => T, androidCallback: () => T, webCallback: () => T): T {
    if (this.isIOS) return iosCallback();
    if (this.isAndroid) return androidCallback();
    return webCallback();
  }
}

/**
 * Platform information interface
 */
export interface PlatformInfo {
  platform: 'web' | 'ios' | 'android';
  isNative: boolean;
  isWeb: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  capabilities: {
    hasCamera: boolean;
    hasGeolocation: boolean;
    hasPushNotifications: boolean;
    hasStatusBar: boolean;
    hasHaptics: boolean;
    hasAppBadge: boolean;
  };
  detectionMethod: 'capacitor' | 'web';
  userAgent: string;
  locationProtocol: string;
}
