import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { DatabaseMetricsService } from './database-metrics.service';
import { IndexedDbService } from './indexed-db.service';
import { FirebaseMetricsService } from './firebase-metrics.service';

// Mock classes following existing patterns in the codebase
class MockIndexedDbService {
  getMetrics = jest.fn().mockReturnValue({
    operations: { read: 50, write: 10, delete: 2, clear: 1 },
    totalSize: 1024,
    performance: {
      avgReadTime: 5,
      avgWriteTime: 15,
      operations: []
    }
  });

  resetMetrics = jest.fn();
}

class MockFirebaseMetricsService {
  getSessionSummary = jest.fn().mockReturnValue({
    totalCalls: 100,
    breakdown: { 'read:users': 30, 'write:users': 10, 'read:missions': 20 },
    operationBreakdown: { read: 50, write: 10, delete: 2, 'batch-write': 0, transaction: 0 },
    sessionDuration: 300000, // 5 minutes
    sessionStart: Date.now() - 300000,
    callsPerMinute: 20,
    mostActiveCollection: 'read:users',
    recentCalls: [],
    cacheHitRatio: 0.6,
    averageLatency: 45,
    errorRate: 0.02,
    totalErrors: 2
  });

  getRecentOperations = jest.fn().mockReturnValue([]);
  getErrorAnalysis = jest.fn().mockReturnValue({
    totalErrors: 2,
    errorsByCollection: { users: 1, missions: 1 },
    errorsByType: { 'permission-denied': 2 },
    recentErrors: []
  });
  getPerformanceStats = jest.fn().mockReturnValue({
    averageLatency: 45,
    p95Latency: 80,
    slowestOperations: [],
    fastestOperations: []
  });
  getCollectionBreakdown = jest.fn().mockReturnValue([
    { collection: 'users', totalCalls: 40, operations: { read: 30, write: 10 } },
    { collection: 'missions', totalCalls: 20, operations: { read: 20, write: 0 } }
  ]);

  resetSession = jest.fn();
}

