import { Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import {
  EmptyStateComponent,
  ErrorStateComponent,
  LoadingStateComponent,
} from '@fourfold/angular-foundation';
import { BaseComponent } from '@shared/base/base.component';
import { ChipUserComponent } from '@shared/ui/chips/chip-user/chip-user.component';
import { DataTableComponent } from '@shared/ui/data-table/data-table.component';
import { type TableColumn } from '@shared/ui/data-table/data-table.model';
import { TabGroupComponent, type Tab } from '@shared/ui/tabs';
import { LeaderboardStore } from '../../data-access/leaderboard.store';
import { type LeaderboardEntry } from '../../utils/leaderboard.models';

@Component({
  selector: 'app-leaderboard-container',
  imports: [
    LoadingStateComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    ChipUserComponent,
    DataTableComponent,
    TabGroupComponent,
  ],
  template: `
    <div class="leaderboard">
      <!-- Tab Navigation -->
      <ff-tab-group
        [tabs]="leaderboardTabs"
        [selectedTab]="currentTab()"
        (tabChange)="setTab($event)"
      >
        <!-- Current User Position -->
        @if (currentUserPosition() && currentUserPosition()! > 100) {
          <div class="user-position-banner">
            <p>
              Your position: <strong>#{{ currentUserPosition() }}</strong>
            </p>
          </div>
        }

        <!-- Loading State -->
        @if (store.loading()) {
          <ff-loading-state text="Loading leaderboard..." />
        } @else if (store.error()) {
          <!-- Error State -->
          <ff-error-state
            [message]="store.error()!"
            [showRetry]="true"
            retryText="Try Again"
            (retry)="handleRetry()"
          />
        } @else if (topEntries().length === 0) {
          <!-- Empty State -->
          <ff-empty-state icon="🏆" title="No users found" subtitle="Try adjusting your filters" />
        } @else {
          <!-- Leaderboard Table -->
          <app-data-table
            [data]="topEntries()"
            [columns]="currentTab() === 'points' ? pointsColumns : pubsColumns"
            [loading]="store.loading()"
            [trackBy]="'userId'"
            [highlightRow]="isCurrentUser"
            [onRowClick]="navigateToProfile"
          />
        }
      </ff-tab-group>
    </div>
  `,
  styles: `
    .leaderboard {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1rem;
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
    }

    /* Custom styles for DataTable integration */
    .streak {
      color: var(--warning);
      font-weight: 500;
    }

    // TODO: Remove these deprecated ng-deep references
    :host ::ng-deep .user-cell {
      text-align: left !important;
    }

    :host ::ng-deep th.user-cell .header-content {
      justify-content: flex-start !important;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .leaderboard {
        padding: 0.5rem;
      }
    }
  `,
})
export class LeaderboardContainerComponent extends BaseComponent {
  protected readonly store = inject(LeaderboardStore);
  private readonly route = inject(ActivatedRoute);

  // Route-synced tab state
  private readonly routeUrl = toSignal(this.route.url, { initialValue: [] });
  readonly currentTab = signal<'points' | 'pubs'>('points');

  // Tab configuration
  readonly leaderboardTabs: Tab[] = [
    {
      id: 'points',
      label: 'Points League',
      icon: '🏆',
    },
    {
      id: 'pubs',
      label: 'Pubs League',
      icon: '🎺',
    },
  ];

  // Points League table columns
  readonly pointsColumns: TableColumn[] = [
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
      renderer: () => '',  // Function to trigger ChipUser rendering
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
      key: 'currentStreak',
      label: 'Streak',
      className: 'streak',
      width: '150px',
      hideOnMobile: true,
      formatter: (streak: number) => (streak && streak > 1 ? `🔥 ${streak} day streak` : '-'),
      sortable: false,
    },
  ];

  // Pubs League table columns
  readonly pubsColumns: TableColumn[] = [
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
      renderer: () => '',  // Function to trigger ChipUser rendering
    },
    {
      key: 'uniquePubs',
      label: 'Pubs',
      className: 'points-primary',
      width: '120px',
      formatter: (pubs: number) => pubs.toString(),
      sortable: true,
    },
    {
      key: 'totalCheckins',
      label: 'Check-ins',
      className: 'number',
      width: '150px',
      hideOnMobile: true,
      formatter: (checkins: number) => `${checkins} check-ins`,
      sortable: false,
    },
  ];

  // Computed properties for template
  readonly topEntries = this.store.topEntries;
  readonly currentUserPosition = this.store.currentUserPosition;

  constructor() {
    super();

    // Sync tab state with current route
    effect(() => {
      const urlSegments = this.routeUrl();
      const lastSegment = urlSegments[urlSegments.length - 1]?.path;

      if (lastSegment === 'points' || lastSegment === 'pubs') {
        this.currentTab.set(lastSegment);
      }
    });

    // React to tab changes and update store sorting
    effect(() => {
      const tabType = this.currentTab();
      if (tabType === 'points') {
        this.store.setSortBy('points');
      } else if (tabType === 'pubs') {
        this.store.setSortBy('pubs');
      }
    });
  }

  setTab(tab: string): void {
    if (tab === 'points' || tab === 'pubs') {
      // Navigate to the new route - this will trigger the route sync effect
      this.router.navigate(['/leaderboard', tab]);
    }
  }

  // DataTable helper methods
  readonly isCurrentUser = (entry: LeaderboardEntry): boolean => {
    return entry.isCurrentUser === true;
  };

  readonly navigateToProfile = (entry: LeaderboardEntry): void => {
    // Navigate to user profile - using query param to identify specific user
    this.router.navigate(['/profile'], { queryParams: { user: entry.userId } });
  };

  getPoints(entry: LeaderboardEntry): string {
    const period = this.store.period();
    const points = period === 'monthly' ? entry.monthlyPoints : entry.totalPoints;
    return points.toLocaleString();
  }

  getPubs(entry: LeaderboardEntry): string {
    const period = this.store.period();
    const pubs = period === 'monthly' ? entry.monthlyPubs : entry.uniquePubs;
    return pubs.toString();
  }

  getCheckins(entry: LeaderboardEntry): string {
    const period = this.store.period();
    const checkins = period === 'monthly' ? entry.monthlyCheckins : entry.totalCheckins;
    return checkins.toString();
  }

  async handleRetry(): Promise<void> {
    await this.handleAsync(() => this.store.refresh(), {
      successMessage: 'Leaderboard refreshed!',
      errorMessage: 'Failed to refresh leaderboard',
    });
  }
}
