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

@Injectable({ providedIn: 'root' })
export class IndexedDbService {
  private databases = new Map<string, IDBDatabase>();

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
    console.log(`🗑️ [IndexedDB] === DELETE OPERATION STARTED ===`);
    console.log(`🗑️ [IndexedDB] Target: ${dbName}/${storeName}`);
    console.log(`🗑️ [IndexedDB] Key: ${key}`);

    const db = await this.ensureDatabase(dbName);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => {
        console.log(`✅ [IndexedDB] Delete successful: ${key}`);
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
    console.log(`🧹 [IndexedDB] === CLEAR OPERATION STARTED ===`);
    console.log(`🧹 [IndexedDB] Target: ${dbName}/${storeName}`);

    const db = await this.ensureDatabase(dbName);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => {
        console.log(`✅ [IndexedDB] Store cleared: ${storeName}`);
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
