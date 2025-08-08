import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { AuthStore } from '../../auth/data-access/auth.store';
import { CheckInService } from '../../check-in/data-access/check-in.service';
import { PubStore } from '../../pubs/data-access/pub.store';
import { CacheCoherenceService } from '../../shared/data-access/cache-coherence.service';
import { DataAggregatorService } from '../../shared/data-access/data-aggregator.service';
import { ErrorLoggingService } from '../../shared/data-access/error-logging.service';
import { UserService } from '../../users/data-access/user.service';
import {
  LeaderboardEntry,
  LeaderboardPeriod,
  LeaderboardScope,
  LeaderboardSortBy,
} from '../utils/leaderboard.models';

@Injectable({
  providedIn: 'root',
})
export class LeaderboardStore {
  private readonly authStore = inject(AuthStore);
  private readonly dataAggregator = inject(DataAggregatorService);
  private readonly pubStore = inject(PubStore);
  private readonly cacheCoherence = inject(CacheCoherenceService);
  private readonly userService = inject(UserService);
  private readonly checkinService = inject(CheckInService);
  private readonly errorLoggingService = inject(ErrorLoggingService);

  // State signals
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _scope = signal<LeaderboardScope>('global');
  private readonly _sortBy = signal<LeaderboardSortBy>('points');
  private readonly _period = signal<LeaderboardPeriod>('all-time');
  private readonly _showRealUsersOnly = signal(false); // 🔧 Changed to false to include guest users by default
  private readonly _selectedRegion = signal<string | null>(null);

  // Public readonly signals
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly scope = this._scope.asReadonly();
  readonly sortBy = this._sortBy.asReadonly();
  readonly period = this._period.asReadonly();
  readonly showRealUsersOnly = this._showRealUsersOnly.asReadonly();
  readonly selectedRegion = this._selectedRegion.asReadonly();

