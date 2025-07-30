/**
 * @fileoverview SessionService - App-wide session data management
 *
 * PURPOSE:
 * - Coordinates fresh data loading when user sessions start
 * - Ensures all stores have consistent, up-to-date data across the entire app
 * - Maintains separation of concerns by keeping AuthStore focused on auth only
 * - Provides single point of session lifecycle management
 *
 * ARCHITECTURE DECISION:
 * This service exists because we need app-wide data refresh on session start, but:
 * - AuthStore should only handle authentication state (single responsibility)
 * - Individual stores shouldn't know about each other (avoid circular dependencies)
 * - Components shouldn't coordinate complex data loading (separation of concerns)
 *
 * WHEN TO USE:
 * - Automatically triggered on user login/authentication changes
 * - Called by app initialization to ensure fresh data
 * - Used by admin/debug tools to refresh all data
 *
 * WHEN NOT TO USE:
 * - Don't use for individual feature data loading (use feature-specific stores)
 * - Don't use for real-time updates (use reactive stores)
 * - Don't use for user-specific data (use UserStore, etc.)
 *
 * DATA LOADING STRATEGY:
 * - One-time fresh server fetch on session start for performance
 * - Populates all stores with consistent dataset
 * - Subsequent component usage relies on cached store data
 * - Scales efficiently (single load per session, not per component)
 *
 * INTEGRATION:
 * - Listens to AuthStore.user() changes via effect()
 * - Coordinates UserService, CheckInService, DataAggregatorService
 * - Updates all stores before components calculate pub counts
 * - Fixes data inconsistency issues between leaderboard and scoreboard
 */

