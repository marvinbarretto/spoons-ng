/**
 * @fileoverview Store Integration Example Tests
 * 
 * Demonstrates how to use the Store Integration Suite for testing
 * data flows between your interdependent stores. These examples
 * show the clear, readable integration test patterns.
 */

import { describe, it, beforeEach, afterEach } from 'vitest';
import { StoreIntegrationSuite, IntegrationPatterns } from '../core/store-integration-suite';

describe('Store Integration Examples', () => {
  let integration: StoreIntegrationSuite;

  afterEach(() => {
    integration?.cleanup();
  });

  describe('User Check-In Workflow Integration', () => {
    beforeEach(() => {
      integration = StoreIntegrationSuite
        .withStores(['UserStore', 'CheckInStore', 'PointsStore', 'DataAggregator'])
        .withScenario('userCheckInWorkflow');
    });

    it('should maintain data consistency when user checks into new pub', async () => {
      // ARRANGE: Set up initial conditions
      await integration
        .given('user has 3 previous check-ins')
        .given('user has 100 total points')
        .given('pub is eligible for check-in');

      // ACT: Execute the check-in workflow
      await integration
        .when('user checks into new pub')
        .expectDataFlow([
          'CheckInStore.add → UserStore.patchUser',
          'UserStore.update → DataAggregator.recalculate',
          'PointsStore.award → UserStore.updatePoints'
        ]);

      // Execute the complete workflow
      await integration.execute();

      // ASSERT: Verify final state and data consistency
      integration
        .expectStoreState('UserStore.totalPoints', 150)
        .expectStoreState('CheckInStore.count', 4)
        .expectStoreState('DataAggregator.scoreboardData', expect.objectContaining({
          totalPoints: 150,
          pubsVisited: 4,
          totalCheckins: 4
        }))
        .verifyDataConsistency();
    });

    it('should handle concurrent check-ins correctly', async () => {
      await integration
        .given('user has existing check-ins')
        .when('multiple check-ins occur simultaneously');

      await integration.execute();

      // Verify no race conditions in data updates
      integration
        .expectStoreState('CheckInStore.count', expect.any(Number))
        .verifyDataConsistency();
    });
  });

  describe('Session Initialization Integration', () => {
    beforeEach(() => {
      integration = StoreIntegrationSuite
        .withStores(['UserStore', 'CheckInStore', 'SessionService', 'DataAggregator'])
        .withScenario('sessionInitialization');
    });

    it('should coordinate loading states across all stores', async () => {
      await integration
        .given('stores are loading')
        .when('session initializes data')
        .expectDataFlow([
          'SessionService.initializeSessionData → UserStore.loadData',
          'SessionService.initializeSessionData → CheckInStore.loadData',
          'UserStore.dataLoaded → DataAggregator.recalculate'
        ]);

      await integration.execute();

      integration
        .expectStoreState('UserStore.loading', false)
        .expectStoreState('CheckInStore.loading', false)
        .expectStoreState('DataAggregator.scoreboardData', expect.objectContaining({
          isLoading: false
        }))
        .verifyDataConsistency();
    });

    it('should handle partial initialization failures gracefully', async () => {
      await integration
        .given('UserStore initialization fails')
        .given('CheckInStore initializes successfully')
        .when('session attempts full initialization');

      await integration.execute();

      // Verify graceful degradation
      integration
        .expectStoreState('UserStore.error', expect.any(String))
        .expectStoreState('CheckInStore.loading', false)
        .expectStoreState('DataAggregator.scoreboardData', expect.objectContaining({
          isLoading: false  // Should still complete with partial data
        }));
    });
  });

  describe('Real-World Complex Scenarios', () => {
    it('should handle complete user journey: registration → first check-in → badge earned', async () => {
      integration = StoreIntegrationSuite
        .withStores(['UserStore', 'CheckInStore', 'PointsStore', 'BadgeStore', 'DataAggregator']);

      await integration
        .given('user is newly registered')
        .given('user has no previous activity')
        .when('user performs first check-in')
        .expectDataFlow([
          'CheckInStore.add → PointsStore.calculateFirstCheckIn',
          'PointsStore.award → UserStore.updatePoints',
          'CheckInStore.firstTime → BadgeStore.evaluateFirstTimer',
          'BadgeStore.award → UserStore.updateBadges',
          'UserStore.updated → DataAggregator.recalculate'
        ]);

      await integration.execute();

      integration
        .expectStoreState('UserStore.totalPoints', 50)  // First check-in bonus
        .expectStoreState('UserStore.badgeCount', 1)    // First timer badge
        .expectStoreState('CheckInStore.count', 1)
        .expectStoreState('DataAggregator.scoreboardData', expect.objectContaining({
          totalPoints: 50,
          pubsVisited: 1,
          badgeCount: 1,
          totalCheckins: 1
        }))
        .verifyDataConsistency();
    });

    it('should maintain consistency during error scenarios', async () => {
      integration = StoreIntegrationSuite
        .withStores(['UserStore', 'CheckInStore', 'PointsStore', 'DataAggregator']);

      await integration
        .given('user has existing data')
        .given('PointsStore.award will fail')  // Simulate Firebase error
        .when('user attempts check-in');

      await integration.execute();

      // Verify rollback and consistency
      integration
        .expectStoreState('CheckInStore.error', expect.any(String))
        .expectStoreState('UserStore.totalPoints', expect.any(Number)) // Unchanged
        .verifyDataConsistency(); // Should still be consistent despite failure
    });
  });

  describe('Performance and Reactive Behavior', () => {
    it('should handle rapid successive updates efficiently', async () => {
      integration = StoreIntegrationSuite
        .withStores(['UserStore', 'DataAggregator']);

      // Simulate rapid user updates (like points being awarded quickly)
      await integration
        .given('user has baseline data')
        .when('multiple rapid updates occur');

      await integration.execute();

      // Verify efficient batching and final consistency
      integration
        .expectStoreState('DataAggregator.scoreboardData', expect.objectContaining({
          isLoading: false  // Should not be stuck in loading state
        }))
        .verifyDataConsistency();
    });

    it('should maintain signal reactivity across store boundaries', async () => {
      integration = StoreIntegrationSuite
        .withStores(['UserStore', 'CheckInStore', 'DataAggregator']);

      await integration
        .given('initial store states are set')
        .when('UserStore signal changes')
        .expectDataFlow([
          'UserStore.totalPoints → DataAggregator.scoreboardData.totalPoints'
        ]);

      await integration.execute();

      // Verify reactive updates propagated correctly
      integration.verifyDataConsistency();
    });
  });
});

// ===================================
// UTILITY TESTS FOR COMMON PATTERNS
// ===================================

describe('Integration Test Patterns', () => {
  it('should provide reusable pattern for user check-in flow', async () => {
    const integration = IntegrationPatterns.userCheckInFlow();
    
    await integration
      .given('user has existing activity')
      .when('user checks into new pub');

    await integration.execute();
    integration.verifyDataConsistency();
    integration.cleanup();
  });

  it('should provide reusable pattern for session initialization', async () => {
    const integration = IntegrationPatterns.sessionInitialization();
    
    await integration
      .given('stores are loading')
      .when('session initializes data');

    await integration.execute();
    integration.verifyDataConsistency();
    integration.cleanup();
  });
});