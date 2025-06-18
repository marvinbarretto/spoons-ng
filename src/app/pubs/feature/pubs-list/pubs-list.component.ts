// src/app/pubs/feature/pubs-list/pubs-list.component.ts
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PubCardComponent } from '@pubs/ui/pub-card/pub-card.component';
import { PubStore } from '@pubs/data-access/pub.store';
import { CheckinStore } from '@check-in/data-access/check-in.store';
import { BaseComponent } from '../../../shared/data-access/base.component';
import { Pub } from '../../utils/pub.models';
import { NearbyPubStore } from '../../data-access/nearby-pub.store';

type PubFilterMode = 'all' | 'visited' | 'unvisited';

@Component({
  selector: 'app-pub-list',
  imports: [CommonModule, RouterModule, PubCardComponent],
  template: `
    <section class="pub-list-page">
      <header class="page-header">
        <h1>Pubs ({{ pubStore.itemCount() }})</h1>
        <p class="page-subtitle">
          @if (hasLocationData()) {
            📍 Sorted by proximity
          } @else {
            📄 Sorted alphabetically
          }
        </p>
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
      } @else {
        <!-- Search and Controls -->
        <div class="controls">
          <!-- Search input -->
          <div class="search-group">
            <input
              type="text"
              placeholder="Search pubs..."
              class="search-input"
              #searchInput
              (input)="onSearch(searchInput.value)"
            />
          </div>

          <!-- Filter Controls -->
          <div class="control-group">
            <span class="control-label">Show:</span>
            <div class="filter-pill-group">
              <button
                type="button"
                class="filter-pill-radio"
                [class.active]="filterMode() === 'all'"
                (click)="setFilterMode('all')"
              >
                All ({{ pubStore.itemCount() }})
              </button>
              <button
                type="button"
                class="filter-pill-radio"
                [class.active]="filterMode() === 'visited'"
                (click)="setFilterMode('visited')"
              >
                ✅ Visited ({{ visitedCount() }})
              </button>
              <button
                type="button"
                class="filter-pill-radio"
                [class.active]="filterMode() === 'unvisited'"
                (click)="setFilterMode('unvisited')"
              >
                🎯 Unvisited ({{ unvisitedCount() }})
              </button>
            </div>
          </div>

          @if (hasActiveFilters()) {
            <button (click)="clearFilters()" class="clear-filters-btn">
              Clear Filters
            </button>
          }
        </div>

        <!-- Results count and sorting info -->
        <div class="results-info">
          <p>
            Showing {{ filteredPubs().length }} of {{ pubStore.itemCount() }} pubs
            @if (searchTerm()) {
              matching "{{ searchTerm() }}"
            }
          </p>
        </div>

        <!-- Pub Grid -->
        @if (filteredPubs().length > 0) {
          <div class="pub-grid">
            @for (pub of filteredPubs(); track pub.id) {
              <a [routerLink]="['/pubs', pub.id]" class="pub-card-link">
                <app-pub-card [pub]="pub" />
              </a>
            }
          </div>
        } @else {
          <div class="empty-state">
            <p>No pubs found matching your criteria</p>
            @if (hasActiveFilters()) {
              <button (click)="clearFilters()" class="clear-filters-btn">
                Clear Filters
              </button>
            }
          </div>
        }
      }
    </section>
  `,
  styles: `
    .pub-list-page {
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

    .controls {
      margin-bottom: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .search-group {
      display: flex;
      gap: 0.5rem;
    }

    .search-input {
      flex: 1;
      padding: 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      font-size: 1rem;
    }

    .filter-controls {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .control-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .control-label {
      font-weight: 500;
      color: var(--color-text);
      min-width: 3rem;
    }

    .filter-pills {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .filter-pill {
      padding: 0.5rem 1rem;
      border: 1px solid var(--color-border);
      border-radius: 20px;
      background: var(--color-surface);
      color: var(--color-text);
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 0.875rem;
    }

    .filter-pill:hover {
      border-color: var(--color-primary);
    }

    .filter-pill.active {
      border-color: var(--color-primary);
      background: var(--color-primary);
      color: var(--color-primary-text);
    }

    .results-info {
      margin-bottom: 1rem;
      color: var(--color-text-secondary);
      font-size: 0.875rem;
    }

    .pub-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1rem;
    }

    .pub-card-link {
      text-decoration: none;
      color: inherit;
      display: block;
      width: 100%;
    }

    .pub-card-link:focus {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
      border-radius: 8px;
    }

    /* States */
    .loading-state,
    .error-state,
    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 8px;
    }

    .retry-btn,
    .clear-filters-btn {
      margin-top: 1rem;
      padding: 0.75rem 1.5rem;
      border: 1px solid var(--color-primary);
      border-radius: 6px;
      background: var(--color-primary);
      color: var(--color-primary-text);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .retry-btn:hover,
    .clear-filters-btn:hover {
      background: var(--color-primary-hover);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .pub-list-page {
        padding: 0.5rem;
      }

      .pub-grid {
        grid-template-columns: 1fr;
      }

      .control-group {
        flex-direction: column;
        align-items: flex-start;
      }

      .control-label {
        min-width: auto;
      }
    }
  `
})
export class PubListComponent extends BaseComponent implements OnInit {
  // ✅ Stores
  protected readonly pubStore = inject(PubStore);
  protected readonly nearbyPubStore = inject(NearbyPubStore);
  protected readonly checkinStore = inject(CheckinStore);