import { Injectable, inject, effect } from '@angular/core';
import { AuthStore } from '../../auth/data-access/auth.store';
import { UserService } from '../../users/data-access/user.service';
import { GlobalCheckInService } from '../../check-in/data-access/global-check-in.service';
import { DebugService } from '../utils/debug.service';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly authStore = inject(AuthStore);
  private readonly userService = inject(UserService);
  private readonly globalCheckInService = inject(GlobalCheckInService);
  private readonly debug = inject(DebugService);

  // Track if we're currently loading session data to prevent duplicate calls
  private isLoadingSessionData = false;

  constructor() {
    this.debug.standard('[SessionService] Service initialized - monitoring auth state for session management');

    // Listen for user authentication changes
    effect(() => {
      const user = this.authStore.user();
      const isAuthenticated = this.authStore.isAuthenticated();

      if (user && isAuthenticated && !this.isLoadingSessionData) {
        this.debug.standard('[SessionService] User authenticated, initializing session data', {
          uid: user.uid.slice(0, 8),
          isAnonymous: user.isAnonymous,
          displayName: user.displayName
        });
        
        // Load fresh data for entire app
        this.initializeSessionData();
      } else if (!user && !isAuthenticated) {
        this.debug.standard('[SessionService] User signed out, session data cleared');
        // Data will be automatically cleared by individual stores
      }
    });
  }

  /**
   * Initialize fresh data for entire app on session start
   * @description Loads fresh server data to ensure consistency across all components
   */
  async initializeSessionData(): Promise<void> {
    if (this.isLoadingSessionData) {
      this.debug.standard('[SessionService] Session data loading already in progress, skipping');
      return;
    }

    this.isLoadingSessionData = true;
    const startTime = Date.now();

    try {
      this.debug.standard('[SessionService] 🚀 Starting app-wide session data initialization...');

      // Load fresh data from server for all critical app functionality
      this.debug.standard('[SessionService] 📡 Loading users from server...');
      await this.userService.loadAllUsers();
      const users = this.userService.allUsers();
      this.debug.standard('[SessionService] ✅ Users loaded from server', {
        totalUsers: users.length,
        realUsers: users.filter(u => !u.isAnonymous).length,
        usersWithPoints: users.filter(u => u.totalPoints && u.totalPoints > 0).length,
        userSample: users.slice(0, 3).map(u => ({ 
          uid: u.uid.slice(0, 8), 
          displayName: u.displayName, 
          totalPoints: u.totalPoints || 0,
          isAnonymous: u.isAnonymous 
        }))
      });

      this.debug.standard('[SessionService] 📡 Loading check-ins from server...');
      await this.globalCheckInService.loadAllCheckIns();
      const checkins = this.globalCheckInService.allCheckIns();
      this.debug.standard('[SessionService] ✅ Check-ins loaded from server', {
        totalCheckIns: checkins.length,
        uniqueUsers: new Set(checkins.map(c => c.userId)).size,
        checkinsWithPubs: checkins.filter(c => c.pubId).length,
        checkinSample: checkins.slice(0, 3).map(c => ({
          id: c.id.slice(0, 8),
          userId: c.userId.slice(0, 8),
          pubId: c.pubId?.slice(0, 8) || 'NO_PUB',
          pointsEarned: c.pointsEarned || 0,
          timestamp: c.timestamp
        }))
      });

      // Cross-reference users with points vs check-ins
      const usersWithPoints = users.filter(u => u.totalPoints && u.totalPoints > 0);
      this.debug.standard('[SessionService] 🔍 Analyzing users with points vs check-ins...', {
        usersWithPoints: usersWithPoints.length,
        analysis: usersWithPoints.map(user => {
          const userCheckins = checkins.filter(c => c.userId === user.uid);
          const uniquePubs = new Set(userCheckins.filter(c => c.pubId).map(c => c.pubId)).size;
          return {
            uid: user.uid.slice(0, 8),
            displayName: user.displayName,
            totalPoints: user.totalPoints,
            checkinCount: userCheckins.length,
            uniquePubsFromCheckins: uniquePubs,
            manualPubCount: user.unverifiedPubCount || 0,
            hasPointsButNoPubs: (user.totalPoints || 0) > 0 && uniquePubs === 0 && (user.unverifiedPubCount || 0) === 0
          };
        })
      });

      const duration = Date.now() - startTime;
      this.debug.standard('[SessionService] ✅ Session data initialization completed', {
        durationMs: duration,
        usersLoaded: users.length,
        checkinsLoaded: checkins.length,
        potentialDataIssues: usersWithPoints.filter(u => {
          const userCheckins = checkins.filter(c => c.userId === u.uid);
          const uniquePubs = new Set(userCheckins.filter(c => c.pubId).map(c => c.pubId)).size;
          return (u.totalPoints || 0) > 0 && uniquePubs === 0 && (u.unverifiedPubCount || 0) === 0;
        }).length
      });

      // Global services maintain their own reactive signals - no manual store updates needed
      
      // Verify that services have fresh data
      this.debug.standard('[SessionService] 🔍 Verifying service data after loading...', {
        userServiceUsers: this.userService.allUsers().length,
        globalCheckInServiceData: this.globalCheckInService.allCheckIns().length,
      });

      // Now all stores have fresh data and components can make consistent calculations
      this.debug.standard('[SessionService] 📊 All stores now have fresh data - pub counts should be consistent');

    } catch (error) {
      this.debug.standard('[SessionService] ❌ Session data initialization failed', { error });
      console.error('[SessionService] Failed to initialize session data:', error);
    } finally {
      this.isLoadingSessionData = false;
    }
  }

  /**
   * Manually refresh all session data (for admin/debug purposes)
   * @description Forces fresh data reload regardless of current state
   */
  async refreshAllSessionData(): Promise<void> {
    this.debug.standard('[SessionService] 🔄 Manual session data refresh requested');
    this.isLoadingSessionData = false; // Reset flag to allow manual refresh
    await this.initializeSessionData();
  }

  /**
   * Check if session data is currently being loaded
   * @returns True if data loading is in progress
   */
  isSessionDataLoading(): boolean {
    return this.isLoadingSessionData;
  }
}