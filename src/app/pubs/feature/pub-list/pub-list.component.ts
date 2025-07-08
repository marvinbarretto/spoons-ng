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
import { environment } from '../../../../environments/environment';

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
  private readonly _isManagementMode = signal(false);
  private readonly _selectedForAddition = signal<Set<string>>(new Set());

  // ✅ Expose state for template
  protected readonly searchTerm = this._searchTerm.asReadonly();
  protected readonly filterMode = this._filterMode.asReadonly();
  protected readonly isManagementMode = this._isManagementMode.asReadonly();
  protected readonly selectedForAddition = this._selectedForAddition.asReadonly();

  // ✅ Configuration for template
  protected readonly filterOptions = [
    { value: 'all' as const, label: 'All' },
    { value: 'visited' as const, label: 'Visited' },
    { value: 'unvisited' as const, label: 'Unvisited' },
    { value: 'nearby' as const, label: 'Nearby' }
  ];

  // ✅ Check-in distance threshold from environment
  protected readonly checkInDistanceThreshold = environment.checkInDistanceThresholdMeters || 200;

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

  // ✅ New computed properties for visit status
  protected readonly managementStats = computed(() => ({
    verified: this.dataAggregatorService.verifiedPubsCount(),
    unverified: this.dataAggregatorService.unverifiedPubsCount(),
    total: this.dataAggregatorService.pubsVisited()
  }));

  protected readonly selectedCount = computed(() => this.selectedForAddition().size);

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

  // ✅ New visit status helpers
  hasVerifiedCheckIn(pubId: string): boolean {
    return this.userCheckedInPubIds().includes(pubId);
  }

  hasUnverifiedVisit(pubId: string): boolean {
    return this.userStore.hasVisitedPub(pubId);
  }

  hasAnyVisit(pubId: string): boolean {
    return this.hasVerifiedCheckIn(pubId) || this.hasUnverifiedVisit(pubId);
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

  // ✅ Management mode methods
  toggleManagementMode(): void {
    const newMode = !this._isManagementMode();
    this._isManagementMode.set(newMode);
    
    // Clear selections when toggling
    this._selectedForAddition.set(new Set());
    
    console.log('[PubList] Management mode:', newMode ? 'enabled' : 'disabled');
  }

  handleSelectionChange(event: { pub: Pub; selected: boolean }): void {
    const current = new Set(this._selectedForAddition());
    
    if (event.selected) {
      current.add(event.pub.id);
    } else {
      current.delete(event.pub.id);
    }
    
    this._selectedForAddition.set(current);
    console.log('[PubList] Selection changed:', event.pub.name, event.selected);
  }

  async addSelectedAsManual(): Promise<void> {
    const selections = Array.from(this._selectedForAddition());
    
    if (selections.length === 0) {
      console.log('[PubList] No pubs selected for addition');
      return;
    }

    console.log('[PubList] Adding', selections.length, 'pubs as manually visited');
    
    try {
      for (const pubId of selections) {
        await this.userStore.addVisitedPub(pubId);
      }
      
      // Clear selections and show success feedback
      this._selectedForAddition.set(new Set());
      console.log('[PubList] Successfully added manual visits');
      
      // TODO: Show toast notification
      
    } catch (error) {
      console.error('[PubList] Failed to add manual visits:', error);
      // TODO: Show error notification
    }
  }

  clearSelections(): void {
    this._selectedForAddition.set(new Set());
  }

  // ✅ Navigation helper (for future use)
  handlePubClick(pub: Pub): void {
    // Don't navigate in management mode
    if (this._isManagementMode()) {
      return;
    }
    
    console.log('[PubList] Pub clicked:', pub.name);
    // Navigation is now handled by the router links in template
  }
}
