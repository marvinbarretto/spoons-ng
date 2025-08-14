/**
 * Browser API Mocks for Node.js Test Environment
 * 
 * Provides centralized mocking for browser-specific APIs that are not available
 * in the Node.js testing environment (Vitest). Follows the centralized mock
 * pattern established in the testing strategy.
 * 
 * @see TESTING_STRATEGY.md - Centralized mock patterns (line 204)
 */

export interface BrowserMockConfig {
  /** Mock blob URLs with this prefix */
  blobUrlPrefix?: string;
  /** Track created blob URLs for cleanup verification */
  trackUrls?: boolean;
}

export interface BrowserMocks {
  /** Mock implementation of URL.createObjectURL */
  createObjectURL: ReturnType<typeof vi.fn>;
  /** Mock implementation of URL.revokeObjectURL */
  revokeObjectURL: ReturnType<typeof vi.fn>;
  /** Get all blob URLs that were created (if tracking enabled) */
  getCreatedUrls: () => string[];
  /** Clean up all mocks and tracking */
  cleanup: () => void;
}

/**
 * Creates comprehensive browser API mocks for testing
 * 
 * @param config Configuration for mock behavior
 * @returns Object with mock functions and utilities
 */
export function createBrowserMocks(config: BrowserMockConfig = {}): BrowserMocks {
  const {
    blobUrlPrefix = 'blob:test-url-',
    trackUrls = true
  } = config;

  // Track created URLs for cleanup and verification
  const createdUrls: string[] = [];
  let urlCounter = 0;

  // Mock URL.createObjectURL
  const createObjectURL = vi.fn().mockImplementation((blob: Blob) => {
    const url = `${blobUrlPrefix}${++urlCounter}`;
    if (trackUrls) {
      createdUrls.push(url);
    }
    return url;
  });

  // Mock URL.revokeObjectURL
  const revokeObjectURL = vi.fn().mockImplementation((url: string) => {
    if (trackUrls) {
      const index = createdUrls.indexOf(url);
      if (index > -1) {
        createdUrls.splice(index, 1);
      }
    }
  });

  // Install mocks on global object
  global.URL.createObjectURL = createObjectURL;
  global.URL.revokeObjectURL = revokeObjectURL;

  return {
    createObjectURL,
    revokeObjectURL,
    getCreatedUrls: () => [...createdUrls],
    cleanup: () => {
      createObjectURL.mockClear();
      revokeObjectURL.mockClear();
      createdUrls.length = 0;
    }
  };
}

/**
 * Creates a realistic Blob mock for testing
 * Useful for testing components that work with image/file data
 */
export function createMockBlob(data: string = 'mock-blob-data', type: string = 'image/jpeg'): Blob {
  return new Blob([data], { type });
}

/**
 * Creates multiple mock blobs with different characteristics
 * Useful for testing image galleries, file uploads, etc.
 */
export function createMockBlobSet(count: number = 3): Blob[] {
  return Array.from({ length: count }, (_, index) => 
    createMockBlob(`mock-image-data-${index + 1}`, 'image/jpeg')
  );
}

/**
 * Validates that blob URLs were created and cleaned up properly
 * Useful for testing memory leak prevention
 */
export function assertBlobUrlCleanup(mocks: BrowserMocks): void {
  const remainingUrls = mocks.getCreatedUrls();
  if (remainingUrls.length > 0) {
    throw new Error(
      `Memory leak detected: ${remainingUrls.length} blob URLs were not cleaned up: ${remainingUrls.join(', ')}`
    );
  }
}

/**
 * Setup function for tests that need browser API mocks
 * Call this in beforeEach() to automatically setup and cleanup mocks
 */
export function setupBrowserMocks(config?: BrowserMockConfig): BrowserMocks {
  const mocks = createBrowserMocks(config);
  
  // Auto-cleanup after each test
  afterEach(() => {
    mocks.cleanup();
  });

  return mocks;
}