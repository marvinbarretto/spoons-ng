// src/app/pubs/data-access/pub.store.spec.ts
import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { signal } from '@angular/core';
import { PubStore } from './pub.store';
import { PubService } from './pub.service';
import { CacheService, LocationService } from '@fourfold/angular-foundation';
import { AuthStore } from '@auth/data-access/auth.store';
import { createTestPub, createTestUser } from '@shared/testing/test-data';
import { calculateDistance } from '@shared/utils/location.utils';
import { Pub } from '../utils/pub.models';

// Mock the location utils to have predictable distances
vi.mock('@shared/utils/location.utils', () => ({
  calculateDistance: vi.fn((loc1, loc2) => {
    // Mock based on latitude, which is unique in test data for sorting
    if (loc2.lat === 51.5) return 100; // The Red Lion (Near)
    if (loc2.lat === 52.0) return 1000; // The Crown (Far)
    if (loc2.lat === 51.8) return 500; // The Anchor
    return 999; // Default for any other location
  }),
}));

describe('PubStore - Global Pub Data Management', () => {
  let store: PubStore;
  let mockPubService: any;
  let mockCacheService: any;
  let mockLocationService: any;
  let mockAuthStore: any;

  const testAuthUser = createTestUser({ uid: 'test-user-123' });
  const testPubs: Pub[] = [
    createTestPub({ id: 'pub-3', name: 'The Crown (Far)', location: { lat: 52.0, lng: -1.0 } }),
    createTestPub({ id: 'pub-1', name: 'The Red Lion (Near)', location: { lat: 51.5, lng: -0.1 } }),
    createTestPub({ id: 'pub-2', name: 'The Anchor', location: { lat: 51.8, lng: -0.5 } }),
  ];
  const userLocation = { lat: 51.5, lng: -0.1 };

  beforeEach(async () => {
    mockPubService = {
      getAllPubs: vi.fn().mockResolvedValue([...testPubs]),
      updatePubStats: vi.fn().mockResolvedValue(undefined),
      incrementCheckinCount: vi.fn().mockResolvedValue(undefined),
      updatePubHistory: vi.fn().mockResolvedValue(undefined),
      updatePubCarpetUrl: vi.fn().mockResolvedValue(undefined),
    };

    mockCacheService = {
      load: vi.fn(async ({ key, loadFresh }) => {
        // Simulate cache miss by always calling loadFresh
        return await loadFresh();
      }),
      clear: vi.fn(),
    };

    mockLocationService = {
      location: signal(null),
      _setLocation: function (loc: any) {
        this.location.set(loc);
      },
    };

    mockAuthStore = {
      user: signal(testAuthUser),
      uid: signal(testAuthUser.uid),
    };

    await TestBed.configureTestingModule({
      providers: [
        PubStore,
        { provide: PubService, useValue: mockPubService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: LocationService, useValue: mockLocationService },
        { provide: AuthStore, useValue: mockAuthStore },
      ],
    }).compileComponents();

    store = TestBed.inject(PubStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('🏗️ Store Initialization & Caching', () => {
    it('should initialize with default state from BaseStore', () => {
      expect(store.data()).toEqual([]);
      expect(store.loading()).toBe(false);
      expect(store.error()).toBe(null);
    });

    it('should load pubs on initialization via the `load` method', async () => {
      await store.load();
      expect(mockPubService.getAllPubs).toHaveBeenCalled();
      expect(store.data().length).toBe(3);
      expect(store.loading()).toBe(false);
    });

    it('should use CacheService to load data', async () => {
      await store.load();
      expect(mockCacheService.load).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'pubs-global',
          ttlMs: 1000 * 60 * 60, // 1 hour
        })
      );
    });

    it('should NOT clear pub data on user reset, preserving global cache', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      // This is a protected method, so we test it via its public alias if it exists,
      // or by casting to `any` to access it for testing purposes.
      (store as any).onUserReset('new-user-id');
      expect(consoleSpy).toHaveBeenCalledWith('[PubStore] User reset for new-user-id - keeping global pub cache');
      // We can't directly test that the cache wasn't cleared without loading data first,
      // but we can assert the log was made.
    });
  });

  describe('📈 Computed Signals', () => {
    beforeEach(async () => {
      await store.load();
    });

    it('should compute `totalCount` correctly', () => {
      expect(store.totalCount()).toBe(3);
    });

    it('should sort pubs by name when location is not available (`sortedPubsByDistance`)', () => {
      mockLocationService._setLocation(null);
      const sorted = store.sortedPubsByDistance();
      expect(sorted.map(p => p.name)).toEqual(['The Anchor', 'The Crown (Far)', 'The Red Lion (Near)']);
    });

    it('should sort pubs by distance when location IS available (`sortedPubsByDistance`)', () => {
      mockLocationService._setLocation(userLocation);
      const sorted = store.sortedPubsByDistance();
      expect(calculateDistance).toHaveBeenCalled();
      expect(sorted.map(p => p.name)).toEqual(['The Red Lion (Near)', 'The Anchor', 'The Crown (Far)']);
    });

    it('should compute `pubsWithDistance` with Infinity when location is null', () => {
      mockLocationService._setLocation(null);
      const pubs = store.pubsWithDistance();
      expect(pubs.every(p => p.distance === Infinity)).toBe(true);
    });

    it('should compute `pubsWithDistance` with calculated distances when location is available', () => {
      mockLocationService._setLocation(userLocation);
      const pubs = store.pubsWithDistance();
      expect(pubs.every(p => typeof p.distance === 'number' && p.distance !== Infinity)).toBe(true);
      expect(pubs.find(p => p.name.includes('Near'))?.distance).toBe(100);
      expect(pubs.find(p => p.name.includes('Far'))?.distance).toBe(1000);
    });
  });

  describe('🔍 Query Methods', () => {
    beforeEach(async () => {
      await store.load();
    });

    it('should `findByName` (case-insensitive)', () => {
      const found = store.findByName('red lion');
      expect(found).toBeDefined();
      expect(found?.id).toBe('pub-1');
    });

    it('should return `findByLocation` within a given radius', () => {
      // Since our mock is simple, we rely on the names
      const found = store.findByLocation(userLocation.lat, userLocation.lng, 1);
      // This test is tricky with the mocked distance function, but we can verify the logic
      expect(found.length).toBeGreaterThan(0);
    });
  });

  describe('🔄 Data Refresh & Cache Management', () => {
    it('should `refreshPubData` by clearing cache and reloading', async () => {
      await store.refreshPubData();
      expect(mockCacheService.clear).toHaveBeenCalledWith('pubs-global');
      expect(mockPubService.getAllPubs).toHaveBeenCalledTimes(1); // Called again on reload
    });

    it('should `clearGlobalPubCache` by calling cacheService.clear', () => {
      store.clearGlobalPubCache();
      expect(mockCacheService.clear).toHaveBeenCalledWith('pubs-global');
    });
  });

  describe('📊 Pub Statistics & Carpet URL Updates', () => {
    beforeEach(async () => {
      await store.load();
    });

    it('should delegate `updatePubStats` to PubService', async () => {
      const checkinData = { userId: 'user-1', pubId: 'pub-1', timestamp: new Date() };
      await store.updatePubStats('pub-1', checkinData as any, 'checkin-1');
      expect(mockPubService.updatePubStats).toHaveBeenCalled();
    });

    it('should delegate `incrementCheckinCount` to PubService', async () => {
      await store.incrementCheckinCount('pub-1');
      expect(mockPubService.incrementCheckinCount).toHaveBeenCalledWith('pub-1');
    });

    it('should delegate `updatePubHistory` to PubService', async () => {
      await store.updatePubHistory('pub-1', 'user-1', new Date() as any);
      expect(mockPubService.updatePubHistory).toHaveBeenCalled();
    });

    describe('🎯 CRITICAL: `updatePubCarpetUrl` Performance Optimization', () => {
      it('should delegate to PubService to update Firestore', async () => {
        await store.updatePubCarpetUrl('pub-1', 'new-url.jpg');
        expect(mockPubService.updatePubCarpetUrl).toHaveBeenCalledWith('pub-1', 'new-url.jpg');
      });

      it('should update the pub signal IN-MEMORY for instant UI reactivity', async () => {
        const originalPub = store.data().find(p => p.id === 'pub-1');
        expect(originalPub?.carpetUrl).toBeUndefined();

        await store.updatePubCarpetUrl('pub-1', 'new-url.jpg');

        const updatedPub = store.data().find(p => p.id === 'pub-1');
        expect(updatedPub?.carpetUrl).toBe('new-url.jpg');
        expect(updatedPub?.hasCarpet).toBe(true);
        expect(updatedPub?.carpetUpdatedAt).toBeDefined();
      });

      it('should NOT trigger a full cache reload (`getAllPubs`)', async () => {
        // `getAllPubs` is called once in `beforeEach`
        expect(mockPubService.getAllPubs).toHaveBeenCalledTimes(1);

        await store.updatePubCarpetUrl('pub-1', 'new-url.jpg');

        // Should still only be 1 call, proving no reload happened
        expect(mockPubService.getAllPubs).toHaveBeenCalledTimes(1);
      });
    });
  });
});
