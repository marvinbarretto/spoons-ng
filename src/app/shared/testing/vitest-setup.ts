import { TestBed } from '@angular/core/testing';
import { createFirebaseTestSuite } from './firebase.mocks';
import { createFoundationTestSuite } from './foundation.mocks';

/**
 * Modern Angular Test Suite Setup for Vitest
 */
export function setupAngularTest(options: {
  providers?: any[];
  imports?: any[];
  mockFirebase?: boolean;
  mockFoundation?: boolean;
} = {}) {
  const {
    providers = [],
    imports = [],
    mockFirebase = true,
    mockFoundation = true
  } = options;

  const firebaseMocks = mockFirebase ? createFirebaseTestSuite() : {};
  const foundationMocks = mockFoundation ? createFoundationTestSuite() : {};

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports,
      providers: [
        ...providers,
        // Firebase service mocks
        ...(mockFirebase ? [
          { provide: 'FirebaseAuth', useValue: firebaseMocks.auth },
          { provide: 'FirebaseFirestore', useValue: firebaseMocks.firestore },
          { provide: 'FirebaseMetricsService', useValue: firebaseMocks.metrics }
        ] : []),
        
        // Foundation service mocks
        ...(mockFoundation ? [
          { provide: 'SsrPlatformService', useValue: foundationMocks.platform },
          { provide: 'CacheService', useValue: foundationMocks.cache },
          { provide: 'ToastService', useValue: foundationMocks.toast },
          { provide: 'HttpService', useValue: foundationMocks.http },
          { provide: 'ViewportService', useValue: foundationMocks.viewport }
        ] : [])
      ]
    }).compileComponents();
  });

  return {
    firebase: firebaseMocks,
    foundation: foundationMocks,
    
    // Clean reset for all mocks
    resetAll: () => {
      if (mockFirebase) firebaseMocks.reset?.();
      if (mockFoundation) foundationMocks.reset?.();
    }
  };
}

/**
 * Service Test Setup (no Angular TestBed needed)
 */
export function setupServiceTest() {
  const firebaseMocks = createFirebaseTestSuite();
  const foundationMocks = createFoundationTestSuite();
  
  return {
    firebase: firebaseMocks,
    foundation: foundationMocks,
    
    resetAll: () => {
      firebaseMocks.reset();
      foundationMocks.reset();
    }
  };
}

/**
 * Store Test Setup with common patterns
 */
export function setupStoreTest<T>(mockData: T[] = []) {
  const { firebase, foundation, resetAll } = setupServiceTest();
  
  return {
    firebase,
    foundation,
    mockData,
    resetAll,
    
    // Store-specific utilities
    expectStoreInitialization: (store: any) => {
      expect(store.data()).toEqual([]);
      expect(store.loading()).toBe(false);
      expect(store.error()).toBe(null);
    },
    
    expectLoadingState: (store: any, isLoading: boolean) => {
      expect(store.loading()).toBe(isLoading);
    },
    
    expectDataState: (store: any, expectedData: T[]) => {
      expect(store.data()).toEqual(expectedData);
    },
    
    expectErrorState: (store: any, expectedError: string | null) => {
      expect(store.error()).toBe(expectedError);
    }
  };
}

/**
 * Component Test Setup (when component resource loading is fixed)
 */
export function setupComponentTest(options: {
  component?: any;
  providers?: any[];
  imports?: any[];
} = {}) {
  return setupAngularTest({
    providers: options.providers,
    imports: options.imports ? [options.component, ...options.imports] : [options.component]
  });
}

/**
 * Integration Test Setup
 */
export function setupIntegrationTest(options: {
  stores?: any[];
  services?: any[];
  mockFirebase?: boolean;
  mockFoundation?: boolean;
} = {}) {
  const { stores = [], services = [], mockFirebase = true, mockFoundation = true } = options;
  
  return setupAngularTest({
    providers: [...stores, ...services],
    mockFirebase,
    mockFoundation
  });
}