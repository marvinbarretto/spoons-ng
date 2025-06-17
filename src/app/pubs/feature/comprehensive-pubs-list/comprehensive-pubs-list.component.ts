// src/app/pubs/feature/pubs-list/comprehensive-pubs-list.component.ts
import { Component, inject, computed, signal, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../shared/data-access/base.component';
import { PubStore } from '../../data-access/pub.store';
import { CheckinStore } from '../../../check-in/data-access/check-in.store';
import { AdvancedListControlsComponent, type ListControlsConfig, type ListControlsState, type ViewMode } from '../../../shared/ui/advanced-list-controls/advanced-list-controls.component';
import { VirtualListComponent, type VirtualListConfig } from '../../../shared/ui/virtual-list/virtual-list.component';
import { PubCardComponent } from '../../ui/pub-card/pub-card.component';
import type { Pub, PubWithDistance } from '../../utils/pub.models';
import { environment } from '../../../../environments/environment';
import { ScrollingModule } from '@angular/cdk/scrolling';


@Component({
  selector: 'app-comprehensive-pubs-list',
  imports: [
    CommonModule,
    AdvancedListControlsComponent,
    ScrollingModule,
    VirtualListComponent,
    PubCardComponent
  ],
  templateUrl: './comprehensive-pubs-list.component.html',
  styles: `
    .comprehensive-pub-list {
      min-height: 100vh;
      padding: 1rem;
      background: var(--color-background);
    }

    .page-header {
      margin-bottom: 2rem;
      text-align: center;
    }

    .page-header h1 {
      font-size: 2rem;
      font-weight: 700;
      color: var(--color-text);
      margin: 0 0 0.5rem 0;
    }

    .page-subtitle {
      font-size: 1rem;
      color: var(--color-text-secondary);
      margin: 0;
    }

    /* Loading & Error States */
    .loading-state,
    .error-state,
    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      margin: 2rem 0;
    }

    /* Bulk Actions */
    .bulk-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem;
      background: var(--color-primary-subtle);
      border: 1px solid var(--color-primary);
      border-radius: 8px;
      margin-bottom: 1rem;
    }

    .bulk-count {
      font-weight: 600;
      color: var(--color-primary);
    }

    .bulk-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .bulk-btn {
      padding: 0.5rem 1rem;
      border: 1px solid var(--color-primary);
      border-radius: 4px;
      background: var(--color-primary);
      color: var(--color-primary-text);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .bulk-btn:hover {
      background: var(--color-primary-dark);
    }

    .bulk-btn--secondary {
      background: transparent;
      color: var(--color-primary);
    }

    .bulk-btn--secondary:hover {
      background: var(--color-primary);
      color: var(--color-primary-text);
    }

    /* Grid Layouts */
    .pub-grid {
      display: grid;
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .pub-grid.view-list {
      grid-template-columns: 1fr;
    }

    .pub-grid.view-grid {
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    }

    /* Quick Actions */
    .pub-quick-actions {
      display: flex;
      gap: 0.25rem;
      margin-top: 0.5rem;
      padding-top: 0.5rem;
      border-top: 1px solid var(--color-border);
    }

    .quick-action-btn {
      width: 2rem;
      height: 2rem;
      border: 1px solid var(--color-border);
      border-radius: 4px;
      background: var(--color-background);
      color: var(--color-text-secondary);
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .quick-action-btn:hover:not(:disabled) {
      border-color: var(--color-primary);
      background: var(--color-primary);
      color: var(--color-primary-text);
    }

    .quick-action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .quick-action-btn.active {
      border-color: var(--color-warning);
      background: var(--color-warning);
      color: var(--color-warning-text);
    }

    /* Map Placeholder */
    .map-placeholder {
      text-align: center;
      padding: 4rem 2rem;
      background: var(--color-surface);
      border: 2px dashed var(--color-border);
      border-radius: 8px;
      color: var(--color-text-secondary);
    }

    /* Load More */
    .load-more {
      text-align: center;
      padding: 2rem 0;
    }

    .load-more-btn {
      padding: 1rem 2rem;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      background: var(--color-surface);
      color: var(--color-text);
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .load-more-btn:hover {
      border-color: var(--color-primary);
      background: var(--color-primary-subtle);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .comprehensive-pub-list {
        padding: 0.5rem;
      }

      .bulk-actions {
        flex-direction: column;
        align-items: stretch;
        text-align: center;
      }

      .bulk-buttons {
        justify-content: center;
      }

      .pub-grid.view-grid {
        grid-template-columns: 1fr;
      }
    }
  `
})
export class ComprehensivePubsListComponent extends BaseComponent {
  @ViewChild('pubItemTemplate') pubItemTemplate!: TemplateRef<any>;

  protected readonly pubStore = inject(PubStore);
  protected readonly checkinStore = inject(CheckinStore);

  // State management
  private readonly _controlsState = signal<ListControlsState>({
    searchQuery: '',
    sortBy: 'distance',
    activeFilters: [],
    viewMode: 'list' as ViewMode,
    bulkMode: false
  });

  private readonly _selectedPubs = signal<Set<string>>(new Set());
  private readonly _favoritePubs = signal<Set<string>>(new Set()); // TODO: Load from user preferences
  private readonly _displayLimit = signal<number>(50); // Pagination

  // ✅ Public readonly signals
  readonly controlsState = this._controlsState.asReadonly();
  readonly selectedPubs = computed(() => Array.from(this._selectedPubs()));
  readonly isDevelopment = computed(() => !environment.production);

  // ✅ Configuration
  readonly controlsConfig = computed((): ListControlsConfig => {
    const visitedCount = this.checkinStore.checkins().length;
    const nearbyCount = this.pubStore.pubsWithDistance().filter(p => p.distance && p.distance < 5000).length;
    const favoriteCount = this._favoritePubs().size;

    return {
      searchPlaceholder: "Search pubs by name, location...",
      sortOptions: [
        { key: 'distance', label: 'Distance', icon: '📍' },
        { key: 'name', label: 'Name (A-Z)', icon: '🔤' },
        { key: 'checkins', label: 'Popular', icon: '🔥' },
        { key: 'recent', label: 'Recently Added', icon: '🆕' }
      ],
      filterOptions: [
        { key: 'visited', label: 'Visited', icon: '✅', count: visitedCount },
        { key: 'unvisited', label: 'Not Visited', icon: '🕵️' },
        { key: 'nearby', label: 'Nearby (5km)', icon: '📍', count: nearbyCount },
        { key: 'favorites', label: 'Favorites', icon: '⭐', count: favoriteCount },
        { key: 'canCheckIn', label: 'Can Check In', icon: '🎯' }
      ],
      showViewToggle: true,
      showBulkActions: true,
      showPerformanceInfo: true
    };
  });

  readonly virtualListConfig = computed((): VirtualListConfig => ({
    itemHeight: 120, // Approximate height of pub card + actions
    containerHeight: Math.min(800, window.innerHeight - 300), // Dynamic based on screen
    overscan: 5,
    threshold: 100
  }));

// ✅ Data processing - SIMPLIFIED with consistent number typing
readonly totalPubs = computed(() => this.pubStore.itemCount());

readonly filteredPubs = computed((): PubWithDistance[] => {
  let pubs = this.pubStore.pubsWithDistance();
  const state = this.controlsState();

  // Apply search
  if (state.searchQuery.trim()) {
    const query = state.searchQuery.toLowerCase();
    pubs = pubs.filter(pub =>
      pub.name.toLowerCase().includes(query) ||
      pub.address?.toLowerCase().includes(query) ||
      pub.city?.toLowerCase().includes(query) ||
      pub.region?.toLowerCase().includes(query)
    );
  }

  // ✅ Apply filters - SIMPLIFIED (no null checks needed)
  state.activeFilters.forEach(filter => {
    switch (filter) {
      case 'visited':
        pubs = pubs.filter(pub => this.checkinStore.hasCheckedIn(pub.id));
        break;
      case 'unvisited':
        pubs = pubs.filter(pub => !this.checkinStore.hasCheckedIn(pub.id));
        break;
      case 'nearby':
        pubs = pubs.filter(pub => pub.distance < 5000);
        break;
      case 'favorites':
        pubs = pubs.filter(pub => this.isFavorite(pub.id));
        break;
      case 'canCheckIn':
        pubs = pubs.filter(pub => pub.distance <= 500);
        break;
    }
  });

  // ✅ Apply sorting - SIMPLIFIED (distance is always number)
  switch (state.sortBy) {
    case 'name':
      pubs.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'distance':
      pubs.sort((a, b) => a.distance - b.distance);
      break;
    case 'checkins':
      pubs.sort((a, b) => this.getPubCheckinCount(b.id) - this.getPubCheckinCount(a.id));
      break;
    case 'recent':
      // TODO: Sort by date added when we have that field
      break;
  }

  return pubs;
});

  readonly displayedPubs = computed(() => {
    const filtered = this.filteredPubs();
    const limit = this._displayLimit();
    return filtered.slice(0, limit);
  });

  readonly hasMoreToShow = computed(() => {
    return this.filteredPubs().length > this.displayedPubs().length;
  });

  readonly remainingCount = computed(() => {
    return this.filteredPubs().length - this.displayedPubs().length;
  });

  readonly shouldUseVirtualScrolling = computed(() => {
    return this.displayedPubs().length > 100;
  });

  readonly gridClasses = computed(() => {
    const mode = this.controlsState().viewMode;
    return `view-${mode}`;
  });

  // ✅ Tracking function for virtual list
  readonly pubTrackingFn = () => (pub: PubWithDistance, index: number) => pub.id;

  protected override onInit(): void {
    this.pubStore.loadOnce();
    this.checkinStore.loadOnce();
    // TODO: Load user favorites
  }

  // ✅ Event handlers
  onControlsStateChanged(state: ListControlsState): void {
    this._controlsState.set(state);
    // Reset display limit when filters change
    this._displayLimit.set(50);
  }

  onPubClicked(pub: Pub): void {
    if (this.controlsState().bulkMode) {
      this.togglePubSelection(pub.id);
    } else {
      this.router.navigate(['/pubs', pub.id]);
    }
  }

  onPubSelected(event: { pub: Pub; selected: boolean }): void {
    if (event.selected) {
      this._selectedPubs.update(set => new Set([...set, event.pub.id]));
    } else {
      this._selectedPubs.update(set => {
        const newSet = new Set(set);
        newSet.delete(event.pub.id);
        return newSet;
      });
    }
  }

  onListScrolled(event: { scrollTop: number; scrollPercent: number }): void {
    // Auto-load more when near bottom
    if (event.scrollPercent > 80 && this.hasMoreToShow()) {
      this.loadMore();
    }
  }

  // ✅ Actions
  loadMore(): void {
    this._displayLimit.update(current => current + 50);
  }

  clearAllFilters(): void {
    this._controlsState.update(state => ({
      ...state,
      searchQuery: '',
      activeFilters: [],
      sortBy: 'distance'
    }));
  }

  retryLoad(): void {
    this.pubStore.load();
  }

  // ✅ Pub-specific actions
  async getDirections(pub: Pub): Promise<void> {
    if (!pub.location) return;

    const { lat, lng } = pub.location;
    const destination = `${lat},${lng}`;

    // Try to open in native maps app
    if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
      window.open(`maps://maps.google.com/maps?daddr=${destination}&amp;ll=`);
    } else if (navigator.userAgent.includes('Android')) {
      window.open(`geo:${destination}?q=${destination}(${encodeURIComponent(pub.name)})`);
    } else {
      // Fallback to Google Maps web
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}`);
    }
  }

  callPub(pub: Pub): void {
    // TODO: Add phone field to Pub model
    const phone = (pub as any).phone;
    if (phone) {
      window.open(`tel:${phone}`);
    }
  }

  async sharePub(pub: Pub): Promise<void> {
    const shareData = {
      title: pub.name,
      text: `Check out ${pub.name} - ${pub.address}`,
      url: `${window.location.origin}/pubs/${pub.id}`
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(shareData.url);
      // TODO: Show toast notification
    }
  }

  toggleFavorite(pub: Pub): void {
    this._favoritePubs.update(favorites => {
      const newSet = new Set(favorites);
      if (newSet.has(pub.id)) {
        newSet.delete(pub.id);
      } else {
        newSet.add(pub.id);
      }
      return newSet;
    });
    // TODO: Persist to user preferences
  }

  // ✅ Bulk actions
  bulkAddToCount(): void {
    const selected = this.selectedPubs();
    // TODO: Implement bulk add to visit count
    console.log('Bulk add to count:', selected);
    this.clearSelection();
  }

  bulkGetDirections(): void {
    const selected = this.selectedPubs();
    const pubs = this.displayedPubs().filter(p => selected.includes(p.id));

    if (pubs.length === 0) return;

    // Create route with multiple waypoints
    const waypoints = pubs.map(pub => `${pub.location.lat},${pub.location.lng}`).join('|');
    const destination = waypoints.split('|').pop();

    window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}&waypoints=${waypoints}`);
  }

  bulkAddToFavorites(): void {
    const selected = this.selectedPubs();
    this._favoritePubs.update(favorites => {
      const newSet = new Set(favorites);
      selected.forEach(id => newSet.add(id));
      return newSet;
    });
    this.clearSelection();
  }

  clearSelection(): void {
    this._selectedPubs.set(new Set());
  }

  // ✅ Helper methods
  getPubCheckinCount(pubId: string): number {
    return this.checkinStore.checkins().filter(c => c.pubId === pubId).length;
  }

  isFavorite(pubId: string): boolean {
    return this._favoritePubs().has(pubId);
  }

  togglePubSelection(pubId: string): void {
    this._selectedPubs.update(set => {
      const newSet = new Set(set);
      if (newSet.has(pubId)) {
        newSet.delete(pubId);
      } else {
        newSet.add(pubId);
      }
      return newSet;
    });
  }
}
