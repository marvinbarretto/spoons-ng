/**
 * Mock Registry Unit Tests
 *
 * Tests for the centralized mock factory system, ensuring:
 * - Mock creation and caching
 * - Performance optimization
 * - Auto-dependency resolution
 * - Scenario builder integration
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { autoMockGenerator } from './auto-mocks';
import { MockConfig, mockRegistry, UserScenarioBuilder, useTestSuite } from './mock-registry';

describe('MockRegistry - Centralized Mock Factory System', () => {
  beforeEach(() => {
    // Reset registry state for each test
    mockRegistry.reset();
    autoMockGenerator.reset();
  });

  describe('🏗️ Core Mock Creation', () => {
    it('should create UserStore mock with proper signals', () => {
      const userStore = mockRegistry.createMock('UserStore');

      // Verify signal-based architecture
      expect(userStore.data).toBeDefined();
      expect(userStore.loading).toBeDefined();
      expect(userStore.error).toBeDefined();
      expect(userStore.currentUser).toBeDefined();
      expect(userStore.totalPoints).toBeDefined();

      // Verify signals are readonly
      expect(typeof userStore.data).toBe('function'); // Signal function
      expect(typeof userStore.loading).toBe('function');

      // Verify computed signals exist
      expect(userStore.displayName).toBeDefined();
      expect(userStore.hasUser).toBeDefined();

      // Verify test utilities
      expect(userStore._setCurrentUser).toBeDefined();
      expect(userStore._setTotalPoints).toBeDefined();
      expect(userStore._reset).toBeDefined();
    });

    it('should create AuthStore mock with auth-reactive behavior', () => {
      const authStore = mockRegistry.createMock('AuthStore');

      // Verify auth signals
      expect(authStore.user).toBeDefined();
      expect(authStore.uid).toBeDefined();
      expect(authStore.isAuthenticated).toBeDefined();
      expect(authStore.authState).toBeDefined();

      // Verify auth actions
      expect(authStore.signIn).toBeDefined();
      expect(authStore.signOut).toBeDefined();

      // Verify test utilities
      expect(authStore._setUser).toBeDefined();
      expect(authStore._reset).toBeDefined();
    });

    it('should create CheckInStore mock with collection patterns', () => {
      const checkInStore = mockRegistry.createMock('CheckInStore');

      // Verify collection store pattern
      expect(checkInStore.allCheckIns).toBeDefined();
      expect(checkInStore.loading).toBeDefined();
      expect(checkInStore.error).toBeDefined();

      // Verify store actions
      expect(checkInStore.loadAllCheckIns).toBeDefined();
      expect(checkInStore.createCheckIn).toBeDefined();

      // Verify test utilities for data manipulation
      expect(checkInStore._setCheckIns).toBeDefined();
      expect(checkInStore._addCheckIn).toBeDefined();
      expect(checkInStore._clearCheckIns).toBeDefined();
    });

    it('should create service mocks with realistic behavior', () => {
      const pointsService = mockRegistry.createMock('PointsService');

      // Verify service methods exist
      expect(pointsService.calculateCheckInPoints).toBeDefined();
      expect(pointsService.awardCheckInPoints).toBeDefined();
      expect(pointsService.getUserTotalPoints).toBeDefined();

      // Verify mock functions are vi.fn()
      expect(vi.isMockFunction(pointsService.calculateCheckInPoints)).toBe(true);
      expect(vi.isMockFunction(pointsService.awardCheckInPoints)).toBe(true);
    });

    it('should create Firebase Analytics mock with proper exports', () => {
      const analytics = mockRegistry.createMock('FirebaseAnalytics');

      // Verify the Analytics interface exists (this was the Issue #7 problem)
      expect(analytics.Analytics).toBeDefined();
      expect(analytics.logEvent).toBeDefined();
      expect(analytics.getAnalytics).toBeDefined();
      expect(analytics.isSupported).toBeDefined();

      // Verify test utilities
      expect(analytics._getMockAnalytics).toBeDefined();
      expect(analytics._getEvents).toBeDefined();
      expect(analytics._clearEvents).toBeDefined();
    });
  });

  describe('⚡ Performance Optimization & Caching', () => {
    it('should cache mocks to avoid recreation', () => {
      const config: MockConfig = { realistic: true };

      const userStore1 = mockRegistry.createMock('UserStore', config);
      const userStore2 = mockRegistry.createMock('UserStore', config);

      // Should return the same cached instance
      expect(userStore1).toBe(userStore2);
    });

    it('should create different mocks for different configs', () => {
      const realisticConfig: MockConfig = { realistic: true };
      const performanceConfig: MockConfig = { realistic: false, performance: true };

      const userStore1 = mockRegistry.createMock('UserStore', realisticConfig);
      const userStore2 = mockRegistry.createMock('UserStore', performanceConfig);

      // Should create different instances for different configs
      expect(userStore1).not.toBe(userStore2);
    });

    it('should track performance metrics', () => {
      // Create several mocks
      mockRegistry.createMock('UserStore');
      mockRegistry.createMock('AuthStore');
      mockRegistry.createMock('CheckInStore');

      const metrics = mockRegistry.getPerformanceMetrics();

      expect(metrics.totalMocks).toBe(3);
      expect(metrics.avgCreationTime).toBeGreaterThan(0);
      expect(metrics.avgCreationTime).toBeLessThan(100); // Should be fast
    });
  });

  describe('🔄 Auto-Dependency Resolution', () => {
    it('should resolve service dependencies automatically', () => {
      // This tests the integration with auto-mocks.ts
      const checkinOrchestrator = mockRegistry.createServiceMock('CheckinOrchestrator');

      expect(checkinOrchestrator).toBeDefined();
      // The auto-mock system should have resolved PointsService, BadgeEvaluator, etc.
    });

    it('should handle circular dependencies gracefully', () => {
      // Test that circular deps don't cause infinite loops
      expect(() => {
        mockRegistry.createServiceMock('DataAggregatorService');
      }).not.toThrow();
    });
  });

  describe('🧪 useTestSuite() Integration', () => {
    it('should provide pre-configured mocks via useTestSuite()', () => {
      const { mocks } = useTestSuite('user-service-integration');

      // Verify all common mocks are available
      expect(mocks.userStore).toBeDefined();
      expect(mocks.authStore).toBeDefined();
      expect(mocks.checkInStore).toBeDefined();
      expect(mocks.userService).toBeDefined();
      expect(mocks.checkInService).toBeDefined();
      expect(mocks.pointsService).toBeDefined();
      expect(mocks.checkinOrchestrator).toBeDefined();
      expect(mocks.badgeEvaluator).toBeDefined();
      expect(mocks.dataAggregator).toBeDefined();
      expect(mocks.firebase).toBeDefined();
    });

    it('should provide scenario builders', () => {
      const { when } = useTestSuite('user-service-integration');

      expect(when.user).toBeDefined();
      expect(when.service).toBeDefined();
      expect(when.store).toBeDefined();

      // Verify builders return proper types
      const userBuilder = when.user('power-user');
      expect(userBuilder).toBeInstanceOf(UserScenarioBuilder);
      expect(userBuilder.withCheckIns).toBeDefined();
      expect(userBuilder.withBadges).toBeDefined();
      expect(userBuilder.atUniquePubs).toBeDefined();
    });

    it('should provide verification helpers', () => {
      const { verify } = useTestSuite('user-service-integration');

      expect(verify.user).toBeDefined();
      expect(verify.dataConsistency).toBeDefined();
      expect(verify.performance).toBeDefined();
    });

    it('should provide utility functions', () => {
      const testSuite = useTestSuite('user-service-integration');

      expect(testSuite.cleanup).toBeDefined();
      expect(testSuite.reset).toBeDefined();
      expect(testSuite.getPerformanceMetrics).toBeDefined();
      expect(testSuite.registry).toBeDefined();
    });
  });

  describe('🎯 Realistic Mock Behavior', () => {
    it('should provide realistic timing for async operations', async () => {
      const config: MockConfig = { realistic: true };
      const userStore = mockRegistry.createMock('UserStore', config);

      const startTime = Date.now();
      await userStore.loadData();
      const endTime = Date.now();

      // Realistic mode should add some delay
      expect(endTime - startTime).toBeGreaterThan(50);
      expect(endTime - startTime).toBeLessThan(200);
    });

    it('should provide fast mocks for performance mode', async () => {
      const config: MockConfig = { realistic: false, performance: true };
      const userStore = mockRegistry.createMock('UserStore', config);

      const startTime = Date.now();
      await userStore.loadData();
      const endTime = Date.now();

      // Performance mode should be very fast
      expect(endTime - startTime).toBeLessThan(50);
    });
  });

  describe('🔧 Test Utilities & Setup', () => {
    it('should provide comprehensive reset functionality', () => {
      // Create some mocks
      const userStore = mockRegistry.createMock('UserStore');
      userStore._setCurrentUser({ uid: 'test-user' });

      const authStore = mockRegistry.createMock('AuthStore');
      authStore._setUser({ uid: 'test-user' });

      // Reset should clear all state
      mockRegistry.reset();

      // After reset, new mocks should be created
      const newUserStore = mockRegistry.createMock('UserStore');
      expect(newUserStore).not.toBe(userStore);
    });

    it('should handle error scenarios when configured', async () => {
      const config: MockConfig = { errorScenarios: true };
      const authStore = mockRegistry.createMock('AuthStore', config);

      // Error scenarios should throw errors as expected
      await expect(
        authStore.signInWithEmailAndPassword('error@test.com', 'password')
      ).rejects.toThrow('auth/user-not-found');
    });
  });
});

describe('🚀 Mock Registry Integration Tests', () => {
  it('should work seamlessly with useTestSuite() in a real test scenario', async () => {
    const { mocks, when, verify, cleanup } = useTestSuite('checkin-workflow');

    try {
      // Create a realistic user scenario
      const scenario = await when
        .user('power-user')
        .withCheckIns(5)
        .withBadges(['explorer', 'social'])
        .atUniquePubs()
        .build();

      // Verify the scenario was built correctly
      expect(scenario.user).toBeDefined();
      expect(scenario.checkIns).toHaveLength(5);
      expect(scenario.user.badgeCount).toBe(2);

      // Use the mocks in a typical test scenario
      mocks.userStore._setCurrentUser(scenario.user);
      mocks.checkInStore._setCheckIns(scenario.checkIns);

      // Verify data consistency
      const userPoints = scenario.checkIns.reduce((sum, checkIn) => sum + checkIn.pointsEarned, 0);
      expect(scenario.user.totalPoints).toBe(userPoints);

      // Verify mock behavior
      expect(vi.isMockFunction(mocks.pointsService.calculateCheckInPoints)).toBe(true);
    } finally {
      cleanup();
    }
  });
});
