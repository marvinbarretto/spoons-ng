import { Injectable, computed, inject, signal, effect } from '@angular/core';
import { AuthStore } from '../../auth/data-access/auth.store';
import { DataAggregatorService } from '../../shared/data-access/data-aggregator.service';
import { CacheCoherenceService } from '../../shared/data-access/cache-coherence.service';
import { UserService } from '../../users/data-access/user.service';
import { CheckInService } from '../../check-in/data-access/check-in.service';
import { LeaderboardEntry, LeaderboardSortBy, LeaderboardFilters, LeaderboardPeriod } from '../utils/leaderboard.models'

@Injectable({
  providedIn: 'root'
})
export class LeaderboardStore {
  private readonly authStore = inject(AuthStore);
  private readonly dataAggregator = inject(DataAggregatorService);
  private readonly cacheCoherence = inject(CacheCoherenceService);
  private readonly userService = inject(UserService);
  private readonly checkinService = inject(CheckInService);

  // State signals
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _sortBy = signal<LeaderboardSortBy>('points');
  private readonly _period = signal<LeaderboardPeriod>('all-time');
  private readonly _showRealUsersOnly = signal(true);

  // Public readonly signals
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly sortBy = this._sortBy.asReadonly();
  readonly period = this._period.asReadonly();
  readonly showRealUsersOnly = this._showRealUsersOnly.asReadonly();

  constructor() {
    console.log('[Leaderboard] ✅ Store initialized with clean architecture');

    // Load global data on initialization
    this.loadData();

    // React to cache invalidation for real-time updates
    effect(() => {
      const invalidation = this.cacheCoherence.invalidations();
      if (invalidation && (
        invalidation.collection === 'users' ||
        invalidation.collection === 'checkins' ||
        invalidation.collection === 'leaderboards'
      )) {
        console.log('[Leaderboard] 🔄 Cache invalidated, refreshing data:', invalidation.collection);
        this.loadData();
      }
    });
  }

