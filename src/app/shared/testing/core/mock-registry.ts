/**
 * @fileoverview Mock Registry System - Centralized typed mock management
 * 
 * Provides consistent, reusable mocks across the entire test suite with
 * dependency resolution and type safety. Builds upon existing excellent
 * mock patterns while adding centralization and consistency.
 */

import { type Signal, signal, computed } from '@angular/core';
import { vi } from 'vitest';
import { createFirebaseAuthMock, createFirestoreMock } from '../firebase.mocks';
import { createMockStore } from '../store-test-utils';
import { createTestUser, createTestPub, createTestBadge } from '../test-data';

// ===================================
// MOCK REGISTRY TYPES
// ===================================

export interface MockConfig {
  name: string;
  factory: () => any;
  dependencies?: string[];
}

export interface TestSuite {
  mocks: Record<string, any>;
  cleanup: () => void;
  reset: () => void;
}

export type MockType = 
  | 'firebase-auth'
  | 'firebase-firestore' 
  | 'user-store'
  | 'checkin-store'
  | 'points-store'
  | 'session-service'
  | 'data-aggregator'
  | 'foundation-service';

// ===================================
// MOCK REGISTRY CLASS
// ===================================

class MockRegistryImpl {
  private mocks = new Map<string, MockConfig>();
  private instances = new Map<string, any>();
  
  constructor() {
    this.registerCoreMocks();
  }

  /**
   * Register a mock factory with the registry
   */
  register<T>(name: string, factory: () => T, dependencies: string[] = []): void {
    this.mocks.set(name, { name, factory, dependencies });
  }

  /**
   * Get a mock instance (creates if doesn't exist)
   */
  get<T>(name: string): T {
    if (!this.instances.has(name)) {
      const config = this.mocks.get(name);
      if (!config) {
        throw new Error(`Mock '${name}' not registered. Available mocks: ${Array.from(this.mocks.keys()).join(', ')}`);
      }
      
      // Resolve dependencies first
      for (const dep of config.dependencies) {
        this.get(dep);
      }
      
      const instance = config.factory();
      this.instances.set(name, instance);
    }
    
    return this.instances.get(name);
  }

  /**
   * Create a test suite with specified mocks
   */
  createSuite(mockNames: string[]): TestSuite {
    const mocks: Record<string, any> = {};
    
    // Collect all required mocks (including dependencies)
    const requiredMocks = new Set<string>();
    const addMockWithDeps = (name: string) => {
      if (requiredMocks.has(name)) return;
      
      const config = this.mocks.get(name);
      if (!config) {
        throw new Error(`Mock '${name}' not registered`);
      }
      
      // Add dependencies first
      for (const dep of config.dependencies) {
        addMockWithDeps(dep);
      }
      
      requiredMocks.add(name);
    };
    
    for (const name of mockNames) {
      addMockWithDeps(name);
    }
    
    // Create all required mocks
    for (const name of requiredMocks) {
      mocks[name] = this.get(name);
    }
    
    return {
      mocks,
      cleanup: () => {
        // Clear instances for next test
        for (const name of requiredMocks) {
          this.instances.delete(name);
        }
      },
      reset: () => {
        // Reset mock states to defaults
        for (const name of requiredMocks) {
          const mock = mocks[name];
          if (mock && typeof mock.reset === 'function') {
            mock.reset();
          }
        }
      }
    };
  }

  /**
   * Create common test suite combinations
   */
  createFirebaseSuite(): TestSuite {
    return this.createSuite(['firebase-auth', 'firebase-firestore']);
  }

  createStoreSuite(): TestSuite {
    return this.createSuite(['user-store', 'checkin-store', 'points-store']);
  }

  createServiceSuite(): TestSuite {
    return this.createSuite(['session-service', 'data-aggregator']);
  }

  createFullSuite(): TestSuite {
    return this.createSuite([
      'firebase-auth', 'firebase-firestore',
      'user-store', 'checkin-store', 'points-store',
      'session-service', 'data-aggregator'
    ]);
  }

  /**
   * Reset all mock instances
   */
  resetAll(): void {
    this.instances.clear();
  }

