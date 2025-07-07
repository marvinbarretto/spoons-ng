import { Injectable, computed, signal } from '@angular/core';
import { CheckinGate } from './gate.interface';
import { CHECKIN_GATE_THRESHOLDS } from './checkin-thresholds.config';

@Injectable({ providedIn: 'root' })
export class MotionStabilityGate implements CheckinGate {
  readonly name = 'Motion Stability';
  readonly description = CHECKIN_GATE_THRESHOLDS.motion.description;
  readonly threshold = CHECKIN_GATE_THRESHOLDS.motion.max;

  // Internal state
  private readonly _motionLevel = signal<number>(0);
  private readonly _isStable = signal<boolean>(false);

  // Public signals
  readonly motionLevel = this._motionLevel.asReadonly();
  readonly isStable = this._isStable.asReadonly();
  
  readonly currentValue = computed(() => this._motionLevel());
  
  readonly passed = computed(() => {
    const motion = this._motionLevel();
    const stable = this._isStable();
    
    console.log('[MotionStabilityGate] Check:', {
      motionLevel: motion,
      threshold: this.threshold,
      isStable: stable,
      passed: motion < this.threshold && stable
    });
    
    return motion < this.threshold && stable;
  });

  /**
   * Update motion data from the analysis service
   */
  updateMotionData(motionLevel: number, isStable: boolean): void {
    this._motionLevel.set(motionLevel);
    this._isStable.set(isStable);
  }
}