// src/app/pubs/data-access/pub.store.spec.ts
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthStore } from '@auth/data-access/auth.store';
import { CacheService, LocationService } from '@fourfold/angular-foundation';
import { createTestPub, createTestUser } from '@shared/testing/test-data';
import { calculateDistance } from '@shared/utils/location.utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Pub } from '../utils/pub.models';
import { PubService } from './pub.service';
import { PubStore } from './pub.store';

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
    // ARRANGE - Common test setup
    mockPubService = {
      getAllPubs: vi.fn().mockResolvedValue([...testPubs]),
      updatePubStats: vi.fn().mockResolvedValue(undefined),
      incrementCheckinCount: vi.fn().mockResolvedValue(undefined),
      updatePubHistory: vi.fn().mockResolvedValue(undefined),
      updatePubCarpetUrl: vi.fn().mockResolvedValue(undefined),
    };

    mockCacheService = {
      load: vi.fn(async ({ key, loadFresh }) => {
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

  describe('Store Initialization & Caching', () => {
    it('should initialize with default state', () => {
      // ARRANGE - Store created in beforeEach

      // ACT - No action needed for initial state test

      // ASSERT
      expect(store.data()).toEqual([]);
      expect(store.loading()).toBe(false);
      expect(store.error()).toBe(null);
    });

    it('should load pubs via the load method', async () => {
      // ARRANGE - Mock service configured in beforeEach

      // ACT
      await store.load();

      // ASSERT
      expect(mockPubService.getAllPubs).toHaveBeenCalled();
      expect(store.data().length).toBe(3);
      expect(store.loading()).toBe(false);
    });

    it('should use global cache with correct configuration', async () => {
      // ARRANGE - Cache service mocked in beforeEach

      // ACT
      await store.load();

      // ASSERT
      expect(mockCacheService.load).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'pubs-global',
          ttlMs: 1000 * 60 * 60, // 1 hour
        })
      );
    });

    it('should preserve global cache on user changes', async () => {
      // ARRANGE
      await store.load();
      const initialDataLength = store.data().length;
      const consoleSpy = vi.spyOn(console, 'log');
      
      // ACT - Test the behavior we can verify: global cache preservation
      // The store preserves pub data regardless of user changes
      const newUser = createTestUser({ uid: 'new-user-456' });
      mockAuthStore.user.set(newUser);
      
      // ASSERT - Pub data should still be available (global cache preserved)
      expect(store.data().length).toBe(initialDataLength);
      
      // Since this is global data, it should remain unchanged
      expect(store.pubs()).toEqual(testPubs);
    });
  });

  describe('Computed Signals', () => {
    beforeEach(async () => {
      await store.load();
    });

    it('should compute total count correctly', () => {
      // ARRANGE - Pubs loaded in beforeEach

      // ACT - No action needed for computed signal

      // ASSERT
      expect(store.totalCount()).toBe(3);
    });

    it('should sort pubs by name when location unavailable', () => {
      // ARRANGE
      mockLocationService._setLocation(null);

      // ACT
      const sorted = store.sortedPubsByDistance();

      // ASSERT
      expect(sorted.map(p => p.name)).toEqual([
        'The Anchor',
        'The Crown (Far)',
        'The Red Lion (Near)',
      ]);
    });

    it('should sort pubs by distance when location available', () => {
      // ARRANGE
      mockLocationService._setLocation(userLocation);

      // ACT
      const sorted = store.sortedPubsByDistance();

      // ASSERT
      expect(calculateDistance).toHaveBeenCalled();
      expect(sorted.map(p => p.name)).toEqual([
        'The Red Lion (Near)',
        'The Anchor',
        'The Crown (Far)',
      ]);
    });

    it('should compute pubs with Infinity distance when location null', () => {
      // ARRANGE
      mockLocationService._setLocation(null);

      // ACT
      const pubs = store.pubsWithDistance();

      // ASSERT
      expect(pubs.every(p => p.distance === Infinity)).toBe(true);
    });

    it('should compute pubs with calculated distances when location available', () => {
      // ARRANGE
      mockLocationService._setLocation(userLocation);

      // ACT
      const pubs = store.pubsWithDistance();

      // ASSERT
      expect(pubs.every(p => typeof p.distance === 'number' && p.distance !== Infinity)).toBe(true);
      expect(pubs.find(p => p.name.includes('Near'))?.distance).toBe(100);
      expect(pubs.find(p => p.name.includes('Far'))?.distance).toBe(1000);
    });
  });

  describe('Query Methods', () => {
    beforeEach(async () => {
      await store.load();
    });

    it('should find pub by name case-insensitively', () => {
      // ARRANGE - Pubs loaded in beforeEach

      // ACT
      const found = store.findByName('red lion');

      // ASSERT
      expect(found).toBeDefined();
      expect(found?.id).toBe('pub-1');
    });

    it('should find pubs within location radius', () => {
      // ARRANGE - Pubs loaded and distance mocked

      // ACT
      const found = store.findByLocation(userLocation.lat, userLocation.lng, 1);

      // ASSERT
      expect(found.length).toBeGreaterThan(0);
    });
  });

  describe('Data Refresh & Cache Management', () => {
    it('should refresh pub data by clearing cache and reloading', async () => {
      // ARRANGE - Store ready with mocked dependencies

      // ACT
      await store.refreshPubData();

      // ASSERT
      expect(mockCacheService.clear).toHaveBeenCalledWith('pubs-global');
      expect(mockPubService.getAllPubs).toHaveBeenCalledTimes(1);
    });

    it('should clear global pub cache', () => {
      // ARRANGE - Cache service mocked

      // ACT
      store.clearGlobalPubCache();

      // ASSERT
      expect(mockCacheService.clear).toHaveBeenCalledWith('pubs-global');
    });
  });

  describe('Pub Statistics & Updates', () => {
    beforeEach(async () => {
      await store.load();
    });

    it('should delegate pub stats updates to service', async () => {
      // ARRANGE
      const checkinData = { userId: 'user-1', pubId: 'pub-1', timestamp: new Date() };

      // ACT
      await store.updatePubStats('pub-1', checkinData as any, 'checkin-1');

      // ASSERT
      expect(mockPubService.updatePubStats).toHaveBeenCalled();
    });

    it('should delegate checkin count increment to service', async () => {
      // ARRANGE - Store loaded with test data

      // ACT
      await store.incrementCheckinCount('pub-1');

      // ASSERT
      expect(mockPubService.incrementCheckinCount).toHaveBeenCalledWith('pub-1');
    });

    it('should delegate pub history updates to service', async () => {
      // ARRANGE
      const timestamp = new Date();

      // ACT
      await store.updatePubHistory('pub-1', 'user-1', timestamp as any);

      // ASSERT
      expect(mockPubService.updatePubHistory).toHaveBeenCalled();
    });

    describe('Carpet URL Performance Optimization', () => {
      it('should update Firestore via PubService', async () => {
        // ARRANGE - Store loaded with test data

        // ACT
        await store.updatePubCarpetUrl('pub-1', 'new-url.jpg');

        // ASSERT
        expect(mockPubService.updatePubCarpetUrl).toHaveBeenCalledWith('pub-1', 'new-url.jpg');
      });

      it('should update pub signal in-memory for instant reactivity', async () => {
        // ARRANGE
        const originalPub = store.data().find(p => p.id === 'pub-1');
        expect(originalPub?.carpetUrl).toBeUndefined(); // Setup verification

        // ACT
        await store.updatePubCarpetUrl('pub-1', 'new-url.jpg');

        // ASSERT
        const updatedPub = store.data().find(p => p.id === 'pub-1');
        expect(updatedPub?.carpetUrl).toBe('new-url.jpg');
        expect(updatedPub?.hasCarpet).toBe(true);
        expect(updatedPub?.carpetUpdatedAt).toBeDefined();
      });

      it('should not trigger full cache reload for performance', async () => {
        // ARRANGE
        const initialCallCount = mockPubService.getAllPubs.mock.calls.length;

        // ACT
        await store.updatePubCarpetUrl('pub-1', 'new-url.jpg');

        // ASSERT - No additional calls to getAllPubs
        expect(mockPubService.getAllPubs).toHaveBeenCalledTimes(initialCallCount);
      });
    });
  });
});
