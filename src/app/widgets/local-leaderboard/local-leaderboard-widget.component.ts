import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { BaseWidgetComponent } from '../base/base-widget.component';
import { LeaderboardStore } from '../../leaderboard/data-access/leaderboard.store';
import { PubGroupingService } from '../../shared/data-access/pub-grouping.service';
import { AuthStore } from '../../auth/data-access/auth.store';
import { CommonModule } from '@angular/common';
import { UserAvatarComponent } from '../user-avatar/user-avatar.component';
import type { LeaderboardEntry } from '../../leaderboard/utils/leaderboard.models';
import type { User } from '../../users/utils/user.model';

type LocalLeaderboardEntry = LeaderboardEntry & {
  position: number;
  isCurrentUser: boolean;
};

@Component({
  selector: 'app-local-leaderboard-widget',
  imports: [CommonModule, UserAvatarComponent],
  template: `
    <div class="local-leaderboard-widget">
      <h3 class="widget-title">
        📍 Local Leaders
        @if (currentUserCity()) {
          <span class="location-badge">{{ currentUserCity() }}</span>
        }
      </h3>

      @if (leaderboardStore.loading()) {
        <div class="widget-loading">
          <span class="loading-spinner"></span>
          <span>Loading local rankings...</span>
        </div>
      } @else if (leaderboardStore.error()) {
        <div class="widget-error">
          <span class="error-icon">⚠️</span>
          <span>{{ leaderboardStore.error() }}</span>
        </div>
      } @else if (!hasLocalData()) {
        <div class="widget-empty">
          <span class="empty-icon">🏘️</span>
          <div class="empty-content">
            <p class="empty-title">No Local Data Yet</p>
            <p class="empty-subtitle">Visit more pubs in your area to see local rankings</p>
          </div>
        </div>
      } @else {
        <div class="local-leaderboard-list">
          @for (entry of localLeaderboard(); track entry.userId) {
            <div class="leaderboard-entry" [class.current-user]="entry.isCurrentUser">
              <span class="rank">{{ '#' + entry.position }}</span>

              <app-user-avatar
                [user]="entryAsUser(entry)"
                size="sm"
                [clickable]="false"
              />

              <div class="user-info">
                <span class="name">{{ entry.displayName }}</span>
                <span class="stats">
                  {{ formatPoints(entry.totalPoints) }} • {{ entry.uniquePubs }} pubs
                </span>
              </div>

              @if (entry.isCurrentUser) {
                <span class="you-indicator">You</span>
              }
            </div>
          }
        </div>

        @if (totalLocalUsers() > localLeaderboard().length) {
          <div class="more-users-indicator">
            +{{ totalLocalUsers() - localLeaderboard().length }} more locals
          </div>
        }

        <button
          class="view-full-local"
          (click)="navigateToLocalLeaderboard()"
          type="button"
        >
          View All Local Leaders
        </button>
      }
    </div>
  `,
  styles: [`
    .local-leaderboard-widget {
      padding: 1rem;
      background: var(--background);
      color: var(--text);
      border: 1px solid var(--color-buttonSecondaryBorder);
      border-radius: 0.5rem;
      box-shadow: var(--shadow);
    }

    .widget-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0 0 1rem 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text);
    }

    .location-badge {
      background: var(--color-buttonPrimaryBase);
      color: var(--color-buttonPrimaryText);
      font-size: 0.75rem;
      font-weight: 500;
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
    }

    .widget-loading,
    .widget-error,
    .widget-empty {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 2rem 1rem;
      justify-content: center;
      color: var(--text-secondary);
    }

    .loading-spinner {
      width: 1rem;
      height: 1rem;
      border: 2px solid currentColor;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .widget-empty {
      flex-direction: column;
      text-align: center;
      gap: 0.5rem;
    }

    .empty-icon {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }

    .empty-content {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .empty-title {
      margin: 0;
      font-weight: 600;
      color: var(--text);
    }

    .empty-subtitle {
      margin: 0;
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .local-leaderboard-list {
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
      background: var(--background-lighter);
      border: 1px solid var(--color-buttonSecondaryBorder);
      border-radius: 0.375rem;
      transition: all 0.2s ease;
    }

    .leaderboard-entry:hover {
      background: var(--background-darker);
    }

    .leaderboard-entry.current-user {
      background: var(--color-buttonPrimaryBase);
      color: var(--color-buttonPrimaryText);
      border-color: var(--color-buttonPrimaryBase);
      box-shadow: 0 0 0 1px var(--color-buttonPrimaryBase);
    }

    .leaderboard-entry.current-user:hover {
      background: var(--color-buttonPrimaryHover);
    }

    .rank {
      font-weight: 700;
      font-size: 0.875rem;
      min-width: 2rem;
      text-align: center;
      color: var(--text-secondary);
    }

    .leaderboard-entry.current-user .rank {
      color: var(--color-buttonPrimaryText);
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
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .leaderboard-entry.current-user .name {
      color: var(--color-buttonPrimaryText);
    }

    .stats {
      font-size: 0.75rem;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .leaderboard-entry.current-user .stats {
      color: var(--color-buttonPrimaryText);
      opacity: 0.9;
    }

    .you-indicator {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
      background: var(--color-buttonPrimaryText);
      color: var(--color-buttonPrimaryBase);
    }

    .more-users-indicator {
      text-align: center;
      font-size: 0.75rem;
      color: var(--text-secondary);
      margin-bottom: 0.75rem;
      font-style: italic;
    }

    .view-full-local {
      width: 100%;
      padding: 0.75rem;
      background: var(--color-buttonSecondaryBase);
      color: var(--color-buttonSecondaryText);
      border: 1px solid var(--color-buttonSecondaryBorder);
      border-radius: 0.375rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .view-full-local:hover {
      background: var(--color-buttonSecondaryHover);
    }

    .view-full-local:focus {
      outline: none;
      box-shadow: 0 0 0 2px var(--color-buttonPrimaryBase);
    }

    /* Mobile responsive */
    @media (max-width: 640px) {
      .local-leaderboard-widget {
        padding: 0.75rem;
      }

      .leaderboard-entry {
        padding: 0.5rem;
        gap: 0.5rem;
      }

      .widget-title {
        font-size: 1rem;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.25rem;
      }

      .name {
        font-size: 0.8125rem;
      }

      .stats {
        font-size: 0.6875rem;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LocalLeaderboardWidgetComponent extends BaseWidgetComponent {
  protected readonly leaderboardStore = inject(LeaderboardStore);
  protected readonly pubGroupingService = inject(PubGroupingService);
  private readonly authStore = inject(AuthStore);

  // Current user context
  protected readonly currentUserId = computed(() => this.authStore.user()?.uid);

  // Get current user's cities for local filtering
  protected readonly currentUserCities = computed(() => {
    const userId = this.currentUserId();
    if (!userId) return new Set<string>();

    const visits = this.pubGroupingService.userPubVisits();
    return new Set(
      visits
        .filter(v => v.userId === userId && v.city)
        .map(v => v.city!)
    );
  });

  // Primary city for display
  protected readonly currentUserCity = computed(() => {
    const cities = this.currentUserCities();
    return cities.size > 0 ? Array.from(cities)[0] : null;
  });

  // Check if we have local data
  protected readonly hasLocalData = computed(() => {
    const cities = this.currentUserCities();
    const hasGeoData = this.pubGroupingService.hasGeographicData();
    return cities.size > 0 && hasGeoData;
  });

  // Get local competitors
  protected readonly localCompetitors = computed(() => {
    const userId = this.currentUserId();
    if (!userId) return [];

    const userCities = this.currentUserCities();
    if (userCities.size === 0) return [];

    const visits = this.pubGroupingService.userPubVisits();
    const localUserIds = new Set<string>();

    // Add current user
    localUserIds.add(userId);

    // Find users who have visited the same cities
    visits.forEach(visit => {
      if (visit.city && userCities.has(visit.city)) {
        localUserIds.add(visit.userId);
      }
    });

    // Get leaderboard entries for local users
    const allEntries = this.leaderboardStore.topByPoints();
    return allEntries.filter(entry => localUserIds.has(entry.userId));
  });

  // Local leaderboard (top 5 + current user if not in top 5)
  protected readonly localLeaderboard = computed((): LocalLeaderboardEntry[] => {
    const competitors = this.localCompetitors();
    const userId = this.currentUserId();

    if (competitors.length === 0) return [];

    // Sort by points
    const sorted = [...competitors].sort((a, b) => b.totalPoints - a.totalPoints);

    // Take top 5
    let result = sorted.slice(0, 5);

    // If current user is not in top 5, add them
    if (userId) {
      const userInTop5 = result.some(entry => entry.userId === userId);
      if (!userInTop5) {
        const userEntry = sorted.find(entry => entry.userId === userId);
        if (userEntry) {
          result = [...result.slice(0, 4), userEntry]; // Keep top 4 + user
        }
      }
    }

    return result.map((entry, index) => ({
      ...entry,
      position: sorted.findIndex(e => e.userId === entry.userId) + 1,
      isCurrentUser: entry.userId === userId
    }));
  });

  // Total local users count
  protected readonly totalLocalUsers = computed(() => this.localCompetitors().length);

  // Utility methods
  protected formatPoints(points: number): string {
    if (points >= 1000) {
      return `${(points / 1000).toFixed(1)}k pts`;
    }
    return `${points} pts`;
  }

  protected entryAsUser(entry: LocalLeaderboardEntry): User {
    return {
      uid: entry.userId,
      email: entry.email || null,
      displayName: entry.displayName,
      emailVerified: false,
      isAnonymous: entry.isAnonymous || false,
      photoURL: entry.photoURL || null,
      joinedAt: entry.joinedDate,
      streaks: {},
      joinedMissionIds: [],
      badgeCount: 0,
      badgeIds: [],
      landlordCount: 0,
      landlordPubIds: [],
      totalPoints: entry.totalPoints
    };
  }

  protected navigateToLocalLeaderboard(): void {
    const city = this.currentUserCity();
    if (city) {
      this.router.navigate(['/leaderboard/city', city]);
    } else {
      this.router.navigate(['/leaderboard/local']);
    }
  }
}
