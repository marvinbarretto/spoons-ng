/**
 * @fileoverview CachedFirestoreService - Caching Implementation Layer
 * 
 * Adds IndexedDB caching layer to Firebase operations with configurable strategies.
 * Extends FirestoreService to provide transparent caching for read operations.
 * Auto-invalidates cache on writes. Services inherit from this for caching functionality.
 * 
 * RESPONSIBILITIES:
 * - Implement cache-first, network-first, and cache-only strategies
 * - Manage TTL (time-to-live) for cached data per collection
 * - Auto-invalidate related caches on write operations
 * - Initialize and manage IndexedDB storage for caching
 * 
 * INTEGRATION:
 * - Extends FirestoreService (inherits all Firebase operations)
 * - Uses IndexedDbService for local storage management
 * - Calls DatabaseMetricsService to record operations
 * - Services extend this class to gain caching capabilities
 * 
 * @example
 * ```typescript
 * // Service implementation with caching
 * export class UserService extends CachedFirestoreService {
 *   protected override cacheConfig: CollectionCacheConfig = {
 *     'users': {
 *       ttl: 30 * 60 * 1000, // 30 minutes
 *       strategy: 'cache-first',
 *       invalidateOn: ['user-profiles'] // Clear users cache when profiles change
 *     }
 *   };
 * 
 *   getUsers() {
 *     return firstValueFrom(this.collection$<User>('users')); // Auto-cached
 *   }
 * }
 * ```
 */

// src/app/shared/data-access/cached-firestore.service.ts
import { inject } from '@angular/core';
import { FirestoreService } from './firestore.service';
import { IndexedDbService } from './indexed-db.service';
import { DatabaseMetricsService } from './database-metrics.service';
import { Observable, from, of } from 'rxjs';
import { tap, switchMap, catchError } from 'rxjs/operators';
import { FirebaseMetricsService } from './firebase-metrics.service';

export type CacheConfig = {
  ttl: number; // Time to live in milliseconds
  strategy: 'cache-first' | 'network-first' | 'cache-only' | 'network-only';
  invalidateOn?: string[]; // Collection names that invalidate this cache when written
};

export type CollectionCacheConfig = {
  [collectionName: string]: CacheConfig;
};

export abstract class CachedFirestoreService extends FirestoreService {
  protected indexedDbService = inject(IndexedDbService);
  protected databaseMetricsService = inject(DatabaseMetricsService);
  protected firebaseMetricsService = inject(FirebaseMetricsService);
  
  // Default cache configuration
  protected defaultCacheConfig: CacheConfig = {
    ttl: 5 * 60 * 1000, // 5 minutes default
    strategy: 'cache-first'
  };
  
  // Override this in subclasses to configure caching per collection
  protected cacheConfig: CollectionCacheConfig = {};
  
  // Database name for IndexedDB
  protected readonly dbName = 'spoonscount-cache';
  
  constructor() {
    super();
    this.initializeCache();
  }
  
  /**
   * Initialize IndexedDB for caching
   */
  private async initializeCache(): Promise<void> {
    try {
      await this.indexedDbService.openDatabase({
        name: this.dbName,
        version: 1,
        stores: [
          {
            name: 'collections',
            keyPath: 'id',
            indexes: [
              { name: 'collection', keyPath: 'collection' },
              { name: 'timestamp', keyPath: 'timestamp' }
            ]
          },
          {
            name: 'documents',
            keyPath: 'id',
            indexes: [
              { name: 'path', keyPath: 'path' },
              { name: 'timestamp', keyPath: 'timestamp' }
            ]
          },
          {
            name: 'metadata',
            keyPath: 'key'
          }
        ]
      });
      console.log('🗄️ [CachedFirestore] Cache initialized');
    } catch (error) {
      console.error('🗄️ [CachedFirestore] Failed to initialize cache:', error);
    }
  }
  
  /**
   * Get cache configuration for a collection with fallback
   * 
   * Returns collection-specific config or falls back to default (5min TTL, cache-first).
   * Override cacheConfig in subclasses to customize per-collection behavior.
   */
  protected getCacheConfig(collection: string): CacheConfig {
    return this.cacheConfig[collection] || this.defaultCacheConfig;
  }
  
