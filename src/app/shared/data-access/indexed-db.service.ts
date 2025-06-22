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
    console.log('[IndexedDB] Opening database:', config.name, 'v' + config.version);

    // Check if already open
    const existing = this.databases.get(config.name);
    if (existing && existing.version >= config.version) {
      console.log('[IndexedDB] Database already open:', config.name);
      return existing;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(config.name, config.version);

      request.onupgradeneeded = (event) => {
        console.log('[IndexedDB] Upgrade needed for:', config.name);
        const db = (event.target as IDBOpenDBRequest).result;

        // Create stores that don't exist
        for (const storeConfig of config.stores) {
          if (!db.objectStoreNames.contains(storeConfig.name)) {
            console.log('[IndexedDB] Creating store:', storeConfig.name);
            const store = db.createObjectStore(
              storeConfig.name,
              storeConfig.keyPath ? { keyPath: storeConfig.keyPath } : undefined
            );

            // Create indexes if specified
            if (storeConfig.indexes) {
              for (const index of storeConfig.indexes) {
                console.log('[IndexedDB] Creating index:', index.name);
                store.createIndex(index.name, index.keyPath, { unique: index.unique });
              }
            }
          }
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        this.databases.set(config.name, db);
        console.log('[IndexedDB] Database opened successfully:', config.name);
        resolve(db);
      };

      request.onerror = () => {
        console.error('[IndexedDB] Failed to open database:', config.name, request.error);
        reject(request.error);
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
    console.log('[IndexedDB] Storing data in:', `${dbName}/${storeName}`, key ? `with key: ${key}` : '');

    const db = await this.ensureDatabase(dbName);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      const request = key ? store.put(data, key) : store.put(data);

      request.onsuccess = () => {
        console.log('[IndexedDB] Data stored successfully, key:', request.result);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('[IndexedDB] Failed to store data:', request.error);
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
    console.log('[IndexedDB] Getting data from:', `${dbName}/${storeName}`, 'key:', key);

    const db = await this.ensureDatabase(dbName);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result as T | undefined;
        console.log('[IndexedDB] Data retrieved:', result ? 'found' : 'not found');
        resolve(result);
      };

      request.onerror = () => {
        console.error('[IndexedDB] Failed to get data:', request.error);
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
  console.log('[IndexedDB] Getting all items from:', `${dbName}/${storeName}`);

  const db = await this.ensureDatabase(dbName);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => {
      console.log('[IndexedDB] Retrieved all items:', request.result.length);
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('[IndexedDB] Failed to get all items:', request.error);
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
  console.log('[IndexedDB] Getting all keys from:', `${dbName}/${storeName}`);

  const db = await this.ensureDatabase(dbName);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAllKeys();

    request.onsuccess = () => {
      console.log('[IndexedDB] Retrieved all keys:', request.result.length);
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('[IndexedDB] Failed to get all keys:', request.error);
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
  console.log('[IndexedDB] Querying by index:', `${dbName}/${storeName}/${indexName}`, 'value:', value);

  const db = await this.ensureDatabase(dbName);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);

    request.onsuccess = () => {
      console.log('[IndexedDB] Found items by index:', request.result.length);
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('[IndexedDB] Failed to query by index:', request.error);
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
    console.log('[IndexedDB] Deleting from:', `${dbName}/${storeName}`, 'key:', key);

    const db = await this.ensureDatabase(dbName);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => {
        console.log('[IndexedDB] Data deleted successfully');
        resolve();
      };

      request.onerror = () => {
        console.error('[IndexedDB] Failed to delete data:', request.error);
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
    console.log('[IndexedDB] Clearing store:', `${dbName}/${storeName}`);

    const db = await this.ensureDatabase(dbName);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('[IndexedDB] Store cleared successfully');
        resolve();
      };

      request.onerror = () => {
        console.error('[IndexedDB] Failed to clear store:', request.error);
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
    console.log('[IndexedDB] Counting items in:', `${dbName}/${storeName}`);

    const db = await this.ensureDatabase(dbName);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => {
        console.log('[IndexedDB] Count:', request.result);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('[IndexedDB] Failed to count items:', request.error);
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
      console.log('[IndexedDB] Closing database:', dbName);
      db.close();
      this.databases.delete(dbName);
    }
  }

  /**
   * Delete an entire database
   */
  async deleteDatabase(dbName: string): Promise<void> {
    console.log('[IndexedDB] Deleting database:', dbName);

    // Close if open
    this.closeDatabase(dbName);

    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(dbName);

      request.onsuccess = () => {
        console.log('[IndexedDB] Database deleted successfully');
        resolve();
      };

      request.onerror = () => {
        console.error('[IndexedDB] Failed to delete database:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get storage estimate (if available)
   */
  async getStorageEstimate(): Promise<{ usage?: number; quota?: number } | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      console.log('[IndexedDB] Storage estimate:', {
        usage: estimate.usage ? `${(estimate.usage / 1024 / 1024).toFixed(2)} MB` : 'unknown',
        quota: estimate.quota ? `${(estimate.quota / 1024 / 1024).toFixed(2)} MB` : 'unknown'
      });
      return estimate;
    }
    return null;
  }

  /**
   * Ensure database is open (internal helper)
   */
  private async ensureDatabase(dbName: string): Promise<IDBDatabase> {
    const db = this.databases.get(dbName);
    if (!db) {
      throw new Error(`[IndexedDB] Database not opened: ${dbName}. Call openDatabase() first.`);
    }
    return db;
  }
}
