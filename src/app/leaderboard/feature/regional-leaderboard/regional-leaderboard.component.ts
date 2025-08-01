import { Component, computed, inject, signal } from '@angular/core';

import {
  EmptyStateComponent,
  ErrorStateComponent,
  LoadingStateComponent,
} from '@fourfold/angular-foundation';
import { BaseComponent } from '@shared/base/base.component';
import { DataTableComponent } from '@shared/ui/data-table/data-table.component';
import { type TableColumn } from '@shared/ui/data-table/data-table.model';
import { formatLastActive } from '@shared/utils/date-formatting.utils';
import { LeaderboardStore } from '../../data-access/leaderboard.store';
import { type LeaderboardEntry } from '../../utils/leaderboard.models';

@Component({
  selector: 'app-regional-leaderboard',
  imports: [LoadingStateComponent, ErrorStateComponent, EmptyStateComponent, DataTableComponent],
  template: `
    <div class="regional-leaderboard">
      <!-- Region Selector -->
      <div class="region-controls">
        <div class="region-selector">
          <label for="region-select" class="region-label">
            <span class="icon">🌍</span>
            Select Region:
          </label>
          <select
            id="region-select"
            class="region-select"
            [value]="selectedRegion()"
            (change)="onRegionChange($event)"
          >
            <option value="">All Regions</option>
            @for (region of availableRegions(); track region) {
              <option [value]="region">{{ region }}</option>
            }
          </select>
        </div>

        @if (selectedRegion()) {
          <div class="region-stats">
            <span class="stats-text">
              {{ regionalEntries().length }} users in {{ selectedRegion() }}
            </span>
          </div>
        }
      </div>

      @if (store.loading()) {
        <ff-loading-state text="Loading regional leaderboard..." />
      } @else if (store.error()) {
        <ff-error-state
          [message]="store.error()!"
          [showRetry]="true"
          retryText="Try Again"
          (retry)="handleRetry()"
        />
      } @else if (regionalEntries().length === 0) {
        <ff-empty-state
          icon="🗺️"
          [title]="selectedRegion() ? 'No users in ' + selectedRegion() : 'No regional data'"
          [subtitle]="
            selectedRegion()
              ? 'Try selecting a different region'
              : 'Users need to set their location'
          "
        >
          @if (!selectedRegion()) {
            <div class="empty-actions">
              <button class="action-button" (click)="showAllRegions()">
                <span class="icon">🌍</span>
                Show All Regions
              </button>
            </div>
          }
        </ff-empty-state>
      } @else {
        <!-- Current User Position Banner -->
        @if (currentUserPosition() && currentUserPosition()! > 50) {
          <div class="user-position-banner">
            <p>
              Your position in {{ selectedRegion() || 'all regions' }}:
              <strong>#{{ currentUserPosition() }}</strong>
            </p>
          </div>
        }

        <!-- Regional Stats Summary -->
        @if (selectedRegion()) {
          <div class="region-summary">
            <h3 class="region-title">{{ selectedRegion() }} Leaderboard</h3>
            <div class="summary-stats">
              <div class="summary-stat">
                <span class="stat-value">{{ regionalEntries().length }}</span>
                <span class="stat-label">Total Users</span>
              </div>
              <div class="summary-stat">
                <span class="stat-value">{{ totalPoints().toLocaleString() }}</span>
                <span class="stat-label">Total Points</span>
              </div>
              <div class="summary-stat">
                <span class="stat-value">{{ totalPubs() }}</span>
                <span class="stat-label">Unique Pubs</span>
              </div>
            </div>
          </div>
        }

        <!-- Regional Leaderboard Table -->
        <app-data-table
          [data]="displayEntries()"
          [columns]="regionalColumns"
          [loading]="store.loading()"
          [trackBy]="'userId'"
          [highlightRow]="isCurrentUser"
          [onRowClick]="navigateToProfile"
        />

        <!-- Show More Button -->
        @if (regionalEntries().length > displayEntries().length) {
          <div class="show-more-section">
            <p class="total-users">
              Showing top {{ displayEntries().length }} of {{ regionalEntries().length }} users
            </p>
            <button class="show-more-btn" (click)="loadMore()">Show More Users</button>
          </div>
        }
      }
    </div>
  `,
  styles: `
    .regional-leaderboard {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1rem;
    }

    .region-controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 2rem;
      margin-bottom: 2rem;
      padding: 1.5rem;
      background: var(--background-lighter);
      border-radius: 12px;
    }

    .region-selector {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .region-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 500;
      color: var(--text);
    }

    .region-select {
      padding: 0.75rem 1rem;
      border: 2px solid var(--border);
      border-radius: 8px;
      background: var(--background);
      color: var(--text);
      font-size: 1rem;
      min-width: 200px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .region-select:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-background);
    }

    .region-stats {
      display: flex;
      align-items: center;
    }

    .stats-text {
      color: var(--text-secondary);
      font-size: 0.9rem;
      font-weight: 500;
    }

    .user-position-banner {
      margin-bottom: 1.5rem;
      padding: 1rem;
      background: var(--background-lighter);
      border-radius: 8px;
      text-align: center;
      border: 2px solid var(--primary);
    }

    .user-position-banner p {
      margin: 0;
      color: var(--text);
      font-weight: 500;
    }

    .region-summary {
      margin-bottom: 2rem;
      padding: 1.5rem;
      background: var(--background-lighter);
      border-radius: 12px;
      border-left: 4px solid var(--primary);
    }

    .region-title {
      margin: 0 0 1rem 0;
      color: var(--text);
      font-size: 1.3rem;
      font-weight: 600;
    }

    .summary-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 1.5rem;
    }

    .summary-stat {
      text-align: center;
    }

    .summary-stat .stat-value {
      display: block;
      font-size: 1.8rem;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 0.25rem;
    }

    .summary-stat .stat-label {
      display: block;
      font-size: 0.85rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .show-more-section {
      margin-top: 2rem;
      text-align: center;
      padding: 1.5rem;
      background: var(--background-lighter);
      border-radius: 8px;
    }

    .total-users {
      margin: 0 0 1rem 0;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .show-more-btn {
      padding: 0.75rem 2rem;
      background: var(--primary);
      color: var(--primary-text);
      border: none;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .show-more-btn:hover {
      background: var(--primary-dark);
      transform: translateY(-1px);
    }

    .empty-actions {
      margin-top: 1.5rem;
    }

    .action-button {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem 2rem;
      background: var(--primary);
      color: var(--primary-text);
      border: none;
      border-radius: 12px;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .action-button:hover {
      background: var(--primary-dark);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    }

    .icon {
      font-size: 1.2rem;
    }

    /* Custom styles for regional columns */
    :host ::ng-deep .user-cell {
      text-align: left !important;
    }

    :host ::ng-deep th.user-cell .header-content {
      justify-content: flex-start !important;
    }

    :host ::ng-deep .points-primary {
      color: var(--primary);
      font-weight: 600;
    }

    :host ::ng-deep .pubs-primary {
      // color: var(--secondary);
      font-weight: 600;
    }

    :host ::ng-deep .region-info {
      color: var(--text-secondary);
      font-size: 0.85rem;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .regional-leaderboard {
        padding: 0.5rem;
      }

      .region-controls {
        flex-direction: column;
        gap: 1rem;
        padding: 1rem;
      }

      .region-selector {
        flex-direction: column;
        gap: 0.5rem;
        width: 100%;
      }

      .region-select {
        width: 100%;
        min-width: unset;
      }

      .summary-stats {
        grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
        gap: 1rem;
      }

      .summary-stat .stat-value {
        font-size: 1.5rem;
      }

      .region-summary {
        padding: 1rem;
      }
    }
  `,
})
export class RegionalLeaderboardComponent extends BaseComponent {
  protected readonly store = inject(LeaderboardStore);

