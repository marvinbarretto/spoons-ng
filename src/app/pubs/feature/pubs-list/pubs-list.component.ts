// src/app/pubs/feature/pubs-list/pubs-list.component.ts
// Updated template for existing component structure
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PubCardComponent } from '@pubs/ui/pub-card/pub-card.component';
import { PubStore } from '@pubs/data-access/pub.store';
import { CheckinStore } from '@check-in/data-access/check-in.store';
import { BaseComponent } from '../../../shared/data-access/base.component';
import { Pub } from '../../utils/pub.models';

@Component({
  selector: 'app-pub-list',
  imports: [CommonModule, PubCardComponent],
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
                  (click)="setIncludeVisited(true)"
                >
                  ✅ All pubs
                </button>
                <button
                  type="button"
                  class="pill-button"
                  [class.active]="!includeVisited()"
                  (click)="setIncludeVisited(false)"
                >
                  🕵️ Unvisited only
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Results info -->
        <div class="results-info">
          <span>Showing {{ filteredPubs().length }} pubs</span>
          @if (!includeVisited()) {
            <span class="filter-badge">Unvisited only</span>
          }
          @if (currentSortMethod() === 'proximity') {
            <span class="filter-badge">📍 By distance</span>
          } @else {
            <span class="filter-badge">🔤 A-Z</span>
          }
        </div>

        <!-- Pub List -->
        @if (filteredPubs().length === 0) {
          <div class="empty-state">
            <h3>🔍 No pubs found</h3>
            <p>Try adjusting your search terms or filters</p>
          </div>
        } @else {
          <div class="pub-grid">
            @for (pub of filteredPubs(); track pub.id) {
              <app-pub-card
                [pub]="pub"
                [hasCheckedIn]="checkinStore.hasCheckedIn(pub.id)"
                [checkinCount]="getPubCheckinCount(pub.id)"
                [showCheckinCount]="true"
                (pubClicked)="navigateToPub($event)"
              />
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
      background: var(--color-background, #f9fafb);
    }

    .page-header {
      margin-bottom: 2rem;
      text-align: center;
    }

    .page-header h1 {
      font-size: 2rem;
      font-weight: 700;
      color: var(--color-text, #111827);
      margin: 0 0 0.5rem 0;
    }

    .page-subtitle {
      font-size: 1rem;
      color: var(--color-text-secondary, #6b7280);
      margin: 0;
    }

    /* ✅ NEW: Controls layout */
    .controls {
      margin-bottom: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .search-group {
      flex: 1;
    }

    .search-input {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: 8px;
      background: var(--color-surface, #ffffff);
      font-size: 1rem;
      transition: border-color 0.2s ease;
    }

    .search-input:focus {
      outline: none;
      border-color: var(--color-primary, #3b82f6);
      box-shadow: 0 0 0 2px var(--color-primary-subtle, rgba(59, 130, 246, 0.1));
    }

    /* ✅ NEW: Filter controls */
    .filter-controls {
      display: flex;
      flex-wrap: wrap;
      gap: 1.5rem;
      align-items: center;
      padding: 1rem;
      background: var(--color-surface, #ffffff);
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: 8px;
    }

    .control-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .control-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text, #111827);
      white-space: nowrap;
    }

    /* ✅ NEW: Pill button styles */
    .pill-group {
      display: flex;
      gap: 0.25rem;
      background: var(--color-background, #f9fafb);
      padding: 0.25rem;
      border-radius: 8px;
      border: 1px solid var(--color-border, #e5e7eb);
    }

    .pill-button {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: var(--color-text-secondary, #6b7280);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
      position: relative;
    }

    .pill-button:hover {
      background: var(--color-primary-subtle, rgba(59, 130, 246, 0.1));
      color: var(--color-primary, #3b82f6);
    }

    .pill-button.active {
      background: var(--color-primary, #3b82f6);
      color: white;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }

    .pill-button.active:hover {
      background: var(--color-primary-dark, #2563eb);
      color: white;
    }

    /* ✅ NEW: Results info */
    .results-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
      font-size: 0.875rem;
      color: var(--color-text-secondary, #6b7280);
    }

    .filter-badge {
      padding: 0.25rem 0.5rem;
      background: var(--color-primary-subtle, rgba(59, 130, 246, 0.1));
      color: var(--color-primary, #3b82f6);
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .loading-state,
    .error-state,
    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      background: var(--color-surface, #ffffff);
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: 8px;
      margin: 2rem 0;
    }

    .loading-state p {
      font-size: 1.125rem;
      color: var(--color-text-secondary, #6b7280);
      margin: 0;
    }

    .error-state p {
      color: var(--color-error, #dc2626);
      margin: 0 0 1rem 0;
    }

    .retry-btn {
      padding: 0.75rem 1.5rem;
      border: 1px solid var(--color-primary, #3b82f6);
      border-radius: 6px;
      background: var(--color-primary, #3b82f6);
      color: white;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .retry-btn:hover {
      background: var(--color-primary-dark, #2563eb);
    }

    .empty-state h3 {
      font-size: 1.25rem;
      color: var(--color-text, #111827);
      margin: 0 0 0.5rem 0;
    }

    .empty-state p {
      color: var(--color-text-secondary, #6b7280);
      margin: 0;
    }

    .pub-grid {
      display: grid;
      gap: 1rem;
      margin-bottom: 2rem;
    }

    /* Responsive grid layout */
    @media (min-width: 640px) {
      .pub-grid {
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        gap: 1.5rem;
      }

      .controls {
        flex-direction: row;
        align-items: flex-start;
      }

      .filter-controls {
        width: auto;
        min-width: fit-content;
      }
    }

    @media (min-width: 1024px) {
      .pub-grid {
        grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      }
    }

    /* Mobile optimizations */
    @media (max-width: 640px) {
      .pub-list-page {
        padding: 0.5rem;
      }

      .page-header {
        margin-bottom: 1rem;
      }

      .page-header h1 {
        font-size: 1.5rem;
      }

      .pub-grid {
        gap: 0.75rem;
      }

      .filter-controls {
        flex-direction: column;
        align-items: center;
        gap: 1rem;
      }

      .control-group {
        width: 100%;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
      }

      .pill-group {
        width: 100%;
        max-width: 300px;
      }

      .pill-button {
        flex: 1;
        text-align: center;
      }
    }
  `
})
export class PubListComponent extends BaseComponent implements OnInit {
  protected readonly pubStore = inject(PubStore);
  protected readonly checkinStore = inject(CheckinStore);

  // ✅ Simple state for search and filter (no manual sorting)
  private readonly _searchQuery = signal<string>('');
  private readonly _includeVisited = signal<boolean>(true);

  // ✅ Public readonly signals
  readonly includeVisited = this._includeVisited.asReadonly();

  // ✅ Auto-determine sort method based on location availability
  readonly currentSortMethod = computed(() => {
    const pubsWithDistance = this.pubStore.pubsWithDistance();
    // Check if we have any valid distances (not Infinity)
    const hasLocationData = pubsWithDistance.some(pub => pub.distance !== Infinity);
    console.log('[PubList] Location data available:', hasLocationData);
    return hasLocationData ? 'proximity' : 'alphabetical';
  });

  readonly filteredPubs = computed(() => {
    console.log('[PubList] Computing filtered pubs...');

    let pubs = this.pubStore.pubsWithDistance();
    const query = this._searchQuery().toLowerCase().trim();
    const includeVisited = this._includeVisited();
    const sortMethod = this.currentSortMethod();

    console.log('[PubList] Initial pubs count:', pubs.length);
    console.log('[PubList] Search query:', query || '(none)');
    console.log('[PubList] Include visited:', includeVisited);
    console.log('[PubList] Sort method:', sortMethod);

    // Apply search filter
    if (query) {
      pubs = pubs.filter(pub =>
        pub.name.toLowerCase().includes(query) ||
        pub.address?.toLowerCase().includes(query) ||
        pub.city?.toLowerCase().includes(query) ||
        pub.region?.toLowerCase().includes(query)
      );
      console.log('[PubList] After search filter:', pubs.length, 'pubs');
    }

    // Apply visited filter
    if (!includeVisited) {
      const beforeCount = pubs.length;
      pubs = pubs.filter(pub => !this.checkinStore.hasCheckedIn(pub.id));
      console.log('[PubList] After visited filter:', pubs.length, 'pubs (removed', beforeCount - pubs.length, 'visited)');
    }

    // Apply automatic sorting
    if (sortMethod === 'proximity') {
      pubs.sort((a, b) => a.distance - b.distance);
      console.log('[PubList] Sorted by proximity distance');
    } else {
      pubs.sort((a, b) => a.name.localeCompare(b.name));
      console.log('[PubList] Sorted alphabetically');
    }

    console.log('[PubList] Final filtered pubs:', pubs.length);
    return pubs;
  });

  protected override onInit(): void {
    console.log('[PubList] Component initializing...');
    this.pubStore.loadOnce();
    this.checkinStore.loadOnce();
    console.log('[PubList] Stores loading initiated');
  }

  onSearch(query: string): void {
    console.log('[PubList] Search query changed:', query);
    this._searchQuery.set(query);
  }

  setIncludeVisited(includeVisited: boolean): void {
    console.log('[PubList] Include visited changed:', includeVisited);
    this._includeVisited.set(includeVisited);
  }

  getPubCheckinCount(pubId: string): number {
    return this.checkinStore.checkins().filter(c => c.pubId === pubId).length;
  }

  navigateToPub(pub: Pub): void {
    // TODO: Inject Router and navigate to pub detail
    this.router.navigate(['/pubs', pub.id]);
    console.log('Navigate to pub:', pub.id);
  }

  retryLoad(): void {
    this.pubStore.load();
  }
}
