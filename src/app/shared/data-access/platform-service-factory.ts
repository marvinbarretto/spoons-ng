import { Injectable, inject, Injector } from '@angular/core';
import { CapacitorPlatformService } from './capacitor-platform.service';
import { AbstractLocationService } from './abstract-location.service';
import { WebLocationService } from './web-location.service';
import { CapacitorLocationService } from './capacitor-location.service';

/**
 * Platform Service Factory
 * 
 * Handles early platform detection and service resolution.
 * Determines the appropriate service implementations based on platform
 * (native vs web) and provides them throughout the app lifecycle.
 */
@Injectable({ providedIn: 'root' })
export class PlatformServiceFactory {
  private readonly platformService = inject(CapacitorPlatformService);
  private readonly injector = inject(Injector);
  
  // Service resolution cache
  private readonly serviceCache = new Map<string, any>();
  private _initialized = false;
  
  /**
   * Initialize platform service factory
   * Called via APP_INITIALIZER to ensure platform detection happens before service injection
   */
  async initialize(): Promise<void> {
    if (this._initialized) {
      console.log('[PlatformServiceFactory] Already initialized');
      return Promise.resolve();
    }
    
    console.log('[PlatformServiceFactory] 🚀 Initializing platform services...');
    
    // Wait for platform detection to complete
    await this.waitForPlatformReady();
    
    // Register platform-appropriate services
    this.registerServices();
    
    this._initialized = true;
    
    console.log('[PlatformServiceFactory] ✅ Platform services initialized', {
      platform: this.platformService.platformName(),
      isNative: this.platformService.isNative(),
      servicesRegistered: Array.from(this.serviceCache.keys()),
    });
  }
  
  /**
   * Wait for platform detection to complete
   */
  private async waitForPlatformReady(): Promise<void> {
    return new Promise((resolve) => {
      const checkReady = () => {
        if (this.platformService.initialized()) {
          console.log('[PlatformServiceFactory] 📱 Platform ready:', {
            platform: this.platformService.platformName(),
            isNative: this.platformService.isNative(),
            isIOS: this.platformService.isIOS(),
            isAndroid: this.platformService.isAndroid(),
          });
          resolve();
        } else {
          setTimeout(checkReady, 10);
        }
      };
      checkReady();
    });
  }
  
  /**
   * Register platform-appropriate service implementations
   */
  private registerServices(): void {
    console.log('[PlatformServiceFactory] 🔍 Platform info before service registration:', {
      isNative: this.platformService.isNative(),
      isIOS: this.platformService.isIOS(),
      isAndroid: this.platformService.isAndroid(),
      isWeb: this.platformService.isWeb(),
      platformName: this.platformService.platformName()
    });
    
    if (this.platformService.isNative()) {
      console.log('[PlatformServiceFactory] 📱 Registering native services...');
      
      // Native implementations
      const capacitorLocationService = this.injector.get(CapacitorLocationService);
      this.serviceCache.set('LocationService', capacitorLocationService);
      console.log('[PlatformServiceFactory] 📱 Registered CapacitorLocationService:', !!capacitorLocationService);
      
      // Camera services removed - using direct platform conditionals in components
      
      // Future native services can be added here
      // this.serviceCache.set('PushNotificationService', this.injector.get(CapacitorPushService));
      
    } else {
      console.log('[PlatformServiceFactory] 🌐 Registering web services...');
      
      // Web implementations
      const webLocationService = this.injector.get(WebLocationService);
      this.serviceCache.set('LocationService', webLocationService);
      console.log('[PlatformServiceFactory] 🌐 Registered WebLocationService:', !!webLocationService);
      
      // Camera services removed - using direct platform conditionals in components
      
      // Future web services can be added here
      // this.serviceCache.set('PushNotificationService', this.injector.get(WebPushService));
    }
  }
  
  /**
   * Get platform-appropriate service instance
   */
  getService<T>(serviceKey: string): T {
    if (!this._initialized) {
      throw new Error(`PlatformServiceFactory not initialized. Service ${serviceKey} not available.`);
    }
    
    const service = this.serviceCache.get(serviceKey);
    if (!service) {
      throw new Error(`Service ${serviceKey} not registered for platform ${this.platformService.platformName()}`);
    }
    
    return service as T;
  }
  
  /**
   * Get location service (convenience method)
   */
  getLocationService(): AbstractLocationService {
    console.log('[PlatformServiceFactory] 📍 Getting location service...');
    return this.getService<AbstractLocationService>('LocationService');
  }
  
  // Camera service removed - components use direct platform conditionals
  
  /**
   * Check if factory is initialized
   */
  get initialized(): boolean {
    return this._initialized;
  }
  
  /**
   * Get platform information
   */
  getPlatformInfo() {
    return {
      platform: this.platformService.platformName(),
      isNative: this.platformService.isNative(),
      isIOS: this.platformService.isIOS(),
      isAndroid: this.platformService.isAndroid(),
      isWeb: this.platformService.isWeb(),
      initialized: this._initialized,
      registeredServices: Array.from(this.serviceCache.keys()),
    };
  }
}