describe('DatabaseMetricsService', () => {
  let service: DatabaseMetricsService;
  let mockIndexedDbService: MockIndexedDbService;
  let mockFirebaseMetricsService: MockFirebaseMetricsService;

  beforeEach(() => {
    mockIndexedDbService = new MockIndexedDbService();
    mockFirebaseMetricsService = new MockFirebaseMetricsService();

    TestBed.configureTestingModule({
      providers: [
        DatabaseMetricsService,
        { provide: IndexedDbService, useValue: mockIndexedDbService },
        { provide: FirebaseMetricsService, useValue: mockFirebaseMetricsService }
      ]
    });

    service = TestBed.inject(DatabaseMetricsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('calculateCacheHitRatio', () => {
    it('should calculate correct cache hit ratio', () => {
      // Add test operations to the service
      service.recordOperation('firestore', 'read', 'users', 50, false);
      service.recordOperation('indexeddb', 'read', 'users', 5, true);
      service.recordOperation('firestore', 'read', 'missions', 45, false);
      service.recordOperation('indexeddb', 'read', 'missions', 3, true);
      service.recordOperation('firestore', 'write', 'users', 100, false); // Should not affect ratio

      const performance = service.performanceMetrics();
      
      // 2 cached reads out of 4 total reads = 50%
      expect(performance.cacheHitRatio).toBe(0.5);
    });

    it('should return 0 when no read operations exist', () => {
      service.recordOperation('firestore', 'write', 'users', 100, false);
      service.recordOperation('firestore', 'delete', 'users', 80, false);

      const performance = service.performanceMetrics();
      expect(performance.cacheHitRatio).toBe(0);
    });

    it('should return 0 when no operations exist', () => {
      const performance = service.performanceMetrics();
      expect(performance.cacheHitRatio).toBe(0);
    });
  });

  describe('getCacheEffectiveness', () => {
    beforeEach(() => {
      // Set up test data
      service.recordOperation('firestore', 'read', 'users', 50, false);
      service.recordOperation('indexeddb', 'read', 'users', 5, true);
      service.recordOperation('firestore', 'read', 'missions', 60, false);
      service.recordOperation('indexeddb', 'read', 'missions', 4, true);
    });

    it('should calculate speed improvement correctly', () => {
      const effectiveness = service.getCacheEffectiveness();
      
      // Average Firebase: (50 + 60) / 2 = 55ms
      // Average IndexedDB: (5 + 4) / 2 = 4.5ms from mock
      // Speed improvement should be 55 / 4.5 ≈ 12.2x
      expect(effectiveness.speedImprovement).toBeCloseTo(12.2, 1);
    });

    it('should calculate hit and miss ratios', () => {
      const effectiveness = service.getCacheEffectiveness();
      
      expect(effectiveness.hitRatio).toBe(0.5); // 2 cached / 4 total reads
      expect(effectiveness.missRatio).toBe(0.5); // 1 - hit ratio
    });

    it('should handle zero latency gracefully', () => {
      // Reset and add operations with no Firebase latency
      service.resetAllMetrics();
      
      const effectiveness = service.getCacheEffectiveness();
      expect(effectiveness.speedImprovement).toBe(0);
    });
  });

  describe('recordOperation', () => {
    it('should record operation with correct metadata', () => {
      const initialCount = service.performanceMetrics().totalOperations;
      
      service.recordOperation('firestore', 'read', 'users', 45, false);
      
      const finalCount = service.performanceMetrics().totalOperations;
      expect(finalCount).toBe(initialCount + 1);
    });

    it('should handle operations without duration', () => {
      expect(() => {
        service.recordOperation('firestore', 'read', 'users', undefined, false);
      }).not.toThrow();
    });

    it('should distinguish between cached and non-cached operations', () => {
      service.recordOperation('indexeddb', 'read', 'users', 5, true);
      service.recordOperation('firestore', 'read', 'users', 50, false);
      
      const performance = service.performanceMetrics();
      expect(performance.cacheHitRatio).toBe(0.5);
    });
  });

  describe('getTopCollections', () => {
    beforeEach(() => {
      // Add operations for different collections
      service.recordOperation('firestore', 'read', 'users', 50, false);
      service.recordOperation('firestore', 'read', 'users', 45, false);
      service.recordOperation('indexeddb', 'read', 'users', 5, true);
      service.recordOperation('firestore', 'write', 'users', 100, false);
      
      service.recordOperation('firestore', 'read', 'missions', 40, false);
      service.recordOperation('indexeddb', 'read', 'missions', 3, true);
      
      service.recordOperation('firestore', 'read', 'pubs', 30, false);
    });

    it('should return collections sorted by operation count', () => {
      const topCollections = service.getTopCollections(3);
      
      expect(topCollections).toHaveLength(3);
      expect(topCollections[0].collection).toBe('users'); // 4 operations
      expect(topCollections[0].operations).toBe(4);
      expect(topCollections[1].collection).toBe('missions'); // 2 operations
      expect(topCollections[1].operations).toBe(2);
      expect(topCollections[2].collection).toBe('pubs'); // 1 operation
      expect(topCollections[2].operations).toBe(1);
    });

    it('should calculate cache hit ratio per collection', () => {
      const topCollections = service.getTopCollections(2);
      
      // Users: 1 cached read out of 3 total reads = 33.3%
      expect(topCollections[0].cacheHitRatio).toBeCloseTo(0.333, 2);
      
      // Missions: 1 cached read out of 2 total reads = 50%
      expect(topCollections[1].cacheHitRatio).toBe(0.5);
    });

    it('should respect the limit parameter', () => {
      const topCollections = service.getTopCollections(1);
      expect(topCollections).toHaveLength(1);
    });
  });

  describe('resetAllMetrics', () => {
    it('should reset all metrics and call dependencies', () => {
      // Add some operations first
      service.recordOperation('firestore', 'read', 'users', 50, false);
      expect(service.performanceMetrics().totalOperations).toBe(1);
      
      service.resetAllMetrics();
      
      expect(service.performanceMetrics().totalOperations).toBe(0);
      expect(mockIndexedDbService.resetMetrics).toHaveBeenCalled();
      expect(mockFirebaseMetricsService.resetSession).toHaveBeenCalled();
    });
  });

  describe('getCachePerformanceBreakdown', () => {
    beforeEach(() => {
      service.recordOperation('firestore', 'read', 'users', 50, false);
      service.recordOperation('indexeddb', 'read', 'users', 5, true);
      service.recordOperation('firestore', 'read', 'missions', 60, false);
      service.recordOperation('indexeddb', 'read', 'missions', 4, true);
    });

    it('should provide cache breakdown by collection', () => {
      const breakdown = service.getCachePerformanceBreakdown();
      
      expect(breakdown.cachesByCollection).toHaveLength(2);
      
      const usersCache = breakdown.cachesByCollection.find(c => c.collection === 'users');
      expect(usersCache).toBeDefined();
      expect(usersCache!.totalHits).toBe(1);
      expect(usersCache!.totalMisses).toBe(1);
      expect(usersCache!.hitRatio).toBe(0.5);
    });

    it('should calculate total operations saved', () => {
      const breakdown = service.getCachePerformanceBreakdown();
      
      // 2 cache hits total
      expect(breakdown.cacheSavings.operationsSaved).toBe(2);
    });

    it('should calculate time saved', () => {
      const breakdown = service.getCachePerformanceBreakdown();
      
      // Time saved = hits * (avg Firebase - avg IndexedDB)
      // 2 hits * (55ms - 5ms) = 100ms
      expect(breakdown.cacheSavings.timeSaved).toBeGreaterThan(0);
    });
  });
});