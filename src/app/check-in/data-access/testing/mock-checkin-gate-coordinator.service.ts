import { Injectable, computed, signal } from '@angular/core';
import { CarpetConfidence } from '../gates/checkin-gate.coordinator';

/**
 * Mock implementation of CheckinGateCoordinator for testing
 */
@Injectable()
export class MockCheckinGateCoordinator {
  // Default gate states - all passing
  private readonly _gateStates = signal({
    deviceOriented: true,
    isStable: true,
    lowMotion: true,
    goodSharpness: true,
    goodContrast: true,
    hasTexture: true,
    hasEdges: true,
    metricsReady: true,
    carpetConfidence: 'possible' as CarpetConfidence,
  });

  readonly gateStatus = this._gateStates.asReadonly();

  readonly allGatesPassed = computed(() => {
    const gates = this._gateStates();
    return (
      gates.deviceOriented &&
      gates.isStable &&
      gates.carpetConfidence === 'possible' &&
      gates.goodSharpness &&
      gates.goodContrast &&
      gates.hasTexture &&
      gates.hasEdges &&
      gates.lowMotion
    );
  });

  readonly carpetConfidence = computed(() => this._gateStates().carpetConfidence);

  cleanup(): void {
    console.log('[MockCheckinGateCoordinator] cleanup called');
  }

  /**
   * Test helper to update gate states
   */
  setGateStates(states: Partial<ReturnType<typeof this.gateStatus>>): void {
    this._gateStates.update(current => ({
      ...current,
      ...states,
    }));
  }

  /**
   * Test helper to fail all gates
   */
  failAllGates(): void {
    this._gateStates.set({
      deviceOriented: false,
      isStable: false,
      lowMotion: false,
      goodSharpness: false,
      goodContrast: false,
      hasTexture: false,
      hasEdges: false,
      metricsReady: false,
      carpetConfidence: 'no',
    });
  }

  /**
   * Test helper to pass all gates
   */
  passAllGates(): void {
    this._gateStates.set({
      deviceOriented: true,
      isStable: true,
      lowMotion: true,
      goodSharpness: true,
      goodContrast: true,
      hasTexture: true,
      hasEdges: true,
      metricsReady: true,
      carpetConfidence: 'possible',
    });
  }
}