  constructor() {
    console.log('[Leaderboard] ✅ Store initialized - data loading handled by SessionService');

    // React to cache invalidation for real-time updates
    // Note: SessionService handles initial data loading, this only handles cache updates
    effect(() => {
      const invalidation = this.cacheCoherence.invalidations();
      if (
        invalidation &&
        (invalidation.collection === 'users' ||
          invalidation.collection === 'checkins' ||
          invalidation.collection === 'leaderboards')
      ) {
        console.log(
          '[Leaderboard] 🔄 Cache invalidated:',
          invalidation.collection,
          '- data will be refreshed by SessionService'
        );
        // Data refresh is now handled by SessionService, not directly here
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
      showRealOnly,
      currentUserUid: currentUser?.uid?.slice(0, 8),
      usersWithManualPubs: allUsers.filter(u => u.manuallyAddedPubIds?.length > 0).length,
      usersWithPoints: allUsers.filter(u => (u.totalPoints || 0) > 0).length,
    });

    if (allUsers.length === 0) {
      console.log('[Leaderboard] ⚠️ No users loaded - returning empty array');
      return [];
    }

    // 🔍 DEBUGGING: Log user filtering details
    const realUsers = allUsers.filter(u => u.realUser === true);
    const guestUsers = allUsers.filter(u => u.realUser !== true);
    const usersWithPoints = allUsers.filter(u => (u.totalPoints || 0) > 0);

    console.log('[Leaderboard] 🔍 User breakdown:', {
      totalUsers: allUsers.length,
      realUsers: realUsers.length,
      guestUsers: guestUsers.length,
      usersWithPoints: usersWithPoints.length,
      showRealOnly,
      willBeFiltered: showRealOnly ? guestUsers.length : 0,
    });

    // Log users with points who might be filtered
    if (showRealOnly && guestUsers.length > 0) {
      const guestUsersWithPoints = guestUsers.filter(u => (u.totalPoints || 0) > 0);
      if (guestUsersWithPoints.length > 0) {
        console.warn('[Leaderboard] ⚠️ FILTERING OUT GUEST USERS WITH POINTS:', {
          count: guestUsersWithPoints.length,
          users: guestUsersWithPoints.map(u => ({
            uid: u.uid?.slice(0, 8),
            displayName: u.displayName,
            totalPoints: u.totalPoints,
            realUser: u.realUser,
          })),
        });
      }
    }

    // Filter and transform users into leaderboard entries
    const entries: LeaderboardEntry[] = allUsers
      .filter(user => {
        // Filter out non-real users if showRealUsersOnly is true
        if (showRealOnly && !user.realUser) {
          // 🔍 DEBUGGING: Log each filtered user
          if ((user.totalPoints || 0) > 0) {
            console.log('[Leaderboard] 🚫 Filtering out guest user with points:', {
              uid: user.uid?.slice(0, 8),
              displayName: user.displayName,
              totalPoints: user.totalPoints,
              realUser: user.realUser,
            });
          }
          return false;
        }
        return true;
      })
      .map(user => {
        // Get user's check-ins
        const userCheckIns = allCheckIns.filter(c => c.userId === user.uid);

        // Use DataAggregatorService for consistent pub count calculation (with deduplication)
        // Pass user data to include manually added pubs
        const totalUniquePubs = this.dataAggregator.getPubsVisitedForUser(user.uid, user.manuallyAddedPubIds || []);

        // ✅ FIXED: Use reactive points calculation from check-ins (like scoreboard)
        const totalPointsFromCheckins = this.dataAggregator.calculateUserPointsFromCheckins(user.uid);
        
        // 🔍 DEBUGGING: Log users with potential data issues
        if (totalPointsFromCheckins > 0 && totalUniquePubs === 0) {
          console.warn(`[Leaderboard] 🚨 USER WITH POINTS BUT NO PUBS:`, {
            uid: user.uid?.slice(0, 8),
            displayName: user.displayName,
            calculatedPoints: totalPointsFromCheckins,
            calculatedPubs: totalUniquePubs,
            checkins: userCheckIns.length,
            manuallyAddedPubIds: user.manuallyAddedPubIds,
            hasManualPubs: !!user.manuallyAddedPubIds?.length,
          });
        }

        // Calculate monthly stats (current month) - ✅ FIXED: Using reactive calculation
        const monthlyStats = this.calculateMonthlyStats(userCheckIns, totalPointsFromCheckins);

        // Get last activity
        const lastCheckin = userCheckIns.sort(
          (a, b) => b.timestamp.toMillis() - a.timestamp.toMillis()
        )[0];
        const lastActive = lastCheckin?.timestamp.toDate().toISOString();

        // Calculate current streak
        const currentStreak = this.calculateStreak(userCheckIns);

        // ✅ SIMPLIFIED: Now using reactive calculation consistently
        console.log(
          `[Leaderboard] ✅ Points calculation for ${user.displayName || user.uid?.slice(0, 8)}:`,
          {
            reactiveCalculation: totalPointsFromCheckins,
            userDocPoints: user.totalPoints || 0,
            checkinsCount: userCheckIns.length,
            userId: user.uid?.slice(0, 8),
            consistent: 'Using reactive calculation like scoreboard',
          }
        );

        const entry: LeaderboardEntry = {
          userId: user.uid,
          displayName: this.getUserDisplayName(user),
          // All-time stats - ✅ FIXED: Using reactive calculation from check-ins
          totalPoints: totalPointsFromCheckins, // Now consistent with scoreboard
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
          currentStreak,
          // Regional data - TODO: implement proper region detection
          region: user.region || undefined,
          country: user.country || undefined,
          // Friends data - TODO: implement friendship detection
          isFriend: false, // TODO: check friendship with current user
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
      topUser: sortedEntries[0]?.displayName,
    });

    return sortedEntries;
  });

  // Scope-filtered entries
  readonly scopedEntries = computed(() => {
    const allEntries = this.leaderboardEntries();
    const currentScope = this.scope();
    const selectedRegion = this.selectedRegion();

    switch (currentScope) {
      case 'friends':
        return allEntries.filter(entry => entry.isFriend === true);
      case 'regional':
        if (selectedRegion) {
          return allEntries.filter(entry => 
            entry.region === selectedRegion || entry.country === selectedRegion
          );
        }
        return allEntries.filter(entry => entry.region || entry.country);
      case 'global':
      default:
        return allEntries;
    }
  });

  // Top 100 entries for display
  readonly topEntries = computed(() => this.scopedEntries().slice(0, 100));

  // Friends-specific entries
  readonly friendsEntries = computed(() => 
    this.leaderboardEntries().filter(entry => entry.isFriend === true)
  );

  // Regional entries
  readonly regionalEntries = computed(() => {
    const selectedRegion = this.selectedRegion();
    if (selectedRegion) {
      return this.leaderboardEntries().filter(entry => 
        entry.region === selectedRegion || entry.country === selectedRegion
      );
    }
    return this.leaderboardEntries().filter(entry => entry.region || entry.country);
  });

  // Global entries (all entries)
  readonly globalEntries = computed(() => this.leaderboardEntries());

  // Current user position (scope-aware)
  readonly currentUserPosition = computed(() => {
    const currentUser = this.authStore.user();
    if (!currentUser) return null;

    const entries = this.scopedEntries();
    const userEntry = entries.find(e => e.userId === currentUser.uid);
    return userEntry ? userEntry.rank : null;
  });

  // Current user entry (scope-aware)
  readonly currentUserEntry = computed(() => {
    const currentUser = this.authStore.user();
    if (!currentUser) return null;

    const entries = this.scopedEntries();
    return entries.find(e => e.userId === currentUser.uid) || null;
  });

  // Stats
  readonly stats = computed(() => {
    const entries = this.leaderboardEntries();
    return {
      totalUsers: entries.length,
      totalPoints: entries.reduce((sum, e) => sum + e.totalPoints, 0),
      totalCheckins: entries.reduce((sum, e) => sum + e.totalCheckins, 0),
      totalUniquePubs: entries.reduce((sum, e) => sum + e.uniquePubs, 0),
    };
  });

  // Admin Dashboard specific stats - site overview data
  readonly siteStats = computed(() => {
    const entries = this.leaderboardEntries();
    const allUsers = this.userService.allUsers();
    const allCheckIns = this.checkinService.allCheckIns();

    // Calculate monthly stats (current month)
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Monthly check-ins
    const monthlyCheckIns = allCheckIns.filter(c => c.timestamp.toDate() >= monthStart);

    // Monthly unique users who checked in
    const monthlyActiveUserIds = new Set(monthlyCheckIns.map(c => c.userId));

    // Monthly new users (joined this month)
    const monthlyNewUsers = allUsers.filter(u => u.joinedAt && new Date(u.joinedAt) >= monthStart);

    // Total unique pubs visited across all users
    const allPubIds = new Set(allCheckIns.map(c => c.pubId));

    // Get total pubs in system from pub store - now using accurate count
    const totalPubsInSystem = this.pubStore.totalCount();

    const siteStats = {
      allTime: {
        users: allUsers.length,
        checkins: allCheckIns.length,
        pubsConquered: allPubIds.size,
        totalPubsInSystem,
      },
      thisMonth: {
        activeUsers: monthlyActiveUserIds.size,
        newUsers: monthlyNewUsers.length,
        checkins: monthlyCheckIns.length,
      },
    };

    console.log('[Leaderboard] 📊 Site stats computed:', siteStats);
    return siteStats;
  });

  // Admin Dashboard specific stats - global data summary
  readonly globalDataStats = computed(() => {
    const allUsers = this.userService.allUsers();
    const allCheckIns = this.checkinService.allCheckIns();

    // Calculate active users (users with check-ins in last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentCheckIns = allCheckIns.filter(c => c.timestamp.toDate() >= thirtyDaysAgo);
    const activeUserIds = new Set(recentCheckIns.map(c => c.userId));

    // Enhanced stats using DataAggregatorService for accuracy
    const totalSystemPoints = allUsers.reduce((sum, user) => {
      return sum + this.dataAggregator.calculateUserPointsFromCheckins(user.uid);
    }, 0);

    const totalPubsVisited = new Set(allCheckIns.filter(c => c.pubId).map(c => c.pubId)).size;
    
    const averagePointsPerUser = allUsers.length > 0 ? Math.round(totalSystemPoints / allUsers.length) : 0;
    const averagePubsPerUser = allUsers.length > 0 ? Math.round(
      allUsers.reduce((sum, user) => {
        return sum + this.dataAggregator.getPubsVisitedForUser(user.uid, user.manuallyAddedPubIds || []);
      }, 0) / allUsers.length
    ) : 0;

    const globalStats = {
      totalUsers: allUsers.length,
      totalCheckIns: allCheckIns.length,
      activeUsers: activeUserIds.size,
      totalSystemPoints,
      totalPubsVisited,
      averagePointsPerUser,
      averagePubsPerUser,
      totalPubsInSystem: this.pubStore.totalCount(),
    };

    console.log('[Leaderboard] 🌍 Enhanced global data stats computed:', globalStats);
    return globalStats;
  });

  // Public methods
  setScope(scope: LeaderboardScope): void {
    console.log('[Leaderboard] Setting scope:', scope);
    this._scope.set(scope);
  }

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

  setSelectedRegion(region: string | null): void {
    console.log('[Leaderboard] Setting selected region:', region);
    this._selectedRegion.set(region);
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
      await Promise.all([this.userService.loadAllUsers(), this.checkinService.loadAllCheckIns()]);

      // 🔍 DEBUGGING: Log the actual data to see what we're working with
      const users = this.userService.allUsers();
      const checkins = this.checkinService.allCheckIns();

      console.log('[Leaderboard] ✅ Global data loaded successfully:', {
        usersCount: users.length,
        checkinsCount: checkins.length,
      });

      // 🔍 DEBUGGING: Log user points data to identify sync issues
      const usersWithPoints = users.filter(u => (u.totalPoints || 0) > 0);
      if (usersWithPoints.length > 0) {
        console.log(
          '[Leaderboard] 📊 Users with points in database:',
          usersWithPoints.map(u => ({
            uid: u.uid?.slice(0, 8),
            displayName: u.displayName,
            totalPoints: u.totalPoints,
            realUser: u.realUser,
            hasCheckins: checkins.some(c => c.userId === u.uid),
          }))
        );
      }

      // 🔍 DEBUGGING: Check for check-ins without corresponding user points
      const userIdsWithCheckins = new Set(checkins.map(c => c.userId));
      const usersWithCheckinsButNoPoints = users.filter(
        u => userIdsWithCheckins.has(u.uid) && (u.totalPoints || 0) === 0
      );

      if (usersWithCheckinsButNoPoints.length > 0) {
        console.warn(
          '[Leaderboard] ⚠️ Users with check-ins but zero points:',
          usersWithCheckinsButNoPoints.map(u => ({
            uid: u.uid?.slice(0, 8),
            displayName: u.displayName,
            totalPoints: u.totalPoints,
            checkinsCount: checkins.filter(c => c.userId === u.uid).length,
            checkinsWithPoints: checkins.filter(
              c => c.userId === u.uid && (c.pointsEarned || 0) > 0
            ).length,
          }))
        );

        // 🔍 Log each user with check-ins but no points as an error
        for (const user of usersWithCheckinsButNoPoints) {
          const userCheckins = checkins.filter(c => c.userId === user.uid);
          const checkinsWithPoints = userCheckins.filter(c => (c.pointsEarned || 0) > 0);

          try {
            await this.errorLoggingService.logError(
              'points',
              'user-checkins-no-points',
              `User has ${userCheckins.length} check-ins but 0 points in user document`,
              {
                severity: 'high',
                operationContext: {
                  userId: user.uid,
                  userDisplayName: user.displayName,
                  userDocPoints: user.totalPoints,
                  checkinsCount: userCheckins.length,
                  checkinsWithPoints: checkinsWithPoints.length,
                  checkinData: userCheckins.map(c => ({
                    id: c.id,
                    pointsEarned: c.pointsEarned,
                    pubId: c.pubId,
                    timestamp: c.timestamp?.toDate?.()?.toISOString(),
                  })),
                },
              }
            );
          } catch (logError) {
            console.error('[Leaderboard] Failed to log user-checkins-no-points error:', logError);
          }
        }
      }
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
    const sortedCheckins = userCheckins.sort(
      (a, b) => b.timestamp.toMillis() - a.timestamp.toMillis()
    );

    // Get unique dates only
    const uniqueDates = Array.from(
      new Set(sortedCheckins.map(c => c.timestamp.toDate().toDateString()))
    ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

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
      const currentDate = new Date(uniqueDates[i - 1]);
      const previousDate = new Date(uniqueDates[i]);
      const daysDiff = Math.floor(
        (currentDate.getTime() - previousDate.getTime()) / (24 * 60 * 60 * 1000)
      );

      if (daysDiff === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  private calculateMonthlyStats(
    userCheckins: any[],
    totalReactivePoints: number
  ): { points: number; pubs: number; checkins: number } {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Filter check-ins for current month
    const monthlyCheckins = userCheckins.filter(c => c.timestamp.toDate() >= monthStart);

    // Calculate monthly unique pubs
    const monthlyUniquePubs = new Set(monthlyCheckins.map(c => c.pubId)).size;

    // ✅ FIXED: Calculate monthly points directly from monthly check-ins
    const monthlyPoints = monthlyCheckins.reduce((sum, checkin) => {
      const points = checkin.pointsEarned ?? checkin.pointsBreakdown?.total ?? 0;
      return sum + points;
    }, 0);

    // Fallback: estimate if direct calculation returns 0 but we have check-ins
    const estimatedMonthlyPoints = monthlyPoints > 0 ? monthlyPoints : 
      userCheckins.length > 0 ? Math.round((monthlyCheckins.length / userCheckins.length) * totalReactivePoints) : 0;

    return {
      points: estimatedMonthlyPoints,
      pubs: monthlyUniquePubs,
      checkins: monthlyCheckins.length,
    };
  }

  private getStatsForPeriod(
    entry: LeaderboardEntry,
    period: LeaderboardPeriod
  ): { points: number; pubs: number; checkins: number } {
    if (period === 'monthly') {
      return {
        points: entry.monthlyPoints,
        pubs: entry.monthlyPubs,
        checkins: entry.monthlyCheckins,
      };
    } else {
      return {
        points: entry.totalPoints,
        pubs: entry.uniquePubs,
        checkins: entry.totalCheckins,
      };
    }
  }
}
