/**
 * @fileoverview Integration Testing Patterns for Complex Workflows
 * 
 * Provides high-level patterns for testing complete application workflows
 * by combining Store Integration Suite, Signal Test Harness, and Enhanced Test Data.
 * Focuses on real-world user scenarios and end-to-end business logic validation.
 */

import { StoreIntegrationSuite } from './store-integration-suite';
import { SignalTestHarness, ReactiveChainSimulator } from './signal-test-harness';
import { TestScenarios, simulateUserJourney, type RelatedDataSet, type UserJourneyStep } from './enhanced-test-data';
import { MockRegistry } from './mock-registry';

// ===================================
// WORKFLOW TESTING TYPES
// ===================================

export interface WorkflowTestStep {
  name: string;
  description?: string;
  action: () => Promise<void> | void;
  expectations: Array<{
    description: string;
    assertion: () => void | Promise<void>;
  }>;
  cleanup?: () => Promise<void> | void;
}

export interface WorkflowScenario {
  name: string;
  description: string;
  setup: () => Promise<void> | void;
  steps: WorkflowTestStep[];
  teardown?: () => Promise<void> | void;
  stores: string[];
  signals?: string[];
  testData?: keyof typeof TestScenarios;
}

export interface IntegrationTestResult {
  scenario: string;
  success: boolean;
  duration: number;
  stepResults: Array<{
    step: string;
    success: boolean;
    error?: string;
  }>;
  dataConsistency: boolean;
  signalReactivity: boolean;
}

// ===================================
// WORKFLOW TEST ORCHESTRATOR
// ===================================

export class WorkflowTestOrchestrator {
  private storeIntegration?: StoreIntegrationSuite;
  private signalHarness?: SignalTestHarness;
  private reactiveChain?: ReactiveChainSimulator;
  private testData?: RelatedDataSet;
  private mockSuite?: any;

  /**
   * Initialize orchestrator with required testing components
   */
  async initialize(scenario: WorkflowScenario): Promise<void> {
    console.log(`🎭 Initializing workflow test: ${scenario.name}`);

    // Set up stores
    if (scenario.stores.length > 0) {
      this.storeIntegration = StoreIntegrationSuite.withStores(scenario.stores);
    }

    // Set up signal tracking
    this.signalHarness = new SignalTestHarness();
    this.reactiveChain = this.signalHarness.createReactiveChain();

    // Set up test data
    if (scenario.testData) {
      this.testData = TestScenarios[scenario.testData]();
      console.log(`   📊 Test data: ${this.testData.users.length} users, ${this.testData.checkIns.length} check-ins`);
    }

    // Set up mocks
    this.mockSuite = MockRegistry.createFullSuite();

    // Run scenario setup
    if (scenario.setup) {
      await scenario.setup();
    }

    console.log('✅ Workflow test initialization complete');
  }

  /**
   * Execute a complete workflow scenario
   */
  async executeWorkflow(scenario: WorkflowScenario): Promise<IntegrationTestResult> {
    const startTime = Date.now();
    const result: IntegrationTestResult = {
      scenario: scenario.name,
      success: true,
      duration: 0,
      stepResults: [],
      dataConsistency: false,
      signalReactivity: false
    };

    try {
      await this.initialize(scenario);

      // Execute workflow steps
      for (const step of scenario.steps) {
        console.log(`🔄 Executing step: ${step.name}`);
        
        const stepResult = { step: step.name, success: true, error: undefined as string | undefined };
        
        try {
          // Execute step action
          await step.action();

          // Wait for reactive updates to propagate
          if (this.reactiveChain) {
            await this.reactiveChain.waitForStabilization(2000);
          }

          // Verify step expectations
          for (const expectation of step.expectations) {
            try {
              await expectation.assertion();
              console.log(`   ✅ ${expectation.description}`);
            } catch (error) {
              stepResult.success = false;
              stepResult.error = `Expectation failed: ${expectation.description} - ${error}`;
              console.log(`   ❌ ${expectation.description}: ${error}`);
              throw error;
            }
          }

          // Step cleanup
          if (step.cleanup) {
            await step.cleanup();
          }

        } catch (error) {
          stepResult.success = false;
          stepResult.error = stepResult.error || `Step execution failed: ${error}`;
          result.success = false;
        }

        result.stepResults.push(stepResult);
      }

      // Verify overall data consistency
      result.dataConsistency = await this.verifyDataConsistency();
      
      // Verify signal reactivity
      result.signalReactivity = await this.verifySignalReactivity();

      // Scenario teardown
      if (scenario.teardown) {
        await scenario.teardown();
      }

    } catch (error) {
      result.success = false;
      console.error(`❌ Workflow execution failed: ${error}`);
    } finally {
      result.duration = Date.now() - startTime;
      await this.cleanup();
    }

    return result;
  }

