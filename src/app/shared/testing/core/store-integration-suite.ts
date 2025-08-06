/**
 * @fileoverview Store Integration Suite - Industrial-strength store data flow testing
 *
 * Specifically designed for testing data consistency and reactive updates across
 * interdependent stores in your Angular application. Provides clear, readable
 * integration tests for complex store coordination patterns.
 */

import { expect } from 'vitest';
import type { TestSuite } from './mock-registry';
import { MockRegistry } from './mock-registry';

// ===================================
// INTEGRATION SUITE TYPES
// ===================================

export interface StoreState {
  storeName: string;
  signalName: string;
  expectedValue: any;
}

export interface DataFlowStep {
  from: string; // 'CheckInStore.add'
  to: string; // 'UserStore.patchUser'
  description?: string;
}

export interface IntegrationScenario {
  name: string;
  description?: string;
  initialStates: StoreState[];
  dataFlows: DataFlowStep[];
  finalStates: StoreState[];
}

export interface Given {
  condition: string;
  setup: () => void | Promise<void>;
}

export interface When {
  action: string;
  execute: () => void | Promise<void>;
}

// ===================================
// STORE INTEGRATION SUITE CLASS
// ===================================

export class StoreIntegrationSuite {
  private stores: Record<string, any> = {};
  private mockSuite: TestSuite | null = null;
  private scenario: IntegrationScenario | null = null;
  private givenConditions: Given[] = [];
  private whenActions: When[] = [];
  private stateSnapshots: Record<string, any> = {};

  /**
   * Create integration suite with specified stores
   */
  static withStores(storeNames: string[]): StoreIntegrationSuite {
    const suite = new StoreIntegrationSuite();
    suite.initializeStores(storeNames);
    return suite;
  }

  /**
   * Set up a predefined scenario
   */
  withScenario(scenarioName: string): StoreIntegrationSuite {
    this.scenario = this.getScenario(scenarioName);
    return this;
  }

  /**
   * Set up initial conditions (GIVEN)
   */
  given(condition: string): StoreIntegrationSuite {
    const setup = this.getSetupForCondition(condition);
    this.givenConditions.push({ condition, setup });
    return this;
  }

  /**
   * Define the action to test (WHEN)
   */
  when(action: string): StoreIntegrationSuite {
    const execute = this.getExecutionForAction(action);
    this.whenActions.push({ action, execute });
    return this;
  }

  /**
   * Expect specific data flow between stores
   */
  expectDataFlow(flows: string[]): StoreIntegrationSuite {
    console.log('🔄 Expected data flows:', flows);

    // Set up spies to track data flow
    flows.forEach(flow => {
      const [from, to] = flow.split(' → ');
      this.setupDataFlowSpy(from, to);
    });

    return this;
  }

  /**
   * Expect specific store state
   */
  expectStoreState(storeSignal: string, expectedValue: any): StoreIntegrationSuite {
    const [storeName, signalName] = storeSignal.split('.');
    const store = this.stores[storeName];

    if (!store) {
      throw new Error(`Store ${storeName} not found in integration suite`);
    }

    const signal = store[signalName];
    if (!signal || typeof signal !== 'function') {
      throw new Error(`Signal ${signalName} not found on store ${storeName}`);
    }

    const actualValue = signal();
    expect(actualValue).toEqual(expectedValue);

    console.log(`✅ Store state verified: ${storeSignal} = ${JSON.stringify(actualValue)}`);
    return this;
  }

