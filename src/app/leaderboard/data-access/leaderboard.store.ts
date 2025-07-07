import { Injectable, computed, inject, signal, effect } from "@angular/core";
import { AuthStore } from "../../auth/data-access/auth.store";
import { BaseStore } from "../../shared/base/base.store";
import { CacheCoherenceService } from "../../shared/data-access/cache-coherence.service";
import { DataAggregatorService } from "../../shared/data-access/data-aggregator.service";
import { LeaderboardEntry, LeaderboardTimeRange, LeaderboardGeographicFilter } from "../utils/leaderboard.models";
import { generateRandomName } from "../../shared/utils/anonymous-names";
import { UserService } from "../../users/data-access/user.service";
import { User } from "../../users/utils/user.model";
import { CheckInStore } from "../../check-in/data-access/check-in.store";
import { CheckInService } from "../../check-in/data-access/check-in.service";
import { CheckIn } from "../../check-in/utils/check-in.models";
import { PubStore } from "../../pubs/data-access/pub.store";
import { PubGroupingService } from "../../shared/data-access/pub-grouping.service";
import { UserStore } from "../../users/data-access/user.store";

@Injectable({
  providedIn: 'root'
})
// /leaderboard/data-access/leaderboard.store.ts
export class LeaderboardStore extends BaseStore<LeaderboardEntry> {
  private readonly userService = inject(UserService);
  private readonly checkinService = inject(CheckInService);
  private readonly checkinStore = inject(CheckInStore);
  private readonly pubStore = inject(PubStore);
  private readonly pubGroupingService = inject(PubGroupingService);
  private readonly userStore = inject(UserStore);
  private readonly cacheCoherence = inject(CacheCoherenceService);
  private readonly dataAggregator = inject(DataAggregatorService);

  // Time range filter
  private readonly _timeRange = signal<LeaderboardTimeRange>('all-time');
  readonly timeRange = this._timeRange.asReadonly();

  // Geographic filter
  private readonly _geographicFilter = signal<LeaderboardGeographicFilter>({ type: 'none' });
  readonly geographicFilter = this._geographicFilter.asReadonly();

  // Track last computation to prevent infinite loops
  private lastComputationHash = '';
  private lastCurrentUserUpdate = { userId: '', checkinsCount: 0 };

  constructor() {
    super();
    console.log('[LeaderboardStore] ✅ Initialized with pure signal reactivity');

    // Initial load of global data
    this.loadGlobalData();

    // Effect 1: React to global user and check-in changes
    effect(() => {
      const allUsers = this.userService.allUsers();
      const allCheckIns = this.checkinService.allCheckIns();
      
      // Create hash to detect actual changes
      const computationHash = `${allUsers.length}-${allCheckIns.length}-${allUsers.map(u => u.uid).join(',').slice(-10)}`;
      
      if (computationHash !== this.lastComputationHash && allUsers.length > 0) {
        console.log('[LeaderboardStore] Global data changed, rebuilding leaderboard:', {
          users: allUsers.length,
          checkIns: allCheckIns.length,
          hash: computationHash
        });
        this.lastComputationHash = computationHash;
        this.rebuildLeaderboardFromGlobalData(allUsers, allCheckIns);
      }
    });

    // Effect 2: React to current user changes for immediate updates
    effect(() => {
      const currentUser = this.userStore.user();
      const userCheckIns = this.checkinStore.checkins();
      
      const currentUserId = currentUser?.uid || '';
      const currentCheckinsCount = userCheckIns.length;
      
      // Prevent unnecessary updates
      if (currentUserId === this.lastCurrentUserUpdate.userId && 
          currentCheckinsCount === this.lastCurrentUserUpdate.checkinsCount) {
        return;
      }

      console.log('[LeaderboardStore] Current user data changed:', {
        userId: currentUserId,
        checkinsCount: currentCheckinsCount
      });

      this.lastCurrentUserUpdate = { userId: currentUserId, checkinsCount: currentCheckinsCount };

      if (currentUser) {
        this.updateCurrentUserInLeaderboard(currentUser, userCheckIns);
      }
    });

    // Effect 3: React to cache invalidation for user profile updates
    effect(() => {
      const invalidation = this.cacheCoherence.invalidations();
      if (invalidation && (invalidation.collection === 'users' || invalidation.collection === 'leaderboards')) {
        console.log('[LeaderboardStore] 🔄 Cache invalidated, refreshing leaderboard data');
        console.log('[LeaderboardStore] 🔄 Collection:', invalidation.collection);
        console.log('[LeaderboardStore] 🔄 Reason:', invalidation.reason);
        
        // Force refresh of leaderboard data to ensure fresh display names
        this.handleCacheInvalidation(invalidation.collection, invalidation.reason);
      }
    });
  }

