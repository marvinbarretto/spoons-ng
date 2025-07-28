import { Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import {
  EmptyStateComponent,
  ErrorStateComponent,
  LoadingStateComponent,
} from '@fourfold/angular-foundation';
import { BaseComponent } from '../../../shared/base/base.component';
import { ChipUserComponent } from '../../../shared/ui/chips/chip-user/chip-user.component';
import { TabGroupComponent, type Tab } from '../../../shared/ui/tabs';
import { LeaderboardStore } from '../../data-access/leaderboard.store';

@Component({
  selector: 'app-leaderboard-container',
  imports: [
    LoadingStateComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    ChipUserComponent,
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
                <div class="table-row" [class.current-user]="entry.isCurrentUser">
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
              <!-- Pubs League Table -->
              <div class="table-header">
                <span class="col-rank">Rank</span>
                <span class="col-user">User</span>
                <span class="col-metric">Pubs</span>
                <span class="col-extra">Check-ins</span>
              </div>

              @for (entry of topEntries(); track entry.userId) {
                <div class="table-row" [class.current-user]="entry.isCurrentUser">
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

  async handleRetry(): Promise<void> {
    await this.handleAsync(() => this.store.refresh(), {
      successMessage: 'Leaderboard refreshed!',
      errorMessage: 'Failed to refresh leaderboard',
    });
  }
}