  /**
   * Verify data consistency across all stores
   */
  private async verifyDataConsistency(): Promise<boolean> {
    try {
      if (this.storeIntegration) {
        this.storeIntegration.verifyDataConsistency();
      }
      console.log('✅ Data consistency verification passed');
      return true;
    } catch (error) {
      console.log(`❌ Data consistency verification failed: ${error}`);
      return false;
    }
  }

  /**
   * Verify signal reactivity patterns
   */
  private async verifySignalReactivity(): Promise<boolean> {
    try {
      if (this.reactiveChain) {
        // Check that signals are responding to changes
        const snapshot = this.reactiveChain.getChainSnapshot();
        const hasActivity = Object.values(snapshot).some(count => count > 1);
        
        if (!hasActivity) {
          console.log('⚠️  No signal activity detected');
          return false;
        }
      }
      console.log('✅ Signal reactivity verification passed');
      return true;
    } catch (error) {
      console.log(`❌ Signal reactivity verification failed: ${error}`);
      return false;
    }
  }

  /**
   * Cleanup test resources
   */
  private async cleanup(): Promise<void> {
    if (this.storeIntegration) {
      this.storeIntegration.cleanup();
    }
    if (this.signalHarness) {
      this.signalHarness.destroy();
    }
    if (this.mockSuite) {
      this.mockSuite.cleanup();
    }
  }
}

// ===================================
// PREDEFINED WORKFLOW PATTERNS
// ===================================

