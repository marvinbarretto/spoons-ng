// location.service.ts
import { Injectable, signal, inject } from '@angular/core';
import { SsrPlatformService } from '@fourfold/angular-foundation';

// Location polling configuration
const LOCATION_TIMEOUT_MS = 10000;           // How long to wait for GPS
const LOCATION_MAX_AGE_MS = 10000;           // Max age of cached location
const MIN_ACCURACY_METERS = 100;             // Reject readings worse than this

// Adaptive polling intervals (milliseconds)
const POLL_INTERVAL_FAR = 30000;             // >2km: every 30s
const POLL_INTERVAL_APPROACHING = 15000;     // 500m-2km: every 15s
const POLL_INTERVAL_CLOSE = 10000;           // 100m-500m: every 10s
const POLL_INTERVAL_VERY_CLOSE = 5000;       // <100m: every 5s
const POLL_INTERVAL_STATIONARY = 60000;      // Not moving: every 60s

// Distance thresholds for polling behavior
const DISTANCE_VERY_CLOSE_METERS = 100;
const DISTANCE_CLOSE_METERS = 500;
const DISTANCE_APPROACHING_METERS = 2000;
const MOVEMENT_THRESHOLD_METERS = 50;        // Consider user "moved"

export type GeoLocation = {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
};

@Injectable({ providedIn: 'root' })
export class LocationService {
  private platform = inject(SsrPlatformService);
  private watchId: number | null = null;
  private pollIntervalId: number | null = null;