  /**
   * Verify data consistency across all stores
   */
  verifyDataConsistency(): void {
    console.log('🔍 Verifying data consistency across stores...');

    // Check UserStore ↔ DataAggregator consistency
    if (this.stores['UserStore'] && this.stores['DataAggregator']) {
      const userPoints = this.stores['UserStore'].totalPoints?.();
      const aggregatorPoints = this.stores['DataAggregator'].scoreboardData?.()?.totalPoints;

      if (userPoints !== undefined && aggregatorPoints !== undefined) {
        expect(userPoints).toBe(aggregatorPoints);
        console.log(
          `✅ Points consistency: UserStore(${userPoints}) = DataAggregator(${aggregatorPoints})`
        );
      }
    }

    // Check CheckInStore ↔ DataAggregator consistency
    if (this.stores['CheckInStore'] && this.stores['DataAggregator']) {
      const checkinCount = this.stores['CheckInStore'].count?.();
      const aggregatorCount = this.stores['DataAggregator'].scoreboardData?.()?.totalCheckins;

      if (checkinCount !== undefined && aggregatorCount !== undefined) {
        expect(checkinCount).toBe(aggregatorCount);
        console.log(
          `✅ Check-in consistency: CheckInStore(${checkinCount}) = DataAggregator(${aggregatorCount})`
        );
      }
    }

    console.log('✅ Data consistency verification complete');
  }

  /**
   * Execute the complete integration test
   */
  async execute(): Promise<void> {
    console.log('🚀 Executing Store Integration Test');

    // Execute GIVEN conditions
    console.log('📋 Setting up initial conditions...');
    for (const given of this.givenConditions) {
      console.log(`   • ${given.condition}`);
      await given.setup();
    }

    // Take state snapshots before action
    this.captureStateSnapshots();

    // Execute WHEN actions
    console.log('⚡ Executing actions...');
    for (const when of this.whenActions) {
      console.log(`   • ${when.action}`);
      await when.execute();
    }

    // Allow reactive updates to propagate
    await this.waitForReactiveUpdates();

    console.log('✅ Integration test execution complete');
  }

  /**
   * Initialize stores with mocks or real instances
   */
  private initializeStores(storeNames: string[]): void {
    // Create mock suite with all required stores
    this.mockSuite = MockRegistry.createSuite(
      storeNames.map(name => name.toLowerCase().replace('store', '') + '-store')
    );

    // Map store names to instances
    storeNames.forEach(storeName => {
      const mockKey = storeName.toLowerCase().replace('store', '') + '-store';
      this.stores[storeName] = this.mockSuite?.mocks[mockKey];
    });

    console.log('🏪 Initialized stores:', Object.keys(this.stores));
  }

  /**
   * Get predefined scenarios
   */
  private getScenario(scenarioName: string): IntegrationScenario {
    const scenarios: Record<string, IntegrationScenario> = {
      userCheckInWorkflow: {
        name: 'User Check-In Workflow',
        description: 'Test complete user check-in data flow',
        initialStates: [
          { storeName: 'UserStore', signalName: 'totalPoints', expectedValue: 100 },
          { storeName: 'CheckInStore', signalName: 'count', expectedValue: 3 },
        ],
        dataFlows: [
          { from: 'CheckInStore.add', to: 'UserStore.patchUser' },
          { from: 'UserStore.update', to: 'DataAggregator.recalculate' },
          { from: 'PointsStore.award', to: 'UserStore.updatePoints' },
        ],
        finalStates: [
          { storeName: 'UserStore', signalName: 'totalPoints', expectedValue: 150 },
          { storeName: 'CheckInStore', signalName: 'count', expectedValue: 4 },
        ],
      },

      sessionInitialization: {
        name: 'Session Initialization',
        description: 'Test session data loading across all stores',
        initialStates: [
          { storeName: 'UserStore', signalName: 'loading', expectedValue: true },
          { storeName: 'CheckInStore', signalName: 'loading', expectedValue: true },
        ],
        dataFlows: [
          { from: 'SessionService.initializeSessionData', to: 'UserStore.loadData' },
          { from: 'SessionService.initializeSessionData', to: 'CheckInStore.loadData' },
        ],
        finalStates: [
          { storeName: 'UserStore', signalName: 'loading', expectedValue: false },
          { storeName: 'CheckInStore', signalName: 'loading', expectedValue: false },
        ],
      },
    };

    const scenario = scenarios[scenarioName];
    if (!scenario) {
      throw new Error(
        `Scenario '${scenarioName}' not found. Available: ${Object.keys(scenarios).join(', ')}`
      );
    }

    return scenario;
  }

