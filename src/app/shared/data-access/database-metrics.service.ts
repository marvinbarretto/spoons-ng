/**
 * @fileoverview DatabaseMetricsService - Business Intelligence Aggregator
 * 
 * Combines Firebase + IndexedDB metrics to calculate business insights:
 * - Cost estimates and savings based on Firebase pricing
 * - Cache hit ratios and effectiveness analysis
 * - Performance comparisons between Firebase and IndexedDB
 * - Real-time operation monitoring for admin dashboard
 * 
 * RESPONSIBILITIES:
 * - Aggregate data from FirebaseMetricsService and IndexedDbService
 * - Calculate cost estimates using current Firebase pricing
 * - Provide cache effectiveness metrics
 * - Generate dashboard-ready performance analytics
 * 
 * INTEGRATION:
 * - Consumes data from FirebaseMetricsService (raw operations)
 * - Consumes data from IndexedDbService (cache metrics)
 * - Called by CachedFirestoreService for operation logging
 * - Provides computed signals for admin dashboard components
 * 
 * @example
 * ```typescript
 * // Get comprehensive metrics for dashboard
 * const performance = this.databaseMetricsService.performanceMetrics();
 * const costs = this.databaseMetricsService.costEstimate();
 * const cacheStats = this.databaseMetricsService.getCacheEffectiveness();
 * 
 * // Record an operation (called by CachedFirestoreService)
 * this.databaseMetricsService.recordOperation('firestore', 'read', 'users', 45, false);
 * ```
 */

// src/app/shared/data-access/database-metrics.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { IndexedDbService } from './indexed-db.service';
import { FirebaseMetricsService } from './firebase-metrics.service';
import { CacheTier, getCacheTierForCollection } from './cache-tiers';

type DatabaseType = 'firestore' | 'indexeddb';

