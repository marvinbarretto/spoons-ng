import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { LocationService } from '@fourfold/angular-foundation';
import { NearbyPubStore } from '@pubs/data-access/nearby-pub.store';
import { PubStore } from '@pubs/data-access/pub.store';
import { PubCardLightComponent } from '@pubs/ui/pub-card-light/pub-card-light.component';
import type { Pub } from '@pubs/utils/pub.models';
import { DataAggregatorService } from '@shared/data-access/data-aggregator.service';

@Component({
  selector: 'app-pub-single-selector',
  imports: [FormsModule, PubCardLightComponent],
  template: `
    <div class="pub-selection-widget">
      <!-- Selected Pub Display -->
      @if (selectedPub()) {
        <div class="selected-pub-display">
          <div class="selected-header">
            <span class="selected-label">Your Home Pub:</span>
            <button type="button" class="change-btn" (click)="clearSelection()">Change</button>
          </div>
          <div class="selected-pub-card">
            <app-pub-card-light
              [pub]="selectedPub()!"
              [distance]="selectedPubDistance()"
              [showDistance]="selectedPubDistance() !== null"
              [isLocalPub]="dataAggregatorService.isLocalPub(selectedPub()!.id)"
              variant="normal"
            />
            <div class="selection-check">✓</div>
          </div>
        </div>
      }

      <!-- Search Input -->
      @if (!selectedPub()) {
        <div class="search-section">
          <label class="search-label visually-hidden">Search for your local pub</label>
          <div class="search-container">
            <input
              type="text"
              class="search-input"
              placeholder="Search by pub name or location..."
              [value]="searchTerm()"
              (input)="onSearchInput($event)"
              (focus)="setDropdownOpen(true)"
            />
            <div class="search-icon">🔍</div>
          </div>
        </div>

        <!-- Nearby Pubs List -->
        @if (nearbyPubsForList().length > 0 && !hasSearchTerm()) {
          <div class="nearby-pubs-section">
            <div class="nearby-pubs-wrapper">
              <h3 class="nearby-pubs-title">📍 Nearby Pubs ({{ nearbyPubsForList().length }})</h3>
              <div class="clickable-pub-list">
                @for (pub of nearbyPubsForList(); track pub.id) {
                  <div class="clickable-pub-item" (click)="selectPubFromNearby(pub)">
                    <app-pub-card-light
                      [pub]="convertNearbyPubToPub(pub)"
                      [distance]="pub.distance"
                      [showDistance]="true"
                      [showLocation]="false"
                      [isLocalPub]="dataAggregatorService.isLocalPub(pub.id)"
                      variant="normal"
                    />
                    <div class="select-icon">+</div>
                  </div>
                }
              </div>
            </div>
          </div>
        }

        <!-- Search Results -->
        @if (isDropdownOpen() && hasSearchTerm()) {
          @if (filteredPubs().length > 0) {
            <div class="search-results">
              <div class="results-header">
                <span class="results-title">Search Results</span>
                <span class="result-count">{{ filteredPubs().length }} pubs found</span>
              </div>
              <div class="results-list">
                @for (pub of filteredPubs().slice(0, 5); track pub.id) {
                  <div class="result-item" (click)="selectPub(pub)">
                    <app-pub-card-light
                      [pub]="pub"
                      [showAddress]="false"
                      [showDistance]="false"
                      [isLocalPub]="dataAggregatorService.isLocalPub(pub.id)"
                      variant="compact"
                    />
                    <div class="select-icon">+</div>
                  </div>
                }
              </div>
            </div>
          } @else {
            <div class="no-results">
              <div class="no-results-icon">🔍</div>
              <div class="no-results-text">No pubs found matching "{{ searchTerm() }}"</div>
            </div>
          }
        }
      }

      <!-- Empty State for No Nearby Pubs -->
      @if (!selectedPub() && nearbyPubsForList().length === 0 && !hasSearchTerm()) {
        <div class="empty-state">
          <div class="empty-icon">🍺</div>
          <div class="empty-title">No nearby pubs found</div>
          <div class="empty-subtitle">Try searching for a specific pub name or location</div>
        </div>
      }
    </div>
  `,
  styles: `
    .pub-single-selector {
      width: 100%;
      max-width: 500px;
      margin: 0 auto;
    }

    /* Search section */
    .search-section {
      margin-bottom: 1.5rem;
    }

    .search-label {
      display: block;
      font-weight: 500;
      font-size: 0.875rem;
      margin-bottom: 0.5rem;
      color: var(--text);
    }

    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .search-container {
      position: relative;
    }

    .search-input {
      width: 100%;
      padding: 0.75rem 2.5rem 0.75rem 1rem;
      border: 2px solid var(--border);
      border-radius: 0.75rem;
      font-size: 0.875rem;
      font-family: 'Fredoka', 'Atkinson Hyperlegible', sans-serif;
      transition:
        border-color 0.2s ease,
        box-shadow 0.2s ease;
      background: var(--background-lighter);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      color: var(--text);
      outline: none;
    }

    .search-input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-hover, rgba(245, 158, 11, 0.15));
    }

    .search-input::placeholder {
      color: var(--text-muted);
    }

    .search-icon {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-secondary);
      pointer-events: none;
    }

    /* Selected pub display */
    .selected-pub-display {
      margin-bottom: 1.5rem;
      border: 2px solid var(--accent);
      border-radius: 0.75rem;
      background: var(--background-lighter);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }

    .selected-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border);
      background: var(--background-darkest);
    }

    .selected-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--accent);
    }

    .change-btn {
      background: none;
      border: none;
      color: var(--accent);
      font-size: 0.75rem;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      transition: background-color 0.2s ease;
    }

    .change-btn:hover {
      background: var(--background-lighter);
    }

    .selected-pub-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem;
    }

    .selection-check {
      color: var(--accent);
      font-size: 1.5rem;
      font-weight: bold;
    }

    /* Nearby Pubs Section */
    .nearby-pubs-section {
      margin-bottom: 1.5rem;
    }

    .nearby-pubs-wrapper {
      background: var(--background-lighter);
      border: 2px solid var(--border);
      border-radius: 0.75rem;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      overflow: hidden;
    }

    .nearby-pubs-title {
      margin: 0;
      padding: 1rem 1.5rem;
      font-size: 1rem;
      font-weight: 600;
      color: var(--text);
      background: var(--background-darkest);
      border-bottom: 1px solid var(--border);
    }

    .clickable-pub-list {
      display: flex;
      flex-direction: column;
    }

    .clickable-pub-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.5rem;
      cursor: pointer;
      transition: all 0.2s ease;
      border-bottom: 1px solid var(--border);
    }

    .clickable-pub-item:last-child {
      border-bottom: none;
    }

    .clickable-pub-item:hover {
      background: var(--background-lightest);
      transform: translateY(-1px);
    }

    .clickable-pub-item .select-icon {
      color: var(--accent);
      font-size: 1.25rem;
      margin-left: 1rem;
    }

    /* Search results */
    .search-results {
      background: var(--background-lighter);
      border: 2px solid var(--border);
      border-radius: 0.75rem;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      box-shadow: var(--shadow);
      max-height: 300px;
      overflow: hidden;
    }

    .results-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border);
      background: var(--background-darkest);
    }

    .results-title {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--text);
    }

    .result-count {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .results-list {
      max-height: 200px;
      overflow-y: auto;
    }

    .result-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      cursor: pointer;
      transition: background-color 0.15s ease;
      border-bottom: 1px solid var(--border);
    }

    .result-item:last-child {
      border-bottom: none;
    }

    .result-item:hover {
      background: var(--background-lightest);
    }

    .result-item .select-icon {
      color: var(--accent);
      font-size: 1.25rem;
    }

    /* No results and empty state */
    .no-results,
    .empty-state {
      padding: 2rem 1rem;
      text-align: center;
      background: var(--background-lighter);
      border: 2px solid var(--border);
      border-radius: 0.75rem;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }

    .no-results-icon,
    .empty-icon {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }

    .no-results-text,
    .empty-title {
      color: var(--text);
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: 0.25rem;
    }

    .empty-subtitle {
      color: var(--text-secondary);
      font-size: 0.8rem;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .search-input {
        font-size: 1rem; // Prevent zoom on iOS
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PubSingleSelectorComponent implements OnInit {
  // Injected services
  private readonly pubStore = inject(PubStore);
  private readonly nearbyPubStore = inject(NearbyPubStore);
  private readonly locationService = inject(LocationService);
  protected readonly dataAggregatorService = inject(DataAggregatorService);

  // Outputs
  readonly pubSelected = output<Pub>();

  // Local state for search
  private readonly _searchTerm = signal<string>('');
  private readonly _isDropdownOpen = signal<boolean>(false);
  private readonly _selectedPub = signal<Pub | null>(null);

  // Expose state for template
  protected readonly searchTerm = this._searchTerm.asReadonly();
  protected readonly isDropdownOpen = this._isDropdownOpen.asReadonly();
  protected readonly selectedPub = this._selectedPub.asReadonly();

  // Computed data
  protected readonly allPubs = computed(() => this.pubStore.data());
  protected readonly nearbyPubs = computed(() => this.nearbyPubStore.nearbyPubs());
  protected readonly hasSearchTerm = computed(() => this.searchTerm().trim().length > 0);

  // Location-related signals
  protected readonly locationServiceLocation = computed(() => this.locationService.location());

  // Convert nearby pubs to format expected by our clickable list
  protected readonly nearbyPubsForList = computed(() => {
    const pubs = this.nearbyPubs();
    const location = this.locationServiceLocation();

    return pubs.map(pub => ({
      id: pub.id,
      name: pub.name,
      distance: pub.distance || 0,
      address: pub.address,
    }));
  });

  protected readonly filteredPubs = computed(() => {
    const searchTerm = this.searchTerm().toLowerCase().trim();
    const allPubs = this.allPubs();

    if (!searchTerm) return [];

    return allPubs.filter(
      pub =>
        pub.name.toLowerCase().includes(searchTerm) ||
        pub.city?.toLowerCase().includes(searchTerm) ||
        pub.region?.toLowerCase().includes(searchTerm) ||
        pub.address?.toLowerCase().includes(searchTerm)
    );
  });

  protected readonly selectedPubDistance = computed(() => {
    const selected = this.selectedPub();
    if (!selected) return null;

    const nearbyPub = this.nearbyPubs().find(p => p.id === selected.id);
    return nearbyPub?.distance || null;
  });

  ngOnInit(): void {
    // Load pub data
    this.pubStore.loadOnce();
  }

  protected onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this._searchTerm.set(target.value);
    this.setDropdownOpen(true);
  }

  protected setDropdownOpen(open: boolean): void {
    this._isDropdownOpen.set(open);
  }

  protected selectPub(pub: Pub): void {
    this._selectedPub.set(pub);
    this._searchTerm.set('');
    this.setDropdownOpen(false);
    this.pubSelected.emit(pub);
    console.log('[PubSingleSelector] Pub selected:', pub.name);
  }

  protected selectPubFromNearby(nearbyPub: {
    id: string;
    name: string;
    distance: number;
    address?: string;
  }): void {
    // Find the full pub data from nearby pubs
    const fullPub = this.nearbyPubs().find(p => p.id === nearbyPub.id);
    if (fullPub) {
      this.selectPub(fullPub);
    }
  }

  protected convertNearbyPubToPub(nearbyPub: {
    id: string;
    name: string;
    distance: number;
    address?: string;
  }): Pub {
    return {
      id: nearbyPub.id,
      name: nearbyPub.name,
      address: nearbyPub.address || '',
      city: '',
      region: '',
      location: { lat: 0, lng: 0 },
      carpetUrl: '',
      hasCarpet: false,
    } as Pub;
  }

  protected clearSelection(): void {
    this._selectedPub.set(null);
    console.log('[PubSingleSelector] Selection cleared');
  }
}
