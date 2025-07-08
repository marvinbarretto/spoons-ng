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
import { inject, effect } from '@angular/core';
import { FirestoreService } from './firestore.service';
import { IndexedDbService } from './indexed-db.service';
import { DatabaseMetricsService } from './database-metrics.service';
import { CacheCoherenceService } from './cache-coherence.service';
import { Observable, from, of } from 'rxjs';
import { tap, switchMap, catchError } from 'rxjs/operators';
import { FirebaseMetricsService } from './firebase-metrics.service';
import { getCacheConfigForCollection, CacheTier, getCacheTierForCollection, COLLECTION_TIERS } from './cache-tiers';

export type CacheConfig = {
  ttl: number; // Time to live in milliseconds
  strategy: 'cache-first' | 'network-first' | 'cache-only' | 'network-only';
  invalidateOn?: string[]; // Collection names that invalidate this cache when written
};

export type CollectionCacheConfig = {
  [collectionName: string]: CacheConfig;
};

export abstract class CachedFirestoreService extends FirestoreService {
  protected readonly indexedDbService = inject(IndexedDbService);
  protected readonly databaseMetricsService = inject(DatabaseMetricsService);
  protected readonly firebaseMetricsService = inject(FirebaseMetricsService);
  protected readonly cacheCoherence = inject(CacheCoherenceService);
  
  // Default cache configuration (fallback for unmapped collections)
  protected defaultCacheConfig: CacheConfig = {
    ttl: 5 * 60 * 1000, // 5 minutes default
    strategy: 'cache-first'
  };
  
  // Override this in subclasses to configure caching per collection
  protected cacheConfig: CollectionCacheConfig = {};
  
  // Database name for IndexedDB
  protected readonly dbName = 'spoonscount-cache';
  
  // Prevent race conditions with concurrent loads
  private loadingPromises = new Map<string, Promise<any>>();
  
  constructor() {
    super();
    this.setupCacheInvalidationListener();
    this.initializeCache();
  }
  
  /**
   * Setup cache invalidation listener using Angular signals
   * Listens for invalidation events from CacheCoherenceService
   */
  private setupCacheInvalidationListener(): void {
    console.log('🔗 [CachedFirestore] Setting up cache invalidation listener');
    
    effect(() => {
      const invalidation = this.cacheCoherence.invalidations();
      if (invalidation) {
        console.log(`🗑️ [CachedFirestore] === CACHE INVALIDATION RECEIVED ===`);
        console.log(`🗑️ [CachedFirestore] Collection: ${invalidation.collection}`);
        console.log(`🗑️ [CachedFirestore] Reason: ${invalidation.reason || 'unspecified'}`);
        console.log(`🗑️ [CachedFirestore] Request ID: ${invalidation.requestId}`);
        
        this.handleCacheInvalidation(invalidation.collection, invalidation.reason);
      }
    });
  }
  
