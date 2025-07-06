import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CachedFirestoreService, CacheConfig, CollectionCacheConfig } from './cached-firestore.service';
import { IndexedDbService } from './indexed-db.service';
import { DatabaseMetricsService } from './database-metrics.service';
import { FirebaseMetricsService } from './firebase-metrics.service';

// Test implementation of CachedFirestoreService
class TestCachedFirestoreService extends CachedFirestoreService {
  protected override cacheConfig: CollectionCacheConfig = {
    'test-collection': {
      ttl: 60000, // 1 minute
      strategy: 'cache-first'
    },
    'network-first-collection': {
      ttl: 30000, // 30 seconds
      strategy: 'network-first'
    }
  };

  // Expose protected methods for testing
  public testGetCacheConfig(collection: string): CacheConfig {
    return this.getCacheConfig(collection);
  }

  public testIsCacheValid(timestamp: number, ttl: number): boolean {
    return this.isCacheValid(timestamp, ttl);
  }

  public testExtractCollectionFromPath(path: string): string {
    return this.extractCollectionFromPath(path);
  }

  // Mock parent methods
  protected override collection$<T>(path: string) {
    return of([{ id: '1', name: 'test' }] as T[]);
  }

  protected override doc$<T>(path: string) {
    return of({ id: '1', name: 'test' } as T);
  }
}

// Mock classes
class MockIndexedDbService {
  openDatabase = jest.fn().mockResolvedValue(undefined);
  get = jest.fn();
  put = jest.fn().mockResolvedValue('test-key');
  getAll = jest.fn().mockResolvedValue([]);
  delete = jest.fn().mockResolvedValue(undefined);
  clear = jest.fn().mockResolvedValue(undefined);
  count = jest.fn().mockResolvedValue(0);
}

class MockDatabaseMetricsService {
  recordOperation = jest.fn();
}

class MockFirebaseMetricsService {
  trackCall = jest.fn();
}

