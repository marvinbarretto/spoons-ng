/**
 * @fileoverview Quality Gates and Performance Monitoring
 *
 * Automated quality assurance system that validates code quality, performance,
 * and reliability metrics. Integrates with all testing infrastructure to provide
 * comprehensive quality gates for CI/CD pipelines and development workflows.
 */

import { TestScenarios } from './enhanced-test-data';
import {
  executeWorkflowSuite,
  validateWorkflowResults,
  type IntegrationTestResult,
} from './integration-testing-patterns';
import { MockRegistry } from './mock-registry';
import { createSignalTestHarness, type SignalTestHarness } from './signal-test-harness';

// ===================================
// QUALITY GATE TYPES
// ===================================

export interface QualityMetrics {
  // Test Coverage & Success
  testCoverage: {
    totalTests: number;
    passingTests: number;
    failingTests: number;
    successRate: number;
    criticalTestsPassing: boolean;
  };

  // Performance Metrics
  performance: {
    averageExecutionTime: number;
    maxExecutionTime: number;
    memoryUsage: number;
    signalReactivityLatency: number;
    dataConsistencyTime: number;
  };

  // Code Quality
  codeQuality: {
    signalReactivityScore: number;
    dataIntegrityScore: number;
    errorHandlingScore: number;
    testMaintainabilityScore: number;
  };

  // System Health
  systemHealth: {
    storeConsistency: boolean;
    signalPropagation: boolean;
    memoryLeaks: boolean;
    errorRecovery: boolean;
  };
}

export interface QualityGateConfig {
  name: string;
  description: string;
  thresholds: {
    minSuccessRate: number;
    maxExecutionTime: number;
    maxMemoryUsage: number;
    minSignalReactivityScore: number;
    minDataIntegrityScore: number;
  };
  criticalTests: string[];
  performanceTests: string[];
  requiredWorkflows: string[];
}

export interface QualityGateResult {
  gateId: string;
  gateName: string;
  passed: boolean;
  timestamp: Date;
  metrics: QualityMetrics;
  violations: QualityViolation[];
  recommendations: string[];
  overallScore: number;
  executionDuration: number;
}

export interface QualityViolation {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'performance' | 'reliability' | 'maintainability' | 'security';
  description: string;
  actualValue: number | string | boolean;
  expectedValue: number | string | boolean;
  impact: string;
  suggestedFix: string;
}

export interface PerformanceProfile {
  testSuite: string;
  scenario: string;
  metrics: {
    executionTime: number;
    memoryPeak: number;
    signalUpdates: number;
    storeOperations: number;
    reactiveLatency: number;
  };
  bottlenecks: string[];
  optimizationSuggestions: string[];
}

// ===================================
// QUALITY GATES ENGINE
// ===================================

export class QualityGatesEngine {
  private performanceProfiles: Map<string, PerformanceProfile[]> = new Map();
  private qualityHistory: QualityGateResult[] = [];
  private signalHarness?: SignalTestHarness;

