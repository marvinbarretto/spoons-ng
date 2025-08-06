import { Injectable, inject, signal } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { PlatformDetectionService } from './platform-detection.service';
import { AbstractLocationService, LocationPermissionStatus, LocationPosition } from './abstract-location.service';

/**
 * Native implementation of AbstractLocationService
 * Uses @capacitor/geolocation for iOS/Android native location services
 */
@Injectable({ providedIn: 'root' })
export class CapacitorLocationService extends AbstractLocationService {
  private readonly platformService = inject(PlatformDetectionService);
  
  // State signals
  readonly permissionStatus = signal<LocationPermissionStatus>('unknown');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly currentPosition = signal<LocationPosition | null>(null);
  
  async getCurrentLocation(): Promise<LocationPosition> {
    console.log('[CapacitorLocationService] 📍 Getting current location via Capacitor...');
    console.log('[CapacitorLocationService] 📱 Platform check:', {
      isNative: this.platformService.isNative,
      platform: this.platformService.platform,
      initialized: true // PlatformDetectionService is always initialized
    });
    
    if (!this.platformService.isNative) {
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
    
    if (!this.platformService.isNative) {
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
    
    if (!this.platformService.isNative) {
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
    return status === 'prompt' || status === 'unknown' || this.platformService.isNative;
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
      if (this.platformService.isIOS) {
        return 'Location unavailable on iOS Simulator. Please set a custom location in Xcode: Device > Location > Custom Location (e.g., 51.5074, -0.1278 for London).';
      }
      return 'Location services unavailable. Please ensure location services are enabled.';
    }
    
    if (error.message?.includes('User denied')) {
      this.permissionStatus.set('denied');
      return 'Location access denied. Please enable location services in your device settings.';
    }
    
    if (error.message?.includes('unavailable') || error.errorMessage?.includes('unavailable')) {
      if (this.platformService.isIOS) {
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

  // ===================================
  // 🚀 MOBILE OPTIMIZATION METHODS
  // ===================================

  /**
   * Early permission check for app initialization
   * 
   * PURPOSE: Check location permission status at app startup without blocking UI.
   * This is non-intrusive and helps us prepare for when location is actually needed.
   * 
   * WHEN TO USE: Call this during app initialization/startup
   * 
   * WHY: Knowing permission status early allows us to:
   * - Show appropriate UI states (enabled/disabled features)
   * - Prepare location services in advance
   * - Avoid permission request surprises during critical user flows
   * 
   * @returns Promise<boolean> - true if location is available and ready to use
   */
  async initializeEarlyPermissionCheck(): Promise<boolean> {
    console.log('[CapacitorLocationService] 🚀 Early permission check starting...');
    
    if (!this.platformService.isNative) {
      console.log('[CapacitorLocationService] 🌐 Non-native platform, location not available');
      return false;
    }

    try {
      // Non-blocking permission check only - don't request anything yet
      const permissionStatus = await this.checkPermissions();
      
      console.log('[CapacitorLocationService] 🚀 Early permission check result:', {
        status: permissionStatus,
        isGranted: permissionStatus === 'granted',
        canRequest: this.canRequestLocation()
      });

      // If we already have permission, we can prepare location services
      if (permissionStatus === 'granted') {
        console.log('[CapacitorLocationService] ✅ Location permission already granted - ready for use');
        return true;
      }

      // If permission can be requested later, that's still a positive state
      if (this.canRequestLocation()) {
        console.log('[CapacitorLocationService] 🟡 Location permission can be requested when needed');
        return false; // Not ready yet, but will be available
      }

      // Permission permanently denied
      console.log('[CapacitorLocationService] ❌ Location permission denied or unavailable');
      return false;

    } catch (error) {
      console.error('[CapacitorLocationService] 🚀 Early permission check failed:', error);
      // Don't throw error - this is a non-critical startup check
      return false;
    }
  }

  /**
   * Background location warming for faster subsequent requests
   * 
   * PURPOSE: Silently acquire location in the background to make it instantly 
   * available when needed for check-ins or pub finding.
   * 
   * WHEN TO USE: Call this after user grants permission or during app active periods
   * 
   * WHY: GPS cold start can take 10-30 seconds. By warming location in background:
   * - Check-ins feel instant (location already available)
   * - Better user experience when finding nearby pubs
   * - Reduces user waiting time during critical flows
   * 
   * USAGE PATTERN:
   * 1. User grants location permission
   * 2. Call warmLocation() in background
   * 3. Location cached and ready for instant use
   * 
   * @param options Configuration for background location acquisition
   * @returns Promise<boolean> - true if location successfully warmed
   */
  async warmLocation(options: {
    /** Timeout for background location request (default: 15000ms for cold start) */
    timeout?: number;
    /** Maximum age of cached location to accept (default: 30000ms) */
    maxAge?: number;
    /** Whether to use high accuracy GPS (default: true) */
    highAccuracy?: boolean;
  } = {}): Promise<boolean> {
    const {
      timeout = 15000,      // Longer timeout for background warming
      maxAge = 30000,       // Accept 30 second old location
      highAccuracy = true
    } = options;

    console.log('[CapacitorLocationService] 🔥 Warming location in background...', {
      timeout,
      maxAge,
      highAccuracy,
      currentPermissionStatus: this.permissionStatus()
    });

    // Only warm if we have permission - don't request it
    if (this.permissionStatus() !== 'granted') {
      console.log('[CapacitorLocationService] 🔥 Skipping location warming - permission not granted');
      return false;
    }

    if (!this.platformService.isNative) {
      console.log('[CapacitorLocationService] 🔥 Skipping location warming - not on native platform');
      return false;
    }

    // Don't show loading state for background warming
    // this.loading.set(true); // Commented out - this is background operation
    
    try {
      console.log('[CapacitorLocationService] 🔥 Calling Geolocation.getCurrentPosition for warming...');
      
      const result = await Geolocation.getCurrentPosition({
        enableHighAccuracy: highAccuracy,
        timeout: timeout,
        maximumAge: maxAge,
      });

      const position: LocationPosition = {
        lat: result.coords.latitude,
        lng: result.coords.longitude,
        accuracy: result.coords.accuracy,
        timestamp: result.timestamp,
      };

      // Cache the warmed location
      this.currentPosition.set(position);
      
      console.log('[CapacitorLocationService] 🔥 Location warmed successfully:', {
        lat: position.lat.toFixed(4),
        lng: position.lng.toFixed(4),
        accuracy: position.accuracy,
        age: position.timestamp ? Date.now() - position.timestamp : 0
      });

      return true;

    } catch (error) {
      console.warn('[CapacitorLocationService] 🔥 Location warming failed (non-critical):', error);
      // Don't set error state for background operations
      // this.error.set(this.handleLocationError(error));
      return false;
    } finally {
      // this.loading.set(false); // Commented out - background operation
    }
  }

  /**
   * Get location with improved timeout handling
   * 
   * PURPOSE: Enhanced version of getCurrentLocation with better timeout handling
   * for mobile environments where GPS can be slow to start.
   * 
   * IMPROVEMENTS:
   * - Longer initial timeout for cold GPS start
   * - Uses warmed location if available and recent
   * - Better error messages for mobile users
   * 
   * @param forceRefresh If true, ignore cached location and get fresh position
   * @returns Promise<LocationPosition>
   */
  async getCurrentLocationEnhanced(forceRefresh: boolean = false): Promise<LocationPosition> {
    console.log('[CapacitorLocationService] 📍 Enhanced location request...', {
      forceRefresh,
      hasCachedLocation: !!this.currentPosition(),
      cachedLocationAge: this.currentPosition()?.timestamp ? Date.now() - this.currentPosition()!.timestamp! : 0
    });

    // Use cached location if it's recent and not forcing refresh
    if (!forceRefresh && this.currentPosition()) {
      const cachedLocation = this.currentPosition()!;
      if (cachedLocation.timestamp) {
        const locationAge = Date.now() - cachedLocation.timestamp;
        
        // Use cached location if less than 2 minutes old
        if (locationAge < 120000) {
          console.log('[CapacitorLocationService] 📍 Using cached location (age: ' + Math.round(locationAge / 1000) + 's)');
          return cachedLocation;
        }
      }
    }

    // Get fresh location with enhanced timeout
    this.loading.set(true);
    this.error.set(null);

    try {
      // Check permissions first
      const permissionStatus = await this.checkPermissions();
      if (permissionStatus !== 'granted') {
        const requestResult = await this.requestPermission();
        if (requestResult !== 'granted') {
          throw new Error(`Location permission ${requestResult}. Please enable location services in Settings.`);
        }
      }

      console.log('[CapacitorLocationService] 📍 Getting fresh location with enhanced timeout...');
      
      // Use longer timeout for better mobile experience
      const result = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 20000,        // Increased from 10s to 20s
        maximumAge: 60000,     // Accept 1-minute old location
      });

      const position: LocationPosition = {
        lat: result.coords.latitude,
        lng: result.coords.longitude,
        accuracy: result.coords.accuracy,
        timestamp: result.timestamp,
      };

      this.currentPosition.set(position);
      this.permissionStatus.set('granted');

      console.log('[CapacitorLocationService] 📍 Enhanced location acquired:', {
        lat: position.lat.toFixed(4),
        lng: position.lng.toFixed(4),
        accuracy: position.accuracy
      });

      return position;

    } catch (error: any) {
      const errorMessage = this.handleLocationError(error);
      this.error.set(errorMessage);
      
      console.error('[CapacitorLocationService] 📍 Enhanced location failed:', errorMessage);
      throw new Error(errorMessage);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Check if cached location is available and recent
   * 
   * PURPOSE: Quick check if we have usable cached location without making any requests
   * 
   * @param maxAgeMs Maximum age of cached location to consider valid (default: 5 minutes)
   * @returns boolean - true if cached location is available and recent enough
   */
  hasFreshCachedLocation(maxAgeMs: number = 300000): boolean {
    const cachedLocation = this.currentPosition();
    
    if (!cachedLocation || !cachedLocation.timestamp) {
      return false;
    }

    const locationAge = Date.now() - cachedLocation.timestamp;
    return locationAge <= maxAgeMs;
  }
}