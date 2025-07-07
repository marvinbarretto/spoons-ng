import { Injectable, computed, signal } from '@angular/core';
import { DeviceOrientationData } from '../gates/device-orientation.gate';

/**
 * Mock implementation of DeviceOrientationGate for testing
 */
@Injectable()
export class MockDeviceOrientationGate {
  readonly name = 'Device Orientation';
  readonly description = 'Phone should point downward at carpet';
  readonly threshold = 45;

  private readonly _orientation = signal<DeviceOrientationData>({ 
    beta: 30, // Default to pointing down
    gamma: 0, 
    stable: true 
  });

  readonly orientation = this._orientation.asReadonly();
  
  readonly currentValue = computed(() => {
    const orientation = this._orientation();
    return Math.abs(orientation.beta);
  });

  readonly passed = computed(() => {
    const orientation = this._orientation();
    const angleFromDown = Math.abs(orientation.beta);
    const isPointing = angleFromDown < this.threshold;
    return isPointing && orientation.stable;
  });

  cleanup(): void {
    console.log('[MockDeviceOrientationGate] cleanup called');
  }

  /**
   * Test helper to update orientation
   */
  setOrientation(data: Partial<DeviceOrientationData>): void {
    this._orientation.update(current => ({
      ...current,
      ...data
    }));
  }

  /**
   * Test helper to simulate device pointing down
   */
  simulatePointingDown(): void {
    this._orientation.set({
      beta: 30, // Less than 45 degree threshold
      gamma: 0,
      stable: true
    });
  }

  /**
   * Test helper to simulate device not pointing down
   */
  simulateNotPointingDown(): void {
    this._orientation.set({
      beta: 60, // More than 45 degree threshold
      gamma: 0,
      stable: true
    });
  }

  /**
   * Test helper to simulate unstable device
   */
  simulateUnstable(): void {
    this._orientation.update(current => ({
      ...current,
      stable: false
    }));
  }
}