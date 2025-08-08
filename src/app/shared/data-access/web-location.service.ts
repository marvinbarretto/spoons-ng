import { Injectable, computed, inject } from '@angular/core';
import { LocationService } from '@fourfold/angular-foundation';
import {
  AbstractLocationService,
  LocationPermissionStatus,
  LocationPosition,
} from './abstract-location.service';

/**
 * Web implementation of AbstractLocationService
 * Wraps @fourfold/angular-foundation LocationService for browser compatibility
 */
@Injectable({ providedIn: 'root' })
export class WebLocationService extends AbstractLocationService {
  private readonly foundationLocationService = inject(LocationService);

  // Map foundation service signals to abstract interface
  readonly permissionStatus = computed((): LocationPermissionStatus => {
    // Foundation service doesn't expose permission status, assume granted if we have location
    return this.currentPosition() ? 'granted' : 'unknown';
  });

  readonly loading = this.foundationLocationService.loading;
  readonly error = this.foundationLocationService.error;

  // Convert foundation location format to our standard format
  readonly currentPosition = computed((): LocationPosition | null => {
    const foundationLocation = this.foundationLocationService.location();
    if (!foundationLocation) return null;

    return {
      lat: foundationLocation.lat,
      lng: foundationLocation.lng,
      accuracy: foundationLocation.accuracy,
      timestamp: Date.now(),
    };
  });

  async getCurrentLocation(): Promise<LocationPosition> {
    console.log('[WebLocationService] 📍 Getting current location via foundation service...');

    try {
      // Foundation service getCurrentLocation() returns void but updates the signal
      // We need to trigger it and then wait for the location signal to update
      this.foundationLocationService.getCurrentLocation();

      // Wait for the location to be available
      return new Promise<LocationPosition>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Location request timeout'));
        }, 15000);

        const checkLocation = () => {
          const currentLoc = this.currentPosition();
          if (currentLoc) {
            clearTimeout(timeoutId);
            console.log('[WebLocationService] 📍 Location acquired:', currentLoc);
            resolve(currentLoc);
          } else {
            setTimeout(checkLocation, 100);
          }
        };

        // Start checking immediately
        checkLocation();
      });
    } catch (error: any) {
      console.error('[WebLocationService] 📍 Location error:', error);
      throw new Error(error.message || 'Failed to get location');
    }
  }

  async refreshLocation(): Promise<LocationPosition> {
    console.log('[WebLocationService] 🔄 Refreshing location...');

    try {
      // Foundation service handles the refresh
      this.foundationLocationService.refreshLocation();

      // Wait for the location to be updated
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Location refresh timeout'));
        }, 10000);

        const checkLocation = () => {
          const position = this.currentPosition();
          if (position) {
            clearTimeout(timeoutId);
            resolve(position);
          } else {
            setTimeout(checkLocation, 100);
          }
        };

        checkLocation();
      });
    } catch (error: any) {
      console.error('[WebLocationService] 🔄 Refresh error:', error);
      throw error;
    }
  }

  async requestPermission(): Promise<LocationPermissionStatus> {
    console.log('[WebLocationService] 🔐 Requesting location permission...');

    try {
      // Web browsers handle permissions automatically via getCurrentLocation
      const position = await this.getCurrentLocation();
      return position ? 'granted' : 'denied';
    } catch (error) {
      console.error('[WebLocationService] 🔐 Permission denied:', error);
      return 'denied';
    }
  }

  clearError(): void {
    // Foundation service handles error clearing internally
    console.log('[WebLocationService] 🧹 Clearing error state');
  }

  reset(): void {
    console.log('[WebLocationService] 🔄 Resetting location service');
    // Foundation service doesn't expose reset, but errors clear automatically
    this.clearError();
  }

  hasLocationPermission(): boolean {
    return this.permissionStatus() === 'granted';
  }

  canRequestLocation(): boolean {
    // Web can always attempt to request location
    return 'geolocation' in navigator;
  }
}