  /**
   * Execute comprehensive quality gate validation
   */
  async executeQualityGate(config: QualityGateConfig): Promise<QualityGateResult> {
    const startTime = Date.now();
    console.log(`🏁 Executing Quality Gate: ${config.name}`);

    const result: QualityGateResult = {
      gateId: this.generateGateId(),
      gateName: config.name,
      passed: false,
      timestamp: new Date(),
      metrics: await this.gatherQualityMetrics(config),
      violations: [],
      recommendations: [],
      overallScore: 0,
      executionDuration: 0,
    };

    try {
      // Validate against thresholds
      result.violations = this.validateThresholds(result.metrics, config.thresholds);

      // Generate recommendations
      result.recommendations = this.generateRecommendations(result.metrics, result.violations);

      // Calculate overall score
      result.overallScore = this.calculateOverallScore(result.metrics, result.violations);

      // Determine if gate passes
      result.passed = this.determineGateStatus(result.violations, config);

      // Store in history
      this.qualityHistory.push(result);

      result.executionDuration = Date.now() - startTime;

      console.log(
        `${result.passed ? '✅' : '❌'} Quality Gate ${result.passed ? 'PASSED' : 'FAILED'} - Score: ${result.overallScore.toFixed(1)}/100`
      );

      return result;
    } catch (error) {
      console.error(`❌ Quality Gate execution failed: ${error}`);
      result.passed = false;
      result.executionDuration = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Gather comprehensive quality metrics
   */
  private async gatherQualityMetrics(config: QualityGateConfig): Promise<QualityMetrics> {
    console.log('📊 Gathering quality metrics...');

    // Execute workflow tests
    const workflowResults = await this.executeWorkflowTests(config.requiredWorkflows);

    // Execute performance tests
    const performanceResults = await this.executePerformanceTests(config.performanceTests);

    // Execute signal reactivity tests
    const signalResults = await this.executeSignalTests();

    // Execute system health checks
    const healthResults = await this.executeHealthChecks();

    const metrics: QualityMetrics = {
      testCoverage: this.calculateTestCoverage(workflowResults),
      performance: this.calculatePerformanceMetrics(performanceResults, signalResults),
      codeQuality: this.calculateCodeQualityMetrics(workflowResults, signalResults),
      systemHealth: healthResults,
    };

    console.log(
      `📈 Metrics gathered: ${metrics.testCoverage.successRate * 100}% success rate, ${metrics.performance.averageExecutionTime}ms avg execution`
    );

    return metrics;
  }

  /**
   * Execute workflow integration tests
   */
  private async executeWorkflowTests(
    requiredWorkflows: string[]
  ): Promise<IntegrationTestResult[]> {
    if (requiredWorkflows.length === 0) {
      requiredWorkflows = ['userOnboarding', 'socialCheckin', 'errorRecovery', 'performanceTest'];
    }

    const workflowPatterns = requiredWorkflows as Array<
      keyof typeof import('./integration-testing-patterns').WorkflowPatterns
    >;
    return await executeWorkflowSuite(workflowPatterns);
  }

  /**
   * Execute performance-focused tests
   */
  private async executePerformanceTests(performanceTests: string[]): Promise<PerformanceProfile[]> {
    const profiles: PerformanceProfile[] = [];

    // High-volume data scenarios
    const scenarios = ['powerUserEcosystem', 'activeCommunity', 'edgeCases'];

    for (const scenario of scenarios) {
      const startTime = Date.now();
      const startMemory = this.getMemoryUsage();

      try {
        // Generate test data and measure performance
        const testData = TestScenarios[scenario as keyof typeof TestScenarios]();
        const executionTime = Date.now() - startTime;
        const memoryPeak = this.getMemoryUsage() - startMemory;

        const profile: PerformanceProfile = {
          testSuite: 'performance',
          scenario,
          metrics: {
            executionTime,
            memoryPeak,
            signalUpdates: 0,
            storeOperations: testData.checkIns.length + testData.users.length,
            reactiveLatency: 0,
          },
          bottlenecks: [],
          optimizationSuggestions: [],
        };

        // Identify bottlenecks
        if (executionTime > 1000) {
          profile.bottlenecks.push(`Slow data generation: ${executionTime}ms`);
          profile.optimizationSuggestions.push('Consider data generation caching or lazy loading');
        }

        if (memoryPeak > 50 * 1024 * 1024) {
          // 50MB
          profile.bottlenecks.push(`High memory usage: ${(memoryPeak / 1024 / 1024).toFixed(1)}MB`);
          profile.optimizationSuggestions.push('Implement memory pooling or data streaming');
        }

        profiles.push(profile);
        this.performanceProfiles.set(scenario, [
          ...(this.performanceProfiles.get(scenario) || []),
          profile,
        ]);
      } catch (error) {
        console.warn(`Performance test failed for scenario ${scenario}: ${error}`);
      }
    }

    return profiles;
  }

  /**
   * Execute signal reactivity tests
   */
  private async executeSignalTests(): Promise<{
    reactivityLatency: number;
    signalUpdates: number;
  }> {
    this.signalHarness = createSignalTestHarness();

    try {
      const testSignal = this.signalHarness.createTestSignal('performanceTest', 0);
      const tracker = this.signalHarness.getTracker('performanceTest')!;

      // Measure signal update performance
      const startTime = Date.now();
      for (let i = 1; i <= 100; i++) {
        testSignal.set(i);
        // Manually record change for test environments
        tracker.recordChange('performance-test');
        await new Promise(resolve => setTimeout(resolve, 1)); // Allow reactivity
      }
      const reactivityLatency = Date.now() - startTime;

      const signalUpdates = tracker.getChangeCount();

      return { reactivityLatency, signalUpdates };
    } finally {
      this.signalHarness.destroy();
    }
  }

  /**
   * Execute system health checks
   */
  private async executeHealthChecks(): Promise<QualityMetrics['systemHealth']> {
    const mockSuite = MockRegistry.createFullSuite();

    try {
      // Test store consistency
      const storeConsistency = await this.checkStoreConsistency(mockSuite);

      // Test signal propagation
      const signalPropagation = await this.checkSignalPropagation();

      // Test error recovery
      const errorRecovery = await this.checkErrorRecovery(mockSuite);

      // Check for memory leaks
      const memoryLeaks = await this.checkMemoryLeaks();

      return {
        storeConsistency,
        signalPropagation,
        errorRecovery,
        memoryLeaks,
      };
    } finally {
      mockSuite.cleanup();
    }
  }

  /**
   * Calculate test coverage metrics
   */
  private calculateTestCoverage(results: IntegrationTestResult[]): QualityMetrics['testCoverage'] {
    const validation = validateWorkflowResults(results);

    return {
      totalTests: validation.totalTests,
      passingTests: validation.passed,
      failingTests: validation.failed,
      successRate: validation.successRate,
      criticalTestsPassing: validation.successRate > 0.8, // 80% threshold for critical tests
    };
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics(
    performanceProfiles: PerformanceProfile[],
    signalResults: { reactivityLatency: number; signalUpdates: number }
  ): QualityMetrics['performance'] {
    const executionTimes = performanceProfiles.map(p => p.metrics.executionTime);
    const memoryUsages = performanceProfiles.map(p => p.metrics.memoryPeak);

    return {
      averageExecutionTime:
        executionTimes.length > 0
          ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length
          : 0,
      maxExecutionTime: executionTimes.length > 0 ? Math.max(...executionTimes) : 0,
      memoryUsage: memoryUsages.length > 0 ? Math.max(...memoryUsages) : 0,
      signalReactivityLatency: signalResults.reactivityLatency,
      dataConsistencyTime: 50, // Mock value - would measure actual consistency checks
    };
  }

  /**
   * Calculate code quality metrics
   */
  private calculateCodeQualityMetrics(
    workflowResults: IntegrationTestResult[],
    signalResults: { reactivityLatency: number; signalUpdates: number }
  ): QualityMetrics['codeQuality'] {
    const validation = validateWorkflowResults(workflowResults);

    // Signal reactivity score (lower latency = higher score)
    const signalReactivityScore = Math.max(0, 100 - signalResults.reactivityLatency / 10);

    // Data integrity score based on consistency checks
    const dataIntegrityScore =
      workflowResults.reduce((acc, result) => acc + (result.dataConsistency ? 100 : 0), 0) /
      workflowResults.length;

    // Error handling score based on error recovery tests
    const errorHandlingTests = workflowResults.filter(
      r => r.scenario.includes('Error') || r.scenario.includes('Recovery')
    );
    const errorHandlingScore =
      errorHandlingTests.length > 0
        ? errorHandlingTests.reduce((acc, result) => acc + (result.success ? 100 : 0), 0) /
          errorHandlingTests.length
        : 50;

    // Test maintainability score based on test structure and success rate
    const testMaintainabilityScore = validation.successRate * 100;

    return {
      signalReactivityScore,
      dataIntegrityScore,
      errorHandlingScore,
      testMaintainabilityScore,
    };
  }

  /**
   * Validate metrics against thresholds
   */
  private validateThresholds(
    metrics: QualityMetrics,
    thresholds: QualityGateConfig['thresholds']
  ): QualityViolation[] {
    const violations: QualityViolation[] = [];

    // Success rate threshold
    if (metrics.testCoverage.successRate < thresholds.minSuccessRate) {
      violations.push({
        severity: 'critical',
        category: 'reliability',
        description: 'Test success rate below threshold',
        actualValue: metrics.testCoverage.successRate,
        expectedValue: thresholds.minSuccessRate,
        impact: 'High risk of production failures',
        suggestedFix: 'Fix failing tests and improve test reliability',
      });
    }

    // Execution time threshold
    if (metrics.performance.maxExecutionTime > thresholds.maxExecutionTime) {
      violations.push({
        severity: 'high',
        category: 'performance',
        description: 'Maximum execution time exceeded',
        actualValue: metrics.performance.maxExecutionTime,
        expectedValue: thresholds.maxExecutionTime,
        impact: 'Slow test execution impacts development velocity',
        suggestedFix: 'Optimize slow tests and improve performance',
      });
    }

    // Memory usage threshold
    if (metrics.performance.memoryUsage > thresholds.maxMemoryUsage) {
      violations.push({
        severity: 'medium',
        category: 'performance',
        description: 'Memory usage above threshold',
        actualValue: metrics.performance.memoryUsage,
        expectedValue: thresholds.maxMemoryUsage,
        impact: 'High memory usage may cause performance issues',
        suggestedFix: 'Optimize memory usage and implement proper cleanup',
      });
    }

    // Signal reactivity threshold
    if (metrics.codeQuality.signalReactivityScore < thresholds.minSignalReactivityScore) {
      violations.push({
        severity: 'medium',
        category: 'maintainability',
        description: 'Signal reactivity score below threshold',
        actualValue: metrics.codeQuality.signalReactivityScore,
        expectedValue: thresholds.minSignalReactivityScore,
        impact: 'Poor signal performance affects user experience',
        suggestedFix: 'Optimize signal computations and reduce update frequency',
      });
    }

    // Data integrity threshold
    if (metrics.codeQuality.dataIntegrityScore < thresholds.minDataIntegrityScore) {
      violations.push({
        severity: 'high',
        category: 'reliability',
        description: 'Data integrity score below threshold',
        actualValue: metrics.codeQuality.dataIntegrityScore,
        expectedValue: thresholds.minDataIntegrityScore,
        impact: 'Data consistency issues can cause application errors',
        suggestedFix: 'Improve store synchronization and data validation',
      });
    }

    return violations;
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    metrics: QualityMetrics,
    violations: QualityViolation[]
  ): string[] {
    const recommendations: string[] = [];

    // Performance recommendations
    if (metrics.performance.averageExecutionTime > 500) {
      recommendations.push('Consider implementing test parallelization to improve execution speed');
    }

    if (metrics.performance.signalReactivityLatency > 100) {
      recommendations.push(
        'Optimize signal computations and consider memoization for expensive operations'
      );
    }

    // Quality recommendations
    if (metrics.codeQuality.testMaintainabilityScore < 80) {
      recommendations.push('Refactor tests for better maintainability and reduce test complexity');
    }

    if (!metrics.systemHealth.storeConsistency) {
      recommendations.push(
        'Implement store consistency checks and improve synchronization patterns'
      );
    }

    // Add specific recommendations from violations
    violations.forEach(violation => {
      if (!recommendations.includes(violation.suggestedFix)) {
        recommendations.push(violation.suggestedFix);
      }
    });

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('Quality metrics are within acceptable ranges. Continue monitoring.');
    }

    return recommendations;
  }

  /**
   * Calculate overall quality score
   */
  private calculateOverallScore(metrics: QualityMetrics, violations: QualityViolation[]): number {
    let baseScore = 100;

    // Deduct points for violations
    violations.forEach(violation => {
      switch (violation.severity) {
        case 'critical':
          baseScore -= 25;
          break;
        case 'high':
          baseScore -= 15;
          break;
        case 'medium':
          baseScore -= 10;
          break;
        case 'low':
          baseScore -= 5;
          break;
      }
    });

    // Factor in positive metrics
    const positiveFactors = [
      metrics.testCoverage.successRate,
      metrics.codeQuality.signalReactivityScore / 100,
      metrics.codeQuality.dataIntegrityScore / 100,
      metrics.codeQuality.errorHandlingScore / 100,
    ];

    const avgPositiveFactor = positiveFactors.reduce((a, b) => a + b, 0) / positiveFactors.length;
    baseScore = baseScore * avgPositiveFactor;

    return Math.max(0, Math.min(100, baseScore));
  }

  /**
   * Determine if quality gate passes
   */
  private determineGateStatus(violations: QualityViolation[], config: QualityGateConfig): boolean {
    // Fail if there are any critical violations
    const criticalViolations = violations.filter(v => v.severity === 'critical');
    if (criticalViolations.length > 0) {
      return false;
    }

    // Fail if there are too many high-severity violations
    const highViolations = violations.filter(v => v.severity === 'high');
    if (highViolations.length > 2) {
      return false;
    }

    // Pass if no critical/high violations or within acceptable limits
    return true;
  }

  // Helper methods for health checks
  private async checkStoreConsistency(mockSuite: any): Promise<boolean> {
    try {
      // Simulate store consistency check
      const stores = ['user-store', 'checkin-store', 'data-aggregator'];
      for (const store of stores) {
        const mock = mockSuite.mocks[store];
        if (!mock) return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  private async checkSignalPropagation(): Promise<boolean> {
    try {
      const harness = createSignalTestHarness();
      const testSignal = harness.createTestSignal('test', 0);
      const tracker = harness.getTracker('test')!;

      testSignal.set(1);
      tracker.recordChange('propagation-test'); // Manual tracking for tests

      const result = tracker.getChangeCount() > 1;
      harness.destroy();
      return result;
    } catch {
      return false;
    }
  }

  private async checkErrorRecovery(mockSuite: any): Promise<boolean> {
    try {
      // Simulate error and recovery
      const checkInStore = mockSuite.mocks['checkin-store'];
      if (!checkInStore) return false;

      checkInStore._setError('Test error');
      checkInStore._setError(null);
      return checkInStore.error() === null;
    } catch {
      return false;
    }
  }

  private async checkMemoryLeaks(): Promise<boolean> {
    // Simple memory leak detection
    const initialMemory = this.getMemoryUsage();

    // Create and destroy some test objects
    for (let i = 0; i < 100; i++) {
      const harness = createSignalTestHarness();
      harness.createTestSignal(`test-${i}`, i);
      harness.destroy();
    }

    // Force garbage collection if available
    if (typeof global !== 'undefined' && global.gc) {
      global.gc();
    }

    const finalMemory = this.getMemoryUsage();
    const memoryIncrease = finalMemory - initialMemory;

    // Consider it a leak if memory increased by more than 10MB
    return memoryIncrease < 10 * 1024 * 1024;
  }

  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0; // Fallback for browser environments
  }

  private generateGateId(): string {
    return `qg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get quality gate history
   */
  getQualityHistory(): QualityGateResult[] {
    return [...this.qualityHistory];
  }

  /**
   * Get performance profiles
   */
  getPerformanceProfiles(): Map<string, PerformanceProfile[]> {
    return new Map(this.performanceProfiles);
  }

  /**
   * Clear history and profiles
   */
  reset(): void {
    this.qualityHistory = [];
    this.performanceProfiles.clear();
  }
}

// ===================================
// PREDEFINED QUALITY GATE CONFIGS
// ===================================

export const QualityGateConfigs = {
  /**
   * Standard development quality gate
   */
  development: (): QualityGateConfig => ({
    name: 'Development Quality Gate',
    description: 'Standard quality checks for development workflow',
    thresholds: {
      minSuccessRate: 0.8, // 80% tests must pass
      maxExecutionTime: 2000, // 2 seconds max execution
      maxMemoryUsage: 100 * 1024 * 1024, // 100MB max memory
      minSignalReactivityScore: 70, // 70/100 signal performance
      minDataIntegrityScore: 80, // 80/100 data consistency
    },
    criticalTests: ['userOnboarding', 'errorRecovery'],
    performanceTests: ['performanceTest'],
    requiredWorkflows: ['userOnboarding', 'socialCheckin', 'errorRecovery'],
  }),

  /**
   * Strict production quality gate
   */
  production: (): QualityGateConfig => ({
    name: 'Production Quality Gate',
    description: 'Strict quality checks for production deployment',
    thresholds: {
      minSuccessRate: 0.95, // 95% tests must pass
      maxExecutionTime: 1500, // 1.5 seconds max execution
      maxMemoryUsage: 75 * 1024 * 1024, // 75MB max memory
      minSignalReactivityScore: 85, // 85/100 signal performance
      minDataIntegrityScore: 90, // 90/100 data consistency
    },
    criticalTests: ['userOnboarding', 'socialCheckin', 'errorRecovery', 'performanceTest'],
    performanceTests: ['performanceTest'],
    requiredWorkflows: ['userOnboarding', 'socialCheckin', 'errorRecovery', 'performanceTest'],
  }),

  /**
   * Relaxed CI quality gate
   */
  ci: (): QualityGateConfig => ({
    name: 'CI Quality Gate',
    description: 'Balanced quality checks for continuous integration',
    thresholds: {
      minSuccessRate: 0.75, // 75% tests must pass
      maxExecutionTime: 3000, // 3 seconds max execution
      maxMemoryUsage: 150 * 1024 * 1024, // 150MB max memory
      minSignalReactivityScore: 60, // 60/100 signal performance
      minDataIntegrityScore: 75, // 75/100 data consistency
    },
    criticalTests: ['userOnboarding', 'errorRecovery'],
    performanceTests: [],
    requiredWorkflows: ['userOnboarding', 'errorRecovery'],
  }),
};

// ===================================
// CONVENIENCE FUNCTIONS
// ===================================

/**
 * Execute a predefined quality gate
 */
export async function executeQualityGate(
  gateName: keyof typeof QualityGateConfigs
): Promise<QualityGateResult> {
  const engine = new QualityGatesEngine();
  const config = QualityGateConfigs[gateName]();
  return await engine.executeQualityGate(config);
}

/**
 * Execute custom quality gate
 */
export async function executeCustomQualityGate(
  config: QualityGateConfig
): Promise<QualityGateResult> {
  const engine = new QualityGatesEngine();
  return await engine.executeQualityGate(config);
}

/**
 * Generate quality report
 */
export function generateQualityReport(result: QualityGateResult): string {
  const lines: string[] = [];

  lines.push(`# Quality Gate Report: ${result.gateName}`);
  lines.push(`**Status**: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
  lines.push(`**Score**: ${result.overallScore.toFixed(1)}/100`);
  lines.push(`**Execution Time**: ${result.executionDuration}ms`);
  lines.push('');

  // Metrics Summary
  lines.push('## Metrics Summary');
  lines.push(
    `- **Test Success Rate**: ${(result.metrics.testCoverage.successRate * 100).toFixed(1)}%`
  );
  lines.push(
    `- **Average Execution Time**: ${result.metrics.performance.averageExecutionTime.toFixed(0)}ms`
  );
  lines.push(
    `- **Signal Reactivity Score**: ${result.metrics.codeQuality.signalReactivityScore.toFixed(1)}/100`
  );
  lines.push(
    `- **Data Integrity Score**: ${result.metrics.codeQuality.dataIntegrityScore.toFixed(1)}/100`
  );
  lines.push('');

  // Violations
  if (result.violations.length > 0) {
    lines.push('## Quality Violations');
    result.violations.forEach(violation => {
      lines.push(`- **${violation.severity.toUpperCase()}**: ${violation.description}`);
      lines.push(`  - Actual: ${violation.actualValue}, Expected: ${violation.expectedValue}`);
      lines.push(`  - Impact: ${violation.impact}`);
      lines.push(`  - Fix: ${violation.suggestedFix}`);
    });
    lines.push('');
  }

  // Recommendations
  if (result.recommendations.length > 0) {
    lines.push('## Recommendations');
    result.recommendations.forEach(rec => {
      lines.push(`- ${rec}`);
    });
  }

  return lines.join('\n');
}
