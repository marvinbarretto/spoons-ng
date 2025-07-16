import { Injectable, inject, signal } from '@angular/core';
import { PubStore } from '@pubs/data-access/pub.store';
import type { Pub } from '@pubs/utils/pub.models';

export type LocationPermissionStatus = 'pending' | 'granted' | 'denied' | 'unavailable';

export type LocationError = {
  code: number;
  message: string;
  userFriendlyMessage: string;
};

@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly pubStore = inject(PubStore);

  readonly permissionStatus = signal<LocationPermissionStatus>('pending');
  readonly isRequestingLocation = signal(false);
  readonly locationError = signal<LocationError | null>(null);
  readonly currentPosition = signal<GeolocationPosition | null>(null);

  // Check if geolocation is supported
  isGeolocationSupported(): boolean {
    return 'geolocation' in navigator;
  }

  // Request location permission and get current position
  async requestLocationPermission(): Promise<GeolocationPosition> {
    if (!this.isGeolocationSupported()) {
      const error: LocationError = {
        code: 0,
        message: 'Geolocation not supported',
        userFriendlyMessage: 'Your device or browser doesn\'t support location services.'
      };
      this.locationError.set(error);
      this.permissionStatus.set('unavailable');
      throw error;
    }

    return new Promise((resolve, reject) => {
      this.isRequestingLocation.set(true);
      this.locationError.set(null);
      this.permissionStatus.set('pending');

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 15000, // 15 seconds
        maximumAge: 5 * 60 * 1000, // 5 minutes
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('[LocationService] ✅ Location permission granted:', {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });

          this.currentPosition.set(position);
          this.permissionStatus.set('granted');
          this.isRequestingLocation.set(false);
          this.locationError.set(null);
          resolve(position);
        },
        (error) => {
          console.error('[LocationService] ❌ Location request failed:', error);

          const locationError = this.mapGeolocationError(error);
          this.locationError.set(locationError);
          this.permissionStatus.set('denied');
          this.isRequestingLocation.set(false);
          reject(locationError);
        },
        options
      );
    });
  }

  // Map browser geolocation errors to user-friendly messages
  private mapGeolocationError(error: GeolocationPositionError): LocationError {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return {
          code: error.code,
          message: error.message,
          userFriendlyMessage: 'Location access was denied. Please enable location permissions in your browser settings and try again.'
        };
      case error.POSITION_UNAVAILABLE:
        return {
          code: error.code,
          message: error.message,
          userFriendlyMessage: 'Your location couldn\'t be determined. Please check your device\'s location settings.'
        };
      case error.TIMEOUT:
        return {
          code: error.code,
          message: error.message,
          userFriendlyMessage: 'Location request timed out. Please try again.'
        };
      default:
        return {
          code: error.code,
          message: error.message,
          userFriendlyMessage: 'An error occurred while getting your location. Please try again.'
        };
    }
  }

  // Calculate distance between two coordinates (Haversine formula)
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Find nearest pub to given coordinates
  async findNearestPub(position: GeolocationPosition): Promise<Pub | null> {
    const userLat = position.coords.latitude;
    const userLng = position.coords.longitude;

    console.log('[LocationService] Finding nearest pub to:', { lat: userLat, lng: userLng });

    // Wait for pubs to be loaded if they haven't been yet
    const pubs = this.pubStore.pubs();
    if (pubs.length === 0) {
      console.log('[LocationService] No pubs loaded, waiting...');
      // You might want to trigger pub loading here if needed
      return null;
    }

    let nearestPub: Pub | null = null;
    let shortestDistance = Infinity;

    for (const pub of pubs) {
      if (pub.location?.lat && pub.location?.lng) {
        const distance = this.calculateDistance(
          userLat,
          userLng,
          pub.location.lat,
          pub.location.lng
        );

        if (distance < shortestDistance) {
          shortestDistance = distance;
          nearestPub = pub;
        }
      }
    }

    if (nearestPub) {
      console.log('[LocationService] ✅ Found nearest pub:', {
        name: nearestPub.name,
        distance: `${shortestDistance.toFixed(2)}km`,
        id: nearestPub.id
      });
    } else {
      console.log('[LocationService] ❌ No nearby pubs found');
    }

    return nearestPub;
  }

  // Find multiple nearby pubs (for selection)
  async findNearbyPubs(position: GeolocationPosition, maxDistance: number = 50): Promise<Array<Pub & { distance: number }>> {
    const userLat = position.coords.latitude;
    const userLng = position.coords.longitude;

    console.log('[LocationService] Finding nearby pubs within', maxDistance, 'km');

    const pubs = this.pubStore.pubs();
    const nearbyPubs: Array<Pub & { distance: number }> = [];

    for (const pub of pubs) {
      if (pub.location?.lat && pub.location?.lng) {
        const distance = this.calculateDistance(
          userLat,
          userLng,
          pub.location.lat,
          pub.location.lng
        );

        if (distance <= maxDistance) {
          nearbyPubs.push({ ...pub, distance });
        }
      }
    }

    // Sort by distance (nearest first)
    nearbyPubs.sort((a, b) => a.distance - b.distance);

    console.log('[LocationService] ✅ Found', nearbyPubs.length, 'nearby pubs');
    return nearbyPubs;
  }

  // Reset location state
  resetLocationState(): void {
    this.permissionStatus.set('pending');
    this.isRequestingLocation.set(false);
    this.locationError.set(null);
    this.currentPosition.set(null);
  }

  // Get user-friendly permission status message
  getPermissionStatusMessage(): string {
    const status = this.permissionStatus();
    switch (status) {
      case 'pending':
        return 'We need your location to find nearby pubs';
      case 'granted':
        return 'Location access granted';
      case 'denied':
        return 'Location access denied';
      case 'unavailable':
        return 'Location services unavailable';
      default:
        return '';
    }
  }
}