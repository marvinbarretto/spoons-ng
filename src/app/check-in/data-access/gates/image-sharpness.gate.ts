import { Injectable, computed, signal } from '@angular/core';
import { CheckinGate } from './gate.interface';
import { CHECKIN_GATE_THRESHOLDS } from './checkin-thresholds.config';

@Injectable({ providedIn: 'root' })
export class ImageSharpnessGate implements CheckinGate {
  readonly name = 'Image Sharpness';
  readonly description = CHECKIN_GATE_THRESHOLDS.sharpness.description;
  readonly threshold = CHECKIN_GATE_THRESHOLDS.sharpness.min;

  private readonly _sharpness = signal<number>(0);

  readonly sharpness = this._sharpness.asReadonly();
  readonly currentValue = computed(() => this._sharpness());
  
  readonly passed = computed(() => {
    const value = this._sharpness();
    const isPassed = value > this.threshold;
    
    console.log('[ImageSharpnessGate] Check:', {
      sharpness: value,
      threshold: this.threshold,
      passed: isPassed
    });
    
    return isPassed;
  });

  updateSharpness(value: number): void {
    this._sharpness.set(value);
  }
}