type DatabaseOperation = {
  type: DatabaseType;
  operation: 'read' | 'write' | 'delete' | 'clear';
  collection: string;
  timestamp: number;
  duration?: number;
  cached?: boolean;
  tier?: CacheTier | 'custom';
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
  realtimeOpsPerMinute: number;
  errorRate: number;
  cacheEfficiency: number;
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
    
    // Calculate real-time operations per minute (last 5 minutes)
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const recentOps = ops.filter(op => op.timestamp > fiveMinutesAgo);
    const realtimeOpsPerMinute = recentOps.length > 0 ? (recentOps.length / 5) : 0;
    
    // Calculate cache efficiency (speed improvement)
    const avgFirestoreLatency = firestoreOps.length > 0 
      ? firestoreOps.reduce((sum, op) => sum + (op.duration || 0), 0) / firestoreOps.length 
      : 0;
    const avgIndexedDbLatency = indexedDbMetrics.performance.avgReadTime;
    const cacheEfficiency = avgFirestoreLatency > 0 && avgIndexedDbLatency > 0 
      ? avgFirestoreLatency / avgIndexedDbLatency 
      : 1;
    
    return {
      avgFirestoreLatency,
      avgIndexedDbLatency,
      cacheHitRatio: this.calculateCacheHitRatio(),
      totalOperations: ops.length,
      operationsToday: todayOps.length,
      realtimeOpsPerMinute,
      errorRate: firebaseMetrics.errorRate,
      cacheEfficiency
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
   * Record a database operation with tier tracking
   */
  recordOperation(
    type: DatabaseType,
    operation: 'read' | 'write' | 'delete' | 'clear',
    collection: string,
    duration?: number,
    cached = false
  ): void {
    // Determine cache tier for the collection
    let tier: CacheTier | 'custom';
    try {
      tier = getCacheTierForCollection(collection);
    } catch (error) {
      tier = 'custom';
    }
    
    const newOperation: DatabaseOperation = {
      type,
      operation,
      collection,
      timestamp: Date.now(),
      duration,
      cached,
      tier
    };

    const currentOps = this.operations();
    const updatedOps = [...currentOps, newOperation];

    // Keep only recent operations (prevent memory bloat)
    if (updatedOps.length > this.MAX_OPERATIONS_LOG) {
      updatedOps.splice(0, updatedOps.length - this.MAX_OPERATIONS_LOG);
    }

    this.operations.set(updatedOps);

    console.log(`📊 [DatabaseMetrics] Recorded ${type} ${operation} on ${collection} [${tier}] ${cached ? '(cached)' : ''}`);
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
   * Get cache effectiveness summary with business metrics
   * 
   * Calculates key performance indicators:
   * - Hit/miss ratios for cache performance
   * - Speed improvement (how much faster cache is vs Firebase)
   * - Cost savings percentage based on prevented Firebase operations
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
   * Calculate cache hit ratio for read operations
   * 
   * Formula: (cached reads / total reads)
   * Only considers read operations since writes always go to Firebase.
   * Returns 0 if no read operations have been recorded.
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

  /**
   * Get Firebase-specific metrics
   */
  getFirebaseMetrics(): {
    recentOperations: any[];
    operationsPerMinute: number;
    errorAnalysis: any;
    performanceStats: any;
    collectionBreakdown: any[];
  } {
    const firebaseMetrics = this.firebaseMetricsService.getSessionSummary();
    
    return {
      recentOperations: this.firebaseMetricsService.getRecentOperations(50),
      operationsPerMinute: firebaseMetrics.callsPerMinute,
      errorAnalysis: this.firebaseMetricsService.getErrorAnalysis(),
      performanceStats: this.firebaseMetricsService.getPerformanceStats(),
      collectionBreakdown: this.firebaseMetricsService.getCollectionBreakdown()
    };
  }

  /**
   * Get cache performance breakdown
   */
  getCachePerformanceBreakdown(): {
    totalCacheSize: number;
    cachesByCollection: Array<{
      collection: string;
      hitRatio: number;
      totalHits: number;
      totalMisses: number;
      avgLatency: number;
    }>;
    cacheSavings: {
      operationsSaved: number;
      timeSaved: number;
      costSaved: number;
    };
  } {
    const ops = this.operations();
    const costs = this.costEstimate();
    
    // Group by collection and calculate cache metrics
    const cachesByCollection: Record<string, {
      hits: number;
      misses: number;
      totalLatency: number;
      operationCount: number;
    }> = {};
    
    ops.forEach(op => {
      if (!cachesByCollection[op.collection]) {
        cachesByCollection[op.collection] = {
          hits: 0,
          misses: 0,
          totalLatency: 0,
          operationCount: 0
        };
      }
      
      const cache = cachesByCollection[op.collection];
      cache.operationCount++;
      
      if (op.cached) {
        cache.hits++;
      } else {
        cache.misses++;
      }
      
      if (op.duration) {
        cache.totalLatency += op.duration;
      }
    });
    
    const collectionBreakdown = Object.entries(cachesByCollection).map(([collection, data]) => ({
      collection,
      hitRatio: data.operationCount > 0 ? data.hits / data.operationCount : 0,
      totalHits: data.hits,
      totalMisses: data.misses,
      avgLatency: data.operationCount > 0 ? data.totalLatency / data.operationCount : 0
    }));
    
    const totalHits = Object.values(cachesByCollection).reduce((sum, data) => sum + data.hits, 0);
    const performance = this.performanceMetrics();
    const timeSaved = totalHits * (performance.avgFirestoreLatency - performance.avgIndexedDbLatency);
    
    return {
      totalCacheSize: this.indexedDbService.getMetrics().totalSize,
      cachesByCollection: collectionBreakdown,
      cacheSavings: {
        operationsSaved: totalHits,
        timeSaved: Math.max(0, timeSaved),
        costSaved: costs.savings.monthlySavings
      }
    };
  }
  
  /**
   * Get cache performance metrics by tier
   * 
   * Provides tier-specific insights to understand which cache strategies
   * are performing best and identify optimization opportunities.
   */
  getCachePerformanceByTier(): {
    tierBreakdown: Array<{
      tier: CacheTier | 'custom';
      collections: number;
      totalOperations: number;
      cacheHitRatio: number;
      avgLatency: number;
      costSavings: number;
    }>;
    tierRecommendations: Array<{
      tier: CacheTier | 'custom';
      message: string;
      severity: 'info' | 'warning' | 'error';
    }>;
  } {
    const ops = this.operations();
    
    // Group operations by tier
    const tierGroups: Record<string, DatabaseOperation[]> = {};
    ops.forEach(op => {
      const tier = op.tier || 'custom';
      if (!tierGroups[tier]) {
        tierGroups[tier] = [];
      }
      tierGroups[tier].push(op);
    });
    
    const tierBreakdown = Object.entries(tierGroups).map(([tierName, tierOps]) => {
      const tier = tierName as CacheTier | 'custom';
      const readOps = tierOps.filter(op => op.operation === 'read');
      const cachedReads = readOps.filter(op => op.cached);
      const collections = new Set(tierOps.map(op => op.collection)).size;
      
      const avgLatency = tierOps.length > 0 
        ? tierOps.reduce((sum, op) => sum + (op.duration || 0), 0) / tierOps.length
        : 0;
      
      const hitRatio = readOps.length > 0 ? cachedReads.length / readOps.length : 0;
      const costSavings = cachedReads.length * this.FIRESTORE_READ_COST;
      
      return {
        tier,
        collections,
        totalOperations: tierOps.length,
        cacheHitRatio: hitRatio,
        avgLatency,
        costSavings
      };
    });
    
    // Generate tier-specific recommendations
    const tierRecommendations = tierBreakdown.map(tier => {
      if (tier.tier === 'static' && tier.cacheHitRatio < 0.8) {
        return {
          tier: tier.tier,
          message: `Static tier cache hit ratio is ${(tier.cacheHitRatio * 100).toFixed(1)}%. Consider increasing TTL for better performance.`,
          severity: 'warning' as const
        };
      }
      
      if (tier.tier === 'social' && tier.cacheHitRatio > 0.5) {
        return {
          tier: tier.tier,
          message: `Social tier has high cache hit ratio (${(tier.cacheHitRatio * 100).toFixed(1)}%). Consider reducing TTL to ensure data freshness.`,
          severity: 'info' as const
        };
      }
      
      if (tier.tier === 'personal' && tier.avgLatency > 100) {
        return {
          tier: tier.tier,
          message: `Personal tier latency is ${tier.avgLatency.toFixed(1)}ms. Check for performance bottlenecks.`,
          severity: 'warning' as const
        };
      }
      
      return {
        tier: tier.tier,
        message: `${tier.tier} tier performing well (${(tier.cacheHitRatio * 100).toFixed(1)}% hit ratio)`,
        severity: 'info' as const
      };
    });
    
    return {
      tierBreakdown,
      tierRecommendations
    };
  }
  
  /**
   * Get tier configuration effectiveness analysis
   * 
   * Analyzes whether current tier configurations align with actual usage patterns.
   */
  getTierConfigurationAnalysis(): {
    configuredCollections: number;
    unconfiguredCollections: string[];
    tierUtilization: Record<CacheTier, {
      collections: number;
      operationsPerDay: number;
      efficiency: number;
    }>;
    recommendations: string[];
  } {
    const ops = this.operations();
    const collections = new Set(ops.map(op => op.collection));
    const unconfiguredCollections: string[] = [];
    const tierUtilization: Record<CacheTier, {
      collections: number;
      operationsPerDay: number;
      efficiency: number;
    }> = {
      [CacheTier.STATIC]: { collections: 0, operationsPerDay: 0, efficiency: 0 },
      [CacheTier.PERSONAL]: { collections: 0, operationsPerDay: 0, efficiency: 0 },
      [CacheTier.SOCIAL]: { collections: 0, operationsPerDay: 0, efficiency: 0 }
    };
    
    collections.forEach(collection => {
      try {
        const tier = getCacheTierForCollection(collection);
        const collectionOps = ops.filter(op => op.collection === collection);
        const dailyOps = collectionOps.length / 7; // Approximate daily operations
        
        tierUtilization[tier].collections++;
        tierUtilization[tier].operationsPerDay += dailyOps;
        
        // Calculate efficiency (cache hits / total reads)
        const reads = collectionOps.filter(op => op.operation === 'read');
        const cachedReads = reads.filter(op => op.cached);
        const efficiency = reads.length > 0 ? cachedReads.length / reads.length : 0;
        tierUtilization[tier].efficiency = Math.max(tierUtilization[tier].efficiency, efficiency);
        
      } catch (error) {
        unconfiguredCollections.push(collection);
      }
    });
    
    const recommendations: string[] = [];
    
    if (unconfiguredCollections.length > 0) {
      recommendations.push(`${unconfiguredCollections.length} collections are not tier-configured: ${unconfiguredCollections.join(', ')}`);
    }
    
    Object.entries(tierUtilization).forEach(([tier, data]) => {
      if (data.collections === 0) {
        recommendations.push(`${tier} tier is not being used - consider reviewing tier assignments`);
      } else if (data.efficiency < 0.5) {
        recommendations.push(`${tier} tier has low efficiency (${(data.efficiency * 100).toFixed(1)}%) - review TTL settings`);
      }
    });
    
    return {
      configuredCollections: collections.size - unconfiguredCollections.length,
      unconfiguredCollections,
      tierUtilization,
      recommendations
    };
  }
}