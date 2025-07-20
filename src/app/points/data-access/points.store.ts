/**
 * @fileoverview PointsStore - Points calculation and transaction management
 *
 * RESPONSIBILITIES:
 * - Points calculation algorithms and business logic
 * - Points transaction creation and persistence
 * - Recent transactions history for UI/debugging
 * - Coordinating with UserStore for display data sync
 *
 * DATA FLOW:
 * - CheckInStore requests points award → calculates points → updates UserStore immediately
 * - Creates transaction records in Firestore for audit trail
 * - Provides transaction history for user activity display
 *
 * CRITICAL COORDINATION:
 * - MUST update UserStore.totalPoints immediately after awarding points
 * - UserStore becomes single source of truth for scoreboard display
 * - This store provides the "operational" layer, UserStore provides "display" layer
 *
 * AUTH-REACTIVE PATTERN:
 * - Auto-loads when user authenticates
 * - Clears data on logout to prevent stale state
 * - Deduplicates loads for same user to prevent race conditions
 *
 * @architecture Operations store that coordinates with UserStore for display consistency
 */
import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { AuthStore } from '../../auth/data-access/auth.store';
import { PointsService } from './points.service';
import { PubStore } from '@pubs/data-access/pub.store';
import type { PointsTransaction, PointsBreakdown, CheckInPointsData } from '../utils/points.models';
import { UserStore } from '../../users/data-access/user.store';
import { CacheCoherenceService } from '../../shared/data-access/cache-coherence.service';
import { ErrorLoggingService } from '../../shared/data-access/error-logging.service';
@Injectable({ providedIn: 'root' })
export class PointsStore {
  private readonly authStore = inject(AuthStore);
  private readonly pointsService = inject(PointsService);
  private readonly userStore = inject(UserStore);
  private readonly pubStore = inject(PubStore);
  private readonly cacheCoherence = inject(CacheCoherenceService);
  private readonly errorLoggingService = inject(ErrorLoggingService);

