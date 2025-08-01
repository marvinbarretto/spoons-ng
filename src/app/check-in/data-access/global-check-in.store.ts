// src/app/check-in/data-access/global-check-in.store.ts

import { Injectable, computed, inject } from '@angular/core';
import type { CheckIn } from '../utils/check-in.models';
import { GlobalCheckInService } from './global-check-in.service';

/**
 * GlobalCheckInStore - Reactive store for app-wide check-in data
 *
 * PURPOSE:
 * - Provides reactive signals for global check-in data
 * - Computed signals for cross-user statistics
 * - Used by DataAggregator for leaderboard calculations
 * - Clear separation from user-scoped check-in stores
 *
 * SCOPE: GLOBAL (All Users)
 * - Contains check-ins from ALL users
 * - Never filters by current user
 * - Used for leaderboards, rankings, app-wide stats
 *
 * USAGE:
 * - DataAggregator: Cross-user pub count calculations
 * - LeaderboardStore: User rankings and comparisons
 * - AdminComponents: Global activity monitoring
 * - SessionService: Initialize with fresh global data
 */
@Injectable({ providedIn: 'root' })
export class GlobalCheckInStore {
  private readonly globalCheckInService = inject(GlobalCheckInService);

  // Core signals (delegate to service)
  readonly allCheckIns = this.globalCheckInService.allCheckIns;
  readonly loading = this.globalCheckInService.loading;

  // Computed signals for global statistics
  readonly totalCheckInCount = computed(() => this.allCheckIns().length);

  readonly uniqueUserCount = computed(() => new Set(this.allCheckIns().map(c => c.userId)).size);

  readonly uniquePubCount = computed(() => new Set(this.allCheckIns().map(c => c.pubId)).size);

  readonly checkInsWithPubs = computed(() => this.allCheckIns().filter(c => c.pubId));

  readonly averageCheckInsPerUser = computed(() => {
    const uniqueUsers = this.uniqueUserCount();
    return uniqueUsers > 0 ? this.totalCheckInCount() / uniqueUsers : 0;
  });

  constructor() {
    console.log('[GlobalCheckInStore] 🌐 Global check-in store initialized');
  }

  /**
   * Get check-ins for specific user (from global dataset)
   */
  getCheckInsForUser(userId: string): CheckIn[] {
    return this.allCheckIns().filter(checkIn => checkIn.userId === userId);
  }

  /**
   * Get check-ins for specific pub (across all users)
   */
  getCheckInsForPub(pubId: string): CheckIn[] {
    return this.allCheckIns().filter(checkIn => checkIn.pubId === pubId);
  }

  /**
   * Get user's unique pub count (from global dataset)
   */
  getUserPubCount(userId: string): number {
    const userCheckIns = this.getCheckInsForUser(userId);
    return new Set(userCheckIns.filter(c => c.pubId).map(c => c.pubId)).size;
  }

  /**
   * Get pub visit count across all users
   */
  getPubVisitCount(pubId: string): number {
    return this.getCheckInsForPub(pubId).length;
  }

  /**
   * Load fresh global data (delegates to service)
   */
  async loadFreshGlobalData(): Promise<void> {
    return this.globalCheckInService.loadAllCheckIns();
  }

  /**
   * Clear global data (delegates to service)
   */
  clearGlobalData(): void {
    this.globalCheckInService.clearGlobalData();
  }
}
