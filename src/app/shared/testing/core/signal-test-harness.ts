/**
 * @fileoverview Enhanced Signal Testing Harness
 *
 * Advanced utilities for testing Angular signals in complex scenarios.
 * Provides signal change tracking, reactive chain simulation, and
 * sophisticated assertion helpers for signals.
 */

import { computed, effect, signal, type Signal, type WritableSignal } from '@angular/core';

// ===================================
// SIGNAL TESTING TYPES
// ===================================

export interface SignalChange<T> {
  value: T;
  timestamp: number;
  source?: string;
}

export interface SignalAssertion<T> {
  signal: Signal<T>;
  expectedValue: T;
  timeout?: number;
  errorMessage?: string;
}

export interface ReactiveChain {
  name: string;
  signals: Record<string, Signal<any>>;
  computedSignals: Record<string, Signal<any>>;
  effects: Array<() => void>;
}

export interface SignalTestScenario<T> {
  name: string;
  description?: string;
  initialValue: T;
  changes: Array<{ value: T; delay?: number; source?: string }>;
  expectations: Array<SignalAssertion<any>>;
}

// ===================================
// SIGNAL CHANGE TRACKER
// ===================================

export class SignalChangeTracker<T> {
  private changes: SignalChange<T>[] = [];
  private effectCleanup?: () => void;

  constructor(
    private signal: Signal<T>,
    private name: string = 'unknown'
  ) {
    this.startTracking();
  }

  /**
   * Start tracking signal changes
   */
  private startTracking(): void {
    // Record initial value
    this.changes.push({
      value: this.signal(),
      timestamp: Date.now(),
      source: 'initial',
    });

    // For test environments, we'll use a simpler polling approach
    // instead of Angular effects to avoid injection context issues
    try {
      this.effectCleanup = effect(() => {
        const currentValue = this.signal();
        const lastChange = this.changes[this.changes.length - 1];

        // Only record if value actually changed
        if (this.changes.length === 0 || currentValue !== lastChange.value) {
          this.changes.push({
            value: currentValue,
            timestamp: Date.now(),
            source: 'effect',
          });
        }
      });
    } catch (error) {
      // If effect() fails due to injection context, use manual tracking
      console.warn('Effect tracking unavailable, using manual tracking for signal changes');
      this.effectCleanup = undefined;
    }
  }

  /**
   * Get all recorded changes
   */
  getChanges(): SignalChange<T>[] {
    return [...this.changes];
  }

  /**
   * Get the latest value
   */
  getLatestValue(): T {
    return this.changes[this.changes.length - 1]?.value;
  }

  /**
   * Manually record a signal change (for test environments)
   */
  recordChange(source: string = 'manual'): void {
    const currentValue = this.signal();
    const lastChange = this.changes[this.changes.length - 1];

    // Only record if value actually changed
    if (!lastChange || currentValue !== lastChange.value) {
      this.changes.push({
        value: currentValue,
        timestamp: Date.now(),
        source,
      });
    }
  }

  /**
   * Get number of changes (including initial)
   */
  getChangeCount(): number {
    return this.changes.length;
  }

  /**
   * Get changes since a specific timestamp
   */
  getChangesSince(timestamp: number): SignalChange<T>[] {
    return this.changes.filter(change => change.timestamp > timestamp);
  }

  /**
   * Check if signal changed within a time window
   */
  hasChangedInLast(milliseconds: number): boolean {
    const cutoff = Date.now() - milliseconds;
    return this.changes.some(change => change.timestamp > cutoff);
  }

