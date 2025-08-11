/**
 * Modern Vitest Testing Utilities
 *
 * Clean, modern testing utilities for Angular + Vitest
 * No legacy compatibility - fresh start with best practices
 */

// Firebase mocking utilities
export {
  createFirebaseAuthMock,
  createFirebaseMetricsMock,
  createFirebaseTestSuite,
  createFirestoreMock,
} from './firebase.mocks';

// Foundation library mocking utilities
export {
  createCacheServiceMock,
  createFoundationTestSuite,
  createHttpServiceMock,
  createSsrPlatformMock,
  createToastServiceMock,
  createViewportServiceMock,
} from './foundation.mocks';

// Store testing utilities
export {
  asyncTestUtils,
  createMockEntityStore,
  createMockStore,
  signalTestUtils,
  testStoreLifecycle,
} from './store-test-utils';

// Test setup utilities
export {
  setupAngularTest,
  setupComponentTest,
  setupIntegrationTest,
  setupServiceTest,
  setupStoreTest,
} from './vitest-setup';

// Common test data and factories
export * from './test-data';

// Generic testing helpers
export * from './test-helpers';

// Re-export vitest for convenience
export { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
