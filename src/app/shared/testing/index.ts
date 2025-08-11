/**
 * Modern Vitest Testing Utilities
 * 
 * Clean, modern testing utilities for Angular + Vitest
 * No legacy compatibility - fresh start with best practices
 */

// Firebase mocking utilities
export {
  createFirebaseAuthMock,
  createFirestoreMock,
  createFirebaseMetricsMock,
  createFirebaseTestSuite
} from './firebase.mocks';

// Foundation library mocking utilities
export {
  createSsrPlatformMock,
  createCacheServiceMock,
  createToastServiceMock,
  createHttpServiceMock,
  createViewportServiceMock,
  createFoundationTestSuite
} from './foundation.mocks';

// Store testing utilities
export {
  createMockStore,
  createMockEntityStore,
  testStoreLifecycle,
  signalTestUtils,
  asyncTestUtils
} from './store-test-utils';

// Test setup utilities
export {
  setupAngularTest,
  setupServiceTest,
  setupStoreTest,
  setupComponentTest,
  setupIntegrationTest
} from './vitest-setup';

// Common test data and factories
export * from './test-data';

// Generic testing helpers
export * from './test-helpers';

// Re-export vitest for convenience
export { vi, expect, describe, it, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';