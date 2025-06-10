// src/app/pubs/data-access/pub.store.spec.ts
import { TestBed } from '@angular/core/testing';
import { PubStore } from './pub.store';
import { PubService } from './pub.service';
import { CacheService } from '../../shared/data-access/cache.service';
import { LocationService } from '../../shared/data-access/location.service';
import { CheckinStore } from '../../check-in/data-access/check-in.store';
import { watchSignal } from '../../shared/testing/signal-test-utils.spec';
import { signal } from '@angular/core';
import type { Pub, PubLocation } from '../utils/pub.models';
import { AuthStore } from '../../shared/data-access/auth.store'; // Added AuthStore import

describe('PubStore', () => {
  let store: PubStore;
  let mockCacheService: jest.Mocked<CacheService>;
  let mockLocationService: { location: ReturnType<typeof signal<{lat: number, lng: number} | null>> };
  let mockCheckinStore: { userCheckins: ReturnType<typeof signal<string[]>> };
  let mockAuthStore: { user: ReturnType<typeof signal<{ uid: string } | null>> };
  let mockPubService: jest.Mocked<PubService>;


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
      location: signal<{ lat: number; lng: number } | null>(null)
    };

    mockLocationService = {
      location: signal<{ lat: number; lng: number } | null>(null)
    };

    mockCheckinStore = { // Added mockCheckinStore
      userCheckins: signal<string[]>([])
    };

    mockAuthStore = { // Added mockAuthStore
      user: signal<{ uid: string } | null>(null)
    };

    mockPubService = { // Added mockPubService
      getAllPubs: jest.fn().mockResolvedValue(mockPubs)
    } as any;

    TestBed.configureTestingModule({
      providers: [
        PubStore,
        { provide: CacheService, useValue: mockCacheService },
        { provide: LocationService, useValue: mockLocationService },
        { provide: PubService, useValue: mockPubService }, // Use mocked PubService
        { provide: CheckinStore, useValue: mockCheckinStore }, // Use mocked CheckinStore
        { provide: AuthStore, useValue: mockAuthStore } // Provide mocked AuthStore
      ]
    });

    store = TestBed.inject(PubStore);
  });

  describe('Signal Reactivity', () => {
    it('should update loading state during load operation', async () => {
      // Arrange
      const loadingWatcher = watchSignal(store.loading).startWatching();
      mockCacheService.load.mockResolvedValue(mockPubs);

      // Act
      await store.load();

      // Assert
      loadingWatcher.expectValues([false, true, false]);
    });

    it('should set error state when load fails', async () => {
      // Arrange
      const errorWatcher = watchSignal(store.error).startWatching();
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

      const loadingWatcher = watchSignal(store.loading).startWatching();
      const errorWatcher = watchSignal(store.error).startWatching();

      // Act: Start loading
      const loadPromise = store.load();

      // Assert: Should be loading, no error
      expect(store.loading()).toBe(true);
      expect(store.error()).toBeNull();

      // Act: Complete loading
      resolveLoad!(mockPubs);
      await loadPromise;

      // Assert: Final state
      loadingWatcher.expectValues([false, true, false]);
      errorWatcher.expectValues([null]); // No errors
      expect(store.pubs()).toEqual(mockPubs);
    });
  });

  describe('Computed Signals', () => {
    it('should sort pubs by distance when location changes', () => {
      // Arrange
      store.pubs.set(mockPubs);
      const sortedWatcher = watchSignal(store.sortedPubsByDistance).startWatching();

      // Act: Set location closer to The Swan
      mockLocationService.location.set({ lat: 51.516, lng: -0.092 });

      // Assert: The Swan should be first (it's closer)
      const sortedPubs = store.sortedPubsByDistance();
      expect(sortedPubs[0].name).toBe('The Swan');
      expect(sortedPubs[1].name).toBe('The Crown');
    });

    it('should return unsorted pubs when no location available', () => {
      // Arrange
      store.pubs.set(mockPubs);

      // Act: No location set (remains null)

      // Assert: Should return original order
      expect(store.sortedPubsByDistance()).toEqual(mockPubs);
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

  describe('getDistanceForPub', () => {
    const testPub: Pub = {
      id: '3',
      name: 'The Anchor',
      address: '789 River Rd',
      location: { lat: 51.5000, lng: -0.1000 } // Some location
    };

    it('should calculate distance when user location is available', () => {
      // User at Buckingham Palace
      mockLocationService.location.set({ lat: 51.5014, lng: -0.1419 });
      const distance = store.getDistanceForPub(testPub);
      // This is an approximate distance. In a real scenario, you might use a more precise expected value
      // or mock the haversine calculation if it's complex.
      // For this example, let's assume the LocationService's haversineDistance is well-tested elsewhere.
      // We are testing the integration here.
      expect(distance).toBeCloseTo(2.8, 1); // ~2.8 km
    });

    it('should return undefined when user location is not available', () => {
      mockLocationService.location.set(null);
      const distance = store.getDistanceForPub(testPub);
      expect(distance).toBeUndefined();
    });
  });

  describe('getPubById', () => {
    beforeEach(() => {
      // Set mock pubs in the store's data signal
      store.data.set(mockPubs);
    });

    it('should return the correct pub when an existing ID is provided', () => {
      const pub = store.getPubById('1');
      expect(pub).toBeDefined();
      expect(pub?.id).toBe('1');
      expect(pub?.name).toBe('The Crown');
    });

    it('should return undefined when a non-existent ID is provided', () => {
      const pub = store.getPubById('non-existent-id');
      expect(pub).toBeUndefined();
    });
  });

  describe('Constructor User Effect', () => {
    let resetForUserSpy: jest.SpyInstance;
    let loadOnceSpy: jest.SpyInstance;

    beforeEach(() => {
      // Spies need to be set up on the specific store instance
      resetForUserSpy = jest.spyOn(store, 'resetForUser');
      loadOnceSpy = jest.spyOn(store, 'loadOnce').mockResolvedValue(); // Mock loadOnce to avoid actual loading
    });

    afterEach(() => {
      // Restore original methods
      resetForUserSpy.mockRestore();
      loadOnceSpy.mockRestore();
    });

    it('should call resetForUser and loadOnce on user login', () => {
      // Simulate user login
      const newUser = { uid: 'test-user-123' };
      mockAuthStore.user.set(newUser);

      // Expectations
      expect(resetForUserSpy).toHaveBeenCalledWith(newUser.uid);
      expect(loadOnceSpy).toHaveBeenCalled();
    });

    it('should call resetForUser on user logout', () => {
      // First, simulate a login to ensure there's a user session
      mockAuthStore.user.set({ uid: 'test-user-123' });
      resetForUserSpy.mockClear(); // Clear spy calls from login
      loadOnceSpy.mockClear();

      // Simulate user logout
      mockAuthStore.user.set(null);

      // Expectations
      expect(resetForUserSpy).toHaveBeenCalledWith(); // Called with no arguments or undefined
      expect(loadOnceSpy).not.toHaveBeenCalled(); // Should not load data on logout
    });
  });

  describe('fetchData (via load method)', () => {
    const testPubs: Pub[] = [{ id: 'p1', name: 'Test Pub 1', address: 'Addr 1', location: {lat: 1, lng: 1} }];

    beforeEach(() => {
      // Reset relevant mocks before each test
      mockCacheService.load.mockReset();
      mockPubService.getAllPubs.mockReset();
    });

    it('should call cacheService.load with correct parameters and use loadFresh function', async () => {
      mockPubService.getAllPubs.mockResolvedValue(testPubs); // Mock what loadFresh will call

      // Mock cacheService.load to immediately call the loadFresh function passed to it
      mockCacheService.load.mockImplementation(async (key, ttl, loadFresh) => {
        return loadFresh(); // Execute the loadFresh function
      });

      await store.load();

      expect(mockCacheService.load).toHaveBeenCalledWith(
        'pubs', // key
        expect.any(Number), // ttl
        expect.any(Function) // loadFresh function
      );
      // Verify that loadFresh (which calls pubService.getAllPubs) was executed
      expect(mockPubService.getAllPubs).toHaveBeenCalled();
      // And the store's data is updated
      expect(store.data()).toEqual(testPubs);
    });

    it('should resolve with pubs from pubService.getAllPubs when cache calls loadFresh', async () => {
      mockPubService.getAllPubs.mockResolvedValue(testPubs);

      mockCacheService.load.mockImplementation(async (key, ttl, loadFresh) => {
        return loadFresh();
      });

      const result = await store.load(); // load calls fetchData internally

      expect(result).toEqual(testPubs); // The load method itself should return the fetched data
      expect(store.data()).toEqual(testPubs); // The store's signal should also be updated
    });

    it('should use cached data if available and not call loadFresh', async () => {
      mockCacheService.load.mockResolvedValue(testPubs); // Cache returns data directly

      await store.load();

      expect(mockCacheService.load).toHaveBeenCalledWith(
        'pubs',
        expect.any(Number),
        expect.any(Function)
      );
      // loadFresh (and thus pubService.getAllPubs) should NOT have been called
      expect(mockPubService.getAllPubs).not.toHaveBeenCalled();
      expect(store.data()).toEqual(testPubs);
    });
  });

  describe('hasCheckedIn', () => {
    it('should return true if pub ID is in userCheckins', () => {
      mockCheckinStore.userCheckins.set(['1', '3']);
      expect(store.hasCheckedIn('1')).toBe(true);
    });

    it('should return false if pub ID is not in userCheckins', () => {
      mockCheckinStore.userCheckins.set(['1', '3']);
      expect(store.hasCheckedIn('2')).toBe(false);
    });

    it('should return false if userCheckins is empty', () => {
      mockCheckinStore.userCheckins.set([]);
      expect(store.hasCheckedIn('1')).toBe(false);
    });
  });

  describe('resetForUser', () => {
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
      mockCacheService.clear.mockReset();
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); // Spy on console.log and suppress output
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should clear cache and log message with userId', () => {
      store.resetForUser('test-user-id');
      expect(mockCacheService.clear).toHaveBeenCalledWith('pubs');
      expect(consoleLogSpy).toHaveBeenCalledWith('PubStore: Resetting for user test-user-id');
    });

    it('should log message without userId if not provided', () => {
      store.resetForUser();
      expect(mockCacheService.clear).toHaveBeenCalledWith('pubs'); // Still clears cache
      expect(consoleLogSpy).toHaveBeenCalledWith('PubStore: Resetting for new user (logged out or unknown)');
    });
  });
});
