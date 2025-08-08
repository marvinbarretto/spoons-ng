// src/app/pubs/feature/pubs-list/pubs-list.component.ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { ActivatedRoute, RouterModule } from '@angular/router';
import type { CheckIn } from '@check-in/utils/check-in.models';
import {
  EmptyStateComponent,
  ErrorStateComponent,
  FirestoreCrudService,
  LoadingStateComponent,
  LocationService,
} from '@fourfold/angular-foundation';
import { UserStore } from '@users/data-access/user.store';
import { environment } from '../../../../environments/environment';
import { CheckInStore } from '../../../check-in/data-access/check-in.store';
import { BaseComponent } from '../../../shared/base/base.component';
// DataAggregatorService removed - using UserStore reactive patterns
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { PubStore } from '../../data-access/pub.store';
import { PubCardComponent } from '../../ui/pub-card/pub-card.component';
import type { Pub } from '../../utils/pub.models';

type FilterOption = 'all' | 'visited' | 'unvisited';

@Component({
  selector: 'app-pub-list',
  imports: [
    RouterModule,
    PubCardComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    IconComponent,
    ButtonComponent,
  ],
  templateUrl: './pub-list.component.html',
  styleUrl: './pub-list.component.scss',
})
export class PubListComponent extends BaseComponent implements OnInit {
  // ✅ Store dependencies
  protected readonly pubStore = inject(PubStore);
  private readonly checkinStore = inject(CheckInStore);
  private readonly userStore = inject(UserStore);
  // DataAggregatorService removed - using UserStore reactive patterns
  private readonly locationService = inject(LocationService);
  private readonly firestoreCrudService = inject(FirestoreCrudService);
  private readonly activatedRoute = inject(ActivatedRoute);

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
    const userCheckins = checkins.filter((checkin: CheckIn) => checkin.userId === user.uid);
    return [...new Set(userCheckins.map((checkin: CheckIn) => checkin.pubId))];
  });

  // ✅ Helper methods to replace DataAggregatorService functionality
  protected readonly verifiedPubsCount = computed(() => {
    return this.userCheckedInPubIds().length;
  });

  protected readonly unverifiedPubsCount = computed(() => {
    const user = this.userStore.user();
    if (!user) return 0;
    return (user.manuallyAddedPubIds || []).length;
  });

  // ✅ New computed properties for visit status
  protected readonly managementStats = computed(() => ({
    verified: this.verifiedPubsCount(),
    unverified: this.unverifiedPubsCount(),
    total: this.userStore.pubsVisited(),
  }));

  protected readonly selectedCount = computed(() => this.selectedForAddition().size);

  protected readonly isFromHomeQuickStart = computed(() => {
    const queryParams = this.activatedRoute.snapshot.queryParams;
    return queryParams['manage'] === 'true';
  });

  protected readonly shouldShowFilterPills = computed(() => {
    const visitedCount = this.userStore.pubsVisited();
    return visitedCount > 0;
  });

  protected readonly hasChangesToSave = computed(() => {
    // Only show the manage button if user is in management mode and has made changes
    if (!this.isManagementMode()) {
      return false;
    }

    // Check if any selections have been made (different from initial state)
    return this.selectedCount() > 0;
  });

  protected readonly searchFilteredPubs = computed(() => {
    const pubs = this.pubsWithDistance();
    const term = this.searchTerm().toLowerCase().trim();

    if (!term) return pubs;

    return pubs.filter(
      pub =>
        pub.name.toLowerCase().includes(term) ||
        pub.address.toLowerCase().includes(term) ||
        pub.city?.toLowerCase().includes(term) ||
        pub.region?.toLowerCase().includes(term)
    );
  });

  protected readonly filterFilteredPubs = computed(() => {
    const pubs = this.searchFilteredPubs();
    const filter = this.filterMode();

    switch (filter) {
      case 'visited':
        return pubs.filter(pub => this.hasAnyVisit(pub.id));
      case 'unvisited':
        return pubs.filter(pub => !this.hasAnyVisit(pub.id));
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

  // ✅ Filter counts for template - using global counts as source of truth
  getFilterCount(filter: FilterOption): number {
    const pubs = this.searchFilteredPubs();
    const hasSearchTerm = this.searchTerm().trim().length > 0;

    switch (filter) {
      case 'visited':
        // For visited count, use DataAggregator's global count if we're showing all pubs
        // Otherwise fall back to local filtering for search results
        if (!hasSearchTerm) {
          return this.userStore.pubsVisited();
        }
        return pubs.filter(pub => this.hasAnyVisit(pub.id)).length;
      case 'unvisited':
        // For unvisited, subtract visited from total available pubs
        const visitedCount = hasSearchTerm
          ? pubs.filter(pub => this.hasAnyVisit(pub.id)).length
          : this.userStore.pubsVisited();
        return pubs.length - visitedCount;
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

  hasVisitedPub(pubId: string): boolean {
    // Check verified visits (check-ins)
    const hasVerifiedVisit = this.userCheckedInPubIds().includes(pubId);

    // Check manual visits
    const user = this.userStore.user();
    const hasManualVisit = user?.manuallyAddedPubIds?.includes(pubId) || false;

    return hasVerifiedVisit || hasManualVisit;
  }

  hasAnyVisit(pubId: string): boolean {
    return this.hasVisitedPub(pubId);
  }

  getVisitCountForPub(pubId: string): number {
    const checkins = this.checkinStore.checkins();
    const user = this.user();
    if (!user) return 0;

    return checkins.filter(checkin => checkin.userId === user.uid && checkin.pubId === pubId)
      .length;
  }

  isLocalPub(pubId: string): boolean {
    const user = this.userStore.user();
    if (!user) return false;

    return user.homePubId === pubId;
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
    hasLocationData: this.hasLocationData(),
  }));

  protected readonly debugPubStats = computed(() => ({
    totalPubs: this.pubStore.totalCount(),
    loading: this.pubStore.loading(),
    error: this.pubStore.error(),
    hasLocation: this.pubsWithDistance().some(p => p.distance !== Infinity),
    nearbyCount: this.pubsWithDistance().filter(p => p.distance <= 2000).length,
  }));

  // ✅ Data loading
  protected override onInit(): void {
    this.pubStore.loadOnce();

    // ✅ Check for management mode query parameter (from home quick-start)
    const queryParams = this.activatedRoute.snapshot.queryParams;
    if (queryParams['manage'] === 'true') {
      console.log('[PubList] Management mode requested via query param from home quick-start');
      this._isManagementMode.set(true);
      // Note: New users from quick-start will have zero visited pubs, so no pre-selection needed
    }

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
  async toggleManagementMode(): Promise<void> {
    const enteringManagementMode = !this._isManagementMode();
    this._isManagementMode.set(enteringManagementMode);

    if (enteringManagementMode) {
      // Entering management mode: pre-select all visited pubs
      const visitedPubIds = new Set<string>();
      const allPubs = this.filteredPubs();

      // Check each pub and pre-select if visited
      allPubs.forEach(pub => {
        if (this.hasAnyVisit(pub.id)) {
          visitedPubIds.add(pub.id);
        }
      });

      this._selectedForAddition.set(visitedPubIds);
      console.log(
        '[PubList] Management mode enabled - pre-selected',
        visitedPubIds.size,
        'visited pubs'
      );
    } else {
      // Exiting management mode: save final selected state
      await this.saveFinalSelectedState();
      this._selectedForAddition.set(new Set());
      console.log('[PubList] Management mode disabled - final state saved');
    }
  }

  handleSelectionChange(event: { pub: Pub; selected: boolean }): void {
    const current = new Set(this._selectedForAddition());

    if (event.selected) {
      current.add(event.pub.id);
    } else {
      current.delete(event.pub.id);
    }

    this._selectedForAddition.set(current);
  }

  private async saveFinalSelectedState(): Promise<void> {
    const currentUser = this.user();
    if (!currentUser) {
      console.error('[PubList] No current user for saving state');
      return;
    }

    const selectedPubIds = this._selectedForAddition();

    try {
      const pubsToAdd: string[] = [];
      const pubsToRemove: string[] = [];

      // Get all possible pubs to check
      const allPubs = this.pubsWithDistance();

      for (const pub of allPubs) {
        const isSelected = selectedPubIds.has(pub.id);
        const hasVerifiedVisit = this.hasVerifiedCheckIn(pub.id);
        const hasUnverifiedVisit = this.hasUnverifiedVisit(pub.id);

        if (isSelected) {
          // Selected: Add if not already saved as unverified visit (verified visits stay as-is)
          if (!hasVerifiedVisit && !hasUnverifiedVisit) {
            pubsToAdd.push(pub.id);
          }
        } else {
          // Not selected: Remove if it's currently an unverified visit (verified visits stay as-is)
          if (!hasVerifiedVisit && hasUnverifiedVisit) {
            pubsToRemove.push(pub.id);
          }
        }
      }

      // Add new manual visits
      for (const pubId of pubsToAdd) {
        await this.userStore.addVisitedPub(pubId);
      }

      // Remove manual visits
      for (const pubId of pubsToRemove) {
        await this.userStore.removeVisitedPub(pubId);
      }

      console.log(
        '[PubList] Saved',
        pubsToAdd.length,
        'new manual visits, removed',
        pubsToRemove.length,
        'manual visits'
      );
    } catch (error: unknown) {
      console.error('[PubList] Error saving final state:', error);
    }
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
