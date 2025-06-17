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
        <!-- Simple search input -->
        <div class="search-controls">
          <input
            type="text"
            placeholder="Search pubs..."
            class="search-input"
            #searchInput
            (input)="onSearch(searchInput.value)"
          />
        </div>

        <!-- Pub List -->
        @if (filteredPubs().length === 0) {
          <div class="empty-state">
            <h3>🔍 No pubs found</h3>
            <p>Try adjusting your search terms</p>
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

    .search-controls {
      margin-bottom: 1.5rem;
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
    }
  `
})
export class PubListComponent extends BaseComponent implements OnInit {
  protected readonly pubStore = inject(PubStore);
  protected readonly checkinStore = inject(CheckinStore);

  // ✅ Simple search functionality
  private readonly _searchQuery = signal<string>('');

  readonly filteredPubs = computed(() => {
    const pubs = this.pubStore.pubsWithDistance();
    const query = this._searchQuery().toLowerCase().trim();

    if (!query) return pubs;

    return pubs.filter(pub =>
      pub.name.toLowerCase().includes(query) ||
      pub.address?.toLowerCase().includes(query) ||
      pub.city?.toLowerCase().includes(query) ||
      pub.region?.toLowerCase().includes(query)
    );
  });

  protected override onInit(): void {
    this.pubStore.loadOnce();
    this.checkinStore.loadOnce();
  }

  onSearch(query: string): void {
    this._searchQuery.set(query);
  }

  getPubCheckinCount(pubId: string): number {
    return this.checkinStore.checkins().filter(c => c.pubId === pubId).length;
  }

  navigateToPub(pub: Pub): void {
    // TODO: Inject Router and navigate to pub detail
    console.log('Navigate to pub:', pub.id);
  }

  retryLoad(): void {
    this.pubStore.load();
  }
}
