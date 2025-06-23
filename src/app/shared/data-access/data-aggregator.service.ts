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
 * readonly scoreboardData = this.dataAggregator.scoreboardData;
 * readonly userSummary = this.dataAggregator.userSummary;
 * readonly pubsVisited = this.dataAggregator.pubsVisited;
 * ```
 */

import { Injectable, inject, computed } from '@angular/core';
import { AuthStore } from '../../auth/data-access/auth.store';
import { UserStore } from '../../users/data-access/user.store';
import { PointsStore } from '../../points/data-access/points.store';
import { NewCheckinStore } from '../../new-checkin/data-access/new-checkin.store';
import { DebugService } from '../utils/debug.service';

@Injectable({ providedIn: 'root' })
export class DataAggregatorService {
  // 🔧 Dependencies (read-only, no circular deps)
  private readonly authStore = inject(AuthStore);
  private readonly userStore = inject(UserStore);
  private readonly pointsStore = inject(PointsStore);
  private readonly newCheckinStore = inject(NewCheckinStore);
  private readonly debug = inject(DebugService);

  constructor() {
    this.debug.standard('[DataAggregator] Service initialized - providing reactive cross-store data aggregation');
  }

  /**
   * Compute pubsVisited from check-in data (eliminates circular dependency)
   * @description Gets unique pub count from NewCheckinStore for current user
   */
  readonly pubsVisited = computed(() => {
    const currentUser = this.authStore.user();
    
    this.debug.standard('[DataAggregator] Computing pubsVisited', {
      hasUser: !!currentUser,
      userId: currentUser?.uid
    });
    
    if (!currentUser) {
      this.debug.standard('[DataAggregator] No current user - returning 0 pubs visited');
      return 0;
    }
    
    // Get check-ins for current user from NewCheckinStore (cached data)
    const checkins = this.newCheckinStore.checkins();
    const userCheckins = checkins.filter(checkin => checkin.userId === currentUser.uid);
    const uniquePubIds = new Set(userCheckins.map(checkin => checkin.pubId));
    
    const pubCount = uniquePubIds.size;
    
    this.debug.standard('[DataAggregator] PubsVisited computed', {
      totalCheckins: checkins.length,
      userCheckins: userCheckins.length,
      uniquePubs: pubCount,
      pubIds: Array.from(uniquePubIds).slice(0, 5) // Log first 5 for debugging
    });
    
    return pubCount;
  });

  /**
   * Complete scoreboard data aggregated from all stores
   * @description Single source for all scoreboard metrics
   */
  readonly scoreboardData = computed(() => {
    this.debug.standard('[DataAggregator] Computing scoreboardData from all stores');
    
    const user = this.userStore.user();
    const isLoading = this.userStore.loading() || this.newCheckinStore.loading() || this.pointsStore.loading();
    
    const data = {
      totalPoints: this.userStore.totalPoints(),
      todaysPoints: this.pointsStore.todaysPoints?.() || 0, // Safe access
      pubsVisited: this.pubsVisited(), // From our computed
      totalPubs: 856, // TODO: Get from PubStore when available
      badgeCount: this.userStore.badgeCount(),
      landlordCount: this.userStore.landlordCount(),
      totalCheckins: this.newCheckinStore.totalCheckins(),
      isLoading
    };
    
    this.debug.standard('[DataAggregator] ScoreboardData aggregated', {
      totalPoints: data.totalPoints,
      todaysPoints: data.todaysPoints,
      pubsVisited: data.pubsVisited,
      badgeCount: data.badgeCount,
      landlordCount: data.landlordCount,
      totalCheckins: data.totalCheckins,
      isLoading: data.isLoading,
      hasUser: !!user
    });
    
    return data;
  });

  /**
   * Get unique pub count for any user (utility method)
   * @param userId - User ID to get pub count for
   * @returns Number of unique pubs visited by user
   */
  getPubsVisitedForUser(userId: string): number {
    this.debug.standard('[DataAggregator] Computing pubs visited for specific user', { userId });
    
    const checkins = this.newCheckinStore.checkins();
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
    
    const checkins = this.newCheckinStore.checkins();
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
    
    const checkins = this.newCheckinStore.checkins();
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
        isAnonymous: user.isAnonymous
      },
      stats: {
        totalPoints: this.userStore.totalPoints(),
        pubsVisited: this.pubsVisited(),
        totalCheckins: this.newCheckinStore.totalCheckins(),
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
   * Get recent check-ins for a user
   * @param userId - User ID
   * @param limit - Number of recent check-ins to return
   * @returns Array of recent check-ins
   */
  getRecentCheckinsForUser(userId: string, limit: number = 10) {
    this.debug.extreme('[DataAggregator] Getting recent check-ins', { userId, limit });
    
    const checkins = this.newCheckinStore.checkins();
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
}