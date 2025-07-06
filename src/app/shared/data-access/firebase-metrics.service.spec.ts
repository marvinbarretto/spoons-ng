import { TestBed } from '@angular/core/testing';
import { FirebaseMetricsService, FirebaseOperation } from './firebase-metrics.service';

describe('FirebaseMetricsService', () => {
  let service: FirebaseMetricsService;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FirebaseMetricsService);
    
    // Spy on console.log to test logging
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('trackCall', () => {
    it('should track basic operation without options', () => {
      service.trackCall('read', 'users');
      
      const summary = service.getSessionSummary();
      expect(summary.totalCalls).toBe(1);
      expect(summary.operationBreakdown.read).toBe(1);
      expect(summary.breakdown['read:users']).toBe(1);
    });

    it('should track operation with full options', () => {
      service.trackCall('read', 'users', 'getAll', {
        documentId: 'user123',
        latency: 45,
        cached: true,
        error: 'permission-denied',
        retryAttempt: 2
      });
      
      const recentOps = service.getRecentOperations(1);
      expect(recentOps).toHaveLength(1);
      expect(recentOps[0].operation).toBe('read');
      expect(recentOps[0].collection).toBe('users');
      expect(recentOps[0].documentId).toBe('user123');
      expect(recentOps[0].latency).toBe(45);
      expect(recentOps[0].cached).toBe(true);
      expect(recentOps[0].error).toBe('permission-denied');
      expect(recentOps[0].retryAttempt).toBe(2);
    });

    it('should log operation details', () => {
      service.trackCall('write', 'posts', 'create', {
        latency: 120,
        cached: false
      });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔥 [FirebaseMetrics] WRITE posts')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('120.0ms')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('create')
      );
    });

    it('should increment operation counters correctly', () => {
      service.trackCall('read', 'users');
      service.trackCall('read', 'posts');
      service.trackCall('write', 'users');
      service.trackCall('delete', 'posts');
      
      const summary = service.getSessionSummary();
      expect(summary.totalCalls).toBe(4);
      expect(summary.operationBreakdown.read).toBe(2);
      expect(summary.operationBreakdown.write).toBe(1);
      expect(summary.operationBreakdown.delete).toBe(1);
      expect(summary.breakdown['read:users']).toBe(1);
      expect(summary.breakdown['read:posts']).toBe(1);
      expect(summary.breakdown['write:users']).toBe(1);
      expect(summary.breakdown['delete:posts']).toBe(1);
    });

    it('should maintain call history with size limit', () => {
      // Add more than MAX_HISTORY (100) calls
      for (let i = 0; i < 150; i++) {
        service.trackCall('read', `collection${i % 10}`);
      }
      
      const recentOps = service.getRecentOperations(200);
      expect(recentOps.length).toBeLessThanOrEqual(100); // Should not exceed MAX_HISTORY
    });
  });

  describe('getSessionSummary', () => {
    beforeEach(() => {
      // Add test data
      service.trackCall('read', 'users', 'getAll', { latency: 50, cached: false });
      service.trackCall('read', 'posts', 'getById', { latency: 30, cached: true });
      service.trackCall('write', 'users', 'create', { latency: 100, cached: false });
      service.trackCall('read', 'users', 'getById', { error: 'not-found' });
    });

    it('should calculate total calls correctly', () => {
      const summary = service.getSessionSummary();
      expect(summary.totalCalls).toBe(4);
    });

    it('should calculate cache hit ratio correctly', () => {
      const summary = service.getSessionSummary();
      // 1 cached call out of 4 total = 25%
      expect(summary.cacheHitRatio).toBe(0.25);
    });

    it('should calculate average latency correctly', () => {
      const summary = service.getSessionSummary();
      // (50 + 30 + 100) / 3 = 60ms (excluding call without latency)
      expect(summary.averageLatency).toBe(60);
    });

    it('should calculate error rate correctly', () => {
      const summary = service.getSessionSummary();
      // 1 error out of 4 total calls = 25%
      expect(summary.errorRate).toBe(0.25);
      expect(summary.totalErrors).toBe(1);
    });

    it('should identify most active collection', () => {
      const summary = service.getSessionSummary();
      // 'read:users' appears twice, should be most active
      expect(summary.mostActiveCollection).toBe('read:users');
    });

    it('should calculate calls per minute', () => {
      const summary = service.getSessionSummary();
      expect(summary.callsPerMinute).toBeGreaterThan(0);
    });

    it('should include recent calls', () => {
      const summary = service.getSessionSummary();
      expect(summary.recentCalls).toHaveLength(4);
    });
  });

  describe('getErrorAnalysis', () => {
    beforeEach(() => {
      service.trackCall('read', 'users', 'getById', { error: 'permission-denied' });
      service.trackCall('write', 'posts', 'create', { error: 'permission-denied' });
      service.trackCall('read', 'users', 'getAll', { error: 'not-found' });
      service.trackCall('read', 'posts', 'getById'); // No error
    });

    it('should count total errors correctly', () => {
      const analysis = service.getErrorAnalysis();
      expect(analysis.totalErrors).toBe(3);
    });

    it('should group errors by collection', () => {
      const analysis = service.getErrorAnalysis();
      expect(analysis.errorsByCollection.users).toBe(2);
      expect(analysis.errorsByCollection.posts).toBe(1);
    });

    it('should group errors by type', () => {
      const analysis = service.getErrorAnalysis();
      expect(analysis.errorsByType['permission-denied']).toBe(2);
      expect(analysis.errorsByType['not-found']).toBe(1);
    });

    it('should return recent errors', () => {
      const analysis = service.getErrorAnalysis();
      expect(analysis.recentErrors).toHaveLength(3);
      expect(analysis.recentErrors.every(error => error.error)).toBe(true);
    });
  });

  describe('getPerformanceStats', () => {
    beforeEach(() => {
      service.trackCall('read', 'users', 'fast', { latency: 10 });
      service.trackCall('read', 'users', 'medium', { latency: 50 });
      service.trackCall('read', 'users', 'slow', { latency: 200 });
      service.trackCall('read', 'users', 'very-slow', { latency: 500 });
      service.trackCall('read', 'users', 'no-latency'); // No latency data
    });

    it('should calculate average latency correctly', () => {
      const stats = service.getPerformanceStats();
      // (10 + 50 + 200 + 500) / 4 = 190ms
      expect(stats.averageLatency).toBe(190);
    });

    it('should calculate P95 latency correctly', () => {
      const stats = service.getPerformanceStats();
      // With 4 values, P95 should be close to the highest value
      expect(stats.p95Latency).toBeGreaterThan(400);
    });

    it('should return slowest operations', () => {
      const stats = service.getPerformanceStats();
      expect(stats.slowestOperations).toHaveLength(4);
      expect(stats.slowestOperations[0].latency).toBe(500); // Highest first
    });

    it('should return fastest operations', () => {
      const stats = service.getPerformanceStats();
      expect(stats.fastestOperations).toHaveLength(4);
      expect(stats.fastestOperations[0].latency).toBe(10); // Lowest first
    });

    it('should handle no latency data gracefully', () => {
      service.resetSession();
      service.trackCall('read', 'users'); // No latency
      
      const stats = service.getPerformanceStats();
      expect(stats.averageLatency).toBe(0);
      expect(stats.p95Latency).toBe(0);
      expect(stats.slowestOperations).toHaveLength(0);
      expect(stats.fastestOperations).toHaveLength(0);
    });
  });

  describe('getCollectionBreakdown', () => {
    beforeEach(() => {
      service.trackCall('read', 'users');
      service.trackCall('read', 'users');
      service.trackCall('write', 'users');
      service.trackCall('read', 'posts');
      service.trackCall('delete', 'posts');
    });

    it('should group operations by collection', () => {
      const breakdown = service.getCollectionBreakdown();
      
      expect(breakdown).toHaveLength(2);
      
      const usersBreakdown = breakdown.find(item => item.collection === 'users');
      expect(usersBreakdown?.totalCalls).toBe(3);
      expect(usersBreakdown?.operations.read).toBe(2);
      expect(usersBreakdown?.operations.write).toBe(1);
      
      const postsBreakdown = breakdown.find(item => item.collection === 'posts');
      expect(postsBreakdown?.totalCalls).toBe(2);
      expect(postsBreakdown?.operations.read).toBe(1);
      expect(postsBreakdown?.operations.delete).toBe(1);
    });

    it('should sort collections by total calls descending', () => {
      const breakdown = service.getCollectionBreakdown();
      
      expect(breakdown[0].collection).toBe('users'); // 3 calls
      expect(breakdown[1].collection).toBe('posts'); // 2 calls
    });
  });

  describe('resetSession', () => {
    beforeEach(() => {
      service.trackCall('read', 'users');
      service.trackCall('write', 'posts');
    });

    it('should clear all counters and history', () => {
      expect(service.getCurrentCallCount()).toBe(2);
      
      service.resetSession('test reset');
      
      expect(service.getCurrentCallCount()).toBe(0);
      const summary = service.getSessionSummary();
      expect(summary.totalCalls).toBe(0);
      expect(summary.recentCalls).toHaveLength(0);
    });

    it('should log reset reason', () => {
      service.resetSession('test reset');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('test reset')
      );
    });

    it('should update session start time', () => {
      const originalSummary = service.getSessionSummary();
      const originalStart = originalSummary.sessionStart;
      
      // Wait a bit to ensure time difference
      setTimeout(() => {
        service.resetSession();
        const newSummary = service.getSessionSummary();
        expect(newSummary.sessionStart).toBeGreaterThan(originalStart);
      }, 10);
    });
  });

  describe('static compareSessions', () => {
    const beforeSession = {
      totalCalls: 100,
      breakdown: { 'read:users': 50, 'write:users': 20, 'read:posts': 30 },
      operationBreakdown: { read: 80, write: 20, delete: 0, 'batch-write': 0, transaction: 0 },
      sessionDuration: 60000,
      sessionStart: Date.now() - 60000,
      callsPerMinute: 100,
      mostActiveCollection: 'read:users',
      recentCalls: [],
      cacheHitRatio: 0.1,
      averageLatency: 100,
      errorRate: 0.05,
      totalErrors: 5
    };

    const afterSession = {
      ...beforeSession,
      totalCalls: 60,
      breakdown: { 'read:users': 20, 'write:users': 15, 'read:posts': 25 },
      cacheHitRatio: 0.5
    };

    it('should calculate call reduction correctly', () => {
      const comparison = FirebaseMetricsService.compareSessions(beforeSession, afterSession);
      
      expect(comparison.callReduction).toBe(40); // 100 - 60
      expect(comparison.percentReduction).toBe(40); // 40% reduction
    });

    it('should identify improved collections', () => {
      const comparison = FirebaseMetricsService.compareSessions(beforeSession, afterSession);
      
      expect(comparison.mostImprovedCollections).toHaveLength(1);
      expect(comparison.mostImprovedCollections[0].collection).toBe('read:users');
      expect(comparison.mostImprovedCollections[0].reduction).toBe(30); // 50 - 20
    });

    it('should generate appropriate summary message for reduction', () => {
      const comparison = FirebaseMetricsService.compareSessions(beforeSession, afterSession);
      
      expect(comparison.summary).toContain('Reduced Firebase calls');
      expect(comparison.summary).toContain('40');
      expect(comparison.summary).toContain('40.0%');
    });

    it('should handle case with no change', () => {
      const comparison = FirebaseMetricsService.compareSessions(beforeSession, beforeSession);
      
      expect(comparison.callReduction).toBe(0);
      expect(comparison.percentReduction).toBe(0);
      expect(comparison.summary).toContain('No change');
    });

    it('should handle case with increase', () => {
      const increasedSession = { ...afterSession, totalCalls: 120 };
      const comparison = FirebaseMetricsService.compareSessions(beforeSession, increasedSession);
      
      expect(comparison.callReduction).toBe(-20);
      expect(comparison.percentReduction).toBe(-20);
      expect(comparison.summary).toContain('increased');
    });
  });
});