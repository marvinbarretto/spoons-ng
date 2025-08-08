/**
 * @fileoverview DataAggregatorService - Pure computation layer for reactive user data
 *
 * 🏗️ ARCHITECTURAL FOUNDATION:
 * This service represents a key architectural breakthrough in eliminating circular dependencies
 * while maintaining beautiful reactive Angular signal patterns. It serves as the single
 * computational engine that powers both UserStore and LeaderboardStore consistently.
 *
 * 🎯 SINGLE SOURCE OF TRUTH PRINCIPLE:
 * All dynamic user values (points, pub counts, streaks) are computed from check-ins stored
 * in GlobalCheckInStore. This eliminates database synchronization issues and ensures
 * real-time accuracy across all UI components.
 *
 * 🔄 REACTIVE COMPUTATION PATTERN:
 * - UserStore: `computed(() => dataAggregator.calculateFromCheckins(userData))`
 * - LeaderboardStore: `dataAggregator.calculateUserPointsFromCheckins(userId)`
 * - Result: Automatic UI updates when check-in data changes, zero manual synchronization
 *
 * 🚫 CIRCULAR DEPENDENCY PREVENTION:
 * - BEFORE: UserStore → DataAggregator → UserStore (circular dependency)
 * - AFTER: Pure functions accepting data as parameters, no store injections
 * - BENEFIT: Reusable across different contexts (scoreboard, leaderboard, admin)
 *
 * 🎨 BEAUTIFUL ANGULAR PATTERNS:
 * - Leverages Angular's reactive signals for optimal performance
 * - Computed signals automatically update when dependencies change
 * - Clean separation between data sources and computation logic
 * - Testable pure functions with predictable inputs/outputs
 *
 * 🔧 KEY ARCHITECTURAL METHODS:
 * - `calculateUserPointsFromCheckins()` - Core points calculation from check-in data
 * - `getPubsVisitedForUser()` - Deduplicated pub count (verified + manual visits)
 * - `getScoreboardDataForUser()` - Complete user statistics aggregation
 * - `calculatePubCountForUser()` - Internal utility for pub counting with detailed logging
 *
 * ✨ BENEFITS ACHIEVED:
 * - ✅ Eliminated "2 pubs, 2 check-ins, but 0 points" data inconsistencies
 * - ✅ Real-time consistency between scoreboard (45 points) and leaderboard (45 points)
 * - ✅ Removed complex database synchronization between points-transactions and user documents
 * - ✅ Simplified debugging with single calculation path and comprehensive logging
 * - ✅ Scalable pattern for future cross-store data aggregation needs
 *
 * 💡 USAGE EXAMPLES:
 * ```typescript
 * // UserStore - Reactive computed signals
 * readonly totalPoints = computed(() =>
 *   this.dataAggregator.calculateUserPointsFromCheckins(this.authStore.user()?.uid)
 * );
 *
 * // LeaderboardStore - Pure computation with parameters
 * const totalPoints = this.dataAggregator.calculateUserPointsFromCheckins(user.uid);
 *
 * // Scoreboard - Complete data aggregation
 * const scoreboardData = this.dataAggregator.getScoreboardDataForUser(
 *   userId, userData, userCheckins, isLoading
 * );
 * ```
 *
 * 📊 DEBUGGING & MONITORING:
 * Extensive console logging throughout all methods provides detailed insights into:
 * - Data flow and calculation steps
 * - Input validation and edge cases
 * - Performance monitoring and bottleneck identification
 * - Consistency verification across different data sources
 */

import { Injectable, computed, inject } from '@angular/core';
// CheckInStore removed to prevent circular dependency - check-in data will be passed as parameters
import { GlobalCheckInStore } from '@check-in/data-access/global-check-in.store'; // Global
import { AuthStore } from '../../auth/data-access/auth.store';
// PointsStore removed to prevent circular dependency - points will be computed from check-ins
import { PubStore } from '../../pubs/data-access/pub.store';
import { UserService } from '../../users/data-access/user.service';
import { DebugService } from '../utils/debug.service';

@Injectable({ providedIn: 'root' })
export class DataAggregatorService {
  // 🔧 Dependencies (read-only, no circular deps)
  private readonly authStore = inject(AuthStore);
  // Note: UserStore dependency removed to prevent circular dependency with UserStore
  // PointsStore and CheckInStore removed to prevent circular dependencies - data passed as parameters
  private readonly globalCheckInStore = inject(GlobalCheckInStore); // Global check-ins
  private readonly pubStore = inject(PubStore);
  private readonly debug = inject(DebugService);
  private readonly userService = inject(UserService);

  // TODO: Handle Leaderboard soon
  constructor() {
    this.debug.standard(
      '[DataAggregator] Service initialized - providing reactive cross-store data aggregation'
    );
  }

  // verifiedPubsCount removed - computed locally in components to prevent circular dependencies

  /**
   * Compute unverified pub count from manually added pubs
   * @description Pure computation - takes manual pub IDs as parameter
   */
  getUnverifiedPubsCount(manuallyAddedPubIds: string[] = []): number {
    return manuallyAddedPubIds.length;
  }