  /**
   * Handle cache invalidation for a specific collection
   * @param collection - Collection to invalidate
   * @param reason - Reason for invalidation (for logging)
   */
  private async handleCacheInvalidation(collection: string, reason?: string): Promise<void> {
    const startTime = performance.now();
    
    try {
      console.log(`🧹 [CachedFirestore] Starting cache clear for: ${collection}`);
      
      // Clear collection cache
      await this.clearCollectionCache(collection);
      
      // Clear any ongoing promises for this collection to force fresh loads
      this.clearLoadingPromises(collection);
      
      const duration = performance.now() - startTime;
      console.log(`✅ [CachedFirestore] Cache invalidation completed for: ${collection} (${duration.toFixed(1)}ms)`);
      console.log(`✅ [CachedFirestore] Reason: ${reason || 'unspecified'}`);
      
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`❌ [CachedFirestore] Cache invalidation failed for: ${collection} (${duration.toFixed(1)}ms)`);
      console.error(`❌ [CachedFirestore] Error:`, error);
    }
  }
  
  /**
   * Clear cache for a specific collection
   * @param collection - Collection name to clear from cache
   */
  protected async clearCollectionCache(collection: string): Promise<void> {
    try {
      console.log(`🗑️ [CachedFirestore] Clearing cache entries for collection: ${collection}`);
      
      // Get all cached items for this collection to count them
      const collectionKey = `collection:${collection}`;
      const cachedData = await this.getCachedCollection(collection);
      
      if (cachedData) {
        console.log(`📊 [CachedFirestore] Found cached data for: ${collection} (timestamp: ${new Date(cachedData.timestamp).toISOString()})`);
        
        // Delete the collection cache entry
        await this.indexedDbService.delete(this.dbName, 'collections', collectionKey);
        console.log(`🗑️ [CachedFirestore] Collection cache entry deleted: ${collectionKey}`);
        
        // Also clear any individual document caches for this collection
        await this.clearDocumentCaches(collection);
        
        console.log(`✅ [CachedFirestore] Cache cleared successfully for: ${collection}`);
      } else {
        console.log(`ℹ️ [CachedFirestore] No cached data found for: ${collection} (already clean)`);
      }
      
    } catch (error) {
      console.error(`❌ [CachedFirestore] Failed to clear cache for: ${collection}`, error);
      throw error;
    }
  }
  
  /**
   * Clear individual document caches for a collection
   * @param collection - Collection name
   */
  private async clearDocumentCaches(collection: string): Promise<void> {
    try {
      // Get all document keys that start with this collection path
      const allKeys = await this.indexedDbService.getAllKeys(this.dbName, 'documents');
      const collectionKeys = allKeys.filter(key => 
        typeof key === 'string' && key.startsWith(`${collection}/`)
      );
      
      if (collectionKeys.length > 0) {
        console.log(`🗑️ [CachedFirestore] Clearing ${collectionKeys.length} document caches for: ${collection}`);
        
        for (const key of collectionKeys) {
          await this.indexedDbService.delete(this.dbName, 'documents', key);
        }
        
        console.log(`✅ [CachedFirestore] Cleared ${collectionKeys.length} document caches for: ${collection}`);
      } else {
        console.log(`ℹ️ [CachedFirestore] No document caches found for: ${collection}`);
      }
    } catch (error) {
      console.warn(`⚠️ [CachedFirestore] Failed to clear document caches for: ${collection}`, error);
      // Don't throw - this is secondary cleanup
    }
  }
  
  /**
   * Clear loading promises for a collection to force fresh network requests
   * @param collection - Collection name
   */
  private clearLoadingPromises(collection: string): void {
    const collectionKey = `collection:${collection}`;
    if (this.loadingPromises.has(collectionKey)) {
      this.loadingPromises.delete(collectionKey);
      console.log(`🔄 [CachedFirestore] Cleared loading promise for: ${collection} (will force fresh network request)`);
    }
  }
  
  /**
   * Public method to manually clear cache for a collection
   * @param collection - Collection name to clear
   */
  public async clearCache(collection: string): Promise<void> {
    console.log(`🧹 [CachedFirestore] Manual cache clear requested for: ${collection}`);
    await this.clearCollectionCache(collection);
    this.clearLoadingPromises(collection);
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
   * Get cache configuration for a collection with tier-based fallback
   * 
   * Priority order:
   * 1. Collection-specific override in cacheConfig
   * 2. Tier-based configuration from cache-tiers.ts
   * 3. Default configuration (5min TTL, cache-first)
   */
  protected getCacheConfig(collection: string): CacheConfig {
    // Check for collection-specific override first
    if (this.cacheConfig[collection]) {
      return this.cacheConfig[collection];
    }
    
    // Use tier-based configuration
    try {
      return getCacheConfigForCollection(collection);
    } catch (error) {
      console.warn(`🗄️ [CachedFirestore] Failed to get tier config for ${collection}, using default:`, error);
      return this.defaultCacheConfig;
    }
  }
  
  /**
   * Get cache tier for a collection
   * 
   * @param collection Firestore collection name
   * @returns Cache tier for monitoring and metrics
   */
  protected getCacheTier(collection: string): CacheTier | 'custom' {
    if (this.cacheConfig[collection]) {
      return 'custom'; // Custom configuration override
    }
    
    try {
      return getCacheTierForCollection(collection);
    } catch (error) {
      return 'custom';
    }
  }
  
  /**
   * One-time fetch of all documents in a collection with caching
   * Prevents race conditions by reusing ongoing requests
   */
  protected override collection$<T>(path: string): Observable<T[]> {
    // Check for ongoing request to prevent race conditions
    const cacheKey = `collection:${path}`;
    if (this.loadingPromises.has(cacheKey)) {
      return from(this.loadingPromises.get(cacheKey)! as Promise<T[]>);
    }
    
    const startTime = performance.now();
    const config = this.getCacheConfig(path);
    
    // Network-only strategy bypasses cache
    if (config.strategy === 'network-only') {
      const observable = super.collection$<T>(path).pipe(
        tap(() => this.logOperation('read', path, startTime, false))
      );
      
      const promise = observable.toPromise().then(result => result || []);
      this.loadingPromises.set(cacheKey, promise);
      promise.finally(() => this.loadingPromises.delete(cacheKey));
      
      return from(promise);
    }
    
    // Check cache first for cache-first or cache-only strategies
    if (config.strategy === 'cache-first' || config.strategy === 'cache-only') {
      const observable = from(this.getCachedCollection<T>(path)).pipe(
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
          
          // Fetch from network and cache (with race condition prevention)
          return this.fetchAndCacheCollectionWithRaceProtection<T>(path, startTime);
        })
      );
      
      return observable;
    }
    
    // Network-first strategy
    return this.fetchAndCacheCollectionWithRaceProtection<T>(path, startTime).pipe(
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
   * Prevents race conditions by reusing ongoing requests
   */
  protected override doc$<T>(path: string): Observable<T | undefined> {
    // Check for ongoing request to prevent race conditions
    const cacheKey = `doc:${path}`;
    if (this.loadingPromises.has(cacheKey)) {
      return from(this.loadingPromises.get(cacheKey)! as Promise<T | undefined>);
    }
    
    const startTime = performance.now();
    const collectionName = this.getCollectionFromPath(path);
    const config = this.getCacheConfig(collectionName);
    
    // Network-only strategy bypasses cache
    if (config.strategy === 'network-only') {
      const promise = super.doc$<T>(path).pipe(
        tap(() => this.logOperation('read', path, startTime, false))
      ).toPromise();
      
      this.loadingPromises.set(cacheKey, promise!);
      promise!.finally(() => this.loadingPromises.delete(cacheKey));
      
      return from(promise!);
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
          
          // Fetch from network and cache (with race condition prevention)
          return this.fetchAndCacheDocumentWithRaceProtection<T>(path, startTime);
        })
      );
    }
    
    // Network-first strategy
    return this.fetchAndCacheDocumentWithRaceProtection<T>(path, startTime).pipe(
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
   * Add document with cache invalidation
   */
  async addDoc<T>(collectionPath: string, data: T): Promise<string> {
    const startTime = performance.now();
    const docRef = await super.addDocToCollection(collectionPath, data);
    await this.invalidateRelatedCaches(collectionPath);
    this.logOperation('write', `${collectionPath}/${docRef.id}`, startTime, false);
    return `${collectionPath}/${docRef.id}`;
  }
  
  /**
   * Clear all caches - useful for development and seeded data
   */
  public async clearAllCaches(): Promise<void> {
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
   * Invalidate cache for a specific document path
   * Used when a specific document is updated and needs cache refresh
   */
  async invalidateCache(path: string): Promise<void> {
    try {
      // Check if it's a document path or collection path
      if (path.includes('/')) {
        // Document path - clear from documents store
        await this.indexedDbService.delete(this.dbName, 'documents', `doc:${path}`);
        
        // Also clear the parent collection cache
        const collectionName = this.getCollectionFromPath(path);
        await this.clearCollectionCache(collectionName);
        
        console.log(`🗑️ [CachedFirestore] Invalidated cache for document: ${path}`);
      } else {
        // Collection path - clear collection cache
        await this.clearCollectionCache(path);
        console.log(`🗑️ [CachedFirestore] Invalidated cache for collection: ${path}`);
      }
    } catch (error) {
      console.error(`🗑️ [CachedFirestore] Failed to invalidate cache for ${path}:`, error);
    }
  }
  
  /**
   * Get comprehensive cache statistics with storage analysis
   */
  async getCacheStats(): Promise<{
    collections: number;
    documents: number;
    totalSize: number;
    estimatedSizeBytes: number;
    oldestEntry: Date | null;
    storageQuotaUsage: {
      used: number;
      available: number;
      percentage: number;
    } | null;
    tierBreakdown: Record<CacheTier | 'custom', {
      collections: number;
      documents: number;
      estimatedSize: number;
    }>;
  }> {
    const collections = await this.indexedDbService.count(this.dbName, 'collections');
    const documents = await this.indexedDbService.count(this.dbName, 'documents');
    
    // Get all entries for detailed analysis
    const allCollections = await this.indexedDbService.getAll<any>(this.dbName, 'collections');
    const allDocuments = await this.indexedDbService.getAll<any>(this.dbName, 'documents');
    
    const allEntries = [...allCollections, ...allDocuments];
    
    // Calculate oldest entry
    let oldestEntry: Date | null = null;
    if (allEntries.length > 0) {
      const oldest = Math.min(...allEntries.map(e => e.timestamp));
      oldestEntry = new Date(oldest);
    }
    
    // Estimate storage size
    const estimatedSizeBytes = this.estimateStorageSize(allEntries);
    
    // Get storage quota info (if available)
    let storageQuotaUsage: {
      used: number;
      available: number;
      percentage: number;
    } | null = null;
    
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        if (estimate.quota && estimate.usage) {
          storageQuotaUsage = {
            used: estimate.usage,
            available: estimate.quota - estimate.usage,
            percentage: (estimate.usage / estimate.quota) * 100
          };
        }
      }
    } catch (error) {
      console.warn('🗄️ [CachedFirestore] Could not get storage quota info:', error);
    }
    
    // Tier breakdown analysis
    const tierBreakdown: Record<CacheTier | 'custom', {
      collections: number;
      documents: number;
      estimatedSize: number;
    }> = {
      [CacheTier.STATIC]: { collections: 0, documents: 0, estimatedSize: 0 },
      [CacheTier.PERSONAL]: { collections: 0, documents: 0, estimatedSize: 0 },
      [CacheTier.SOCIAL]: { collections: 0, documents: 0, estimatedSize: 0 },
      'custom': { collections: 0, documents: 0, estimatedSize: 0 }
    };
    
    allCollections.forEach(item => {
      const tier = this.getCacheTier(item.collection);
      tierBreakdown[tier].collections++;
      tierBreakdown[tier].estimatedSize += this.estimateItemSize(item);
    });
    
    allDocuments.forEach(item => {
      const collection = this.getCollectionFromPath(item.path);
      const tier = this.getCacheTier(collection);
      tierBreakdown[tier].documents++;
      tierBreakdown[tier].estimatedSize += this.estimateItemSize(item);
    });
    
    return {
      collections,
      documents,
      totalSize: collections + documents,
      estimatedSizeBytes,
      oldestEntry,
      storageQuotaUsage,
      tierBreakdown
    };
  }
  
  /**
   * Cache management constants
   */
  private readonly MAX_CACHE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB default limit
  private readonly CLEANUP_BATCH_SIZE = 100;
  
  /**
   * Perform automatic cache cleanup based on size and age
   * 
   * Removes oldest entries when cache exceeds size limits or entries exceed TTL.
   * Prioritizes removing expired entries first, then oldest entries if needed.
   */
  async performCacheCleanup(options: {
    maxSizeBytes?: number;
    maxAgeMs?: number;
    dryRun?: boolean;
  } = {}): Promise<{
    totalEntriesBefore: number;
    entriesRemoved: number;
    bytesFreed: number;
    cleanupReasons: string[];
  }> {
    const {
      maxSizeBytes = this.MAX_CACHE_SIZE_BYTES,
      maxAgeMs = 7 * 24 * 60 * 60 * 1000, // 7 days default
      dryRun = false
    } = options;
    
    const stats = await this.getCacheStats();
    const now = Date.now();
    const cleanupReasons: string[] = [];
    let entriesRemoved = 0;
    let bytesFreed = 0;
    
    console.log(`🧽 [CachedFirestore] Starting cache cleanup (dry run: ${dryRun})`);
    console.log(`📊 Current size: ${(stats.estimatedSizeBytes / 1024 / 1024).toFixed(2)}MB (${stats.totalSize} entries)`);
    
    // Get all entries for analysis
    const allCollections = await this.indexedDbService.getAll<any>(this.dbName, 'collections');
    const allDocuments = await this.indexedDbService.getAll<any>(this.dbName, 'documents');
    const allEntries = [...allCollections, ...allDocuments];
    
    // Phase 1: Remove expired entries based on their tier TTL
    const expiredEntries: any[] = [];
    allEntries.forEach(entry => {
      const collection = entry.collection || this.getCollectionFromPath(entry.path);
      const config = this.getCacheConfig(collection);
      const age = now - entry.timestamp;
      
      if (age > config.ttl) {
        expiredEntries.push(entry);
      }
    });
    
    if (expiredEntries.length > 0) {
      cleanupReasons.push(`Removed ${expiredEntries.length} expired entries`);
      if (!dryRun) {
        for (const entry of expiredEntries) {
          const storeName = entry.collection ? 'collections' : 'documents';
          await this.indexedDbService.delete(this.dbName, storeName, entry.id);
          bytesFreed += this.estimateItemSize(entry);
          entriesRemoved++;
        }
      } else {
        entriesRemoved += expiredEntries.length;
        bytesFreed += expiredEntries.reduce((sum, entry) => sum + this.estimateItemSize(entry), 0);
      }
    }
    
    // Phase 2: Remove old entries if still over size limit
    const remainingEntries = allEntries.filter(entry => !expiredEntries.includes(entry));
    const currentSize = stats.estimatedSizeBytes - bytesFreed;
    
    if (currentSize > maxSizeBytes) {
      const entriesToRemove = remainingEntries
        .sort((a, b) => a.timestamp - b.timestamp) // Oldest first
        .slice(0, Math.ceil(remainingEntries.length * 0.2)); // Remove 20% of remaining entries
      
      cleanupReasons.push(`Removed ${entriesToRemove.length} oldest entries to reduce size`);
      if (!dryRun) {
        for (const entry of entriesToRemove) {
          const storeName = entry.collection ? 'collections' : 'documents';
          await this.indexedDbService.delete(this.dbName, storeName, entry.id);
          bytesFreed += this.estimateItemSize(entry);
          entriesRemoved++;
        }
      } else {
        entriesRemoved += entriesToRemove.length;
        bytesFreed += entriesToRemove.reduce((sum, entry) => sum + this.estimateItemSize(entry), 0);
      }
    }
    
    // Phase 3: Remove entries older than maxAgeMs regardless of TTL
    const veryOldEntries = remainingEntries.filter(entry => {
      const age = now - entry.timestamp;
      return age > maxAgeMs && !expiredEntries.includes(entry);
    });
    
    if (veryOldEntries.length > 0) {
      cleanupReasons.push(`Removed ${veryOldEntries.length} very old entries (>${Math.floor(maxAgeMs / (24 * 60 * 60 * 1000))} days)`);
      if (!dryRun) {
        for (const entry of veryOldEntries) {
          const storeName = entry.collection ? 'collections' : 'documents';
          await this.indexedDbService.delete(this.dbName, storeName, entry.id);
          bytesFreed += this.estimateItemSize(entry);
          entriesRemoved++;
        }
      } else {
        entriesRemoved += veryOldEntries.length;
        bytesFreed += veryOldEntries.reduce((sum, entry) => sum + this.estimateItemSize(entry), 0);
      }
    }
    
    const result = {
      totalEntriesBefore: stats.totalSize,
      entriesRemoved,
      bytesFreed,
      cleanupReasons
    };
    
    if (!dryRun && entriesRemoved > 0) {
      console.log(`🧽 [CachedFirestore] Cleanup completed: ${entriesRemoved} entries removed, ${(bytesFreed / 1024 / 1024).toFixed(2)}MB freed`);
    } else if (dryRun) {
      console.log(`🧽 [CachedFirestore] Cleanup preview: would remove ${entriesRemoved} entries, free ${(bytesFreed / 1024 / 1024).toFixed(2)}MB`);
    } else {
      console.log(`🧽 [CachedFirestore] No cleanup needed`);
    }
    
    return result;
  }
  
  /**
   * Cache warming for critical collections
   * 
   * Pre-loads important data to cache to improve user experience.
   * Focuses on static tier collections that change infrequently.
   */
  async warmCache(collections: string[] = []): Promise<{
    collectionsWarmed: number;
    totalItemsCached: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let collectionsWarmed = 0;
    let totalItemsCached = 0;
    
    const collectionsToWarm = collections.length > 0 
      ? collections 
      : Object.keys(COLLECTION_TIERS).filter(col => 
          getCacheTierForCollection(col) === CacheTier.STATIC
        );
    
    console.log(`🔥 [CachedFirestore] Warming cache for ${collectionsToWarm.length} collections`);
    
    for (const collection of collectionsToWarm) {
      try {
        const data = await super.collection$(collection).toPromise();
        if (data && data.length > 0) {
          await this.indexedDbService.put(
            this.dbName,
            'collections',
            {
              id: `collection:${collection}`,
              collection,
              data,
              timestamp: Date.now()
            }
          );
          
          collectionsWarmed++;
          totalItemsCached += data.length;
          console.log(`🔥 [CachedFirestore] Warmed ${collection}: ${data.length} items`);
        }
      } catch (error: any) {
        const errorMsg = `Failed to warm ${collection}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`🔥 [CachedFirestore] ${errorMsg}`);
      }
    }
    
    console.log(`🔥 [CachedFirestore] Cache warming completed: ${collectionsWarmed}/${collectionsToWarm.length} collections`);
    
    return {
      collectionsWarmed,
      totalItemsCached,
      errors
    };
  }
  
  /**
   * Monitor cache health and provide recommendations
   */
  async getCacheHealthReport(): Promise<{
    health: 'good' | 'warning' | 'critical';
    score: number; // 0-100
    issues: Array<{
      type: 'storage' | 'performance' | 'configuration';
      severity: 'low' | 'medium' | 'high';
      message: string;
      recommendation: string;
    }>;
    metrics: {
      hitRatio: number;
      avgLatency: number;
      storageUsage: number;
      oldestEntryDays: number;
    };
  }> {
    const stats = await this.getCacheStats();
    const issues: Array<{
      type: 'storage' | 'performance' | 'configuration';
      severity: 'low' | 'medium' | 'high';
      message: string;
      recommendation: string;
    }> = [];
    
    let score = 100;
    
    // Calculate metrics
    const hitRatio = await this.calculateCurrentHitRatio();
    const avgLatency = await this.calculateAverageLatency();
    const storageUsage = stats.storageQuotaUsage?.percentage || 0;
    const oldestEntryDays = stats.oldestEntry 
      ? (Date.now() - stats.oldestEntry.getTime()) / (24 * 60 * 60 * 1000)
      : 0;
    
    // Storage checks
    if (storageUsage > 80) {
      issues.push({
        type: 'storage',
        severity: 'high',
        message: `Storage usage is ${storageUsage.toFixed(1)}%`,
        recommendation: 'Run cache cleanup or increase storage quota'
      });
      score -= 20;
    } else if (storageUsage > 60) {
      issues.push({
        type: 'storage',
        severity: 'medium',
        message: `Storage usage is ${storageUsage.toFixed(1)}%`,
        recommendation: 'Monitor storage usage and consider cleanup'
      });
      score -= 10;
    }
    
    // Performance checks
    if (hitRatio < 0.5) {
      issues.push({
        type: 'performance',
        severity: 'high',
        message: `Cache hit ratio is low (${(hitRatio * 100).toFixed(1)}%)`,
        recommendation: 'Review TTL settings and cache warming strategy'
      });
      score -= 25;
    } else if (hitRatio < 0.7) {
      issues.push({
        type: 'performance',
        severity: 'medium',
        message: `Cache hit ratio could be improved (${(hitRatio * 100).toFixed(1)}%)`,
        recommendation: 'Consider increasing TTL for frequently accessed data'
      });
      score -= 10;
    }
    
    if (avgLatency > 100) {
      issues.push({
        type: 'performance',
        severity: 'medium',
        message: `Average cache latency is ${avgLatency.toFixed(1)}ms`,
        recommendation: 'Check for IndexedDB performance issues'
      });
      score -= 15;
    }
    
    // Configuration checks
    if (oldestEntryDays > 30) {
      issues.push({
        type: 'configuration',
        severity: 'low',
        message: `Oldest cache entry is ${oldestEntryDays.toFixed(0)} days old`,
        recommendation: 'Consider running cleanup to remove very old entries'
      });
      score -= 5;
    }
    
    // Determine overall health
    let health: 'good' | 'warning' | 'critical';
    if (score >= 80) {
      health = 'good';
    } else if (score >= 60) {
      health = 'warning';
    } else {
      health = 'critical';
    }
    
    return {
      health,
      score: Math.max(0, score),
      issues,
      metrics: {
        hitRatio,
        avgLatency,
        storageUsage,
        oldestEntryDays
      }
    };
  }
  
  /**
   * Fetch and cache collection with race condition protection
   */
  private fetchAndCacheCollectionWithRaceProtection<T>(path: string, startTime: number): Observable<T[]> {
    const cacheKey = `fetch-collection:${path}`;
    
    // Check if already fetching
    if (this.loadingPromises.has(cacheKey)) {
      return from(this.loadingPromises.get(cacheKey)! as Promise<T[]>);
    }
    
    const promise = this.fetchAndCacheCollection<T>(path, startTime).toPromise().then(result => result || []);
    this.loadingPromises.set(cacheKey, promise);
    
    promise.finally(() => this.loadingPromises.delete(cacheKey));
    
    return from(promise);
  }
  
  /**
   * Fetch and cache document with race condition protection
   */
  private fetchAndCacheDocumentWithRaceProtection<T>(path: string, startTime: number): Observable<T | undefined> {
    const cacheKey = `fetch-doc:${path}`;
    
    // Check if already fetching
    if (this.loadingPromises.has(cacheKey)) {
      return from(this.loadingPromises.get(cacheKey)! as Promise<T | undefined>);
    }
    
    const promise = this.fetchAndCacheDocument<T>(path, startTime).toPromise();
    this.loadingPromises.set(cacheKey, promise!);
    
    promise!.finally(() => this.loadingPromises.delete(cacheKey));
    
    return from(promise!);
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
    const tier = this.getCacheTier(collectionName);
    
    this.databaseMetricsService.recordOperation(
      cached ? 'indexeddb' : 'firestore',
      operation as any,
      collectionName,
      duration,
      cached
    );
    
    console.log(
      `📊 [CachedFirestore] ${operation.toUpperCase()} ${path} [${tier}] - ${duration.toFixed(1)}ms ${cached ? '(cached)' : '(network)'}`
    );
  }
  
  private getCollectionFromPath(path: string): string {
    return path.split('/')[0];
  }
  
  /**
   * Estimate storage size of cache entries
   */
  private estimateStorageSize(entries: any[]): number {
    return entries.reduce((total, entry) => total + this.estimateItemSize(entry), 0);
  }
  
  private estimateItemSize(item: any): number {
    try {
      // Rough estimate: JSON.stringify size + overhead
      const jsonSize = JSON.stringify(item).length;
      return jsonSize * 2; // Account for UTF-16 encoding and IndexedDB overhead
    } catch (error) {
      return 1024; // Default 1KB estimate if serialization fails
    }
  }
  
  /**
   * Calculate current cache hit ratio from recent operations
   */
  private async calculateCurrentHitRatio(): Promise<number> {
    // This would typically come from DatabaseMetricsService
    // For now, return a simple calculation
    try {
      return this.databaseMetricsService.performanceMetrics().cacheHitRatio || 0;
    } catch (error) {
      return 0;
    }
  }
  
  /**
   * Calculate average cache latency
   */
  private async calculateAverageLatency(): Promise<number> {
    try {
      return this.databaseMetricsService.performanceMetrics().avgIndexedDbLatency || 0;
    } catch (error) {
      return 0;
    }
  }
}