// src/app/pubs/feature/pubs-list/pubs-list.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { PubListComponent } from './pubs-list.component';
import { PubStore } from '../../data-access/pub.store';
import { NearbyPubStore } from '../../data-access/nearby-pub.store';
import { CheckinStore } from '../../../check-in/data-access/check-in.store';
import { watchSignal } from '../../../shared/testing/signal-test-utils.spec';
import type { Pub } from '../../utils/pub.models';

describe('PubListComponent', () => {
  let component: PubListComponent;
  let fixture: ComponentFixture<PubListComponent>;
  let mockPubStore: any;
  let mockNearbyPubStore: any;
  let mockCheckinStore: any;
  let mockRouter: jest.Mocked<Router>;

  const mockPubs: Pub[] = [
    {
      id: '1',
      name: 'The Crown',
      address: '123 High St',
      city: 'London',
      region: 'Greater London',
      location: { lat: 51.5074, lng: -0.1278 },
    },
    {
      id: '2',
      name: 'The Swan',
      address: '456 Park Ave',
      city: 'Manchester',
      region: 'Greater Manchester',
      location: { lat: 53.4808, lng: -2.2426 },
    },
    {
      id: '3',
      name: 'The Red Lion',
      address: '789 Queen St',
      city: 'London',
      region: 'Greater London',
      location: { lat: 51.5155, lng: -0.0922 },
    }
  ];

  beforeEach(async () => {
    // ✅ Create mock stores with signal methods
    mockPubStore = {
      loading: signal(false),
      error: signal<string | null>(null),
      itemCount: signal(3),
      pubs: signal(mockPubs),
      sortedPubsByDistance: signal(mockPubs), // Will be updated in tests
      loadOnce: jest.fn(),
      load: jest.fn(),
    };

    mockNearbyPubStore = {
      location: signal<{ lat: number; lng: number } | null>(null),
    };

    mockCheckinStore = {
      userCheckins: signal<string[]>([]),
      loadOnce: jest.fn(),
    };

    mockRouter = {
      navigate: jest.fn(),
    } as any;

    await TestBed.configureTestingModule({
      imports: [PubListComponent],
      providers: [
        { provide: PubStore, useValue: mockPubStore },
        { provide: NearbyPubStore, useValue: mockNearbyPubStore },
        { provide: CheckinStore, useValue: mockCheckinStore },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PubListComponent);
    component = fixture.componentInstance;
  });

  describe('Pub Sorting Integration', () => {
    it('should display proximity message when location available', () => {
      // Arrange
      mockNearbyPubStore.location.set({ lat: 51.5074, lng: -0.1278 });

      // Act
      fixture.detectChanges();

      // Assert
      expect(component.hasLocationData()).toBe(true);
      const subtitle = fixture.nativeElement.querySelector('.page-subtitle');
      expect(subtitle?.textContent?.trim()).toBe('📍 Sorted by proximity');
    });

    it('should display alphabetical message when no location', () => {
      // Arrange
      mockNearbyPubStore.location.set(null);

      // Act
      fixture.detectChanges();

      // Assert
      expect(component.hasLocationData()).toBe(false);
      const subtitle = fixture.nativeElement.querySelector('.page-subtitle');
      expect(subtitle?.textContent?.trim()).toBe('📄 Sorted alphabetically');
    });

    it('should use sorted pubs from store as base for filtering', () => {
      // Arrange
      const sortedPubs = [mockPubs[2], mockPubs[0], mockPubs[1]]; // Reordered
      mockPubStore.sortedPubsByDistance.set(sortedPubs);

      // Act
      const filtered = component.filteredPubs();

      // Assert
      expect(filtered).toEqual(sortedPubs);
    });
  });

  describe('Search Filtering', () => {
    it('should filter pubs by name', () => {
      // Arrange
      mockPubStore.sortedPubsByDistance.set(mockPubs);

      // Act
      component.onSearch('Crown');
      const filtered = component.filteredPubs();

      // Assert
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('The Crown');
    });

    it('should filter pubs by address', () => {
      // Arrange
      mockPubStore.sortedPubsByDistance.set(mockPubs);

      // Act
      component.onSearch('Park Ave');
      const filtered = component.filteredPubs();

      // Assert
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('The Swan');
    });

    it('should filter pubs by city', () => {
      // Arrange
      mockPubStore.sortedPubsByDistance.set(mockPubs);

      // Act
      component.onSearch('Manchester');
      const filtered = component.filteredPubs();

      // Assert
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('The Swan');
    });

    it('should be case insensitive', () => {
      // Arrange
      mockPubStore.sortedPubsByDistance.set(mockPubs);

      // Act
      component.onSearch('CROWN');
      const filtered = component.filteredPubs();

      // Assert
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('The Crown');
    });

    it('should handle empty search terms', () => {
      // Arrange
      mockPubStore.sortedPubsByDistance.set(mockPubs);

      // Act
      component.onSearch('');
      const filtered = component.filteredPubs();

      // Assert
      expect(filtered).toEqual(mockPubs);
    });

    it('should handle whitespace-only search terms', () => {
      // Arrange
      mockPubStore.sortedPubsByDistance.set(mockPubs);

      // Act
      component.onSearch('   ');
      const filtered = component.filteredPubs();

      // Assert
      expect(filtered).toEqual(mockPubs);
    });
  });

  describe('Visited/Unvisited Filtering', () => {
    beforeEach(() => {
      mockPubStore.sortedPubsByDistance.set(mockPubs);
      // Set pubs 1 and 3 as visited
      mockCheckinStore.userCheckins.set(['1', '3']);
    });

    it('should show only visited pubs when unvisited disabled', () => {
      // Act
      component.toggleUnvisited(); // Disable unvisited
      const filtered = component.filteredPubs();

      // Assert
      expect(component.includeUnvisited()).toBe(false);
      expect(filtered).toHaveLength(2);
      expect(filtered.map(p => p.id)).toEqual(['1', '3']);
    });

    it('should show only unvisited pubs when visited disabled', () => {
      // Act
      component.toggleVisited(); // Disable visited
      const filtered = component.filteredPubs();

      // Assert
      expect(component.includeVisited()).toBe(false);
      expect(filtered).toHaveLength(1);
      expect(filtered.map(p => p.id)).toEqual(['2']);
    });

    it('should show no pubs when both filters disabled', () => {
      // Act
      component.toggleVisited(); // Disable visited
      component.toggleUnvisited(); // Disable unvisited
      const filtered = component.filteredPubs();

      // Assert
      expect(filtered).toHaveLength(0);
    });

    it('should calculate visited count correctly', () => {
      // Act
      const visitedCount = component.visitedCount();

      // Assert
      expect(visitedCount).toBe(2);
    });

    it('should calculate unvisited count correctly', () => {
      // Act
      const unvisitedCount = component.unvisitedCount();

      // Assert
      expect(unvisitedCount).toBe(1);
    });
  });

  describe('Combined Filtering', () => {
    beforeEach(() => {
      mockPubStore.sortedPubsByDistance.set(mockPubs);
      mockCheckinStore.userCheckins.set(['1']); // Only The Crown is visited
    });

    it('should combine search and visited filters', () => {
      // Act
      component.onSearch('London'); // Matches The Crown and The Red Lion
      component.toggleUnvisited(); // Show only visited
      const filtered = component.filteredPubs();

      // Assert
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('The Crown'); // Only visited pub in London
    });

    it('should preserve sorting order when filtering', () => {
      // Arrange - Set custom sort order
      const customOrder = [mockPubs[2], mockPubs[0], mockPubs[1]];
      mockPubStore.sortedPubsByDistance.set(customOrder);

      // Act
      component.onSearch('The'); // All pubs match
      const filtered = component.filteredPubs();

      // Assert - Order should match store's sorted order
      expect(filtered.map(p => p.id)).toEqual(['3', '1', '2']);
    });
  });

  describe('Filter State Management', () => {
    it('should detect active filters correctly', () => {
      // Arrange
      expect(component.hasActiveFilters()).toBe(false);

      // Act & Assert - Search filter
      component.onSearch('test');
      expect(component.hasActiveFilters()).toBe(true);

      // Act & Assert - Visited filter
      component.onSearch('');
      component.toggleVisited();
      expect(component.hasActiveFilters()).toBe(true);

      // Act & Assert - Unvisited filter
      component.toggleVisited(); // Reset
      component.toggleUnvisited();
      expect(component.hasActiveFilters()).toBe(true);
    });

    it('should clear all filters', () => {
      // Arrange
      component.onSearch('test');
      component.toggleVisited();
      component.toggleUnvisited();
      expect(component.hasActiveFilters()).toBe(true);

      // Act
      component.clearFilters();

      // Assert
      expect(component.searchTerm()).toBe('');
      expect(component.includeVisited()).toBe(true);
      expect(component.includeUnvisited()).toBe(true);
      expect(component.hasActiveFilters()).toBe(false);
    });
  });

  describe('Reactivity', () => {
    it('should react to changes in store sorting', () => {
      // Arrange
      const filteredWatcher = watchSignal(component.filteredPubs).startWatching();
      mockPubStore.sortedPubsByDistance.set(mockPubs);

      // Act - Change store sorting
      const reorderedPubs = [mockPubs[1], mockPubs[0], mockPubs[2]];
      mockPubStore.sortedPubsByDistance.set(reorderedPubs);

      // Assert
      expect(component.filteredPubs()).toEqual(reorderedPubs);
      expect(filteredWatcher.getValues().length).toBeGreaterThan(1);
    });

    it('should react to changes in checkin data', () => {
      // Arrange
      mockPubStore.sortedPubsByDistance.set(mockPubs);
      mockCheckinStore.userCheckins.set([]);
      component.toggleUnvisited(); // Show only visited pubs
      expect(component.filteredPubs()).toHaveLength(0);

      // Act - Add a checkin
      mockCheckinStore.userCheckins.set(['1']);

      // Assert
      expect(component.filteredPubs()).toHaveLength(1);
      expect(component.filteredPubs()[0].id).toBe('1');
    });
  });

  describe('Component Lifecycle', () => {
    it('should load data on init', () => {
      // Act
      component.ngOnInit();

      // Assert
      expect(mockPubStore.loadOnce).toHaveBeenCalled();
      expect(mockCheckinStore.loadOnce).toHaveBeenCalled();
    });

    it('should retry loading on error', () => {
      // Act
      component.retryLoad();

      // Assert
      expect(mockPubStore.load).toHaveBeenCalled();
    });
  });
});