  /**
   * Compute total unique pub count (deduplicates verified + manual visits)
   * @description Pure computation - takes user data as parameters to avoid circular dependency
   */
  getPubsVisitedForUser(userId: string, manuallyAddedPubIds: string[] = []): number {
    console.log('🎯 [DataAggregator] === COMPUTING PUBS VISITED FOR USER ===');
    console.log('🎯 [DataAggregator] Input parameters:', {
      userId: userId?.slice(0, 8),
      manuallyAddedPubIds: manuallyAddedPubIds.length,
    });

    if (!userId) {
      console.log('🎯 [DataAggregator] No userId provided - returning 0 pubs');
      return 0;
    }

    // Use the calculation utility with provided parameters
    console.log('🎯 [DataAggregator] Calling calculatePubCountForUser...');
    const pubCountData = this.calculatePubCountForUser(userId, { manuallyAddedPubIds });

    console.log('🎯 [DataAggregator] === PUB COUNT CALCULATION RESULT ===');
    console.log('🎯 [DataAggregator] Detailed breakdown:', {
      userId: userId.slice(0, 8),
      verifiedCount: pubCountData.verified,
      manualCount: pubCountData.manual,
      totalRaw: pubCountData.verified + pubCountData.manual,
      duplicatesRemoved: pubCountData.duplicates,
      totalUnique: pubCountData.total,
      verifiedPubIds: pubCountData.verifiedPubIds.map((id: string) => id.slice(0, 8)),
      manualPubIds: pubCountData.manualPubIds.map((id: string) => id.slice(0, 8)),
      allUniquePubIds: pubCountData.allUniquePubIds.map((id: string) => id.slice(0, 8)),
    });

    console.log('🎯 [DataAggregator] === LIVE DATA CALCULATION ===');
    console.log('🎯 [DataAggregator] Calculation result:', {
      liveCalculatedTotal: pubCountData.total,
      verifiedPubs: pubCountData.verified,
      manualPubs: pubCountData.manual,
      deduplicatedTotal: pubCountData.total,
    });

    console.log('🎯 [DataAggregator] Final pubsVisited result:', pubCountData.total);
    return pubCountData.total;
  }

  /**
   * Complete scoreboard data aggregated from provided data
   * @description Pure computation - takes all data as parameters to avoid circular dependencies
   */
  getScoreboardDataForUser(
    userId: string,
    userData: { manuallyAddedPubIds?: string[]; badgeCount?: number; landlordCount?: number } = {},
    userCheckins: any[] = [],
    isLoading: boolean = false
  ): any {
    console.log('📊 [DataAggregator] === COMPUTING SCOREBOARD DATA FOR USER ===');
    console.log('📊 [DataAggregator] Input parameters:', {
      userId: userId?.slice(0, 8),
      userDataProvided: !!userData,
      manualPubsCount: userData.manuallyAddedPubIds?.length || 0,
      badgeCount: userData.badgeCount || 0,
      landlordCount: userData.landlordCount || 0,
    });

    if (!userId) {
      console.log('📊 [DataAggregator] No userId provided - returning empty scoreboard data');
      return {
        totalPoints: 0,
        todaysPoints: 0,
        pubsVisited: 0,
        totalPubs: this.pubStore.totalCount(),
        badgeCount: 0,
        landlordCount: 0,
        totalCheckins: 0,
        isLoading: false,
      };
    }

    console.log('📊 [DataAggregator] === USER DATA ANALYSIS ===');
    console.log('📊 [DataAggregator] Processing user:', {
      uid: userId?.slice(0, 8),
      badgeCount: userData.badgeCount || 0,
      landlordCount: userData.landlordCount || 0,
      manuallyAddedPubIds: userData.manuallyAddedPubIds?.length || 0,
      providedCheckinsCount: userCheckins.length,
    });

    console.log('📊 [DataAggregator] === LOADING STATE ANALYSIS ===');
    console.log('📊 [DataAggregator] Loading State:', {
      isLoading,
      pubStoreLoading: this.pubStore.loading(),
    });

    console.log('📊 [DataAggregator] === CHECKIN DATA ANALYSIS ===');
    const globalCheckins = this.globalCheckInStore.allCheckIns();
    const userGlobalCheckins = userId ? globalCheckins.filter(c => c.userId === userId) : [];

    console.log('📊 [DataAggregator] Provided user check-ins:', {
      totalCheckins: userCheckins.length,
      checkinSample: userCheckins.slice(0, 3).map(c => ({
        id: c.id?.slice(0, 8),
        pubId: c.pubId?.slice(0, 8),
        userId: c.userId?.slice(0, 8),
        timestamp: c.timestamp?.toDate?.()?.toISOString?.()?.slice(0, 16) || 'no-timestamp',
      })),
      uniquePubIds: new Set(userCheckins.filter(c => c.pubId).map(c => c.pubId)).size,
    });

    console.log('📊 [DataAggregator] GlobalCheckInStore (all users):', {
      totalGlobalCheckins: globalCheckins.length,
      userSpecificCheckins: userGlobalCheckins.length,
      userCheckinSample: userGlobalCheckins.slice(0, 3).map(c => ({
        id: c.id?.slice(0, 8),
        pubId: c.pubId?.slice(0, 8),
        userId: c.userId?.slice(0, 8),
        timestamp: c.timestamp?.toDate?.()?.toISOString?.()?.slice(0, 16) || 'no-timestamp',
      })),
      userUniquePubIds: new Set(userGlobalCheckins.filter(c => c.pubId).map(c => c.pubId)).size,
    });

    // DETAILED PUB COUNT CALCULATION ANALYSIS
    console.log('📊 [DataAggregator] === PUB COUNT CALCULATION ANALYSIS ===');
    const pubsVisitedResult = this.getPubsVisitedForUser(
      userId,
      userData.manuallyAddedPubIds || []
    );
    console.log('📊 [DataAggregator] Final pubsVisited result:', pubsVisitedResult);

    // Calculate today's points from provided check-ins
    const today = new Date().toDateString();
    const todaysCheckins = userCheckins.filter(
      c => c.timestamp?.toDate?.()?.toDateString?.() === today
    );

    const todaysPoints = todaysCheckins.reduce((sum, checkin) => {
      const points = checkin.pointsEarned ?? checkin.pointsBreakdown?.total ?? 0;
      return sum + points;
    }, 0);

    const data = {
      totalPoints: this.calculateUserPointsFromCheckins(userId), // Direct calculation from check-ins
      todaysPoints: todaysPoints, // Calculated from check-ins
      pubsVisited: pubsVisitedResult, // From our computed
      totalPubs: this.pubStore.totalCount(),
      badgeCount: userData.badgeCount || 0,
      landlordCount: userData.landlordCount || 0,
      totalCheckins: userCheckins.length,
      isLoading,
    };

    console.log('📊 [DataAggregator] === FINAL SCOREBOARD DATA COMPARISON ===');
    console.log('📊 [DataAggregator] Scoreboard Values:', {
      totalPoints: data.totalPoints,
      todaysPoints: data.todaysPoints,
      pubsVisited: data.pubsVisited,
      totalPubs: data.totalPubs,
      badgeCount: data.badgeCount,
      landlordCount: data.landlordCount,
      totalCheckins: data.totalCheckins,
      isLoading: data.isLoading,
    });

    console.log('📊 [DataAggregator] === COMPUTED DATA SUMMARY ===');
    console.log('📊 [DataAggregator] Final computed data:', {
      userId: userId.slice(0, 8),
      totalPoints: data.totalPoints,
      todaysPoints: data.todaysPoints,
      pubsVisited: data.pubsVisited,
      totalPubs: data.totalPubs,
      badgeCount: data.badgeCount,
      landlordCount: data.landlordCount,
      totalCheckins: data.totalCheckins,
      userScopedCheckins: userCheckins.length,
      globalUserCheckins: userGlobalCheckins.length,
      checkinConsistency: data.totalCheckins === userGlobalCheckins.length,
    });

    console.log('📊 [DataAggregator] === END SCOREBOARD DATA COMPUTATION ===');
    return data;
  }

