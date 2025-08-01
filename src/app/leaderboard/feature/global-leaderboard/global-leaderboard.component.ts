import { Component, inject } from '@angular/core';

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
  selector: 'app-global-leaderboard',
  imports: [
    LoadingStateComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    DataTableComponent,
  ],
  template: `
    <div class="global-leaderboard">
      @if (store.loading()) {
        <ff-loading-state text="Loading global leaderboard..." />
      } @else if (store.error()) {
        <ff-error-state
          [message]="store.error()!"
          [showRetry]="true"
          retryText="Try Again"
          (retry)="handleRetry()"
        />
      } @else if (globalEntries().length === 0) {
        <ff-empty-state 
          icon="🏆" 
          title="No users found" 
          subtitle="Check back later as users start checking in" 
        />
      } @else {
        <!-- Current User Position Banner -->
        @if (currentUserPosition() && currentUserPosition()! > 100) {
          <div class="user-position-banner">
            <p>
              Your global position: <strong>#{{ currentUserPosition() }}</strong>
            </p>
          </div>
        }

        <!-- Global Leaderboard Table -->
        <app-data-table
          [data]="topEntries()"
          [columns]="combinedColumns"
          [loading]="store.loading()"
          [trackBy]="'userId'"
          [highlightRow]="isCurrentUser"
          [onRowClick]="navigateToProfile"
        />

        <!-- Show More Button -->
        @if (globalEntries().length > topEntries().length) {
          <div class="show-more-section">
            <p class="total-users">
              Showing top {{ topEntries().length }} of {{ globalEntries().length }} users
            </p>
            <button class="show-more-btn" (click)="loadMore()">
              Show More Users
            </button>
          </div>
        }
      }
    </div>
  `,
  styles: `
    .global-leaderboard {
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
      font-weight: 500;
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

    /* Custom styles for combined columns */
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
      color: var(--secondary);
      font-weight: 600;
    }

    :host ::ng-deep .streak {
      color: var(--warning);
      font-weight: 500;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .global-leaderboard {
        padding: 0.5rem;
      }

      .show-more-section {
        padding: 1rem;
      }

      .show-more-btn {
        padding: 0.5rem 1.5rem;
        font-size: 0.9rem;
      }
    }
  `,
})
export class GlobalLeaderboardComponent extends BaseComponent {
  protected readonly store = inject(LeaderboardStore);

  // Set scope to global when component loads
  constructor() {
    super();
    this.store.setScope('global');
  }

  // Computed properties for template
  readonly globalEntries = this.store.globalEntries;
  readonly topEntries = this.store.topEntries;
  readonly currentUserPosition = this.store.currentUserPosition;

  // Combined columns showing both points and pubs
  readonly combinedColumns: TableColumn[] = [
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
      key: 'currentStreak',
      label: 'Streak',
      className: 'streak',
      width: '120px',
      hideOnMobile: true,
      formatter: (streak: number) => (streak && streak > 1 ? `🔥 ${streak} day streak` : '-'),
      sortable: false,
    },
    {
      key: 'lastActive',
      label: 'Last Active',
      className: 'last-active',
      width: '140px',
      hideOnMobile: true,
      formatter: (lastActive: string) => lastActive ? formatLastActive(lastActive) : 'Never',
      sortable: false,
    },
  ];

  // DataTable helper methods
  readonly isCurrentUser = (entry: LeaderboardEntry): boolean => {
    return entry.isCurrentUser === true;
  };

  readonly navigateToProfile = (entry: LeaderboardEntry): void => {
    console.log('[GlobalLeaderboard] Navigating to profile:', entry.displayName);
    this.router.navigate(['/users', entry.displayName]);
  };

  loadMore(): void {
    console.log('[GlobalLeaderboard] Load more users requested');
    // TODO: Implement pagination or increase visible entries
    // For now, could increase the slice limit in the store
  }

  async handleRetry(): Promise<void> {
    await this.handleAsync(() => this.store.refresh(), {
      successMessage: 'Global leaderboard refreshed!',
      errorMessage: 'Failed to refresh global leaderboard',
    });
  }
}