/**
 * @fileoverview DataAggregatorService - Reactive data aggregation across multiple stores
 *
 * PURPOSE:
 * - Aggregate data from multiple stores without circular dependencies
 * - Provide reactive computed signals for complex cross-store data
 * - Clean separation of concerns - no business logic, just data composition
 * - Scalable pattern for any multi-store data needs
 *
 * CAPABILITIES:
 * - Scoreboard data aggregation
 * - User statistics computation
 * - Cross-store reactive signals
 * - Dependency-free data composition
 *
 * PATTERN:
 * - Reads from multiple stores but doesn't create dependencies
 * - All methods return computed signals for reactivity
 * - Comprehensive console logging for debugging
 * - Simple, focused, testable
 *
 * USAGE:
 * ```typescript
 * // In components
 * readonly scoreboardData = this.dataAggregatorService.scoreboardData;
 * readonly userSummary = this.dataAggregatorService.userSummary;
 * readonly pubsVisited = this.dataAggregatorService.pubsVisited;
 * ```
 */

import { Injectable, inject, computed, signal } from '@angular/core';
import { AuthStore } from '../../auth/data-access/auth.store';
import { UserStore } from '../../users/data-access/user.store';
import { PointsStore } from '../../points/data-access/points.store';
import { CheckInStore } from '@check-in/data-access/check-in.store';
import { PubStore } from '../../pubs/data-access/pub.store';
import { DebugService } from '../utils/debug.service';
import { UserService } from '../../users/data-access/user.service';
import { generateRandomName } from '../utils/anonymous-names';
import type { User } from '../../users/utils/user.model';
import type { CheckIn } from '../../check-in/utils/check-in.models';

@Injectable({ providedIn: 'root' })
export class DataAggregatorService {
  // 🔧 Dependencies (read-only, no circular deps)
  private readonly authStore = inject(AuthStore);
  private readonly userStore = inject(UserStore);
  private readonly pointsStore = inject(PointsStore);
  private readonly checkinStore = inject(CheckInStore);
  private readonly pubStore = inject(PubStore);
  private readonly debug = inject(DebugService);
  private readonly userService = inject(UserService);

  // TODO: Handle Leaderboard soon
  constructor() {
    this.debug.standard('[DataAggregator] Service initialized - providing reactive cross-store data aggregation');
  }

  /**
   * Compute verified pub count from check-in data
   * @description Gets unique pub count from CheckInStore for current user
   */
  readonly verifiedPubsCount = computed(() => {
    const currentUser = this.authStore.user();

    if (!currentUser) {
      return 0;
    }

    // Get check-ins for current user from CheckInStore (cached data)
    const checkins = this.checkinStore.checkins();
    const userCheckins = checkins.filter(checkin => checkin.userId === currentUser.uid);
    const uniquePubIds = new Set(userCheckins.map(checkin => checkin.pubId));

    return uniquePubIds.size;
  });

  /**
   * Compute unverified pub count from user's manually added list
   * @description Gets count from user's manuallyAddedPubIds array
   */
  readonly unverifiedPubsCount = computed(() => {
    const user = this.userStore.user();

    if (!user) {
      return 0;
    }

    return user.manuallyAddedPubIds?.length || 0;
  });

  /**
   * Compute total pub count (verified + unverified)
   * @description Primary pub count used throughout the app
   */
  readonly pubsVisited = computed(() => {
    const verified = this.verifiedPubsCount();
    const unverified = this.unverifiedPubsCount();
    const total = verified + unverified;

    console.log('📊 [DataAggregator] Total pubs calculated:', {
      verified,
      unverified,
      total
    });

    return total;
  });

