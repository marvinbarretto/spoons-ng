import { Component, inject } from '@angular/core';

import {
  EmptyStateComponent,
  ErrorStateComponent,
  LoadingStateComponent,
} from '@fourfold/angular-foundation';
import { BaseComponent } from '../../../shared/base/base.component';
import { ChipUserComponent } from '../../../shared/ui/chips/chip-user/chip-user.component';
import { LeaderboardStore } from '../../data-access/leaderboard.store';
import { LeaderboardPeriod, LeaderboardSortBy } from '../../utils/leaderboard.models';

@Component({
  selector: 'app-leaderboard-container',
  imports: [LoadingStateComponent, ErrorStateComponent, EmptyStateComponent, ChipUserComponent],
  template: `
    <div class="leaderboard">
      <header class="leaderboard-header">
        <h1>🏆 Real User Leaderboard</h1>
        <p>See how you rank against real users (including anonymous accounts)</p>
      </header>

      <!-- Controls -->
      <div class="leaderboard-controls">
        <div class="sort-controls">
          <span class="control-label">Sort by:</span>
          <div class="sort-buttons">
            <button
              [class.active]="store.sortBy() === 'points'"
              (click)="setSortBy('points')"
              class="sort-btn"
            >
              Points
            </button>
            <button
              [class.active]="store.sortBy() === 'pubs'"
              (click)="setSortBy('pubs')"
              class="sort-btn"
            >
              Pubs
            </button>
            <button
              [class.active]="store.sortBy() === 'checkins'"
              (click)="setSortBy('checkins')"
              class="sort-btn"
            >
              Check-ins
            </button>
          </div>
        </div>

        <div class="period-controls">
          <span class="control-label">Period:</span>
          <div class="period-buttons">
            <button
              [class.active]="store.period() === 'all-time'"
              (click)="setPeriod('all-time')"
              class="period-btn"
            >
              All Time
            </button>
            <button
              [class.active]="store.period() === 'monthly'"
              (click)="setPeriod('monthly')"
              class="period-btn"
            >
              This Month
            </button>
          </div>
        </div>

        <div class="filter-controls">
          <label class="filter-toggle">
            <input
              type="checkbox"
              [checked]="store.showRealUsersOnly()"
              (change)="toggleRealUsersOnly($event)"
            />
            <span>Real users only</span>
          </label>
        </div>
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
          <div class="table-header">
            <span class="col-rank">Rank</span>
            <span class="col-user">User</span>
            <span class="col-points">Points</span>
            <span class="col-pubs">Pubs</span>
            <span class="col-details">Details</span>
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

              <span class="col-points">
                <span class="metric-value">{{ getPoints(entry) }}</span>
              </span>

              <span class="col-pubs">
                <span class="metric-value">{{ getPubs(entry) }}</span>
              </span>

              <span class="col-details">
                <div class="detail-group">
                  <span class="detail">{{ getCheckins(entry) }} check-ins</span>
                  @if (entry.currentStreak && entry.currentStreak > 1) {
                    <span class="detail streak">🔥 {{ entry.currentStreak }} day streak</span>
                  }
                </div>
              </span>
            </div>
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

    .leaderboard-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .leaderboard-header h1 {
      margin: 0 0 0.5rem;
      color: var(--text);
      font-size: clamp(1.5rem, 4vw, 2.5rem);
    }

    .leaderboard-header p {
      margin: 0;
      color: var(--text-secondary);
      font-size: 1rem;
    }

    .leaderboard-controls {
      display: flex;
      flex-wrap: wrap;
      gap: 1.5rem;
      margin-bottom: 2rem;
      padding: 1rem;
      background: var(--background-lighter);
      border-radius: 8px;
      align-items: center;
    }

    .sort-controls {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .control-label {
      color: var(--text-secondary);
      font-weight: 500;
    }

    .sort-buttons,
    .period-buttons {
      display: flex;
      gap: 0.25rem;
      background: var(--background);
      padding: 0.25rem;
      border-radius: 6px;
      border: 1px solid var(--border);
    }

    .sort-btn,
    .period-btn {
      padding: 0.5rem 1rem;
      border: none;
      background: transparent;
      color: var(--text-secondary);
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 0.9rem;
      font-weight: 500;
    }

    .sort-btn:hover,
    .period-btn:hover {
      background: var(--background-lighter);
      color: var(--text);
    }

    .sort-btn.active,
    .period-btn.active {
      background: var(--primary);
      color: var(--primary-contrast);
    }

    .period-controls {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .filter-controls {
      margin-left: auto;
    }

    .filter-toggle {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .filter-toggle input[type='checkbox'] {
      margin: 0;
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
      grid-template-columns: 80px 1fr 120px 100px 180px;
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
      grid-template-columns: 80px 1fr 120px 100px 180px;
      gap: 1rem;
      padding: 1rem;
      border-bottom: 1px solid var(--border);
      align-items: center;
      transition: background-color 0.2s ease;
    }

    .table-row:hover {
      background: var(--background);
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

    .detail.streak {
      color: var(--warning);
      font-weight: 500;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .leaderboard {
        padding: 0.5rem;
      }

      .leaderboard-controls {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
      }

      .filter-controls {
        margin-left: 0;
      }

      .table-header,
      .table-row {
        grid-template-columns: 60px 1fr 80px 60px;
        gap: 0.5rem;
      }

      .col-details {
        display: none;
      }

      .col-points,
      .col-pubs {
        text-align: right;
      }

      .metric-value {
        font-size: 1rem;
      }
    }

    @media (max-width: 480px) {
      .sort-buttons,
      .period-buttons {
        flex-direction: column;
        width: 100%;
      }

      .sort-btn,
      .period-btn {
        text-align: center;
      }

      .table-header,
      .table-row {
        grid-template-columns: 50px 1fr 60px;
        gap: 0.25rem;
      }

      .col-pubs {
        display: none;
      }
    }
  `,
})
export class LeaderboardContainerComponent extends BaseComponent {
  protected readonly store = inject(LeaderboardStore);

  // Computed properties for template
  readonly topEntries = this.store.topEntries;
  readonly currentUserPosition = this.store.currentUserPosition;

  setSortBy(sortBy: LeaderboardSortBy): void {
    this.store.setSortBy(sortBy);
  }

  setPeriod(period: LeaderboardPeriod): void {
    this.store.setPeriod(period);
  }

  toggleRealUsersOnly(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    this.store.setShowRealUsersOnly(checkbox.checked);
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
