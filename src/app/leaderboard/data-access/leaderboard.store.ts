import { Injectable, computed, inject, signal } from "@angular/core";
import { AuthStore } from "../../auth/data-access/auth.store";
import { BaseStore } from "../../shared/data-access/base.store";
import { LeaderboardEntry, LeaderboardTimeRange } from "../utils/leaderboard.models";
import { generateAnonymousName } from "../../shared/utils/anonymous-names";
import { UserService } from "../../users/data-access/user.service";
import { User } from "../../users/utils/user.model";
import { NewCheckinStore } from "../../new-checkin/data-access/new-checkin.store";
import { CheckIn } from "../../check-in/utils/check-in.models";
import { PubStore } from "../../pubs/data-access/pub.store";

@Injectable({
  providedIn: 'root'
})
// /leaderboard/data-access/leaderboard.store.ts
export class LeaderboardStore extends BaseStore<LeaderboardEntry> {
  private readonly userService = inject(UserService);
  private readonly newCheckinStore = inject(NewCheckinStore);
  private readonly pubStore = inject(PubStore);
  
  // Time range filter
  private readonly _timeRange = signal<LeaderboardTimeRange>('all-time');
  readonly timeRange = this._timeRange.asReadonly();


  // 📊 Filter data by time range
  readonly filteredData = computed(() => {
    const range = this.timeRange();
    const allData = this.data();
    
    console.log('[LeaderboardStore] Filtering data for range:', range, 'Total users:', allData.length);
    
    if (range === 'all-time') {
      console.log('[LeaderboardStore] All-time view, returning all users:', allData.length);
      return allData;
    }
    
    const now = new Date();
    const checkins = this.newCheckinStore.checkins();
    
    // Calculate date threshold
    let threshold: Date;
    if (range === 'this-week') {
      threshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === 'this-month') {
      threshold = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      // all-time case
      return allData;
    }
    
    console.log('[LeaderboardStore] Time threshold:', threshold, 'Total checkins:', checkins.length);
    
    // Show all users but adjust their stats for the time period
    const filteredUsers = allData.map(entry => {
      const userCheckins = checkins.filter(c => 
        c.userId === entry.userId && 
        c.timestamp.toDate() >= threshold
      );
      
      // Recalculate stats for the time period
      const uniquePubsInPeriod = new Set(userCheckins.map(c => c.pubId)).size;
      const totalCheckinsInPeriod = userCheckins.length;
      
      // For time-based views, show period-specific stats but keep total points
      const adjustedEntry = {
        ...entry,
        totalCheckins: range === 'this-week' || range === 'this-month' ? totalCheckinsInPeriod : entry.totalCheckins,
        uniquePubs: range === 'this-week' || range === 'this-month' ? uniquePubsInPeriod : entry.uniquePubs,
        // Points stay the same - they're cumulative
      };
      
      return adjustedEntry;
    });
    
    // For time-based views, show users with activity OR users with significant all-time stats
    const result = filteredUsers.filter(entry => {
      // Show users who either:
      // 1. Have activity in the time period, OR
      // 2. Have significant all-time stats (more than 5 total points or 3+ pubs visited)
      const hasRecentActivity = (range === 'this-week' || range === 'this-month') ? 
        entry.totalCheckins > 0 : true;
      const originalUser = allData.find(u => u.userId === entry.userId);
      const hasSignificantStats = entry.totalPoints > 5 || (originalUser?.uniquePubs ?? 0) >= 3;
      
      return hasRecentActivity || hasSignificantStats;
    });
    
    console.log('[LeaderboardStore] Filtered users:', result.length, 'Time range:', range);
    return result;
  });
  
  // 📊 Different ranking views - now by POINTS first
  readonly topByPoints = computed(() =>
    this.filteredData()
      .sort((a, b) => {
        // Primary: Points
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        // Secondary: Unique pubs
        if (b.uniquePubs !== a.uniquePubs) return b.uniquePubs - a.uniquePubs;
        // Tertiary: Total check-ins
        return b.totalCheckins - a.totalCheckins;
      })
      .slice(0, 100)
  );