  /**
   * Complete scoreboard data aggregated from all stores
   * @description Single source for all scoreboard metrics
   */
  readonly scoreboardData = computed(() => {
    console.log('📊 [DataAggregator] === COMPUTING SCOREBOARD DATA ===');

    const user = this.userStore.user();
    const currentUser = this.authStore.user();
    const isLoading = this.userStore.loading() || this.checkinStore.loading() || this.pointsStore.loading();

    console.log('📊 [DataAggregator] Store states:', {
      userStoreLoading: this.userStore.loading(),
      checkinStoreLoading: this.checkinStore.loading(),
      pointsStoreLoading: this.pointsStore.loading(),
      overallLoading: isLoading,
      hasUser: !!user,
      hasCurrentUser: !!currentUser,
      userId: currentUser?.uid?.slice(0, 8)
    });

    const data = {
      totalPoints: this.userStore.totalPoints(),
      todaysPoints: this.pointsStore.todaysPoints?.() || 0, // Safe access
      pubsVisited: this.pubsVisited(), // From our computed
      totalPubs: this.pubStore.totalCount(),
      badgeCount: this.userStore.badgeCount(),
      landlordCount: this.userStore.landlordCount(),
      totalCheckins: this.checkinStore.totalCheckins(),
      isLoading
    };

    console.log('📊 [DataAggregator] === SCOREBOARD DATA FINAL ===', {
      totalPoints: data.totalPoints,
      todaysPoints: data.todaysPoints,
      pubsVisited: data.pubsVisited,
      badgeCount: data.badgeCount,
      landlordCount: data.landlordCount,
      totalCheckins: data.totalCheckins,
      isLoading: data.isLoading,

      // Additional debugging
      userStorePubsFromObject: 'N/A - checkedInPubIds removed',
      checkinStoreTotalCheckins: this.checkinStore.checkins().length,
      pubsVisitedFromDataAggregator: data.pubsVisited
    });

    // DataAggregatorService is now the single source of truth for pubsVisited

    return data;
  });

  /**
   * Get unique pub count for any user (utility method)
   * @param userId - User ID to get pub count for
   * @returns Number of unique pubs visited by user
   */
  getPubsVisitedForUser(userId: string): number {
    this.debug.standard('[DataAggregator] Computing pubs visited for specific user', { userId });

    const checkins = this.checkinStore.checkins();
    const userCheckins = checkins.filter(checkin => checkin.userId === userId);
    const uniquePubIds = new Set(userCheckins.map(checkin => checkin.pubId));
    const count = uniquePubIds.size;

    this.debug.standard('[DataAggregator] User pub count computed', {
      userId,
      totalCheckins: userCheckins.length,
      uniquePubs: count
    });

    return count;
  }

  /**
   * Check if user has visited a specific pub
   * @param pubId - Pub ID to check
   * @param userId - User ID (defaults to current user)
   * @returns True if user has visited this pub
   */
  hasVisitedPub(pubId: string, userId?: string): boolean {
    const targetUserId = userId || this.authStore.user()?.uid;

    this.debug.extreme('[DataAggregator] Checking if user visited pub', {
      pubId,
      userId: targetUserId,
      usingCurrentUser: !userId
    });

    if (!targetUserId) {
      this.debug.standard('[DataAggregator] No user ID available for pub visit check');
      return false;
    }

    const checkins = this.checkinStore.checkins();
    const hasVisited = checkins.some(checkin =>
      checkin.userId === targetUserId && checkin.pubId === pubId
    );

    this.debug.extreme('[DataAggregator] Pub visit check result', {
      pubId,
      userId: targetUserId,
      hasVisited,
      totalCheckins: checkins.length
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
      userId: targetUserId
    });

    if (!targetUserId) {
      this.debug.standard('[DataAggregator] No user ID available for visit count');
      return 0;
    }

    const checkins = this.checkinStore.checkins();
    const visitCount = checkins.filter(checkin =>
      checkin.userId === targetUserId && checkin.pubId === pubId
    ).length;

    this.debug.extreme('[DataAggregator] Visit count computed', {
      pubId,
      userId: targetUserId,
      visitCount
    });

    return visitCount;
  }

  /**
   * Reactive display name (single source of truth for UI)
   * @description Properly merges UserStore + AuthStore display names with immediate reactivity
   */
  readonly displayName = computed(() => {
    this.debug.standard('[DataAggregator] Computing displayName');

    const userProfile = this.userStore.user();
    const authUser = this.authStore.user();

    if (!authUser) {
      this.debug.standard('[DataAggregator] No auth user - returning null displayName');
      return null;
    }

    // Priority: UserStore displayName > AuthStore displayName > fallback
    const displayName = userProfile?.displayName || authUser.displayName || 'User';

    this.debug.standard('[DataAggregator] DisplayName computed', {
      uid: authUser.uid?.slice(0, 8),
      userStoreDisplayName: userProfile?.displayName,
      authStoreDisplayName: authUser.displayName,
      finalDisplayName: displayName,
      source: userProfile?.displayName ? 'UserStore' : 'AuthStore'
    });

    return displayName;
  });

