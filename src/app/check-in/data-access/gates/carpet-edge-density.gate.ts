import { Injectable, computed, signal } from '@angular/core';
import { CHECKIN_GATE_THRESHOLDS } from './checkin-thresholds.config';
import { CheckinGate } from './gate.interface';

@Injectable({ providedIn: 'root' })
export class CarpetEdgeDensityGate implements CheckinGate {
  readonly name = 'Carpet Edge Density';
  readonly description = CHECKIN_GATE_THRESHOLDS.edgeDensity.description;
  readonly threshold = CHECKIN_GATE_THRESHOLDS.edgeDensity.min;

  private readonly _edgeDensity = signal<number>(0);

  readonly edgeDensity = this._edgeDensity.asReadonly();
  readonly currentValue = computed(() => this._edgeDensity());

  readonly passed = computed(() => {
    const value = this._edgeDensity();
    const isPassed = value > this.threshold;

    console.log('[CarpetEdgeDensityGate] Check:', {
      edgeDensity: value,
      threshold: this.threshold,
      passed: isPassed,
    });

    return isPassed;
  });

  updateEdgeDensity(value: number): void {
    this._edgeDensity.set(value);
  }
}