  /**
   * One-time fetch of all documents in a collection with caching
   */
  protected override collection$<T>(path: string): Observable<T[]> {
    const startTime = performance.now();
    const config = this.getCacheConfig(path);
    
    // Network-only strategy bypasses cache
    if (config.strategy === 'network-only') {
      return super.collection$<T>(path).pipe(
        tap(() => this.logOperation('read', path, startTime, false))
      );
    }
    
    // Check cache first for cache-first or cache-only strategies
    if (config.strategy === 'cache-first' || config.strategy === 'cache-only') {
      return from(this.getCachedCollection<T>(path)).pipe(
        switchMap(cached => {
          if (cached && this.isCacheValid(cached.timestamp, config.ttl)) {
            this.logOperation('read', path, startTime, true);
            this.firebaseMetricsService.trackCall('read', path, 'collection$ (cache hit)');
            return of(cached.data);
          }
          
          // Cache-only returns empty if not cached
          if (config.strategy === 'cache-only') {
            this.logOperation('read', path, startTime, false);
            return of([]);
          }
          
          // Fetch from network and cache
          return this.fetchAndCacheCollection<T>(path, startTime);
        })
      );
    }
    
    // Network-first strategy
    return this.fetchAndCacheCollection<T>(path, startTime).pipe(
      catchError(() => {
        // Fallback to cache on network error
        return from(this.getCachedCollection<T>(path)).pipe(
          switchMap(cached => {
            if (cached) {
              this.logOperation('read', path, startTime, true);
              return of(cached.data);
            }
            return of([]);
          })
        );
      })
    );
  }
  
  /**
   * One-time fetch of a single document by path with caching
   */
  protected override doc$<T>(path: string): Observable<T | undefined> {
    const startTime = performance.now();
    const collectionName = this.getCollectionFromPath(path);
    const config = this.getCacheConfig(collectionName);
    
    // Network-only strategy bypasses cache
    if (config.strategy === 'network-only') {
      return super.doc$<T>(path).pipe(
        tap(() => this.logOperation('read', path, startTime, false))
      );
    }
    
    // Check cache first for cache-first or cache-only strategies
    if (config.strategy === 'cache-first' || config.strategy === 'cache-only') {
      return from(this.getCachedDocument<T>(path)).pipe(
        switchMap(cached => {
          if (cached && this.isCacheValid(cached.timestamp, config.ttl)) {
            this.logOperation('read', path, startTime, true);
            this.firebaseMetricsService.trackCall('read', collectionName, 'doc$ (cache hit)');
            return of(cached.data);
          }
          
          // Cache-only returns undefined if not cached
          if (config.strategy === 'cache-only') {
            this.logOperation('read', path, startTime, false);
            return of(undefined);
          }
          
          // Fetch from network and cache
          return this.fetchAndCacheDocument<T>(path, startTime);
        })
      );
    }
    
    // Network-first strategy
    return this.fetchAndCacheDocument<T>(path, startTime).pipe(
      catchError(() => {
        // Fallback to cache on network error
        return from(this.getCachedDocument<T>(path)).pipe(
          switchMap(cached => {
            if (cached) {
              this.logOperation('read', path, startTime, true);
              return of(cached.data);
            }
            return of(undefined);
          })
        );
      })
    );
  }
  
  /**
   * Override write operations to invalidate related caches
   */
  protected override async setDoc<T>(path: string, data: T): Promise<void> {
    const startTime = performance.now();
    await super.setDoc(path, data);
    await this.invalidateRelatedCaches(this.getCollectionFromPath(path));
    this.logOperation('write', path, startTime, false);
  }
  
  protected override async updateDoc<T>(path: string, data: Partial<T>): Promise<void> {
    const startTime = performance.now();
    await super.updateDoc(path, data);
    await this.invalidateRelatedCaches(this.getCollectionFromPath(path));
    this.logOperation('write', path, startTime, false);
  }
  
  protected override async deleteDoc(path: string): Promise<void> {
    const startTime = performance.now();
    await super.deleteDoc(path);
    await this.invalidateRelatedCaches(this.getCollectionFromPath(path));
    this.logOperation('delete', path, startTime, false);
  }
  
  /**
   * Clear cache for a specific collection
   */
  async clearCollectionCache(collection: string): Promise<void> {
    try {
      const allCached = await this.indexedDbService.getAll<any>(this.dbName, 'collections');
      const toDelete = allCached.filter(item => item.collection === collection);
      
      for (const item of toDelete) {
        await this.indexedDbService.delete(this.dbName, 'collections', item.id);
      }
      
      console.log(`🗑️ [CachedFirestore] Cleared cache for collection: ${collection}`);
    } catch (error) {
      console.error(`🗑️ [CachedFirestore] Failed to clear cache for ${collection}:`, error);
    }
  }
  
