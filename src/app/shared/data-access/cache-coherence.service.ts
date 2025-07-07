/**
 * @fileoverview CacheCoherenceService - Signals-Based Cache Invalidation
 * 
 * RESPONSIBILITY:
 * - Coordinate cache invalidation across the application
 * - Use Angular signals for reactive cache management
 * - Provide comprehensive logging for debugging cache operations
 * 
 * PATTERN:
 * - Write operations → trigger invalidation signal
 * - Cache services → react to invalidation signals
 * - Fresh data → automatically reloaded
 * 
 * USAGE:
 * ```typescript
 * // In stores after write operations:
 * await this.userService.updateUser(uid, updates);
 * this.cacheCoherence.invalidate('users', 'profile-update');
 * 
 * // In cache services:
 * effect(() => {
 *   const invalidation = this.cacheCoherence.invalidations();
 *   if (invalidation?.collection === 'users') {
 *     this.clearCollectionCache('users');
 *   }
 * });
 * ```
 */

import { Injectable, signal, computed } from '@angular/core';

export type CacheInvalidation = {
  collection: string;
  reason?: string;
  timestamp: number;
  requestId: string; // For tracking specific invalidation requests
};

export type CacheStats = {
  totalInvalidations: number;
  recentInvalidations: CacheInvalidation[];
  collectionsInvalidated: Set<string>;
};

/**
 * Simple collection dependency mapping
 * When a collection is invalidated, these related collections should also be cleared
 */
export const CACHE_DEPENDENCIES: Record<string, string[]> = {
  'users': ['user-profiles', 'leaderboards'], // User changes affect profiles and leaderboards
  'checkins': ['users', 'leaderboards'],      // Checkins affect user stats and leaderboards  
  'points': ['users', 'leaderboards'],        // Points affect user totals and leaderboards
  'user-profiles': ['leaderboards'],          // Profile changes affect leaderboards
  'badges': ['users'],                        // Badge awards affect user badge counts
  'landlords': ['users']                      // Landlord status affects user counts
};

@Injectable({ providedIn: 'root' })
export class CacheCoherenceService {
  
  // ✅ Core invalidation signal
  private readonly _currentInvalidation = signal<CacheInvalidation | null>(null);
  
  // ✅ History tracking for debugging
  private readonly _invalidationHistory = signal<CacheInvalidation[]>([]);
  private readonly _stats = signal<CacheStats>({
    totalInvalidations: 0,
    recentInvalidations: [],
    collectionsInvalidated: new Set()
  });
  
  // ✅ Public reactive signals
  readonly invalidations = this._currentInvalidation.asReadonly();
  readonly history = this._invalidationHistory.asReadonly();
  readonly stats = this._stats.asReadonly();
  
  // ✅ Computed insights
  readonly recentCollections = computed(() => {
    const recent = this._invalidationHistory().slice(-10);
    return [...new Set(recent.map(inv => inv.collection))];
  });
  
  readonly isActive = computed(() => !!this._currentInvalidation());
  
  constructor() {
    console.log('🔄 [CacheCoherence] Service initialized - ready for cache invalidation management');
  }
  
  /**
   * Invalidate a specific collection and its dependencies
   * @param collection - Primary collection to invalidate
   * @param reason - Human-readable reason for invalidation (for debugging)
   */
  invalidate(collection: string, reason?: string): void {
    const timestamp = Date.now();
    const requestId = `${collection}-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🔄 [CacheCoherence] === INVALIDATION TRIGGERED ===`);
    console.log(`🔄 [CacheCoherence] Collection: ${collection}`);
    console.log(`🔄 [CacheCoherence] Reason: ${reason || 'unspecified'}`);
    console.log(`🔄 [CacheCoherence] Request ID: ${requestId}`);
    console.log(`🔄 [CacheCoherence] Timestamp: ${new Date(timestamp).toISOString()}`);
    
    const invalidation: CacheInvalidation = {
      collection,
      reason,
      timestamp,
      requestId
    };
    
    // ✅ Set current invalidation (triggers reactive effects)
    this._currentInvalidation.set(invalidation);
    
    // ✅ Add to history for debugging
    this.addToHistory(invalidation);
    
    // ✅ Handle dependencies
    this.invalidateDependencies(collection, reason, requestId);
    
