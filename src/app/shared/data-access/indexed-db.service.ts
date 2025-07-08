// src/app/shared/data-access/indexed-db.service.ts
import { Injectable } from '@angular/core';

type StoreConfig = {
  name: string;
  keyPath?: string;
  indexes?: Array<{
    name: string;
    keyPath: string;
    unique?: boolean;
  }>;
};

type DatabaseConfig = {
  name: string;
  version: number;
  stores: StoreConfig[];
};

type DbOperation = 'read' | 'write' | 'delete' | 'clear';

type DbMetrics = {
  operations: Record<DbOperation, number>;
  totalSize: number;
  lastUpdated: number;
  performance: {
    avgReadTime: number;
    avgWriteTime: number;
    operations: Array<{
      type: DbOperation;
      duration: number;
      timestamp: number;
      dbName: string;
      storeName: string;
      collection?: string;
      tier?: string;
    }>;
  };
  collections: {
    [collection: string]: {
      operations: number;
      avgLatency: number;
      totalSize: number;
      tier?: string;
      lastAccessed: number;
    };
  };
};

@Injectable({ providedIn: 'root' })
export class IndexedDbService {
  private databases = new Map<string, IDBDatabase>();
  private metrics: DbMetrics = {
    operations: { read: 0, write: 0, delete: 0, clear: 0 },
    totalSize: 0,
    lastUpdated: Date.now(),
    performance: {
      avgReadTime: 0,
      avgWriteTime: 0,
      operations: []
    },
    collections: {}
  };
  private readonly MAX_PERFORMANCE_LOGS = 1000;

  /**
   * Open or create a database with specified configuration
   */
  async openDatabase(config: DatabaseConfig): Promise<IDBDatabase> {
    console.log(`🔧 [IndexedDB] === OPENING DATABASE ===`);
    console.log(`🔧 [IndexedDB] Database: ${config.name} v${config.version}`);
    console.log(`🔧 [IndexedDB] Stores: ${config.stores.map(s => s.name).join(', ')}`);

    // Check if already open
    const existing = this.databases.get(config.name);
    if (existing && existing.version >= config.version) {
      console.log(`✅ [IndexedDB] Database already open: ${config.name} v${existing.version}`);
      return existing;
    }

    return new Promise((resolve, reject) => {
      console.log(`⏳ [IndexedDB] Requesting database open: ${config.name}`);
      const request = indexedDB.open(config.name, config.version);

      request.onupgradeneeded = (event) => {
        console.log(`🔄 [IndexedDB] === UPGRADE NEEDED ===`);
        console.log(`🔄 [IndexedDB] Upgrading ${config.name} from v${(event as any).oldVersion} to v${config.version}`);

        const db = (event.target as IDBOpenDBRequest).result;
        console.log(`🔄 [IndexedDB] Existing stores: [${Array.from(db.objectStoreNames).join(', ')}]`);

        // Create stores that don't exist
        for (const storeConfig of config.stores) {
          if (!db.objectStoreNames.contains(storeConfig.name)) {
            console.log(`🆕 [IndexedDB] Creating store: ${storeConfig.name}`);
            console.log(`🆕 [IndexedDB] Store config:`, storeConfig);

            const store = db.createObjectStore(
              storeConfig.name,
              storeConfig.keyPath ? { keyPath: storeConfig.keyPath } : undefined
            );

            // Create indexes if specified
            if (storeConfig.indexes) {
              for (const index of storeConfig.indexes) {
                console.log(`📇 [IndexedDB] Creating index: ${index.name} on ${index.keyPath}`);
                store.createIndex(index.name, index.keyPath, { unique: index.unique });
              }
            }
            console.log(`✅ [IndexedDB] Store created: ${storeConfig.name}`);
          } else {
            console.log(`ℹ️ [IndexedDB] Store already exists: ${storeConfig.name}`);
          }
        }
        console.log(`🔄 [IndexedDB] === UPGRADE COMPLETE ===`);
      };

      request.onsuccess = () => {
        const db = request.result;
        this.databases.set(config.name, db);
        console.log(`✅ [IndexedDB] === DATABASE OPENED SUCCESSFULLY ===`);
        console.log(`✅ [IndexedDB] Database: ${config.name} v${db.version}`);
        console.log(`✅ [IndexedDB] Available stores: [${Array.from(db.objectStoreNames).join(', ')}]`);
        resolve(db);
      };

      request.onerror = () => {
        console.error(`❌ [IndexedDB] === DATABASE OPEN FAILED ===`);
        console.error(`❌ [IndexedDB] Database: ${config.name}`);
        console.error(`❌ [IndexedDB] Error:`, request.error);
        reject(request.error);
      };

      request.onblocked = () => {
        console.warn(`⚠️ [IndexedDB] Database open blocked: ${config.name} (another tab may be using an older version)`);
      };
    });
  }

