// src/app/pubs/feature/pubs-list/pubs-list.component.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BaseComponent } from '../../../shared/base/base.component';
import { PubStore } from '../../data-access/pub.store';
import { CheckInStore } from '../../../check-in/data-access/check-in.store';
import { UserStore } from '@users/data-access/user.store';
import { DataAggregatorService } from '../../../shared/data-access/data-aggregator.service';
import { LocationService } from '../../../shared/data-access/location.service';
import { PubCardComponent } from '../../ui/pub-card/pub-card.component';
import { LoadingStateComponent, ErrorStateComponent, EmptyStateComponent } from '../../../shared/ui/state-components';
import type { Pub } from '../../utils/pub.models';

type FilterOption = 'all' | 'visited' | 'unvisited' | 'nearby';

@Component({
  selector: 'app-pub-list',
  imports: [CommonModule, RouterModule, PubCardComponent, LoadingStateComponent, ErrorStateComponent, EmptyStateComponent],
  templateUrl: './pub-list.component.html',
  styleUrl: './pub-list.component.scss'
})
export class PubListComponent extends BaseComponent implements OnInit {
  // ✅ Store dependencies
  protected readonly pubStore = inject(PubStore);
  private readonly checkinStore = inject(CheckInStore);
  private readonly userStore = inject(UserStore);
  protected readonly dataAggregatorService = inject(DataAggregatorService);
  private readonly locationService = inject(LocationService);

  // ✅ Local state
  private readonly _searchTerm = signal('');
  private readonly _filterMode = signal<FilterOption>('all');

  // ✅ Expose state for template
  protected readonly searchTerm = this._searchTerm.asReadonly();
  protected readonly filterMode = this._filterMode.asReadonly();

  // ✅ Configuration for template
  protected readonly filterOptions = [
    { value: 'all' as const, label: 'All' },
    { value: 'visited' as const, label: 'Visited' },
    { value: 'unvisited' as const, label: 'Unvisited' },
    { value: 'nearby' as const, label: 'Nearby' }
  ];

  // ✅ Data computations
  protected readonly pubsWithDistance = this.pubStore.pubsWithDistance;
  protected readonly user = this.userStore.user;

  // ✅ Location data detection
  protected readonly hasLocationData = computed(() => {
    return this.pubsWithDistance().some(pub => pub.distance !== Infinity);
  });

  protected readonly userCheckedInPubIds = computed(() => {
    const user = this.user();
    if (!user) return [];

    const checkins = this.checkinStore.checkins();
    const userCheckins = checkins.filter((c: any) => c.userId === user.uid);
    return [...new Set(userCheckins.map((c: any) => c.pubId))];
  });

  protected readonly searchFilteredPubs = computed(() => {
    const pubs = this.pubsWithDistance();
    const term = this.searchTerm().toLowerCase().trim();

    if (!term) return pubs;

    return pubs.filter(pub =>
      pub.name.toLowerCase().includes(term) ||
      pub.address.toLowerCase().includes(term) ||
      pub.city?.toLowerCase().includes(term) ||
      pub.region?.toLowerCase().includes(term)
    );
  });

  protected readonly filterFilteredPubs = computed(() => {
    const pubs = this.searchFilteredPubs();
    const filter = this.filterMode();
    const checkedInIds = this.userCheckedInPubIds();

    switch (filter) {
      case 'visited':
        return pubs.filter(pub => checkedInIds.includes(pub.id));
      case 'unvisited':
        return pubs.filter(pub => !checkedInIds.includes(pub.id));
      case 'nearby':
        return pubs.filter(pub => pub.distance !== Infinity && pub.distance <= 2000); // 2km
      default:
        return pubs;
    }
  });

  // ✅ SIMPLIFIED: Smart automatic sorting
  protected readonly filteredPubs = computed(() => {
    const pubs = this.filterFilteredPubs();
    const hasLocation = this.hasLocationData();

    // ✅ Smart automatic sorting - no user controls needed
    const sorted = [...pubs].sort((a, b) => {
      if (hasLocation) {
        // Sort by distance when location available
        return a.distance - b.distance;
      } else {
        // Sort alphabetically when no location
        return a.name.localeCompare(b.name);
      }
    });

    return sorted;
  });

  // ✅ Filter counts for template
  getFilterCount(filter: FilterOption): number {
    const pubs = this.searchFilteredPubs();
    const checkedInIds = this.userCheckedInPubIds();

    switch (filter) {
      case 'visited':
        return pubs.filter(pub => checkedInIds.includes(pub.id)).length;
      case 'unvisited':
        return pubs.filter(pub => !checkedInIds.includes(pub.id)).length;
      case 'nearby':
        return pubs.filter(pub => pub.distance !== Infinity && pub.distance <= 2000).length;
      default:
        return pubs.length;
    }
  }

  // ✅ Helper methods
  hasUserCheckedIn(pubId: string): boolean {
    return this.userCheckedInPubIds().includes(pubId);
  }

  // ✅ Development helper
  protected readonly isDevelopment = computed(() => true);

  // ✅ Debug information
  protected readonly debugFilterInfo = computed(() => ({
    searchTerm: this.searchTerm(),
    filterMode: this.filterMode(),
    totalPubs: this.pubsWithDistance().length,
    searchFiltered: this.searchFilteredPubs().length,
    finalFiltered: this.filteredPubs().length,
    userCheckedInCount: this.userCheckedInPubIds().length,
    hasLocationData: this.hasLocationData()
  }));

  protected readonly debugPubStats = computed(() => ({
    totalPubs: this.pubStore.totalCount(),
    loading: this.pubStore.loading(),
    error: this.pubStore.error(),
    hasLocation: this.pubsWithDistance().some(p => p.distance !== Infinity),
    nearbyCount: this.pubsWithDistance().filter(p => p.distance <= 2000).length
  }));

  // ✅ Data loading
  protected override onInit(): void {
    this.pubStore.loadOnce();

    // ✅ Initialize location if not already set
    if (!this.locationService.location()) {
      console.log('[PubList] 📍 No location data, requesting current location...');
      this.locationService.getCurrentLocation();
    } else {
      console.log('[PubList] 📍 Location already available:', this.locationService.location());
    }

    // ✅ Console debug logging
    console.group('🍺 PubListComponent Debug');
    console.log('Filter State:', this.debugFilterInfo());
    console.log('Pub Stats:', this.debugPubStats());
    console.log('Location:', this.locationService.location());
    console.groupEnd();
  }

  // ✅ Search controls
  setSearchTerm(event: Event): void {
    const target = event.target as HTMLInputElement;
    this._searchTerm.set(target.value);
  }

  clearSearch(): void {
    this._searchTerm.set('');
  }

  // ✅ Filter controls
  setFilter(filter: FilterOption): void {
    this._filterMode.set(filter);
  }

  resetFilters(): void {
    this._searchTerm.set('');
    this._filterMode.set('all');
  }

  // ✅ Retry loading (needed by template)
  retryLoad(): void {
    this.pubStore.load();
  }

  // ✅ Navigation helper (for future use)
  handlePubClick(pub: Pub): void {
    console.log('[PubList] Pub clicked:', pub.name);
    // Navigation is now handled by the router links in template
  }
}
