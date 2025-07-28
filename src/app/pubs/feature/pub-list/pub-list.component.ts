// src/app/pubs/feature/pubs-list/pubs-list.component.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';

import { RouterModule } from '@angular/router';
import { BaseComponent } from '../../../shared/base/base.component';
import { PubStore } from '../../data-access/pub.store';
import { CheckInStore } from '../../../check-in/data-access/check-in.store';
import { UserStore } from '@users/data-access/user.store';
import { DataAggregatorService } from '../../../shared/data-access/data-aggregator.service';
import { LocationService } from '../../../shared/data-access/location.service';
import { FirestoreCrudService } from '@fourfold/angular-foundation';
import { PubCardComponent } from '../../ui/pub-card/pub-card.component';
import { LoadingStateComponent, ErrorStateComponent, EmptyStateComponent } from '../../../shared/ui/state-components';
import type { Pub } from '../../utils/pub.models';
import type { CheckIn } from '@check-in/utils/check-in.models';
import { environment } from '../../../../environments/environment';

type FilterOption = 'all' | 'visited' | 'unvisited' | 'nearby';

type ManagementActionType = 'add' | 'remove';

interface PendingManagementAction {
  readonly pubId: string;
  readonly action: ManagementActionType;
  readonly pubName: string;
}

@Component({
  selector: 'app-pub-list',
  imports: [RouterModule, PubCardComponent, LoadingStateComponent, ErrorStateComponent, EmptyStateComponent],
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
  private readonly firestoreCrudService = inject(FirestoreCrudService);

  // ✅ Local state
  private readonly _searchTerm = signal('');
  private readonly _filterMode = signal<FilterOption>('all');
  private readonly _isManagementMode = signal(false);
  private readonly _selectedForAddition = signal<Set<string>>(new Set());
  
  // ✅ Action tracking for batch processing
  private readonly _pendingActions = signal<PendingManagementAction[]>([]);

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
    const userCheckins = checkins.filter((checkin: CheckIn) => checkin.userId === user.uid);
    return [...new Set(userCheckins.map((checkin: CheckIn) => checkin.pubId))];
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
      console.log('[PubList] Management mode enabled - pre-selected', visitedPubIds.size, 'visited pubs');
    } else {
      // Exiting management mode: process pending actions then clear
      await this.processPendingActions();
      this._selectedForAddition.set(new Set());
      this._pendingActions.set([]);
      console.log('[PubList] Management mode disabled - selections and actions cleared');
    }
  }

  handleSelectionChange(event: { pub: Pub; selected: boolean }): void {
    const current = new Set(this._selectedForAddition());
    const wasInitiallyVisited = this.hasAnyVisit(event.pub.id);
    
    if (event.selected) {
      current.add(event.pub.id);
    } else {
      current.delete(event.pub.id);
    }
    
    this._selectedForAddition.set(current);
    
    // Track the action for batch processing
    const currentActions: PendingManagementAction[] = [...this._pendingActions()];
    const action: ManagementActionType | null = this.determineAction(event.selected, wasInitiallyVisited);
    
    if (action) {
      const newAction: PendingManagementAction = {
        pubId: event.pub.id,
        action: action,
        pubName: event.pub.name
      };
      
      // Remove any existing action for this pub, then add the new one
      const filteredActions: PendingManagementAction[] = currentActions.filter(
        (a: PendingManagementAction) => a.pubId !== event.pub.id
      );
      filteredActions.push(newAction);
      
      this._pendingActions.set(filteredActions);
      
      console.log('[PubList] Action tracked:', {
        pub: event.pub.name,
        wasInitiallyVisited,
        selected: event.selected,
        action: action,
        totalPendingActions: filteredActions.length
      });
    }
  }

  private determineAction(selected: boolean, wasInitiallyVisited: boolean): ManagementActionType | null {
    if (wasInitiallyVisited && !selected) {
      return 'remove'; // Was visited, now unchecked = remove from history
    } else if (!wasInitiallyVisited && selected) {
      return 'add'; // Was unvisited, now checked = add to history
    }
    return null; // No action needed (back to original state)
  }

  private async processPendingActions(): Promise<void> {
    const actions: PendingManagementAction[] = this._pendingActions();
    
    if (actions.length === 0) {
      console.log('[PubList] No pending actions to process');
      return;
    }

    console.log('[PubList] Processing', actions.length, 'pending actions:', actions);

    const currentUser = this.user();
    if (!currentUser) {
      console.error('[PubList] No current user for batch processing');
      return;
    }

    try {
      // Process adds and removes separately
      const addActions: PendingManagementAction[] = actions.filter(
        (action: PendingManagementAction) => action.action === 'add'
      );
      const removeActions: PendingManagementAction[] = actions.filter(
        (action: PendingManagementAction) => action.action === 'remove'
      );

      // Process additions (add to manuallyAddedPubIds)
      if (addActions.length > 0) {
        for (const action of addActions) {
          await this.userStore.addVisitedPub(action.pubId);
        }
        const pubNamesToAdd: string[] = addActions.map((action: PendingManagementAction) => action.pubName);
        console.log('[PubList] Added', addActions.length, 'manual visits:', pubNamesToAdd);
      }

      // Process removals (remove from manuallyAddedPubIds and check-ins)
      if (removeActions.length > 0) {
        // TODO: Implement removal method in UserStore
        console.log('[PubList] Removal not yet implemented - need to add removeVisitedPub method to UserStore');
        const pubNamesToRemove: string[] = removeActions.map((action: PendingManagementAction) => action.pubName);
        console.log('[PubList] Would remove', removeActions.length, 'visits:', pubNamesToRemove);
      }

      console.log('[PubList] Successfully processed all pending actions');
      
    } catch (error: unknown) {
      console.error('[PubList] Error processing pending actions:', error);
      // TODO: Show user-friendly error message
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
