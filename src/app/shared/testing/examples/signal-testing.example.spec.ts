/**
 * @fileoverview Signal Testing Examples
 * 
 * Demonstrates advanced signal testing patterns using the Signal Test Harness.
 * Shows how to test complex signal reactivity, computed chains, and async behavior.
 */

import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { signal, computed, effect } from '@angular/core';
import { 
  SignalTestHarness, 
  SignalChangeTracker,
  ReactiveChainSimulator,
  createSignalTestHarness,
  trackSignal,
  createReactiveChain,
  testSignalReactivity,
  createMockSignal
} from '../core/signal-test-harness';

describe('Signal Testing Examples', () => {
  let harness: SignalTestHarness;

  beforeEach(() => {
    harness = createSignalTestHarness();
  });

  afterEach(() => {
    harness.destroy();
  });

  describe('Basic Signal Tracking', () => {
    it('should track signal changes over time', async () => {
      // Create a test signal
      const userPoints = harness.createTestSignal('userPoints', 0);
      const tracker = harness.getTracker<number>('userPoints')!;

      // Make changes
      userPoints.set(10);
      userPoints.set(25);
      userPoints.set(50);

      // Verify change tracking
      expect(tracker.getChangeCount()).toBe(4); // Initial + 3 changes
      expect(tracker.getLatestValue()).toBe(50);
      
      const changes = tracker.getChanges();
      expect(changes.map(c => c.value)).toEqual([0, 10, 25, 50]);
    });

    it('should wait for specific signal values', async () => {
      const loadingSignal = harness.createTestSignal('loading', true);
      const tracker = harness.getTracker<boolean>('loading')!;

      // Simulate async operation completing
      setTimeout(() => {
        loadingSignal.set(false);
      }, 100);

      // Wait for loading to complete
      await tracker.waitForValue(false, 1000);
      expect(loadingSignal()).toBe(false);
    });

    it('should detect changes within time windows', async () => {
      const statusSignal = harness.createTestSignal('status', 'idle');
      const tracker = harness.getTracker<string>('status')!;

      statusSignal.set('loading');
      
      // Check if signal changed in the last 100ms
      expect(tracker.hasChangedInLast(100)).toBe(true);
      
      // Wait and check again
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(tracker.hasChangedInLast(100)).toBe(false);
    });
  });

  describe('Reactive Chain Testing', () => {
    it('should test complex reactive chains', async () => {
      // Create reactive chain
      const chain = harness.createReactiveChain();
      
      // Source signals
      const checkInCount = signal(5);
      const pointsPerCheckIn = signal(10);
      
      // Add to chain
      chain
        .addSignal('checkInCount', checkInCount)
        .addSignal('pointsPerCheckIn', pointsPerCheckIn)
        .addComputed('totalPoints', () => checkInCount() * pointsPerCheckIn())
        .addComputed('userLevel', () => {
          const points = checkInCount() * pointsPerCheckIn();
          return Math.floor(points / 100) + 1;
        });

      // Simulate changes
      await chain.simulateCascade([
        { signalName: 'checkInCount', value: 8, delay: 10 },
        { signalName: 'pointsPerCheckIn', value: 15, delay: 10 }
      ]);

      // Verify propagation
      const totalPointsTracker = chain.getTracker('totalPoints')!;
      const userLevelTracker = chain.getTracker('userLevel')!;
      
      expect(totalPointsTracker.getLatestValue()).toBe(120); // 8 * 15
      expect(userLevelTracker.getLatestValue()).toBe(2); // floor(120/100) + 1
      
      // Verify reactive propagation timing
      chain.verifyPropagation([
        { from: 'checkInCount', to: 'totalPoints', within: 50 },
        { from: 'totalPoints', to: 'userLevel', within: 50 }
      ]);
    });

    it('should test store interdependencies', async () => {
      const chain = createReactiveChain();
      
      // Mock store signals
      const userStore = {
        totalPoints: signal(100),
        checkInCount: signal(5)
      };
      
      const dataAggregator = {
        scoreboardData: signal({
          totalPoints: 0,
          pubsVisited: 0,
          totalCheckins: 0
        })
      };
      
      // Add to chain
      chain
        .addSignal('userPoints', userStore.totalPoints)
        .addSignal('userCheckIns', userStore.checkInCount)
        .addComputed('aggregatorData', () => ({
          totalPoints: userStore.totalPoints(),
          pubsVisited: userStore.checkInCount(), // Assuming 1 pub per check-in
          totalCheckins: userStore.checkInCount()
        }));

      // Simulate user earning points
      userStore.totalPoints.set(150);
      userStore.checkInCount.set(7);
      
      await chain.waitForStabilization();
      
      // Verify data consistency
      const aggregatorTracker = chain.getTracker('aggregatorData')!;
      const finalData = aggregatorTracker.getLatestValue();
      
      expect(finalData.totalPoints).toBe(150);
      expect(finalData.totalCheckins).toBe(7);
      expect(finalData.pubsVisited).toBe(7);
    });
  });

  describe('Signal Test Scenarios', () => {
    it('should run complex user check-in scenario', async () => {
      const userPointsSignal = signal(100);
      const checkInSignal = signal(false);
      
      // Track both signals
      harness.addTracker('userPoints', userPointsSignal);
      harness.addTracker('checkInInProgress', checkInSignal);
      
      await harness.runScenario({
        name: 'userCheckInFlow',
        description: 'User performs check-in and earns points',
        initialValue: false,
        changes: [
          { value: true, delay: 10, source: 'checkInStarted' },
          { value: false, delay: 100, source: 'checkInCompleted' }
        ],
        expectations: [
          { signal: checkInSignal, expectedValue: false },
          { signal: userPointsSignal, expectedValue: 100 }
        ]
      });

      // Additional assertions
      harness.assertSignalBehavior('checkInInProgress', {
        changeCount: 3, // initial + started + completed
        latestValue: false,
        changedWithin: 200
      });
    });

    it('should test error state recovery scenario', async () => {
      const loadingSignal = signal(false);
      const errorSignal = signal<string | null>(null);
      const dataSignal = signal<any[]>([]);
      
      harness.addTracker('loading', loadingSignal);
      harness.addTracker('error', errorSignal);
      harness.addTracker('data', dataSignal);
      
      // Simulate error scenario
      loadingSignal.set(true);
      await new Promise(resolve => setTimeout(resolve, 50));
      
      errorSignal.set('Network error');
      loadingSignal.set(false);
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Recovery
      errorSignal.set(null);
      loadingSignal.set(true);
      await new Promise(resolve => setTimeout(resolve, 50));
      
      dataSignal.set([{ id: 1, name: 'Success' }]);
      loadingSignal.set(false);
      
      // Verify recovery sequence
      const errorTracker = harness.getTracker<string | null>('error')!;
      const loadingTracker = harness.getTracker<boolean>('loading')!;
      const dataTracker = harness.getTracker<any[]>('data')!;
      
      expect(errorTracker.getLatestValue()).toBe(null);
      expect(loadingTracker.getLatestValue()).toBe(false);
      expect(dataTracker.getLatestValue()).toHaveLength(1);
      
      // Check that we went through the full error recovery cycle
      expect(errorTracker.getChangeCount()).toBeGreaterThan(2);
    });
  });

  describe('Advanced Signal Patterns', () => {
    it('should test debounced signal behavior', async () => {
      let debounceTimeout: NodeJS.Timeout;
      const searchInput = signal('');
      const debouncedSearch = signal('');
      
      // Set up debounced effect
      effect(() => {
        const query = searchInput();
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
          debouncedSearch.set(query);
        }, 100);
      });
      
      const inputTracker = trackSignal(searchInput, 'searchInput');
      const debouncedTracker = trackSignal(debouncedSearch, 'debouncedSearch');
      
      // Rapid typing simulation
      searchInput.set('a');
      searchInput.set('ab');
      searchInput.set('abc');
      searchInput.set('abcd');
      
      // Wait for debounce to complete
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Verify debounce behavior
      expect(inputTracker.getChangeCount()).toBe(5); // initial + 4 changes
      expect(debouncedTracker.getChangeCount()).toBe(2); // initial + 1 debounced change
      expect(debouncedSearch()).toBe('abcd');
      
      inputTracker.destroy();
      debouncedTracker.destroy();
    });

    it('should test signal-based caching behavior', async () => {
      const cacheKey = signal('user:123');
      const cacheData = signal<Record<string, any>>({});
      
      // Computed signal for cached value
      const cachedUser = computed(() => {
        const key = cacheKey();
        const cache = cacheData();
        return cache[key] || null;
      });
      
      const cacheTracker = trackSignal(cachedUser, 'cachedUser');
      
      // Initial state - no cached data
      expect(cachedUser()).toBe(null);
      
      // Add data to cache
      cacheData.set({
        'user:123': { id: 123, name: 'Test User' }
      });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(cachedUser()).toEqual({ id: 123, name: 'Test User' });
      
      // Change cache key
      cacheKey.set('user:456');
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(cachedUser()).toBe(null); // No data for new key
      
      // Verify cache reactivity
      expect(cacheTracker.getChangeCount()).toBe(3); // initial, cached, key change
      
      cacheTracker.destroy();
    });

    it('should test async signal loading patterns', async () => {
      const loadTrigger = signal(0);
      const loadingState = signal(false);
      const dataState = signal<any[]>([]);
      const errorState = signal<string | null>(null);
      
      // Set up async loading effect
      effect(() => {
        const trigger = loadTrigger();
        if (trigger > 0) {
          loadingState.set(true);
          errorState.set(null);
          
          // Simulate async operation
          setTimeout(() => {
            if (trigger === 999) {
              // Simulate error
              errorState.set('Load failed');
              loadingState.set(false);
            } else {
              // Simulate success
              dataState.set([{ id: trigger, name: `Item ${trigger}` }]);
              loadingState.set(false);
            }
          }, 50);
        }
      });
      
      const loadingTracker = trackSignal(loadingState, 'loading');
      const dataTracker = trackSignal(dataState, 'data');
      const errorTracker = trackSignal(errorState, 'error');
      
      // Trigger successful load
      loadTrigger.set(1);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(loadingState()).toBe(false);
      expect(dataState()).toEqual([{ id: 1, name: 'Item 1' }]);
      expect(errorState()).toBe(null);
      
      // Trigger error load
      loadTrigger.set(999);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(loadingState()).toBe(false);
      expect(errorState()).toBe('Load failed');
      
      // Verify loading cycle tracking
      expect(loadingTracker.getChangeCount()).toBe(5); // initial, true, false, true, false
      
      loadingTracker.destroy();
      dataTracker.destroy();
      errorTracker.destroy();
    });
  });

  describe('Mock Signal Behavior', () => {
    it('should create signals with predefined behavior', async () => {
      // Signal that changes automatically
      const autoChangingSignal = createMockSignal('initial', {
        changes: [
          { after: 50, value: 'changed1' },
          { after: 100, value: 'changed2' }
        ]
      });
      
      const tracker = trackSignal(autoChangingSignal, 'autoChanging');
      
      expect(autoChangingSignal()).toBe('initial');
      
      // Wait for first change
      await tracker.waitForValue('changed1', 200);
      expect(autoChangingSignal()).toBe('changed1');
      
      // Wait for second change
      await tracker.waitForValue('changed2', 200);
      expect(autoChangingSignal()).toBe('changed2');
      
      tracker.destroy();
    });

    it('should create computed mock signals', () => {
      const sourceSignal = signal(10);
      
      // Mock signal that computes from source
      const computedMock = createMockSignal(0, {
        computedFrom: sourceSignal
      });
      
      const tracker = trackSignal(computedMock, 'computed');
      
      // Change source
      sourceSignal.set(20);
      
      // Allow reactivity to propagate
      setTimeout(() => {
        expect(tracker.getChangeCount()).toBeGreaterThan(1);
      }, 50);
      
      tracker.destroy();
    });
  });

  describe('Performance Testing', () => {
    it('should measure signal reactivity performance', async () => {
      const sourceSignal = signal(0);
      const computedSignals = Array.from({ length: 10 }, (_, i) => 
        computed(() => sourceSignal() * (i + 1))
      );
      
      const trackers = computedSignals.map((sig, i) => 
        trackSignal(sig, `computed_${i}`)
      );
      
      const startTime = Date.now();
      
      // Rapid signal updates
      for (let i = 1; i <= 100; i++) {
        sourceSignal.set(i);
        // Small delay to allow reactivity
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Verify all computed signals updated
      computedSignals.forEach((sig, i) => {
        expect(sig()).toBe(100 * (i + 1));
      });
      
      // Performance assertion (should complete within reasonable time)
      expect(duration).toBeLessThan(5000); // 5 seconds for 100 updates
      
      console.log(`Signal reactivity performance: ${duration}ms for 100 updates across 10 computed signals`);
      
      trackers.forEach(tracker => tracker.destroy());
    });
  });
});