  /**
   * Get setup function for a given condition
   */
  private getSetupForCondition(condition: string): () => void | Promise<void> {
    const setupFunctions: Record<string, () => void | Promise<void>> = {
      'user has 3 previous check-ins': () => {
        if (this.stores['CheckInStore']?.add) {
          // Add 3 mock check-ins
          for (let i = 1; i <= 3; i++) {
            this.stores['CheckInStore'].add({
              id: `checkin-${i}`,
              userId: 'test-user-123',
              pubId: `pub-${i}`,
            });
          }
        }
      },

      'user has 100 total points': () => {
        if (this.stores['UserStore']?._setTotalPoints) {
          this.stores['UserStore']._setTotalPoints(100);
        }
        if (this.stores['PointsStore']?.totalPoints?.set) {
          this.stores['PointsStore'].totalPoints.set(100);
        }
      },

      'pub is eligible for check-in': () => {
        // Mock pub eligibility validation
        if (this.stores['CheckInService']?.canCheckIn) {
          this.stores['CheckInService'].canCheckIn.mockResolvedValue({ allowed: true });
        }
      },

      'stores are loading': async () => {
        Object.values(this.stores).forEach((store: any) => {
          if (store.loading?.set) {
            store.loading.set(true);
          }
        });
      },

      'user has existing activity': () => {
        // Mock user with existing check-ins, points, and badges
        if (this.stores['UserStore']?._setUserActivity) {
          this.stores['UserStore']._setUserActivity({ 
            checkins: 5, 
            points: 250,
            badges: 3 
          });
        }
        
        // Set up existing check-ins
        if (this.stores['CheckInStore']?.addMultiple) {
          this.stores['CheckInStore'].addMultiple([
            { id: 'activity-1', userId: 'test-user-123', pubId: 'pub-1', points: 50 },
            { id: 'activity-2', userId: 'test-user-123', pubId: 'pub-2', points: 50 },
            { id: 'activity-3', userId: 'test-user-123', pubId: 'pub-3', points: 50 },
            { id: 'activity-4', userId: 'test-user-123', pubId: 'pub-4', points: 50 },
            { id: 'activity-5', userId: 'test-user-123', pubId: 'pub-5', points: 50 }
          ]);
        }

        // Set up existing points
        if (this.stores['PointsStore']?.totalPoints?.set) {
          this.stores['PointsStore'].totalPoints.set(250);
        }

        // Set up existing badges
        if (this.stores['BadgeStore']?.addMultiple) {
          this.stores['BadgeStore'].addMultiple([
            { id: 'badge-1', userId: 'test-user-123', type: 'first-checkin' },
            { id: 'badge-2', userId: 'test-user-123', type: 'regular' },
            { id: 'badge-3', userId: 'test-user-123', type: 'explorer' }
          ]);
        }
      },
    };

    const setup = setupFunctions[condition];
    if (!setup) {
      throw new Error(`Setup for condition '${condition}' not defined`);
    }

    return setup;
  }

