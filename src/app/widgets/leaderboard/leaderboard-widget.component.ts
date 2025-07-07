import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { BaseWidgetComponent } from '../base/base-widget.component';
import { LeaderboardStore } from '../../leaderboard/data-access/leaderboard.store';
import { AuthStore } from '../../auth/data-access/auth.store';
import { CommonModule } from '@angular/common';
import { UserAvatarComponent } from '../user-avatar/user-avatar.component';
import { LoadingStateComponent, ErrorStateComponent, EmptyStateComponent } from '../../shared/ui/state-components';
import type { LeaderboardEntry } from '../../leaderboard/utils/leaderboard.models';
import type { User } from '../../users/utils/user.model';

type LeaderboardContextEntry = LeaderboardEntry & {
  position: number;
  isCurrentUser: boolean;
};

@Component({
  selector: 'app-leaderboard-widget',
  imports: [CommonModule, UserAvatarComponent, LoadingStateComponent, ErrorStateComponent, EmptyStateComponent],
  template: `
    <div class="leaderboard-widget">
      <h3 class="widget-title">Your Leaderboard Position</h3>

      @if (leaderboardStore.loading()) {
        <app-loading-state text="Loading rankings..." />
      } @else if (leaderboardStore.error()) {
        <app-error-state [message]="leaderboardStore.error()!" />
      } @else if (!isUserRanked()) {
        <app-empty-state 
          icon="🏆"
          title="Join the Competition!"
          subtitle="Start checking in to pubs to join the leaderboard"
        />
      } @else {
        <div class="leaderboard-list">
          @for (entry of userContext(); track entry.userId) {
            <div class="leaderboard-entry" [class.current-user]="entry.isCurrentUser">
              <span class="rank">{{ '#' + entry.position }}</span>

              <app-user-avatar
                [user]="entryAsUser(entry)"
                size="sm"
                [clickable]="false"
              />

              <div class="user-info">
                <span class="name">{{ entry.displayName }}</span>
                <span class="points">{{ formatPoints(entry.totalPoints) }}</span>
              </div>

              @if (entry.positionChange) {
                <span
                  class="position-change"
                  [class.up]="entry.positionChange > 0"
                  [class.down]="entry.positionChange < 0"
                >
                  {{ entry.positionChange > 0 ? '↑' : '↓' }}{{ abs(entry.positionChange) }}
                </span>
              }
            </div>
          }
        </div>

        <button
          class="view-full-leaderboard"
          (click)="navigateToFullLeaderboard()"
          type="button"
        >
          View Full Leaderboard
        </button>
      }
    </div>
  `,
  styles: [`
    .leaderboard-widget {
      padding: 1rem;
      background: var(--background-lighter);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      box-shadow: var(--shadow);
    }

    .widget-title {
      margin: 0 0 1rem 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text);
    }


    .leaderboard-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .leaderboard-entry {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: var(--background);
      border: 1px solid var(--border-lighter);
      border-radius: 0.375rem;
      transition: all 0.2s ease;
    }

    .leaderboard-entry:hover {
      background: var(--background-lighter);
    }

    .leaderboard-entry.current-user {
      background: var(--accent);
      color: var(--accent-contrast);
      border-color: var(--accent);
      box-shadow: 0 0 0 1px var(--accent);
    }

    .leaderboard-entry.current-user:hover {
      background: var(--accent-hover);
    }

    .rank {
      font-weight: 700;
      font-size: 0.875rem;
      min-width: 2rem;
      text-align: center;
      color: var(--text-secondary);
    }

    .leaderboard-entry.current-user .rank {
      color: var(--accent-contrast);
    }

    .user-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      min-width: 0;
    }

    .name {
      font-weight: 500;
      font-size: 0.875rem;
      color: var(--text);
      truncate: ellipsis;
      overflow: hidden;
      white-space: nowrap;
    }

    .leaderboard-entry.current-user .name {
      color: var(--accent-contrast);
    }

    .points {
      font-size: 0.75rem;
      color: var(--text-secondary);
      font-weight: 600;
    }

    .leaderboard-entry.current-user .points {
      color: var(--accent-contrast);
      opacity: 0.9;
    }

    .position-change {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
      background: var(--background-darker);
      color: var(--text-secondary);
    }

    .position-change.up {
      background: var(--success);
      color: white;
    }

    .position-change.down {
      background: var(--error);
      color: white;
    }

    .leaderboard-entry.current-user .position-change {
      background: var(--accent-contrast);
      color: var(--accent);
    }

    .view-full-leaderboard {
      width: 100%;
      padding: 0.75rem;
      background: var(--secondary);
      color: var(--secondary-contrast);
      border: 1px solid var(--secondary);
      border-radius: 0.375rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .view-full-leaderboard:hover {
      background: var(--secondary-hover);
    }

    .view-full-leaderboard:focus {
      outline: none;
      box-shadow: 0 0 0 2px var(--accent);
    }

    /* Mobile responsive */
    @media (max-width: 640px) {
      .leaderboard-widget {
        padding: 0.75rem;
      }

      .leaderboard-entry {
        padding: 0.5rem;
        gap: 0.5rem;
      }

      .widget-title {
        font-size: 1rem;
      }

      .name {
        font-size: 0.8125rem;
      }

      .points {
        font-size: 0.6875rem;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LeaderboardWidgetComponent extends BaseWidgetComponent {
  // Direct store access for leaderboard-specific concerns
  protected readonly leaderboardStore = inject(LeaderboardStore);
  private readonly authStore = inject(AuthStore);

  constructor() {
    super();
    console.log('[LeaderboardWidget] 🏗️ Component constructed');

    // Add effect to track when topByPoints changes
    effect(() => {
      const topByPoints = this.leaderboardStore.topByPoints();
      console.log('[LeaderboardWidget] 🔄 topByPoints changed:', {
        count: topByPoints.length,
        displayNames: topByPoints.map(u => u.displayName),
        timestamp: new Date().toISOString()
      });
    });
  }

  // Core leaderboard signals
  protected readonly currentUserRank = this.leaderboardStore.userRankByPoints;
  protected readonly isUserRanked = computed(() => this.currentUserRank() !== null);

  // User context algorithm: current user ±2 positions
  protected readonly userContext = computed((): LeaderboardContextEntry[] => {
    const allUsers = this.leaderboardStore.topByPoints();
    const currentUserId = this.authStore.user()?.uid;

    console.log('[LeaderboardWidget] 🔄 userContext computed:', {
      allUsersCount: allUsers.length,
      currentUserId: currentUserId?.slice(0, 8),
      allUserDisplayNames: allUsers.map(u => u.displayName),
      timestamp: new Date().toISOString()
    });

    if (!currentUserId || allUsers.length === 0) {
      console.log('[LeaderboardWidget] ❌ No users or current user - returning empty context');
      return [];
    }

    const userIndex = allUsers.findIndex(u => u.userId === currentUserId);
    if (userIndex === -1) {
      console.log('[LeaderboardWidget] ❌ Current user not found in rankings');
      return []; // User not found in rankings
    }

    // Extract ±2 positions around user
    const start = Math.max(0, userIndex - 2);
    const end = Math.min(allUsers.length, userIndex + 3);

    const context = allUsers.slice(start, end).map((entry, index) => ({
      ...entry,
      position: start + index + 1,
      isCurrentUser: entry.userId === currentUserId
    }));

    console.log('[LeaderboardWidget] ✅ userContext computed result:', {
      contextCount: context.length,
      contextDisplayNames: context.map(c => c.displayName),
      currentUserEntry: context.find(c => c.isCurrentUser)?.displayName
    });

    return context;
  });

  // Utility methods
  protected formatPoints(points: number): string {
    if (points >= 1000) {
      return `${(points / 1000).toFixed(1)}k pts`;
    }
    return `${points} pts`;
  }

  protected abs(num: number): number {
    return Math.abs(num);
  }

  protected entryAsUser(entry: LeaderboardContextEntry): User {
    return {
      uid: entry.userId,
      email: entry.email || null,
      displayName: entry.displayName,
      emailVerified: false, // Not relevant for avatar display
      isAnonymous: entry.isAnonymous || false,
      photoURL: entry.photoURL || null,
      joinedAt: entry.joinedDate,
      streaks: {},
      joinedMissionIds: [],
      badgeCount: 0,
      badgeIds: [],
      landlordCount: 0,
      landlordPubIds: [],
      totalPoints: entry.totalPoints,
      manuallyAddedPubIds: [],
      verifiedPubCount: 0,
      unverifiedPubCount: 0,
      totalPubCount: 0
    };
  }

  protected navigateToFullLeaderboard(): void {
    this.router.navigate(['/leaderboard']);
  }
}