  /**
   * Load all global data (users and check-ins) using new signal approach
   */
  private async loadGlobalData(): Promise<void> {
    this._loading.set(true);
    try {
      console.log('[LeaderboardStore] Loading global data for signal reactivity...');
      await Promise.all([
        this.userService.loadAllUsers(),
        this.checkinService.loadAllCheckIns()
      ]);
      console.log('[LeaderboardStore] Global data loaded successfully');
    } catch (error) {
      console.error('[LeaderboardStore] Failed to load global data:', error);
      this._error.set('Failed to load leaderboard data');
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Handle cache invalidation by refreshing leaderboard data
   * @param collection - The collection that was invalidated
   * @param reason - Reason for invalidation
   */
  private async handleCacheInvalidation(collection: string, reason?: string): Promise<void> {
    console.log(`[LeaderboardStore] 🔄 === HANDLING CACHE INVALIDATION ===`);
    console.log(`[LeaderboardStore] 🔄 Collection: ${collection}`);
    console.log(`[LeaderboardStore] 🔄 Reason: ${reason || 'unspecified'}`);
    
    try {
      // Force reload global data to get fresh user profiles with updated display names
      console.log(`[LeaderboardStore] 🔄 Refreshing global user and checkin data...`);
      await this.loadGlobalData();
      console.log(`[LeaderboardStore] ✅ Leaderboard data refreshed after cache invalidation`);
      
    } catch (error) {
      console.error(`[LeaderboardStore] ❌ Failed to refresh leaderboard data after cache invalidation:`, error);
    }
  }

  // 📊 Filter data by time range and geography
  readonly filteredData = computed(() => {
    const range = this.timeRange();
    const geoFilter = this.geographicFilter();
    const allData = this.data();

    console.log('[LeaderboardStore] Filtering data for range:', range, 'geographic filter:', geoFilter, 'Total users:', allData.length);

    // First apply geographic filtering
    let geographicallyFilteredData = allData;
    
    if (geoFilter.type !== 'none' && geoFilter.value) {
      const allowedUserIds = this.getAllowedUserIdsForGeographicFilter(geoFilter);
      geographicallyFilteredData = allData.filter(entry => allowedUserIds.includes(entry.userId));
      console.log('[LeaderboardStore] Geographic filtering applied:', geoFilter, 'Users remaining:', geographicallyFilteredData.length);
    }

    // Then apply time range filtering
    if (range === 'all-time') {
      console.log('[LeaderboardStore] All-time view, returning geographically filtered users:', geographicallyFilteredData.length);
      return geographicallyFilteredData;
    }

    const now = new Date();
    const checkins = this.checkinService.allCheckIns();

    // Calculate date threshold
    let threshold: Date;
    if (range === 'this-month') {
      threshold = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      // all-time case
      return geographicallyFilteredData;
    }

    console.log('[LeaderboardStore] Time threshold:', threshold, 'Total checkins:', checkins.length);

    // Show all users but adjust their stats for the time period
    const filteredUsers = geographicallyFilteredData.map(entry => {
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
        totalCheckins: range === 'this-month' ? totalCheckinsInPeriod : entry.totalCheckins,
        uniquePubs: range === 'this-month' ? uniquePubsInPeriod : entry.uniquePubs,
        // Points stay the same - they're cumulative
      };

      return adjustedEntry;
    });

    // Show all users regardless of activity
    const result = filteredUsers;

    console.log('[LeaderboardStore] Filtered users:', result.length, 'Time range:', range, 'Geographic filter:', geoFilter);
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


  /**
   * Rebuild leaderboard from global data (pure signal approach)
   */
  private rebuildLeaderboardFromGlobalData(allUsers: User[], allCheckIns: CheckIn[]): void {
    console.log(`[LeaderboardStore] Rebuilding leaderboard from global data: ${allUsers.length} users, ${allCheckIns.length} check-ins`);
    
    const entries: LeaderboardEntry[] = [];
    
    for (const user of allUsers) {
      try {
        // Get all check-ins for this user from global data
        const userCheckIns = allCheckIns.filter(c => c.userId === user.uid);
        const uniquePubIds = new Set(userCheckIns.map(c => c.pubId));
        
        const entry = this.createLeaderboardEntry(user, userCheckIns, uniquePubIds);
        entries.push(entry);
        
      } catch (error) {
        console.error('[LeaderboardStore] Error creating entry for user', user.uid, error);
      }
    }
    
    this._data.set(entries);
    console.log(`[LeaderboardStore] ✅ Rebuilt leaderboard with ${entries.length} entries`);
  }

  /**
   * Update specific user in leaderboard without full rebuild (for immediate updates)
   */
  private updateCurrentUserInLeaderboard(currentUser: User, userCheckIns: CheckIn[]): void {
    const entries = this._data();
    const userIndex = entries.findIndex(e => e.userId === currentUser.uid);
    
    const uniquePubIds = new Set(userCheckIns.map(c => c.pubId));
    const updatedEntry = this.createLeaderboardEntry(currentUser, userCheckIns, uniquePubIds);
    
    if (userIndex >= 0) {
      // Update existing entry
      this._data.update(current => {
        const updated = [...current];
        updated[userIndex] = updatedEntry;
        return updated;
      });
      console.log(`[LeaderboardStore] ✅ Updated current user in leaderboard: ${currentUser.uid}`);
    } else {
      // Add new entry
      this._data.update(current => [...current, updatedEntry]);
      console.log(`[LeaderboardStore] ✅ Added current user to leaderboard: ${currentUser.uid}`);
    }
  }


  /**
   * Create a leaderboard entry from user and check-in data
   */
  private createLeaderboardEntry(user: User, userCheckins: CheckIn[], uniquePubIds: Set<string>): LeaderboardEntry {
    const userId = user.uid;
    const displayName = this.getDisplayName(userId, user);
    
    // Calculate last active from check-ins
    const lastCheckin = userCheckins
      .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis())[0];
    const lastActive = lastCheckin?.timestamp.toDate().toISOString();

    // Calculate current streak
    const currentStreak = this.calculateStreak(userCheckins);

    return {
      userId,
      displayName,
      totalVisits: uniquePubIds.size,
      uniquePubs: uniquePubIds.size,
      totalCheckins: userCheckins.length,
      totalPoints: user.totalPoints || 0,
      joinedDate: user.joinedAt || new Date().toISOString(),
      rank: 0, // Will be set by sorting
      photoURL: user.photoURL || undefined,
      email: user.email || undefined,
      realDisplayName: user.displayName || undefined,
      isAnonymous: user.isAnonymous,
      lastActive,
      currentStreak
    };
  }

  // Override the base store's fetchData to prevent it from being called
  protected async fetchData(): Promise<LeaderboardEntry[]> {
    console.log('[LeaderboardStore] fetchData called but ignored - using reactive pattern');
    return []; // Return empty, the reactive effect will populate data
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
    // For current user, ALWAYS use DataAggregator's fresh display name + "(You)"
    // Anonymous users can have custom display names too!
    const freshDisplayName = this.dataAggregator.displayName();
    if (freshDisplayName) {
      return `${freshDisplayName} (You)`;
    }
    // Fallback - should rarely happen
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
    return generateRandomName(userId);
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
   * Set the geographic filter
   */
  setGeographicFilter(filter: LeaderboardGeographicFilter): void {
    console.log('[LeaderboardStore] Setting geographic filter:', filter);
    this._geographicFilter.set(filter);
  }

  /**
   * Filter by city
   */
  filterByCity(city: string): void {
    this.setGeographicFilter({ type: 'city', value: city });
  }

  /**
   * Filter by region
   */
  filterByRegion(region: string): void {
    this.setGeographicFilter({ type: 'region', value: region });
  }

  /**
   * Filter by country
   */
  filterByCountry(country: string): void {
    this.setGeographicFilter({ type: 'country', value: country });
  }

  /**
   * Filter by specific pub
   */
  filterByPub(pubId: string): void {
    this.setGeographicFilter({ type: 'pub', value: pubId });
  }

  /**
   * Clear geographic filter
   */
  clearGeographicFilter(): void {
    this.setGeographicFilter({ type: 'none' });
  }

  /**
   * Get allowed user IDs for geographic filter
   */
  private getAllowedUserIdsForGeographicFilter(filter: LeaderboardGeographicFilter): string[] {
    if (filter.type === 'none' || !filter.value) {
      return [];
    }

    switch (filter.type) {
      case 'city':
        return this.pubGroupingService.getUsersInCity(filter.value);
      case 'region':
        return this.pubGroupingService.getUsersInRegion(filter.value);
      case 'country':
        return this.pubGroupingService.getUsersInCountry(filter.value);
      case 'pub':
        return this.pubGroupingService.getUsersForHomePub(filter.value);
      default:
        return [];
    }
  }

  /**
   * Get available cities for filtering
   */
  readonly availableCities = computed(() => this.pubGroupingService.activeCities());

  /**
   * Get available regions for filtering
   */
  readonly availableRegions = computed(() => this.pubGroupingService.activeRegions());

  /**
   * Get available countries for filtering
   */
  readonly availableCountries = computed(() => this.pubGroupingService.activeCountries());


  /**
   * Get site-wide statistics with real data
   */
  readonly siteStats = computed(() => {
    const allData = this.data();
    const checkins = this.checkinStore.checkins();
    const totalPubs = this.pubStore.pubs().length;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

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

  /**
   * Public method to refresh all global data
   */
  async refreshGlobalData(): Promise<void> {
    console.log('[LeaderboardStore] Refreshing all global data...');
    await this.loadGlobalData();
  }

  /**
   * Computed signals for efficient global loading state tracking
   */
  readonly globalLoadingState = computed(() => ({
    users: this.userService.loadingAllUsers(),
    checkIns: this.checkinService.loadingAllCheckIns(),
    leaderboard: this.loading()
  }));

  readonly isGlobalDataLoaded = computed(() => 
    this.userService.allUsers().length > 0 && 
    this.checkinService.allCheckIns().length > 0
  );

  readonly globalDataStats = computed(() => {
    const allUsers = this.userService.allUsers();
    const allCheckIns = this.checkinService.allCheckIns();
    
    return {
      totalUsers: allUsers.length,
      totalCheckIns: allCheckIns.length,
      activeUsers: new Set(allCheckIns.map(c => c.userId)).size,
      lastLoaded: new Date().toISOString()
    };
  });

  // Public refresh method using our new global approach
  async refresh(): Promise<void> {
    console.log('[LeaderboardStore] Refreshing with pure signal approach...');
    await this.refreshGlobalData();
  }
}
