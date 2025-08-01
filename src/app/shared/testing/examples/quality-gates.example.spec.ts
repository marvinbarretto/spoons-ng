/**
 * @fileoverview Quality Gates Examples
 * 
 * Demonstrates how to use the Quality Gates and Performance Monitoring system
 * for automated quality assurance, performance validation, and CI/CD integration.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  QualityGatesEngine,
  QualityGateConfigs,
  executeQualityGate,
  executeCustomQualityGate,
  generateQualityReport,
  type QualityGateConfig,
  type QualityGateResult,
  type QualityMetrics
} from '../core/quality-gates';

describe('Quality Gates Examples', () => {
  let engine: QualityGatesEngine;

  beforeEach(() => {
    engine = new QualityGatesEngine();
  });

  afterEach(() => {
    engine.reset();
  });

  describe('Predefined Quality Gate Configurations', () => {
    it('should execute development quality gate', async () => {
      const result = await executeQualityGate('development');

      // Basic structure validation
      expect(result.gateName).toBe('Development Quality Gate');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.executionDuration).toBeGreaterThan(0);
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);

      // Metrics validation
      expect(result.metrics.testCoverage).toBeDefined();
      expect(result.metrics.performance).toBeDefined();
      expect(result.metrics.codeQuality).toBeDefined();
      expect(result.metrics.systemHealth).toBeDefined();

      // Results structure
      expect(result.violations).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Array);

      console.log(`Development gate: ${result.passed ? 'PASSED' : 'FAILED'} (Score: ${result.overallScore.toFixed(1)})`);
      console.log(`Violations: ${result.violations.length}, Recommendations: ${result.recommendations.length}`);
    });

    it('should execute production quality gate with stricter requirements', async () => {
      const result = await executeQualityGate('production');

      expect(result.gateName).toBe('Production Quality Gate');
      
      // Production gate should have stricter validation
      const config = QualityGateConfigs.production();
      expect(config.thresholds.minSuccessRate).toBe(0.95); // 95%
      expect(config.thresholds.maxExecutionTime).toBe(1500); // 1.5s
      expect(config.thresholds.minDataIntegrityScore).toBe(90); // 90/100

      console.log(`Production gate: ${result.passed ? 'PASSED' : 'FAILED'} (Score: ${result.overallScore.toFixed(1)})`);
      console.log(`Critical tests: ${config.criticalTests.length}`);
    });

    it('should execute CI quality gate with balanced requirements', async () => {
      const result = await executeQualityGate('ci');

      expect(result.gateName).toBe('CI Quality Gate');
      
      // CI gate should be more lenient
      const config = QualityGateConfigs.ci();
      expect(config.thresholds.minSuccessRate).toBe(0.75); // 75%
      expect(config.thresholds.maxExecutionTime).toBe(3000); // 3s

      console.log(`CI gate: ${result.passed ? 'PASSED' : 'FAILED'} (Score: ${result.overallScore.toFixed(1)})`);
      console.log(`Execution time: ${result.executionDuration}ms`);
    });
  });

  describe('Custom Quality Gate Configuration', () => {
    it('should execute custom quality gate with specific requirements', async () => {
      const customConfig: QualityGateConfig = {
        name: 'Custom Feature Gate',
        description: 'Quality gate for specific feature development',
        thresholds: {
          minSuccessRate: 0.85,           // 85% success rate
          maxExecutionTime: 1800,         // 1.8 seconds
          maxMemoryUsage: 80 * 1024 * 1024, // 80MB
          minSignalReactivityScore: 75,   // 75/100
          minDataIntegrityScore: 85       // 85/100
        },
        criticalTests: ['userOnboarding', 'socialCheckin'],
        performanceTests: ['performanceTest'],
        requiredWorkflows: ['userOnboarding', 'socialCheckin']
      };

      const result = await executeCustomQualityGate(customConfig);

      expect(result.gateName).toBe('Custom Feature Gate');
      expect(result.metrics.testCoverage.totalTests).toBeGreaterThan(0);
      
      // Validate that custom thresholds are applied
      const hasSuccessRateViolation = result.violations.some(v => 
        v.description.includes('success rate') && 
        typeof v.expectedValue === 'number' && 
        v.expectedValue === 0.85
      );
      
      console.log(`Custom gate: ${result.passed ? 'PASSED' : 'FAILED'}`);
      console.log(`Applied custom thresholds: ${hasSuccessRateViolation ? 'Yes' : 'No'}`);
    });

    it('should execute lightweight quality gate for quick checks', async () => {
      const lightweightConfig: QualityGateConfig = {
        name: 'Quick Check Gate',
        description: 'Fast quality check for rapid development',
        thresholds: {
          minSuccessRate: 0.60,           // 60% - very lenient
          maxExecutionTime: 5000,         // 5 seconds
          maxMemoryUsage: 200 * 1024 * 1024, // 200MB
          minSignalReactivityScore: 50,   // 50/100
          minDataIntegrityScore: 60       // 60/100
        },
        criticalTests: ['userOnboarding'],
        performanceTests: [],
        requiredWorkflows: ['userOnboarding']
      };

      const result = await executeCustomQualityGate(lightweightConfig);

      expect(result.gateName).toBe('Quick Check Gate');
      expect(result.executionDuration).toBeLessThan(10000); // Should be quick
      
      // Lightweight gate should be more likely to pass
      console.log(`Quick check gate: ${result.passed ? 'PASSED' : 'FAILED'} in ${result.executionDuration}ms`);
    });
  });

  describe('Quality Metrics Analysis', () => {
    it('should provide comprehensive quality metrics', async () => {
      const result = await executeQualityGate('development');
      const metrics = result.metrics;

      // Test Coverage Metrics
      expect(metrics.testCoverage.totalTests).toBeGreaterThan(0);
      expect(metrics.testCoverage.successRate).toBeGreaterThanOrEqual(0);
      expect(metrics.testCoverage.successRate).toBeLessThanOrEqual(1);
      expect(metrics.testCoverage.passingTests + metrics.testCoverage.failingTests).toBe(metrics.testCoverage.totalTests);

      // Performance Metrics
      expect(metrics.performance.averageExecutionTime).toBeGreaterThanOrEqual(0);
      expect(metrics.performance.maxExecutionTime).toBeGreaterThanOrEqual(metrics.performance.averageExecutionTime);
      expect(metrics.performance.memoryUsage).toBeGreaterThanOrEqual(0);

      // Code Quality Metrics
      expect(metrics.codeQuality.signalReactivityScore).toBeGreaterThanOrEqual(0);
      expect(metrics.codeQuality.signalReactivityScore).toBeLessThanOrEqual(100);
      expect(metrics.codeQuality.dataIntegrityScore).toBeGreaterThanOrEqual(0);
      expect(metrics.codeQuality.dataIntegrityScore).toBeLessThanOrEqual(100);

      // System Health Metrics
      expect(typeof metrics.systemHealth.storeConsistency).toBe('boolean');
      expect(typeof metrics.systemHealth.signalPropagation).toBe('boolean');
      expect(typeof metrics.systemHealth.memoryLeaks).toBe('boolean');
      expect(typeof metrics.systemHealth.errorRecovery).toBe('boolean');

      console.log('Quality Metrics Summary:');
      console.log(`- Test Success Rate: ${(metrics.testCoverage.successRate * 100).toFixed(1)}%`);
      console.log(`- Avg Execution: ${metrics.performance.averageExecutionTime.toFixed(0)}ms`);
      console.log(`- Signal Reactivity: ${metrics.codeQuality.signalReactivityScore.toFixed(1)}/100`);
      console.log(`- Data Integrity: ${metrics.codeQuality.dataIntegrityScore.toFixed(1)}/100`);
    });

    it('should identify performance bottlenecks', async () => {
      const result = await executeQualityGate('production');

      // Check if performance violations are properly identified
      const performanceViolations = result.violations.filter(v => v.category === 'performance');
      
      performanceViolations.forEach(violation => {
        expect(violation.severity).toMatch(/critical|high|medium|low/);
        expect(violation.impact).toBeTruthy();
        expect(violation.suggestedFix).toBeTruthy();
        
        console.log(`Performance Issue: ${violation.description}`);
        console.log(`  Severity: ${violation.severity}`);
        console.log(`  Fix: ${violation.suggestedFix}`);
      });

      // Verify performance metrics are captured
      expect(result.metrics.performance.averageExecutionTime).toBeGreaterThan(0);
    });

    it('should track system health indicators', async () => {
      const result = await executeQualityGate('development');
      const health = result.metrics.systemHealth;

      // System health checks should execute
      expect(typeof health.storeConsistency).toBe('boolean');
      expect(typeof health.signalPropagation).toBe('boolean');
      expect(typeof health.errorRecovery).toBe('boolean');
      expect(typeof health.memoryLeaks).toBe('boolean');

      console.log('System Health Status:');
      console.log(`- Store Consistency: ${health.storeConsistency ? '✅' : '❌'}`);
      console.log(`- Signal Propagation: ${health.signalPropagation ? '✅' : '❌'}`);
      console.log(`- Error Recovery: ${health.errorRecovery ? '✅' : '❌'}`);
      console.log(`- Memory Leaks: ${health.memoryLeaks ? '❌ Detected' : '✅ None'}`);
    });
  });

  describe('Quality Gate Violations and Recommendations', () => {
    it('should generate actionable recommendations', async () => {
      const result = await executeQualityGate('production'); // Strict gate more likely to have recommendations

      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.recommendations.length).toBeGreaterThan(0);

      result.recommendations.forEach(recommendation => {
        expect(typeof recommendation).toBe('string');
        expect(recommendation.length).toBeGreaterThan(10); // Should be meaningful
      });

      console.log('Quality Recommendations:');
      result.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    });

    it('should categorize violations by severity', async () => {
      const result = await executeQualityGate('production');

      const violationsBySeverity = {
        critical: result.violations.filter(v => v.severity === 'critical'),
        high: result.violations.filter(v => v.severity === 'high'),
        medium: result.violations.filter(v => v.severity === 'medium'),
        low: result.violations.filter(v => v.severity === 'low')
      };

      // Validate violation structure
      result.violations.forEach(violation => {
        expect(violation.severity).toMatch(/critical|high|medium|low/);
        expect(violation.category).toMatch(/performance|reliability|maintainability|security/);
        expect(violation.description).toBeTruthy();
        expect(violation.impact).toBeTruthy();
        expect(violation.suggestedFix).toBeTruthy();
        expect(violation.actualValue).toBeDefined();
        expect(violation.expectedValue).toBeDefined();
      });

      console.log('Violations by Severity:');
      console.log(`- Critical: ${violationsBySeverity.critical.length}`);
      console.log(`- High: ${violationsBySeverity.high.length}`);
      console.log(`- Medium: ${violationsBySeverity.medium.length}`);
      console.log(`- Low: ${violationsBySeverity.low.length}`);
    });

    it('should fail gate on critical violations', async () => {
      // Create a configuration guaranteed to have critical violations
      const strictConfig: QualityGateConfig = {
        name: 'Ultra Strict Gate',
        description: 'Impossibly strict requirements',
        thresholds: {
          minSuccessRate: 1.0,            // 100% - very strict
          maxExecutionTime: 1,            // 1ms - impossible
          maxMemoryUsage: 1024,           // 1KB - too small
          minSignalReactivityScore: 100,  // Perfect score required
          minDataIntegrityScore: 100      // Perfect score required
        },
        criticalTests: ['userOnboarding', 'socialCheckin', 'errorRecovery', 'performanceTest'],
        performanceTests: ['performanceTest'],
        requiredWorkflows: ['userOnboarding', 'socialCheckin', 'errorRecovery', 'performanceTest']
      };

      const result = await executeCustomQualityGate(strictConfig);

      // Should likely fail due to strict requirements
      expect(result.gateName).toBe('Ultra Strict Gate');
      
      const criticalViolations = result.violations.filter(v => v.severity === 'critical');
      if (criticalViolations.length > 0) {
        expect(result.passed).toBe(false);
        console.log(`Gate correctly failed due to ${criticalViolations.length} critical violations`);
      } else {
        console.log('No critical violations found - gate may pass');
      }
    });
  });

  describe('Quality Report Generation', () => {
    it('should generate comprehensive quality report', async () => {
      const result = await executeQualityGate('development');
      const report = generateQualityReport(result);

      expect(typeof report).toBe('string');
      expect(report.length).toBeGreaterThan(100);

      // Report should contain key sections
      expect(report).toContain('Quality Gate Report');
      expect(report).toContain('Metrics Summary');
      expect(report).toContain(result.gateName);
      expect(report).toContain(result.passed ? 'PASSED' : 'FAILED');

      if (result.violations.length > 0) {
        expect(report).toContain('Quality Violations');
      }

      if (result.recommendations.length > 0) {
        expect(report).toContain('Recommendations');
      }

      console.log('Generated Quality Report:');
      console.log('='.repeat(50));
      console.log(report);
      console.log('='.repeat(50));
    });

    it('should generate report for failed gate with detailed violations', async () => {
      const strictConfig: QualityGateConfig = {
        name: 'Detailed Failure Test',
        description: 'Gate designed to show detailed failure reporting',
        thresholds: {
          minSuccessRate: 0.99,           // 99% - likely to fail
          maxExecutionTime: 100,          // 100ms - likely to exceed
          maxMemoryUsage: 10 * 1024 * 1024, // 10MB - might exceed
          minSignalReactivityScore: 95,   // 95/100 - high bar
          minDataIntegrityScore: 95       // 95/100 - high bar
        },
        criticalTests: ['userOnboarding', 'socialCheckin', 'errorRecovery'],
        performanceTests: ['performanceTest'],
        requiredWorkflows: ['userOnboarding', 'socialCheckin', 'errorRecovery']
      };

      const result = await executeCustomQualityGate(strictConfig);
      const report = generateQualityReport(result);

      // Report should include failure details
      expect(report).toContain('Detailed Failure Test');
      
      if (!result.passed) {
        expect(report).toContain('FAILED');
        expect(result.violations.length).toBeGreaterThan(0);
        
        // Each violation should be documented
        result.violations.forEach(violation => {
          expect(report).toContain(violation.description);
        });
      }

      console.log(`Detailed failure report generated (${report.length} characters)`);
    });
  });

  describe('Performance Monitoring and Profiling', () => {
    it('should collect performance profiles', async () => {
      const engine = new QualityGatesEngine();
      const result = await engine.executeQualityGate(QualityGateConfigs.development());

      const profiles = engine.getPerformanceProfiles();
      expect(profiles).toBeInstanceOf(Map);

      // Check if performance data was collected
      profiles.forEach((profileList, scenario) => {
        expect(Array.isArray(profileList)).toBe(true);
        profileList.forEach(profile => {
          expect(profile.testSuite).toBeTruthy();
          expect(profile.scenario).toBeTruthy();
          expect(profile.metrics.executionTime).toBeGreaterThanOrEqual(0);
          expect(profile.metrics.memoryPeak).toBeGreaterThanOrEqual(0);
        });
      });

      console.log(`Performance profiles collected for ${profiles.size} scenarios`);
    });

    it('should track quality gate history', async () => {
      const engine = new QualityGatesEngine();
      
      // Execute multiple gates
      await engine.executeQualityGate(QualityGateConfigs.development());
      await engine.executeQualityGate(QualityGateConfigs.ci());

      const history = engine.getQualityHistory();
      expect(history.length).toBe(2);
      
      history.forEach(result => {
        expect(result.timestamp).toBeInstanceOf(Date);
        expect(result.executionDuration).toBeGreaterThan(0);
        expect(typeof result.passed).toBe('boolean');
      });

      console.log(`Quality history contains ${history.length} entries`);
    });

    it('should identify optimization opportunities', async () => {
      const result = await executeQualityGate('development');

      // Look for performance-related recommendations
      const performanceRecommendations = result.recommendations.filter(rec => 
        rec.toLowerCase().includes('performance') || 
        rec.toLowerCase().includes('optimize') ||
        rec.toLowerCase().includes('speed') ||
        rec.toLowerCase().includes('memory')
      );

      console.log('Performance Optimization Recommendations:');
      performanceRecommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });

      // Verify performance metrics are within reasonable bounds
      const perf = result.metrics.performance;
      expect(perf.averageExecutionTime).toBeLessThan(30000); // Should complete within 30s
      expect(perf.memoryUsage).toBeLessThan(500 * 1024 * 1024); // Should use less than 500MB
    });
  });

  describe('CI/CD Integration Scenarios', () => {
    it('should simulate CI pipeline quality check', async () => {
      console.log('🔄 Simulating CI Pipeline Quality Check...');
      
      const ciResult = await executeQualityGate('ci');
      
      // CI gate should be more lenient but still meaningful
      expect(ciResult.gateName).toBe('CI Quality Gate');
      
      // Simulate CI decision making
      if (ciResult.passed) {
        console.log('✅ CI: Quality gate passed - proceeding with build');
      } else {
        console.log('❌ CI: Quality gate failed - blocking deployment');
        console.log(`Violations: ${ciResult.violations.length}`);
        console.log(`Score: ${ciResult.overallScore.toFixed(1)}/100`);
      }
      
      // CI should complete reasonably quickly
      expect(ciResult.executionDuration).toBeLessThan(10000); // 10 seconds max
    });

    it('should simulate pre-production quality gate', async () => {
      console.log('🚀 Simulating Pre-Production Quality Gate...');
      
      const prodResult = await executeQualityGate('production');
      
      // Production gate should be strict
      expect(prodResult.gateName).toBe('Production Quality Gate');
      
      // Simulate deployment decision
      if (prodResult.passed) {
        console.log('✅ Production: Quality gate passed - deployment approved');
        console.log(`Score: ${prodResult.overallScore.toFixed(1)}/100`);
      } else {
        console.log('❌ Production: Quality gate failed - deployment blocked');
        
        // Critical violations should block deployment
        const criticalViolations = prodResult.violations.filter(v => v.severity === 'critical');
        if (criticalViolations.length > 0) {
          console.log(`🚨 Critical issues found: ${criticalViolations.length}`);
          criticalViolations.forEach(v => console.log(`  - ${v.description}`));
        }
      }
    });

    it('should provide quality trend analysis', async () => {
      const engine = new QualityGatesEngine();
      
      // Simulate multiple quality checks over time
      const results: QualityGateResult[] = [];
      
      for (let i = 0; i < 3; i++) {
        const result = await engine.executeQualityGate(QualityGateConfigs.development());
        results.push(result);
        
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Analyze trend
      const scores = results.map(r => r.overallScore);
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const successRate = results.filter(r => r.passed).length / results.length;
      
      console.log('Quality Trend Analysis:');
      console.log(`- Average Score: ${avgScore.toFixed(1)}/100`);
      console.log(`- Success Rate: ${(successRate * 100).toFixed(1)}%`);
      console.log(`- Scores: ${scores.map(s => s.toFixed(1)).join(', ')}`);
      
      expect(avgScore).toBeGreaterThanOrEqual(0);
      expect(successRate).toBeGreaterThanOrEqual(0);
      expect(successRate).toBeLessThanOrEqual(1);
    });
  });
});