  // Local state for region selection and display
  private readonly _selectedRegion = signal<string>('');
  private readonly _displayLimit = signal(50);

  // Set scope to regional when component loads
  constructor() {
    super();
    this.store.setScope('regional');
  }

  // Computed properties for template
  readonly regionalEntries = this.store.regionalEntries;
  readonly currentUserPosition = this.store.currentUserPosition;
  readonly selectedRegion = this._selectedRegion.asReadonly();

  // Available regions from all users
  readonly availableRegions = computed(() => {
    const allEntries = this.store.leaderboardEntries();
    const regions = new Set<string>();

    allEntries.forEach(entry => {
      if (entry.region) regions.add(entry.region);
      if (entry.country) regions.add(entry.country);
    });

    return Array.from(regions).sort();
  });

  // Display entries with limit
  readonly displayEntries = computed(() => {
    return this.regionalEntries().slice(0, this._displayLimit());
  });

  // Computed stats for regional summary
  readonly totalPoints = computed(() => {
    return this.regionalEntries().reduce(
      (sum: number, entry: LeaderboardEntry) => sum + entry.totalPoints,
      0
    );
  });

  readonly totalPubs = computed(() => {
    // Note: This sums all unique pubs per user, which may have overlap between users
    // For true unique pubs across all users, we'd need pub IDs from entries
    return this.regionalEntries().reduce(
      (sum: number, entry: LeaderboardEntry) => sum + entry.uniquePubs,
      0
    );
  });

