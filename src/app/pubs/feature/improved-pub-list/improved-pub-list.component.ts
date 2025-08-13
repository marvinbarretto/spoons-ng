// src/app/pubs/feature/improved-pub-list/improved-pub-list.component.ts
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import type { CheckIn } from '@check-in/utils/check-in.models';
import {
  EmptyStateComponent,
  ErrorStateComponent,
  LoadingStateComponent,
  LocationService,
} from '@fourfold/angular-foundation';
import { UserStore } from '@users/data-access/user.store';
import { environment } from '../../../../environments/environment';
import { CheckInStore } from '../../../check-in/data-access/check-in.store';
import { BaseComponent } from '../../../shared/base/base.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { PubStore } from '../../data-access/pub.store';
import { ImprovedPubCardComponent } from '../../ui/improved-pub-card/improved-pub-card.component';
import type { Pub } from '../../utils/pub.models';

type FilterOption = 'all' | 'visited' | 'unvisited';
type ViewMode = 'exploration' | 'completion';


interface ProgressState {
  total: number;
  visited: number;
  percentage: number;
  showCelebration: boolean;
  lastVisitedPubId?: string;
}

@Component({
  selector: 'app-improved-pub-list',
  imports: [
    RouterModule,
    ImprovedPubCardComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    IconComponent,
  ],
  templateUrl: './improved-pub-list.component.html',
  styleUrl: './improved-pub-list.component.scss',
})
export class ImprovedPubListComponent extends BaseComponent {
  // ✅ Store dependencies
  protected readonly pubStore = inject(PubStore);
  private readonly checkinStore = inject(CheckInStore);
  private readonly userStore = inject(UserStore);
  private readonly locationService = inject(LocationService);
  private readonly activatedRoute = inject(ActivatedRoute);

  // ✅ Local state signals
  private readonly _searchTerm = signal('');
  private readonly _filterMode = signal<FilterOption>('all');
  private readonly _viewMode = signal<ViewMode>('exploration');
  private readonly _selectedGroups = signal<Set<string>>(new Set());
  private readonly _progressState = signal<ProgressState>({
    total: 0,
    visited: 0,
    percentage: 0,
    showCelebration: false,
  });

  // ✅ Expose state for template - readonly
  protected readonly searchTerm = this._searchTerm.asReadonly();
  protected readonly filterMode = this._filterMode.asReadonly();
  protected readonly viewMode = this._viewMode.asReadonly();
  protected readonly selectedGroups = this._selectedGroups.asReadonly();
  protected readonly progressState = this._progressState.asReadonly();

  // ✅ Configuration
  protected readonly filterOptions = [
    { value: 'all' as const, label: 'All', icon: 'list' },
    { value: 'visited' as const, label: 'Visited', icon: 'check_circle' },
    { value: 'unvisited' as const, label: 'To Visit', icon: 'explore' },
  ];

  protected readonly checkInDistanceThreshold = environment.checkInDistanceThresholdMeters || 200;

  // ✅ Core data computations
  protected readonly pubsWithDistance = this.pubStore.pubsWithDistance;
  protected readonly user = this.userStore.user;

  protected readonly userCheckedInPubIds = computed(() => {
    const user = this.user();
    if (!user) return [];

    const checkins = this.checkinStore.checkins();
    const userCheckins = checkins.filter((checkin: CheckIn) => checkin.userId === user.uid);
    return [...new Set(userCheckins.map((checkin: CheckIn) => checkin.pubId))];
  });

  protected readonly hasLocationData = computed(() => {
    return this.pubsWithDistance().some(pub => pub.distance !== Infinity);
  });

  // ✅ Search and filter computations
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

  // ✅ Final sorted pub list - no grouping, just smart sorting
  protected readonly sortedPubs = computed(() => {
    const pubs = this.filterFilteredPubs();
    return this.sortPubsForViewMode(pubs);
  });

  // ✅ Progress tracking computation
  protected readonly progressStats = computed(() => {
    const allPubs = this.pubsWithDistance();
    const visitedCount = this.userStore.pubsVisited();
    const total = allPubs.length;
    const percentage = total > 0 ? Math.round((visitedCount / total) * 100) : 0;

    return {
      total,
      visited: visitedCount,
      percentage,
      showCelebration: false,
    };
  });