  /**
   * Wait for signal to change to a specific value
   */
  async waitForValue(expectedValue: T, timeout: number = 1000): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkValue = () => {
        const currentValue = this.signal();
        if (currentValue === expectedValue) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(
            new Error(
              `Signal '${this.name}' did not reach expected value ${expectedValue} within ${timeout}ms. Current: ${currentValue}`
            )
          );
        } else {
          setTimeout(checkValue, 10);
        }
      };

      checkValue();
    });
  }

  /**
   * Wait for signal to change (any change)
   */
  async waitForChange(timeout: number = 1000): Promise<T> {
    const initialChangeCount = this.changes.length;

    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkForChange = () => {
        if (this.changes.length > initialChangeCount) {
          resolve(this.getLatestValue());
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Signal '${this.name}' did not change within ${timeout}ms`));
        } else {
          setTimeout(checkForChange, 10);
        }
      };

      checkForChange();
    });
  }

  /**
   * Reset change tracking
   */
  reset(): void {
    this.changes = [];
    this.startTracking();
  }

  /**
   * Stop tracking and cleanup
   */
  destroy(): void {
    if (this.effectCleanup) {
      this.effectCleanup();
    }
    this.changes = [];
  }
}

// ===================================
// REACTIVE CHAIN SIMULATOR
// ===================================

export class ReactiveChainSimulator {
  private trackers = new Map<string, SignalChangeTracker<any>>();
  private computedSignals = new Map<string, Signal<any>>();
  private effectCleanups: Array<() => void> = [];

  /**
   * Add a signal to track in the reactive chain
   */
  addSignal<T>(name: string, signal: Signal<T>): ReactiveChainSimulator {
    const tracker = new SignalChangeTracker(signal, name);
    this.trackers.set(name, tracker);
    return this;
  }

  /**
   * Add a computed signal that derives from tracked signals
   */
  addComputed<T>(name: string, computeFn: () => T): ReactiveChainSimulator {
    const computed = signal(computeFn());
    this.computedSignals.set(name, computed);
    this.addSignal(name, computed);

    // Set up reactive computation
    const cleanup = effect(() => {
      const newValue = computeFn();
      (computed as WritableSignal<T>).set(newValue);
    });

    this.effectCleanups.push(cleanup);
    return this;
  }

  /**
   * Add an effect to the reactive chain
   */
  addEffect(name: string, effectFn: () => void): ReactiveChainSimulator {
    const cleanup = effect(effectFn);
    this.effectCleanups.push(cleanup);
    return this;
  }

  /**
   * Get change tracker for a specific signal
   */
  getTracker<T>(name: string): SignalChangeTracker<T> | undefined {
    return this.trackers.get(name) as SignalChangeTracker<T>;
  }

  /**
   * Get all change counts across the reactive chain
   */
  getChainSnapshot(): Record<string, number> {
    const snapshot: Record<string, number> = {};
    this.trackers.forEach((tracker, name) => {
      snapshot[name] = tracker.getChangeCount();
    });
    return snapshot;
  }

  /**
   * Wait for the entire reactive chain to stabilize
   */
  async waitForStabilization(timeout: number = 1000): Promise<void> {
    const stabilityWindow = 50; // ms to wait for no changes
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      let lastChangeTime = Date.now();

      const checkStability = () => {
        // Check if any tracker has recent changes
        let hasRecentChanges = false;
        this.trackers.forEach(tracker => {
          if (tracker.hasChangedInLast(stabilityWindow)) {
            hasRecentChanges = true;
            lastChangeTime = Date.now();
          }
        });

        if (!hasRecentChanges && Date.now() - lastChangeTime > stabilityWindow) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Reactive chain did not stabilize within ${timeout}ms`));
        } else {
          setTimeout(checkStability, 10);
        }
      };

      checkStability();
    });
  }

  /**
   * Simulate a cascade of signal changes
   */
  async simulateCascade(
    changes: Array<{ signalName: string; value: unknown; delay?: number }>
  ): Promise<void> {
    for (const change of changes) {
      const tracker = this.trackers.get(change.signalName);
      if (tracker && 'set' in tracker.signal) {
        (tracker.signal as WritableSignal<unknown>).set(change.value);
      }

      if (change.delay) {
        await new Promise(resolve => setTimeout(resolve, change.delay));
      }
    }

    // Wait for reactive updates to propagate
    await this.waitForStabilization();
  }

  /**
   * Verify reactive chain propagation
   */
  verifyPropagation(
    expectedPropagations: Array<{ from: string; to: string; within?: number }>
  ): void {
    for (const { from, to, within = 100 } of expectedPropagations) {
      const fromTracker = this.trackers.get(from);
      const toTracker = this.trackers.get(to);

      if (!fromTracker || !toTracker) {
        throw new Error(`Missing tracker for propagation verification: ${from} → ${to}`);
      }

      const fromChanges = fromTracker.getChanges();
      const toChanges = toTracker.getChanges();

      // Check if 'to' signal changed after 'from' signal
      if (fromChanges.length > 1 && toChanges.length > 1) {
        const lastFromChange = fromChanges[fromChanges.length - 1];
        const lastToChange = toChanges[toChanges.length - 1];

        const timeDiff = lastToChange.timestamp - lastFromChange.timestamp;
        expect(timeDiff).toBeLessThanOrEqual(within);
        expect(timeDiff).toBeGreaterThanOrEqual(0);
      }
    }
  }

  /**
   * Clean up all trackers and effects
   */
  destroy(): void {
    this.trackers.forEach(tracker => tracker.destroy());
    this.trackers.clear();
    this.computedSignals.clear();

    this.effectCleanups.forEach(cleanup => cleanup());
    this.effectCleanups = [];
  }
}