  // Regional columns with location info
  readonly regionalColumns: TableColumn[] = [
    {
      key: 'rank',
      label: 'Rank',
      className: 'rank',
      width: '80px',
      formatter: (rank: number) => `#${rank}`,
      sortable: false,
    },
    {
      key: 'displayName',
      label: 'User',
      className: 'user-cell',
      renderer: () => '', // Function to trigger ChipUser rendering
    },
    {
      key: 'totalPoints',
      label: 'Points',
      className: 'points-primary',
      width: '120px',
      formatter: (points: number) => points.toLocaleString(),
      sortable: true,
    },
    {
      key: 'uniquePubs',
      label: 'Pubs',
      className: 'pubs-primary',
      width: '100px',
      formatter: (pubs: number) => pubs.toString(),
      sortable: true,
    },
    {
      key: 'region',
      label: 'Location',
      className: 'region-info',
      width: '140px',
      hideOnMobile: true,
      formatter: (region: string, entry: LeaderboardEntry) => {
        return entry.region || entry.country || 'Unknown';
      },
      sortable: false,
    },
    {
      key: 'lastActive',
      label: 'Last Active',
      className: 'last-active',
      width: '140px',
      hideOnMobile: true,
      formatter: (lastActive: string) => (lastActive ? formatLastActive(lastActive) : 'Never'),
      sortable: false,
    },
  ];

  // Event handlers
  onRegionChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const region = target.value;

    console.log('[RegionalLeaderboard] Region changed to:', region);
    this._selectedRegion.set(region);
    this.store.setSelectedRegion(region || null);
    this._displayLimit.set(50); // Reset display limit when region changes
  }

  showAllRegions(): void {
    console.log('[RegionalLeaderboard] Showing all regions');
    this._selectedRegion.set('');
    this.store.setSelectedRegion(null);
  }

  loadMore(): void {
    console.log('[RegionalLeaderboard] Load more users requested');
    this._displayLimit.update(current => current + 50);
  }

  // DataTable helper methods
  readonly isCurrentUser = (entry: LeaderboardEntry): boolean => {
    return entry.isCurrentUser === true;
  };

  readonly navigateToProfile = (entry: LeaderboardEntry): void => {
    console.log('[RegionalLeaderboard] Navigating to profile:', entry.displayName);
    this.router.navigate(['/users', entry.displayName]);
  };

  async handleRetry(): Promise<void> {
    await this.handleAsync(() => this.store.refresh(), {
      successMessage: 'Regional leaderboard refreshed!',
      errorMessage: 'Failed to refresh regional leaderboard',
    });
  }
}
