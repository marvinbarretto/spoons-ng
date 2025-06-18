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

@Component({
  selector: 'app-pub-list',
  imports: [CommonModule, RouterModule, PubCardComponent],
  template: `
    <section class="pub-list-page">
      <header class="page-header">
        <h1>Pubs ({{ pubStore.itemCount() }})</h1>
        <p class="page-subtitle">Discover and check in to pubs near you</p>
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
          <div class="filter-controls">
            <!-- Visited filter pills -->
            <div class="control-group">
              <span class="control-label">Show:</span>
              <div class="pill-group">
                <button
                  type="button"
                  class="pill-button"
                  [class.active]="includeVisited()"
                  (click)="toggleIncludeVisited()"
                >
                  ✅ Visited ({{ visitedCount() }})
                </button>

                <button
                  type="button"
                  class="pill-button"
                  [class.active]="includeUnvisited()"
                  (click)="toggleIncludeUnvisited()"
                >
                  🕵️ Unvisited ({{ unvisitedCount() }})
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Results Summary -->
        <div class="results-summary">
          <p>Showing {{ filteredPubs().length }} of {{ pubStore.itemCount() }} pubs</p>
        </div>

        <!-- ✅ Pub Grid with Navigation Links -->
        <div class="pub-grid">
          @for (pub of filteredPubs(); track pub.id) {
            <a
              [routerLink]="['/pubs', pub.id]"
              class="pub-card-link"
            >
              <app-pub-card
                [pub]="pub"
                [hasCheckedIn]="hasVisited(pub.id)"
                [checkinCount]="getCheckinCount(pub.id)"
                [showCheckinCount]="true"
              />
            </a>
          } @empty {
            <div class="empty-state">
              <p>🔍 No pubs found matching your criteria</p>
              <button (click)="clearFilters()" class="clear-filters-btn">
                Clear filters
              </button>
            </div>
          }
        </div>
      }
    </section>
  `,
  styles: `
    .pub-list-page {
      padding: 1rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .page-header h1 {
      font-size: 2rem;
      font-weight: 700;
      color: var(--color-text);
      margin: 0 0 0.5rem 0;
    }

    .page-subtitle {
      color: var(--color-text-secondary);
      margin: 0;
    }

    /* Controls */
    .controls {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1.5rem;
    }

    .search-group {
      margin-bottom: 1rem;
    }

    .search-input {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      font-size: 1rem;
    }

    .filter-controls {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .control-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .control-label {
      font-weight: 500;
      color: var(--color-text);
      min-width: 60px;
    }

    .pill-group {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .pill-button {
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: 20px;
      background: var(--color-surface);
      color: var(--color-text-secondary);
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .pill-button:hover {
      border-color: var(--color-primary);
      background: var(--color-primary-subtle);
    }

    .pill-button.active {
      border-color: var(--color-primary);
      background: var(--color-primary);
      color: var(--color-primary-text);
    }

    /* Results */
    .results-summary {
      margin-bottom: 1rem;
      text-align: center;
      color: var(--color-text-secondary);
      font-size: 0.875rem;
    }

    /* ✅ Pub Grid with Navigation Links */
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

  // ✅ Computed data
  readonly filteredPubs = computed(() => {
    const pubs = this.pubStore.data();
    const search = this.searchTerm().toLowerCase();
    const showVisited = this.includeVisited();
    const showUnvisited = this.includeUnvisited();

    // ✅ Transform pubs to include distance property
    const pubsWithDistance = pubs.map(pub => ({
      ...pub,
      distance: this.nearbyPubStore.getDistanceToPub(pub.id) // ✅ Add distance
    }));

    return pubsWithDistance.filter(pub => {
      // Search filter
      if (search && !pub.name.toLowerCase().includes(search) &&
          !pub.address.toLowerCase().includes(search)) {
        return false;
      }

      // Visited filter
      const hasVisited = this.hasVisited(pub.id);
      if (!showVisited && hasVisited) return false;
      if (!showUnvisited && !hasVisited) return false;

      return true;
    });
  });

  readonly visitedCount = computed(() =>
    this.pubStore.data().filter(pub => this.hasVisited(pub.id)).length
  );

  readonly unvisitedCount = computed(() =>
    this.pubStore.data().filter(pub => !this.hasVisited(pub.id)).length
  );

  override ngOnInit(): void {
    this.pubStore.loadOnce();
    this.checkinStore.loadOnce();
  }

  // ✅ Helper methods
  hasVisited(pubId: string): boolean {
    return this.checkinStore.data().some(checkin => checkin.pubId === pubId);
  }

  getCheckinCount(pubId: string): number {
    return this.checkinStore.data().filter(checkin => checkin.pubId === pubId).length;
  }

  // ✅ Filter methods
  onSearch(term: string): void {
    this.searchTerm.set(term);
  }

  toggleIncludeVisited(): void {
    this.includeVisited.update(current => !current);
  }

  toggleIncludeUnvisited(): void {
    this.includeUnvisited.update(current => !current);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.includeVisited.set(true);
    this.includeUnvisited.set(true);
  }

  retryLoad(): void {
    this.pubStore.load();
  }
}