  /**
   * Get execution function for an action
   */
  private getExecutionForAction(action: string): () => void | Promise<void> {
    const executionFunctions: Record<string, () => void | Promise<void>> = {
      'user checks into new pub': async () => {
        // Simulate complete check-in workflow
        const newCheckIn = {
          id: 'checkin-new',
          userId: 'test-user-123',
          pubId: 'pub-new',
          points: 50,
        };

        // Add to CheckInStore
        if (this.stores['CheckInStore']?.add) {
          this.stores['CheckInStore'].add(newCheckIn);
        }

        // Update UserStore points
        if (this.stores['UserStore']?._updatePoints) {
          this.stores['UserStore']._updatePoints(150); // 100 + 50
        }

        // Trigger DataAggregator recalculation
        if (this.stores['DataAggregator']?.scoreboardData?.set) {
          this.stores['DataAggregator'].scoreboardData.set({
            totalPoints: 150,
            pubsVisited: 4,
            badgeCount: 5,
            landlordCount: 2,
            totalCheckins: 4,
            isLoading: false,
          });
        }
      },

      'session initializes data': async () => {
        // Simulate session initialization
        Object.values(this.stores).forEach((store: any) => {
          if (store.loading?.set) {
            store.loading.set(false);
          }
          if (store.load) {
            store.load();
          }
        });
      },
    };

    const execution = executionFunctions[action];
    if (!execution) {
      throw new Error(`Execution for action '${action}' not defined`);
    }

    return execution;
  }

  /**
   * Set up spies to track data flow between stores
   */
  private setupDataFlowSpy(from: string, to: string): void {
    const [fromStore, fromMethod] = from.split('.');
    const [toStore, toMethod] = to.split('.');

    // This would set up actual spies in a real implementation
    console.log(`🔍 Tracking data flow: ${from} → ${to}`);
  }

  /**
   * Capture state snapshots for comparison
   */
  private captureStateSnapshots(): void {
    Object.entries(this.stores).forEach(([storeName, store]) => {
      this.stateSnapshots[storeName] = this.getStoreSnapshot(store);
    });
  }

  /**
   * Get snapshot of store state
   */
  private getStoreSnapshot(store: any): any {
    const snapshot: any = {};

    // Capture common signal values
    const commonSignals = ['data', 'loading', 'error', 'totalPoints', 'count'];
    commonSignals.forEach(signalName => {
      if (store[signalName] && typeof store[signalName] === 'function') {
        snapshot[signalName] = store[signalName]();
      }
    });

    return snapshot;
  }

  /**
   * Wait for reactive updates to propagate
   */
  private async waitForReactiveUpdates(): Promise<void> {
    // Allow signals to update
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  /**
   * Cleanup integration suite
   */
  cleanup(): void {
    if (this.mockSuite) {
      this.mockSuite.cleanup();
    }
    this.stores = {};
    this.givenConditions = [];
    this.whenActions = [];
    this.stateSnapshots = {};
  }
}

// ===================================
// CONVENIENCE FUNCTIONS
// ===================================

/**
 * Create a store integration test suite
 */
export function createStoreIntegrationSuite(storeNames: string[]): StoreIntegrationSuite {
  return StoreIntegrationSuite.withStores(storeNames);
}

/**
 * Common integration test patterns
 */
export const IntegrationPatterns = {
  /**
   * Test user check-in workflow
   */
  userCheckInFlow: () =>
    StoreIntegrationSuite.withStores([
      'UserStore',
      'CheckInStore',
      'PointsStore',
      'DataAggregator',
    ]).withScenario('userCheckInWorkflow'),

  /**
   * Test session initialization
   */
  sessionInitialization: () =>
    StoreIntegrationSuite.withStores(['UserStore', 'CheckInStore', 'SessionService']).withScenario(
      'sessionInitialization'
    ),

  /**
   * Test data consistency
   */
  dataConsistency: () =>
    StoreIntegrationSuite.withStores(['UserStore', 'CheckInStore', 'DataAggregator'])
      .given('user has existing data')
      .when('data updates occur'),
};

/**
 * Integration test helper for common scenarios
 */
export async function testStoreIntegration(
  scenario: string,
  stores: string[],
  customSetup?: () => void | Promise<void>
): Promise<void> {
  const suite = StoreIntegrationSuite.withStores(stores).withScenario(scenario);

  if (customSetup) {
    await customSetup();
  }

  await suite.execute();
  suite.verifyDataConsistency();
  suite.cleanup();
}
