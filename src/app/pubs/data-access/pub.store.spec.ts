// src/app/pubs/data-access/pub.store.spec.ts
import { TestBed } from '@angular/core/testing';
import { PubStore } from './pub.store';
import { PubService } from './pub.service';
import { CacheService } from '../../shared/data-access/cache.service';
import { LocationService } from '../../shared/data-access/location.service';
import { CheckinStore } from '../../check-in/data-access/check-in.store';
import { watchSignal, createMockStore } from '../../shared/testing/signal-test-utils.spec';
import { signal } from '@angular/core';
import type { Pub } from '../utils/pub.models';

describe('PubStore', () => {
  let store: PubStore;
  let mockCacheService: jest.Mocked<CacheService>;
  let mockLocationService: { location$$: ReturnType<typeof signal> };

  const mockPubs: Pub[] = [
    {
      id: '1',
      name: 'The Crown',
      address: '123 High St',
      location: { lat: 51.5074, lng: -0.1278 }, // London
    },
    {
      id: '2',
      name: 'The Swan',
      address: '456 Park Ave',
      location: { lat: 51.5155, lng: -0.0922 }, // Closer to test location
    }
  ];

  beforeEach(() => {
    mockCacheService = {
      load: jest.fn(),
      clear: jest.fn(),
    } as any;

    mockLocationService = {
      location$$: signal<{ lat: number; lng: number } | null>(null)
    };

    TestBed.configureTestingModule({
      providers: [
        PubStore,
        { provide: CacheService, useValue: mockCacheService },
        { provide: LocationService, useValue: mockLocationService },
        { provide: PubService, useValue: {} },
        { provide: CheckinStore, useValue: { checkins: signal([]) } },
      ]
    });

    store = TestBed.inject(PubStore);
  });

  describe('Signal Reactivity', () => {
    it('should update loading state during load operation', async () => {
      // Arrange
      const loadingWatcher = watchSignal(store.loading$$).startWatching();
      mockCacheService.load.mockResolvedValue(mockPubs);

      // Act
      await store.load();

      // Assert
      loadingWatcher.expectValues([false, true, false]);
    });

    it('should set error state when load fails', async () => {
      // Arrange
      const errorWatcher = watchSignal(store.error$$).startWatching();
      mockCacheService.load.mockRejectedValue(new Error('Network failed'));

      // Act
      await store.load();

      // Assert
      errorWatcher.expectValues([null, 'Network failed']);
    });
  });

  describe('State Transitions', () => {
    it('should transition through loading states correctly', async () => {
      // Arrange: Mock slow loading
      let resolveLoad: (value: Pub[]) => void;
      mockCacheService.load.mockReturnValue(
        new Promise(resolve => { resolveLoad = resolve; })
      );

      const loadingWatcher = watchSignal(store.loading$$).startWatching();
      const errorWatcher = watchSignal(store.error$$).startWatching();

      // Act: Start loading
      const loadPromise = store.load();

      // Assert: Should be loading, no error
      expect(store.loading$$()).toBe(true);
      expect(store.error$$()).toBeNull();

      // Act: Complete loading
      resolveLoad!(mockPubs);
      await loadPromise;

      // Assert: Final state
      loadingWatcher.expectValues([false, true, false]);
      errorWatcher.expectValues([null]); // No errors
      expect(store.pubs$$()).toEqual(mockPubs);
    });
  });

  describe('Computed Signals', () => {
    it('should sort pubs by distance when location changes', () => {
      // Arrange
      store.pubs$$.set(mockPubs);
      const sortedWatcher = watchSignal(store.sortedPubsByDistance$$).startWatching();

      // Act: Set location closer to The Swan
      mockLocationService.location$$.set({ lat: 51.516, lng: -0.092 });

      // Assert: The Swan should be first (it's closer)
      const sortedPubs = store.sortedPubsByDistance$$();
      expect(sortedPubs[0].name).toBe('The Swan');
      expect(sortedPubs[1].name).toBe('The Crown');
    });

    it('should return unsorted pubs when no location available', () => {
      // Arrange
      store.pubs$$.set(mockPubs);

      // Act: No location set (remains null)

      // Assert: Should return original order
      expect(store.sortedPubsByDistance$$()).toEqual(mockPubs);
    });
  });

  describe('loadOnce behavior', () => {
    it('should only load once when called multiple times', async () => {
      // Arrange
      mockCacheService.load.mockResolvedValue(mockPubs);

      // Act
      await store.loadOnce();
      await store.loadOnce();
      await store.loadOnce();

      // Assert
      expect(mockCacheService.load).toHaveBeenCalledTimes(1);
    });

    it('should load again after reset', async () => {
      // Arrange
      mockCacheService.load.mockResolvedValue(mockPubs);
      await store.loadOnce();

      // Act
      store.reset();
      await store.loadOnce();

      // Assert
      expect(mockCacheService.load).toHaveBeenCalledTimes(2);
    });
  });
});
