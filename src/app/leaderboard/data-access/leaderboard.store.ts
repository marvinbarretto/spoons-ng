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


  // In LeaderboardStore - replace fetchData with this debug version:

protected async fetchData(): Promise<LeaderboardEntry[]> {
  console.log('[LeaderboardStore] Building leaderboard from all users...');

  const allUsers = await this.userService.getAllUsers();
  console.log('[LeaderboardStore] Total users found:', allUsers.length);

  const validUsers = allUsers.filter(user => {
    const userId = user.uid || (user as any).id;
    const hasValidId = !!userId && typeof userId === 'string';

    if (!hasValidId) {
      console.warn('[LeaderboardStore] Skipping user with invalid ID:', user);
      return false;
    }

    return true;
  });

  console.log('[LeaderboardStore] Valid users:', validUsers.length);

  // 🐛 DEBUG: Look for real users vs anonymous
  const realUsers = validUsers.filter(user => !user.isAnonymous);
  const anonUsers = validUsers.filter(user => user.isAnonymous);

  console.log('[LeaderboardStore] Real users found:', realUsers.length);
  console.log('[LeaderboardStore] Anonymous users found:', anonUsers.length);

  // 🐛 DEBUG: Show some real user data
  realUsers.slice(0, 3).forEach((user, index) => {
    console.log(`[LeaderboardStore] Real user ${index}:`, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      isAnonymous: user.isAnonymous,
      checkedInPubIds: user.checkedInPubIds?.length || 0
    });
  });

  return validUsers.map(user => {
    const userId = user.uid || (user as any).id;
    const displayName = this.getDisplayName(userId, user);

    // 🐛 DEBUG: Log what display name we're generating
    if (user.displayName || user.email) {
      console.log('[LeaderboardStore] Real user display name:', {
        userId: userId.slice(0, 8),
        originalName: user.displayName,
        email: user.email,
        isAnonymous: user.isAnonymous,
        hasRealProfile: !!(user.displayName || user.email),
        photoURL: user.photoURL,
        generatedName: displayName
      });
    }

    return {
      userId,
      displayName,
      totalVisits: user.checkedInPubIds?.length || 0,
      uniquePubs: user.checkedInPubIds?.length || 0,
      joinedDate: user.joinedAt || new Date().toISOString(),
      rank: 0,
      photoURL: user.photoURL,
      email: user.email,
      realDisplayName: user.displayName,
      isAnonymous: user.isAnonymous
    };
  });
}


private getDisplayName(userId: string, user: User): string {
  if (!userId) {
    return 'Unknown User';
  }

  const currentUser = this.authStore.user();

  // ✅ Check if it's current user first
  if (currentUser?.uid === userId) {
    if (user.isAnonymous) {
      return `${generateAnonymousName(userId)} (You)`;
    }
    return `${user.displayName || user.email || 'You'} (You)`;
  }

  // ✅ FOR OTHER USERS: Check if they have real profile data
  // If they have displayName or email, they're a real user (not anonymous)
  const hasRealProfile = user.displayName || user.email;

  if (hasRealProfile) {
    // ✅ REAL USER: Show their actual name!
    if (user.displayName) {
      return user.displayName;
    } else if (user.email) {
      return user.email;
    } else {
      return `User ${userId.slice(0, 8)}`;
    }
  } else {
    // Anonymous user - generate pub name
    return generateAnonymousName(userId);
  }
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
