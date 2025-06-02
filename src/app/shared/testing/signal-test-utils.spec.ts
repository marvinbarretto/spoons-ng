// src/app/shared/testing/signal-test-utils.ts
import { signal, computed, effect, Signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

/**
 * Utility to test signal reactivity and state transitions
 */
export class SignalTester<T> {
  private values: T[] = [];
  private effectRef?: import('@angular/core').EffectRef;

  constructor(private sig: Signal<T>) {}

  /**
   * Start collecting values from the signal
   */
  startWatching(): this {
    this.values = [this.sig()]; // Current value

    this.effectRef = TestBed.runInInjectionContext(() => {
      return effect(() => {
        const value = this.sig();
        if (this.values[this.values.length - 1] !== value) {
          this.values.push(value);
        }
      });
    });

    return this;
  }

  /**
   * Stop watching and return collected values
   */
  getValues(): T[] {
    this.effectRef?.destroy();
    return [...this.values];
  }

  /**
   * Assert the signal emitted expected values in order
   */
  expectValues(expected: T[]): void {
    expect(this.getValues()).toEqual(expected);
  }

  /**
   * Assert the current value
   */
  expectCurrentValue(expected: T): void {
    expect(this.sig()).toEqual(expected);
  }

  /**
   * Assert the signal emitted a specific number of values
   */
  expectEmissionCount(count: number): void {
    expect(this.getValues()).toHaveLength(count);
  }
}

/**
 * Helper to create a signal tester
 */
export function watchSignal<T>(signal: Signal<T>): SignalTester<T> {
  return new SignalTester(signal);
}

/**
 * Mock store helper - creates a minimal store with standard signals
 */
export function createMockStore<T>() {
  const loading$$ = signal(false);
  const error$$ = signal<string | null>(null);
  const data$$ = signal<T[]>([]);

  return {
    loading$$: loading$$.asReadonly(),
    error$$: error$$.asReadonly(),
    data$$: data$$.asReadonly(),
    // Expose setters for testing
    _setLoading: loading$$.set.bind(loading$$),
    _setError: error$$.set.bind(error$$),
    _setData: data$$.set.bind(data$$),
  };
}

/**
 * Async helper to wait for signal to emit specific value
 */
export async function waitForSignalValue<T>(
  signal: Signal<T>,
  expectedValue: T,
  timeoutMs = 1000
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      effectRef?.destroy();
      reject(new Error(`Signal did not emit expected value within ${timeoutMs}ms`));
    }, timeoutMs);

    let effectRef: import('@angular/core').EffectRef;

    effectRef = TestBed.runInInjectionContext(() => {
      return effect(() => {
        if (signal() === expectedValue) {
          clearTimeout(timeout);
          effectRef?.destroy();
          resolve();
        }
      });
    });
  });
}
