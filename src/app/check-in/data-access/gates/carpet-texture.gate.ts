import { Injectable, computed, signal } from '@angular/core';
import { CheckinGate } from './gate.interface';
import { CHECKIN_GATE_THRESHOLDS } from './checkin-thresholds.config';

@Injectable({ providedIn: 'root' })
export class CarpetTextureGate implements CheckinGate {
  readonly name = 'Carpet Texture';
  readonly description = CHECKIN_GATE_THRESHOLDS.textureComplexity.description;
  readonly threshold = CHECKIN_GATE_THRESHOLDS.textureComplexity.min;

  private readonly _textureComplexity = signal<number>(0);

  readonly textureComplexity = this._textureComplexity.asReadonly();
  readonly currentValue = computed(() => this._textureComplexity());
  
  readonly passed = computed(() => {
    const value = this._textureComplexity();
    const isPassed = value > this.threshold;
    
    console.log('[CarpetTextureGate] Check:', {
      textureComplexity: value,
      threshold: this.threshold,
      passed: isPassed
    });
    
    return isPassed;
  });

  updateTextureComplexity(value: number): void {
    this._textureComplexity.set(value);
  }
}