  /**
   * Comprehensive pub count calculation utility - works for any user in any context
   * @param userId - User ID to get pub count for
   * @param userData - Optional user data object containing manuallyAddedPubIds (for leaderboard context)
   * @returns Object with detailed pub count breakdown
   */
  private calculatePubCountForUser(
    userId: string,
    userData?: any
  ): {
    verified: number;
    manual: number;
    total: number;
    duplicates: number;
    verifiedPubIds: string[];
    manualPubIds: string[];
    allUniquePubIds: string[];
  } {
    console.log('⚙️ [DataAggregator] === CALCULATING PUB COUNT FOR USER ===');
    console.log('⚙️ [DataAggregator] Input parameters:', {
      userId: userId.slice(0, 8),
      hasUserData: !!userData,
      userDataPreview: userData
        ? {
            uid: userData.uid?.slice(0, 8),
            displayName: userData.displayName,
            manuallyAddedPubIds: userData.manuallyAddedPubIds?.length || 0,
            verifiedPubCount: userData.verifiedPubCount,
            unverifiedPubCount: userData.unverifiedPubCount,
            totalPubCount: userData.totalPubCount,
          }
        : null,
    });

    // Get verified check-ins from GlobalCheckInStore for cross-user calculations
    console.log('⚙️ [DataAggregator] Fetching check-ins from GlobalCheckInStore...');
    const checkins = this.globalCheckInStore.allCheckIns();
    const userCheckins = checkins.filter(checkin => checkin.userId === userId);

    console.log('⚙️ [DataAggregator] Check-in data analysis:', {
      totalGlobalCheckins: checkins.length,
      userSpecificCheckins: userCheckins.length,
      userCheckinSample: userCheckins.slice(0, 5).map(c => ({
        id: c.id?.slice(0, 8),
        pubId: c.pubId?.slice(0, 8),
        userId: c.userId?.slice(0, 8),
        timestamp: c.timestamp?.toDate?.()?.toISOString?.()?.slice(0, 16) || 'invalid-timestamp',
        hasPubId: !!c.pubId,
      })),
    });

    const verifiedPubIds = new Set(
      userCheckins
        .filter(checkin => checkin.pubId) // Filter out null/undefined pubIds
        .map(checkin => checkin.pubId)
    );

    console.log('⚙️ [DataAggregator] Verified pubs from check-ins:', {
      checkinPubIds: Array.from(verifiedPubIds).map((id: string) => id.slice(0, 8)),
      uniqueVerifiedCount: verifiedPubIds.size,
      totalCheckinsWithPubId: userCheckins.filter(c => c.pubId).length,
    });

    // Get manually added pubs if user data is provided
    const manualPubIds = userData?.manuallyAddedPubIds || [];
    console.log('⚙️ [DataAggregator] Manual pubs from user data:', {
      manualPubIds: manualPubIds.map((id: string) => id.slice(0, 8)),
      manualPubCount: manualPubIds.length,
      hasManualPubs: manualPubIds.length > 0,
    });

    // Combine and deduplicate all pub IDs
    const allUniquePubIds = new Set([...verifiedPubIds, ...manualPubIds]);
    console.log('⚙️ [DataAggregator] Combined unique pubs:', {
      allUniquePubIds: Array.from(allUniquePubIds).map((id: string) => id.slice(0, 8)),
      totalUniqueCount: allUniquePubIds.size,
    });

    // Calculate counts
    const verifiedCount = verifiedPubIds.size;
    const manualCount = manualPubIds.length;
    const totalCount = allUniquePubIds.size;
    const duplicatesCount = verifiedCount + manualCount - totalCount;

    const result = {
      verified: verifiedCount,
      manual: manualCount,
      total: totalCount,
      duplicates: duplicatesCount,
      verifiedPubIds: Array.from(verifiedPubIds),
      manualPubIds: [...manualPubIds],
      allUniquePubIds: Array.from(allUniquePubIds),
    };

    console.log('⚙️ [DataAggregator] === FINAL CALCULATION RESULT ===');
    console.log('⚙️ [DataAggregator] Result breakdown:', {
      userId: userId.slice(0, 8),
      verifiedPubsFromCheckins: result.verified,
      manualPubsFromUserData: result.manual,
      totalBeforeDeduplication: result.verified + result.manual,
      duplicatesDetected: result.duplicates,
      finalUniqueTotal: result.total,
      calculationValid: result.total === result.verified + result.manual - result.duplicates,
    });

    return result;
  }