  // Computed leaderboard data
  readonly leaderboardEntries = computed(() => {
    const allUsers = this.userService.allUsers();
    const allCheckIns = this.checkinService.allCheckIns();
    const currentUser = this.authStore.user();
    const showRealOnly = this.showRealUsersOnly();

    console.log('[Leaderboard] Computing entries:', {
      totalUsers: allUsers.length,
      totalCheckIns: allCheckIns.length,
      showRealOnly
    });

    if (allUsers.length === 0) {
      return [];
    }

    // Filter and transform users into leaderboard entries
    const entries: LeaderboardEntry[] = allUsers
      .filter(user => {
        // Filter out non-real users if showRealUsersOnly is true
        if (showRealOnly && !user.realUser) {
          return false;
        }
        return true;
      })
      .map(user => {
        // Get user's check-ins
        const userCheckIns = allCheckIns.filter(c => c.userId === user.uid);
        const uniquePubs = new Set(userCheckIns.map(c => c.pubId)).size;

        // Add manually added pubs
        const manualPubs = user.manuallyAddedPubIds?.length || 0;
        const totalUniquePubs = uniquePubs + manualPubs;

        // Calculate monthly stats (current month)
        const monthlyStats = this.calculateMonthlyStats(userCheckIns, user);

        // Get last activity
        const lastCheckin = userCheckIns
          .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis())[0];
        const lastActive = lastCheckin?.timestamp.toDate().toISOString();

        // Calculate current streak
        const currentStreak = this.calculateStreak(userCheckIns);

        const entry: LeaderboardEntry = {
          userId: user.uid,
          displayName: this.getUserDisplayName(user),
          // All-time stats
          totalPoints: user.totalPoints || 0,
          uniquePubs: totalUniquePubs,
          totalCheckins: userCheckIns.length,
          // Monthly stats
          monthlyPoints: monthlyStats.points,
          monthlyPubs: monthlyStats.pubs,
          monthlyCheckins: monthlyStats.checkins,
          // Display properties
          rank: 0, // Will be set after sorting
          photoURL: user.photoURL,
          isCurrentUser: currentUser?.uid === user.uid,
          joinedDate: user.joinedAt || new Date().toISOString(),
          lastActive,
          currentStreak
        };

        return entry;
      });

    // Sort entries based on current sort criteria
    const sortedEntries = this.sortEntries(entries);

    // Assign ranks
    sortedEntries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    console.log('[Leaderboard] ✅ Computed entries:', {
      total: sortedEntries.length,
      sortBy: this.sortBy(),
      topUser: sortedEntries[0]?.displayName
    });

    return sortedEntries;
  });

  // Top 100 entries for display
  readonly topEntries = computed(() =>
    this.leaderboardEntries().slice(0, 100)
  );

  // Current user position
  readonly currentUserPosition = computed(() => {
    const currentUser = this.authStore.user();
    if (!currentUser) return null;

    const entries = this.leaderboardEntries();
    const userEntry = entries.find(e => e.userId === currentUser.uid);
    return userEntry ? userEntry.rank : null;
  });

  // Current user entry
  readonly currentUserEntry = computed(() => {
    const currentUser = this.authStore.user();
    if (!currentUser) return null;

    const entries = this.leaderboardEntries();
    return entries.find(e => e.userId === currentUser.uid) || null;
  });

  // Stats
  readonly stats = computed(() => {
    const entries = this.leaderboardEntries();
    return {
      totalUsers: entries.length,
      totalPoints: entries.reduce((sum, e) => sum + e.totalPoints, 0),
      totalCheckins: entries.reduce((sum, e) => sum + e.totalCheckins, 0),
      totalUniquePubs: entries.reduce((sum, e) => sum + e.uniquePubs, 0)
    };
  });

  // Public methods
  setSortBy(sortBy: LeaderboardSortBy): void {
    console.log('[Leaderboard] Setting sort by:', sortBy);
    this._sortBy.set(sortBy);
  }

  setPeriod(period: LeaderboardPeriod): void {
    console.log('[Leaderboard] Setting period:', period);
    this._period.set(period);
  }

  setShowRealUsersOnly(show: boolean): void {
    console.log('[Leaderboard] Setting show real users only:', show);
    this._showRealUsersOnly.set(show);
  }

  async refresh(): Promise<void> {
    console.log('[Leaderboard] Manual refresh triggered');
    await this.loadData();
  }

  // Private methods
  private async loadData(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      console.log('[Leaderboard] Loading global data...');
      await Promise.all([
        this.userService.loadAllUsers(),
        this.checkinService.loadAllCheckIns()
      ]);
      console.log('[Leaderboard] ✅ Global data loaded successfully');
    } catch (error) {
      console.error('[Leaderboard] ❌ Failed to load data:', error);
      this._error.set(error instanceof Error ? error.message : 'Failed to load leaderboard data');
    } finally {
      this._loading.set(false);
    }
  }

  private sortEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
    const sortBy = this.sortBy();
    const period = this.period();

    return [...entries].sort((a, b) => {
      // Get the appropriate stats based on period
      const aStats = this.getStatsForPeriod(a, period);
      const bStats = this.getStatsForPeriod(b, period);

      switch (sortBy) {
        case 'points':
          // Primary: Points, Secondary: Pubs, Tertiary: Checkins
          if (bStats.points !== aStats.points) return bStats.points - aStats.points;
          if (bStats.pubs !== aStats.pubs) return bStats.pubs - aStats.pubs;
          return bStats.checkins - aStats.checkins;

        case 'pubs':
          // Primary: Pubs, Secondary: Points, Tertiary: Checkins
          if (bStats.pubs !== aStats.pubs) return bStats.pubs - aStats.pubs;
          if (bStats.points !== aStats.points) return bStats.points - aStats.points;
          return bStats.checkins - aStats.checkins;

        case 'checkins':
          // Primary: Checkins, Secondary: Points, Tertiary: Pubs
          if (bStats.checkins !== aStats.checkins) return bStats.checkins - aStats.checkins;
          if (bStats.points !== aStats.points) return bStats.points - aStats.points;
          return bStats.pubs - aStats.pubs;

        default:
          return 0;
      }
    });
  }

  private getUserDisplayName(user: any): string {
    // Use real display name for real users, or generate random name for anonymous
    if (user.displayName) {
      return user.displayName;
    } else if (user.email) {
      return user.email;
    } else {
      // For anonymous users, use a simple format
      return `User ${user.uid.slice(0, 8)}`;
    }
  }

  private calculateStreak(userCheckins: any[]): number {
    if (userCheckins.length === 0) return 0;

    // Sort check-ins by date (newest first)
    const sortedCheckins = userCheckins
      .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());

    // Get unique dates only
    const uniqueDates = Array.from(new Set(
      sortedCheckins.map(c => c.timestamp.toDate().toDateString())
    )).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    if (uniqueDates.length === 0) return 0;

    // Check if streak is current
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
        break;
      }
    }

    return streak;
  }

  private calculateMonthlyStats(userCheckins: any[], user: any): { points: number; pubs: number; checkins: number } {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Filter check-ins for current month
    const monthlyCheckins = userCheckins.filter(c =>
      c.timestamp.toDate() >= monthStart
    );

    // Calculate monthly unique pubs
    const monthlyUniquePubs = new Set(monthlyCheckins.map(c => c.pubId)).size;

    // For monthly points, we'll use a simplified calculation
    // In a real app, you might want to recalculate based on monthly check-ins
    // For now, we'll estimate based on proportion of monthly vs total check-ins
    const totalCheckins = userCheckins.length;
    const monthlyCheckinsCount = monthlyCheckins.length;
    const totalPoints = user.totalPoints || 0;

    const estimatedMonthlyPoints = totalCheckins > 0
      ? Math.round((monthlyCheckinsCount / totalCheckins) * totalPoints)
      : 0;

    return {
      points: estimatedMonthlyPoints,
      pubs: monthlyUniquePubs,
      checkins: monthlyCheckinsCount
    };
  }

  private getStatsForPeriod(entry: LeaderboardEntry, period: LeaderboardPeriod): { points: number; pubs: number; checkins: number } {
    if (period === 'monthly') {
      return {
        points: entry.monthlyPoints,
        pubs: entry.monthlyPubs,
        checkins: entry.monthlyCheckins
      };
    } else {
      return {
        points: entry.totalPoints,
        pubs: entry.uniquePubs,
        checkins: entry.totalCheckins
      };
    }
  }
}
