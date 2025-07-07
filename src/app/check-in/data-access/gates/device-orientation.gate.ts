import { Injectable, computed, signal } from '@angular/core';
import { CheckinGate } from './gate.interface';
import { CHECKIN_GATE_THRESHOLDS } from './checkin-thresholds.config';

export type DeviceOrientationData = {
  beta: number;  // Front-to-back tilt in degrees
};

@Injectable({ providedIn: 'root' })
export class DeviceOrientationGate implements CheckinGate {
  readonly name = 'Device Orientation';
  readonly description = CHECKIN_GATE_THRESHOLDS.deviceOrientation.description;
  readonly threshold = CHECKIN_GATE_THRESHOLDS.deviceOrientation.maxAngleFromDown;

  // Orientation state
  private readonly _deviceOrientation = signal<DeviceOrientationData>({
    beta: 0
  });

  private readonly _isMonitoring = signal(false);
  private readonly _hasPermission = signal(false);

  // Readonly signals for external consumption
  readonly orientation = this._deviceOrientation.asReadonly();
  readonly isMonitoring = this._isMonitoring.asReadonly();
  readonly hasPermission = this._hasPermission.asReadonly();

  private orientationHandler: ((event: DeviceOrientationEvent) => void) | null = null;
  private orientationTimeout: any;

  readonly currentValue = computed(() => {
    const orientation = this._deviceOrientation();
    return Math.abs(orientation.beta);
  });

  /**
   * Computed signal to determine if device is properly oriented for carpet photos
   *
   * LOGIC:
   * - Beta should be between -5° and 45° (nearly horizontal to moderately tilted)
   */
  readonly passed = computed(() => {
    const orientation = this._deviceOrientation();
    const beta = orientation.beta;
    
    // Acceptable range: -5 to 45 degrees
    const isAcceptable = beta >= -5 && beta <= 45;

    console.log('[DeviceOrientationGate] Check:', {
      beta,
      isAcceptable
    });

    return isAcceptable;
  });

  constructor() {
    this.startMonitoring();
  }

  /**
   * Start monitoring device orientation for check-in validation
   *
   * Handles:
   * - iOS 13+ permission requests
   * - Cross-browser compatibility
   */
  async startMonitoring(): Promise<void> {
    console.log('[DeviceOrientationGate] Starting device orientation monitoring');

    if (!('DeviceOrientationEvent' in window)) {
      console.warn('[DeviceOrientationGate] Device orientation not supported');
      return;
    }

    try {
      // Check if we need permission (iOS 13+)
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        console.log('[DeviceOrientationGate] Requesting device orientation permission...');

        const response = await (DeviceOrientationEvent as any).requestPermission();
        console.log('[DeviceOrientationGate] Permission response:', response);

        if (response === 'granted') {
          this._hasPermission.set(true);
          this._attachOrientationListener();
        } else {
          console.warn('[DeviceOrientationGate] Device orientation permission denied');
        }
      } else {
        // No permission needed (Android, older iOS)
        console.log('[DeviceOrientationGate] Adding device orientation listener (no permission needed)');
        this._hasPermission.set(true);
        this._attachOrientationListener();
      }

      this._isMonitoring.set(true);

    } catch (error) {
      console.error('[DeviceOrientationGate] Failed to start orientation monitoring:', error);
    }
  }

  /**
   * Stop monitoring device orientation and clean up listeners
   */
  stopMonitoring(): void {
    console.log('[DeviceOrientationGate] Stopping device orientation monitoring');

    if (this.orientationTimeout) {
      clearTimeout(this.orientationTimeout);
      this.orientationTimeout = null;
    }

    if (this.orientationHandler) {
      window.removeEventListener('deviceorientation', this.orientationHandler);
      this.orientationHandler = null;
      console.log('[DeviceOrientationGate] Orientation listener removed');
    }

    this._isMonitoring.set(false);
  }

  /**
   * Clean up service state and stop monitoring
   */
  cleanup(): void {
    console.log('[DeviceOrientationGate] Cleaning up orientation service');
    this.stopMonitoring();
    this._deviceOrientation.set({ beta: 0 });
    this._hasPermission.set(false);
  }

  // ==========================================
  // PRIVATE METHODS
  // ==========================================

  /**
   * Attach the device orientation event listener
   */
  private _attachOrientationListener(): void {
    // Create bound handler that can be properly removed
    this.orientationHandler = this._handleDeviceOrientation.bind(this);
    window.addEventListener('deviceorientation', this.orientationHandler);
    console.log('[DeviceOrientationGate] Device orientation listener attached');
  }

  /**
   * Handle device orientation events with debouncing
   *
   * @param event DeviceOrientationEvent from browser
   */
  private _handleDeviceOrientation(event: DeviceOrientationEvent): void {
    // Clear existing timeout
    if (this.orientationTimeout) {
      clearTimeout(this.orientationTimeout);
    }

    // Debounce updates by 50ms for smooth but not too frequent updates
    this.orientationTimeout = setTimeout(() => {
      // Round beta to integer
      const roundedBeta = event.beta !== null ? Math.round(event.beta) : 0;
      
      console.log('[DeviceOrientationGate] Orientation update:', { beta: roundedBeta });
      
      this._deviceOrientation.set({ beta: roundedBeta });
    }, 50);
  }

}
