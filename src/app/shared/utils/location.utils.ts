// src/app/shared/utils/location.utils.ts

export type Coordinates = {
  lat: number;
  lng: number;
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param from Starting coordinates
 * @param to Ending coordinates
 * @returns Distance in meters
 */
export function calculateDistance(from: Coordinates, to: Coordinates): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (from.lat * Math.PI) / 180; // φ, λ in radians
  const φ2 = (to.lat * Math.PI) / 180;
  const Δφ = ((to.lat - from.lat) * Math.PI) / 180;
  const Δλ = ((to.lng - from.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Calculate distance in kilometers
 * @param from Starting coordinates
 * @param to Ending coordinates
 * @returns Distance in kilometers
 */
export function getDistanceKm(from: Coordinates, to: Coordinates): number {
  return calculateDistance(from, to) / 1000;
}

/**
 * Check if a location is within a certain distance of another
 * @param from Starting coordinates
 * @param to Ending coordinates
 * @param maxDistanceMeters Maximum distance in meters
 * @returns True if within distance
 */
export function isWithinDistance(
  from: Coordinates,
  to: Coordinates,
  maxDistanceMeters: number
): boolean {
  return calculateDistance(from, to) <= maxDistanceMeters;
}

/**
 * Format distance for display
 * @param distanceMeters Distance in meters
 * @returns Formatted string (e.g., "1.2km" or "250m")
 */
export function formatDistance(distanceMeters: number): string {
  if (distanceMeters >= 1000) {
    return `${(distanceMeters / 1000).toFixed(1)}km`;
  }
  return `${Math.round(distanceMeters)}m`;
}

/**
 * Get user-friendly location error messages
 */
export function getLocationErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Location access denied. Please enable location services.';
    case error.POSITION_UNAVAILABLE:
      return 'Location information unavailable.';
    case error.TIMEOUT:
      return 'Location request timed out. Please try again.';
    default:
      return 'Failed to get your location.';
  }
}

/**
 * Get current position with proper error handling
 */
export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('[LocationUtils] 📍 Position acquired:', {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        resolve(position);
      },
      (error) => {
        const message = getLocationErrorMessage(error);
        console.error('[LocationUtils] 📍 Location error:', message);
        reject(new Error(message));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  });
}