  readonly topByVisits = computed(() =>
    this.filteredData()
      .sort((a, b) => b.totalVisits - a.totalVisits)
      .slice(0, 100)
  );

  readonly topByUniquePubs = computed(() =>
    this.filteredData()
      .sort((a, b) => b.uniquePubs - a.uniquePubs)
      .slice(0, 100)
  );

  // 🎯 User's position in rankings
  readonly userRankByPoints = computed(() => {
    const userId = this.authStore.user()?.uid;
    if (!userId) return null;

    const index = this.topByPoints().findIndex(entry =>
      entry.userId === userId
    );
    return index >= 0 ? index + 1 : null;
  });
  
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

  // Get all check-ins for counting
  const allCheckins = this.newCheckinStore.checkins();
  console.log('[LeaderboardStore] Total check-ins in system:', allCheckins.length);

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
      checkedInPubIds: 0, // Will be computed from actual check-ins below
      totalPoints: user.totalPoints || 0
    });
  });

  return validUsers.map(user => {
    const userId = user.uid || (user as any).id;
    const displayName = this.getDisplayName(userId, user);
    
    // Get user's check-ins for accurate counts
    const userCheckins = allCheckins.filter(c => c.userId === userId);
    const uniquePubIds = new Set(userCheckins.map(c => c.pubId));
    
    // 🔍 DETAILED LOGGING for pub count calculation
    const currentUser = this.authStore.user();
    if (currentUser && userId === currentUser.uid) {
      console.log('🏆 [LeaderboardStore] === CURRENT USER PUB CALCULATION ===');
      console.log('🏆 [LeaderboardStore] User details:', {
        userId: userId?.slice(0, 8),
        displayName,
        isCurrentUser: true,
        userObject: {
          totalPoints: user.totalPoints,
          checkedInPubIds: 0, // Will be computed from actual check-ins below
          isAnonymous: user.isAnonymous
        }
      });
      console.log('🏆 [LeaderboardStore] Check-in calculation:', {
        totalCheckinsInSystem: allCheckins.length,
        userSpecificCheckins: userCheckins.length,
        uniquePubIdsFromCheckins: Array.from(uniquePubIds),
        uniquePubCount: uniquePubIds.size,
        sampleCheckins: userCheckins.slice(0, 3).map(c => ({
          pubId: c.pubId,
          timestamp: c.timestamp.toDate().toISOString(),
          userId: c.userId?.slice(0, 8)
        }))
      });
      
      // Check-ins are now the single source of truth for pub visits
      console.log('🏆 [LeaderboardStore] Pub visits calculated from check-ins:', {
        userId: user.uid,
        uniquePubsFromCheckins: uniquePubIds.size,
        totalCheckinsForUser: userCheckins.length
      });
    }
    
    // Calculate last active from check-ins
    const lastCheckin = userCheckins
      .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis())[0];
    const lastActive = lastCheckin?.timestamp.toDate().toISOString();

    // Calculate current streak from consecutive check-in days
    const currentStreak = this.calculateStreak(userCheckins);

    // 🐛 DEBUG: Log what display name we're generating
    if (user.displayName || user.email) {
      console.log('[LeaderboardStore] Real user display name:', {
        userId: userId.slice(0, 8),
        originalName: user.displayName,
        email: user.email || undefined,
        isAnonymous: user.isAnonymous,
        hasRealProfile: !!(user.displayName || user.email),
        photoURL: user.photoURL || undefined,
        generatedName: displayName,
        joinedAt: user.joinedAt || undefined,
        badgeCount: user.badgeCount || undefined,
        badgeIds: user.badgeIds || undefined,
        landlordCount: user.landlordCount || undefined,
        landlordPubIds: user.landlordPubIds || undefined,
        totalPoints: user.totalPoints || 0,
        totalCheckins: userCheckins.length,
        uniquePubs: uniquePubIds.size,
        currentStreak
      });
    }

    return {
      userId,
      displayName,
      totalVisits: uniquePubIds.size, // Computed from actual check-ins
      uniquePubs: uniquePubIds.size,
      totalCheckins: userCheckins.length,
      totalPoints: user.totalPoints || 0,
      joinedDate: user.joinedAt || new Date().toISOString(),
      rank: 0,
      photoURL: user.photoURL || undefined,
      email: user.email || undefined,
      realDisplayName: user.displayName || undefined,
      isAnonymous: user.isAnonymous,
      lastActive,
      currentStreak
    };
  });
}

