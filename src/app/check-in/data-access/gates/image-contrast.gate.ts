import { Injectable, computed, signal } from '@angular/core';
import { CheckinGate } from './gate.interface';
import { CHECKIN_GATE_THRESHOLDS } from './checkin-thresholds.config';

@Injectable({ providedIn: 'root' })
export class ImageContrastGate implements CheckinGate {
  readonly name = 'Image Contrast';
  readonly description = CHECKIN_GATE_THRESHOLDS.contrast.description;
  readonly threshold = CHECKIN_GATE_THRESHOLDS.contrast.min;

  private readonly _contrast = signal<number>(0);

  readonly contrast = this._contrast.asReadonly();
  readonly currentValue = computed(() => this._contrast());
  
  readonly passed = computed(() => {
    const value = this._contrast();
    const isPassed = value > this.threshold;
    
    console.log('[ImageContrastGate] Check:', {
      contrast: value,
      threshold: this.threshold,
      passed: isPassed
    });
    
    return isPassed;
  });

  updateContrast(value: number): void {
    this._contrast.set(value);
  }
}