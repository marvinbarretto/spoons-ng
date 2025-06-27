// src/app/pubs/feature/pub-list/pub-list.component.ts
import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { PubCardComponent } from '../../ui/pub-card/pub-card.component';
import { PubStore } from '../../data-access/pub.store';
import { BaseComponent } from '../../../shared/data-access/base.component';
import type { Pub, PubWithDistance } from '../../utils/pub.models';
import { NewCheckinStore } from '../../../new-checkin/data-access/new-checkin.store';
import { UserStore } from '@users/data-access/user.store';

type SortOption = 'distance' | 'name' | 'checkinCount';
type FilterOption = 'all' | 'visited' | 'unvisited' | 'nearby';

@Component({
  selector: 'app-pub-list',
  imports: [CommonModule, FormsModule, ScrollingModule, PubCardComponent],
  template: `
    <section class="pub-list-page">
      <header class="page-header">
        <h1>Pubs ({{ filteredPubs().length }} of {{ pubStore.totalCount() }})</h1>
      </header>

      @if (pubStore.loading()) {
        <div class="loading-state">
          <p>🍺 Loading pubs...</p>
        </div>
      } @else if (pubStore.error()) {
        <div class="error-state">
          <p>❌ {{ pubStore.error() }}</p>
          <button (click)="retryLoad()" class="retry-btn">Try Again</button>
        </div>
      } @else if (pubStore.totalCount() === 0) {
        <div class="empty-state">
          <p>🍺 No pubs available yet.</p>
          <p>Check back later!</p>
        </div>
      } @else {
        <!-- Controls Section -->
        <div class="controls-section">
          <!-- Search Bar -->
          <div class="search-bar">
            <input
              type="text"
              placeholder="Search pubs by name or location..."
              [value]="searchTerm()"
              (input)="setSearchTerm($event)"
              class="search-input"
            />
            @if (searchTerm()) {
              <button (click)="clearSearch()" class="clear-search-btn">✕</button>
            }
          </div>

          <!-- Filter and Sort Controls -->
          <div class="filter-sort-controls">
            <!-- Filter Pills -->
            <div class="control-group">
              <span class="control-label">Show:</span>
              @for (option of filterOptions; track option.value) {
                <label class="control-pill">
                  <input
                    type="radio"
                    name="filter"
                    [value]="option.value"
                    [checked]="filterMode() === option.value"
                    (change)="setFilter(option.value)"
                  />
                  {{ option.label }} ({{ getFilterCount(option.value) }})
                </label>
              }
            </div>

            <!-- Sort Pills -->
            <div class="control-group">
              <span class="control-label">Sort:</span>
              @for (option of sortOptions; track option.value) {
                <label class="control-pill">
                  <input
                    type="radio"
                    name="sort"
                    [value]="option.value"
                    [checked]="sortMode() === option.value"
                    (change)="setSortFromEvent($event)"
                  />
                  {{ option.label }}
                </label>
              }
            </div>
          </div>
        </div>

        <!-- Virtual Scrolling List -->
        <div class="pub-list-container">
          <cdk-virtual-scroll-viewport
            itemSize="120"
            class="pub-viewport"
            #viewport
          >
            @for (pub of filteredPubs(); track pub.id) {
              <div class="pub-item">
                <app-pub-card
                  [pub]="pub"
                  [hasCheckedIn]="hasUserCheckedIn(pub.id)"
                  [checkinCount]="pub.checkinCount || 0"
                  [showCheckinCount]="true"
                  (cardClicked)="handlePubClick($event)"
                />
              </div>
            }
          </cdk-virtual-scroll-viewport>
        </div>

        @if (filteredPubs().length === 0) {
          <div class="empty-filtered-state">
            <p>No pubs match your current search and filters.</p>
            <div class="empty-actions">
              <button (click)="clearSearch()" class="btn-secondary">
                Clear Search
              </button>
              <button (click)="resetFilters()" class="btn-secondary">
                Reset Filters
              </button>
            </div>
          </div>
        }
      }

    </section>
  `,
  styles: `
    .pub-list-page {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1rem;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .page-header {
      margin-bottom: 1rem;
    }

    .page-header h1 {
      font-size: 2rem;
      font-weight: 700;
      margin: 0 0 0.5rem;
      color: var(--color-text-primary, #111827);
    }


    .loading-state,
    .error-state,
    .empty-state,
    .empty-filtered-state {
      text-align: center;
      padding: 3rem 1rem;
      color: var(--color-text-secondary, #6b7280);
    }

    .error-state {
      color: var(--color-error, #ef4444);
    }

    .retry-btn,
    .btn-secondary {
      margin: 0.5rem;
      padding: 0.5rem 1rem;
      border: 1px solid var(--color-border, #e5e7eb);
      background: var(--color-surface, #ffffff);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .retry-btn:hover,
    .btn-secondary:hover {
      background: var(--color-gray-50, #f9fafb);
      border-color: var(--color-primary, #3b82f6);
    }

    .controls-section {
      margin-bottom: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    /* Search Bar */
    .search-bar {
      position: relative;
      max-width: 500px;
    }

    .search-input {
      width: 100%;
      padding: 0.75rem 2.5rem 0.75rem 1rem;
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: 8px;
      font-size: 1rem;
      background: var(--color-surface, #ffffff);
      transition: all 0.2s ease;
    }

    .search-input:focus {
      outline: none;
      border-color: var(--color-primary, #3b82f6);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .clear-search-btn {
      position: absolute;
      right: 0.5rem;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: var(--color-text-secondary, #6b7280);
      cursor: pointer;
      padding: 0.25rem;
      font-size: 1rem;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .clear-search-btn:hover {
      background: var(--color-gray-100, #f3f4f6);
      color: var(--color-text-primary, #111827);
    }

    /* Filter and Sort Controls */
    .filter-sort-controls {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: center;
      padding: 0.5rem;
      background: var(--color-surface, #ffffff);
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: 6px;
    }

    .control-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .control-label {
      font-weight: 500;
      color: var(--color-text-primary, #111827);
      white-space: nowrap;
    }

    .control-pill {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.75rem;
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: 16px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 0.75rem;
      white-space: nowrap;
    }

    .control-pill:has(input:checked) {
      background: var(--color-primary, #3b82f6);
      color: white;
      border-color: var(--color-primary, #3b82f6);
    }

    .control-pill input {
      margin: 0;
    }


    /* Virtual Scrolling Container */
    .pub-list-container {
      /* Calculate height: 100vh minus all fixed elements */
      /* 2rem top/bottom padding + ~3rem header + ~3rem controls + ~2rem margins */
      height: calc(100vh - 10rem);
      overflow: hidden; /* Ensure virtual scroll works properly */
    }

    .pub-viewport {
      height: 100%;
    }

    .pub-item {
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--color-border-light, #f3f4f6);
    }

    .pub-item:last-child {
      border-bottom: none;
    }

    /* Empty State Actions */
    .empty-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-top: 1rem;
    }


    /* Responsive Design */
    @media (max-width: 768px) {
      .controls-section {
        gap: 1rem;
      }

      .filter-sort-controls {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }

      .control-group {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }

      .control-pill {
        padding: 0.25rem 0.5rem;
        font-size: 0.7rem;
      }

      .pub-list-container {
        /* Mobile adjustment - less space for header/controls */
        height: calc(100vh - 8rem);
      }
    }

    /* Container Query Support for Responsive Cards */
    @container (max-width: 400px) {
      .pub-item {
        padding: 0.25rem 0;
      }
    }
  `
})
export class PubListComponent extends BaseComponent {
  // ✅ Store dependencies
  protected readonly pubStore = inject(PubStore);
  private readonly checkinStore = inject(NewCheckinStore);
  private readonly userStore = inject(UserStore);

