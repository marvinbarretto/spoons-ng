import { Signal } from '@angular/core';

/**
 * Base interface for all check-in gate validators
 * Each gate determines if a specific condition is met
 */
export interface CheckinGate {
  /**
   * Signal indicating if this gate's condition is currently passed
   */
  readonly passed: Signal<boolean>;
  
  /**
   * Human-readable name of this gate
   */
  readonly name: string;
  
  /**
   * Current value being measured (for debugging)
   */
  readonly currentValue: Signal<number | null>;
  
  /**
   * Threshold value this gate uses
   */
  readonly threshold: number;
  
  /**
   * Description of what this gate checks
   */
  readonly description: string;
}