  // ✅ Private signals (following conventions)
  private readonly _totalPoints = signal(0);
  private readonly _recentTransactions = signal<PointsTransaction[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  // ✅ Public readonly signals
  readonly totalPoints = this._totalPoints.asReadonly();
  readonly recentTransactions = this._recentTransactions.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // ✅ Computed signals
  readonly isLoaded = computed(() => this.totalPoints() > 0 || this.recentTransactions().length > 0);
  readonly todaysPoints = computed(() => {
    const today = new Date().toDateString();
    return this.recentTransactions()
      .filter(t => new Date(t.createdAt).toDateString() === today)
      .reduce((sum, t) => sum + t.points, 0);
  });

  constructor() {
    console.log('[PointsStore] 🏗️ Constructor initialized');

    // ✅ FIXED: Proper user change detection
    let effectRunCount = 0;
    let lastUserId: string | null = null;

    effect(() => {
      effectRunCount++;
      const user = this.authStore.user();
      const currentUserId = user?.uid || null;

      console.log(`[PointsStore] 🔄 User effect #${effectRunCount}:`, {
        hasUser: !!user,
        uid: currentUserId,
        isAnonymous: user?.isAnonymous,
        previousUserId: lastUserId,
        userChanged: currentUserId !== lastUserId,
        timestamp: Date.now()
      });

      if (user) {
        // ✅ User exists (including anonymous) - load points if needed
        if (currentUserId !== lastUserId) {
          console.log('[PointsStore] 🔄 New user detected, loading points:', currentUserId);
          this.loadOnce();
        } else {
          console.log('[PointsStore] ⏭️ Same user, no action needed');
        }
        lastUserId = currentUserId;
      } else {
        // ✅ Only reset if user becomes null (true logout)
        if (lastUserId !== null) {
          console.log('[PointsStore] 🧹 User logged out, resetting (previous user was:', lastUserId, ')');
          this.reset();
          lastUserId = null;
        } else {
          console.log('[PointsStore] 👤 No user yet (initial state)');
        }
      }
    });

    // 🔍 DEBUG: Enhanced points change tracking
    let lastPointsValue = 0;
    effect(() => {
      const points = this.totalPoints();
      const transactions = this.recentTransactions();
      const loading = this.loading();
      const pointsChanged = points !== lastPointsValue;

      if (pointsChanged) {
        console.log('💰 [PointsStore] Points changed:', {
          from: lastPointsValue,
          to: points,
          difference: points - lastPointsValue,
          transactionCount: transactions.length,
          loading,
          timestamp: Date.now(),
          stackTrace: new Error().stack?.split('\n').slice(1, 4)
        });

        // 🚨 Alert for suspicious changes
        if (Math.abs(points - lastPointsValue) > 1000) {
          console.error('🚨 [PointsStore] LARGE POINTS CHANGE DETECTED!', {
            from: lastPointsValue,
            to: points,
            difference: points - lastPointsValue
          });
        }

        lastPointsValue = points;
      }

      // Log latest transaction details
      if (transactions.length > 0) {
        const latest = transactions[0];
        console.log('💳 [PointsStore] Latest transaction:', {
          id: latest.id,
          points: latest.points,
          type: latest.type,
          action: latest.action,
          createdAt: latest.createdAt
        });
      }
    });

    // 🔍 DEBUG: Transaction array monitoring
    let lastTransactionCount = 0;
    effect(() => {
      const transactions = this.recentTransactions();
      const countChanged = transactions.length !== lastTransactionCount;

      if (countChanged) {
        console.log('📋 [PointsStore] Transactions array changed:', {
          from: lastTransactionCount,
          to: transactions.length,
          transactionIds: transactions.map(t => t.id),
          timestamp: Date.now()
        });
        lastTransactionCount = transactions.length;
      }
    });
  }

  // ===================================
  // 📡 LOADING METHODS
  // ===================================

  /**
   * Load user's points data (only if not already loaded)
   *
   * @description Checks if data is already loaded before attempting to load.
   * Prevents unnecessary API calls and duplicate loading states.
   */
  async loadOnce(): Promise<void> {
    if (this.isLoaded()) {
      console.log('[PointsStore] ⏭️ Points already loaded, skipping');
      return;
    }

    console.log('[PointsStore] 📡 Loading points for first time');
    return this.load();
  }

  /**
   * Force reload points data from Firebase
   *
   * @description Always loads fresh data regardless of current state.
   * Use this when you need to sync with server state.
   */
  async load(): Promise<void> {
    const user = this.authStore.user();
    if (!user) {
      console.log('[PointsStore] ❌ Cannot load - no authenticated user');
      return;
    }

    console.log('[PointsStore] 📡 Loading points data for user:', user.uid);
    this._loading.set(true);
    this._error.set(null);

    try {
      // Load total points and recent transactions in parallel
      const [totalPoints, transactions] = await Promise.all([
        this.pointsService.getUserTotalPoints(user.uid),
        this.pointsService.getUserTransactions(user.uid, 20)
      ]);

      console.log('[PointsStore] ✅ Points data loaded:', {
        totalPoints,
        transactionCount: transactions.length,
        userId: user.uid
      });

      this._totalPoints.set(totalPoints);
      this._recentTransactions.set(transactions);

    } catch (error: any) {
      this._error.set(error?.message || 'Failed to load points');
      console.error('[PointsStore] ❌ Load error:', error);
    } finally {
      this._loading.set(false);
    }
  }

  // ===================================
  // 🎯 POINTS AWARDING (MAIN API)
  // ===================================

  /**
   * Award points for a check-in (CRITICAL for scoreboard accuracy)
   * @param pointsData - Check-in context data for points calculation
   * @returns Promise<PointsBreakdown> - Detailed breakdown of awarded points
   * @description CRITICAL PATH for real-time scoreboard updates:
   * 1. Calculates points based on distance, bonuses, streaks
   * 2. Creates transaction record in Firestore
   * 3. Updates local PointsStore state
   * 4. ✅ IMMEDIATELY updates UserStore.totalPoints (for scoreboard)
   * 5. Updates user document in Firestore
   * 6. Adds transaction to local history
   *
   * @throws Error if user not authenticated or points award already in progress
   * @sideEffects Updates UserStore.totalPoints immediately for real-time UI
   */
  async awardCheckInPoints(pointsData: CheckInPointsData): Promise<PointsBreakdown> {
    const callId = Date.now();
    console.log(`[PointsStore] 🎯 === AWARD CHECK-IN POINTS STARTED (${callId}) ===`);
    
    const user = this.authStore.user();
    if (!user) {
      console.error(`[PointsStore] ❌ User not authenticated (${callId})`);
      throw new Error('User not authenticated');
    }

    console.log(`[PointsStore] 🎯 User authenticated (${callId}):`, user.uid);
    console.log(`[PointsStore] 🎯 Input points data (${callId}):`, pointsData);
    console.log(`[PointsStore] 🎯 Current points before award (${callId}):`, this.totalPoints());

    // ✅ Prevent duplicate/concurrent calls
    if (this._loading()) {
      console.warn(`[PointsStore] ⚠️ Award points called while loading, rejecting (${callId})`);
      throw new Error('Points award already in progress');
    }

    try {
      this._loading.set(true);
      console.log(`[PointsStore] 🎯 Loading state set to true (${callId})`);

      // 1. Get pub data from stores for points calculation
      console.log(`[PointsStore] 🎯 Getting pub data from stores (${callId})`);
      const checkInPub = this.pubStore.data().find(p => p.id === pointsData.pubId);
      const currentUser = this.userStore.user();
      const homePub = currentUser?.homePubId ? this.pubStore.data().find(p => p.id === currentUser.homePubId) : null;
      
      console.log(`[PointsStore] 🎯 Pub data retrieved (${callId}):`, {
        checkInPub: checkInPub?.name || 'Not found',
        homePub: homePub?.name || 'None set',
        userHomePubId: currentUser?.homePubId || 'None'
      });

      // 2. Calculate points using service with pub objects
      console.log(`[PointsStore] 🎯 Calling PointsService.calculateCheckInPoints (${callId})`);
      const breakdown = this.pointsService.calculateCheckInPoints(pointsData, checkInPub, homePub);
      console.log(`[PointsStore] 📊 Points breakdown returned (${callId}):`, breakdown);

      // 2. Create transaction record
      console.log(`[PointsStore] 🎯 Creating transaction record (${callId})`);
      const transaction = await this.pointsService.createTransaction({
        userId: user.uid,
        type: 'check-in',
        action: 'check-in',
        points: breakdown.total,
        breakdown,
        pubId: pointsData.pubId,
        createdAt: new Date()
      });

      console.log(`[PointsStore] 💾 Transaction saved (${callId}):`, transaction.id);

      // 3. Update local state optimistically
      const currentTotal = this.totalPoints();
      const newTotal = currentTotal + breakdown.total;
      console.log(`[PointsStore] 🎯 Updating points (${callId}): ${currentTotal} + ${breakdown.total} = ${newTotal}`);
      this._totalPoints.set(newTotal);

      // 4. ✅ CRITICAL: Update UserStore immediately for real-time scoreboard
      console.log(`[PointsStore] 🎯 Updating UserStore with new total (${callId}): ${newTotal}`);
      try {
        await this.userStore.patchUser({ totalPoints: newTotal });
      } catch (error) {
        console.log('[PointsStore] ⚠️ UserStore patch failed, but Firebase update will still occur');
      }

      console.log(`[PointsStore] 📈 Points updated everywhere (${callId}):`, {
        from: currentTotal,
        to: newTotal,
        added: breakdown.total,
        userStoreUpdated: true
      });

      // 5. Update user's total in Firebase
      console.log(`[PointsStore] 🎯 Updating Firebase user total (${callId})`);
      await this.pointsService.updateUserTotalPoints(user.uid, newTotal);

      // 6. Add transaction to local array
      console.log(`[PointsStore] 🎯 Adding transaction to local array (${callId})`);
      this._recentTransactions.update(current => [transaction, ...current].slice(0, 20));

      // 7. ✅ CRITICAL: Invalidate cache to trigger leaderboard refresh
      console.log(`[PointsStore] 🔄 Triggering cache invalidation for points award (${callId})`);
      this.cacheCoherence.invalidate('points', 'check-in-points-awarded');
      console.log(`[PointsStore] 🔄 Cache invalidation triggered - leaderboard should refresh`);

      console.log(`[PointsStore] ✅ === AWARD CHECK-IN POINTS COMPLETED (${callId}) ===`);
      console.log(`[PointsStore] ✅ Final result (${callId}):`, {
        pointsAwarded: breakdown.total,
        newTotal: newTotal,
        breakdown
      });

      return breakdown;

    } catch (error: any) {
      this._error.set(error?.message || 'Failed to award points');
      console.error(`[PointsStore] ❌ === AWARD CHECK-IN POINTS FAILED (${callId}) ===`);
      console.error(`[PointsStore] ❌ Error (${callId}):`, error);
      console.error(`[PointsStore] ❌ Error stack (${callId}):`, error instanceof Error ? error.stack : 'No stack trace');
      
      // Log the points awarding failure for admin review
      try {
        await this.errorLoggingService.logPointsError(
          'award-checkin-points-failure',
          error,
          {
            userId: user.uid,
            pubId: pointsData.pubId,
            pointsData,
            breakdown: pointsData,
            severity: 'critical' // Points awarding failures are critical
          }
        );
      } catch (loggingError) {
        console.error('[PointsStore] Failed to log points awarding error:', loggingError);
      }
      
      throw error;
    } finally {
      console.log(`[PointsStore] 🎯 Setting loading to false (${callId})`);
      this._loading.set(false);
    }
  }

  /**
   * Award points for social actions (sharing)
   * @param action - Type of social action ('share')
   * @param pubId - Optional pub ID if action is pub-specific
   * @returns Promise<PointsBreakdown> - Points breakdown for the social action
   * @description Awards points for social engagement and updates UserStore immediately
   * @sideEffects Updates UserStore.totalPoints for real-time scoreboard updates
   */
  async awardSocialPoints(action: 'share', pubId?: string): Promise<PointsBreakdown> {
    const user = this.authStore.user();
    if (!user) throw new Error('User not authenticated');

    console.log('[PointsStore] 📱 Awarding social points:', { action, pubId });

    try {
      const breakdown = this.pointsService.calculateSocialPoints(action);

      await this.pointsService.createTransaction({
        userId: user.uid,
        type: 'social',
        action,
        points: breakdown.total,
        breakdown,
        pubId,
        createdAt: new Date()
      });

      // Update local state and UserStore immediately
      const newTotal = this.totalPoints() + breakdown.total;
      this._totalPoints.set(newTotal);
      try {
        await this.userStore.patchUser({ totalPoints: newTotal }); // ✅ Real-time scoreboard update
      } catch (error) {
        console.log('[PointsStore] ⚠️ UserStore patch failed for social points, but Firebase update will still occur');
      }
      await this.pointsService.updateUserTotalPoints(user.uid, newTotal);

      // ✅ CRITICAL: Invalidate cache to trigger leaderboard refresh
      console.log('[PointsStore] 🔄 Triggering cache invalidation for social points award');
      this.cacheCoherence.invalidate('points', 'social-points-awarded');
      console.log('[PointsStore] 🔄 Cache invalidation triggered - leaderboard should refresh');

      console.log('[PointsStore] ✅ Social points awarded:', breakdown.total);
      return breakdown;

    } catch (error: any) {
      this._error.set(error?.message || 'Failed to award social points');
      console.error('[PointsStore] ❌ Social points error:', error);
      throw error;
    }
  }

  // ===================================
  // 🔄 POINTS SYNCHRONIZATION
  // ===================================

  /**
   * Sync local points with Firebase (data integrity check)
   *
   * @description Compares local state with server state and resolves discrepancies.
   * Useful for debugging or recovering from inconsistent state.
   */
  async syncWithUserProfile(): Promise<void> {
    const user = this.authStore.user();
    if (!user) return;

    try {
      console.log('[PointsStore] 🔄 Syncing with user profile...');

      const [firebaseTotal, transactions] = await Promise.all([
        this.pointsService.getUserTotalPoints(user.uid),
        this.pointsService.getUserTransactions(user.uid, 20)
      ]);

      // Verify data integrity
      const calculatedTotal = transactions.reduce((sum, t) => sum + t.points, 0);
      if (Math.abs(firebaseTotal - calculatedTotal) > 0) {
        console.warn('[PointsStore] ⚠️ Points discrepancy detected:', {
          firebaseTotal,
          calculatedTotal,
          difference: firebaseTotal - calculatedTotal
        });
      }

      // Update local state with server truth
      this._totalPoints.set(firebaseTotal);
      this._recentTransactions.set(transactions);

      console.log('[PointsStore] ✅ Sync completed:', firebaseTotal);

    } catch (error: any) {
      console.error('[PointsStore] ❌ Sync failed:', error);
      this._error.set('Failed to sync points');
    }
  }

  // ===================================
  // 🎮 DEBUG & ADMIN METHODS
  // ===================================

  /**
   * Get comprehensive debugging information
   *
   * @returns Object containing all current store state for debugging
   */
  getPointsDebugInfo(): {
    totalPoints: number;
    transactionCount: number;
    todaysPoints: number;
    isLoaded: boolean;
    lastTransaction: PointsTransaction | null;
    userId: string | null;
  } {
    const transactions = this.recentTransactions();
    return {
      totalPoints: this.totalPoints(),
      transactionCount: transactions.length,
      todaysPoints: this.todaysPoints(),
      isLoaded: this.isLoaded(),
      lastTransaction: transactions[0] || null,
      userId: this.authStore.uid() || null
    };
  }

  /**
   * Manually award points (admin/testing only)
   *
   * @param points - Number of points to award (can be negative)
   * @param reason - Human-readable reason for the points
   * @param actionType - Type of admin action for categorization
   */
  async manuallyAwardPoints(
    points: number,
    reason: string,
    actionType: 'bonus' | 'admin' | 'correction' = 'admin'
  ): Promise<void> {
    const user = this.authStore.user();
    if (!user) throw new Error('User not authenticated');

    console.log('[PointsStore] 🎁 Manual points award:', { points, reason, actionType });

    try {
      const breakdown: PointsBreakdown = {
        base: points,
        distance: 0,
        bonus: 0,
        multiplier: 1,
        total: points,
        reason
      };

      await this.pointsService.createTransaction({
        userId: user.uid,
        type: 'achievement',
        action: actionType,
        points,
        breakdown,
        createdAt: new Date()
      });

      const newTotal = this.totalPoints() + points;
      this._totalPoints.set(newTotal);
      await this.pointsService.updateUserTotalPoints(user.uid, newTotal);
      await this.load(); // Refresh to get the new transaction

      console.log('[PointsStore] ✅ Manual points awarded');

    } catch (error: any) {
      console.error('[PointsStore] ❌ Manual points error:', error);
      throw error;
    }
  }

  // ===================================
  // 🔧 UTILITY METHODS
  // ===================================

  /**
   * Reset all points state (logout cleanup)
   *
   * @description Clears all local state and notifies UserStore.
   * Only called when user becomes null (true logout).
   */
  reset(): void {
    console.log('[PointsStore] 🧹 Resetting all points state');

    this._totalPoints.set(0);
    this._recentTransactions.set([]);
    this._loading.set(false);
    this._error.set(null);

    // Update UserStore to clear points (fire and forget)
    this.userStore.patchUser({ totalPoints: 0 })
      .then(() => {
        console.log('[PointsStore] ✅ UserStore updated during reset');
      })
      .catch(() => {
        console.log('[PointsStore] ⚠️ Could not update UserStore during reset (normal during logout)');
      });
  }

  /**
   * Clear error state without affecting data
   */
  clearError(): void {
    this._error.set(null);
  }

  /**
   * Find transaction by ID
   *
   * @param transactionId - Transaction ID to search for
   * @returns Transaction object or undefined if not found
   */
  getTransactionById(transactionId: string): PointsTransaction | undefined {
    return this.recentTransactions().find(t => t.id === transactionId);
  }
}
