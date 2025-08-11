# 🎭 Mock Patterns Guide

> **Guide Version**: v2.0  
> **Last Updated**: 2025-08-07  
> **Framework**: Angular 20 + Vitest + Firebase  
> **Purpose**: Standardized mocking patterns for elegant, maintainable tests

---

## 📋 Table of Contents

1. [Core Principles](#core-principles)
2. [Mock Infrastructure](#mock-infrastructure)
3. [Firebase Mocking Patterns](#firebase-mocking-patterns)
4. [Store Mocking Patterns](#store-mocking-patterns)
5. [Service Mocking Patterns](#service-mocking-patterns)
6. [Component Mocking Patterns](#component-mocking-patterns)
7. [Advanced Patterns](#advanced-patterns)
8. [Migration Guide](#migration-guide)

---

## 🎯 Core Principles

### **1. Centralized Mock Registry**
All mocks should be created through the centralized registry to ensure consistency and maintainability.

```typescript
// ✅ PREFERRED: Use centralized mock registry
const { mocks, verify, when } = useTestSuite('user-service-integration');

// ❌ AVOID: Manual mock creation scattered across tests
const mockUserService = {
  getUser: vi.fn().mockResolvedValue(testUser),
  updateUser: vi.fn().mockResolvedValue(updatedUser),
};
```

### **2. Realistic Mock Behavior**
Mocks should behave like their real counterparts, including error scenarios and edge cases.

```typescript
// ✅ PREFERRED: Realistic mock with proper error handling
const mockFirestore = createFirestoreMock({
  'users/123': { userData },
  'users/404': null, // Simulates document not found
  'users/error': new Error('Permission denied') // Simulates Firestore error
});

// ❌ AVOID: Overly simplified mocks
const mockFirestore = { get: vi.fn().mockResolvedValue({ data: userData }) };
```

### **3. Signal-First Mocking**
All mocks should support Angular 20 signals for reactive testing patterns.

```typescript
// ✅ PREFERRED: Signal-compatible mocks
const mockStore = createMockStore({
  data: signal([testUser]),
  loading: signal(false),
  error: signal(null)
});

// ❌ AVOID: Non-reactive mocks
const mockStore = {
  data: [testUser],
  loading: false,
  error: null
};
```

---

## 🏗️ Mock Infrastructure

### **Enhanced Mock Registry System**

The centralized mock registry provides consistent, type-safe mocks for all services and stores.

```typescript
// src/app/shared/testing/core/mock-registry.ts (Enhanced)

export class MockRegistry {
  private static instance: MockRegistry;
  private mocks = new Map<string, any>();
  private scenarios = new Map<string, TestScenario>();

  static getInstance(): MockRegistry {
    if (!MockRegistry.instance) {
      MockRegistry.instance = new MockRegistry();
    }
    return MockRegistry.instance;
  }

  // Enhanced mock creation with dependency resolution
  createMock<T>(type: MockType, config?: MockConfig): T {
    const key = this.generateMockKey(type, config);
    
    if (this.mocks.has(key)) {
      return this.mocks.get(key);
    }

    const mock = this.createMockInstance<T>(type, config);
    this.mocks.set(key, mock);
    return mock;
  }

  // Auto-dependency resolution for complex services
  createServiceMock<T>(serviceClass: new (...args: any[]) => T): T {
    const dependencies = this.analyzeDependencies(serviceClass);
    const mockDependencies = dependencies.map(dep => this.createMock(dep.type));
    
    return this.createMockWithDependencies(serviceClass, mockDependencies);
  }
}
```

### **Test Suite Builder (Fluent API)**

```typescript
// src/app/shared/testing/core/test-suite-builder.ts

export function useTestSuite(suiteType: string) {
  const registry = MockRegistry.getInstance();
  
  return {
    // Fluent mock creation
    mocks: {
      userStore: registry.createMock('UserStore'),
      authStore: registry.createMock('AuthStore'),
      checkInService: registry.createMock('CheckInService'),
      firebase: registry.createMock('Firebase')
    },

    // BDD-style test helpers
    when: {
      user: (type: string) => new UserScenarioBuilder(type, registry),
      service: (name: string) => new ServiceScenarioBuilder(name, registry),
      store: (name: string) => new StoreScenarioBuilder(name, registry)
    },

    // Verification helpers
    verify: {
      user: (userData: any) => new UserVerificationBuilder(userData),
      dataConsistency: new DataConsistencyVerifier(),
      performance: new PerformanceVerifier()
    },

    // Cleanup and reset
    cleanup: () => registry.cleanup(),
    reset: () => registry.reset()
  };
}
```

---

## 🔥 Firebase Mocking Patterns

### **Firebase Auth Mock (Enhanced)**

```typescript
// src/app/shared/testing/mocks/firebase-auth.mock.ts

export function createFirebaseAuthMock(config: AuthMockConfig = {}) {
  const currentUser = signal<User | null>(config.initialUser || null);
  const authState = signal<AuthState>(config.initialState || 'loading');
  
  return {
    // Core signals
    currentUser: currentUser.asReadonly(),
    authState: authState.asReadonly(),
    
    // Auth methods with realistic behavior
    signInAnonymously: vi.fn().mockImplementation(async () => {
      const anonymousUser = createTestUser({ isAnonymous: true });
      currentUser.set(anonymousUser);
      authState.set('authenticated');
      return { user: anonymousUser };
    }),

    signInWithEmailAndPassword: vi.fn().mockImplementation(async (email: string, password: string) => {
      if (email === 'error@test.com') {
        throw new Error('auth/user-not-found');
      }
      
      const user = createTestUser({ email, isAnonymous: false });
      currentUser.set(user);
      authState.set('authenticated');
      return { user };
    }),

    signOut: vi.fn().mockImplementation(async () => {
      currentUser.set(null);
      authState.set('unauthenticated');
    }),

    // Test helpers
    _simulateAuthStateChange: (user: User | null) => {
      currentUser.set(user);
      authState.set(user ? 'authenticated' : 'unauthenticated');
    },

    _simulateAuthError: (error: AuthError) => {
      authState.set('error');
      throw error;
    }
  };
}
```

### **Firestore Mock (Production-Ready)**

```typescript
// src/app/shared/testing/mocks/firestore.mock.ts

export function createFirestoreMock(initialData: Record<string, any> = {}) {
  const mockData = new Map<string, any>(Object.entries(initialData));
  const subscriptions = new Map<string, ((data: any) => void)[]>();

  return {
    // Document operations
    doc: vi.fn((path: string) => ({
      id: path.split('/').pop(),
      path,
      
      get: vi.fn().mockImplementation(async () => {
        const data = mockData.get(path);
        return {
          exists: () => data !== undefined,
          data: () => data,
          id: path.split('/').pop()
        };
      }),

      set: vi.fn().mockImplementation(async (data: any) => {
        mockData.set(path, { ...data, _updatedAt: new Date() });
        this._notifySubscribers(path, data);
      }),

      update: vi.fn().mockImplementation(async (updates: any) => {
        const existing = mockData.get(path) || {};
        const updated = { ...existing, ...updates, _updatedAt: new Date() };
        mockData.set(path, updated);
        this._notifySubscribers(path, updated);
      }),

      delete: vi.fn().mockImplementation(async () => {
        mockData.delete(path);
        this._notifySubscribers(path, null);
      }),

      // Real-time subscription mock
      onSnapshot: vi.fn().mockImplementation((callback: (doc: any) => void) => {
        if (!subscriptions.has(path)) {
          subscriptions.set(path, []);
        }
        subscriptions.get(path)!.push(callback);

        // Return unsubscribe function
        return () => {
          const callbacks = subscriptions.get(path) || [];
          const index = callbacks.indexOf(callback);
          if (index > -1) callbacks.splice(index, 1);
        };
      })
    })),

    // Collection operations  
    collection: vi.fn((path: string) => ({
      path,
      
      add: vi.fn().mockImplementation(async (data: any) => {
        const id = `doc-${Date.now()}-${Math.random()}`;
        const docPath = `${path}/${id}`;
        const docData = { ...data, id, _createdAt: new Date() };
        mockData.set(docPath, docData);
        return { id, path: docPath };
      }),

      get: vi.fn().mockImplementation(async () => ({
        docs: Array.from(mockData.entries())
          .filter(([key]) => key.startsWith(path + '/'))
          .map(([key, value]) => ({
            id: key.split('/').pop(),
            data: () => value,
            exists: true,
            ref: { path: key }
          }))
      }))
    })),

    // Query operations
    query: vi.fn().mockImplementation((collection: any, ...constraints: any[]) => ({
      get: vi.fn().mockImplementation(async () => {
        let results = Array.from(mockData.entries())
          .filter(([key]) => key.startsWith(collection.path + '/'))
          .map(([key, value]) => ({ key, value }));

        // Apply query constraints (simplified)
        for (const constraint of constraints) {
          if (constraint.type === 'where') {
            results = results.filter(({ value }) => 
              this._evaluateWhereConstraint(value, constraint)
            );
          } else if (constraint.type === 'orderBy') {
            results.sort((a, b) => 
              this._compareValues(a.value[constraint.field], b.value[constraint.field])
            );
          } else if (constraint.type === 'limit') {
            results = results.slice(0, constraint.limit);
          }
        }

        return {
          docs: results.map(({ key, value }) => ({
            id: key.split('/').pop(),
            data: () => value,
            exists: true
          }))
        };
      })
    })),

    // Test utilities
    _setMockData: (path: string, data: any) => mockData.set(path, data),
    _getMockData: (path: string) => mockData.get(path),
    _clearMockData: () => mockData.clear(),
    _notifySubscribers: (path: string, data: any) => {
      const callbacks = subscriptions.get(path) || [];
      callbacks.forEach(callback => callback({
        exists: () => data !== null,
        data: () => data,
        id: path.split('/').pop()
      }));
    }
  };
}
```

### **Firebase Analytics Mock (Fixed)**

```typescript
// src/app/shared/testing/mocks/firebase-analytics.mock.ts

export function createFirebaseAnalyticsMock() {
  const events = signal<AnalyticsEvent[]>([]);
  
  return {
    // Core analytics methods
    logEvent: vi.fn().mockImplementation((eventName: string, parameters?: any) => {
      const event: AnalyticsEvent = {
        name: eventName,
        parameters: parameters || {},
        timestamp: Date.now()
      };
      
      events.update(currentEvents => [...currentEvents, event]);
    }),

    setUserId: vi.fn().mockImplementation((userId: string) => {
      console.log(`[Analytics Mock] User ID set to: ${userId}`);
    }),

    setUserProperties: vi.fn().mockImplementation((properties: Record<string, any>) => {
      console.log('[Analytics Mock] User properties set:', properties);
    }),

    // Test utilities
    events: events.asReadonly(),
    _getEvents: () => events(),
    _clearEvents: () => events.set([]),
    _getEventsByName: (eventName: string) => 
      events().filter(event => event.name === eventName)
  };
}

// Module mock for vi.mock()
export const analyticsModuleMock = {
  getAnalytics: vi.fn().mockReturnValue(createFirebaseAnalyticsMock()),
  logEvent: vi.fn(),
  setUserId: vi.fn(),
  setUserProperties: vi.fn()
};
```

---

## 🏪 Store Mocking Patterns

### **BaseStore Mock (Generic)**

```typescript
// src/app/shared/testing/mocks/base-store.mock.ts

export function createBaseStoreMock<T>(
  config: BaseStoreMockConfig<T> = {}
): BaseStoreMock<T> {
  const data = signal<T[]>(config.initialData || []);
  const loading = signal<boolean>(config.initialLoading || false);
  const error = signal<string | null>(config.initialError || null);

  return {
    // Core signals (readonly)
    data: data.asReadonly(),
    loading: loading.asReadonly(), 
    error: error.asReadonly(),

    // Computed signals
    hasData: computed(() => data().length > 0),
    isEmpty: computed(() => data().length === 0),
    itemCount: computed(() => data().length),

    // Actions with realistic behavior
    loadData: vi.fn().mockImplementation(async () => {
      loading.set(true);
      error.set(null);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Simulate potential error
      if (config.shouldFailLoad) {
        const errorMsg = 'Failed to load data';
        error.set(errorMsg);
        throw new Error(errorMsg);
      }
      
      loading.set(false);
    }),

    refresh: vi.fn().mockImplementation(async () => {
      await this.loadData();
    }),

    reset: vi.fn().mockImplementation(() => {
      data.set([]);
      loading.set(false);
      error.set(null);
    }),

    // Test utilities
    _setData: (newData: T[]) => data.set(newData),
    _setLoading: (isLoading: boolean) => loading.set(isLoading),
    _setError: (errorMessage: string | null) => error.set(errorMessage),
    _addItem: (item: T) => data.update(current => [...current, item]),
    _removeItem: (predicate: (item: T) => boolean) => 
      data.update(current => current.filter(item => !predicate(item))),
    _updateItem: (predicate: (item: T) => boolean, updates: Partial<T>) =>
      data.update(current => current.map(item => 
        predicate(item) ? { ...item, ...updates } : item
      ))
  };
}
```

### **UserStore Mock (Specific)**

```typescript
// src/app/shared/testing/mocks/user-store.mock.ts

export function createUserStoreMock(config: UserStoreMockConfig = {}) {
  const baseStore = createBaseStoreMock<User>(config);
  const currentUser = signal<User | null>(config.initialCurrentUser || null);
  const totalPoints = signal<number>(config.initialTotalPoints || 0);
  const pubsVisited = signal<number>(config.initialPubsVisited || 0);

  return {
    // Inherit BaseStore functionality
    ...baseStore,

    // UserStore-specific signals
    currentUser: currentUser.asReadonly(),
    user: currentUser.asReadonly(), // Alias for compatibility
    totalPoints: totalPoints.asReadonly(),
    pubsVisited: pubsVisited.asReadonly(),

    // Computed signals
    displayName: computed(() => {
      const user = currentUser();
      return user?.displayName || user?.email?.split('@')[0] || 'User';
    }),

    hasUser: computed(() => !!currentUser()),
    badgeCount: computed(() => currentUser()?.badgeCount || 0),

    // UserStore-specific actions
    updateProfile: vi.fn().mockImplementation(async (updates: Partial<User>) => {
      const current = currentUser();
      if (current) {
        const updated = { ...current, ...updates };
        currentUser.set(updated);
        
        // Update in collection too
        baseStore._updateItem(user => user.uid === current.uid, updates);
      }
    }),

    patchUser: vi.fn().mockImplementation(async (updates: Partial<User>) => {
      await this.updateProfile(updates);
    }),

    // Test utilities
    _setCurrentUser: (user: User | null) => {
      currentUser.set(user);
      if (user && !baseStore.data().find(u => u.uid === user.uid)) {
        baseStore._addItem(user);
      }
    },
    _setTotalPoints: (points: number) => totalPoints.set(points),
    _setPubsVisited: (count: number) => pubsVisited.set(count)
  };
}
```

---

## 🔧 Service Mocking Patterns

### **Service Mock Factory**

```typescript
// src/app/shared/testing/mocks/service-mock-factory.ts

export class ServiceMockFactory {
  static createHttpServiceMock() {
    return {
      get: vi.fn().mockResolvedValue({ data: {} }),
      post: vi.fn().mockResolvedValue({ data: {} }),
      put: vi.fn().mockResolvedValue({ data: {} }),
      delete: vi.fn().mockResolvedValue({ data: {} }),
      
      // Test utilities
      _mockResponse: (method: string, response: any) => {
        this[method].mockResolvedValueOnce(response);
      },
      _mockError: (method: string, error: any) => {
        this[method].mockRejectedValueOnce(error);
      }
    };
  }

  static createCheckInServiceMock(config: CheckInServiceMockConfig = {}) {
    const allCheckIns = signal<CheckIn[]>(config.initialCheckIns || []);
    
    return {
      // Signal-based data
      allCheckIns: allCheckIns.asReadonly(),
      
      // Service methods
      createCheckIn: vi.fn().mockImplementation(async (checkInData: CreateCheckInData) => {
        const newCheckIn = createTestCheckIn({
          ...checkInData,
          id: `checkin-${Date.now()}`,
          timestamp: { toMillis: () => Date.now(), toDate: () => new Date() }
        });
        
        allCheckIns.update(current => [...current, newCheckIn]);
        return newCheckIn;
      }),

      getCheckInsForUser: vi.fn().mockImplementation(async (userId: string) => {
        return allCheckIns().filter(checkin => checkin.userId === userId);
      }),

      loadAllCheckIns: vi.fn().mockImplementation(async () => {
        // Simulate loading from Firestore
        return allCheckIns();
      }),

      // Test utilities
      _addCheckIn: (checkIn: CheckIn) => 
        allCheckIns.update(current => [...current, checkIn]),
      _clearCheckIns: () => allCheckIns.set([]),
      _setCheckIns: (checkIns: CheckIn[]) => allCheckIns.set(checkIns)
    };
  }

  static createPointsServiceMock() {
    return {
      calculateCheckInPoints: vi.fn().mockImplementation((checkInData: any) => {
        // Realistic points calculation logic
        const basePoints = 25;
        const discoveryBonus = checkInData.isFirstVisit ? 25 : 0;
        const timeBonus = checkInData.isHappyHour ? 10 : 0;
        
        return {
          base: basePoints,
          discovery: discoveryBonus,
          timeBonus: timeBonus,
          total: basePoints + discoveryBonus + timeBonus
        };
      }),

      awardCheckInPoints: vi.fn().mockResolvedValue({
        pointsAwarded: 50,
        breakdown: { base: 25, discovery: 25 },
        newTotal: 150
      }),

      getUserTotalPoints: vi.fn().mockResolvedValue(100),

      // Test utilities
      _setPointsCalculation: (calculation: any) => {
        this.calculateCheckInPoints.mockReturnValue(calculation);
      }
    };
  }
}
```

---

## 🧩 Component Mocking Patterns

### **Component Test Setup**

```typescript
// src/app/shared/testing/patterns/component-test-setup.ts

export function setupComponentTest<T>(
  component: Type<T>,
  config: ComponentTestConfig = {}
) {
  const mockRegistry = MockRegistry.getInstance();
  
  return {
    async configureTestingModule() {
      const mockProviders = config.mockServices?.map(service => ({
        provide: service.token,
        useValue: mockRegistry.createMock(service.type)
      })) || [];

      await TestBed.configureTestingModule({
        imports: [component, ...config.imports || []],
        providers: [
          ...mockProviders,
          ...config.providers || []
        ]
      }).compileComponents();
    },

    createComponent() {
      const fixture = TestBed.createComponent(component);
      const componentInstance = fixture.componentInstance;
      
      return {
        fixture,
        component: componentInstance,
        element: fixture.nativeElement,
        
        // Helper methods
        detectChanges: () => fixture.detectChanges(),
        query: (selector: string) => fixture.debugElement.query(By.css(selector)),
        queryAll: (selector: string) => fixture.debugElement.queryAll(By.css(selector)),
        
        // Event simulation
        click: (selector: string) => {
          const element = fixture.debugElement.query(By.css(selector));
          element.triggerEventHandler('click', null);
          fixture.detectChanges();
        },
        
        type: (selector: string, value: string) => {
          const element = fixture.debugElement.query(By.css(selector));
          element.nativeElement.value = value;
          element.nativeElement.dispatchEvent(new Event('input'));
          fixture.detectChanges();
        }
      };
    }
  };
}
```

---

## 🚀 Advanced Patterns

### **Scenario-Based Testing**

```typescript
// src/app/shared/testing/scenarios/user-scenarios.ts

export class UserScenarioBuilder {
  private config: UserScenarioConfig = {};

  constructor(private scenarioType: string, private registry: MockRegistry) {}

  withCheckIns(count: number): this {
    this.config.checkInCount = count;
    return this;
  }

  withBadges(badges: string[]): this {
    this.config.badges = badges;
    return this;
  }

  atUniquePubs(): this {
    this.config.uniquePubs = true;
    return this;
  }

  async build(): Promise<TestScenario> {
    const user = this.createUserForScenario();
    const checkIns = this.createCheckInsForScenario(user);
    const mocks = this.createMocksForScenario(user, checkIns);
    
    return {
      user,
      checkIns,
      mocks,
      cleanup: () => this.cleanup()
    };
  }

  private createUserForScenario(): User {
    const baseUser = createTestUser();
    
    switch (this.scenarioType) {
      case 'power-user':
        return { ...baseUser, badgeCount: 15, totalPoints: 2500 };
      case 'new-user':
        return { ...baseUser, badgeCount: 0, totalPoints: 0 };
      case 'casual-user':
        return { ...baseUser, badgeCount: 3, totalPoints: 250 };
      default:
        return baseUser;
    }
  }
}
```

### **Performance Testing Patterns**

```typescript
// src/app/shared/testing/patterns/performance-testing.ts

export function createPerformanceTest(testName: string, config: PerformanceConfig = {}) {
  return {
    async measureExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
      const startTime = performance.now();
      const result = await fn();
      const duration = performance.now() - startTime;
      
      if (config.maxDuration && duration > config.maxDuration) {
        throw new Error(`${testName} exceeded maximum duration: ${duration}ms > ${config.maxDuration}ms`);
      }
      
      return { result, duration };
    },

    async measureMemoryUsage<T>(fn: () => Promise<T>): Promise<{ result: T; memoryDelta: number }> {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const result = await fn();
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryDelta = finalMemory - initialMemory;
      
      return { result, memoryDelta };
    },

    createLargeDataset(size: number): any[] {
      return Array.from({ length: size }, (_, index) => ({
        id: `item-${index}`,
        data: `test-data-${index}`,
        timestamp: new Date(Date.now() - (index * 1000))
      }));
    }
  };
}
```

---

## 📈 Migration Guide

### **Phase 1: Fix Existing Tests**

```typescript
// Before: Manual Firebase Analytics mocking
vi.mock('@angular/fire/analytics', () => ({
  getAnalytics: vi.fn().mockReturnValue({}),
  logEvent: vi.fn(),
}));

// After: Use enhanced Firebase Analytics mock
vi.mock('@angular/fire/analytics', () => analyticsModuleMock);

describe('AnalyticsService', () => {
  const { mocks } = useTestSuite('analytics-integration');
  
  it('should track events correctly', () => {
    mocks.firebase.analytics.logEvent('test_event', { key: 'value' });
    expect(mocks.firebase.analytics._getEventsByName('test_event')).toHaveLength(1);
  });
});
```

### **Phase 2: Upgrade to Centralized Patterns**

```typescript
// Before: Scattered manual mocks
beforeEach(() => {
  mockUserStore = {
    data: signal([]),
    loading: signal(false),
    currentUser: signal(null)
  };
});

// After: Centralized mock registry
describe('UserService Integration', () => {
  const { mocks, when, verify } = useTestSuite('user-service-integration');
  
  it('should handle user data correctly', async () => {
    when.user('power-user').hasCheckIns(25).withBadges(['explorer']);
    verify.user(mocks.userStore.currentUser()).hasCorrectPoints();
  });
});
```

### **Phase 3: Adopt Scenario-Based Testing**

```typescript
// Before: Complex manual test setup
it('should handle power user scenario', async () => {
  const user = createTestUser({ badgeCount: 15 });
  const checkIns = Array.from({ length: 100 }, () => createTestCheckIn());
  mockUserStore._setCurrentUser(user);
  mockCheckInStore._setCheckIns(checkIns);
  // ... 20 more lines of setup
});

// After: Scenario-based approach
it('should handle power user scenario', async () => {
  const scenario = await createUserScenario('power-user')
    .withCheckIns(100)
    .withBadges(['explorer', 'veteran', 'legend'])
    .build();
    
  verify.scenario(scenario).meetsPerformanceRequirements();
});
```

---

## ✅ Best Practices Summary

### **Do's**
- ✅ Use centralized mock registry for all mocks
- ✅ Create realistic mocks that mirror production behavior
- ✅ Use signals for reactive mock testing  
- ✅ Implement proper cleanup and reset mechanisms
- ✅ Use scenario builders for complex test setups
- ✅ Mock external dependencies, not internal implementation

### **Don'ts**
- ❌ Create manual mocks scattered across test files
- ❌ Use overly simplified mocks that don't reflect reality
- ❌ Mock internal implementation details
- ❌ Create non-deterministic test behavior
- ❌ Ignore cleanup leading to test pollution
- ❌ Write brittle mocks that break with minor changes

### **Performance Guidelines**
- Mock creation should be <10ms per mock
- Complex scenario setup should be <100ms
- Use lazy loading for large mock datasets
- Implement efficient cleanup to prevent memory leaks

---

**🎯 Result**: Following these patterns transforms testing from a maintenance burden into a developer productivity multiplier, with consistent, reliable, and maintainable mock infrastructure that scales with your Angular 20 application.