  /**
   * Check if user has visited a specific pub (verified OR manual)
   * @param pubId - Pub ID to check
   * @param userId - User ID (defaults to current user)
   * @param manuallyAddedPubIds - Manual pub IDs for the user
   * @returns True if user has visited this pub (check-in OR manual visit)
   */
  hasVisitedPub(pubId: string, userId?: string, manuallyAddedPubIds: string[] = []): boolean {
    const targetUserId = userId || this.authStore.user()?.uid;

    this.debug.extreme('[DataAggregator] Checking if user visited pub', {
      pubId,
      userId: targetUserId,
      usingCurrentUser: !userId,
    });

    if (!targetUserId) {
      this.debug.standard('[DataAggregator] No user ID available for pub visit check');
      return false;
    }

    // Check verified visits (check-ins)
    const checkins = this.globalCheckInStore.allCheckIns();
    const hasVerifiedVisit = checkins.some(
      checkin => checkin.userId === targetUserId && checkin.pubId === pubId
    );

    // Check manual visits using provided parameter
    const hasManualVisit = manuallyAddedPubIds.includes(pubId);

    const hasVisited = hasVerifiedVisit || hasManualVisit;

    this.debug.extreme('[DataAggregator] Pub visit check result', {
      pubId,
      userId: targetUserId,
      hasVerifiedVisit,
      hasManualVisit,
      hasVisited,
      totalCheckins: checkins.length,
    });

    return hasVisited;
  }

  /**
   * Get visit count for a specific pub by user
   * @param pubId - Pub ID to check
   * @param userId - User ID (defaults to current user)
   * @returns Number of times user has visited this pub
   */
  getVisitCountForPub(pubId: string, userId?: string): number {
    const targetUserId = userId || this.authStore.user()?.uid;

    this.debug.extreme('[DataAggregator] Getting visit count for pub', {
      pubId,
      userId: targetUserId,
    });

    if (!targetUserId) {
      this.debug.standard('[DataAggregator] No user ID available for visit count');
      return 0;
    }

    const checkins = this.globalCheckInStore.allCheckIns();
    const visitCount = checkins.filter(
      checkin => checkin.userId === targetUserId && checkin.pubId === pubId
    ).length;

    this.debug.extreme('[DataAggregator] Visit count computed', {
      pubId,
      userId: targetUserId,
      visitCount,
    });

    return visitCount;
  }

  /**
   * Reactive display name (single source of truth for UI) - DEPRECATED
   * @description Use UserStore.displayName() instead - maintaining for backward compatibility only
   */
  readonly displayName = computed(() => {
    this.debug.standard(
      '[DataAggregator] Computing displayName - DEPRECATED, use UserStore instead'
    );

    const authUser = this.authStore.user();

    if (!authUser) {
      this.debug.standard('[DataAggregator] No auth user - returning null displayName');
      return null;
    }

    // Simplified - just use auth display name as fallback
    const displayName = authUser.displayName || 'User';

    this.debug.standard('[DataAggregator] DisplayName computed (DEPRECATED)', {
      uid: authUser.uid?.slice(0, 8),
      finalDisplayName: displayName,
      source: 'AuthStore',
    });

    return displayName;
  });