  /**
   * Register core mocks that are commonly used
   */
  private registerCoreMocks(): void {
    // Firebase mocks
    this.register('firebase-auth', () => createFirebaseAuthMock());
    this.register('firebase-firestore', () => createFirestoreMock());
    
    // Store mocks (using existing excellent patterns)
    this.register('user-store', () => {
      const baseStore = createMockStore([
        createTestUser(),
        createTestUser({ uid: 'user-2', displayName: 'Test User 2' })
      ]);
      return {
        ...baseStore,
        // Entity store methods
        entity: computed(() => baseStore.data()[0] || null),
        hasEntity: computed(() => baseStore.data().length > 0),
        // Additional user-specific methods
        totalPoints: computed(() => baseStore.data()[0]?.totalPoints || 0),
        badgeCount: computed(() => baseStore.data()[0]?.badgeCount || 0)
      };
    });
    
    this.register('checkin-store', () => createMockStore([
      { id: 'checkin-1', userId: 'test-user-123', pubId: 'pub-123', timestamp: new Date() }
    ]));

    this.register('badge-store', () => createMockStore([
      createTestBadge(),
      createTestBadge({ id: 'badge-2', name: 'Test Badge 2' })
    ]));
    
    this.register('points-store', () => ({
      totalPoints: signal(100),
      todaysPoints: signal(25),
      loading: signal(false),
      error: signal(null),
      awardPoints: vi.fn(),
      calculateCheckInPoints: vi.fn().mockReturnValue(50),
      reset: vi.fn()
    }));
    
    // Service mocks - using correct naming pattern
    this.register('sessionservice-store', () => ({
      initializeSessionData: vi.fn().mockResolvedValue(void 0),
      loading: signal(false),
      error: signal(null),
      reset: vi.fn()
    }), ['firebase-auth']);

    this.register('session-service', () => ({
      initializeSessionData: vi.fn().mockResolvedValue(void 0),
      loading: signal(false),
      error: signal(null),
      reset: vi.fn()
    }), ['firebase-auth']);
    
    this.register('dataaggregator-store', () => ({
      scoreboardData: signal({
        totalPoints: 100,
        pubsVisited: 4,
        badgeCount: 5,
        landlordCount: 2,
        totalCheckins: 3,
        isLoading: false
      }),
      pubsVisited: vi.fn().mockReturnValue(4),
      getUserSummary: vi.fn(),
      recalculate: vi.fn(),
      reset: vi.fn()
    }), ['user-store', 'checkin-store']);

    this.register('data-aggregator', () => ({
      scoreboardData: signal({
        totalPoints: 100,
        pubsVisited: 4,
        badgeCount: 5,
        landlordCount: 2,
        totalCheckins: 3,
        isLoading: false
      }),
      pubsVisited: vi.fn().mockReturnValue(4),
      getUserSummary: vi.fn(),
      recalculate: vi.fn(),
      reset: vi.fn()
    }), ['user-store', 'checkin-store']);

    // Foundation library mocks
    this.register('foundation-service', () => ({
      ToastService: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn()
      },
      SsrPlatformService: {
        onlyOnBrowser: vi.fn().mockReturnValue(true),
        getWindow: vi.fn().mockReturnValue(window)
      }
    }));
  }
}

// ===================================
// SINGLETON REGISTRY INSTANCE
// ===================================

export const MockRegistry = new MockRegistryImpl();

// ===================================
// CONVENIENCE FUNCTIONS
// ===================================

/**
 * Quick access to common mock patterns
 */
export const TestMocks = {
  // Firebase
  firebaseAuth: () => MockRegistry.get('firebase-auth'),
  firestore: () => MockRegistry.get('firebase-firestore'),
  
  // Stores  
  userStore: () => MockRegistry.get('user-store'),
  checkinStore: () => MockRegistry.get('checkin-store'),
  pointsStore: () => MockRegistry.get('points-store'),
  
  // Services
  sessionService: () => MockRegistry.get('session-service'),
  dataAggregator: () => MockRegistry.get('data-aggregator'),
  
  // Common suites
  firebase: () => MockRegistry.createFirebaseSuite(),
  stores: () => MockRegistry.createStoreSuite(),
  services: () => MockRegistry.createServiceSuite(),
  full: () => MockRegistry.createFullSuite()
};

// ===================================
// TEST UTILITY FUNCTIONS
// ===================================

/**
 * Setup function for tests that need multiple mocks
 */
export function setupTestSuite(mockTypes: MockType[]) {
  const suite = MockRegistry.createSuite(mockTypes);
  
  // Cleanup after each test
  afterEach(() => {
    suite.cleanup();
  });
  
  return suite.mocks;
}

/**
 * Reset all mocks to default state
 */
export function resetAllMocks(): void {
  MockRegistry.resetAll();
}

/**
 * Create a custom mock suite with specific configuration
 */
export function createCustomSuite(config: Record<string, any>): TestSuite {
  return {
    mocks: config,
    cleanup: () => {
      // Custom cleanup logic
      Object.values(config).forEach(mock => {
        if (mock && typeof mock.mockClear === 'function') {
          mock.mockClear();
        }
      });
    },
    reset: () => {
      // Custom reset logic
      Object.values(config).forEach(mock => {
        if (mock && typeof mock.reset === 'function') {
          mock.reset();
        }
      });
    }
  };
}