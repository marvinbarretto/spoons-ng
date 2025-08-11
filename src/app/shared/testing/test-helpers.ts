/**
 * Generic Testing Helpers
 * 
 * Shared utilities for all test types - auth-reactive, async operations,
 * common patterns, and reusable test functions.
 */

// =================================
// ASYNC & TIMING HELPERS
// =================================

/**
 * Wait for Angular effects and async operations to complete
 * 
 * @description Yields control to the event loop, allowing:
 * - Angular effect() calls to detect signal changes
 * - Promise resolution to complete
 * - Microtasks to execute
 * 
 * @example
 * ```typescript
 * mockAuth._setCurrentUser(MOCK_USER);
 * await waitForEffects(); // Let auth effects process the change
 * ```
 */
export const waitForEffects = () => new Promise<void>(resolve => setTimeout(resolve, 0));

/**
 * Wait for multiple async cycles to complete
 */
export const waitForMultipleEffects = async (cycles: number = 2) => {
  for (let i = 0; i < cycles; i++) {
    await waitForEffects();
  }
};

// =================================
// AUTH-REACTIVE TESTING
// =================================

/**
 * Simulate auth state change with proper timing
 */
export const simulateAuthChange = async (
  mockAuth: { _setCurrentUser: (user: any) => void },
  user: any,
  waitCycles: number = 1
) => {
  mockAuth._setCurrentUser(user);
  await waitForMultipleEffects(waitCycles);
};

// =================================
// COMMON TEST DATA HELPERS
// =================================

/**
 * Create a mock user for testing
 */
export const createMockUser = (overrides: Partial<any> = {}) => ({
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
  isAnonymous: false,
  ...overrides
});

/**
 * Create mock Firebase timestamp
 */
export const createMockTimestamp = (date: Date = new Date()) => ({
  seconds: Math.floor(date.getTime() / 1000),
  nanoseconds: (date.getTime() % 1000) * 1000000,
  toDate: () => date,
  toMillis: () => date.getTime()
});

// =================================
// ASSERTION HELPERS
// =================================

/**
 * Assert that a function throws with specific message
 */
export const expectToThrowWithMessage = async (
  fn: () => Promise<any> | any,
  expectedMessage: string
) => {
  try {
    await fn();
    throw new Error('Expected function to throw');
  } catch (error: any) {
    expect(error.message).toContain(expectedMessage);
  }
};

/**
 * Assert that a mock was called with specific parameters
 */
export const expectCalledWith = (mockFn: any, ...expectedArgs: any[]) => {
  expect(mockFn).toHaveBeenCalledWith(...expectedArgs);
};

// =================================
// STORE TESTING HELPERS
// =================================

/**
 * Verify initial store state
 */
export const expectInitialStoreState = (store: any, expectedEmpty: any = []) => {
  expect(store.data()).toEqual(expectedEmpty);
  expect(store.loading()).toBe(false);
  expect(store.error()).toBe(null);
};

/**
 * Verify store loading state
 */
export const expectLoadingState = (store: any, isLoading: boolean) => {
  expect(store.loading()).toBe(isLoading);
};

// =================================
// SERVICE TESTING HELPERS  
// =================================

/**
 * Setup a mock service with common methods
 */
export const createMockService = (methods: string[] = []) => {
  const mock: any = {};
  methods.forEach(method => {
    mock[method] = vi.fn();
  });
  return mock;
};

// =================================
// COMPONENT TESTING HELPERS
// =================================

/**
 * Wait for component to stabilize (change detection, etc.)
 */
export const waitForComponentStabilization = async () => {
  await waitForEffects();
  // Add any component-specific timing needs here
};

// =================================
// PERFORMANCE TESTING HELPERS
// =================================

/**
 * Measure execution time of a function
 */
export const measureExecutionTime = async (fn: () => Promise<any> | any) => {
  const start = performance.now();
  await fn();
  const end = performance.now();
  return end - start;
};

// =================================
// DEBUGGING HELPERS
// =================================

/**
 * Log store state for debugging tests
 */
export const debugStoreState = (store: any, label: string = 'Store') => {
  console.log(`[DEBUG] ${label} State:`, {
    data: store.data(),
    loading: store.loading(),
    error: store.error(),
    hasData: store.hasData?.(),
    isEmpty: store.isEmpty?.()
  });
};