describe('CachedFirestoreService', () => {
  let service: TestCachedFirestoreService;
  let mockIndexedDbService: MockIndexedDbService;
  let mockDatabaseMetricsService: MockDatabaseMetricsService;
  let mockFirebaseMetricsService: MockFirebaseMetricsService;

  beforeEach(async () => {
    mockIndexedDbService = new MockIndexedDbService();
    mockDatabaseMetricsService = new MockDatabaseMetricsService();
    mockFirebaseMetricsService = new MockFirebaseMetricsService();

    TestBed.configureTestingModule({
      providers: [
        { provide: IndexedDbService, useValue: mockIndexedDbService },
        { provide: DatabaseMetricsService, useValue: mockDatabaseMetricsService },
        { provide: FirebaseMetricsService, useValue: mockFirebaseMetricsService }
      ]
    });

    service = new TestCachedFirestoreService();
    
    // Wait for initialization to complete
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize IndexedDB on creation', () => {
    expect(mockIndexedDbService.openDatabase).toHaveBeenCalledWith({
      name: 'spoonscount-cache',
      version: 1,
      stores: expect.any(Array)
    });
  });

  describe('getCacheConfig', () => {
    it('should return collection-specific config when available', () => {
      const config = service.testGetCacheConfig('test-collection');
      
      expect(config.ttl).toBe(60000);
      expect(config.strategy).toBe('cache-first');
    });

    it('should return default config for unknown collections', () => {
      const config = service.testGetCacheConfig('unknown-collection');
      
      expect(config.ttl).toBe(5 * 60 * 1000); // 5 minutes default
      expect(config.strategy).toBe('cache-first');
    });
  });

  describe('isCacheValid', () => {
    it('should return true for valid cache within TTL', () => {
      const now = Date.now();
      const timestamp = now - 30000; // 30 seconds ago
      const ttl = 60000; // 1 minute TTL
      
      const isValid = service.testIsCacheValid(timestamp, ttl);
      expect(isValid).toBe(true);
    });

    it('should return false for expired cache beyond TTL', () => {
      const now = Date.now();
      const timestamp = now - 120000; // 2 minutes ago
      const ttl = 60000; // 1 minute TTL
      
      const isValid = service.testIsCacheValid(timestamp, ttl);
      expect(isValid).toBe(false);
    });

    it('should handle edge case of exact TTL expiration', () => {
      const now = Date.now();
      const timestamp = now - 60000; // Exactly 1 minute ago
      const ttl = 60000; // 1 minute TTL
      
      const isValid = service.testIsCacheValid(timestamp, ttl);
      expect(isValid).toBe(false); // Should be expired at exact TTL
    });
  });

  describe('extractCollectionFromPath', () => {
    it('should extract collection name from document path', () => {
      const collection = service.testExtractCollectionFromPath('users/123');
      expect(collection).toBe('users');
    });

    it('should extract collection name from nested path', () => {
      const collection = service.testExtractCollectionFromPath('users/123/posts/456');
      expect(collection).toBe('users');
    });

    it('should return collection name when path is just collection', () => {
      const collection = service.testExtractCollectionFromPath('users');
      expect(collection).toBe('users');
    });
  });

  describe('collection$ caching behavior', () => {
    it('should use cache when valid data exists (cache-first strategy)', async () => {
      const cachedData = {
        data: [{ id: '1', name: 'cached' }],
        timestamp: Date.now() - 30000 // 30 seconds ago, within 1 minute TTL
      };
      
      mockIndexedDbService.get.mockResolvedValue(cachedData);
      
      const result = await service.collection$<any>('test-collection').toPromise();
      
      expect(result).toEqual(cachedData.data);
      expect(mockIndexedDbService.get).toHaveBeenCalledWith(
        'spoonscount-cache',
        'collections',
        'collection:test-collection'
      );
    });

    it('should fetch from network when cache is expired', async () => {
      const expiredCachedData = {
        data: [{ id: '1', name: 'expired' }],
        timestamp: Date.now() - 120000 // 2 minutes ago, beyond 1 minute TTL
      };
      
      mockIndexedDbService.get.mockResolvedValue(expiredCachedData);
      
      const result = await service.collection$<any>('test-collection').toPromise();
      
      // Should return fresh data from network, not expired cache
      expect(result).toEqual([{ id: '1', name: 'test' }]);
      expect(mockIndexedDbService.put).toHaveBeenCalled();
    });

    it('should fetch from network when no cache exists', async () => {
      mockIndexedDbService.get.mockResolvedValue(null);
      
      const result = await service.collection$<any>('test-collection').toPromise();
      
      expect(result).toEqual([{ id: '1', name: 'test' }]);
      expect(mockIndexedDbService.put).toHaveBeenCalled();
    });

    it('should record metrics for cache hits', async () => {
      const cachedData = {
        data: [{ id: '1', name: 'cached' }],
        timestamp: Date.now() - 30000
      };
      
      mockIndexedDbService.get.mockResolvedValue(cachedData);
      
      await service.collection$<any>('test-collection').toPromise();
      
      expect(mockDatabaseMetricsService.recordOperation).toHaveBeenCalledWith(
        'indexeddb',
        'read',
        'test-collection',
        expect.any(Number),
        true
      );
    });

    it('should record metrics for cache misses', async () => {
      mockIndexedDbService.get.mockResolvedValue(null);
      
      await service.collection$<any>('test-collection').toPromise();
      
      expect(mockDatabaseMetricsService.recordOperation).toHaveBeenCalledWith(
        'firestore',
        'read',
        'test-collection',
        expect.any(Number),
        false
      );
    });
  });

  describe('clearCollectionCache', () => {
    it('should clear cache entries for specified collection', async () => {
      const cacheEntries = [
        { id: 'collection:test-collection', collection: 'test-collection' },
        { id: 'collection:other-collection', collection: 'other-collection' },
        { id: 'collection:test-collection-2', collection: 'test-collection' }
      ];
      
      mockIndexedDbService.getAll.mockResolvedValue(cacheEntries);
      
      await service.clearCollectionCache('test-collection');
      
      expect(mockIndexedDbService.delete).toHaveBeenCalledTimes(2);
      expect(mockIndexedDbService.delete).toHaveBeenCalledWith(
        'spoonscount-cache',
        'collections',
        'collection:test-collection'
      );
      expect(mockIndexedDbService.delete).toHaveBeenCalledWith(
        'spoonscount-cache',
        'collections',
        'collection:test-collection-2'
      );
    });

    it('should handle errors when clearing cache', async () => {
      mockIndexedDbService.getAll.mockRejectedValue(new Error('Database error'));
      
      // Should not throw
      await expect(service.clearCollectionCache('test-collection')).resolves.toBeUndefined();
    });
  });

  describe('clearAllCaches', () => {
    it('should clear all cache stores', async () => {
      await service.clearAllCaches();
      
      expect(mockIndexedDbService.clear).toHaveBeenCalledWith('spoonscount-cache', 'collections');
      expect(mockIndexedDbService.clear).toHaveBeenCalledWith('spoonscount-cache', 'documents');
      expect(mockIndexedDbService.clear).toHaveBeenCalledWith('spoonscount-cache', 'metadata');
    });

    it('should handle errors when clearing all caches', async () => {
      mockIndexedDbService.clear.mockRejectedValue(new Error('Clear error'));
      
      // Should not throw
      await expect(service.clearAllCaches()).resolves.toBeUndefined();
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      const mockCollections = [
        { timestamp: Date.now() - 60000 },
        { timestamp: Date.now() - 30000 }
      ];
      const mockDocuments = [
        { timestamp: Date.now() - 90000 }
      ];
      
      mockIndexedDbService.count
        .mockResolvedValueOnce(2) // collections count
        .mockResolvedValueOnce(1); // documents count
      
      mockIndexedDbService.getAll
        .mockResolvedValueOnce(mockCollections)
        .mockResolvedValueOnce(mockDocuments);
      
      const stats = await service.getCacheStats();
      
      expect(stats.collections).toBe(2);
      expect(stats.documents).toBe(1);
      expect(stats.totalSize).toBe(3);
      expect(stats.oldestEntry).toBeInstanceOf(Date);
    });

    it('should handle empty cache gracefully', async () => {
      mockIndexedDbService.count.mockResolvedValue(0);
      mockIndexedDbService.getAll.mockResolvedValue([]);
      
      const stats = await service.getCacheStats();
      
      expect(stats.collections).toBe(0);
      expect(stats.documents).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.oldestEntry).toBeNull();
    });
  });
});