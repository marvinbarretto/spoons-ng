import { signal } from '@angular/core';
import { vi } from 'vitest';

/**
 * SsrPlatformService Mock
 */
export function createSsrPlatformMock() {
  const isBrowser = signal(true);
  const isServer = signal(false);

  return {
    isBrowser: isBrowser.asReadonly(),
    isServer: isServer.asReadonly(),
    onlyOnBrowser: vi.fn((fn: () => any) => (isBrowser() ? fn() : undefined)),
    onlyOnServer: vi.fn((fn: () => any) => (isServer() ? fn() : undefined)),
    getWindow: vi.fn(() => (isBrowser() ? window : undefined)),
    getDocument: vi.fn(() => (isBrowser() ? document : undefined)),

    // Test helpers
    _simulateBrowser: () => {
      isBrowser.set(true);
      isServer.set(false);
    },
    _simulateServer: () => {
      isBrowser.set(false);
      isServer.set(true);
    },
  };
}

/**
 * CacheService Mock
 */
export function createCacheServiceMock() {
  const cache = new Map<string, { data: any; expiry: number }>();

  return {
    get: vi.fn((key: string) => {
      const entry = cache.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiry) {
        cache.delete(key);
        return null;
      }
      return entry.data;
    }),

    set: vi.fn((key: string, data: any, ttlMs: number = 300000) => {
      cache.set(key, {
        data,
        expiry: Date.now() + ttlMs,
      });
    }),

    delete: vi.fn((key: string) => cache.delete(key)),
    clear: vi.fn(() => cache.clear()),
    has: vi.fn((key: string) => {
      const entry = cache.get(key);
      return entry ? Date.now() <= entry.expiry : false;
    }),

    // Test helpers
    _getCacheSize: () => cache.size,
    _getAllKeys: () => Array.from(cache.keys()),
    _simulateExpiry: (key: string) => {
      const entry = cache.get(key);
      if (entry) {
        entry.expiry = Date.now() - 1;
      }
    },
  };
}

/**
 * ToastService Mock
 */
export function createToastServiceMock() {
  const toasts = signal<Array<{ id: string; message: string; type: string }>>([]);

  return {
    show: vi.fn((message: string, type: 'success' | 'error' | 'info' = 'info') => {
      const id = `toast-${Date.now()}`;
      const currentToasts = toasts();
      toasts.set([...currentToasts, { id, message, type }]);
      return id;
    }),

    showSuccess: vi.fn((message: string) => {
      return vi.mocked(this.show)(message, 'success');
    }),

    showError: vi.fn((message: string) => {
      return vi.mocked(this.show)(message, 'error');
    }),

    showInfo: vi.fn((message: string) => {
      return vi.mocked(this.show)(message, 'info');
    }),

    dismiss: vi.fn((id: string) => {
      const currentToasts = toasts();
      toasts.set(currentToasts.filter(t => t.id !== id));
    }),

    dismissAll: vi.fn(() => toasts.set([])),

    // Signal access
    toasts: toasts.asReadonly(),

    // Test helpers
    _getToastCount: () => toasts().length,
    _getLastToast: () => {
      const allToasts = toasts();
      return allToasts[allToasts.length - 1];
    },
  };
}

/**
 * HttpService Mock
 */
export function createHttpServiceMock() {
  const requestHistory = signal<Array<{ method: string; url: string; data?: any }>>([]);

  return {
    get: vi.fn((url: string) => {
      const current = requestHistory();
      requestHistory.set([...current, { method: 'GET', url }]);
      return Promise.resolve({ data: { success: true } });
    }),

    post: vi.fn((url: string, data?: any) => {
      const current = requestHistory();
      requestHistory.set([...current, { method: 'POST', url, data }]);
      return Promise.resolve({ data: { success: true } });
    }),

    put: vi.fn((url: string, data?: any) => {
      const current = requestHistory();
      requestHistory.set([...current, { method: 'PUT', url, data }]);
      return Promise.resolve({ data: { success: true } });
    }),

    delete: vi.fn((url: string) => {
      const current = requestHistory();
      requestHistory.set([...current, { method: 'DELETE', url }]);
      return Promise.resolve({ data: { success: true } });
    }),

    // Signal access
    requestHistory: requestHistory.asReadonly(),

    // Test helpers
    _getRequestCount: () => requestHistory().length,
    _getLastRequest: () => {
      const history = requestHistory();
      return history[history.length - 1];
    },
    _clearHistory: () => requestHistory.set([]),
  };
}

/**
 * ViewportService Mock
 */
export function createViewportServiceMock() {
  const breakpoint = signal('desktop');
  const dimensions = signal({ width: 1920, height: 1080 });

  return {
    breakpoint: breakpoint.asReadonly(),
    dimensions: dimensions.asReadonly(),
    isMobile: vi.fn(() => breakpoint() === 'mobile'),
    isTablet: vi.fn(() => breakpoint() === 'tablet'),
    isDesktop: vi.fn(() => breakpoint() === 'desktop'),

    // Test helpers
    _setBreakpoint: (bp: 'mobile' | 'tablet' | 'desktop') => breakpoint.set(bp),
    _setDimensions: (width: number, height: number) => dimensions.set({ width, height }),
    _simulateMobile: () => {
      breakpoint.set('mobile');
      dimensions.set({ width: 375, height: 667 });
    },
    _simulateTablet: () => {
      breakpoint.set('tablet');
      dimensions.set({ width: 768, height: 1024 });
    },
    _simulateDesktop: () => {
      breakpoint.set('desktop');
      dimensions.set({ width: 1920, height: 1080 });
    },
  };
}

/**
 * Complete Foundation Test Suite Factory
 */
export function createFoundationTestSuite() {
  return {
    platform: createSsrPlatformMock(),
    cache: createCacheServiceMock(),
    toast: createToastServiceMock(),
    http: createHttpServiceMock(),
    viewport: createViewportServiceMock(),

    // Global reset for all foundation mocks
    reset: () => {
      vi.clearAllMocks();
    },
  };
}
