// src/app/shared/data-access/database-metrics.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { IndexedDbService } from './indexed-db.service';
import { FirebaseMetricsService } from './firebase-metrics.service';

type DatabaseType = 'firestore' | 'indexeddb';

type DatabaseOperation = {
  type: DatabaseType;
  operation: 'read' | 'write' | 'delete' | 'clear';
  collection: string;
  timestamp: number;
  duration?: number;
  cached?: boolean;
};

type CostEstimate = {
  firestore: {
    reads: number;
    writes: number;
    monthlyCost: number;
  };
  storage: {
    indexedDbSize: number;
    firestoreSize: number;
  };
  savings: {
    preventedReads: number;
    preventedWrites: number;
    monthlySavings: number;
  };
};

type PerformanceMetrics = {
  avgFirestoreLatency: number;
  avgIndexedDbLatency: number;
  cacheHitRatio: number;
  totalOperations: number;
  operationsToday: number;
};

@Injectable({ providedIn: 'root' })
export class DatabaseMetricsService {
  private readonly indexedDbService = inject(IndexedDbService);
  private readonly firebaseMetricsService = inject(FirebaseMetricsService);

  // Firestore pricing (as of 2024)
  private readonly FIRESTORE_READ_COST = 0.36 / 100000; // $0.36 per 100K reads
  private readonly FIRESTORE_WRITE_COST = 1.08 / 100000; // $1.08 per 100K writes
  private readonly FIRESTORE_DELETE_COST = 1.08 / 100000; // Same as writes

  // Local operation history
  private readonly operations = signal<DatabaseOperation[]>([]);
  private readonly MAX_OPERATIONS_LOG = 10000;

  // Computed metrics
  readonly performanceMetrics = computed<PerformanceMetrics>(() => {
    const ops = this.operations();
    const indexedDbMetrics = this.indexedDbService.getMetrics();
    const firebaseMetrics = this.firebaseMetricsService.getSessionSummary();
    
    const today = new Date().toDateString();
    const todayOps = ops.filter(op => new Date(op.timestamp).toDateString() === today);
    
    const firestoreOps = ops.filter(op => op.type === 'firestore' && op.duration);
    const indexedDbOps = ops.filter(op => op.type === 'indexeddb' && op.duration);
    
    return {
      avgFirestoreLatency: firestoreOps.length > 0 
        ? firestoreOps.reduce((sum, op) => sum + (op.duration || 0), 0) / firestoreOps.length 
        : 0,
      avgIndexedDbLatency: indexedDbMetrics.performance.avgReadTime,
      cacheHitRatio: this.calculateCacheHitRatio(),
      totalOperations: ops.length,
      operationsToday: todayOps.length
    };
  });

  readonly costEstimate = computed<CostEstimate>(() => {
    const firebaseMetrics = this.firebaseMetricsService.getSessionSummary();
    const indexedDbMetrics = this.indexedDbService.getMetrics();
    
    const reads = firebaseMetrics.operationBreakdown.read;
    const writes = firebaseMetrics.operationBreakdown.write + firebaseMetrics.operationBreakdown.delete;
    
    // Calculate actual costs
    const readCost = reads * this.FIRESTORE_READ_COST;
    const writeCost = writes * this.FIRESTORE_WRITE_COST;
    const monthlyCost = (readCost + writeCost) * 30; // Estimate monthly
    
    // Calculate prevented operations (cache hits)
    const preventedReads = indexedDbMetrics.operations.read;
    const preventedWrites = Math.floor(indexedDbMetrics.operations.write * 0.1); // Estimate
    
    const savedReadCost = preventedReads * this.FIRESTORE_READ_COST;
    const savedWriteCost = preventedWrites * this.FIRESTORE_WRITE_COST;
    const monthlySavings = (savedReadCost + savedWriteCost) * 30;
    
    return {
      firestore: {
        reads,
        writes,
        monthlyCost
      },
      storage: {
        indexedDbSize: indexedDbMetrics.totalSize,
        firestoreSize: 0 // Would need to be calculated separately
      },
      savings: {
        preventedReads,
        preventedWrites,
        monthlySavings
      }
    };
  });

  /**
   * Record a database operation
   */
  recordOperation(
    type: DatabaseType,
    operation: 'read' | 'write' | 'delete' | 'clear',
    collection: string,
    duration?: number,
    cached = false
  ): void {
    const newOperation: DatabaseOperation = {
      type,
      operation,
      collection,
      timestamp: Date.now(),
      duration,
      cached
    };

    const currentOps = this.operations();
    const updatedOps = [...currentOps, newOperation];

    // Keep only recent operations (prevent memory bloat)
    if (updatedOps.length > this.MAX_OPERATIONS_LOG) {
      updatedOps.splice(0, updatedOps.length - this.MAX_OPERATIONS_LOG);
    }

    this.operations.set(updatedOps);

    console.log(`📊 [DatabaseMetrics] Recorded ${type} ${operation} on ${collection} ${cached ? '(cached)' : ''}`);
  }