// ===================================
// SIGNAL TEST HARNESS
// ===================================

export class SignalTestHarness {
  private trackers = new Map<string, SignalChangeTracker<any>>();
  private reactiveChain?: ReactiveChainSimulator;

  /**
   * Create a test signal with tracking
   */
  createTestSignal<T>(name: string, initialValue: T): WritableSignal<T> {
    const testSignal = signal(initialValue);
    this.addTracker(name, testSignal);
    return testSignal;
  }

  /**
   * Add tracking to an existing signal
   */
  addTracker<T>(name: string, signal: Signal<T>): SignalChangeTracker<T> {
    const tracker = new SignalChangeTracker(signal, name);
    this.trackers.set(name, tracker);
    return tracker;
  }

  /**
   * Get tracker by name
   */
  getTracker<T>(name: string): SignalChangeTracker<T> | undefined {
    return this.trackers.get(name) as SignalChangeTracker<T>;
  }

  /**
   * Create a reactive chain simulator
   */
  createReactiveChain(): ReactiveChainSimulator {
    this.reactiveChain = new ReactiveChainSimulator();
    return this.reactiveChain;
  }

  /**
   * Run a signal test scenario
   */
  async runScenario<T>(scenario: SignalTestScenario<T>): Promise<void> {
    console.log(`🧪 Running signal test scenario: ${scenario.name}`);

    // Create test signal
    const testSignal = this.createTestSignal(scenario.name, scenario.initialValue);
    const tracker = this.getTracker<T>(scenario.name)!;

    // Apply changes
    for (const change of scenario.changes) {
      if (change.delay) {
        await new Promise(resolve => setTimeout(resolve, change.delay));
      }

      console.log(
        `   • Setting ${scenario.name} = ${change.value} ${change.source ? `(${change.source})` : ''}`
      );
      testSignal.set(change.value);
    }

    // Wait for propagation
    await new Promise(resolve => setTimeout(resolve, 50));

    // Verify expectations
    for (const assertion of scenario.expectations) {
      const actualValue = assertion.signal();
      expect(actualValue).toEqual(assertion.expectedValue);
      console.log(`   ✅ Expected ${assertion.expectedValue}, got ${actualValue}`);
    }

    console.log(`✅ Scenario '${scenario.name}' completed successfully`);
  }

