import { Injectable, inject, signal } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { CapacitorPlatformService } from './capacitor-platform.service';
import { AbstractLocationService, LocationPermissionStatus, LocationPosition } from './abstract-location.service';

/**
 * Native implementation of AbstractLocationService
 * Uses @capacitor/geolocation for iOS/Android native location services
 */
@Injectable({ providedIn: 'root' })
export class CapacitorLocationService extends AbstractLocationService {
  private readonly platformService = inject(CapacitorPlatformService);
  
  // State signals
  readonly permissionStatus = signal<LocationPermissionStatus>('unknown');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly currentPosition = signal<LocationPosition | null>(null);
  
  async getCurrentLocation(): Promise<LocationPosition> {
    console.log('[CapacitorLocationService] 📍 Getting current location via Capacitor...');
    console.log('[CapacitorLocationService] 📱 Platform check:', {
      isNative: this.platformService.isNative(),
      platform: this.platformService.platformName(),
      initialized: this.platformService.initialized()
    });
    
    if (!this.platformService.isNative()) {
      throw new Error('Capacitor location service only available on native platforms');
    }
    
    this.loading.set(true);
    this.error.set(null);
    
    try {
      // First check and request permissions if needed
      console.log('[CapacitorLocationService] 🔐 Checking permissions...');
      const permissionStatus = await this.checkPermissions();
      
      if (permissionStatus !== 'granted') {
        console.log('[CapacitorLocationService] 🔐 Requesting permissions...');
        const requestResult = await this.requestPermission();
        
        if (requestResult !== 'granted') {
          throw new Error(`Location permission ${requestResult}. Please enable location services in Settings.`);
        }
      }
      
      console.log('[CapacitorLocationService] 🔌 Calling Geolocation.getCurrentPosition...');
      const result = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 10000,
      });
      
      const position: LocationPosition = {
        lat: result.coords.latitude,
        lng: result.coords.longitude,
        accuracy: result.coords.accuracy,
        timestamp: result.timestamp,
      };
      
      this.currentPosition.set(position);
      this.permissionStatus.set('granted');
      
      console.log('[CapacitorLocationService] 📍 Location acquired:', position);
      return position;
    } catch (error: any) {
      console.error('[CapacitorLocationService] 📍 Raw error object:', error);
      console.error('[CapacitorLocationService] 📍 Error details:', {
        message: error?.message,
        code: error?.code,
        type: typeof error,
        keys: error ? Object.keys(error) : 'none',
        stringified: JSON.stringify(error)
      });
      
      const errorMessage = this.handleLocationError(error);
      this.error.set(errorMessage);
      
      console.error('[CapacitorLocationService] 📍 Processed error message:', errorMessage);
      throw new Error(errorMessage);
    } finally {
      this.loading.set(false);
    }
  }
  
  async refreshLocation(): Promise<LocationPosition> {
    console.log('[CapacitorLocationService] 🔄 Refreshing location...');
    
    // Clear current position to force fresh lookup
    this.currentPosition.set(null);
    this.error.set(null);
    
    return this.getCurrentLocation();
  }
  
  async requestPermission(): Promise<LocationPermissionStatus> {
    console.log('[CapacitorLocationService] 🔐 Requesting location permission...');
    
    if (!this.platformService.isNative()) {
      console.warn('[CapacitorLocationService] Permission request only available on native platforms');
      return 'denied';
    }
    
    try {
      const permissions = await Geolocation.requestPermissions();
      const status = this.mapPermissionStatus(permissions.location);
      
      this.permissionStatus.set(status);
      console.log('[CapacitorLocationService] 🔐 Permission status:', status);
      
      return status;
    } catch (error) {
      console.error('[CapacitorLocationService] 🔐 Permission request failed:', error);
      this.permissionStatus.set('denied');
      return 'denied';
    }
  }
  
  async checkPermissions(): Promise<LocationPermissionStatus> {
    console.log('[CapacitorLocationService] 🔍 Checking location permissions...');
    
    if (!this.platformService.isNative()) {
      return 'unknown';
    }
    
    try {
      const permissions = await Geolocation.checkPermissions();
      const status = this.mapPermissionStatus(permissions.location);
      
      this.permissionStatus.set(status);
      return status;
    } catch (error) {
      console.error('[CapacitorLocationService] 🔍 Permission check failed:', error);
      return 'unknown';
    }
  }
  
  clearError(): void {
    console.log('[CapacitorLocationService] 🧹 Clearing error state');
    this.error.set(null);
  }
  
  reset(): void {
    console.log('[CapacitorLocationService] 🔄 Resetting location service');
    this.loading.set(false);
    this.error.set(null);
    this.currentPosition.set(null);
    this.permissionStatus.set('unknown');
  }
  
  hasLocationPermission(): boolean {
    return this.permissionStatus() === 'granted';
  }
  
  canRequestLocation(): boolean {
    const status = this.permissionStatus();
    return status === 'prompt' || status === 'unknown' || this.platformService.isNative();
  }
  
  /**
   * Map Capacitor permission status to our standard format
   */
  private mapPermissionStatus(capacitorStatus: string): LocationPermissionStatus {
    switch (capacitorStatus) {
      case 'granted':
        return 'granted';
      case 'denied':
        return 'denied';
      case 'prompt':
        return 'prompt';
      default:
        return 'unknown';
    }
  }
  
  /**
   * Handle and format location errors consistently
   */
  private handleLocationError(error: any): string {
    // Handle Capacitor-specific error codes
    if (error.code === 'OS-PLUG-GLOC-0002') {
      if (this.platformService.isIOS()) {
        return 'Location unavailable on iOS Simulator. Please set a custom location in Xcode: Device > Location > Custom Location (e.g., 51.5074, -0.1278 for London).';
      }
      return 'Location services unavailable. Please ensure location services are enabled.';
    }
    
    if (error.message?.includes('User denied')) {
      this.permissionStatus.set('denied');
      return 'Location access denied. Please enable location services in your device settings.';
    }
    
    if (error.message?.includes('unavailable') || error.errorMessage?.includes('unavailable')) {
      if (this.platformService.isIOS()) {
        return 'Location unavailable on iOS Simulator. Please set a custom location in Xcode: Device > Location > Custom Location.';
      }
      return 'Location services are not available on this device.';
    }
    
    if (error.message?.includes('timeout')) {
      return 'Location request timed out. Please try again.';
    }
    
    // Handle iOS Core Location errors
    if (error.message?.includes('kCLErrorDomain')) {
      if (error.message.includes('error 0')) {
        this.permissionStatus.set('denied');
        return 'Location services are disabled. Please enable location services in Settings.';
      }
      if (error.message.includes('error 1')) {
        this.permissionStatus.set('denied');
        return 'Location access denied. Please allow location access in Settings.';
      }
    }
    
    return error.errorMessage || error.message || 'Failed to get your location. Please try again.';
  }
}