  /**
   * Clear all caches
   */
  async clearAllCaches(): Promise<void> {
    try {
      await this.indexedDbService.clear(this.dbName, 'collections');
      await this.indexedDbService.clear(this.dbName, 'documents');
      await this.indexedDbService.clear(this.dbName, 'metadata');
      console.log('🗑️ [CachedFirestore] Cleared all caches');
    } catch (error) {
      console.error('🗑️ [CachedFirestore] Failed to clear caches:', error);
    }
  }
  
  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    collections: number;
    documents: number;
    totalSize: number;
    oldestEntry: Date | null;
  }> {
    const collections = await this.indexedDbService.count(this.dbName, 'collections');
    const documents = await this.indexedDbService.count(this.dbName, 'documents');
    
    // Get oldest entry
    let oldestEntry: Date | null = null;
    const allCollections = await this.indexedDbService.getAll<any>(this.dbName, 'collections');
    const allDocuments = await this.indexedDbService.getAll<any>(this.dbName, 'documents');
    
    const allEntries = [...allCollections, ...allDocuments];
    if (allEntries.length > 0) {
      const oldest = Math.min(...allEntries.map(e => e.timestamp));
      oldestEntry = new Date(oldest);
    }
    
    return {
      collections,
      documents,
      totalSize: collections + documents,
      oldestEntry
    };
  }
  
  // Private helper methods
  
  private async getCachedCollection<T>(path: string): Promise<{ data: T[], timestamp: number } | null> {
    try {
      const cached = await this.indexedDbService.get<{ data: T[], timestamp: number, collection: string }>(
        this.dbName,
        'collections',
        `collection:${path}`
      );
      return cached || null;
    } catch (error) {
      console.error(`🗄️ [CachedFirestore] Error reading cache for ${path}:`, error);
      return null;
    }
  }
  
  private async getCachedDocument<T>(path: string): Promise<{ data: T, timestamp: number } | null> {
    try {
      const cached = await this.indexedDbService.get<{ data: T, timestamp: number, path: string }>(
        this.dbName,
        'documents',
        `doc:${path}`
      );
      return cached || null;
    } catch (error) {
      console.error(`🗄️ [CachedFirestore] Error reading cache for ${path}:`, error);
      return null;
    }
  }
  
  private fetchAndCacheCollection<T>(path: string, startTime: number): Observable<T[]> {
    return super.collection$<T>(path).pipe(
      tap(async (data) => {
        this.logOperation('read', path, startTime, false);
        
        // Cache the result
        try {
          await this.indexedDbService.put(
            this.dbName,
            'collections',
            {
              id: `collection:${path}`,
              collection: path,
              data,
              timestamp: Date.now()
            }
          );
          console.log(`💾 [CachedFirestore] Cached ${data.length} items for ${path}`);
        } catch (error) {
          console.error(`💾 [CachedFirestore] Failed to cache ${path}:`, error);
        }
      })
    );
  }
  
  private fetchAndCacheDocument<T>(path: string, startTime: number): Observable<T | undefined> {
    return super.doc$<T>(path).pipe(
      tap(async (data) => {
        this.logOperation('read', path, startTime, false);
        
        if (data) {
          // Cache the result
          try {
            await this.indexedDbService.put(
              this.dbName,
              'documents',
              {
                id: `doc:${path}`,
                path,
                data,
                timestamp: Date.now()
              }
            );
            console.log(`💾 [CachedFirestore] Cached document: ${path}`);
          } catch (error) {
            console.error(`💾 [CachedFirestore] Failed to cache ${path}:`, error);
          }
        }
      })
    );
  }
  
  /**
   * Check if cached data is still valid based on TTL
   * 
   * Compares current time against cache timestamp + TTL.
   * Used by all cache strategies to determine freshness.
   */
  private isCacheValid(timestamp: number, ttl: number): boolean {
    return Date.now() - timestamp < ttl;
  }
  
  /**
   * Invalidate related caches when a collection is written to
   * 
   * Two-step invalidation:
   * 1. Clear any collections that depend on this one (via invalidateOn config)
   * 2. Always clear the collection that was written to
   * 
   * Example: Writing to 'user-profiles' might invalidate 'users' cache
   */
  private async invalidateRelatedCaches(collection: string): Promise<void> {
    // Invalidate caches based on configuration
    for (const [cachedCollection, config] of Object.entries(this.cacheConfig)) {
      if (config.invalidateOn?.includes(collection)) {
        await this.clearCollectionCache(cachedCollection);
      }
    }
    
    // Always invalidate the written collection itself
    await this.clearCollectionCache(collection);
  }
  
  private logOperation(operation: string, path: string, startTime: number, cached: boolean): void {
    const duration = performance.now() - startTime;
    const collectionName = path.includes('/') ? this.getCollectionFromPath(path) : path;
    
    this.databaseMetricsService.recordOperation(
      cached ? 'indexeddb' : 'firestore',
      operation as any,
      collectionName,
      duration,
      cached
    );
    
    console.log(
      `📊 [CachedFirestore] ${operation.toUpperCase()} ${path} - ${duration.toFixed(1)}ms ${cached ? '(cached)' : '(network)'}`
    );
  }
  
  private getCollectionFromPath(path: string): string {
    return path.split('/')[0];
  }
}