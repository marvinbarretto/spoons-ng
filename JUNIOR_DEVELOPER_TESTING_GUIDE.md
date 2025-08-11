# 🧪 Junior Developer Testing Guide

> **Guide Version**: v1.0  
> **Last Updated**: 2025-08-07  
> **Target Audience**: Junior developers contributing to unit test coverage  
> **Prerequisites**: Basic Angular knowledge, familiarity with TypeScript

---

## 📋 Table of Contents

1. [Getting Started](#-getting-started)
2. [Understanding Our Testing Philosophy](#-understanding-our-testing-philosophy)
3. [Project Architecture Overview](#-project-architecture-overview)
4. [Essential Testing Patterns](#-essential-testing-patterns)
5. [Step-by-Step Workflow](#-step-by-step-workflow)
6. [Common Testing Scenarios](#-common-testing-scenarios)
7. [Mock Patterns & Examples](#-mock-patterns--examples)
8. [Quality Standards & Review](#-quality-standards--review)
9. [Troubleshooting & Support](#-troubleshooting--support)
10. [Resources & References](#-resources--references)

---

## 🚀 Getting Started

### **Quick Setup (5 Minutes)**

```bash
# 1. Ensure you have the project setup
git pull origin master
npm install

# 2. Verify testing environment works
npm run test

# 3. Start development mode
npm run test:watch
```

### **Your First Test Task**

1. **Find a beginner-friendly task**: Look for GitHub issues labeled `test:unit`, `priority:critical`, and `complexity:XS` or `S`
2. **Claim the issue**: Comment "I'll take this" on the GitHub issue
3. **Generate scaffolding**: Use `npm run test:story:scaffold TEST-XXX` (replace XXX with issue number)
4. **Follow the workflow**: Use the step-by-step process below

### **Essential Commands**

```bash
# Development
npm run test:watch      # Watch mode for active development
npm run test:coverage   # Check coverage after making changes
npm run test:ci         # Run full test suite (what CI runs)

# Quality checks
npm run test:lint       # Check test code quality
npm run format          # Format your code
```

---

## 💡 Understanding Our Testing Philosophy

### **What We Test (Business Value First)**

```typescript
// ✅ GOOD: Test business behavior
it('should award discovery bonus for first pub visit', () => {
  const points = pointsService.calculateCheckInPoints({
    pubId: 'new-pub',
    isFirstVisit: true
  });
  expect(points.total).toBe(50); // 25 base + 25 discovery
});

// ❌ AVOID: Test framework mechanics
it('should have a user signal', () => {
  expect(userStore.user()).toBeDefined();
});
```

### **What We Don't Test**

- **Angular Framework Features**: Don't test if dependency injection works
- **Simple Template Bindings**: Don't test basic signal display
- **"Should Create" Tests**: Don't test if components instantiate
- **Pure UI Components**: Don't test components that only display data

### **Our Testing Pyramid**

```
        ▲
       /|\
      / | \
     /  |  \
    / E2E \     ← 2% - Critical user journeys
   /       \
  / Integration\ ← 20% - Service coordination  
 /             \
/ Unit Tests    \ ← 70% - Business logic
/_________________\
```

---

## 🏗️ Project Architecture Overview

### **Angular 20 + Signals Architecture**

Our app uses **Angular 20 with Signals** (not RxJS) and follows these patterns:

```typescript
// ✅ Signal naming (no $$ suffix)
readonly user = signal<User | null>(null);
readonly loading = signal(false);
readonly error = signal<string | null>(null);

// ✅ Computed signals
readonly hasUser = computed(() => !!this.user());

// ✅ Template bindings
// {{ user()?.displayName }}
// @if (loading()) { <span>Loading...</span> }
```

### **Store Architecture Types**

Understanding our store patterns is crucial for testing:

#### **1. BaseStore (Collection Stores)**
```typescript
// Stores like PubStore, CheckInStore - extend BaseStore<T>
export class PubStore extends BaseStore<Pub> {
  // Auto-provides: data, loading, error, hasData, itemCount
  // Methods: loadOnce(), load(), reset(), add(), update(), remove()
}
```

#### **2. Auth-Reactive Stores**
```typescript
// Stores like UserStore, CheckInStore - user-scoped data
export class UserStore {
  constructor() {
    // Magic: Automatically loads/clears when user logs in/out
    effect(() => {
      const user = this.authStore.user();
      if (!user || user.isAnonymous) {
        this.reset(); // Auto-clear on logout
        return;
      }
      this.loadUser(user.uid); // Auto-load on login
    });
  }
}
```

#### **3. ComputedStore (Derived Data)**
```typescript
// Stores like NearbyPubStore - derive from other stores
export class NearbyPubStore {
  readonly nearbyPubs = computed(() => {
    const location = this.locationService.location();
    const pubs = this.pubStore.data();
    return pubs.filter(pub => isNearby(location, pub));
  });
}
```

### **Critical Services to Understand**

- **CheckinOrchestrator**: Coordinates check-in business logic
- **PointsService**: Calculates points and bonuses  
- **BadgeEvaluator**: Determines badge awards
- **DataAggregatorService**: Ensures data consistency across stores
- **SessionService**: Manages app-wide data initialization

---

## 🛠️ Essential Testing Patterns

### **1. Service Testing Pattern**

```typescript
// src/app/checkin/data-access/checkin-orchestrator.spec.ts
import { TestBed } from '@angular/core/testing';
import { CheckinOrchestrator } from './checkin-orchestrator.service';
import { createFirestoreMock, createUserStoreMock } from '@shared/testing/mocks';

describe('CheckinOrchestrator', () => {
  let service: CheckinOrchestrator;
  let mockUserStore: ReturnType<typeof createUserStoreMock>;
  let mockFirestore: ReturnType<typeof createFirestoreMock>;

  beforeEach(() => {
    mockUserStore = createUserStoreMock();
    mockFirestore = createFirestoreMock();
    
    TestBed.configureTestingModule({
      providers: [
        CheckinOrchestrator,
        { provide: UserStore, useValue: mockUserStore },
        { provide: Firestore, useValue: mockFirestore }
      ]
    });
    
    service = TestBed.inject(CheckinOrchestrator);
  });

  describe('when processing new check-in', () => {
    it('should award discovery bonus for first pub visit', async () => {
      // Arrange - Set up test scenario
      const newUser = createTestUser({ totalCheckins: 0 });
      const newPub = createTestPub({ id: 'new-pub' });
      mockUserStore._setCurrentUser(newUser);

      // Act - Execute the business logic
      const result = await service.processCheckIn({
        userId: newUser.uid,
        pubId: newPub.id,
        location: { lat: 0, lng: 0 }
      });

      // Assert - Verify expected behavior
      expect(result.pointsAwarded).toBe(50); // 25 base + 25 discovery
      expect(result.bonuses).toContain('discovery');
    });

    it('should prevent duplicate check-ins within 1 hour', async () => {
      // Arrange
      const user = createTestUser();
      const pub = createTestPub();
      const recentCheckIn = createTestCheckIn({
        userId: user.uid,
        pubId: pub.id,
        timestamp: new Date(Date.now() - 30 * 60 * 1000) // 30 mins ago
      });
      mockUserStore._setCurrentUser(user);
      mockFirestore._setMockData(`checkins/${recentCheckIn.id}`, recentCheckIn);

      // Act & Assert
      await expect(service.processCheckIn({
        userId: user.uid,
        pubId: pub.id,
        location: { lat: 0, lng: 0 }
      })).rejects.toThrow('Duplicate check-in detected');
    });
  });
});
```

### **2. Store Testing Pattern**

```typescript
// src/app/users/data-access/user.store.spec.ts
import { TestBed } from '@angular/core/testing';
import { UserStore } from './user.store';
import { createFirebaseAuthMock, createUserServiceMock } from '@shared/testing/mocks';

describe('UserStore', () => {
  let store: UserStore;
  let mockAuth: ReturnType<typeof createFirebaseAuthMock>;
  let mockService: ReturnType<typeof createUserServiceMock>;

  beforeEach(() => {
    mockAuth = createFirebaseAuthMock();
    mockService = createUserServiceMock();
    
    TestBed.configureTestingModule({
      providers: [
        UserStore,
        { provide: AuthStore, useValue: { user: mockAuth.currentUser } },
        { provide: UserService, useValue: mockService }
      ]
    });
    
    store = TestBed.inject(UserStore);
  });

  describe('auth-reactive behavior', () => {
    it('should load user data when user logs in', async () => {
      // Arrange
      const testUser = createTestUser({ uid: 'user123' });
      mockService.getUser.mockResolvedValue(testUser);

      // Act - simulate user login
      mockAuth._simulateAuthStateChange(testUser);

      // Assert
      await waitFor(() => {
        expect(store.user()).toEqual(testUser);
        expect(store.loading()).toBe(false);
      });
    });

    it('should clear data when user logs out', () => {
      // Arrange
      store._setCurrentUser(createTestUser());
      expect(store.user()).not.toBeNull();

      // Act - simulate logout
      mockAuth._simulateAuthStateChange(null);

      // Assert
      expect(store.user()).toBeNull();
    });
  });

  describe('computed signals', () => {
    it('should calculate hasUser correctly', () => {
      // No user initially
      expect(store.hasUser()).toBe(false);

      // With user
      store._setCurrentUser(createTestUser());
      expect(store.hasUser()).toBe(true);
    });
  });
});
```

### **3. Integration Testing Pattern**

```typescript
// src/app/shared/testing/integration/user-checkin-integration.spec.ts
describe('User + CheckIn Integration', () => {
  let userStore: UserStore;
  let checkinStore: CheckInStore;
  let dataAggregator: DataAggregatorService;

  beforeEach(() => {
    // Setup stores with shared mocks
    const mockAuth = createFirebaseAuthMock();
    // Configure TestBed with all related services
  });

  it('should maintain points consistency between stores', async () => {
    // Arrange - Create user with known points
    const user = createTestUser({ totalPoints: 100 });
    const checkIn = createTestCheckIn({ pointsAwarded: 50 });

    // Act - Simulate new check-in
    checkinStore._addCheckIn(checkIn);
    await dataAggregator.updateUserPoints(user.uid);

    // Assert - Both stores should reflect same total
    expect(userStore.user()?.totalPoints).toBe(150);
    expect(checkinStore.getUserPoints(user.uid)).toBe(150);
  });
});
```

---

## 📖 Step-by-Step Workflow

### **Step 1: Pick Your Task**

```bash
# Find available tasks
npm run test:story:list --priority=P0 --complexity=XS

# Or browse GitHub issues with labels:
# - test:unit + priority:critical + complexity:small
```

### **Step 2: Generate Test Scaffolding**

```bash
# Replace TEST-042 with your actual issue number
npm run test:story:scaffold TEST-042

# This generates:
# - Test file with basic structure
# - Import statements for mocks
# - Describe blocks based on issue requirements
```

### **Step 3: Understand the Code Being Tested**

```typescript
// Read the source file first
// src/app/checkin/data-access/checkin-orchestrator.service.ts

// Understand:
// - What dependencies does it have?
// - What business logic does it contain?
// - What are the main methods and their signatures?
// - What edge cases might exist?
```

### **Step 4: Write Tests Using BDD Pattern**

```typescript
describe('ServiceName', () => {
  // Setup block
  beforeEach(() => {
    // Initialize mocks and TestBed
  });

  describe('when [specific scenario]', () => {
    it('should [expected behavior]', () => {
      // Arrange - Set up test data and conditions
      // Act - Execute the method being tested
      // Assert - Verify the results
    });
  });

  describe('error handling', () => {
    it('should handle [specific error] gracefully', () => {
      // Test error scenarios
    });
  });
});
```

### **Step 5: Run Tests and Verify**

```bash
# Watch mode during development
npm run test:watch

# Check coverage
npm run test:coverage

# Run full suite
npm run test
```

### **Step 6: Quality Checks**

```bash
# Format code
npm run format

# Lint tests
npm run test:lint

# Validate story completion
npm run test:story:validate TEST-042
```

---

## 🎯 Common Testing Scenarios

### **Testing Business Logic Services**

```typescript
// Example: PointsService
describe('PointsService', () => {
  describe('calculateCheckInPoints', () => {
    it('should award base points for regular check-in', () => {
      const result = service.calculateCheckInPoints({
        pubId: 'pub123',
        isFirstVisit: false,
        isHappyHour: false
      });
      
      expect(result.base).toBe(25);
      expect(result.total).toBe(25);
    });

    it('should add discovery bonus for first pub visit', () => {
      const result = service.calculateCheckInPoints({
        pubId: 'new-pub',
        isFirstVisit: true,
        isHappyHour: false
      });
      
      expect(result.base).toBe(25);
      expect(result.discovery).toBe(25);
      expect(result.total).toBe(50);
    });

    it('should add time bonus during happy hour', () => {
      const result = service.calculateCheckInPoints({
        pubId: 'pub123',
        isFirstVisit: false,
        isHappyHour: true
      });
      
      expect(result.base).toBe(25);
      expect(result.timeBonus).toBe(10);
      expect(result.total).toBe(35);
    });
  });
});
```

### **Testing Store Reactive Patterns**

```typescript
// Example: Testing computed signals
describe('CheckInStore computed signals', () => {
  it('should calculate total check-ins correctly', () => {
    // Arrange
    const checkIns = [
      createTestCheckIn({ id: '1' }),
      createTestCheckIn({ id: '2' }),
      createTestCheckIn({ id: '3' })
    ];
    
    // Act
    store._setCheckIns(checkIns);
    
    // Assert
    expect(store.totalCheckIns()).toBe(3);
  });

  it('should filter today\'s check-ins correctly', () => {
    // Arrange
    const today = new Date().toISOString().split('T')[0];
    const checkIns = [
      createTestCheckIn({ id: '1', dateKey: today }),
      createTestCheckIn({ id: '2', dateKey: '2024-01-01' }),
      createTestCheckIn({ id: '3', dateKey: today })
    ];
    
    // Act
    store._setCheckIns(checkIns);
    
    // Assert
    expect(store.todayCheckIns()).toHaveLength(2);
  });
});
```

### **Testing Error Handling**

```typescript
describe('error scenarios', () => {
  it('should handle network errors gracefully', async () => {
    // Arrange
    const networkError = new Error('Network unavailable');
    mockService.getData.mockRejectedValue(networkError);
    
    // Act
    await service.loadData();
    
    // Assert
    expect(service.error()).toBe('Network unavailable');
    expect(service.loading()).toBe(false);
  });

  it('should handle Firestore permission errors', async () => {
    // Arrange
    const permissionError = new Error('permission-denied');
    mockFirestore._setMockData('users/123', permissionError);
    
    // Act & Assert
    await expect(service.getUser('123')).rejects.toThrow('permission-denied');
  });
});
```

### **Testing Auth-Reactive Stores**

```typescript
describe('auth-reactive behavior', () => {
  it('should not reload data for same user', () => {
    // Arrange
    const user = createTestUser({ uid: 'user123' });
    const loadSpy = vi.spyOn(store, 'loadData');
    
    // Act - same user logs in twice
    mockAuthStore.user.set(user);
    mockAuthStore.user.set(user);
    
    // Assert - should only load once
    expect(loadSpy).toHaveBeenCalledTimes(1);
  });

  it('should switch data when different user logs in', async () => {
    // Arrange
    const user1 = createTestUser({ uid: 'user1' });
    const user2 = createTestUser({ uid: 'user2' });
    const loadSpy = vi.spyOn(store, 'loadData');
    
    // Act - user switching
    mockAuthStore.user.set(user1);
    await waitFor(() => expect(loadSpy).toHaveBeenCalledTimes(1));
    
    mockAuthStore.user.set(user2);
    await waitFor(() => expect(loadSpy).toHaveBeenCalledTimes(2));
    
    // Assert
    expect(loadSpy).toHaveBeenCalledWith('user2');
  });
});
```

---

## 🎭 Mock Patterns & Examples

### **Using Our Centralized Mocks**

```typescript
// ✅ GOOD: Use centralized mock registry
import { createFirestoreMock, createUserStoreMock } from '@shared/testing/mocks';

const mockFirestore = createFirestoreMock({
  'users/123': { uid: '123', name: 'Test User' },
  'pubs/456': { id: '456', name: 'Test Pub' }
});

const mockUserStore = createUserStoreMock({
  initialCurrentUser: createTestUser({ uid: '123' })
});
```

### **Firebase Service Mocks**

```typescript
// Firebase Auth Mock
const mockAuth = createFirebaseAuthMock({
  initialUser: null,
  initialState: 'unauthenticated'
});

// Simulate login
mockAuth._simulateAuthStateChange(testUser);

// Simulate logout  
mockAuth._simulateAuthStateChange(null);

// Firebase Analytics Mock (Fixed Pattern)
vi.mock('@angular/fire/analytics', () => ({
  getAnalytics: vi.fn().mockReturnValue(createFirebaseAnalyticsMock()),
  logEvent: vi.fn(),
  setUserId: vi.fn()
}));
```

### **Store Mocks**

```typescript
// BaseStore Mock
const mockPubStore = createBaseStoreMock<Pub>({
  initialData: [
    createTestPub({ id: 'pub1', name: 'First Pub' }),
    createTestPub({ id: 'pub2', name: 'Second Pub' })
  ],
  initialLoading: false
});

// Test helpers
mockPubStore._addItem(createTestPub({ id: 'pub3' }));
mockPubStore._setLoading(true);
mockPubStore._setError('Something went wrong');
```

### **Service Mocks**

```typescript
// Service Mock Factory
const mockCheckInService = ServiceMockFactory.createCheckInServiceMock({
  initialCheckIns: [createTestCheckIn({ id: 'checkin1' })]
});

// Mock specific responses
mockCheckInService._mockResponse('createCheckIn', {
  success: true,
  checkIn: createTestCheckIn()
});

mockCheckInService._mockError('createCheckIn', new Error('Creation failed'));
```

---

## ✅ Quality Standards & Review

### **Test Quality Checklist**

Before submitting your test:

- [ ] **Readability**: Test names describe behavior being tested
- [ ] **Independence**: Each test can run in isolation
- [ ] **Deterministic**: Tests produce consistent results
- [ ] **Fast**: Unit tests complete in <100ms each
- [ ] **Maintainable**: Uses centralized mocks and patterns

### **Code Review Checklist**

- [ ] **Business Logic Coverage**: Critical paths and edge cases tested
- [ ] **Mock Quality**: Realistic mocks that mirror production behavior
- [ ] **Error Handling**: Error scenarios properly tested
- [ ] **Performance**: Tests execute efficiently
- [ ] **Naming**: BDD-style test names (describe/context/it)

### **Coverage Requirements**

- **Services**: >80% line coverage for business logic
- **Stores**: >60% line coverage with reactive pattern testing
- **Components**: Only test those with business calculations
- **Integration**: Critical data flows between services

---

## 🚨 Troubleshooting & Support

### **Common Issues & Solutions**

#### **Issue: Firebase Analytics mock errors**
```bash
# Solution: Use the fixed analytics mock
vi.mock('@angular/fire/analytics', () => analyticsModuleMock);
```

#### **Issue: Tests failing with auth-related errors**
```bash
# Solution: Ensure proper auth mock setup
const mockAuth = createFirebaseAuthMock();
// Provide in TestBed.configureTestingModule
```

#### **Issue: Slow test execution**
```bash
# Diagnosis
npm run test:performance:analyze

# Solutions
npm run test:optimize:mocks
npm run test:clear-cache
```

### **Getting Help**

#### **Self-Service Resources**
- Review [`TESTING_STRATEGY.md`](./TESTING_STRATEGY.md) for overall approach
- Check [`MOCK_PATTERNS_GUIDE.md`](./MOCK_PATTERNS_GUIDE.md) for mock examples
- Follow [`DEVELOPER_WORKFLOW.md`](./DEVELOPER_WORKFLOW.md) for detailed process
- Reference [`USER_STORY_TEMPLATE.md`](./USER_STORY_TEMPLATE.md) for story format

#### **Architecture References**
- [`docs/architecture.md`](./docs/architecture.md) - Angular 20 patterns and conventions
- [`docs/reactive-store-pattern.md`](./docs/reactive-store-pattern.md) - Auth-reactive store deep dive
- [`src/app/shared/data-access/STORE_IMPLEMENTATION_GUIDE.md`](./src/app/shared/data-access/STORE_IMPLEMENTATION_GUIDE.md) - Store contracts and examples

#### **Community Support**
- **Slack Channel**: `#testing-framework`
- **GitHub Issues**: Tag `@testing-team` for help
- **Pair Programming**: Available on request

---

## 📚 Resources & References

### **Essential Documentation**
- **[TESTING_STRATEGY.md](./TESTING_STRATEGY.md)**: Comprehensive testing approach
- **[MOCK_PATTERNS_GUIDE.md](./MOCK_PATTERNS_GUIDE.md)**: Mock creation and usage patterns
- **[DEVELOPER_WORKFLOW.md](./DEVELOPER_WORKFLOW.md)**: Step-by-step developer workflow
- **[USER_STORY_TEMPLATE.md](./USER_STORY_TEMPLATE.md)**: Standardized user story format

### **Architecture Guides**
- **[docs/architecture.md](./docs/architecture.md)**: Angular 20 conventions and patterns
- **[docs/reactive-store-pattern.md](./docs/reactive-store-pattern.md)**: Auth-reactive pattern deep dive
- **[STORE_IMPLEMENTATION_GUIDE.md](./src/app/shared/data-access/STORE_IMPLEMENTATION_GUIDE.md)**: Store types and contracts

### **External Resources**
- [Angular Testing Guide](https://angular.io/guide/testing)
- [Vitest Documentation](https://vitest.dev/guide/)
- [Firebase Testing Documentation](https://firebase.google.com/docs/emulator-suite)

### **Quick Command Reference**

```bash
# Development
npm run test:watch          # Watch mode for development
npm run test:coverage       # Check test coverage
npm run test:debug          # Debug with breakpoints

# Story Management  
npm run test:story:scaffold # Generate test scaffolding
npm run test:story:validate # Validate story completion

# Quality Assurance
npm run test:ci             # Full CI simulation
npm run test:lint           # Code quality checks
npm run format              # Format code
```

---

**🎯 Remember**: Every test you write makes the entire team more productive and our product more reliable. Focus on testing **business value**, use our **centralized mocks**, and follow the **established patterns**. You've got this! 🚀

---

*This guide is a living document. Please suggest improvements through GitHub issues or direct feedback to the testing team.*