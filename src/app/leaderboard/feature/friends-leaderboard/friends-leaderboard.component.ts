import { Component, inject } from '@angular/core';

import {
  EmptyStateComponent,
  ErrorStateComponent,
  LoadingStateComponent,
} from '@fourfold/angular-foundation';
import { BaseComponent } from '@shared/base/base.component';
import { ChipUserComponent } from '@shared/ui/chips/chip-user/chip-user.component';
import { formatLastActive } from '@shared/utils/date-formatting.utils';
import { LeaderboardStore } from '../../data-access/leaderboard.store';
import { type LeaderboardEntry } from '../../utils/leaderboard.models';

@Component({
  selector: 'app-friends-leaderboard',
  imports: [LoadingStateComponent, ErrorStateComponent, EmptyStateComponent, ChipUserComponent],
  template: `
    <div class="friends-leaderboard">
      @if (store.loading()) {
        <ff-loading-state text="Loading friends leaderboard..." />
      } @else if (store.error()) {
        <ff-error-state
          [message]="store.error()!"
          [showRetry]="true"
          retryText="Try Again"
          (retry)="handleRetry()"
        />
      } @else if (friendsEntries().length === 0) {
        <ff-empty-state
          icon="👥"
          title="No friends found"
          subtitle="Add friends to see them on your leaderboard"
        >
          <div class="empty-actions">
            <button class="action-button" (click)="inviteFriends()">
              <span class="icon">➕</span>
              Invite Friends
            </button>
          </div>
        </ff-empty-state>
      } @else {
        <!-- Current User Position Banner -->
        @if (currentUserPosition() && currentUserPosition()! > 10) {
          <div class="user-position-banner">
            <p>
              Your position among friends: <strong>#{{ currentUserPosition() }}</strong>
            </p>
          </div>
        }

        <!-- Friends Grid -->
        <div class="friends-grid">
          @for (entry of friendsEntries(); track entry.userId) {
            <div
              class="friend-card"
              [class.current-user]="entry.isCurrentUser"
              (click)="navigateToProfile(entry)"
            >
              <!-- Rank Badge -->
              <div class="rank-badge">
                <span class="rank">#{{ entry.rank }}</span>
              </div>

              <!-- Large Avatar -->
              <div class="avatar-container">
                <app-chip-user
                  [user]="{
                    displayName: entry.displayName,
                    photoURL: entry.photoURL || undefined,
                  }"
                  [size]="'lg'"
                  [showName]="false"
                />
                @if (entry.currentStreak && entry.currentStreak > 1) {
                  <div class="streak-indicator">🔥{{ entry.currentStreak }}</div>
                }
              </div>

              <!-- User Info -->
              <div class="user-info">
                <h3 class="user-name">{{ entry.displayName }}</h3>
                @if (entry.lastActive) {
                  <p class="last-active">Last active: {{ formatLastActive(entry.lastActive) }}</p>
                }
              </div>

              <!-- Stats -->
              <div class="stats-grid">
                <div class="stat">
                  <span class="stat-value">{{ entry.totalPoints.toLocaleString() }}</span>
                  <span class="stat-label">Points</span>
                </div>
                <div class="stat">
                  <span class="stat-value">{{ entry.uniquePubs }}</span>
                  <span class="stat-label">Pubs</span>
                </div>
              </div>

              <!-- Action Button -->
              <div class="card-actions">
                <button
                  class="view-profile-btn"
                  (click)="navigateToProfile(entry); $event.stopPropagation()"
                >
                  View Profile
                </button>
              </div>
            </div>
          }
        </div>

        <!-- Add More Friends CTA -->
        <div class="add-friends-cta">
          <button class="invite-button" (click)="inviteFriends()">
            <span class="icon">➕</span>
            Invite More Friends
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .friends-leaderboard {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1rem;
    }

    .user-position-banner {
      margin-bottom: 2rem;
      padding: 1rem;
      background: var(--background-lighter);
      border-radius: 12px;
      text-align: center;
      border: 2px solid var(--primary);
    }

    .user-position-banner p {
      margin: 0;
      color: var(--text);
      font-weight: 500;
    }

    .friends-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .friend-card {
      background: var(--background-lighter);
      border-radius: 16px;
      padding: 1.5rem;
      text-align: center;
      position: relative;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border: 2px solid transparent;
    }

    .friend-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      border-color: var(--primary-light);
    }

    .friend-card.current-user {
      border-color: var(--primary);
      background: var(--primary-background);
    }

    .rank-badge {
      position: absolute;
      top: -8px;
      right: -8px;
      background: var(--primary);
      color: var(--primary-text);
      padding: 0.5rem 0.75rem;
      border-radius: 20px;
      font-weight: 600;
      font-size: 0.9rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .avatar-container {
      position: relative;
      margin-bottom: 1rem;
      display: inline-block;
    }

    .streak-indicator {
      position: absolute;
      bottom: -4px;
      right: -4px;
      background: var(--warning);
      color: var(--warning-text);
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .user-info {
      margin-bottom: 1.5rem;
    }

    .user-name {
      margin: 0 0 0.5rem 0;
      font-size: 1.2rem;
      font-weight: 600;
      color: var(--text);
    }

    .last-active {
      margin: 0;
      font-size: 0.9rem;
      color: var(--text-secondary);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .stat {
      text-align: center;
    }

    .stat-value {
      display: block;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 0.25rem;
    }

    .stat-label {
      display: block;
      font-size: 0.85rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .card-actions {
      margin-top: auto;
    }

    .view-profile-btn {
      width: 100%;
      padding: 0.75rem 1rem;
      background: var(--primary);
      color: var(--primary-text);
      border: none;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .view-profile-btn:hover {
      background: var(--primary-dark);
      transform: translateY(-1px);
    }

    .empty-actions,
    .add-friends-cta {
      text-align: center;
      margin-top: 2rem;
    }

    .action-button,
    .invite-button {
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

    .action-button:hover,
    .invite-button:hover {
      background: var(--primary-dark);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    }

    .icon {
      font-size: 1.2rem;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .friends-leaderboard {
        padding: 0.5rem;
      }

      .friends-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
      }

      .friend-card {
        padding: 1rem;
      }

      .user-name {
        font-size: 1.1rem;
      }

      .stat-value {
        font-size: 1.3rem;
      }
    }

    @media (max-width: 480px) {
      .stats-grid {
        gap: 0.5rem;
      }

      .stat-value {
        font-size: 1.2rem;
      }

      .view-profile-btn {
        padding: 0.5rem 0.75rem;
        font-size: 0.9rem;
      }
    }
  `,
})
export class FriendsLeaderboardComponent extends BaseComponent {
  protected readonly store = inject(LeaderboardStore);

  // Set scope to friends when component loads
  constructor() {
    super();
    this.store.setScope('friends');
  }

  // Computed properties for template
  readonly friendsEntries = this.store.friendsEntries;
  readonly currentUserPosition = this.store.currentUserPosition;

  // Expose utility function for template
  readonly formatLastActive = formatLastActive;

  // Helper methods
  navigateToProfile(entry: LeaderboardEntry): void {
    console.log('[FriendsLeaderboard] Navigating to profile:', entry.displayName);
    this.router.navigate(['/users', entry.displayName]);
  }

  inviteFriends(): void {
    console.log('[FriendsLeaderboard] Invite friends action triggered');
    // TODO: Implement friend invitation system
    // Could open a share modal, show invite codes, or navigate to friends management
  }

  async handleRetry(): Promise<void> {
    await this.handleAsync(() => this.store.refresh(), {
      successMessage: 'Friends leaderboard refreshed!',
      errorMessage: 'Failed to refresh friends leaderboard',
    });
  }
}