    // ✅ Clear current invalidation after a brief moment (allows effects to process)
    setTimeout(() => {
      this._currentInvalidation.set(null);
      console.log(`✅ [CacheCoherence] Invalidation signal cleared for: ${collection}`);
    }, 100);
  }
  
  /**
   * Invalidate multiple collections at once
   * @param collections - Array of collections to invalidate
   * @param reason - Reason for bulk invalidation
   */
  invalidateMultiple(collections: string[], reason?: string): void {
    console.log(`🔄 [CacheCoherence] === BULK INVALIDATION ===`);
    console.log(`🔄 [CacheCoherence] Collections: [${collections.join(', ')}]`);
    console.log(`🔄 [CacheCoherence] Reason: ${reason || 'bulk operation'}`);
    
    collections.forEach((collection, index) => {
      // Stagger invalidations slightly to avoid signal collision
      setTimeout(() => {
        this.invalidate(collection, `${reason} (bulk ${index + 1}/${collections.length})`);
      }, index * 50);
    });
  }
  
  /**
   * Get invalidation statistics for monitoring
   */
  getStats(): CacheStats {
    return this._stats();
  }
  
  /**
   * Get recent invalidations for debugging
   * @param limit - Number of recent invalidations to return
   */
  getRecentInvalidations(limit: number = 10): CacheInvalidation[] {
    return this._invalidationHistory().slice(-limit);
  }
  
  /**
   * Check if a collection has been recently invalidated
   * @param collection - Collection to check
   * @param withinMs - Time window in milliseconds (default: 5 seconds)
   */
  wasRecentlyInvalidated(collection: string, withinMs: number = 5000): boolean {
    const cutoff = Date.now() - withinMs;
    return this._invalidationHistory().some(inv => 
      inv.collection === collection && inv.timestamp > cutoff
    );
  }
  
  /**
   * Clear invalidation history (for testing or maintenance)
   */
  clearHistory(): void {
    console.log(`🧹 [CacheCoherence] Clearing invalidation history`);
    this._invalidationHistory.set([]);
    this._stats.set({
      totalInvalidations: 0,
      recentInvalidations: [],
      collectionsInvalidated: new Set()
    });
  }
  
  /**
   * Force clear all caches (useful for development/seeded data)
   * This is a manual override for when external data changes
   */
  forceGlobalCacheRefresh(): void {
    console.log(`🔄 [CacheCoherence] === FORCE GLOBAL CACHE REFRESH ===`);
    console.log(`🔄 [CacheCoherence] Reason: Development/seeded data refresh`);
    
    // Invalidate all major collections to force fresh loads
    const collections = ['pubs', 'users', 'badges', 'missions', 'checkins', 'leaderboards'];
    this.invalidateMultiple(collections, 'force-global-refresh');
  }
  
  /**
   * Get debug information about current state
   */
  getDebugInfo(): object {
    const current = this._currentInvalidation();
    const stats = this._stats();
    
    return {
      currentInvalidation: current,
      totalInvalidations: stats.totalInvalidations,
      recentCollections: this.recentCollections(),
      isActive: this.isActive(),
      historyLength: this._invalidationHistory().length,
      dependencies: CACHE_DEPENDENCIES
    };
  }
  
  // ===================================
  // PRIVATE METHODS
  // ===================================
  
  /**
   * Handle dependent collection invalidations
   * @param primaryCollection - The collection that was directly invalidated
   * @param reason - Original invalidation reason
   * @param parentRequestId - ID of the parent invalidation request
   */
  private invalidateDependencies(primaryCollection: string, reason?: string, parentRequestId?: string): void {
    const dependencies = CACHE_DEPENDENCIES[primaryCollection];
    
    if (!dependencies || dependencies.length === 0) {
      console.log(`🔄 [CacheCoherence] No dependencies for: ${primaryCollection}`);
      return;
    }
    
    console.log(`🔗 [CacheCoherence] === DEPENDENCY INVALIDATION ===`);
    console.log(`🔗 [CacheCoherence] Primary: ${primaryCollection}`);
    console.log(`🔗 [CacheCoherence] Dependencies: [${dependencies.join(', ')}]`);
    console.log(`🔗 [CacheCoherence] Parent Request: ${parentRequestId}`);
    
    dependencies.forEach((depCollection, index) => {
      setTimeout(() => {
        const depReason = `dependency of ${primaryCollection} (${reason || 'unspecified'})`;
        this.invalidate(depCollection, depReason);
      }, (index + 1) * 75); // Stagger dependency invalidations
    });
  }
  
  /**
   * Add invalidation to history and update stats
   * @param invalidation - The invalidation record to add
   */
  private addToHistory(invalidation: CacheInvalidation): void {
    const currentHistory = this._invalidationHistory();
    const currentStats = this._stats();
    
    // ✅ Add to history (keep last 100 for memory management)
    const newHistory = [...currentHistory, invalidation].slice(-100);
    this._invalidationHistory.set(newHistory);
    
    // ✅ Update stats
    const newStats: CacheStats = {
      totalInvalidations: currentStats.totalInvalidations + 1,
      recentInvalidations: newHistory.slice(-10),
      collectionsInvalidated: new Set([...currentStats.collectionsInvalidated, invalidation.collection])
    };
    this._stats.set(newStats);
    
    console.log(`📊 [CacheCoherence] Stats updated:`, {
      total: newStats.totalInvalidations,
      recentCollections: newStats.recentInvalidations.map(i => i.collection),
      uniqueCollections: newStats.collectionsInvalidated.size
    });
  }
}