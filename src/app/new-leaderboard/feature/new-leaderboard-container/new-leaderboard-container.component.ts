import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../shared/base/base.component';
import { NewLeaderboardStore } from '../../data-access/new-leaderboard.store';
import { LoadingStateComponent } from '../../../shared/ui/loading-state/loading-state.component';
import { ErrorStateComponent } from '../../../shared/ui/error-state/error-state.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { ChipUserComponent } from '../../../shared/ui/chips/chip-user/chip-user.component';
import { NewLeaderboardSortBy } from '../../utils/new-leaderboard.models';

@Component({
  selector: 'app-new-leaderboard-container',
  imports: [
    CommonModule,
    LoadingStateComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    ChipUserComponent
  ],
  template: `
    <div class="new-leaderboard">
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
          <p>Your position: <strong>#{{ currentUserPosition() }}</strong></p>
        </div>
      }

      <!-- Loading State -->
      @if (store.loading()) {
        <app-loading-state text="Loading leaderboard..." />
      } @else if (store.error()) {
        <!-- Error State -->
        <app-error-state 
          [message]="store.error()!"
          [showRetry]="true"
          retryText="Try Again"
          (retry)="handleRetry()"
        />
      } @else if (topEntries().length === 0) {
        <!-- Empty State -->
        <app-empty-state 
          icon="🏆"
          title="No users found"
          subtitle="Try adjusting your filters"
        />
      } @else {
        <!-- Leaderboard Table -->
        <div class="leaderboard-table">
          <div class="table-header">
            <span class="col-rank">Rank</span>
            <span class="col-user">User</span>
            <span class="col-points">{{ getSortLabel() }}</span>
            <span class="col-stats">Stats</span>
          </div>

          @for (entry of topEntries(); track entry.userId) {
            <div 
              class="table-row"
              [class.current-user]="entry.isCurrentUser"
            >
              <span class="col-rank">
                <span class="rank-number">#{{ entry.rank }}</span>
              </span>
              
              <span class="col-user">
                <app-chip-user
                  [user]="{
                    displayName: entry.displayName,
                    photoURL: entry.photoURL || undefined
                  }"
                  [clickable]="false"
                />
                @if (entry.isCurrentUser) {
                  <span class="current-user-badge">You</span>
                }
              </span>
              
              <span class="col-points">
                <span class="primary-stat">{{ getPrimaryStatValue(entry) }}</span>
              </span>
              
              <span class="col-stats">
                <div class="stat-group">
                  @if (store.sortBy() !== 'points') {
                    <span class="stat">{{ entry.totalPoints.toLocaleString() }} pts</span>
                  }
                  @if (store.sortBy() !== 'pubs') {
                    <span class="stat">{{ entry.uniquePubs }} pubs</span>
                  }
                  @if (store.sortBy() !== 'checkins') {
                    <span class="stat">{{ entry.totalCheckins }} check-ins</span>
                  }
                  @if (entry.currentStreak && entry.currentStreak > 1) {
                    <span class="stat streak">🔥 {{ entry.currentStreak }} day streak</span>
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
    .new-leaderboard {
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

    .sort-buttons {
      display: flex;
      gap: 0.25rem;
      background: var(--background);
      padding: 0.25rem;
      border-radius: 6px;
      border: 1px solid var(--border);
    }

    .sort-btn {
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

    .sort-btn:hover {
      background: var(--background-lighter);
      color: var(--text);
    }

    .sort-btn.active {
      background: var(--primary);
      color: var(--primary-contrast);
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

    .filter-toggle input[type="checkbox"] {
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
      grid-template-columns: 80px 1fr 120px 200px;
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
      grid-template-columns: 80px 1fr 120px 200px;
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

    .primary-stat {
      font-weight: 600;
      font-size: 1.1rem;
    }

    .stat-group {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .stat {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .stat.streak {
      color: var(--warning);
      font-weight: 500;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .new-leaderboard {
        padding: 0.5rem;
      }

      .leaderboard-controls {
        flex-direction: column;
        align-items: stretch;
      }

      .filter-controls {
        margin-left: 0;
      }

      .table-header,
      .table-row {
        grid-template-columns: 60px 1fr 80px;
        gap: 0.5rem;
      }

      .col-stats {
        display: none;
      }

      .col-points {
        text-align: right;
      }
    }

    @media (max-width: 480px) {
      .sort-buttons {
        flex-direction: column;
        width: 100%;
      }

      .sort-btn {
        text-align: center;
      }
    }
  `
})
export class NewLeaderboardContainerComponent extends BaseComponent {
  protected readonly store = inject(NewLeaderboardStore);

  // Computed properties for template
  readonly topEntries = this.store.topEntries;
  readonly currentUserPosition = this.store.currentUserPosition;

  setSortBy(sortBy: NewLeaderboardSortBy): void {
    this.store.setSortBy(sortBy);
  }

  toggleRealUsersOnly(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    this.store.setShowRealUsersOnly(checkbox.checked);
  }

  getSortLabel(): string {
    switch (this.store.sortBy()) {
      case 'points': return 'Points';
      case 'pubs': return 'Pubs';
      case 'checkins': return 'Check-ins';
      default: return 'Score';
    }
  }

  getPrimaryStatValue(entry: any): string {
    switch (this.store.sortBy()) {
      case 'points': return entry.totalPoints.toLocaleString();
      case 'pubs': return entry.uniquePubs.toString();
      case 'checkins': return entry.totalCheckins.toString();
      default: return '0';
    }
  }

  async handleRetry(): Promise<void> {
    await this.handleAsync(
      () => this.store.refresh(),
      {
        successMessage: 'Leaderboard refreshed!',
        errorMessage: 'Failed to refresh leaderboard'
      }
    );
  }
}