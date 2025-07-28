import { Component, effect, inject, signal } from '@angular/core';

import {
  EmptyStateComponent,
  ErrorStateComponent,
  LoadingStateComponent,
} from '@fourfold/angular-foundation';
import { BaseComponent } from '../../../shared/base/base.component';
import { ChipUserComponent } from '../../../shared/ui/chips/chip-user/chip-user.component';
import { LeaderboardStore } from '../../data-access/leaderboard.store';

@Component({
  selector: 'app-leaderboard-container',
  imports: [LoadingStateComponent, ErrorStateComponent, EmptyStateComponent, ChipUserComponent],
  template: `
    <div class="leaderboard">
      <!-- Tab Navigation -->
      <div class="leaderboard-tabs">
        <button class="tab" [class.active]="currentTab() === 'points'" (click)="setTab('points')">
          🏆 Points League
        </button>
        <button
          class="tab"
          [class.active]="currentTab() === 'pub-count'"
          (click)="setTab('pub-count')"
        >
          🎺 Pub Count League
        </button>
      </div>

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
        <div class="leaderboard-table">
          @if (currentTab() === 'points') {
            <!-- Points League Table -->
            <div class="table-header">
              <span class="col-rank">Rank</span>
              <span class="col-user">User</span>
              <span class="col-metric">Points</span>
              <span class="col-extra">Streak</span>
            </div>

            @for (entry of topEntries(); track entry.userId) {
              <div
                class="table-row"
                [class.current-user]="entry.isCurrentUser"
                (click)="navigateToProfile(entry.userId)"
              >
                <span class="col-rank">
                  <span class="rank-number">#{{ entry.rank }}</span>
                </span>

                <span class="col-user">
                  <app-chip-user
                    [user]="{
                      displayName: entry.displayName,
                      photoURL: entry.photoURL || undefined,
                    }"
                    [clickable]="false"
                  />
                  @if (entry.isCurrentUser) {
                    <span class="current-user-badge">You</span>
                  }
                </span>

                <span class="col-metric">
                  <span class="metric-value">{{ getPoints(entry) }}</span>
                </span>

                <span class="col-extra">
                  @if (entry.currentStreak && entry.currentStreak > 1) {
                    <span class="streak-badge">🔥 {{ entry.currentStreak }} day streak</span>
                  } @else {
                    <span class="no-streak">-</span>
                  }
                </span>
              </div>
            }
          } @else {
            <!-- Pub Count League Table -->
            <div class="table-header">
              <span class="col-rank">Rank</span>
              <span class="col-user">User</span>
              <span class="col-metric">Pubs</span>
              <span class="col-extra">Check-ins</span>
            </div>

            @for (entry of topEntries(); track entry.userId) {
              <div
                class="table-row"
                [class.current-user]="entry.isCurrentUser"
                (click)="navigateToProfile(entry.userId)"
              >
                <span class="col-rank">
                  <span class="rank-number">#{{ entry.rank }}</span>
                </span>

                <span class="col-user">
                  <app-chip-user
                    [user]="{
                      displayName: entry.displayName,
                      photoURL: entry.photoURL || undefined,
                    }"
                    [clickable]="false"
                  />
                  @if (entry.isCurrentUser) {
                    <span class="current-user-badge">You</span>
                  }
                </span>

                <span class="col-metric">
                  <span class="metric-value">{{ getPubs(entry) }}</span>
                </span>

                <span class="col-extra">
                  <span class="checkins-count">{{ getCheckins(entry) }} check-ins</span>
                </span>
              </div>
            }
          }
        </div>
      }
    </div>
  `,
  styles: `
    .leaderboard {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1rem;
    }

    .leaderboard-tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 2rem;
      border-bottom: 2px solid var(--border);
    }

    .tab {
      padding: 1rem 1.5rem;
      border: none;
      background: none;
      color: var(--text-secondary);
      font-weight: 500;
      border-bottom: 2px solid transparent;
      transition: all 0.2s ease;
      cursor: pointer;
      font-size: 1rem;
    }

    .tab:hover {
      color: var(--text);
      background: var(--background-lighter);
    }

    .tab.active {
      color: var(--primary);
      border-bottom-color: var(--primary);
      background: var(--background-lighter);
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

    .leaderboard-table {
      background: var(--background-lighter);
      border-radius: 8px;
      overflow: hidden;
    }

    .table-header {
      display: grid;
      grid-template-columns: 80px 1fr 120px 150px;
      gap: 1rem;
      padding: 1rem;
      background: var(--background-darker);
      font-weight: 600;
      color: var(--text-secondary);
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .table-row {
      display: grid;
      grid-template-columns: 80px 1fr 120px 150px;
      gap: 1rem;
      padding: 1rem;
      border-bottom: 1px solid var(--border);
      align-items: center;
      transition: all 0.2s ease;
      cursor: pointer;
    }

    .table-row:hover {
      background: var(--background-lighter);
      transform: scale(1.01);
    }

    .table-row.current-user {
      background: var(--primary);
      color: var(--primary-contrast);
    }

    .table-row.current-user:hover {
      background: var(--primary-hover);
    }

    .rank-number {
      font-weight: 600;
      font-size: 1.1rem;
    }

    .col-user {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .current-user-badge {
      background: var(--accent);
      color: var(--accent-contrast);
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .metric-value {
      font-weight: 600;
      font-size: 1.1rem;
      color: var(--text);
    }

    .detail-group {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .detail {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .streak-badge {
      color: var(--warning);
      font-weight: 500;
      font-size: 0.85rem;
    }

    .no-streak {
      color: var(--text-muted);
      font-size: 0.9rem;
    }

    .checkins-count {
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .leaderboard {
        padding: 0.5rem;
      }

      .leaderboard-tabs {
        margin-bottom: 1rem;
      }

      .tab {
        padding: 0.75rem 1rem;
        font-size: 0.9rem;
      }

      .table-header,
      .table-row {
        grid-template-columns: 60px 1fr 80px;
        gap: 0.5rem;
      }

      .col-extra {
        display: none;
      }

      .col-metric {
        text-align: right;
      }

      .metric-value {
        font-size: 1rem;
      }
    }

    @media (max-width: 480px) {
      .table-header,
      .table-row {
        grid-template-columns: 50px 1fr 60px;
        gap: 0.25rem;
      }

      .col-extra {
        display: none;
      }
    }
  `,
})
export class LeaderboardContainerComponent extends BaseComponent {
  protected readonly store = inject(LeaderboardStore);

