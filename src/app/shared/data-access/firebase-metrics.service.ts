/**
 * @fileoverview FirebaseMetricsService - Raw Firebase Operation Tracker
 *
 * Tracks raw Firebase operations (reads, writes, deletes) for session analysis.
 * Resets on page reload. Used by DatabaseMetricsService for cost calculations.
 *
 * RESPONSIBILITIES:
 * - Track individual Firebase operations with timing and metadata
 * - Session-based tracking (resets on browser refresh)
 * - Error tracking and retry monitoring
 * - Performance analysis (latency, P95, etc.)
 *
 * INTEGRATION:
 * - Called by CachedFirestoreService during operations
 * - Data consumed by DatabaseMetricsService for business analytics
 * - Provides real-time operation feed for admin dashboard
 *
 * @example
 * ```typescript
 * // Basic usage in services
 * this.firebaseMetricsService.trackCall('read', 'users', 'getAll', {
 *   latency: 45,
 *   cached: false
 * });
 *
 * // Get session data for analysis
 * const summary = this.firebaseMetricsService.getSessionSummary();
 * console.log(`Cache hit ratio: ${summary.cacheHitRatio}`);
 * ```
 */

import { Injectable } from '@angular/core';

export type FirebaseOperation = 'read' | 'write' | 'delete' | 'batch-write' | 'transaction';

export type FirebaseCallMetrics = {
  operation: FirebaseOperation;
  collection: string;
  timestamp: number;
  callId: string;
  documentId?: string;
  latency?: number;
  cached?: boolean;
  error?: string;
  retryAttempt?: number;
};

export type SessionSummary = {
  totalCalls: number;
  breakdown: Record<string, number>;
  operationBreakdown: Record<FirebaseOperation, number>;
  sessionDuration: number;
  sessionStart: number;
  callsPerMinute: number;
  mostActiveCollection: string;
  recentCalls: FirebaseCallMetrics[];
  cacheHitRatio: number;
  averageLatency: number;
  errorRate: number;
  totalErrors: number;
};

@Injectable({ providedIn: 'root' })
export class FirebaseMetricsService {
  // Session tracking
  private sessionCalls = new Map<string, number>();
  private operationCalls = new Map<FirebaseOperation, number>();
  private sessionStart = Date.now();
  private callHistory: FirebaseCallMetrics[] = [];
  private callCounter = 0;

  // Configuration
  private readonly MAX_HISTORY = 100; // Keep last 100 calls for analysis

  constructor() {
    this.logSessionInfo();

    // Reset on page unload and show summary
    window.addEventListener('beforeunload', () => {
      this.logSessionSummary('Session ending');
    });
  }

  /**
   * Track a Firebase operation call
   * @param operation - Type of Firebase operation
   * @param collection - Collection name being accessed
   * @param details - Optional additional details for debugging
   * @param options - Optional operation metadata
   */
  trackCall(
    operation: FirebaseOperation,
    collection: string,
    details?: string,
    options?: {
      documentId?: string;
      latency?: number;
      cached?: boolean;
      error?: string;
      retryAttempt?: number;
    }
  ): void {
    const callId = `${operation}-${collection}-${++this.callCounter}`;
    const timestamp = Date.now();

    // Update session counters
    const key = `${operation}:${collection}`;
    this.sessionCalls.set(key, (this.sessionCalls.get(key) || 0) + 1);
    this.operationCalls.set(operation, (this.operationCalls.get(operation) || 0) + 1);

    // Add to call history
    const callMetrics: FirebaseCallMetrics = {
      operation,
      collection,
      timestamp,
      callId,
      documentId: options?.documentId,
      latency: options?.latency,
      cached: options?.cached,
      error: options?.error,
      retryAttempt: options?.retryAttempt
    };

    this.callHistory.push(callMetrics);

    // Keep history size manageable
    if (this.callHistory.length > this.MAX_HISTORY) {
      this.callHistory.shift();
    }

    // Enhanced logging
    const cacheStatus = options?.cached ? ' (cached)' : '';
    const latencyInfo = options?.latency ? ` ${options.latency.toFixed(1)}ms` : '';
    const errorInfo = options?.error ? ` ERROR: ${options.error}` : '';
    const retryInfo = options?.retryAttempt ? ` (retry ${options.retryAttempt})` : '';

    console.log(
      `🔥 [FirebaseMetrics] ${operation.toUpperCase()} ${collection}${cacheStatus}${latencyInfo}${errorInfo}${retryInfo}${details ? ` (${details})` : ''} [${callId}]`
    );

    // Log milestone summaries
    const totalCalls = Array.from(this.operationCalls.values()).reduce((sum, count) => sum + count, 0);
    if (totalCalls % 10 === 0) {
      this.logMilestoneSummary(totalCalls);
    }
  }