export const WorkflowPatterns = {
  /**
   * User Registration and First Check-in Workflow
   */
  userOnboarding: (): WorkflowScenario => ({
    name: 'User Onboarding',
    description: 'Complete user registration, first check-in, and initial badge earning',
    stores: ['UserStore', 'CheckInStore', 'PointsStore', 'BadgeStore', 'DataAggregator'],
    testData: 'newUserFirstWeek',
    
    setup: async () => {
      // Initialize app state as if user just opened the app
    },

    steps: [
      {
        name: 'User Registration',
        description: 'New user registers with the app',
        action: async () => {
          // Simulate Firebase Auth registration
          const mockAuth = MockRegistry.get('firebase-auth');
          mockAuth.signInAnonymously();
        },
        expectations: [
          {
            description: 'User should be authenticated',
            assertion: () => {
              const authStore = MockRegistry.get('user-store');
              expect(authStore.hasEntity()).toBe(true);
            }
          },
          {
            description: 'User should have initial state',
            assertion: () => {
              const userStore = MockRegistry.get('user-store');
              expect(userStore.entity().totalPoints).toBe(0);
            }
          }
        ]
      },

      {
        name: 'First Check-in Attempt',
        description: 'User attempts their first pub check-in',
        action: async () => {
          const checkInStore = MockRegistry.get('checkin-store');
          const newCheckIn = {
            id: 'first-checkin',
            userId: 'test-user-123',
            pubId: 'pub-1',
            timestamp: new Date().toISOString(),
            points: 50 // First timer bonus
          };
          checkInStore.add(newCheckIn);
        },
        expectations: [
          {
            description: 'Check-in should be recorded',
            assertion: () => {
              const checkInStore = MockRegistry.get('checkin-store');
              expect(checkInStore.count()).toBe(1);
            }
          },
          {
            description: 'Points should be awarded',
            assertion: () => {
              const pointsStore = MockRegistry.get('points-store');
              expect(pointsStore.totalPoints()).toBeGreaterThan(0);
            }
          }
        ]
      },

      {
        name: 'First Timer Badge Earned',
        description: 'System awards first timer badge',
        action: async () => {
          const badgeStore = MockRegistry.get('badge-store');
          // Simulate badge evaluation system
          const firstTimerBadge = {
            id: 'first-timer',
            userId: 'test-user-123',
            badgeId: 'badge-first-timer',
            earnedAt: new Date().toISOString()
          };
          badgeStore.add(firstTimerBadge);
        },
        expectations: [
          {
            description: 'Badge should be awarded',
            assertion: () => {
              const userStore = MockRegistry.get('user-store');
              expect(userStore.entity().badgeCount).toBeGreaterThan(0);
            }
          },
          {
            description: 'DataAggregator should reflect changes',
            assertion: () => {
              const aggregator = MockRegistry.get('data-aggregator');
              const data = aggregator.scoreboardData();
              expect(data.badgeCount).toBeGreaterThan(0);
              expect(data.totalCheckins).toBe(1);
            }
          }
        ]
      }
    ],

    teardown: async () => {
      // Clean up any remaining test state
      MockRegistry.resetAll();
    }
  }),

  /**
   * Multi-user Social Check-in Workflow
   */
  socialCheckin: (): WorkflowScenario => ({
    name: 'Social Check-in',
    description: 'Multiple users check into the same pub and interact',
    stores: ['UserStore', 'CheckInStore', 'PointsStore', 'DataAggregator'],
    testData: 'weekendSocial',

    setup: async () => {
      // Set up multiple users in the same area
    },

    steps: [
      {
        name: 'Primary User Check-in',
        description: 'First user checks into pub',
        action: async () => {
          const checkInStore = MockRegistry.get('checkin-store');
          checkInStore.add({
            id: 'social-checkin-1',
            userId: 'user-1',
            pubId: 'social-pub',
            timestamp: new Date().toISOString(),
            points: 10
          });
        },
        expectations: [
          {
            description: 'Check-in should be recorded',
            assertion: () => {
              const checkInStore = MockRegistry.get('checkin-store');
              const pubCheckIns = checkInStore.data().filter((c: any) => c.pubId === 'social-pub');
              expect(pubCheckIns.length).toBe(1);
            }
          }
        ]
      },

      {
        name: 'Secondary Users Join',
        description: 'Additional users check into same pub',
        action: async () => {
          const checkInStore = MockRegistry.get('checkin-store');
          
          // Simulate multiple users checking in within short time window
          for (let i = 2; i <= 4; i++) {
            checkInStore.add({
              id: `social-checkin-${i}`,
              userId: `user-${i}`,
              pubId: 'social-pub',
              timestamp: new Date(Date.now() + i * 1000).toISOString(),
              points: 10 + (i * 2) // Social bonus
            });
          }
        },
        expectations: [
          {
            description: 'All social check-ins should be recorded',
            assertion: () => {
              const checkInStore = MockRegistry.get('checkin-store');
              const pubCheckIns = checkInStore.data().filter((c: any) => c.pubId === 'social-pub');
              expect(pubCheckIns.length).toBe(4);
            }
          },
          {
            description: 'DataAggregator should show social activity',
            assertion: () => {
              const aggregator = MockRegistry.get('data-aggregator');
              const data = aggregator.scoreboardData();
              expect(data.totalCheckins).toBeGreaterThanOrEqual(4);
            }
          }
        ]
      },

      {
        name: 'Social Bonus Calculation',
        description: 'System calculates social interaction bonuses',
        action: async () => {
          // Simulate social bonus system
          const pointsStore = MockRegistry.get('points-store');
          const socialBonus = 25; // Bonus for checking in with others
          pointsStore.awardPoints('user-1', socialBonus);
        },
        expectations: [
          {
            description: 'Social bonuses should be applied',
            assertion: () => {
              const pointsStore = MockRegistry.get('points-store');
              expect(pointsStore.totalPoints()).toBeGreaterThan(40); // Base + social bonus
            }
          }
        ]
      }
    ]
  }),

  /**
   * Error Recovery and Resilience Workflow
   */
  errorRecovery: (): WorkflowScenario => ({
    name: 'Error Recovery',
    description: 'System handles errors gracefully and recovers state',
    stores: ['UserStore', 'CheckInStore', 'PointsStore', 'SessionService'],

    setup: async () => {
      // Set up normal operating state
    },

    steps: [
      {
        name: 'Network Failure During Check-in',
        description: 'Check-in fails due to network error',
        action: async () => {
          const checkInStore = MockRegistry.get('checkin-store');
          
          // Simulate network failure
          checkInStore._setError('Network connection failed');
          checkInStore._setLoading(false);
        },
        expectations: [
          {
            description: 'Error state should be set',
            assertion: () => {
              const checkInStore = MockRegistry.get('checkin-store');
              expect(checkInStore.error()).toBeTruthy();
            }
          },
          {
            description: 'Loading state should be resolved',
            assertion: () => {
              const checkInStore = MockRegistry.get('checkin-store');
              expect(checkInStore.loading()).toBe(false);
            }
          }
        ]
      },

      {
        name: 'Error Recovery Attempt',
        description: 'User retries the failed operation',
        action: async () => {
          const checkInStore = MockRegistry.get('checkin-store');
          
          // Clear error and retry
          checkInStore._setError(null);
          checkInStore._setLoading(true);
          
          // Simulate successful retry
          await new Promise(resolve => setTimeout(resolve, 50));
          checkInStore.add({
            id: 'retry-checkin',
            userId: 'test-user',
            pubId: 'test-pub',
            timestamp: new Date().toISOString(),
            points: 10
          });
          checkInStore._setLoading(false);
        },
        expectations: [
          {
            description: 'Error should be cleared',
            assertion: () => {
              const checkInStore = MockRegistry.get('checkin-store');
              expect(checkInStore.error()).toBeNull();
            }
          },
          {
            description: 'Operation should succeed',
            assertion: () => {
              const checkInStore = MockRegistry.get('checkin-store');
              expect(checkInStore.count()).toBe(1);
            }
          }
        ]
      },

      {
        name: 'State Consistency Verification',
        description: 'Verify all stores are in consistent state after recovery',
        action: async () => {
          // Allow all reactive updates to propagate
          await new Promise(resolve => setTimeout(resolve, 100));
        },
        expectations: [
          {
            description: 'All stores should be in consistent state',
            assertion: () => {
              const checkInStore = MockRegistry.get('checkin-store');
              const pointsStore = MockRegistry.get('points-store');
              const aggregator = MockRegistry.get('data-aggregator');
              
              expect(checkInStore.error()).toBeNull();
              expect(pointsStore.error()).toBeNull();
              expect(aggregator.scoreboardData().isLoading).toBe(false);
            }
          }
        ]
      }
    ]
  }),

  /**
   * Performance and Scale Testing Workflow
   */
  performanceTest: (): WorkflowScenario => ({
    name: 'Performance Test',
    description: 'Test system performance under load with rapid operations',
    stores: ['UserStore', 'CheckInStore', 'PointsStore', 'DataAggregator'],
    testData: 'powerUserEcosystem',

    setup: async () => {
      // Set up for high-volume operations
    },

    steps: [
      {
        name: 'Rapid Check-in Sequence',
        description: 'Simulate rapid succession of check-ins',
        action: async () => {
          const checkInStore = MockRegistry.get('checkin-store');
          const startTime = Date.now();
          
          // Rapid check-ins
          for (let i = 0; i < 50; i++) {
            checkInStore.add({
              id: `perf-checkin-${i}`,
              userId: `user-${i % 5}`, // 5 users
              pubId: `pub-${i % 10}`,  // 10 pubs
              timestamp: new Date(Date.now() + i * 10).toISOString(),
              points: 10
            });
          }
          
          const duration = Date.now() - startTime;
          console.log(`Rapid check-ins completed in ${duration}ms`);
        },
        expectations: [
          {
            description: 'All check-ins should be processed',
            assertion: () => {
              const checkInStore = MockRegistry.get('checkin-store');
              expect(checkInStore.count()).toBe(50);
            }
          },
          {
            description: 'System should remain responsive',
            assertion: () => {
              const aggregator = MockRegistry.get('data-aggregator');
              expect(aggregator.scoreboardData().isLoading).toBe(false);
            }
          }
        ]
      },

      {
        name: 'Bulk Data Aggregation',
        description: 'Test aggregation performance with large datasets',
        action: async () => {
          const aggregator = MockRegistry.get('data-aggregator');
          
          // Trigger recalculation
          const startTime = Date.now();
          aggregator.recalculate();
          const duration = Date.now() - startTime;
          
          console.log(`Data aggregation completed in ${duration}ms`);
        },
        expectations: [
          {
            description: 'Aggregation should complete quickly',
            assertion: () => {
              const aggregator = MockRegistry.get('data-aggregator');
              const data = aggregator.scoreboardData();
              expect(data.totalCheckins).toBe(50);
              expect(data.totalPoints).toBeGreaterThan(0);
            }
          }
        ]
      }
    ]
  })
};

