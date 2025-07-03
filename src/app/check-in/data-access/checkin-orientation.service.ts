import { Injectable, signal, computed } from '@angular/core';

export interface DeviceOrientation {
  beta: number;   // Front-to-back tilt
  gamma: number;  // Left-to-right tilt
  stable: boolean; // Movement stability
}

/**
 * Monitors device orientation for optimal carpet photography
 * 
 * SCOPE:
 * - Device tilt angles (beta/gamma) monitoring via DeviceOrientationEvent
 * - Detection if phone is pointed down at carpet (proper angle)
 * - Device stability and motion tracking over time
 * - iOS orientation permission handling and fallbacks
 * - Orientation-based validation for photo capture readiness
 * 
 * DOES NOT HANDLE:
 * - Camera metrics or photo quality analysis (handled by CheckinPhotoValidationService)
 * - Other device sensors beyond orientation (accelerometer, gyroscope separately)
 * - UI state management or flow control (handled by CheckinFlowService)
 * - Photo capture or camera hardware (handled by CameraService)
 */
@Injectable({
  providedIn: 'root'
})
export class CheckinOrientationService {
  
  // Orientation state
  private readonly _deviceOrientation = signal<DeviceOrientation>({ 
    beta: 0, 
    gamma: 0, 
    stable: false 
  });
  
  private readonly _isMonitoring = signal(false);
  private readonly _hasPermission = signal(false);

  // Readonly signals for external consumption
  readonly deviceOrientation = this._deviceOrientation.asReadonly();
  readonly isMonitoring = this._isMonitoring.asReadonly();
  readonly hasPermission = this._hasPermission.asReadonly();

  // Tracking for stability calculation
  private lastOrientationUpdate = 0;
  private orientationHandler: ((event: DeviceOrientationEvent) => void) | null = null;

  /**
   * Computed signal to determine if device is properly oriented for carpet photos
   * 
   * LOGIC:
   * - Phone should be pointing DOWN at carpet (beta < 45 degrees from horizontal)
   * - When looking UP (beta near 0), we want NO
   * - When pointing DOWN (beta > 45), we want YES
   * 
   * @returns true if device is oriented correctly for carpet photography
   */
  readonly isDeviceOriented = computed(() => {
    const orientation = this._deviceOrientation();
    
    // Device oriented: Phone pointing down at carpet
    const deviceOriented = Math.abs(orientation.beta) > 45;
    
    console.log('[OrientationService] 🧭 Device orientation check:', {
      beta: orientation.beta,
      gamma: orientation.gamma,
      betaAbs: Math.abs(orientation.beta),
      deviceOriented,
      stable: orientation.stable
    });

    return deviceOriented;
  });

  /**
   * Computed signal to determine if device is stable enough for clear photos
   * 
   * @returns true if device movement is minimal and stable
   */
  readonly isDeviceStable = computed(() => {
    const orientation = this._deviceOrientation();
    return orientation.stable;
  });

