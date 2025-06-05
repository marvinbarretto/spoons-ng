import { Injectable, computed, inject } from "@angular/core";
import { AuthStore } from "../../auth/data-access/auth.store";
import { BaseStore } from "../../shared/data-access/base.store";
import { LeaderboardEntry } from "../utils/leaderboard.models";
import { generateAnonymousName } from "../../shared/utils/anonymous-names";
import { UserService } from "../../users/data-access/user.service";
import { User } from "../../users/utils/user.model";

@Injectable({
  providedIn: 'root'
})
// /leaderboard/data-access/leaderboard.store.ts
export class LeaderboardStore extends BaseStore<LeaderboardEntry> {
  private readonly userService = inject(UserService);
  private readonly authStore = inject(AuthStore);


  // 📊 Different ranking views
  readonly topByVisits = computed(() =>
    this.data()
      .sort((a, b) => b.totalVisits - a.totalVisits)
      .slice(0, 100)
  );

  readonly topByUniquePubs = computed(() =>
    this.data()
      .sort((a, b) => b.uniquePubs - a.uniquePubs)
      .slice(0, 100)
  );

  // 🎯 User's position in rankings
  readonly userRankByVisits = computed(() => {
    const userId = this.authStore.user()?.uid;
    if (!userId) return null;

    return this.topByVisits().findIndex(entry =>
      entry.userId === userId
    ) + 1 || null;
  });

  readonly userRankByUniquePubs = computed(() => {
    const userId = this.authStore.user()?.uid;
    if (!userId) return null;

    return this.topByUniquePubs().findIndex(entry =>
      entry.userId === userId
    ) + 1 || null;
  });

  protected async fetchData(): Promise<LeaderboardEntry[]> {
    console.log('[LeaderboardStore] Building leaderboard from all users...');

    const allUsers = await this.userService.getAllUsers();
    console.log('[LeaderboardStore] Total users found:', allUsers.length);

    // 🧹 Only filter out users with invalid IDs
    const validUsers = allUsers.filter(user => {
      const userId = user.uid || (user as any).id;
      const hasValidId = !!userId && typeof userId === 'string';

      if (!hasValidId) {
        console.warn('[LeaderboardStore] Skipping user with invalid ID:', {
          uid: user.uid,
          id: (user as any).id,
          user
        });
        return false;
      }

      return true; // Keep all users, even with 0 check-ins
    });

    console.log('[LeaderboardStore] Valid users:', validUsers.length);

    // 🐛 Debug the first few users to see their data
    validUsers.slice(0, 3).forEach((user, index) => {
      console.log(`[LeaderboardStore] User ${index} data:`, {
        uid: user.uid || (user as any).id,
        checkedInPubIds: user.checkedInPubIds,
        checkedInCount: user.checkedInPubIds?.length || 0,
        landlordOf: user.landlordOf,
        allFields: Object.keys(user)
      });
    });

    return validUsers.map(user => {
      const userId = user.uid || (user as any).id;

      return {
        userId,
        displayName: this.getDisplayName(userId, user),
        totalVisits: user.checkedInPubIds?.length || 0,
        uniquePubs: user.checkedInPubIds?.length || 0,
        joinedDate: user.joinedAt || new Date().toISOString(),
        rank: 0
      };
    });
  }

  private getDisplayName(userId: string, user: User): string {
    if (!userId) {
      return 'Unknown User';
    }

    const currentUser = this.authStore.user();

    // Current user
    if (currentUser?.uid === userId) {
      if (user.isAnonymous) {
        return `${generateAnonymousName(userId)} (You)`;
      }
      return `${user.displayName || user.email || 'You'} (You)`;
    }

    // Other users - generate anonymous name
    return generateAnonymousName(userId);
  }

  /**
   * Get user's stats for comparison
   */
  readonly currentUserStats = computed((): LeaderboardEntry | null => {
    const userId = this.authStore.user()?.uid;
    if (!userId) return null;

    return this.data().find(entry => entry.userId === userId) || null;
  });

  /**
   * Refresh leaderboard data
   */
  async refresh(): Promise<void> {
    console.log('[LeaderboardStore] Refreshing leaderboard...');
    await this.load();
  }




}