  /**
   * Advanced signal assertions
   */
  assertSignalBehavior<T>(
    signalName: string,
    assertions: {
      hasChangedSince?: number;
      changeCount?: number;
      latestValue?: T;
      changedWithin?: number;
    }
  ): void {
    const tracker = this.trackers.get(signalName);
    if (!tracker) {
      throw new Error(`No tracker found for signal '${signalName}'`);
    }

    if (assertions.hasChangedSince !== undefined) {
      expect(tracker.hasChangedInLast(assertions.hasChangedSince)).toBe(true);
    }

    if (assertions.changeCount !== undefined) {
      expect(tracker.getChangeCount()).toBe(assertions.changeCount);
    }

    if (assertions.latestValue !== undefined) {
      expect(tracker.getLatestValue()).toEqual(assertions.latestValue);
    }

    if (assertions.changedWithin !== undefined) {
      expect(tracker.hasChangedInLast(assertions.changedWithin)).toBe(true);
    }
  }

  /**
   * Batch signal assertions
   */
  async assertAll(assertions: Array<SignalAssertion<any>>): Promise<void> {
    const promises = assertions.map(async assertion => {
      if (assertion.timeout) {
        const tracker = this.trackers.get('temp');
        if (tracker) {
          await tracker.waitForValue(assertion.expectedValue, assertion.timeout);
        }
      }

      const actualValue = assertion.signal();
      expect(actualValue).toEqual(assertion.expectedValue);
    });

    await Promise.all(promises);
  }

  /**
   * Reset all trackers
   */
  reset(): void {
    this.trackers.forEach(tracker => tracker.reset());
  }

  /**
   * Cleanup and destroy all resources
   */
  destroy(): void {
    this.trackers.forEach(tracker => tracker.destroy());
    this.trackers.clear();

    if (this.reactiveChain) {
      this.reactiveChain.destroy();
    }
  }
}

// ===================================
// CONVENIENCE FUNCTIONS
// ===================================

/**
 * Create a signal test harness for a test suite
 */
export function createSignalTestHarness(): SignalTestHarness {
  return new SignalTestHarness();
}

/**
 * Quick signal change tracking
 */
export function trackSignal<T>(signal: Signal<T>, name?: string): SignalChangeTracker<T> {
  return new SignalChangeTracker(signal, name);
}

/**
 * Create reactive chain for testing interdependent signals
 */
export function createReactiveChain(): ReactiveChainSimulator {
  return new ReactiveChainSimulator();
}

/**
 * Test signal reactivity patterns
 */
export async function testSignalReactivity<T>(
  signal: WritableSignal<T>,
  changes: T[],
  expectations: Array<(value: T) => boolean>
): Promise<void> {
  const tracker = new SignalChangeTracker(signal, 'test-signal');

  try {
    // Apply changes
    for (let i = 0; i < changes.length; i++) {
      signal.set(changes[i]);

      // Wait for reactivity
      await new Promise(resolve => setTimeout(resolve, 10));

      // Check expectation
      const currentValue = signal();
      if (expectations[i] && !expectations[i](currentValue)) {
        throw new Error(
          `Signal reactivity expectation failed at step ${i}. Value: ${currentValue}`
        );
      }
    }
  } finally {
    tracker.destroy();
  }
}

/**
 * Mock signal with predefined behavior
 */
export function createMockSignal<T>(
  initialValue: T,
  behavior?: {
    changes?: Array<{ after: number; value: T }>;
    computedFrom?: Signal<any>;
    customGetter?: () => T;
  }
): Signal<T> {
  const mockSignal = signal(initialValue);

  if (behavior?.changes) {
    // Schedule automatic changes
    behavior.changes.forEach(({ after, value }) => {
      setTimeout(() => {
        (mockSignal as WritableSignal<T>).set(value);
      }, after);
    });
  }

  if (behavior?.computedFrom) {
    // Create computed relationship
    effect(() => {
      const sourceValue = behavior.computedFrom!();
      // Apply some transformation logic here
      (mockSignal as WritableSignal<T>).set(sourceValue as T);
    });
  }

  if (behavior?.customGetter) {
    // Override getter behavior
    return computed(behavior.customGetter);
  }

  return mockSignal.asReadonly();
}
