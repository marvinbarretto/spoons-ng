// src/app/check-in/data-access/global-check-in.service.ts

import { Injectable, signal } from '@angular/core';
import { FirestoreService } from '@fourfold/angular-foundation';
import type { CheckIn } from '../utils/check-in.models';

/**
 * GlobalCheckInService - Handles app-wide check-in data
 * 
 * PURPOSE:
 * - Loads ALL users' check-ins for leaderboards, admin panels, and global stats
 * - Maintains reactive signals for global check-in data
 * - Used by SessionService for fresh app-wide data loading
 * - Clear separation from user-scoped check-in operations
 * 
 * SCOPE: GLOBAL (All Users)
 * - Loads check-ins for ALL users, not just current user
 * - Used for leaderboards, rankings, and app-wide statistics
 * - Never filtered by current user
 * 
 * USAGE:
 * - SessionService: Load fresh global data on session start
 * - LeaderboardStore: Calculate rankings across all users
 * - AdminPanels: View all user activity
 * - DataAggregator: Cross-user calculations
 */
@Injectable({ providedIn: 'root' })
export class GlobalCheckInService {
  private readonly firestoreService = new FirestoreService();

  // Global check-ins signal (ALL users)
  private readonly _allCheckIns = signal<CheckIn[]>([]);
  readonly allCheckIns = this._allCheckIns.asReadonly();

  // Loading state
  private readonly _loading = signal(false);
  readonly loading = this._loading.asReadonly();

  /**
   * Load all check-ins from all users (fresh server data)
   * Used by SessionService for app-wide data initialization
   */
  async loadAllCheckIns(): Promise<void> {
    this._loading.set(true);
    try {
      console.log('[GlobalCheckInService] 🌐 Loading ALL users check-ins for app-wide data...');
      
      // Force server fetch to ensure fresh data (no filters = all documents)
      const allCheckIns = await this.firestoreService.getDocsWhereFromServer<CheckIn>('checkins');

      console.log(`[GlobalCheckInService] ✅ Loaded ${allCheckIns.length} check-ins from ALL users`);
      console.log(`[GlobalCheckInService] 🔍 Unique users: ${new Set(allCheckIns.map((c: CheckIn) => c.userId)).size}`);
      
      // Update signal with fresh global data
      this._allCheckIns.set(allCheckIns);
      
    } catch (error) {
      console.error('[GlobalCheckInService] ❌ Failed to load global check-ins:', error);
      throw error;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Get check-ins for a specific user (from global dataset)
   * More efficient than separate queries when we already have global data
   */
  getCheckInsForUser(userId: string): CheckIn[] {
    return this._allCheckIns().filter(checkIn => checkIn.userId === userId);
  }

  /**
   * Get total check-in count across all users
   */
  getTotalCheckInCount(): number {
    return this._allCheckIns().length;
  }

  /**
   * Get unique user count who have checked in
   */
  getUniqueUserCount(): number {
    return new Set(this._allCheckIns().map(c => c.userId)).size;
  }

  /**
   * Get check-ins for a specific pub (across all users)
   */
  getCheckInsForPub(pubId: string): CheckIn[] {
    return this._allCheckIns().filter(checkIn => checkIn.pubId === pubId);
  }

  /**
   * Clear all global data (on logout or reset)
   */
  clearGlobalData(): void {
    console.log('[GlobalCheckInService] 🧹 Clearing global check-in data');
    this._allCheckIns.set([]);
  }
}