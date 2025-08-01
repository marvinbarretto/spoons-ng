import { computed, Injectable, signal, inject, effect } from '@angular/core';
import { SsrPlatformService } from '@fourfold/angular-foundation';

interface PluginCache {
  [key: string]: any | null;
}

@Injectable({ providedIn: 'root' })
export class CapacitorPlatformService {
  private readonly ssrPlatform = inject(SsrPlatformService);
  
  // Core state signals
  private readonly _capacitor = signal<any>(null);
  private readonly _initialized = signal(false);
  private readonly _pluginCache = signal<PluginCache>({});
  
  // Computed properties following Angular 20 patterns
  readonly initialized = computed(() => this._initialized());
  readonly isNative = computed(() => 
    this._capacitor()?.isNativePlatform() ?? false
  );
  readonly isIOS = computed(() => 
    this._capacitor()?.getPlatform() === 'ios'
  );
  readonly isAndroid = computed(() => 
    this._capacitor()?.getPlatform() === 'android'
  );
  readonly isWeb = computed(() => !this.isNative());
  readonly platformName = computed(() => 
    this._capacitor()?.getPlatform() ?? 'web'
  );
  
  // Capability detection signals
  readonly hasCamera = computed(() => this.isPluginAvailable('Camera'));
  readonly hasGeolocation = signal(true); // Available on both web and native
  readonly hasPushNotifications = computed(() => 
    this.isNative() && this.isPluginAvailable('PushNotifications')
  );
  readonly hasAppBadge = computed(() => 
    this.isNative() && this.isPluginAvailable('App')
  );
  readonly hasStatusBar = computed(() => 
    this.isNative() && this.isPluginAvailable('StatusBar')
  );
  readonly hasHaptics = computed(() => 
    this.isNative() && this.isPluginAvailable('Haptics')
  );

  constructor() {
    this.initialize();
    
    // Debug logging in development
    effect(() => {
      if (this.initialized()) {
        console.debug('[CapacitorPlatform] Platform detected:', {
          initialized: this.initialized(),
          isNative: this.isNative(),
          platform: this.platformName(),
          capabilities: {
            hasCamera: this.hasCamera(),
            hasGeolocation: this.hasGeolocation(),
            hasPushNotifications: this.hasPushNotifications(),
            hasAppBadge: this.hasAppBadge(),
            hasStatusBar: this.hasStatusBar(),
            hasHaptics: this.hasHaptics(),
          }
        });
      }
    });
  }

  /**
   * Initialize Capacitor platform detection
   */
  private async initialize(): Promise<void> {
    // SSR-safe initialization
    const isBrowser = this.ssrPlatform.onlyOnBrowser(() => true);
    if (!isBrowser) {
      this._initialized.set(true);
      return;
    }

    try {
      const capacitorModule = await this.attemptCapacitorImport();
      this._capacitor.set(capacitorModule?.Capacitor ?? null);
    } catch (error) {
      console.debug('[CapacitorPlatform] Capacitor unavailable, using web fallbacks');
    } finally {
      this._initialized.set(true);
    }
  }

  /**
   * Attempt to import Capacitor core module
   */
  private async attemptCapacitorImport() {
    try {
      return await import('@capacitor/core');
    } catch {
      return null;
    }
  }

  /**
   * Get a Capacitor plugin with caching
   */
  async getPlugin<T>(pluginPackage: string): Promise<T | null> {
    const cached = this._pluginCache()[pluginPackage];
    if (cached !== undefined) return cached;

    if (!this.isNative()) {
      this.cachePlugin(pluginPackage, null);
      return null;
    }

    try {
      const pluginModule = await import(pluginPackage);
      const plugin = pluginModule.default ?? pluginModule;
      this.cachePlugin(pluginPackage, plugin);
      return plugin;
    } catch {
      console.debug(`[CapacitorPlatform] Plugin ${pluginPackage} not available`);
      this.cachePlugin(pluginPackage, null);
      return null;
    }
  }

  /**
   * Check if a plugin is available
   */
  isPluginAvailable(pluginName: string): boolean {
    return this._capacitor()?.isPluginAvailable?.(pluginName) ?? false;
  }

  /**
   * Cache a plugin result
   */
  private cachePlugin(pluginName: string, plugin: any): void {
    this._pluginCache.update(cache => ({
      ...cache,
      [pluginName]: plugin
    }));
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
