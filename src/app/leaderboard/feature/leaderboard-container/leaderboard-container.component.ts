// src/app/leaderboard/feature/leaderboard-container/leaderboard-container.component.ts
import { CommonModule } from "@angular/common";
import { Component, computed, inject, signal } from "@angular/core";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
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
        <!-- TODO: Cycle through different motivational messages -->
      </header>

      <!-- Compact Geographic Filter Section -->
      @if (showGeographicFilters()) {
        <div class="geographic-filters compact">
          <div class="filter-chips">
            <!-- Global chip -->
            <button
              [class.active]="!hasActiveGeographicFilter()"
              (click)="clearAllFilters()"
              class="filter-chip"
            >
              🌍 Global
            </button>

            <!-- Popular Cities -->
            @for (city of getPopularCities(); track city) {
              <button
                [class.active]="selectedCity() === city"
                (click)="onCityChange(city)"
                class="filter-chip"
              >
                {{ city }}
              </button>
            }

            <!-- Regions -->
            @for (region of availableRegions(); track region) {
              <button
                [class.active]="selectedRegion() === region"
                (click)="onRegionChange(region)"
                class="filter-chip"
              >
                {{ region }}
              </button>
            }

            <!-- More cities if there are many -->
            @if (availableCities().length > 8) {
              <button class="filter-chip more-btn" (click)="showAllCities = !showAllCities">
                {{ showAllCities ? 'Less' : 'More...' }}
              </button>
            }
          </div>

          <!-- Additional cities row when expanded -->
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


      <!-- Time Period Tabs -->
      <nav class="time-period-tabs">
        <a
          [routerLink]="getTimePeriodLink('this-week')"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }"
          class="tab-link"
        >
          This Week
        </a>
        <a
          [routerLink]="getTimePeriodLink('this-month')"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }"
          class="tab-link"
        >
          This Month
        </a>
        <a
          [routerLink]="getTimePeriodLink('all-time')"
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
      margin-bottom: 1rem;
    }

    .geographic-filters.compact {
      background: var(--color-subtleLighter);
      padding: 0.75rem;
      border-radius: 8px;
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

      .geographic-filters.compact {
        padding: 0.5rem;
      }

      .filter-chips {
        gap: 0.375rem;
      }

      .filter-chip {
        padding: 0.25rem 0.625rem;
        font-size: 0.8rem;
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
    if (geographic && geographic !== 'global') {
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

  readonly getPopularCities = computed(() => {
    // Return first 8 cities as "popular" - you could enhance this with actual popularity metrics
    return this.availableCities().slice(0, 8);
  });

  readonly getAdditionalCities = computed(() => {
    // Return cities beyond the first 8
    return this.availableCities().slice(8);
  });

  // Current route context for maintaining geographic filters in time period tabs
  readonly currentGeographic = computed(() => {
    const filter = this.leaderboardStore.geographicFilter();
    if (filter.type === 'city' && filter.value) {
      return `city/${filter.value.toLowerCase()}`;
    } else if (filter.type === 'region' && filter.value) {
      return `region/${filter.value.toLowerCase()}`;
    }
    return 'global';
  });

  // Helper method to generate time period links that preserve geographic context
  getTimePeriodLink(period: LeaderboardTimeRange): string {
    const geographic = this.currentGeographic();
    return `/leaderboard/${geographic}/${period}`;
  }

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
      // Navigate to the city-specific route with lowercase URL
      const currentPeriod = this.leaderboardStore.timeRange();
      const citySlug = city.toLowerCase();
      this.router.navigate(['/leaderboard', 'city', citySlug, currentPeriod]);
      this.showAllCities = false; // Collapse additional cities when one is selected
    }
  }

  onRegionChange(region: string): void {
    if (region && region !== this.selectedRegion()) {
      // Navigate to the region-specific route with lowercase URL
      const currentPeriod = this.leaderboardStore.timeRange();
      const regionSlug = region.toLowerCase();
      this.router.navigate(['/leaderboard', 'region', regionSlug, currentPeriod]);
    }
  }

  clearAllFilters(): void {
    // Navigate to global leaderboard
    const currentPeriod = this.leaderboardStore.timeRange();
    this.router.navigate(['/leaderboard', 'global', currentPeriod]);
    this.showAllCities = false;
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
        // Find the original case-sensitive city name from available cities
        const citySlug = params['cityName']?.toLowerCase();
        const originalCity = this.leaderboardStore.availableCities().find(city => 
          city.toLowerCase() === citySlug
        );
        return { type: 'city', value: originalCity || params['cityName'] };
      case 'region':
        // Find the original case-sensitive region name from available regions
        const regionSlug = params['regionName']?.toLowerCase();
        const originalRegion = this.leaderboardStore.availableRegions().find(region => 
          region.toLowerCase() === regionSlug
        );
        return { type: 'region', value: originalRegion || params['regionName'] };
      case 'country':
        return { type: 'country', value: params['countryId'] };
      case 'pub':
        return { type: 'pub', value: params['pubId'] };
      case 'global':
        return { type: 'none' };
      default:
        return { type: 'none' };
    }
  }
}