  /**
   * Store data in IndexedDB
   */
  async put<T>(
    dbName: string,
    storeName: string,
    data: T,
    key?: IDBValidKey
  ): Promise<IDBValidKey> {
    const startTime = performance.now();

    console.log(`💾 [IndexedDB] === PUT OPERATION STARTED ===`);
    console.log(`💾 [IndexedDB] Target: ${dbName}/${storeName}`);
    console.log(`💾 [IndexedDB] Key: ${key || 'auto-generated'}`);
    console.log(`💾 [IndexedDB] Data type: ${typeof data}`);

    // Log data size if it's a blob or large object
    if (data instanceof Blob) {
      console.log(`💾 [IndexedDB] Blob size: ${(data.size / 1024).toFixed(1)}KB (${data.type})`);
    } else if (typeof data === 'object' && data !== null) {
      try {
        const jsonSize = JSON.stringify(data).length;
        console.log(`💾 [IndexedDB] Object size: ~${(jsonSize / 1024).toFixed(1)}KB`);
      } catch {
        console.log(`💾 [IndexedDB] Object size: [unable to estimate]`);
      }
    }

    const db = await this.ensureDatabase(dbName);
    console.log(`📊 [IndexedDB] Database connection confirmed`);

    return new Promise((resolve, reject) => {
      console.log(`🔄 [IndexedDB] Creating transaction: ${storeName} (readwrite)`);

      const transaction = db.transaction([storeName], 'readwrite');

      transaction.onabort = () => {
        const duration = performance.now() - startTime;
        console.error(`❌ [IndexedDB] Transaction aborted after ${duration.toFixed(1)}ms`);
        console.error(`❌ [IndexedDB] Abort reason:`, transaction.error);
      };

      transaction.oncomplete = () => {
        const duration = performance.now() - startTime;
        console.log(`✅ [IndexedDB] Transaction completed successfully in ${duration.toFixed(1)}ms`);
      };

      transaction.onerror = () => {
        const duration = performance.now() - startTime;
        console.error(`❌ [IndexedDB] Transaction error after ${duration.toFixed(1)}ms:`, transaction.error);
      };

      const store = transaction.objectStore(storeName);
      console.log(`📂 [IndexedDB] Object store accessed: ${storeName}`);

      const request = key ? store.put(data, key) : store.put(data);
      console.log(`⏳ [IndexedDB] Put request initiated...`);

      request.onsuccess = () => {
        const duration = performance.now() - startTime;
        const resultKey = request.result;

        console.log(`✅ [IndexedDB] === PUT OPERATION SUCCESS ===`);
        console.log(`✅ [IndexedDB] Duration: ${duration.toFixed(1)}ms`);
        console.log(`✅ [IndexedDB] Result key: ${resultKey}`);
        console.log(`✅ [IndexedDB] Target: ${dbName}/${storeName}`);

        // Track metrics with collection context if available
        const collection = key ? this.extractCollectionFromKey(key) : undefined;
        this.recordOperation('write', duration, dbName, storeName, collection);

        resolve(resultKey);
      };

      request.onerror = () => {
        const duration = performance.now() - startTime;
        console.error(`❌ [IndexedDB] === PUT OPERATION FAILED ===`);
        console.error(`❌ [IndexedDB] Duration: ${duration.toFixed(1)}ms`);
        console.error(`❌ [IndexedDB] Target: ${dbName}/${storeName}`);
        console.error(`❌ [IndexedDB] Error:`, request.error);
        console.error(`❌ [IndexedDB] Error name:`, request.error?.name);
        console.error(`❌ [IndexedDB] Error message:`, request.error?.message);

        reject(request.error);
      };
    });
  }

