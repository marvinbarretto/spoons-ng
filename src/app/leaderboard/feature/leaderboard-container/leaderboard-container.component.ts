// src/app/leaderboard/feature/leaderboard-container/leaderboard-container.component.ts
import { CommonModule } from "@angular/common";
import { Component, computed, inject, signal } from "@angular/core";
import { ActivatedRoute, RouterModule } from "@angular/router";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { BaseComponent } from "../../../shared/base/base.component";
import { LeaderboardStore } from "../../data-access/leaderboard.store";
import { DataTableComponent } from "../../../shared/ui/data-table/data-table.component";
import { TableColumn } from "../../../shared/ui/data-table/data-table.model";
import { LeaderboardTimeRange, LeaderboardEntry, LeaderboardGeographicFilter } from "../../utils/leaderboard.models";
import { AuthStore } from "../../../auth/data-access/auth.store";
import { map } from 'rxjs/operators';
import { combineLatest } from 'rxjs';

@Component({
  selector: 'app-leaderboard-container',
  imports: [CommonModule, DataTableComponent, RouterModule],
  template: `
    <div class="leaderboard-page">
      <header class="leaderboard-header">
        <h1>🏆 Leaderboard</h1>
        <p>Compete with fellow pub crawlers across the city!</p>
      </header>


      <!-- Geographic Filter Section -->
      @if (showGeographicFilters()) {
        <div class="geographic-filters">
          <div class="filter-header">
            <h3>🌍 Filter by Location</h3>
            @if (hasActiveGeographicFilter()) {
              <button
                class="clear-filters-btn"
                (click)="clearAllFilters()"
                title="Clear all filters"
              >
                ✕ Clear
              </button>
            }
          </div>

          <!-- Filter Breadcrumb/Summary -->
          @if (currentFilterSummary()) {
            <div class="filter-summary">
              <span class="filter-summary-text">{{ currentFilterSummary() }}</span>
            </div>
          }

          <!-- Location Type Toggle -->
          <nav class="location-tabs">
            <button
              [class.active]="!hasActiveGeographicFilter()"
              (click)="clearAllFilters()"
              class="location-tab"
            >
              🌍 Global
            </button>
            <button
              [class.active]="hasActiveGeographicFilter()"
              (click)="showLocalOptions()"
              class="location-tab"
            >
              📍 Local
            </button>
          </nav>

          <!-- City Filter Chips -->
          @if (availableCities().length > 0 && !selectedRegion()) {
            <div class="filter-section">
              <label class="filter-label">Popular Cities:</label>
              <div class="filter-chips">
                @for (city of getPopularCities(); track city) {
                  <button
                    [class.active]="selectedCity() === city"
                    (click)="onCityChange(city)"
                    class="filter-chip"
                  >
                    {{ city }}
                  </button>
                }
                @if (availableCities().length > 8) {
                  <button class="filter-chip more-btn" (click)="showAllCities = !showAllCities">
                    {{ showAllCities ? 'Less' : 'More...' }}
                  </button>
                }
              </div>
              @if (showAllCities && availableCities().length > 8) {
                <div class="filter-chips additional-chips">
                  @for (city of getAdditionalCities(); track city) {
                    <button
                      [class.active]="selectedCity() === city"
                      (click)="onCityChange(city)"
                      class="filter-chip"
                    >
                      {{ city }}
                    </button>
                  }
                </div>
              }
            </div>
          }

          <!-- Region Filter Chips -->
          @if (availableRegions().length > 0 && !selectedCity()) {
            <div class="filter-section">
              <label class="filter-label">Regions:</label>
              <div class="filter-chips">
                @for (region of availableRegions(); track region) {
                  <button
                    [class.active]="selectedRegion() === region"
                    (click)="onRegionChange(region)"
                    class="filter-chip"
                  >
                    {{ region }}
                  </button>
                }
              </div>
            </div>
          }
        </div>
      }


      <!-- Time Period Tabs -->
      <nav class="time-period-tabs">
        <a
          routerLink="/leaderboard/this-week"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }"
          class="tab-link"
        >
          This Week
        </a>
        <a
          routerLink="/leaderboard/this-month"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }"
          class="tab-link"
        >
          This Month
        </a>
        <a
          routerLink="/leaderboard/all-time"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }"
          class="tab-link"
        >
          All Time
        </a>
      </nav>

      @if (loading() || leaderboardStore.loading()) {
        <div class="loading-state">
          <p>🔄 Loading leaderboard...</p>
        </div>
      } @else if (error() || leaderboardStore.error()) {
        <div class="error-state">
          <p>❌ Error: {{ error() || leaderboardStore.error() }}</p>
          <button (click)="retry()">Try Again</button>
        </div>
      } @else {
        <div class="leaderboard-content">
          <!-- User Position (if not visible in table) -->
          @if (userPosition() && userPosition()! > 100) {
            <div class="user-position-indicator">
              <p>Your position: <strong>#{{ userPosition() }}</strong> of {{ leaderboardStore.filteredData().length }} crawlers</p>
            </div>
          }

          <!-- Leaderboard Table -->
          <app-data-table
            [data]="topEntries()"
            [columns]="columns()"
            [loading]="leaderboardStore.loading()"
            [highlightRow]="isCurrentUser"
            [trackBy]="'userId'"
            [onRowClick]="handleRowClick"
          />
        </div>
      }
    </div>
  `,
  styles: `
    .leaderboard-page {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1rem;
    }

    .leaderboard-header {
      text-align: center;
      margin-bottom: 1.5rem;
    }

    .leaderboard-header h1 {
      margin: 0 0 0.5rem;
      color: var(--color-text);
      font-size: clamp(1.5rem, 4vw, 2.5rem);
    }

    .leaderboard-header p {
      margin: 0;
      opacity: 0.8;
      color: var(--color-text);
    }

    .time-period-tabs {
      display: flex;
      justify-content: center;
      gap: 0.5rem;
      margin-bottom: 2rem;
      border-bottom: 2px solid var(--color-subtleLighter);
    }

    .tab-link {
      padding: 0.75rem 1.5rem;
      text-decoration: none;
      color: var(--color-text);
      border-bottom: 3px solid transparent;
      transition: all 0.2s ease;
      font-weight: 500;
    }

    .tab-link:hover {
      background: var(--color-subtleLighter);
      border-radius: 8px 8px 0 0;
    }

    .tab-link.active {
      color: var(--color-buttonPrimaryBase);
      border-bottom-color: var(--color-buttonPrimaryBase);
      font-weight: 600;
    }

    .geographic-filters {
      background: var(--color-subtleLighter);
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 2rem;
    }

    .filter-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }

    .filter-header h3 {
      margin: 0;
      font-size: 1.1rem;
      color: var(--color-text);
    }

    .clear-filters-btn {
      background: var(--color-buttonSecondaryBackground);
      color: var(--color-buttonSecondaryText);
      border: 1px solid var(--color-buttonSecondaryBorder);
      border-radius: 4px;
      padding: 0.375rem 0.75rem;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .clear-filters-btn:hover {
      background: var(--color-buttonSecondaryHover);
    }

    .filter-summary {
      background: var(--color-background);
      padding: 0.75rem;
      border-radius: 6px;
      margin-bottom: 1rem;
      border-left: 3px solid var(--color-buttonPrimaryBase);
    }

    .filter-summary-text {
      font-size: 0.9rem;
      color: var(--color-text);
      font-weight: 500;
    }

    .location-tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }

    .location-tab {
      padding: 0.5rem 1rem;
      background: var(--color-background);
      border: 1px solid var(--color-buttonSecondaryBorder);
      border-radius: 4px;
      color: var(--color-text);
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 0.9rem;
    }

    .location-tab:hover {
      background: var(--color-buttonSecondaryHover);
    }

    .location-tab.active {
      background: var(--color-buttonPrimaryBase);
      color: var(--color-buttonPrimaryText);
      border-color: var(--color-buttonPrimaryBase);
    }

    .filter-section {
      margin-bottom: 1.5rem;
    }

    .filter-label {
      display: block;
      font-weight: 500;
      color: var(--color-text);
      font-size: 0.9rem;
      margin-bottom: 0.75rem;
    }

    .filter-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .filter-chip {
      background: var(--color-background);
      border: 1px solid var(--color-buttonSecondaryBorder);
      border-radius: 20px;
      padding: 0.375rem 0.875rem;
      color: var(--color-text);
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 0.85rem;
      white-space: nowrap;
    }

    .filter-chip:hover {
      background: var(--color-buttonSecondaryHover);
      border-color: var(--color-buttonPrimaryBase);
    }

    .filter-chip.active {
      background: var(--color-buttonPrimaryBase);
      color: var(--color-buttonPrimaryText);
      border-color: var(--color-buttonPrimaryBase);
      font-weight: 500;
    }

    .filter-chip.more-btn {
      background: var(--color-buttonSecondaryBackground);
      color: var(--color-buttonSecondaryText);
      font-style: italic;
    }

    .additional-chips {
      margin-top: 0.5rem;
      opacity: 0.9;
    }

    .loading-state, .error-state {
      text-align: center;
      padding: 2rem;
    }

    .error-state button {
      margin-top: 1rem;
      padding: 0.5rem 1rem;
      background: var(--color-buttonPrimaryBase);
      color: var(--color-buttonPrimaryText);
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }


    .user-position-indicator {
      background: var(--color-subtleLighter);
      padding: 1rem;
      border-radius: 8px;
      text-align: center;
      margin-bottom: 1rem;
    }

    .user-position-indicator p {
      margin: 0;
      color: var(--color-text);
    }

    .leaderboard-content {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }


    @media (max-width: 768px) {
      .leaderboard-page {
        padding: 0.5rem;
      }

      .time-period-tabs {
        gap: 0.25rem;
      }

      .tab-link {
        padding: 0.5rem 1rem;
        font-size: 0.9rem;
      }

      .geographic-filters {
        padding: 0.75rem;
      }

      .filter-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }

      .filter-header h3 {
        font-size: 1rem;
      }

      .clear-filters-btn {
        align-self: flex-end;
        padding: 0.25rem 0.5rem;
        font-size: 0.8rem;
      }

      .location-tabs {
        margin-bottom: 1rem;
      }

      .location-tab {
        padding: 0.375rem 0.75rem;
        font-size: 0.85rem;
      }

      .filter-chips {
        gap: 0.375rem;
      }

      .filter-chip {
        padding: 0.25rem 0.625rem;
        font-size: 0.8rem;
      }

      .filter-summary {
        padding: 0.5rem;
      }

      .filter-summary-text {
        font-size: 0.85rem;
      }
    }
  `
})
export class LeaderboardContainerComponent extends BaseComponent {
  protected readonly leaderboardStore = inject(LeaderboardStore);
  private readonly authStore = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);


  // Route data and params subscription - initialized in field initializer for injection context
  private readonly routeSubscription = combineLatest([
    this.route.data,
    this.route.params
  ]).pipe(
    takeUntilDestroyed()
  ).subscribe(([data, params]) => {
    const routeData = data as Record<string, unknown>;
    const period = (routeData['period'] as LeaderboardTimeRange) || 'all-time';
    const geographic = routeData['geographic'] as string;

    console.log('[LeaderboardContainer] Route changed:', { period, geographic, params });

    // Set time range
    this.leaderboardStore.setTimeRange(period);

    // Set geographic filter based on route
    if (geographic && geographic !== 'none') {
      const filter: LeaderboardGeographicFilter = this.createGeographicFilter(geographic, params);
      this.leaderboardStore.setGeographicFilter(filter);
      console.log('[LeaderboardContainer] Setting geographic filter:', filter);
    } else {
      this.leaderboardStore.clearGeographicFilter();
    }
  });

  // UI state for filters
  showAllCities = false;

  protected override onInit(): void {
    this.leaderboardStore.loadOnce();
  }

  // Computed data for display
  readonly topEntries = computed(() =>
    this.leaderboardStore.topByPoints().slice(0, 100)
  );

  readonly userPosition = computed(() =>
    this.leaderboardStore.userRankByPoints()
  );

  // Geographic filter controls
  readonly showGeographicFilters = computed(() => {
    // Show filters if there are available cities or regions
    const cities = this.availableCities();
    const regions = this.availableRegions();
    return cities.length > 0 || regions.length > 0;
  });

  readonly availableCities = computed(() =>
    this.leaderboardStore.availableCities()
  );

  readonly availableRegions = computed(() =>
    this.leaderboardStore.availableRegions()
  );

  readonly selectedCity = computed(() => {
    const filter = this.leaderboardStore.geographicFilter();
    return filter.type === 'city' ? filter.value || '' : '';
  });

  readonly selectedRegion = computed(() => {
    const filter = this.leaderboardStore.geographicFilter();
    return filter.type === 'region' ? filter.value || '' : '';
  });

  // Enhanced filter methods
  readonly hasActiveGeographicFilter = computed(() => {
    const filter = this.leaderboardStore.geographicFilter();
    return filter.type !== 'none' && (filter.value || '').length > 0;
  });

  readonly currentFilterSummary = computed(() => {
    const filter = this.leaderboardStore.geographicFilter();
    const totalEntries = this.leaderboardStore.filteredData().length;

    if (filter.type === 'none' || !filter.value) {
      return `Showing global leaderboard (${totalEntries.toLocaleString()} players)`;
    }

    const filterTypeLabel = filter.type === 'city' ? 'city' : 'region';
    return `Showing leaderboard for ${filter.value} (${totalEntries.toLocaleString()} players)`;
  });

  readonly getPopularCities = computed(() => {
    // Return first 8 cities as "popular" - you could enhance this with actual popularity metrics
    return this.availableCities().slice(0, 8);
  });

  readonly getAdditionalCities = computed(() => {
    // Return cities beyond the first 8
    return this.availableCities().slice(8);
  });

  // Table columns configuration
  readonly columns = computed((): TableColumn[] => [
    {
      key: 'rank',
      label: '',
      className: 'rank',
      width: '60px',
      sortable: false,
      formatter: (_, row, index) => {
        const rank = (index ?? 0) + 1;
        return `${rank}`;
      }
    },
    {
      key: 'displayName',
      label: '',
      className: 'user-cell',
      sortable: false,
      renderer: (_, row) => row // Enable custom rendering for user chips
    },
    {
      key: 'totalPoints',
      label: 'Points',
      className: 'number points-primary',
      width: '120px',
      sortable: true,
      formatter: (points) => points?.toLocaleString() || '0'
    },
    {
      key: 'uniquePubs',
      label: 'Pubs',
      className: 'number',
      width: '100px',
      sortable: true
    },
    {
      key: 'totalCheckins',
      label: 'Check-ins',
      className: 'number',
      width: '120px',
      sortable: true,
      hideOnMobile: true
    }
  ]);

  readonly isCurrentUser = (entry: LeaderboardEntry): boolean => {
    return entry.userId === this.authStore.user()?.uid;
  };

  handleRowClick = (entry: any): void => {
    console.log('User clicked:', entry.displayName);
    // TODO: Navigate to user profile or show user details
  };

  onCityChange(city: string): void {
    if (city && city !== this.selectedCity()) {
      this.leaderboardStore.filterByCity(city);
      this.showAllCities = false; // Collapse additional cities when one is selected
    }
  }

  onRegionChange(region: string): void {
    if (region && region !== this.selectedRegion()) {
      this.leaderboardStore.filterByRegion(region);
    }
  }

  clearAllFilters(): void {
    this.leaderboardStore.clearGeographicFilter();
    this.showAllCities = false;
  }

  showLocalOptions(): void {
    // This method can be enhanced to show a more sophisticated local filter selection
    // For now, it just ensures the local tab appears active when we have filters
    if (!this.hasActiveGeographicFilter()) {
      // If no active filter, we could default to showing popular cities
      // or auto-select based on user's location/history
    }
  }


  async retry(): Promise<void> {
    await this.handleAsync(
      () => this.leaderboardStore.load(),
      {
        successMessage: 'Leaderboard refreshed!',
        errorMessage: 'Failed to load leaderboard'
      }
    );
  }

  private createGeographicFilter(type: string, params: any): LeaderboardGeographicFilter {
    switch (type) {
      case 'city':
        return { type: 'city', value: params['cityName'] };
      case 'region':
        return { type: 'region', value: params['regionId'] };
      case 'country':
        return { type: 'country', value: params['countryId'] };
      case 'pub':
        return { type: 'pub', value: params['pubId'] };
      case 'local':
        // For local, we'll need to determine the user's local area
        // For now, return none - this could be enhanced later
        return { type: 'none' };
      default:
        return { type: 'none' };
    }
  }
}
