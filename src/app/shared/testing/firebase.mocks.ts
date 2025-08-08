import { signal } from '@angular/core';
import { vi } from 'vitest';

/**
 * Modern Firebase Auth Mock with Signal Support
 */
export function createFirebaseAuthMock() {
  const currentUser = signal(null);

  return {
    currentUser: currentUser.asReadonly(),
    signInAnonymously: vi.fn().mockResolvedValue({ user: { uid: 'anonymous-123' } }),
    signInWithEmailAndPassword: vi.fn().mockResolvedValue({ user: { uid: 'user-123' } }),
    signInWithPopup: vi.fn().mockResolvedValue({ user: { uid: 'google-123' } }),
    signOut: vi.fn().mockResolvedValue(void 0),
    onAuthStateChanged: vi.fn(),

    // Test helpers
    _setCurrentUser: (user: any) => currentUser.set(user),
    _simulateAuthChange: (user: any) => {
      currentUser.set(user);
      // Simulate auth state change callback
      const callback = vi.mocked(this.onAuthStateChanged).mock.calls?.[0]?.[0];
      if (callback) callback(user);
    },
  };
}

/**
 * Modern Firebase Firestore Mock
 */
export function createFirestoreMock() {
  const mockData = new Map<string, any>();

  return {
    // Core Firestore methods
    doc: vi.fn((path: string) => ({
      id: path.split('/').pop(),
      path,
      get: vi.fn().mockResolvedValue({
        exists: () => mockData.has(path),
        data: () => mockData.get(path),
        id: path.split('/').pop(),
      }),
      set: vi.fn((data: any) => {
        mockData.set(path, data);
        return Promise.resolve();
      }),
      update: vi.fn((data: any) => {
        const existing = mockData.get(path) || {};
        mockData.set(path, { ...existing, ...data });
        return Promise.resolve();
      }),
      delete: vi.fn(() => {
        mockData.delete(path);
        return Promise.resolve();
      }),
    })),

    collection: vi.fn((path: string) => ({
      path,
      add: vi.fn((data: any) => {
        const id = `doc-${Date.now()}`;
        const docPath = `${path}/${id}`;
        mockData.set(docPath, data);
        return Promise.resolve({ id, path: docPath });
      }),
      get: vi.fn().mockResolvedValue({
        docs: Array.from(mockData.entries())
          .filter(([key]) => key.startsWith(path))
          .map(([key, value]) => ({
            id: key.split('/').pop(),
            data: () => value,
            exists: true,
          })),
      }),
    })),

    // Query methods
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),

    // Test helpers
    _setMockData: (path: string, data: any) => mockData.set(path, data),
    _getMockData: (path: string) => mockData.get(path),
    _clearMockData: () => mockData.clear(),
  };
}

/**
 * Firebase Metrics Service Mock
 */
export function createFirebaseMetricsMock() {
  const metrics = signal({
    calls: 0,
    reads: 0,
    writes: 0,
  });

  return {
    trackCall: vi.fn((operation: string) => {
      const current = metrics();
      metrics.set({
        ...current,
        calls: current.calls + 1,
        ...(operation.includes('get') ? { reads: current.reads + 1 } : {}),
        ...(operation.includes('set') || operation.includes('update')
          ? { writes: current.writes + 1 }
          : {}),
      });
    }),
    resetSession: vi.fn(() => metrics.set({ calls: 0, reads: 0, writes: 0 })),
    logSessionInfo: vi.fn(),
    getCallCount: vi.fn(() => metrics().calls),
    getReadCount: vi.fn(() => metrics().reads),
    getWriteCount: vi.fn(() => metrics().writes),

    // Signal-based access
    metrics: metrics.asReadonly(),
  };
}

/**
 * Complete Firebase Test Suite Factory
 */
export function createFirebaseTestSuite() {
  return {
    auth: createFirebaseAuthMock(),
    firestore: createFirestoreMock(),
    metrics: createFirebaseMetricsMock(),

    // Connection state simulation
    connectionState: signal(true),

    // Test helpers
    simulateOffline: () => signal(false),
    simulateOnline: () => signal(true),
    reset: () => {
      // Reset all mocks and state
      vi.clearAllMocks();
    },
  };
}