/**
 * Calculate current streak from check-ins
 */
private calculateStreak(userCheckins: CheckIn[]): number {
  if (userCheckins.length === 0) return 0;
  
  // Sort check-ins by date (newest first)
  const sortedCheckins = userCheckins
    .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
  
  // Get unique dates only (ignore multiple check-ins per day)
  const uniqueDates = Array.from(new Set(
    sortedCheckins.map(c => c.timestamp.toDate().toDateString())
  )).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  
  if (uniqueDates.length === 0) return 0;
  
  // Check if streak is current (must include today or yesterday)
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
  
  if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
    return 0; // Streak is broken
  }
  
  // Count consecutive days
  let streak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const currentDate = new Date(uniqueDates[i-1]);
    const previousDate = new Date(uniqueDates[i]);
    const daysDiff = Math.floor((currentDate.getTime() - previousDate.getTime()) / (24 * 60 * 60 * 1000));
    
    if (daysDiff === 1) {
      streak++;
    } else {
      break; // Streak broken
    }
  }
  
  return streak;
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

    return this.filteredData().find(entry => entry.userId === userId) || null;
  });
  
  /**
   * Set the time range filter
   */
  setTimeRange(range: LeaderboardTimeRange): void {
    console.log('[LeaderboardStore] Setting time range:', range);
    this._timeRange.set(range);
  }

  /**
   * Refresh leaderboard data
   */
  async refresh(): Promise<void> {
    console.log('[LeaderboardStore] Refreshing leaderboard...');
    await this.load();
  }
  
  /**
   * Get site-wide statistics with real data
   */
  readonly siteStats = computed(() => {
    const allData = this.data();
    const checkins = this.newCheckinStore.checkins();
    const totalPubs = this.pubStore.pubs().length;
    const now = new Date();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // This week's stats
    const weekCheckins = checkins.filter(c => 
      c.timestamp.toDate() >= weekStart
    );
    const weekActiveUsers = new Set(weekCheckins.map(c => c.userId)).size;
    const weekNewUsers = allData.filter(u => 
      new Date(u.joinedDate) >= weekStart
    ).length;
    
    // This month's stats  
    const monthCheckins = checkins.filter(c => 
      c.timestamp.toDate() >= monthStart
    );
    const monthActiveUsers = new Set(monthCheckins.map(c => c.userId)).size;
    const monthNewUsers = allData.filter(u => 
      new Date(u.joinedDate) >= monthStart
    ).length;
    
    // All time stats
    const totalUsers = allData.length;
    const totalCheckins = checkins.length;
    const totalPubsVisited = new Set(checkins.map(c => c.pubId)).size;
    const totalPoints = allData.reduce((sum, u) => sum + u.totalPoints, 0);
    
    return {
      thisWeek: {
        activeUsers: weekActiveUsers,
        newUsers: weekNewUsers,
        checkins: weekCheckins.length
      },
      thisMonth: {
        activeUsers: monthActiveUsers,
        newUsers: monthNewUsers,
        checkins: monthCheckins.length
      },
      allTime: {
        users: totalUsers,
        checkins: totalCheckins,
        pubsConquered: totalPubsVisited,
        totalPubsInSystem: totalPubs,
        points: totalPoints
      }
    };
  });




}
