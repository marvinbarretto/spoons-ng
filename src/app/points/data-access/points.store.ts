// src/app/points/data-access/points.store.ts
import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { AuthStore } from '../../auth/data-access/auth.store';
import { PointsService } from './points.service';
import type { PointsTransaction, PointsBreakdown, CheckInPointsData } from '../utils/points.models';
import { UserStore } from '../../users/data-access/user.store';

/**
 * PointsStore
 *
 * ✅ RESPONSIBILITIES:
 * - Points state management (signals, loading, error)
 * - Orchestrating points awarding (calculation + persistence)
 * - Reactive points computations and derived state
 * - User session management for points
 *
 * ❌ NOT RESPONSIBLE FOR:
 * - Points calculation logic (PointsService handles this)
 * - Direct Firestore operations (PointsService handles this)
 * - Check-in flow details
 *
 * 🔧 ARCHITECTURE NOTES:
 * - Auto-loads points when user becomes available (including anonymous users)
 * - Only resets when user becomes null/undefined (true logout)
 * - Maintains points persistence across page refreshes for same user
 * - Uses optimistic updates for immediate UI feedback
 *
 * 🐛 DEBUGGING:
 * - Extensive console logging for tracking state changes
 * - Stack traces on points modifications to identify sources
 * - Transaction ID tracking for duplicate detection
 * - Load state monitoring to prevent race conditions
 */
@Injectable({ providedIn: 'root' })
export class PointsStore {
  private readonly authStore = inject(AuthStore);
  private readonly pointsService = inject(PointsService);
  private readonly userStore = inject(UserStore);

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
   * Award points for a check-in
   *
   * @param pointsData - Check-in context data for points calculation
   * @returns Promise<PointsBreakdown> - Detailed breakdown of awarded points
   *
   * @description
   * - Calculates points based on distance, bonuses, streaks
   * - Creates permanent transaction record in Firestore
   * - Updates local state optimistically for immediate UI feedback
   * - Updates user's total points in their profile document
   * - Prevents duplicate calls with loading state guard
   */
  async awardCheckInPoints(pointsData: CheckInPointsData): Promise<PointsBreakdown> {
    const callId = Date.now();
    const user = this.authStore.user();

    if (!user) throw new Error('User not authenticated');

    // ✅ Prevent duplicate/concurrent calls
    if (this._loading()) {
      console.warn('[PointsStore] ⚠️ Award points called while loading, rejecting');
      throw new Error('Points award already in progress');
    }

    console.log(`[PointsStore] 🎯 Award check-in points STARTED (${callId}):`, {
      pointsData,
      currentPoints: this.totalPoints(),
      userId: user.uid
    });

    try {
      this._loading.set(true);

      // 1. Calculate points using service
      const breakdown = this.pointsService.calculateCheckInPoints(pointsData);
      console.log(`[PointsStore] 📊 Points breakdown (${callId}):`, breakdown);

      // 2. Create transaction record
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
      this._totalPoints.set(newTotal);

      console.log(`[PointsStore] 📈 Local points updated (${callId}):`, {
        from: currentTotal,
        to: newTotal,
        added: breakdown.total
      });

      // 4. Update user's total in Firebase
      await this.pointsService.updateUserTotalPoints(user.uid, newTotal);

      // 5. Add transaction to local array
      this._recentTransactions.update(current => [transaction, ...current].slice(0, 20));

      console.log(`[PointsStore] ✅ Award check-in points COMPLETED (${callId}):`, {
        pointsAwarded: breakdown.total,
        newTotal: newTotal
      });

      return breakdown;

    } catch (error: any) {
      this._error.set(error?.message || 'Failed to award points');
      console.error(`[PointsStore] ❌ Award check-in points FAILED (${callId}):`, error);
      throw error;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Award points for social actions (sharing, photos)
   *
   * @param action - Type of social action ('share' | 'photo')
   * @param pubId - Optional pub ID if action is pub-specific
   * @returns Promise<PointsBreakdown> - Points breakdown for the social action
   */
  async awardSocialPoints(action: 'share' | 'photo', pubId?: string): Promise<PointsBreakdown> {
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

      // Update local state
      const newTotal = this.totalPoints() + breakdown.total;
      this._totalPoints.set(newTotal);
      await this.pointsService.updateUserTotalPoints(user.uid, newTotal);

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

    // Update UserStore to clear points
    try {
      this.userStore.patchUser({ totalPoints: 0 });
      console.log('[PointsStore] ✅ UserStore updated during reset');
    } catch (error) {
      console.log('[PointsStore] ⚠️ Could not update UserStore during reset (normal during logout)');
    }
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