  /**
   * Get operations for a specific time period
   */
  getOperationsForPeriod(hours = 24): DatabaseOperation[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.operations().filter(op => op.timestamp > cutoff);
  }

  /**
   * Get operations grouped by collection
   */
  getOperationsByCollection(): Record<string, DatabaseOperation[]> {
    const ops = this.operations();
    return ops.reduce((groups, op) => {
      if (!groups[op.collection]) {
        groups[op.collection] = [];
      }
      groups[op.collection].push(op);
      return groups;
    }, {} as Record<string, DatabaseOperation[]>);
  }

  /**
   * Get daily operation counts for the last N days
   */
  getDailyOperationCounts(days = 7): Array<{
    date: string;
    firestore: number;
    indexeddb: number;
    cached: number;
  }> {
    const results: Array<{
      date: string;
      firestore: number;
      indexeddb: number;
      cached: number;
    }> = [];

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toDateString();

      const dayOps = this.operations().filter(op => 
        new Date(op.timestamp).toDateString() === dateString
      );

      results.unshift({
        date: dateString,
        firestore: dayOps.filter(op => op.type === 'firestore').length,
        indexeddb: dayOps.filter(op => op.type === 'indexeddb').length,
        cached: dayOps.filter(op => op.cached).length
      });
    }

    return results;
  }

  /**
   * Reset all metrics and operation history
   */
  resetAllMetrics(): void {
    this.operations.set([]);
    this.indexedDbService.resetMetrics();
    this.firebaseMetricsService.resetSession();
    console.log(`📊 [DatabaseMetrics] All metrics reset`);
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): {
    operations: DatabaseOperation[];
    firebaseMetrics: any;
    indexedDbMetrics: any;
    performance: PerformanceMetrics;
    costs: CostEstimate;
    exportTimestamp: number;
  } {
    return {
      operations: this.operations(),
      firebaseMetrics: this.firebaseMetricsService.getSessionSummary(),
      indexedDbMetrics: this.indexedDbService.getMetrics(),
      performance: this.performanceMetrics(),
      costs: this.costEstimate(),
      exportTimestamp: Date.now()
    };
  }

  /**
   * Get cache effectiveness summary
   */
  getCacheEffectiveness(): {
    hitRatio: number;
    missRatio: number;
    speedImprovement: number;
    costSavingsPercentage: number;
  } {
    const perf = this.performanceMetrics();
    const costs = this.costEstimate();
    
    const speedImprovement = perf.avgFirestoreLatency > 0 
      ? perf.avgFirestoreLatency / perf.avgIndexedDbLatency 
      : 0;
    
    const totalPotentialCost = costs.firestore.monthlyCost + costs.savings.monthlySavings;
    const costSavingsPercentage = totalPotentialCost > 0 
      ? (costs.savings.monthlySavings / totalPotentialCost) * 100 
      : 0;

    return {
      hitRatio: perf.cacheHitRatio,
      missRatio: 1 - perf.cacheHitRatio,
      speedImprovement,
      costSavingsPercentage
    };
  }

  /**
   * Calculate cache hit ratio
   */
  private calculateCacheHitRatio(): number {
    const ops = this.operations();
    const readOps = ops.filter(op => op.operation === 'read');
    const cachedReads = readOps.filter(op => op.cached);
    
    return readOps.length > 0 ? cachedReads.length / readOps.length : 0;
  }

  /**
   * Get top collections by operation count
   */
  getTopCollections(limit = 5): Array<{
    collection: string;
    operations: number;
    reads: number;
    writes: number;
    cacheHitRatio: number;
  }> {
    const opsByCollection = this.getOperationsByCollection();
    
    return Object.entries(opsByCollection)
      .map(([collection, ops]) => {
        const reads = ops.filter(op => op.operation === 'read');
        const writes = ops.filter(op => op.operation === 'write');
        const cachedReads = reads.filter(op => op.cached);
        
        return {
          collection,
          operations: ops.length,
          reads: reads.length,
          writes: writes.length,
          cacheHitRatio: reads.length > 0 ? cachedReads.length / reads.length : 0
        };
      })
      .sort((a, b) => b.operations - a.operations)
      .slice(0, limit);
  }
}