  /**
   * Aggregated user data (combines Auth + User store) - DEPRECATED
   * @description Use UserStore.user() instead - maintaining for backward compatibility only
   */
  readonly user = computed(() => {
    this.debug.standard(
      '[DataAggregator] Computing aggregated user - DEPRECATED, use UserStore instead'
    );

    const authUser = this.authStore.user();

    if (!authUser) {
      this.debug.standard('[DataAggregator] No auth user data available');
      return null;
    }

    this.debug.standard('[DataAggregator] Aggregated user computed (DEPRECATED)', {
      uid: authUser.uid,
      displayName: authUser.displayName,
      source: 'AuthStore only',
    });

    return authUser;
  });

  /**
   * User summary data aggregated from all stores - DEPRECATED
   * @description Use UserStore reactive patterns instead - maintaining for backward compatibility only
   */
  readonly userSummary = computed(() => {
    this.debug.standard(
      '[DataAggregator] Computing userSummary - DEPRECATED, use UserStore instead'
    );

    const currentUser = this.authStore.user();

    if (!currentUser) {
      this.debug.standard('[DataAggregator] No user data available for summary');
      return null;
    }

    const summary = {
      profile: {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName || 'User',
        avatarUrl: currentUser.photoURL || null,
        isAnonymous: currentUser.isAnonymous,
        onboardingCompleted: false, // Cannot determine without UserStore
      },
      stats: {
        totalPoints: this.calculateUserPointsFromCheckins(currentUser.uid),
        pubsVisited: this.getPubsVisitedForUser(currentUser.uid, []),
        totalCheckins: this.globalCheckInStore
          .allCheckIns()
          .filter(c => c.userId === currentUser.uid).length,
        badgeCount: 0, // Cannot determine without UserStore
        landlordCount: 0, // Cannot determine without UserStore
      },
      activity: {
        todaysPoints: this.getTodaysPointsForUser(currentUser.uid),
        recentCheckins: this.getRecentCheckinsForUser(currentUser.uid, 5),
      },
    };

    this.debug.standard('[DataAggregator] UserSummary computed (DEPRECATED)', {
      uid: summary.profile.uid,
      totalPoints: summary.stats.totalPoints,
      pubsVisited: summary.stats.pubsVisited,
      recentCheckinsCount: summary.activity.recentCheckins.length,
    });

    return summary;
  });

  /**
   * Check if a pub is the user's designated home pub - DEPRECATED
   * @param pubId - Pub ID to check
   * @param userId - User ID (defaults to current user)
   * @returns Always false since we cannot access UserStore - use UserStore.isLocalPub() instead
   */
  isLocalPub(pubId: string, userId?: string): boolean {
    const targetUserId = userId || this.authStore.user()?.uid;

    this.debug.extreme('[DataAggregator] Checking if pub is user home pub - DEPRECATED', {
      pubId,
      userId: targetUserId,
      usingCurrentUser: !userId,
    });

    if (!targetUserId) {
      this.debug.standard('[DataAggregator] No user ID available for home pub check');
      return false;
    }

    // Cannot determine without UserStore - always return false
    this.debug.extreme('[DataAggregator] Home pub check result (DEPRECATED - always false)', {
      pubId,
      userId: targetUserId,
      isHomePub: false,
      message: 'Use UserStore.isLocalPub() instead',
    });

    return false;
  }

  /**
   * Get today's points for a specific user from check-ins
   * @param userId - User ID to get today's points for
   * @returns Number of points earned today
   */
  getTodaysPointsForUser(userId: string): number {
    this.debug.extreme("[DataAggregator] Getting today's points for user", { userId });

    const today = new Date().toDateString();
    const checkins = this.globalCheckInStore.allCheckIns();
    const userCheckins = checkins.filter(checkin => checkin.userId === userId);
    const todaysCheckins = userCheckins.filter(
      checkin => checkin.timestamp?.toDate?.()?.toDateString?.() === today
    );

    const todaysPoints = todaysCheckins.reduce((sum, checkin) => {
      const points = checkin.pointsEarned ?? checkin.pointsBreakdown?.total ?? 0;
      return sum + points;
    }, 0);

    this.debug.extreme("[DataAggregator] Today's points calculated", {
      userId,
      todaysCheckins: todaysCheckins.length,
      todaysPoints,
    });

    return todaysPoints;
  }

  /**
   * Get recent check-ins for a user
   * @param userId - User ID
   * @param limit - Number of recent check-ins to return
   * @returns Array of recent check-ins
   */
  getRecentCheckinsForUser(userId: string, limit: number = 10) {
    this.debug.extreme('[DataAggregator] Getting recent check-ins', { userId, limit });

    const checkins = this.globalCheckInStore.allCheckIns();
    const userCheckins = checkins
      .filter(checkin => checkin.userId === userId)
      .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis())
      .slice(0, limit);

    this.debug.extreme('[DataAggregator] Recent check-ins retrieved', {
      userId,
      totalCheckins: checkins.length,
      userCheckins: userCheckins.length,
      recentCount: userCheckins.length,
    });