  /**
   * Aggregated user data (combines Auth + User store)
   * @description Single source of truth for complete user data
   */
  readonly user = computed(() => {
    this.debug.standard('[DataAggregator] Computing aggregated user');

    const userProfile = this.userStore.user();
    const authUser = this.authStore.user();

    if (!userProfile || !authUser) {
      this.debug.standard('[DataAggregator] No complete user data available');
      return null;
    }

    const aggregatedUser = {
      ...authUser,
      ...userProfile,
      // Ensure critical fields from UserStore take precedence
      onboardingCompleted: userProfile.onboardingCompleted || false,
      displayName: userProfile.displayName || authUser.displayName,
      photoURL: userProfile.photoURL || authUser.photoURL
    };

    this.debug.standard('[DataAggregator] Aggregated user computed', {
      uid: aggregatedUser.uid,
      onboardingCompleted: aggregatedUser.onboardingCompleted,
      displayName: aggregatedUser.displayName,
      source: 'UserStore+AuthStore'
    });

    return aggregatedUser;
  });

  /**
   * User summary data aggregated from all stores
   * @description Complete user profile data for display
   */
  readonly userSummary = computed(() => {
    this.debug.standard('[DataAggregator] Computing userSummary');

    const user = this.userStore.user();
    const currentUser = this.authStore.user();

    if (!user || !currentUser) {
      this.debug.standard('[DataAggregator] No user data available for summary');
      return null;
    }

    const summary = {
      profile: {
        uid: user.uid,
        email: user.email,
        displayName: this.userStore.displayName(),
        avatarUrl: this.userStore.avatarUrl(),
        isAnonymous: user.isAnonymous,
        onboardingCompleted: user.onboardingCompleted || false
      },
      stats: {
        totalPoints: this.userStore.totalPoints(),
        pubsVisited: this.pubsVisited(),
        totalCheckins: this.checkinStore.totalCheckins(),
        badgeCount: this.userStore.badgeCount(),
        landlordCount: this.userStore.landlordCount()
      },
      activity: {
        todaysPoints: this.pointsStore.todaysPoints?.() || 0,
        recentCheckins: this.getRecentCheckinsForUser(user.uid, 5)
      }
    };

    this.debug.standard('[DataAggregator] UserSummary computed', {
      uid: summary.profile.uid,
      totalPoints: summary.stats.totalPoints,
      pubsVisited: summary.stats.pubsVisited,
      recentCheckinsCount: summary.activity.recentCheckins.length
    });

    return summary;
  });

  /**
   * Check if a pub is the user's designated home pub
   * @param pubId - Pub ID to check
   * @param userId - User ID (defaults to current user)
   * @returns True if this pub is the user's home pub
   */
  isLocalPub(pubId: string, userId?: string): boolean {
    const targetUserId = userId || this.authStore.user()?.uid;

    this.debug.extreme('[DataAggregator] Checking if pub is user home pub', {
      pubId,
      userId: targetUserId,
      usingCurrentUser: !userId
    });

    if (!targetUserId) {
      this.debug.standard('[DataAggregator] No user ID available for home pub check');
      return false;
    }

    const user = this.userStore.user();
    if (!user) {
      this.debug.standard('[DataAggregator] No user profile available for home pub check');
      return false;
    }

    const isHomePub = user.homePubId === pubId;

    this.debug.extreme('[DataAggregator] Home pub check result', {
      pubId,
      userId: targetUserId,
      homePubId: user.homePubId,
      isHomePub
    });

    return isHomePub;
  }

  /**
   * Get recent check-ins for a user
   * @param userId - User ID
   * @param limit - Number of recent check-ins to return
   * @returns Array of recent check-ins
   */
  getRecentCheckinsForUser(userId: string, limit: number = 10) {
    this.debug.extreme('[DataAggregator] Getting recent check-ins', { userId, limit });

    const checkins = this.checkinStore.checkins();
    const userCheckins = checkins
      .filter(checkin => checkin.userId === userId)
      .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis())
      .slice(0, limit);

    this.debug.extreme('[DataAggregator] Recent check-ins retrieved', {
      userId,
      totalCheckins: checkins.length,
      userCheckins: userCheckins.length,
      recentCount: userCheckins.length
    });

    return userCheckins;
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
      found: !!pub
    });

    return pubName;
  }

}