  // Core location signals
  readonly location = signal<GeoLocation | null>(null);
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);

  // Adaptive tracking signals
  readonly isTracking = signal(false);
  readonly proximity = signal<'far' | 'approaching' | 'close' | 'very-close'>('far');
  readonly lastMovement = signal<number | null>(null);

  // Smart movement detection signals
  readonly isMoving = signal(false);
  readonly movementSpeed = signal<number>(0); // meters per second
  readonly lastMovementCheck = signal<number | null>(null);

  constructor() {
    console.log('[LocationService] 📍 Service initialized - location request deferred until needed');
  }

  getCurrentLocation(): void {
    if (!this.platform.isBrowser) {
      console.log('[LocationService] ❌ Not running in browser — skipping location');
      return;
    }

    if (!('geolocation' in navigator)) {
      this.error.set('Geolocation not supported');
      console.warn('[LocationService] ❌ Geolocation API not available');
      return;
    }

    this.loading.set(true);
    console.log('[LocationService] 📍 Attempting to get current position...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: GeoLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now(),
        };
        this.location.set(coords);
        console.log('[LocationService] ✅ Position acquired:', coords);
        this.loading.set(false);
      },
      (error) => {
        this.error.set(error.message);
        console.warn('[LocationService] ❌ Geolocation error', {
          code: error.code,
          message: error.message
        });
        this.loading.set(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: LOCATION_MAX_AGE_MS,
        timeout: LOCATION_TIMEOUT_MS,
      }
    );
  }

  /**
   * Start adaptive location tracking with distance-based polling
   * @param nearestPubDistance Distance to nearest pub in meters (optional)
   */
  startLocationTracking(nearestPubDistance?: number): void {
    if (!this.platform.isBrowser || this.isTracking()) {
      return;
    }

    if (!('geolocation' in navigator)) {
      this.error.set('Geolocation not supported');
      return;
    }

    this.isTracking.set(true);
    this.updateProximity(nearestPubDistance || Infinity);

    // Use watchPosition for continuous monitoring
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const previousLocation = this.location();
        const newLocation: GeoLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now(),
        };

        // Only update if accuracy is acceptable
        if (position.coords.accuracy <= MIN_ACCURACY_METERS) {
          this.location.set(newLocation);
          this.checkForMovement(previousLocation, newLocation);
          console.log('[LocationService] 📍 Adaptive position update:', newLocation);
        } else {
          console.warn(`[LocationService] ❌ Poor accuracy: ${position.coords.accuracy}m`);
        }

        this.loading.set(false);
        this.error.set(null);
      },
      (error) => {
        this.error.set(error.message);
        console.warn('[LocationService] ❌ Watch position error:', error.message);
        this.loading.set(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: LOCATION_MAX_AGE_MS,
        timeout: LOCATION_TIMEOUT_MS,
      }
    );
  }

  /**
   * Stop adaptive location tracking and cleanup
   */
  stopLocationTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.pollIntervalId !== null) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }

    this.isTracking.set(false);
    console.log('[LocationService] 🛑 Stopped adaptive tracking');
  }

  /**
   * Force immediate location refresh
   */
  refreshLocation(): void {
    this.getCurrentLocation();
  }

  /**
   * Get current polling interval based on proximity
   */
  getCurrentPollInterval(): number {
    const proximity = this.proximity();
    switch (proximity) {
      case 'very-close':
        return POLL_INTERVAL_VERY_CLOSE;
      case 'close':
        return POLL_INTERVAL_CLOSE;
      case 'approaching':
        return POLL_INTERVAL_APPROACHING;
      case 'far':
      default:
        return POLL_INTERVAL_FAR;
    }
  }

  /**
   * Update proximity category based on distance to nearest pub
   */
  private updateProximity(distanceMeters: number): void {
    let newProximity: 'far' | 'approaching' | 'close' | 'very-close';

    if (distanceMeters <= DISTANCE_VERY_CLOSE_METERS) {
      newProximity = 'very-close';
    } else if (distanceMeters <= DISTANCE_CLOSE_METERS) {
      newProximity = 'close';
    } else if (distanceMeters <= DISTANCE_APPROACHING_METERS) {
      newProximity = 'approaching';
    } else {
      newProximity = 'far';
    }

    if (this.proximity() !== newProximity) {
      this.proximity.set(newProximity);
      console.log(`[LocationService] 📊 Proximity updated: ${newProximity} (${distanceMeters}m)`);
    }
  }

  /**
   * Check if user has moved significantly and update lastMovement
   */
  private checkForMovement(previous: GeoLocation | null, current: GeoLocation): void {
    if (!previous) {
      this.lastMovement.set(Date.now());
      return;
    }

    // Calculate distance moved using simple distance formula
    const deltaLat = current.lat - previous.lat;
    const deltaLng = current.lng - previous.lng;
    const distanceMoved = Math.sqrt(deltaLat * deltaLat + deltaLng * deltaLng) * 111000; // Rough conversion to meters

    if (distanceMoved > MOVEMENT_THRESHOLD_METERS) {
      this.lastMovement.set(Date.now());
      console.log(`[LocationService] 🚶 Movement detected: ${Math.round(distanceMoved)}m`);
    }
  }

  /**
   * Smart two-check movement detection pattern
   * Takes two GPS readings with a gap to detect real movement vs GPS noise
   */
  async performMovementCheck(): Promise<void> {
    if (!this.platform.isBrowser || !('geolocation' in navigator)) {
      return;
    }

    console.log('[LocationService] 🔍 Starting two-check movement detection...');

    try {
      // First reading
      const reading1 = await this.getSingleLocationReading();
      console.log(`[LocationService] 📍 Reading 1: ${reading1.lat.toFixed(6)}, ${reading1.lng.toFixed(6)} (±${reading1.accuracy}m)`);

      // Wait 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Second reading
      const reading2 = await this.getSingleLocationReading();
      console.log(`[LocationService] 📍 Reading 2: ${reading2.lat.toFixed(6)}, ${reading2.lng.toFixed(6)} (±${reading2.accuracy}m)`);

      // Calculate distance between readings
      const deltaLat = reading2.lat - reading1.lat;
      const deltaLng = reading2.lng - reading1.lng;
      const distanceMoved = Math.sqrt(deltaLat * deltaLat + deltaLng * deltaLng) * 111000; // Convert to meters

      // Calculate time difference (should be ~2 seconds)
      const timeDiff = (reading2.timestamp - reading1.timestamp) / 1000; // Convert to seconds
      const speed = distanceMoved / timeDiff; // meters per second

      this.lastMovementCheck.set(Date.now());
      this.movementSpeed.set(speed);

      if (distanceMoved > MOVEMENT_THRESHOLD_METERS) {
        // MOVEMENT DETECTED!
        this.isMoving.set(true);
        this.lastMovement.set(Date.now());
        console.log(`[LocationService] 🚶 MOVEMENT DETECTED: ${Math.round(distanceMoved)}m in ${timeDiff.toFixed(1)}s (${speed.toFixed(1)} m/s)!`);

        // Update location to the latest reading
        this.location.set(reading2);

        // Schedule next check in 3 seconds (frequent polling)
        setTimeout(() => this.performMovementCheck(), 3000);
      } else {
        // STATIONARY
        this.isMoving.set(false);
        console.log(`[LocationService] 🟢 Stationary: ${Math.round(distanceMoved)}m movement (threshold: ${MOVEMENT_THRESHOLD_METERS}m)`);

        // Update location to the latest reading
        this.location.set(reading2);

        // Schedule next check in 30 seconds (battery efficient)
        setTimeout(() => this.performMovementCheck(), 30000);
      }

    } catch (error) {
      console.error('[LocationService] ❌ Movement check failed:', error);
      this.error.set('Movement detection failed');

      // Retry in 10 seconds
      setTimeout(() => this.performMovementCheck(), 10000);
    }
  }

  /**
   * Get a single GPS reading as a Promise
   */
  private getSingleLocationReading(): Promise<GeoLocation> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (position.coords.accuracy > MIN_ACCURACY_METERS) {
            reject(new Error(`Poor GPS accuracy: ${position.coords.accuracy}m`));
            return;
          }

          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now(),
          });
        },
        (error) => reject(error),
        {
          enableHighAccuracy: true,
          maximumAge: 0, // Force fresh reading
          timeout: LOCATION_TIMEOUT_MS,
        }
      );
    });
  }

  /**
   * Start smart movement detection system
   */
  startMovementDetection(): void {
    if (this.isTracking()) {
      console.log('[LocationService] ⚠️ Movement detection already running');
      return;
    }

    this.isTracking.set(true);
    console.log('[LocationService] 🚀 Starting smart movement detection system...');
    this.performMovementCheck();
  }

  /**
   * Stop movement detection system
   */
  stopMovementDetection(): void {
    this.isTracking.set(false);
    this.isMoving.set(false);
    console.log('[LocationService] 🛑 Stopped movement detection system');
  }
}