  /**
   * Get comprehensive session summary with calculated metrics
   *
   * Aggregates all tracked operations into business metrics:
   * - Cache hit ratio (cached calls / total calls)
   * - Average latency across all operations
   * - Error rate calculation
   * - Operations per minute based on session duration
   */
  getSessionSummary(): SessionSummary {
    const now = Date.now();
    const sessionDuration = now - this.sessionStart;
    const totalCalls = Array.from(this.operationCalls.values()).reduce((sum, count) => sum + count, 0);

    // Build collection breakdown
    const breakdown: Record<string, number> = {};
    this.sessionCalls.forEach((count, key) => {
      breakdown[key] = count;
    });

    // Build operation breakdown
    const operationBreakdown: Record<FirebaseOperation, number> = {
      'read': 0,
      'write': 0,
      'delete': 0,
      'batch-write': 0,
      'transaction': 0
    };
    this.operationCalls.forEach((count, operation) => {
      operationBreakdown[operation] = count;
    });

    // Find most active collection
    let mostActiveCollection = 'none';
    let maxCalls = 0;
    Object.entries(breakdown).forEach(([key, count]) => {
      if (count > maxCalls) {
        maxCalls = count;
        mostActiveCollection = key;
      }
    });

    // Calculate calls per minute
    const callsPerMinute = sessionDuration > 0 ? (totalCalls / (sessionDuration / 60000)) : 0;

    // Calculate cache hit ratio
    const cachedCalls = this.callHistory.filter(call => call.cached).length;
    const cacheHitRatio = totalCalls > 0 ? cachedCalls / totalCalls : 0;

    // Calculate average latency
    const callsWithLatency = this.callHistory.filter(call => call.latency !== undefined);
    const averageLatency = callsWithLatency.length > 0
      ? callsWithLatency.reduce((sum, call) => sum + (call.latency || 0), 0) / callsWithLatency.length
      : 0;

    // Calculate error rate
    const errorCalls = this.callHistory.filter(call => call.error).length;
    const errorRate = totalCalls > 0 ? errorCalls / totalCalls : 0;

    return {
      totalCalls,
      breakdown,
      operationBreakdown,
      sessionDuration,
      sessionStart: this.sessionStart,
      callsPerMinute,
      mostActiveCollection,
      recentCalls: [...this.callHistory].slice(-10), // Last 10 calls
      cacheHitRatio,
      averageLatency,
      errorRate,
      totalErrors: errorCalls
    };
  }

  /**
   * Reset session metrics (for testing optimization)
   */
  resetSession(reason = 'Manual reset'): void {
    console.log(`🔥 [FirebaseMetrics] 🔄 Resetting session metrics: ${reason}`);

    // Log final summary before reset
    this.logSessionSummary('Pre-reset summary');

    // Clear all counters
    this.sessionCalls.clear();
    this.operationCalls.clear();
    this.callHistory = [];
    this.callCounter = 0;
    this.sessionStart = Date.now();

    console.log('🔥 [FirebaseMetrics] ✅ Session reset complete - new tracking session started');
    this.logSessionInfo();
  }

  /**
   * Log detailed session summary
   */
  logSessionSummary(title = 'Session Summary'): void {
    const summary = this.getSessionSummary();

    console.log(`🔥 [FirebaseMetrics] === ${title.toUpperCase()} ===`);
    console.log(`🔥 [FirebaseMetrics] Total calls: ${summary.totalCalls}`);
    console.log(`🔥 [FirebaseMetrics] Session duration: ${(summary.sessionDuration / 1000).toFixed(1)}s`);
    console.log(`🔥 [FirebaseMetrics] Calls per minute: ${summary.callsPerMinute.toFixed(1)}`);
    console.log(`🔥 [FirebaseMetrics] Most active: ${summary.mostActiveCollection}`);

    if (summary.totalCalls > 0) {
      console.log('🔥 [FirebaseMetrics] Operation breakdown:', summary.operationBreakdown);
      console.log('🔥 [FirebaseMetrics] Collection breakdown:', summary.breakdown);

      if (summary.recentCalls.length > 0) {
        console.log('🔥 [FirebaseMetrics] Recent calls:');
        summary.recentCalls.forEach(call => {
          console.log(`  📱 ${call.operation} ${call.collection} [${call.callId}]`);
        });
      }
    }

    console.log('🔥 [FirebaseMetrics] ========================');
  }

  /**
   * Get current call count for quick checks
   */
  getCurrentCallCount(): number {
    return Array.from(this.operationCalls.values()).reduce((sum, count) => sum + count, 0);
  }