  // ✅ Filter counts for pills
  protected readonly filterCounts = computed(() => {
    const pubs = this.searchFilteredPubs();
    const visitedCount = pubs.filter(pub => this.hasAnyVisit(pub.id)).length;
    
    return {
      all: pubs.length,
      visited: visitedCount,
      unvisited: pubs.length - visitedCount,
    };
  });

  // ✅ Helper methods for template
  protected readonly Math = Math;
  
  protected readonly totalPubCount = computed(() => {
    return this.sortedPubs().length;
  });

  // ✅ Helper methods
  hasAnyVisit(pubId: string): boolean {
    const hasVerifiedVisit = this.userCheckedInPubIds().includes(pubId);
    const user = this.userStore.user();
    const hasManualVisit = user?.manuallyAddedPubIds?.includes(pubId) || false;
    return hasVerifiedVisit || hasManualVisit;
  }

  hasVerifiedCheckIn(pubId: string): boolean {
    return this.userCheckedInPubIds().includes(pubId);
  }

  hasUnverifiedVisit(pubId: string): boolean {
    return this.userStore.hasVisitedPub(pubId);
  }

  getVisitCountForPub(pubId: string): number {
    const checkins = this.checkinStore.checkins();
    const user = this.user();
    if (!user) return 0;

    return checkins.filter(checkin => checkin.userId === user.uid && checkin.pubId === pubId).length;
  }

  isLocalPub(pubId: string): boolean {
    const user = this.userStore.user();
    if (!user) return false;
    return user.homePubId === pubId;
  }

  // ✅ Consistent sorting that maintains pub positions regardless of visit status
  private sortPubsForViewMode(pubs: (Pub & { distance: number })[]): (Pub & { distance: number })[] {
    const sorted = [...pubs];
    const hasLocation = this.hasLocationData();

    // Sort consistently by distance or alphabetically, regardless of visit status
    return sorted.sort((a, b) => {
      if (hasLocation && a.distance !== Infinity && b.distance !== Infinity) {
        // Sort by distance when location is available
        return a.distance - b.distance;
      }
      
      // Sort alphabetically when no location data
      return a.name.localeCompare(b.name);
    });
  }

  // ✅ Data loading
  protected override onInit(): void {
    this.pubStore.loadOnce();

    // Initialize location if not available
    if (!this.locationService.location()) {
      this.locationService.getCurrentLocation();
    }

    // Update progress state
    this._progressState.set(this.progressStats());
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
    
    // Auto-switch view mode based on filter
    if (filter === 'unvisited') {
      this._viewMode.set('exploration');
    } else if (filter === 'visited') {
      this._viewMode.set('completion');
    }
  }

  // ✅ View mode controls
  setViewMode(mode: ViewMode): void {
    this._viewMode.set(mode);
  }


  // ✅ Visit tracking
  async handlePubVisited(pubId: string): Promise<void> {
    try {
      // Add the pub as manually visited
      await this.userStore.addVisitedPub(pubId);
      console.log('[ImprovedPubList] Successfully marked pub as visited:', pubId);
    } catch (error) {
      console.error('[ImprovedPubList] Error marking pub as visited:', error);
      // Could show error toast here in the future
    }
  }

  // ✅ Toggle visit status (for removing manual visits)
  async handlePubVisitToggle(pubId: string): Promise<void> {
    try {
      const isCurrentlyVisited = this.hasAnyVisit(pubId);
      const hasVerifiedVisit = this.hasVerifiedCheckIn(pubId);
      
      // Only allow toggling of manual visits, not verified check-ins
      if (hasVerifiedVisit) {
        console.log('[ImprovedPubList] Cannot toggle verified visit:', pubId);
        return;
      }
      
      if (isCurrentlyVisited) {
        // Remove manual visit
        await this.userStore.removeVisitedPub(pubId);
        console.log('[ImprovedPubList] Removed manual visit:', pubId);
      } else {
        // Add manual visit
        await this.handlePubVisited(pubId);
      }
    } catch (error) {
      console.error('[ImprovedPubList] Error toggling visit status:', error);
    }
  }

  // ✅ Reset all filters
  resetFilters(): void {
    this._searchTerm.set('');
    this._filterMode.set('all');
    this._viewMode.set('exploration');
  }

  // ✅ Retry loading
  retryLoad(): void {
    this.pubStore.load();
  }
}