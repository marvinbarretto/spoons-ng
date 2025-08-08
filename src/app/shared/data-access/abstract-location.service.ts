import { Signal } from '@angular/core';

export type LocationPermissionStatus = 'granted' | 'denied' | 'prompt' | 'unknown';

export interface LocationError {
  code: number;
  message: string;
}

export interface LocationPosition {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp?: number;
}

/**
 * Abstract location service interface for platform-agnostic location functionality
 *
 * Implementations:
 * - WebLocationService: Uses @fourfold/angular-foundation for web browsers
 * - CapacitorLocationService: Uses @capacitor/geolocation for iOS/Android
 */
export abstract class AbstractLocationService {
  // State signals - consistent across all implementations
  abstract readonly permissionStatus: Signal<LocationPermissionStatus>;
  abstract readonly loading: Signal<boolean>;
  abstract readonly error: Signal<string | null>;
  abstract readonly currentPosition: Signal<LocationPosition | null>;

  // Core location methods
  abstract getCurrentLocation(): Promise<LocationPosition>;
  abstract refreshLocation(): Promise<LocationPosition>;
  abstract requestPermission(): Promise<LocationPermissionStatus>;

  // State management
  abstract clearError(): void;
  abstract reset(): void;

  // Utility methods for checking permissions
  abstract hasLocationPermission(): boolean;
  abstract canRequestLocation(): boolean;
}