  /**
   * Get breakdown by collection (for identifying optimization targets)
   *
   * Groups operations by collection and operation type to identify:
   * - Which collections are accessed most frequently
   * - Read vs write patterns per collection
   * - Targets for caching optimization
   */
  getCollectionBreakdown(): Array<{ collection: string; totalCalls: number; operations: Record<FirebaseOperation, number> }> {
    const collectionMap = new Map<string, Record<FirebaseOperation, number>>();

    this.sessionCalls.forEach((count, key) => {
      const [operation, collection] = key.split(':') as [FirebaseOperation, string];

      if (!collectionMap.has(collection)) {
        collectionMap.set(collection, {} as Record<FirebaseOperation, number>);
      }

      const ops = collectionMap.get(collection)!;
      ops[operation] = (ops[operation] || 0) + count;
    });

    return Array.from(collectionMap.entries()).map(([collection, operations]) => ({
      collection,
      totalCalls: Object.values(operations).reduce((sum, count) => sum + count, 0),
      operations
    })).sort((a, b) => b.totalCalls - a.totalCalls);
  }

  /**
   * Log session startup info
   */
  private logSessionInfo(): void {
    console.log(`🔥 [FirebaseMetrics] 🚀 New session started at ${new Date().toISOString()}`);
  }

  /**
   * Log milestone summaries (every 10 calls)
   */
  private logMilestoneSummary(totalCalls: number): void {
    const duration = Date.now() - this.sessionStart;
    const callsPerMinute = (totalCalls / (duration / 60000)).toFixed(1);

    console.log(`🔥 [FirebaseMetrics] 📊 Milestone: ${totalCalls} calls (${callsPerMinute}/min)`);
  }

  /**
   * Get recent Firebase operations for real-time monitoring
   */
  getRecentOperations(limit = 50): FirebaseCallMetrics[] {
    return [...this.callHistory].slice(-limit).reverse(); // Most recent first
  }

  /**
   * Get operations for the last N minutes
   */
  getRecentOperationsByTime(minutes = 5): FirebaseCallMetrics[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.callHistory.filter(call => call.timestamp > cutoff);
  }

  /**
   * Get error analysis
   */
  getErrorAnalysis(): {
    totalErrors: number;
    errorsByCollection: Record<string, number>;
    errorsByType: Record<string, number>;
    recentErrors: FirebaseCallMetrics[];
  } {
    const errorCalls = this.callHistory.filter(call => call.error);

    const errorsByCollection = errorCalls.reduce((acc, call) => {
      acc[call.collection] = (acc[call.collection] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errorsByType = errorCalls.reduce((acc, call) => {
      const errorType = call.error?.split(':')[0] || 'unknown';
      acc[errorType] = (acc[errorType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalErrors: errorCalls.length,
      errorsByCollection,
      errorsByType,
      recentErrors: errorCalls.slice(-10) // Last 10 errors
    };
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    averageLatency: number;
    p95Latency: number;
    slowestOperations: FirebaseCallMetrics[];
    fastestOperations: FirebaseCallMetrics[];
  } {
    const callsWithLatency = this.callHistory.filter(call => call.latency !== undefined);

    if (callsWithLatency.length === 0) {
      return {
        averageLatency: 0,
        p95Latency: 0,
        slowestOperations: [],
        fastestOperations: []
      };
    }

    const latencies = callsWithLatency.map(call => call.latency!).sort((a, b) => a - b);
    const averageLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
    const p95Index = Math.floor(latencies.length * 0.95);
    const p95Latency = latencies[p95Index] || 0;

    const sortedBySlowest = [...callsWithLatency].sort((a, b) => (b.latency || 0) - (a.latency || 0));
    const sortedByFastest = [...callsWithLatency].sort((a, b) => (a.latency || 0) - (b.latency || 0));

    return {
      averageLatency,
      p95Latency,
      slowestOperations: sortedBySlowest.slice(0, 5),
      fastestOperations: sortedByFastest.slice(0, 5)
    };
  }

  /**
   * Compare two session summaries (useful for before/after optimization)
   */
  static compareSessions(before: SessionSummary, after: SessionSummary): {
    callReduction: number;
    percentReduction: number;
    mostImprovedCollections: Array<{ collection: string; reduction: number }>;
    summary: string;
  } {
    const callReduction = before.totalCalls - after.totalCalls;
    const percentReduction = before.totalCalls > 0 ? (callReduction / before.totalCalls) * 100 : 0;

    // Find collections with biggest improvements
    const collectionImprovements: Array<{ collection: string; reduction: number }> = [];

    Object.keys(before.breakdown).forEach(key => {
      const beforeCount = before.breakdown[key] || 0;
      const afterCount = after.breakdown[key] || 0;
      const reduction = beforeCount - afterCount;

      if (reduction > 0) {
        collectionImprovements.push({ collection: key, reduction });
      }
    });

    collectionImprovements.sort((a, b) => b.reduction - a.reduction);

    const summary = callReduction > 0
      ? `🎉 Reduced Firebase calls by ${callReduction} (${percentReduction.toFixed(1)}%)`
      : callReduction < 0
        ? `⚠️ Firebase calls increased by ${Math.abs(callReduction)} (${Math.abs(percentReduction).toFixed(1)}%)`
        : '📊 No change in Firebase calls';

    return {
      callReduction,
      percentReduction,
      mostImprovedCollections: collectionImprovements.slice(0, 5),
      summary
    };
  }
}
