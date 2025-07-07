import { Injectable, computed, signal } from '@angular/core';
import { CheckinGate } from './gate.interface';
import { CHECKIN_GATE_THRESHOLDS } from './checkin-thresholds.config';

@Injectable({ providedIn: 'root' })
export class SimpleOrientationGate implements CheckinGate {
  readonly name = 'Simple Orientation';
  readonly description = CHECKIN_GATE_THRESHOLDS.simpleOrientation.description;
  readonly threshold = CHECKIN_GATE_THRESHOLDS.simpleOrientation.max;

  private readonly _beta = signal<number | null>(null);

  readonly beta = this._beta.asReadonly();
  readonly currentValue = computed(() => this._beta());
  
  // Expose orientation for compatibility with template
  readonly orientation = computed(() => ({ beta: this._beta() || 0 }));
  
  readonly passed = computed(() => {
    const betaValue = this._beta();
    if (betaValue === null) return false;
    
    const isPassed = betaValue >= CHECKIN_GATE_THRESHOLDS.simpleOrientation.min && 
                     betaValue <= CHECKIN_GATE_THRESHOLDS.simpleOrientation.max;
    
    console.log('[SimpleOrientationGate] Check:', {
      beta: betaValue,
      range: `${CHECKIN_GATE_THRESHOLDS.simpleOrientation.min} to ${CHECKIN_GATE_THRESHOLDS.simpleOrientation.max}`,
      passed: isPassed
    });
    
    return isPassed;
  });

  updateBeta(value: number | null): void {
    this._beta.set(value);
  }
}