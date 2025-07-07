import { Component, input, output, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '@shared/ui/button/button.component';
import type { Pub } from '../../../pubs/utils/pub.models';
import { ButtonSize } from '@shared/ui/button/button.params';
import { PubStore } from '../../../pubs/data-access/pub.store';
import { NearbyPubStore } from '../../../pubs/data-access/nearby-pub.store';
import { PubCardLightComponent } from '../../../pubs/ui/pub-card-light/pub-card-light.component';
import { DataAggregatorService } from '../../../shared/data-access/data-aggregator.service';
import { CheckInStore } from '../../../check-in/data-access/check-in.store';
import { LocationService } from '../../../shared/data-access/location.service';


@Component({
  selector: 'app-choose-local-step',
  imports: [ButtonComponent, FormsModule, PubCardLightComponent],
  template: `
    <div class="step choose-local-step">
      <!-- Phase 1: Location Permission Request -->
      @if (!locationGranted() && !locationRequired() && !hasExistingLocationPermission()) {
        <div class="location-permission-panel">
          <div class="permission-icon">📍</div>
          <h1>Choose Your Local,
            <span class="username">
              @if (displayName()) { {{ displayName() }}!}
            </span>
          </h1>
          <p class="subtitle">But first, we need your location to verify authentic check-ins and assign points</p>

          <div class="step-actions">
            <app-button
              variant="primary"
              [size]="ButtonSize.LARGE"
              (onClick)="requestLocation()"
            >
              Enable Location
            </app-button>
          </div>
        </div>
      }

      <!-- Phase 2: Pub Selection -->
      @if (locationGranted() || hasExistingLocationPermission()) {
        <div class="pub-selection-panel">
          <h1>Choose Your Local,
            <span class="username">
              @if (displayName()) { {{ displayName() }}!}
            </span>
          </h1>
          <p class="subtitle">Pick your regular spot for bonus points!</p>

          <!-- Selected Pub Display -->
          @if (selectedPub()) {
            <div class="selected-pub-display">
              <div class="selected-header">
                <span class="selected-label">Your Home Pub:</span>
                <button type="button" class="change-btn" (click)="clearSelection()">
                  Change
                </button>
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
              <label class="search-label">Search for your local pub</label>
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
        </div>
      }

      <!-- Loading State -->
      @if (locationRequired()) {
        <div class="location-loading">
          <div class="loading-spinner"></div>
          <p>Getting your location...</p>
        </div>
      }

      <!-- Step Actions -->
      <div class="step-actions">
        <app-button
          variant="secondary"
          [size]="ButtonSize.MEDIUM"
          (onClick)="onBack()"
          [disabled]="locationRequired()"
        >
          Back
        </app-button>

        @if (selectedPub()) {
          <app-button
            variant="primary"
            [size]="ButtonSize.LARGE"
            (onClick)="onContinue()"
            [disabled]="locationRequired() || loading()"
            [loading]="loading()"
            loadingText="Completing setup..."
          >
            Continue
          </app-button>
        }
      </div>
    </div>
  `,
  styles: `
    .choose-local-step {
      max-width: 600px;
      width: 100%;
      margin: 0 auto;
    }

    /* Phase 1: Location Permission Panel */
    .location-permission-panel {
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 2rem;
      max-width: 500px;
      margin: 0 auto;
    }

    .permission-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    /* Phase 2: Pub Selection Panel */
    .pub-selection-panel {
      display: flex;
      flex-direction: column;
      gap: 2rem;
      max-width: 600px;
      margin: 0 auto;
    }

    /* Common styles */
    h1 {
      font-size: 2.5rem;
      margin: 0 0 0.5rem 0;
      line-height: 1.2;
    }

    .username {
      color: gold;
    }

    .subtitle {
      font-size: 1.125rem;
      margin: 0;
      color: var(--text);
      text-align: center;
    }

    /* Search section */
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
      color: var(--text-secondary);
      pointer-events: none;
    }

    /* Selected pub display */
    .selected-pub-display {
      margin-bottom: 1.5rem;
      border: 2px solid var(--accent);
      border-radius: 0.5rem;
      background: var(--background-lighter);
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
      background: var(--background-darker);
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
      background: var(--background);
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      overflow: hidden;
    }

    .nearby-pubs-title {
      margin: 0;
      padding: 1rem 1.5rem;
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--text);
      background: var(--background-darker);
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
      background: var(--background-lighter);
      transform: translateY(-1px);
    }

    .clickable-pub-item .select-icon {
      color: var(--accent);
      font-size: 1.25rem;
      margin-left: 1rem;
    }

    /* Search results */
    .search-results {
      background: var(--background);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
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
      background: var(--background-darker);
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
      background: var(--background-lighter);
    }

    /* No results */
    .no-results {
      padding: 2rem 1rem;
      text-align: center;
      background: var(--background);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
    }

    .no-results-icon {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }

    .no-results-text {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    /* Loading state */
    .location-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      margin: 2rem 0;
      color: var(--text);
    }

    .loading-spinner {
      width: 2rem;
      height: 2rem;
      border: 3px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Step actions */
    .step-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-top: 2rem;
      text-align: center;
    }

    .step-actions app-button {
      min-width: 120px;
    }

    /* Responsive */
    @media (max-width: 768px) {
      h1 {
        font-size: 2rem;
      }

      .subtitle {
        font-size: 1rem;
      }

      .step-actions {
        flex-direction: column;
        width: 100%;
        max-width: 300px;
        margin: 2rem auto 0;
      }

      .step-actions app-button {
        width: 100%;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChooseLocalStepComponent {
  // Injected services
  private readonly pubStore = inject(PubStore);
  private readonly nearbyPubStore = inject(NearbyPubStore);
  private readonly checkInStore = inject(CheckInStore);
  private readonly locationService = inject(LocationService);
  protected readonly dataAggregatorService = inject(DataAggregatorService);

  // Inputs
  readonly selectedPub = input<Pub | null>(null);
  readonly locationGranted = input<boolean>(false);
  readonly locationRequired = input<boolean>(false);
  readonly hasExistingLocationPermission = input<boolean>(false);
  readonly loading = input<boolean>(false);
  readonly displayName = input<string>('');

  // Outputs
  readonly pubSelected = output<Pub | null>();
  readonly locationRequested = output<void>();
  readonly back = output<void>();
  readonly complete = output<void>();

  // Local state for search
  private readonly _searchTerm = signal<string>('');
  private readonly _isDropdownOpen = signal<boolean>(false);
  private readonly _internalSelectedPub = signal<Pub | null>(null);

  // Expose state for template
  protected readonly searchTerm = this._searchTerm.asReadonly();
  protected readonly isDropdownOpen = this._isDropdownOpen.asReadonly();

  // Computed data
  protected readonly allPubs = computed(() => this.pubStore.data());
  protected readonly nearbyPubs = computed(() => this.nearbyPubStore.nearbyPubs());
  protected readonly hasSearchTerm = computed(() => this.searchTerm().trim().length > 0);
  protected readonly userCheckins = computed(() => this.checkInStore.userCheckins());
  
  // Location-related signals
  protected readonly locationServiceLocation = computed(() => this.locationService.location());
  protected readonly locationServiceLoading = computed(() => this.locationService.loading());
  protected readonly locationServiceError = computed(() => this.locationService.error());
  
  // Convert nearby pubs to format expected by our clickable list
  protected readonly nearbyPubsForList = computed(() => {
    const pubs = this.nearbyPubs();
    const location = this.locationServiceLocation();
    console.log('[ChooseLocalStep] nearbyPubsForList computed - pubs:', pubs.length, 'location:', location);
    
    return pubs.map(pub => ({
      id: pub.id,
      name: pub.name,
      distance: pub.distance || 0,
      address: pub.address
    }));
  });

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

  readonly ButtonSize = ButtonSize;

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
    this._internalSelectedPub.set(pub);
    this._searchTerm.set('');
    this.setDropdownOpen(false);
    this.pubSelected.emit(pub);
    console.log('[ChooseLocalStep] Pub selected:', pub.name);
  }

  protected selectPubFromNearby(nearbyPub: {id: string, name: string, distance: number, address?: string}): void {
    // Find the full pub data from nearby pubs
    const fullPub = this.nearbyPubs().find(p => p.id === nearbyPub.id);
    if (fullPub) {
      this.selectPub(fullPub);
    }
  }

  protected convertNearbyPubToPub(nearbyPub: {id: string, name: string, distance: number, address?: string}): Pub {
    return {
      id: nearbyPub.id,
      name: nearbyPub.name,
      address: nearbyPub.address || '',
      city: '', 
      region: '', 
      location: { lat: 0, lng: 0 }, 
      carpetUrl: '', 
      hasCarpet: false
    } as Pub;
  }

  protected clearSelection(): void {
    this._internalSelectedPub.set(null);
    this.pubSelected.emit(null);
    console.log('[ChooseLocalStep] Selection cleared');
  }

  requestLocation(): void {
    console.log('[ChooseLocalStep] Location permission requested');
    
    // Call LocationService to update app-wide location signals
    this.locationService.getCurrentLocation();
    console.log('[ChooseLocalStep] LocationService.getCurrentLocation() called');
    
    // Also emit to parent for existing onboarding flow
    this.locationRequested.emit();
  }

  onBack(): void {
    console.log('[ChooseLocalStep] Going back to profile step');
    this.back.emit();
  }

  onContinue(): void {
    const pub = this.selectedPub();
    if (pub) {
      console.log('[ChooseLocalStep] Continuing with selected pub:', pub.name);
      this.complete.emit();
    } else {
      console.log('[ChooseLocalStep] Cannot continue without pub selection');
    }
  }
}