  // ✅ Local state
  private readonly _searchTerm = signal('');
  private readonly _filterMode = signal<FilterOption>('all');
  private readonly _sortMode = signal<SortOption>('distance');

  // ✅ Expose state for template
  protected readonly searchTerm = this._searchTerm.asReadonly();
  protected readonly filterMode = this._filterMode.asReadonly();
  protected readonly sortMode = this._sortMode.asReadonly();

  // ✅ Configuration for template
  protected readonly filterOptions = [
    { value: 'all' as const, label: 'All' },
    { value: 'visited' as const, label: 'Visited' },
    { value: 'unvisited' as const, label: 'Unvisited' },
    { value: 'nearby' as const, label: 'Nearby' }
  ];

  protected readonly sortOptions = [
    { value: 'distance' as const, label: 'Distance' },
    { value: 'name' as const, label: 'Name' },
    { value: 'checkinCount' as const, label: 'Check-ins' }
  ];

  // ✅ Data computations
  protected readonly pubsWithDistance = this.pubStore.pubsWithDistance;
  protected readonly user = this.userStore.user;

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

  protected readonly filteredPubs = computed(() => {
    const pubs = this.filterFilteredPubs();
    const sort = this.sortMode();

    const sorted = [...pubs].sort((a, b) => {
      switch (sort) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'checkinCount':
          return (b.checkinCount || 0) - (a.checkinCount || 0);
        case 'distance':
        default:
          return a.distance - b.distance;
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
    sortMode: this.sortMode(),
    totalPubs: this.pubsWithDistance().length,
    searchFiltered: this.searchFilteredPubs().length,
    finalFiltered: this.filteredPubs().length,
    userCheckedInCount: this.userCheckedInPubIds().length
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
    // this.checkinStore.loadOnce(); // TODO: implement if needed
    
    // ✅ Console debug logging
    console.group('🍺 PubListComponent Debug');
    console.log('Filter State:', this.debugFilterInfo());
    console.log('Pub Stats:', this.debugPubStats());
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

  setSort(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this._sortMode.set(target.value as SortOption);
  }

  setSortFromEvent(event: Event): void {
    const target = event.target as HTMLInputElement;
    this._sortMode.set(target.value as SortOption);
  }

  resetFilters(): void {
    this._searchTerm.set('');
    this._filterMode.set('all');
    this._sortMode.set('distance');
  }

  // ✅ Actions
  retryLoad(): void {
    this.pubStore.loadOnce();
  }

  handlePubClick(pub: Pub): void {
    console.log('[PubList] Pub clicked:', pub.name);
    // TODO: Navigate to pub detail page
    // this.router.navigate(['/pubs', pub.id]);
  }
}