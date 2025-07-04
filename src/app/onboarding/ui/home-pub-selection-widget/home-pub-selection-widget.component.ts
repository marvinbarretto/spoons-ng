import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseWidgetComponent } from '../../../widgets/base/base-widget.component';
import { PubStore } from '../../../pubs/data-access/pub.store';
import { NearbyPubStore } from '../../../pubs/data-access/nearby-pub.store';
import { DataAggregatorService } from '../../../shared/data-access/data-aggregator.service';
import { LocationService } from '../../../shared/data-access/location.service';
import type { Pub } from '../../../pubs/utils/pub.models';

@Component({
  selector: 'app-home-pub-selection-widget',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="widget-container">
      @if (loading()) {
        <div class="widget-loading">
          <span class="loading-spinner"></span>
          <span>Loading pubs...</span>
        </div>
      } @else if (error()) {
        <div class="widget-error">
          <span class="error-icon">⚠️</span>
          <span>{{ error() }}</span>
        </div>
      } @else {
        <div class="home-pub-selection">
          <div class="widget-header">
            <h3 class="widget-title">Choose Your Local</h3>
            <p class="widget-description">
              Select the pub you visit most often.
            </p>
          </div>

          <!-- Search Section -->
          <div class="search-section">
            <label class="search-label">Search for your local</label>
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

          <!-- Selected Pub Display -->
          @if (selectedPub()) {
            <div class="selected-pub-display">
              <div class="selected-header">
                <span class="selected-label">Your Home Pub:</span>
                <button
                  type="button"
                  class="change-btn"
                  (click)="clearSelection()"
                >
                  Change
                </button>
              </div>
              <div class="selected-pub-card">
                <div class="pub-info">
                  <h4 class="pub-name">{{ selectedPub()!.name }}</h4>
                  <p class="pub-address">{{ getPubLocationText(selectedPub()!) }}</p>
                  @if (selectedPubDistance()) {
                    <p class="pub-distance" [class.distance-pulsing]="isMoving()">📍 {{ formatDistance(selectedPubDistance()!) }}</p>
                  }
                </div>
                <div class="selection-check">✓</div>
              </div>
            </div>
          }

          <!-- Suggested Nearest Pubs -->
          @if (!selectedPub() && nearbyPubs().length > 0 && !hasSearchTerm()) {
            <div class="suggestions-section">
              <h4 class="suggestions-title">Suggested based on your location:</h4>
              <div class="suggestions-list">
                @for (pub of nearbyPubs().slice(0, 3); track pub.id) {
                  <div
                    class="suggestion-card"
                    (click)="selectPub(pub)"
                  >
                    <div class="pub-info">
                      <h5 class="pub-name">{{ pub.name }}</h5>
                      <p class="pub-address">{{ getPubLocationText(pub) }}</p>
                      <p class="pub-distance" [class.distance-pulsing]="isMoving()">📍 {{ formatDistance(pub.distance) }}</p>
                    </div>
                    <div class="select-icon">+</div>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Search Results Dropdown -->
          @if (isDropdownOpen() && hasSearchTerm()) {
            @if (filteredPubs().length > 0) {
              <div class="dropdown">
                <div class="dropdown-header">
                  <span class="dropdown-title">Search Results</span>
                  <span class="result-count">{{ filteredPubs().length }} pubs found</span>
                </div>
                <div class="dropdown-list">
                  @for (pub of filteredPubs().slice(0, 10); track pub.id) {
                    <div
                      class="dropdown-item"
                      (click)="selectPub(pub)"
                    >
                      <div class="pub-info">
                        <div class="pub-name">{{ pub.name }}</div>
                        <div class="pub-location">{{ getPubLocationText(pub) }}</div>
                      </div>
                      <div class="select-icon">+</div>
                    </div>
                  }
                </div>
                @if (filteredPubs().length > 10) {
                  <div class="dropdown-footer">
                    <span class="more-results">
                      Showing first 10 results. Keep typing to narrow search.
                    </span>
                  </div>
                }
              </div>
            } @else {
              <div class="dropdown">
                <div class="no-results">
                  <div class="no-results-icon">🔍</div>
                  <div class="no-results-text">No pubs found matching "{{ searchTerm() }}"</div>
                  <div class="no-results-hint">Try searching by pub name or location</div>
                </div>
              </div>
            }
          }

          <!-- Skip Option -->
          @if (!selectedPub()) {
            <div class="skip-section">
              <button
                type="button"
                class="skip-btn"
                (click)="skipSelection()"
              >
                Skip for now
              </button>
              <p class="skip-hint">You can always set this later in your profile</p>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .widget-container {
      padding: 1.5rem;
      background: var(--background-lighter);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      box-shadow: var(--shadow);
      max-width: 600px;
      margin: 0 auto;
    }

    .widget-loading,
    .widget-error {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 2rem;
      justify-content: center;
      color: var(--text-secondary);
    }

    .loading-spinner {
      width: 1rem;
      height: 1rem;
      border: 2px solid currentColor;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .widget-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .widget-title {
      margin: 0 0 0.75rem 0;
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--text);
    }

    .widget-description {
      margin: 0;
      color: var(--text-secondary);
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .search-section {
      margin-bottom: 1.5rem;
    }

    .search-label {
      display: block;
      font-weight: 500;
      color: var(--text);
      font-size: 0.875rem;
      margin-bottom: 0.5rem;
    }

    .search-container {
      position: relative;
    }

    .search-input {
      width: 100%;
      padding: 0.75rem 2.5rem 0.75rem 1rem;
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      font-size: 0.875rem;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
      background: var(--background);
      color: var(--text);
    }

    .search-input:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(var(--accent), 0.1);
    }

    .search-icon {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      pointer-events: none;
    }

    .selected-pub-display {
      margin-bottom: 1.5rem;
      border: 2px solid var(--success);
      border-radius: 0.5rem;
      background: var(--background-lightest);
    }

    .selected-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border);
      background: var(--background);
    }

    .selected-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--success);
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
      background: var(--background-darker);
    }

    .selected-pub-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem;
    }

    .selection-check {
      color: var(--success);
      font-size: 1.5rem;
      font-weight: bold;
    }

    .suggestions-section {
      margin-bottom: 1.5rem;
    }

    .suggestions-title {
      margin: 0 0 1rem 0;
      font-size: 1rem;
      font-weight: 500;
      color: var(--text);
    }

    .suggestions-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .suggestion-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem;
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.2s ease;
      background: var(--background);
    }

    .suggestion-card:hover {
      border-color: var(--accent);
      background: var(--background-lightest);
    }

    .pub-info {
      flex: 1;
      min-width: 0;
    }

    .pub-name {
      margin: 0;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text);
    }

    .pub-address {
      margin: 0.25rem 0 0 0;
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .pub-distance {
      margin: 0.25rem 0 0 0;
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .select-icon {
      color: var(--accent);
      font-size: 1.25rem;
      margin-left: 1rem;
    }

    .dropdown {
      position: relative;
      background: var(--background);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      box-shadow: var(--shadow);
      max-height: 300px;
      overflow: hidden;
      margin-bottom: 1rem;
    }

    .dropdown-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border);
      background: var(--background-darker);
    }

    .dropdown-title {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--text);
    }

    .result-count {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .dropdown-list {
      max-height: 200px;
      overflow-y: auto;
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      cursor: pointer;
      transition: background-color 0.15s ease;
      border-bottom: 1px solid var(--border);
    }

    .dropdown-item:last-child {
      border-bottom: none;
    }

    .dropdown-item:hover {
      background: var(--background-lightest);
    }

    .dropdown-item .pub-name {
      display: block;
      margin-bottom: 0.25rem;
    }

    .dropdown-item .pub-location {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .dropdown-footer {
      padding: 0.5rem 1rem;
      border-top: 1px solid var(--border);
      background: var(--background-darker);
      text-align: center;
    }

    .more-results {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .no-results {
      padding: 2rem 1rem;
      text-align: center;
    }

    .no-results-icon {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }

    .no-results-text {
      color: var(--text-secondary);
      font-size: 0.875rem;
      margin-bottom: 0.5rem;
    }

    .no-results-hint {
      color: var(--text-muted);
      font-size: 0.75rem;
    }

    .skip-section {
      text-align: center;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
    }

    .skip-btn {
      background: var(--secondary);
      color: var(--secondary-contrast);
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.25rem;
      font-size: 0.875rem;
      cursor: pointer;
      transition: background-color 0.2s ease;
      margin-bottom: 0.5rem;
    }

    .skip-btn:hover {
      background: var(--secondary-hover);
    }

    .skip-hint {
      margin: 0;
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    @media (max-width: 480px) {
      .widget-container {
        padding: 1rem;
      }

      .selected-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }

      .suggestions-list {
        gap: 0.75rem;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomePubSelectionWidgetComponent extends BaseWidgetComponent {
  // Direct store access for pub data
  private readonly pubStore = inject(PubStore);
  private readonly nearbyPubStore = inject(NearbyPubStore);
  private readonly locationService = inject(LocationService);

  // DataAggregator for any cross-store needs
  private readonly dataAggregatorService = inject(DataAggregatorService);
  
  // ✅ Movement detection signal
  readonly isMoving = this.locationService.isMoving;

  // Output for selected pub
  readonly pubSelected = output<Pub | null>();

  // Local state
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

  protected readonly filteredPubs = computed(() => {
    const searchTerm = this.searchTerm().toLowerCase().trim();
    const allPubs = this.allPubs();

    if (!searchTerm) return [];

    return allPubs.filter(pub =>
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

  protected override onInit(): void {
    // Load pub data
    this.pubStore.loadOnce();

    // Auto-select closest pub if none selected and we have nearby pubs
    setTimeout(() => {
      if (!this.selectedPub() && this.nearbyPubs().length > 0) {
        // Don't auto-select, just suggest
      }
    }, 1000);
  }

  protected formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m away`;
    }
    return `${(meters / 1000).toFixed(1)}km away`;
  }

  protected getPubLocationText(pub: Pub): string {
    const parts = [pub.city, pub.region].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : pub.address || 'Location unknown';
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
  }

  protected clearSelection(): void {
    this._selectedPub.set(null);
    this.pubSelected.emit(null);
  }

  protected skipSelection(): void {
    this._selectedPub.set(null);
    this.pubSelected.emit(null);
  }
}