  /**
   * Start monitoring device orientation for check-in validation
   * 
   * Handles:
   * - iOS 13+ permission requests
   * - Cross-browser compatibility
   * - Desktop fallbacks
   * 
   * @returns Promise that resolves when monitoring starts successfully
   */
  async startMonitoring(): Promise<void> {
    console.log('[OrientationService] 📱 Starting device orientation monitoring');
    console.log('[OrientationService] 🔧 DeviceOrientationEvent available?', 'DeviceOrientationEvent' in window);
    console.log('[OrientationService] 🔧 User agent:', navigator.userAgent);

    if (!('DeviceOrientationEvent' in window)) {
      console.warn('[OrientationService] ⚠️ Device orientation not supported - desktop mode');
      this._setDesktopFallback();
      return;
    }

    try {
      // Check if we need permission (iOS 13+)
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        console.log('[OrientationService] 🔐 Requesting device orientation permission...');
        
        const response = await (DeviceOrientationEvent as any).requestPermission();
        console.log('[OrientationService] 🔐 Permission response:', response);
        
        if (response === 'granted') {
          this._hasPermission.set(true);
          this._attachOrientationListener();
        } else {
          console.warn('[OrientationService] ❌ Device orientation permission denied');
          this._setDesktopFallback();
        }
      } else {
        // No permission needed (Android, older iOS)
        console.log('[OrientationService] 📱 Adding device orientation listener (no permission needed)');
        this._hasPermission.set(true);
        this._attachOrientationListener();
      }

      this._isMonitoring.set(true);
      
    } catch (error) {
      console.error('[OrientationService] ❌ Failed to start orientation monitoring:', error);
      this._setDesktopFallback();
    }
  }

  /**
   * Stop monitoring device orientation and clean up listeners
   */
  stopMonitoring(): void {
    console.log('[OrientationService] 🛑 Stopping device orientation monitoring');
    
    if (this.orientationHandler) {
      window.removeEventListener('deviceorientation', this.orientationHandler);
      this.orientationHandler = null;
      console.log('[OrientationService] 🧹 Orientation listener removed');
    }

    this._isMonitoring.set(false);
  }

  /**
   * Get current orientation data for debugging
   * 
   * @returns Current device orientation and metadata
   */
  getOrientationDebugInfo(): {
    orientation: DeviceOrientation;
    isOriented: boolean;
    isStable: boolean;
    isMonitoring: boolean;
    hasPermission: boolean;
  } {
    return {
      orientation: this._deviceOrientation(),
      isOriented: this.isDeviceOriented(),
      isStable: this.isDeviceStable(),
      isMonitoring: this._isMonitoring(),
      hasPermission: this._hasPermission()
    };
  }

  /**
   * Force set orientation for testing purposes
   * 
   * @param orientation Orientation to set
   */
  setOrientationForTesting(orientation: DeviceOrientation): void {
    if (console.warn) {
      console.warn('[OrientationService] ⚠️ Setting orientation for testing - not for production use');
    }
    this._deviceOrientation.set(orientation);
  }

  /**
   * Clean up service state and stop monitoring
   */
  cleanup(): void {
    console.log('[OrientationService] 🧹 Cleaning up orientation service');
    this.stopMonitoring();
    this._deviceOrientation.set({ beta: 0, gamma: 0, stable: false });
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
    console.log('[OrientationService] ✅ Device orientation listener attached');
  }

  /**
   * Handle device orientation events
   * 
   * @param event DeviceOrientationEvent from browser
   */
  private _handleDeviceOrientation(event: DeviceOrientationEvent): void {
    const beta = event.beta || 0;   // Front-to-back tilt
    const gamma = event.gamma || 0; // Left-to-right tilt
    const alpha = event.alpha || 0; // Compass direction

    console.log('[OrientationService] 📐 Raw orientation:', { alpha, beta, gamma });

    // Calculate stability based on movement over time
    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastOrientationUpdate;

    const prevOrientation = this._deviceOrientation();
    const movement = Math.abs(beta - prevOrientation.beta) + Math.abs(gamma - prevOrientation.gamma);

    console.log('[OrientationService] 📊 Movement calculation:', {
      prevBeta: prevOrientation.beta,
      newBeta: beta,
      prevGamma: prevOrientation.gamma,
      newGamma: gamma,
      movement,
      timeSinceLastUpdate
    });

    // Consider stable if movement is small and enough time has passed
    const stable = movement < 5 && timeSinceLastUpdate > 1000;

    console.log('[OrientationService] 📱 Orientation update:', { beta, gamma, stable, movement });

    this._deviceOrientation.set({ beta, gamma, stable });
    this.lastOrientationUpdate = now;
  }

  /**
   * Set fallback values for desktop/unsupported devices
   */
  private _setDesktopFallback(): void {
    console.log('[OrientationService] 🖥️ Setting desktop fallback values');
    
    // Set reasonable defaults but mark as unsupported
    this._deviceOrientation.set({ 
      beta: 0,      // Assume device is flat 
      gamma: 0,     // Assume device is not tilted
      stable: false // Mark as unstable since we can't detect
    });
    
    this._hasPermission.set(false);
    this._isMonitoring.set(false);
  }
}