  // Simple local state for tabs
  readonly currentTab = signal<'points' | 'pub-count'>('points');

  // Computed properties for template
  readonly topEntries = this.store.topEntries;
  readonly currentUserPosition = this.store.currentUserPosition;

  constructor() {
    super();

    // React to tab changes and update store sorting
    effect(() => {
      const tabType = this.currentTab();
      if (tabType === 'points') {
        this.store.setSortBy('points');
      } else if (tabType === 'pub-count') {
        this.store.setSortBy('pubs');
      }
    });
  }

  setTab(tab: 'points' | 'pub-count'): void {
    this.currentTab.set(tab);
  }

  getPoints(entry: any): string {
    const period = this.store.period();
    const points = period === 'monthly' ? entry.monthlyPoints : entry.totalPoints;
    return points.toLocaleString();
  }

  getPubs(entry: any): string {
    const period = this.store.period();
    const pubs = period === 'monthly' ? entry.monthlyPubs : entry.uniquePubs;
    return pubs.toString();
  }

  getCheckins(entry: any): string {
    const period = this.store.period();
    const checkins = period === 'monthly' ? entry.monthlyCheckins : entry.totalCheckins;
    return checkins.toString();
  }

  navigateToProfile(userId: string): void {
    // Navigate to user profile - using query param to identify specific user
    this.router.navigate(['/profile'], { queryParams: { user: userId } });
  }

  async handleRetry(): Promise<void> {
    await this.handleAsync(() => this.store.refresh(), {
      successMessage: 'Leaderboard refreshed!',
      errorMessage: 'Failed to refresh leaderboard',
    });
  }
}