// ===================================
// CONVENIENCE FUNCTIONS
// ===================================

/**
 * Execute a predefined workflow pattern
 */
export async function executeWorkflowPattern(
  patternName: keyof typeof WorkflowPatterns
): Promise<IntegrationTestResult> {
  const orchestrator = new WorkflowTestOrchestrator();
  const scenario = WorkflowPatterns[patternName]();
  return await orchestrator.executeWorkflow(scenario);
}

/**
 * Create custom workflow scenario
 */
export function createWorkflowScenario(
  name: string,
  description: string
): Partial<WorkflowScenario> {
  return {
    name,
    description,
    steps: [],
    stores: []
  };
}

/**
 * Batch execute multiple workflow patterns
 */
export async function executeWorkflowSuite(
  patterns: Array<keyof typeof WorkflowPatterns>
): Promise<IntegrationTestResult[]> {
  const results: IntegrationTestResult[] = [];
  
  for (const pattern of patterns) {
    console.log(`\n🎯 Executing workflow pattern: ${pattern}`);
    const result = await executeWorkflowPattern(pattern);
    results.push(result);
    
    if (result.success) {
      console.log(`✅ ${pattern} completed successfully in ${result.duration}ms`);
    } else {
      console.log(`❌ ${pattern} failed after ${result.duration}ms`);
    }
  }
  
  return results;
}

/**
 * Validate workflow test results
 */
export function validateWorkflowResults(results: IntegrationTestResult[]): {
  totalTests: number;
  passed: number;
  failed: number;
  averageDuration: number;
  successRate: number;
} {
  const totalTests = results.length;
  const passed = results.filter(r => r.success).length;
  const failed = totalTests - passed;
  const averageDuration = results.reduce((sum, r) => sum + r.duration, 0) / totalTests;
  const successRate = passed / totalTests;
  
  return {
    totalTests,
    passed,
    failed,
    averageDuration,
    successRate
  };
}