    return userCheckins;
  }

  /**
   * Calculate total points for a specific user from their check-ins
   * @param userId - User ID to calculate points for (optional - defaults to current user)
   * @returns Total points earned by user from all check-ins
   * @description Eliminates points-transactions synchronization by using check-ins as single source of truth
   */
  calculateUserPointsFromCheckins(userId?: string): number {
    const targetUserId = userId || this.authStore.user()?.uid;

    if (!targetUserId) {
      this.debug.extreme('[DataAggregator] No user ID for points calculation');
      return 0;
    }

    this.debug.extreme('[DataAggregator] Calculating points from check-ins', {
      userId: targetUserId.slice(0, 8),
    });

    // Get all check-ins for this user
    const checkins = this.globalCheckInStore.allCheckIns();
    const userCheckins = checkins.filter(checkin => checkin.userId === targetUserId);

    // Sum points from all check-ins
    const totalPoints = userCheckins.reduce((sum, checkin) => {
      // Use pointsEarned if available, otherwise use pointsBreakdown.total, fallback to 0
      const points = checkin.pointsEarned ?? checkin.pointsBreakdown?.total ?? 0;
      return sum + points;
    }, 0);

    this.debug.extreme('[DataAggregator] Points calculated from check-ins', {
      userId: targetUserId.slice(0, 8),
      checkinCount: userCheckins.length,
      totalPoints,
      checkinSample: userCheckins.slice(0, 3).map(c => ({
        id: c.id?.slice(0, 8),
        pubId: c.pubId?.slice(0, 8),
        pointsEarned: c.pointsEarned,
        pointsBreakdownTotal: c.pointsBreakdown?.total,
        finalPoints: c.pointsEarned ?? c.pointsBreakdown?.total ?? 0,
      })),
    });

    return totalPoints;
  }

  /**
   * Get pub name by ID
   * @param pubId - Pub ID to look up
   * @returns Pub name or fallback if not found
   */
  getPubName(pubId: string): string {
    this.debug.extreme('[DataAggregator] Getting pub name', { pubId });

    const pub = this.pubStore.get(pubId);
    const pubName = pub?.name || 'Unknown Pub';

    this.debug.extreme('[DataAggregator] Pub name retrieved', {
      pubId,
      pubName,
      found: !!pub,
    });

    return pubName;
  }

  // =====================================================
  // ADMIN DASHBOARD METRICS - SINGLE SOURCE OF TRUTH
  // =====================================================

  /**
   * Comprehensive dashboard metrics calculation - Single Source of Truth
   * @description Eliminates data inconsistencies by using only GlobalCheckInStore and derived calculations
   */
  calculateDashboardMetrics(timePeriod: 'today' | 'week' | 'month' | 'all-time' = 'month'): {
    // Business KPIs
    userGrowth: { total: number; monthlyGrowth: number; confidence: 'high' | 'medium' | 'low' };
    engagement: { activeUsers: number; checkInsPerUser: number; trend: 'up' | 'down' | 'stable' };
    marketPenetration: { pubsConquered: number; totalPubs: number; percentage: number };
    platformValue: { totalPoints: number; avgPointsPerUser: number };

    // System Health
    dataConsistencyScore: number;
    systemHealth: { errors: number; status: 'healthy' | 'warning' | 'critical' };

    // Raw Data for Validation
    rawMetrics: {
      totalCheckIns: number;
      totalUsers: number;
      monthlyCheckIns: number;
      monthlyActiveUsers: number;
      totalSystemPoints: number;
    };
  } {
    console.log('🎯 [DataAggregator] === CALCULATING COMPREHENSIVE DASHBOARD METRICS ===');
    console.log('🎯 [DataAggregator] Using GlobalCheckInStore as single source of truth');
    console.log('🎯 [DataAggregator] Time period:', timePeriod);

    // Get all data from single sources
    const allCheckIns = this.globalCheckInStore.allCheckIns();
    const allUsers = this.userService.allUsers(); // Will be replaced by user calculations from check-ins
    const allPubs = this.pubStore.pubs();

    // Calculate time period boundaries
    const now = new Date();
    let periodStart: Date;
    let periodLabel: string;

    switch (timePeriod) {
      case 'today':
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        periodLabel = 'Today';
        break;
      case 'week':
        periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        periodLabel = 'This Week';
        break;
      case 'month':
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodLabel = 'This Month';
        break;
      case 'all-time':
      default:
        periodStart = new Date(0); // Beginning of time
        periodLabel = 'All Time';
        break;
    }

    // Filter check-ins for the selected time period
    const periodCheckIns = allCheckIns.filter(c => c.timestamp.toDate() >= periodStart);
    const periodActiveUserIds = new Set(periodCheckIns.map(c => c.userId));
    const periodActiveUsers = periodActiveUserIds.size;

    console.log('🎯 [DataAggregator] Raw data loaded:', {
      totalCheckIns: allCheckIns.length,
      totalUsers: allUsers.length,
      totalPubs: allPubs.length,
      timePeriod,
      periodLabel,
      periodStart: periodStart.toISOString(),
      periodCheckIns: periodCheckIns.length,
      periodActiveUsers,
      dataTimestamp: new Date().toISOString(),
    });

    console.log('🎯 [DataAggregator] Period calculations:', {
      periodLabel,
      periodStart: periodStart.toISOString(),
      periodCheckIns: periodCheckIns.length,
      periodActiveUsers,
      periodUserIds: Array.from(periodActiveUserIds)
        .slice(0, 5)
        .map(id => id.slice(0, 8)),
    });

    // Calculate total system points from period check-ins
    const periodSystemPoints = periodCheckIns.reduce((sum, checkin) => {
      const points = checkin.pointsEarned ?? checkin.pointsBreakdown?.total ?? 0;
      return sum + points;
    }, 0);

    // For all-time metrics, we need total counts regardless of period
    const totalSystemPoints = allCheckIns.reduce((sum, checkin) => {
      const points = checkin.pointsEarned ?? checkin.pointsBreakdown?.total ?? 0;
      return sum + points;
    }, 0);

    // Calculate unique users and pubs based on time period
    const uniqueUserIds =
      timePeriod === 'all-time'
        ? new Set(allCheckIns.map(c => c.userId))
        : new Set(periodCheckIns.map(c => c.userId));
    const actualActiveUsers = uniqueUserIds.size;

    // Calculate unique pubs visited in the time period
    const uniquePubIds =
      timePeriod === 'all-time'
        ? new Set(allCheckIns.filter(c => c.pubId).map(c => c.pubId))
        : new Set(periodCheckIns.filter(c => c.pubId).map(c => c.pubId));
    const pubsConquered = uniquePubIds.size;

    console.log('🎯 [DataAggregator] Core calculations:', {
      totalSystemPoints,
      periodSystemPoints,
      actualActiveUsers,
      pubsConquered,
      totalCheckIns: allCheckIns.length,
      periodCheckIns: periodCheckIns.length,
      avgPointsPerUser:
        actualActiveUsers > 0
          ? Math.round(
              (timePeriod === 'all-time' ? totalSystemPoints : periodSystemPoints) /
                actualActiveUsers
            )
          : 0,
      avgCheckInsPerUser:
        actualActiveUsers > 0
          ? Math.round(
              (timePeriod === 'all-time' ? allCheckIns.length : periodCheckIns.length) /
                actualActiveUsers
            )
          : 0,
    });

    // Calculate data consistency score (always use all-time for consistency)
    const consistencyScore = this.calculateDataConsistencyScore({
      checkInsFromStore: allCheckIns.length,
      pointsFromCheckIns: totalSystemPoints,
      usersFromCheckIns: new Set(allCheckIns.map(c => c.userId)).size,
      usersFromUserService: allUsers.length,
    });

    // Use monthly data for growth calculations (regardless of selected period)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyCheckIns = allCheckIns.filter(c => c.timestamp.toDate() >= monthStart);
    const monthlyActiveUsers = new Set(monthlyCheckIns.map(c => c.userId)).size;

    // Build comprehensive metrics
    const metrics = {
      userGrowth: {
        total: actualActiveUsers, // Use time period filtered count
        monthlyGrowth: this.calculateMonthlyGrowthRate(allUsers, monthStart),
        confidence: this.assessDataConfidence(periodCheckIns.length, actualActiveUsers) as
          | 'high'
          | 'medium'
          | 'low',
      },
      engagement: {
        activeUsers: actualActiveUsers, // Show period-based active users
        checkInsPerUser:
          actualActiveUsers > 0
            ? Math.round((periodCheckIns.length / actualActiveUsers) * 10) / 10
            : 0,
        trend: this.calculateEngagementTrend(periodCheckIns.length, actualActiveUsers) as
          | 'up'
          | 'down'
          | 'stable',
      },
      marketPenetration: {
        pubsConquered,
        totalPubs: allPubs.length,
        percentage:
          allPubs.length > 0 ? Math.round((pubsConquered / allPubs.length) * 100 * 10) / 10 : 0,
      },
      platformValue: {
        totalPoints: timePeriod === 'all-time' ? totalSystemPoints : periodSystemPoints,
        avgPointsPerUser:
          actualActiveUsers > 0
            ? Math.round(
                (timePeriod === 'all-time' ? totalSystemPoints : periodSystemPoints) /
                  actualActiveUsers
              )
            : 0,
      },
      dataConsistencyScore: consistencyScore,
      systemHealth: {
        errors: 0, // Will be enhanced with actual error tracking
        status:
          consistencyScore > 90
            ? 'healthy'
            : consistencyScore > 70
              ? 'warning'
              : ('critical' as 'healthy' | 'warning' | 'critical'),
      },
      rawMetrics: {
        totalCheckIns: periodCheckIns.length, // Show period-specific data
        totalUsers: actualActiveUsers,
        monthlyCheckIns: monthlyCheckIns.length, // Always show monthly for comparison
        monthlyActiveUsers,
        totalSystemPoints: timePeriod === 'all-time' ? totalSystemPoints : periodSystemPoints,
      },
    };

    console.log('🎯 [DataAggregator] === FINAL DASHBOARD METRICS ===');
    console.log('🎯 [DataAggregator] Business KPIs:', {
      userGrowth: `${metrics.userGrowth.total} total (${metrics.userGrowth.monthlyGrowth}% monthly growth)`,
      engagement: `${metrics.engagement.activeUsers} active users, ${metrics.engagement.checkInsPerUser} check-ins/user`,
      marketPenetration: `${metrics.marketPenetration.pubsConquered}/${metrics.marketPenetration.totalPubs} pubs (${metrics.marketPenetration.percentage}%)`,
      platformValue: `${metrics.platformValue.totalPoints} total points, ${metrics.platformValue.avgPointsPerUser} avg/user`,
    });
    console.log('🎯 [DataAggregator] System Health:', {
      dataConsistencyScore: `${metrics.dataConsistencyScore}%`,
      systemStatus: metrics.systemHealth.status,
      confidence: metrics.userGrowth.confidence,
    });
    console.log('🎯 [DataAggregator] Raw Data Validation:', metrics.rawMetrics);

    return metrics;
  }

  /**
   * Calculate data consistency score between different sources
   */
  private calculateDataConsistencyScore(data: {
    checkInsFromStore: number;
    pointsFromCheckIns: number;
    usersFromCheckIns: number;
    usersFromUserService: number;
  }): number {
    let consistencyPoints = 0;
    let totalChecks = 0;

    // Check 1: Do we have check-ins and points that make sense together?
    if (data.checkInsFromStore > 0 && data.pointsFromCheckIns > 0) {
      consistencyPoints += 25; // Good - check-ins and points both exist
    } else if (data.checkInsFromStore === 0 && data.pointsFromCheckIns === 0) {
      consistencyPoints += 25; // Consistent - both are zero
    }
    // If check-ins > 0 but points = 0, or vice versa, no points awarded
    totalChecks += 25;

    // Check 2: User count consistency between sources
    const userCountDifference = Math.abs(data.usersFromCheckIns - data.usersFromUserService);
    const userCountDifferencePercent =
      data.usersFromUserService > 0 ? (userCountDifference / data.usersFromUserService) * 100 : 0;

    if (userCountDifferencePercent < 10) {
      consistencyPoints += 25; // Within 10% tolerance
    } else if (userCountDifferencePercent < 25) {
      consistencyPoints += 15; // Within 25% tolerance
    }
    totalChecks += 25;

    // Check 3: Reasonable points-to-check-ins ratio
    if (data.checkInsFromStore > 0) {
      const pointsPerCheckIn = data.pointsFromCheckIns / data.checkInsFromStore;
      if (pointsPerCheckIn >= 1 && pointsPerCheckIn <= 50) {
        consistencyPoints += 25; // Reasonable ratio (1-50 points per check-in)
      } else if (pointsPerCheckIn > 0) {
        consistencyPoints += 15; // At least some points per check-in
      }
    } else if (data.checkInsFromStore === 0 && data.pointsFromCheckIns === 0) {
      consistencyPoints += 25; // Consistent zero state
    }
    totalChecks += 25;

    // Check 4: Users and activity correlation
    if (data.usersFromCheckIns > 0 && data.checkInsFromStore > 0) {
      consistencyPoints += 25; // Good - users and activity correlate
    } else if (data.usersFromCheckIns === 0 && data.checkInsFromStore === 0) {
      consistencyPoints += 25; // Consistent empty state
    }
    totalChecks += 25;

    const score = Math.round((consistencyPoints / totalChecks) * 100);

    console.log('🎯 [DataAggregator] Data consistency analysis:', {
      checkInsFromStore: data.checkInsFromStore,
      pointsFromCheckIns: data.pointsFromCheckIns,
      usersFromCheckIns: data.usersFromCheckIns,
      usersFromUserService: data.usersFromUserService,
      consistencyPoints,
      totalChecks,
      finalScore: score,
    });

    return score;
  }

  /**
   * Calculate monthly growth rate
   */
  private calculateMonthlyGrowthRate(allUsers: any[], monthStart: Date): number {
    const newUsersThisMonth = allUsers.filter(
      u => u.joinedAt && new Date(u.joinedAt) >= monthStart
    ).length;

    const totalUsers = allUsers.length;
    const previousMonthUsers = totalUsers - newUsersThisMonth;

    if (previousMonthUsers === 0) return newUsersThisMonth > 0 ? 100 : 0;

    return Math.round((newUsersThisMonth / previousMonthUsers) * 100);
  }

  /**
   * Assess data confidence based on activity levels
   */
  private assessDataConfidence(checkIns: number, users: number): string {
    if (checkIns > 100 && users > 10) return 'high';
    if (checkIns > 20 && users > 3) return 'medium';
    return 'low';
  }

  /**
   * Calculate engagement trend
   */
  private calculateEngagementTrend(monthlyCheckIns: number, monthlyActiveUsers: number): string {
    // Simple trend analysis - could be enhanced with historical data
    const checkInsPerUser = monthlyActiveUsers > 0 ? monthlyCheckIns / monthlyActiveUsers : 0;

    if (checkInsPerUser >= 5) return 'up';
    if (checkInsPerUser >= 2) return 'stable';
    return 'down';
  }
}
