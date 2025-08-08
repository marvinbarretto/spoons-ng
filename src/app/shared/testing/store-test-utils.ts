import { computed, signal, type Signal } from '@angular/core';
import { vi } from 'vitest';

/**
 * Generic Store Mock Factory
 */
export function createMockStore<T>(initialData: T[] = []) {
  const data = signal<T[]>(initialData);
  const loading = signal(false);
  const error = signal<string | null>(null);

  return {
    // Core signals
    data: data.asReadonly(),
    loading: loading.asReadonly(),
    error: error.asReadonly(),

    // Computed signals
    hasData: computed(() => data().length > 0),
    isEmpty: computed(() => data().length === 0),
    count: computed(() => data().length),

    // Actions
    load: vi.fn(async () => {
      loading.set(true);
      error.set(null);
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 10));
      loading.set(false);
    }),

    add: vi.fn((item: T) => {
      const current = data();
      data.set([...current, item]);
    }),

    update: vi.fn((id: string, updates: Partial<T>) => {
      const current = data();
      const index = current.findIndex((item: any) => item.id === id);
      if (index >= 0) {
        const updated = [...current];
        updated[index] = { ...updated[index], ...updates };
        data.set(updated);
      }
    }),

    remove: vi.fn((id: string) => {
      const current = data();
      data.set(current.filter((item: any) => item.id !== id));
    }),

    clear: vi.fn(() => data.set([])),

    // Test helpers
    _setLoading: (isLoading: boolean) => loading.set(isLoading),
    _setError: (errorMessage: string | null) => error.set(errorMessage),
    _setData: (newData: T[]) => data.set(newData),
    _reset: () => {
      data.set(initialData);
      loading.set(false);
      error.set(null);
      vi.clearAllMocks();
    },
  };
}

/**
 * Entity Store Mock (for single entities)
 */
export function createMockEntityStore<T>(initialData: T | null = null) {
  const entity = signal<T | null>(initialData);
  const loading = signal(false);
  const error = signal<string | null>(null);

  return {
    // Core signals
    entity: entity.asReadonly(),
    loading: loading.asReadonly(),
    error: error.asReadonly(),

    // Computed signals
    hasEntity: computed(() => entity() !== null),

    // Actions
    load: vi.fn(async () => {
      loading.set(true);
      error.set(null);
      await new Promise(resolve => setTimeout(resolve, 10));
      loading.set(false);
    }),

    set: vi.fn((data: T) => entity.set(data)),
    update: vi.fn((updates: Partial<T>) => {
      const current = entity();
      if (current) {
        entity.set({ ...current, ...updates });
      }
    }),
    clear: vi.fn(() => entity.set(null)),

    // Test helpers
    _setLoading: (isLoading: boolean) => loading.set(isLoading),
    _setError: (errorMessage: string | null) => error.set(errorMessage),
    _setEntity: (data: T | null) => entity.set(data),
    _reset: () => {
      entity.set(initialData);
      loading.set(false);
      error.set(null);
      vi.clearAllMocks();
    },
  };
}

/**
 * Store Lifecycle Test Suite
 */
export function testStoreLifecycle<T>(
  createStore: () => any,
  mockData: T[],
  options: {
    storeName: string;
    hasAsyncLoad?: boolean;
    hasCrud?: boolean;
  }
) {
  const { storeName, hasAsyncLoad = true, hasCrud = true } = options;

  return {
    [`${storeName} - Initialization`]: {
      'should initialize with empty state': () => {
        const store = createStore();
        expect(store.data()).toEqual([]);
        expect(store.loading()).toBe(false);
        expect(store.error()).toBe(null);
      },

      'should have correct computed values on init': () => {
        const store = createStore();
        expect(store.hasData()).toBe(false);
        expect(store.isEmpty()).toBe(true);
        expect(store.count()).toBe(0);
      },
    },

    ...(hasAsyncLoad && {
      [`${storeName} - Loading`]: {
        'should handle loading state': async () => {
          const store = createStore();
          const loadPromise = store.load();
          expect(store.loading()).toBe(true);
          await loadPromise;
          expect(store.loading()).toBe(false);
        },

        'should clear error on new load': async () => {
          const store = createStore();
          store._setError('Previous error');
          await store.load();
          expect(store.error()).toBe(null);
        },
      },
    }),

    ...(hasCrud && {
      [`${storeName} - CRUD Operations`]: {
        'should add items correctly': () => {
          const store = createStore();
          const item = mockData[0];
          store.add(item);
          expect(store.data()).toContain(item);
          expect(store.count()).toBe(1);
        },

        'should update items correctly': () => {
          const store = createStore();
          const item = { ...mockData[0], id: '1' };
          store.add(item);
          store.update('1', { name: 'Updated' } as Partial<T>);
          expect(store.data()[0]).toMatchObject({ name: 'Updated' });
        },

        'should remove items correctly': () => {
          const store = createStore();
          const item = { ...mockData[0], id: '1' };
          store.add(item);
          store.remove('1');
          expect(store.data()).not.toContain(item);
          expect(store.count()).toBe(0);
        },
      },
    }),
  };
}

/**
 * Signal Testing Utilities
 */
export const signalTestUtils = {
  /**
   * Wait for a signal to change to a specific value
   */
  waitForSignalValue: async <T>(
    signal: Signal<T>,
    expectedValue: T,
    timeout = 1000
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkValue = () => {
        if (signal() === expectedValue) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(
            new Error(`Signal did not reach expected value ${expectedValue} within ${timeout}ms`)
          );
        } else {
          setTimeout(checkValue, 10);
        }
      };
      checkValue();
    });
  },

  /**
   * Track signal changes for testing
   */
  trackSignalChanges: <T>(signal: Signal<T>) => {
    const changes: T[] = [];
    const initial = signal();
    changes.push(initial);

    // In a real implementation, this would use effect() to track changes
    // For testing, we'll provide a mock tracking mechanism
    return {
      changes: () => changes,
      addChange: (value: T) => changes.push(value),
      getLastChange: () => changes[changes.length - 1],
      getChangeCount: () => changes.length,
    };
  },
};

/**
 * Async Testing Utilities
 */
export const asyncTestUtils = {
  /**
   * Wait for all pending promises/timers
   */
  flushPromises: () => new Promise(resolve => setTimeout(resolve, 0)),

  /**
   * Advance timers for testing
   */
  advanceTimers: (ms: number) => {
    vi.advanceTimersByTime(ms);
  },

  /**
   * Test async error handling
   */
  expectAsyncError: async (fn: () => Promise<any>, expectedError?: string) => {
    try {
      await fn();
      throw new Error('Expected function to throw');
    } catch (error) {
      if (expectedError) {
        expect(error.message).toContain(expectedError);
      }
    }
  },
};
