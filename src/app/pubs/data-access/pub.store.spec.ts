// src/app/pubs/data-access/pub.store.spec.ts
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CacheService } from '../../shared/data-access/cache.service';
import type { GeoLocation } from '../../shared/data-access/location.service';
import { LocationService } from '../../shared/data-access/location.service';
import { watchSignal } from '../../shared/testing/signal-test-utils.spec';
import type { Pub } from '../utils/pub.models';
import { PubService } from './pub.service';
import { PubStore } from './pub.store';

describe('PubStore Sorting', () => {
  let store: PubStore;
  let mockCacheService: jest.Mocked<CacheService>;
  let mockLocationService: { location: ReturnType<typeof signal<GeoLocation | null>> };

  const mockPubs: Pub[] = [
    {
      id: '1',
      name: 'Zebra Pub',
      address: '789 Far St',
      city: 'London',
      region: 'Greater London',
      location: { lat: 51.5074, lng: -0.1278 }, // London center
    },
    {
      id: '2',
      name: 'Alpha Pub',
      address: '123 Close Ave',
      city: 'London',
      region: 'Greater London',
      location: { lat: 51.5155, lng: -0.0922 }, // Closer to test location
    },
    {
      id: '3',
      name: 'Beta Pub',
      address: '456 Mid St',
      city: 'London',
      region: 'Greater London',
      location: { lat: 51.5, lng: -0.15 }, // Middle distance
    },
  ];

  const testLocation: GeoLocation = { lat: 51.52, lng: -0.08 }; // Near Alpha Pub

  beforeEach(() => {
    mockCacheService = {
      load: jest.fn(),
      clear: jest.fn(),
    } as any;

    mockLocationService = {
      location: signal<GeoLocation | null>(null),
    };

    TestBed.configureTestingModule({
      providers: [
        PubStore,
        { provide: CacheService, useValue: mockCacheService },
        { provide: LocationService, useValue: mockLocationService },
        { provide: PubService, useValue: {} },
      ],
    });

    store = TestBed.inject(PubStore);

    // ✅ Set up mock data
    mockCacheService.load.mockResolvedValue(mockPubs);
  });

  describe('sortedPubsByDistance', () => {
    beforeEach(async () => {
      await store.load(); // Load the mock data
    });

    it('should sort alphabetically when no location data', () => {
      // Arrange
      mockLocationService.location.set(null);

      // Act
      const sorted = store.sortedPubsByDistance();

      // Assert
      expect(sorted.map(p => p.name)).toEqual(['Alpha Pub', 'Beta Pub', 'Zebra Pub']);
    });

    it('should sort by proximity when location data available', () => {
      // Arrange
      mockLocationService.location.set(testLocation);

      // Act
      const sorted = store.sortedPubsByDistance();

      // Assert - Alpha Pub should be closest to test location
      expect(sorted.map(p => p.name)).toEqual(['Alpha Pub', 'Beta Pub', 'Zebra Pub']);
      expect(sorted[0].id).toBe('2'); // Alpha Pub
    });

    it('should reactively re-sort when location changes', () => {
      // Arrange
      const sortedWatcher = watchSignal(store.sortedPubsByDistance).startWatching();

      // Act - Start with no location (alphabetical)
      mockLocationService.location.set(null);
      const alphabetical = store.sortedPubsByDistance();

      // Act - Add location (proximity)
      mockLocationService.location.set(testLocation);
      const byProximity = store.sortedPubsByDistance();

      // Assert
      expect(alphabetical.map(p => p.name)).toEqual(['Alpha Pub', 'Beta Pub', 'Zebra Pub']);
      expect(byProximity[0].id).toBe('2'); // Alpha Pub is closest

      // Verify reactivity
      expect(sortedWatcher.getValues()).toHaveLength(3); // Initial + 2 updates
    });

    it('should maintain alphabetical order for same distances', async () => {
      // Arrange - Set all pubs to same location
      const samePubs: Pub[] = mockPubs.map(pub => ({
        ...pub,
        location: { lat: 51.5074, lng: -0.1278 },
      }));

      mockCacheService.load.mockResolvedValue(samePubs);
      await store.load();
      mockLocationService.location.set(testLocation);

      // Act
      const sorted = store.sortedPubsByDistance();

      // Assert - Should fall back to alphabetical for same distances
      expect(sorted.map(p => p.name)).toEqual(['Alpha Pub', 'Beta Pub', 'Zebra Pub']);
    });
  });

  describe('pubsWithDistance', () => {
    beforeEach(async () => {
      await store.load();
    });

    it('should add Infinity distance when no location', () => {
      // Arrange
      mockLocationService.location.set(null);

      // Act
      const withDistance = store.pubsWithDistance();

      // Assert
      withDistance.forEach(pub => {
        expect(pub.distance).toBe(Infinity);
      });
    });

    it('should calculate actual distances when location available', () => {
      // Arrange
      mockLocationService.location.set(testLocation);

      // Act
      const withDistance = store.pubsWithDistance();

      // Assert
      withDistance.forEach(pub => {
        expect(pub.distance).toBeGreaterThan(0);
        expect(pub.distance).not.toBe(Infinity);
        expect(typeof pub.distance).toBe('number');
      });
    });

    it('should preserve all pub properties', () => {
      // Arrange
      mockLocationService.location.set(testLocation);

      // Act
      const withDistance = store.pubsWithDistance();

      // Assert
      withDistance.forEach((pub, index) => {
        const originalPub = mockPubs[index];
        expect(pub.id).toBe(originalPub.id);
        expect(pub.name).toBe(originalPub.name);
        expect(pub.address).toBe(originalPub.address);
        expect(pub.location).toEqual(originalPub.location);
        expect(pub).toHaveProperty('distance');
      });
    });
  });

  describe('error handling', () => {
    it('should handle invalid location data gracefully', () => {
      // Arrange
      mockLocationService.location.set({ lat: NaN, lng: NaN } as any);

      // Act & Assert - Should not throw
      expect(() => store.sortedPubsByDistance()).not.toThrow();
      expect(() => store.pubsWithDistance()).not.toThrow();
    });

    it('should handle empty pubs array', async () => {
      // Arrange
      mockCacheService.load.mockResolvedValue([]);
      await store.load();
      mockLocationService.location.set(testLocation);

      // Act
      const sorted = store.sortedPubsByDistance();
      const withDistance = store.pubsWithDistance();

      // Assert
      expect(sorted).toEqual([]);
      expect(withDistance).toEqual([]);
    });
  });
});