  // ✅ Filter state
  protected readonly searchTerm = signal<string>('');
  protected readonly includeVisited = signal<boolean>(true);
  protected readonly includeUnvisited = signal<boolean>(true);


protected readonly filterMode = signal<PubFilterMode>('all');


  // ✅ Computed data - uses sorted pubs from store as base
  readonly filteredPubs = computed(() => {
    // ✅ Start with sorted pubs (proximity or alphabetical)
    const sortedPubs = this.pubStore.sortedPubsByDistance();
    const search = this.searchTerm().toLowerCase().trim();
    const checkins = this.checkinStore.userCheckins();
    const mode = this.filterMode();

    const pubsWithDistance = sortedPubs.map(pub => ({
      ...pub,
      distance: this.nearbyPubStore.getDistanceToPub(pub.id)
    }));

    let filtered = pubsWithDistance;

    // Apply visit filter based on mode
    switch (mode) {
      case 'visited':
        filtered = filtered.filter(pub => checkins.includes(pub.id));
        break;
      case 'unvisited':
        filtered = filtered.filter(pub => !checkins.includes(pub.id));
        break;
      case 'all':
      default:
        // Show all pubs
        break;
    }

    if (search) {
      filtered = filtered.filter(pub =>
        pub.name.toLowerCase().includes(search) ||
        pub.address?.toLowerCase().includes(search) ||
        pub.city?.toLowerCase().includes(search) ||
        pub.region?.toLowerCase().includes(search)
      );
    }

    return filtered;
  });

  readonly hasLocationData = computed(() => {
    return this.nearbyPubStore.location() !== null;
  });

  readonly visitedCount = computed(() => {
    const checkins = this.checkinStore.userCheckins();
    return this.pubStore.sortedPubsByDistance().filter(pub =>
      checkins.includes(pub.id)
    ).length;
  });

  readonly unvisitedCount = computed(() => {
    const checkins = this.checkinStore.userCheckins();
    return this.pubStore.sortedPubsByDistance().filter(pub =>
      !checkins.includes(pub.id)
    ).length;
  });

  protected setFilterMode(mode: PubFilterMode): void {
    this.filterMode.set(mode);
  }

  protected hasActiveFilters(): boolean {
    return this.filterMode() !== 'all' || !!this.searchTerm();
  }



  override ngOnInit(): void {
    this.pubStore.loadOnce();
    this.checkinStore.loadOnce();
  }

  // ✅ Event handlers
  onSearch(term: string): void {
    this.searchTerm.set(term);
  }

  toggleVisited(): void {
    this.includeVisited.update(value => !value);
  }

  toggleUnvisited(): void {
    this.includeUnvisited.update(value => !value);
  }

  clearFilters(): void {
    this.filterMode.set('all');
    this.searchTerm.set('');
  }

  retryLoad(): void {
    this.pubStore.load();
  }
}
