// src/app/shared/testing/firebase-test-setup.ts
import { Provider } from '@angular/core';
import { signal } from '@angular/core';

/**
 * Comprehensive Firebase testing setup
 * Provides all the necessary mocks for Firebase services and dependent stores
 */
export function createFirebaseTestProviders(): Provider[] {
  // ✅ Firebase core mocks
  const mockFirestore = {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({ exists: false, data: () => null }),
        set: jest.fn().mockResolvedValue(undefined),
        update: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
      })),
      add: jest.fn().mockResolvedValue({ id: 'mock-id' }),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ docs: [], empty: true }),
    })),
    doc: jest.fn(() => ({
      get: jest.fn().mockResolvedValue({ exists: false, data: () => null }),
      set: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    })),
    batch: jest.fn(() => ({
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
    })),
  };

  const mockAuth = {
    currentUser: null,
    signInAnonymously: jest.fn().mockResolvedValue({ user: { uid: 'test-uid' } }),
    signInWithEmailAndPassword: jest.fn().mockResolvedValue({ user: { uid: 'test-uid' } }),
    signOut: jest.fn().mockResolvedValue(undefined),
    onAuthStateChanged: jest.fn((callback) => {
      // Simulate no user initially
      callback(null);
      return jest.fn(); // Unsubscribe function
    }),
  };

  // ✅ Store mocks
  const mockUserStore = {
    user: signal(null),
    loading: signal(false),
    error: signal(null),
    isLoaded: signal(false),
    loadOnce: jest.fn().mockResolvedValue(undefined),
    load: jest.fn().mockResolvedValue(undefined),
    set: jest.fn(),
    patch: jest.fn(),
    reset: jest.fn(),
  };

  const mockAuthStore = {
    user: signal(null),
    uid: signal(null),
    isAuthenticated: signal(false),
    loading: signal(false),
    error: signal(null),
    initialize: jest.fn(),
    signIn: jest.fn().mockResolvedValue(undefined),
    signOut: jest.fn().mockResolvedValue(undefined),
  };

  // ✅ Service mocks
  const mockUserService = {
    getUser: jest.fn().mockResolvedValue(null),
    updateUser: jest.fn().mockResolvedValue(undefined),
    createUser: jest.fn().mockResolvedValue(undefined),
    deleteUser: jest.fn().mockResolvedValue(undefined),
  };

  const mockUserProgressionService = {
    getUserProgression: jest.fn().mockResolvedValue({}),
    updateProgression: jest.fn().mockResolvedValue(undefined),
  };

  const mockFirestoreService = {
    getDocByPath: jest.fn().mockResolvedValue(null),
    getDocsWhere: jest.fn().mockResolvedValue([]),
    addDocToCollection: jest.fn().mockResolvedValue('mock-id'),
    updateDoc: jest.fn().mockResolvedValue(undefined),
    setDoc: jest.fn().mockResolvedValue(undefined),
    deleteDoc: jest.fn().mockResolvedValue(undefined),
  };

  // ✅ Return all providers
  return [
    // Firebase core
    { provide: 'Firestore', useValue: mockFirestore },
    { provide: 'Auth', useValue: mockAuth },

    // Try alternative injection tokens
    { provide: 'angularfire2.firestore', useValue: mockFirestore },
    { provide: 'angularfire2.auth', useValue: mockAuth },

    // Stores
    { provide: 'UserStore', useValue: mockUserStore },
    { provide: 'AuthStore', useValue: mockAuthStore },

    // Services
    { provide: 'UserService', useValue: mockUserService },
    { provide: 'UserProgressionService', useValue: mockUserProgressionService },
    { provide: 'FirestoreService', useValue: mockFirestoreService },
  ];
}

/**
 * Simple mock creator for specific stores
 */
export function createMockStore<T>(signalData: Partial<T> = {}) {
  return {
    ...signalData,
    loading: signal(false),
    error: signal(null),
    loadOnce: jest.fn().mockResolvedValue(undefined),
    load: jest.fn().mockResolvedValue(undefined),
    reset: jest.fn(),
  };
}