  /**
   * Get data from IndexedDB
   */
  async get<T>(
    dbName: string,
    storeName: string,
    key: IDBValidKey
  ): Promise<T | undefined> {
    const startTime = performance.now();

    console.log(`🔍 [IndexedDB] === GET OPERATION STARTED ===`);
    console.log(`🔍 [IndexedDB] Target: ${dbName}/${storeName}`);
    console.log(`🔍 [IndexedDB] Key: ${key}`);

    const db = await this.ensureDatabase(dbName);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        const duration = performance.now() - startTime;
        const result = request.result as T | undefined;

        console.log(`✅ [IndexedDB] === GET OPERATION COMPLETE ===`);
        console.log(`✅ [IndexedDB] Duration: ${duration.toFixed(1)}ms`);
        console.log(`✅ [IndexedDB] Result: ${result ? 'found' : 'not found'}`);

        if (result && result instanceof Blob) {
          console.log(`✅ [IndexedDB] Retrieved blob: ${(result.size / 1024).toFixed(1)}KB (${result.type})`);
        }

        // Track metrics with collection context if available
        const collection = this.extractCollectionFromKey(key);
        this.recordOperation('read', duration, dbName, storeName, collection);

        resolve(result);
      };

      request.onerror = () => {
        const duration = performance.now() - startTime;
        console.error(`❌ [IndexedDB] === GET OPERATION FAILED ===`);
        console.error(`❌ [IndexedDB] Duration: ${duration.toFixed(1)}ms`);
        console.error(`❌ [IndexedDB] Error:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all items from a store
   */
  async getAll<T>(
    dbName: string,
    storeName: string
  ): Promise<T[]> {
    const startTime = performance.now();

    console.log(`📋 [IndexedDB] === GET ALL OPERATION STARTED ===`);
    console.log(`📋 [IndexedDB] Target: ${dbName}/${storeName}`);

    const db = await this.ensureDatabase(dbName);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const duration = performance.now() - startTime;
        const results = request.result;

        console.log(`✅ [IndexedDB] === GET ALL OPERATION COMPLETE ===`);
        console.log(`✅ [IndexedDB] Duration: ${duration.toFixed(1)}ms`);
        console.log(`✅ [IndexedDB] Items retrieved: ${results.length}`);

        // Log data sizes if they're blobs
        const blobCount = results.filter(item => item instanceof Blob).length;
        if (blobCount > 0) {
          const totalSize = results
            .filter(item => item instanceof Blob)
            .reduce((sum, blob) => sum + (blob as Blob).size, 0);
          console.log(`✅ [IndexedDB] Total blob data: ${blobCount} blobs, ${(totalSize / 1024).toFixed(1)}KB`);
        }

        // Track metrics (getAll operations don't have specific collection context)
        this.recordOperation('read', duration, dbName, storeName);

        resolve(results);
      };

      request.onerror = () => {
        const duration = performance.now() - startTime;
        console.error(`❌ [IndexedDB] === GET ALL OPERATION FAILED ===`);
        console.error(`❌ [IndexedDB] Duration: ${duration.toFixed(1)}ms`);
        console.error(`❌ [IndexedDB] Error:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all keys from a store
   */
  async getAllKeys(
    dbName: string,
    storeName: string
  ): Promise<IDBValidKey[]> {
    console.log(`🔑 [IndexedDB] Getting all keys from: ${dbName}/${storeName}`);

    const db = await this.ensureDatabase(dbName);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAllKeys();

      request.onsuccess = () => {
        console.log(`✅ [IndexedDB] Retrieved ${request.result.length} keys`);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error(`❌ [IndexedDB] Failed to get all keys:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Query items by index
   */
  async getByIndex<T>(
    dbName: string,
    storeName: string,
    indexName: string,
    value: IDBValidKey
  ): Promise<T[]> {
    console.log(`🔍 [IndexedDB] === QUERY BY INDEX ===`);
    console.log(`🔍 [IndexedDB] Target: ${dbName}/${storeName}/${indexName}`);
    console.log(`🔍 [IndexedDB] Value: ${value}`);

    const db = await this.ensureDatabase(dbName);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => {
        console.log(`✅ [IndexedDB] Found ${request.result.length} items by index`);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error(`❌ [IndexedDB] Failed to query by index:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete data from IndexedDB
   */
  async delete(
    dbName: string,
    storeName: string,
    key: IDBValidKey
  ): Promise<void> {
    const startTime = performance.now();
    
    console.log(`🗑️ [IndexedDB] === DELETE OPERATION STARTED ===`);
    console.log(`🗑️ [IndexedDB] Target: ${dbName}/${storeName}`);
    console.log(`🗑️ [IndexedDB] Key: ${key}`);

    const db = await this.ensureDatabase(dbName);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => {
        const duration = performance.now() - startTime;
        console.log(`✅ [IndexedDB] Delete successful: ${key}`);
        
        // Track metrics with collection context if available
        const collection = this.extractCollectionFromKey(key);
        this.recordOperation('delete', duration, dbName, storeName, collection);
        
        resolve();
      };

      request.onerror = () => {
        console.error(`❌ [IndexedDB] Delete failed:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Clear all data from a store
   */
  async clear(
    dbName: string,
    storeName: string
  ): Promise<void> {
    const startTime = performance.now();
    
    console.log(`🧹 [IndexedDB] === CLEAR OPERATION STARTED ===`);
    console.log(`🧹 [IndexedDB] Target: ${dbName}/${storeName}`);

    const db = await this.ensureDatabase(dbName);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => {
        const duration = performance.now() - startTime;
        console.log(`✅ [IndexedDB] Store cleared: ${storeName}`);
        
        // Track metrics (clear operations affect entire store)
        this.recordOperation('clear', duration, dbName, storeName);
        
        resolve();
      };

      request.onerror = () => {
        console.error(`❌ [IndexedDB] Clear failed:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Count items in a store
   */
  async count(
    dbName: string,
    storeName: string
  ): Promise<number> {
    console.log(`🔢 [IndexedDB] Counting items in: ${dbName}/${storeName}`);

    const db = await this.ensureDatabase(dbName);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => {
        console.log(`✅ [IndexedDB] Count result: ${request.result} items`);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error(`❌ [IndexedDB] Count failed:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Check if a key exists
   */
  async exists(
    dbName: string,
    storeName: string,
    key: IDBValidKey
  ): Promise<boolean> {
    const data = await this.get(dbName, storeName, key);
    return data !== undefined;
  }

  /**
   * Close a database connection
   */
  closeDatabase(dbName: string): void {
    const db = this.databases.get(dbName);
    if (db) {
      console.log(`🔒 [IndexedDB] Closing database: ${dbName}`);
      db.close();
      this.databases.delete(dbName);
    }
  }

  /**
   * Delete an entire database
   */
  async deleteDatabase(dbName: string): Promise<void> {
    console.log(`💥 [IndexedDB] === DELETING DATABASE ===`);
    console.log(`💥 [IndexedDB] Database: ${dbName}`);

    // Close if open
    this.closeDatabase(dbName);

    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(dbName);

      request.onsuccess = () => {
        console.log(`✅ [IndexedDB] Database deleted successfully: ${dbName}`);
        resolve();
      };

      request.onerror = () => {
        console.error(`❌ [IndexedDB] Failed to delete database: ${dbName}`, request.error);
        reject(request.error);
      };

      request.onblocked = () => {
        console.warn(`⚠️ [IndexedDB] Database deletion blocked: ${dbName} (close all tabs using this database)`);
      };
    });
  }

  /**
   * Get storage estimate (if available)
   */
  async getStorageEstimate(): Promise<{ usage?: number; quota?: number } | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      console.log(`📊 [IndexedDB] Storage estimate:`, {
        usage: estimate.usage ? `${(estimate.usage / 1024 / 1024).toFixed(2)} MB` : 'unknown',
        quota: estimate.quota ? `${(estimate.quota / 1024 / 1024).toFixed(2)} MB` : 'unknown',
        percentage: estimate.usage && estimate.quota ?
          `${((estimate.usage / estimate.quota) * 100).toFixed(1)}%` : 'unknown'
      });
      return estimate;
    }
    console.warn(`⚠️ [IndexedDB] Storage estimate API not available`);
    return null;
  }

  /**
   * Get current database metrics
   */
  getMetrics(): DbMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.metrics = {
      operations: { read: 0, write: 0, delete: 0, clear: 0 },
      totalSize: 0,
      lastUpdated: Date.now(),
      performance: {
        avgReadTime: 0,
        avgWriteTime: 0,
        operations: []
      },
      collections: {}
    };
    console.log(`📊 [IndexedDB] Metrics reset`);
  }

  /**
   * Get cache hit ratio (reads vs operations)
   */
  getCacheHitRatio(): number {
    const totalOps = Object.values(this.metrics.operations).reduce((sum, count) => sum + count, 0);
    return totalOps > 0 ? this.metrics.operations.read / totalOps : 0;
  }

  /**
   * Get collection-specific performance metrics
   */
  getCollectionMetrics(): Record<string, {
    operations: number;
    avgLatency: number;
    totalSize: number;
    tier?: string;
    lastAccessed: Date;
  }> {
    const result: Record<string, any> = {};
    for (const [collection, metrics] of Object.entries(this.metrics.collections)) {
      result[collection] = {
        ...metrics,
        lastAccessed: new Date(metrics.lastAccessed)
      };
    }
    return result;
  }

  /**
   * Get performance breakdown by cache tier
   */
  getTierPerformanceBreakdown(): Record<string, {
    collections: number;
    totalOperations: number;
    avgLatency: number;
    totalSize: number;
  }> {
    const tierBreakdown: Record<string, {
      collections: number;
      totalOperations: number;
      avgLatency: number;
      totalSize: number;
    }> = {};

    for (const metrics of Object.values(this.metrics.collections)) {
      const tier = metrics.tier || 'unknown';
      
      if (!tierBreakdown[tier]) {
        tierBreakdown[tier] = {
          collections: 0,
          totalOperations: 0,
          avgLatency: 0,
          totalSize: 0
        };
      }

      tierBreakdown[tier].collections++;
      tierBreakdown[tier].totalOperations += metrics.operations;
      tierBreakdown[tier].totalSize += metrics.totalSize;
      
      // Weighted average latency
      const currentTotal = tierBreakdown[tier].avgLatency * (tierBreakdown[tier].collections - 1);
      tierBreakdown[tier].avgLatency = (currentTotal + metrics.avgLatency) / tierBreakdown[tier].collections;
    }

    return tierBreakdown;
  }

  /**
   * Get average operation times
   */
  getPerformanceStats(): { avgReadTime: number; avgWriteTime: number; totalOperations: number } {
    return {
      avgReadTime: this.metrics.performance.avgReadTime,
      avgWriteTime: this.metrics.performance.avgWriteTime,
      totalOperations: this.metrics.performance.operations.length
    };
  }

  /**
   * Record operation metrics (internal helper)
   */
  private recordOperation(type: DbOperation, duration: number, dbName: string, storeName: string, collection?: string, tier?: string): void {
    // Update operation count
    this.metrics.operations[type]++;
    this.metrics.lastUpdated = Date.now();

    // Record performance data
    const operation = {
      type,
      duration,
      timestamp: Date.now(),
      dbName,
      storeName,
      collection,
      tier
    };

    this.metrics.performance.operations.push(operation);

    // Update collection-specific metrics if collection is provided
    if (collection) {
      this.updateCollectionMetrics(collection, type, duration, tier);
    }

    // Keep only recent operations (prevent memory bloat)
    if (this.metrics.performance.operations.length > this.MAX_PERFORMANCE_LOGS) {
      this.metrics.performance.operations = this.metrics.performance.operations.slice(-this.MAX_PERFORMANCE_LOGS);
    }

    // Update average times
    this.updateAverages();

    // Enhanced logging with collection context
    const collectionInfo = collection ? ` | Collection: ${collection}` : '';
    const tierInfo = tier ? ` | Tier: [${tier}]` : '';
    console.log(`📊 [IndexedDB] Metrics updated: ${type} operation took ${duration.toFixed(1)}ms${collectionInfo}${tierInfo}`);
  }

  /**
   * Update collection-specific metrics
   */
  private updateCollectionMetrics(collection: string, type: DbOperation, duration: number, tier?: string): void {
    if (!this.metrics.collections[collection]) {
      this.metrics.collections[collection] = {
        operations: 0,
        avgLatency: 0,
        totalSize: 0,
        tier,
        lastAccessed: Date.now()
      };
    }

    const collectionMetrics = this.metrics.collections[collection];
    const oldAvg = collectionMetrics.avgLatency;
    const oldCount = collectionMetrics.operations;
    
    // Update running average latency
    collectionMetrics.avgLatency = (oldAvg * oldCount + duration) / (oldCount + 1);
    collectionMetrics.operations++;
    collectionMetrics.lastAccessed = Date.now();
    
    // Update tier if provided
    if (tier) {
      collectionMetrics.tier = tier;
    }
  }

  /**
   * Update average performance times (internal helper)
   */
  private updateAverages(): void {
    const readOps = this.metrics.performance.operations.filter(op => op.type === 'read');
    const writeOps = this.metrics.performance.operations.filter(op => op.type === 'write');

    this.metrics.performance.avgReadTime = readOps.length > 0 
      ? readOps.reduce((sum, op) => sum + op.duration, 0) / readOps.length 
      : 0;

    this.metrics.performance.avgWriteTime = writeOps.length > 0 
      ? writeOps.reduce((sum, op) => sum + op.duration, 0) / writeOps.length 
      : 0;
  }

  /**
   * Extract collection name from cache key for metrics tracking
   */
  private extractCollectionFromKey(key: IDBValidKey): string | undefined {
    if (typeof key === 'string') {
      // Handle patterns like "collection:users" or "doc:users/123"
      if (key.startsWith('collection:')) {
        return key.replace('collection:', '');
      } else if (key.startsWith('doc:')) {
        const path = key.replace('doc:', '');
        return path.split('/')[0]; // Extract collection from document path
      }
    }
    return undefined;
  }

  /**
   * Ensure database is open (internal helper)
   */
  private async ensureDatabase(dbName: string): Promise<IDBDatabase> {
    const db = this.databases.get(dbName);
    if (!db) {
      console.error(`❌ [IndexedDB] Database not opened: ${dbName}`);
      console.error(`❌ [IndexedDB] Available databases: [${Array.from(this.databases.keys()).join(', ')}]`);
      throw new Error(`[IndexedDB] Database not opened: ${dbName}. Call openDatabase() first.`);
    }
    console.log(`✅ [IndexedDB] Database connection verified: ${dbName}`);
    return db;
  }
}
