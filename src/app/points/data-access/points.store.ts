// src/app/points/data-access/points.store.ts
import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { AuthStore } from '../../auth/data-access/auth.store';
import { PointsService } from './points.service';
import type { PointsTransaction, PointsBreakdown, CheckInPointsData } from '../utils/points.models';

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
 */
@Injectable({ providedIn: 'root' })
export class PointsStore {
  private readonly authStore = inject(AuthStore);
  private readonly pointsService = inject(PointsService);

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
    // Auto-load when user changes
    effect(() => {
      const user = this.authStore.user();
      if (user) {
        this.loadOnce();
      } else {
        this.reset();
      }
    });
  }

  // ===================================
  // 📡 LOADING METHODS
  // ===================================

  /**
   * Load user's points data (only if not already loaded)
   */
  async loadOnce(): Promise<void> {
    if (this.isLoaded()) return;
    return this.load();
  }

  /**
   * Force reload points data
   */
  async load(): Promise<void> {
    const user = this.authStore.user();
    if (!user) return;

    this._loading.set(true);
    this._error.set(null);

    try {
      // Load total points and recent transactions in parallel
      const [totalPoints, transactions] = await Promise.all([
        this.pointsService.getUserTotalPoints(user.uid),
        this.pointsService.getUserTransactions(user.uid, 20)
      ]);

      this._totalPoints.set(totalPoints);
      this._recentTransactions.set(transactions);

    } catch (error: any) {
      this._error.set(error?.message || 'Failed to load points');
      console.error('[PointsStore] Load error:', error);
    } finally {
      this._loading.set(false);
    }
  }

  // ===================================
  // 🎯 POINTS AWARDING (MAIN API)
  // ===================================

  /**
   * Award points for a check-in
   * Calculates points + saves transaction + updates totals
   */
  async awardCheckInPoints(pointsData: CheckInPointsData): Promise<PointsBreakdown> {
    const user = this.authStore.user();
    if (!user) throw new Error('User not authenticated');

    try {
      // 1. Calculate points using service
      const breakdown = this.pointsService.calculateCheckInPoints(pointsData);

      // 2. Create transaction record
      await this.pointsService.createTransaction({
        userId: user.uid,
        type: 'check-in',
        action: 'check-in',
        points: breakdown.total,
        breakdown,
        pubId: pointsData.pubId,
        createdAt: new Date()
      });

      // 3. Update local state optimistically
      const newTotal = this.totalPoints() + breakdown.total;
      this._totalPoints.set(newTotal);

      // 4. Update user's total in Firebase
      await this.pointsService.updateUserTotalPoints(user.uid, newTotal);

      // 5. Refresh transactions to get the new one
      const updatedTransactions = await this.pointsService.getUserTransactions(user.uid, 20);
      this._recentTransactions.set(updatedTransactions);

      return breakdown;

    } catch (error: any) {
      this._error.set(error?.message || 'Failed to award points');
      console.error('[PointsStore] Award points error:', error);
      throw error;
    }
  }

  /**
   * Award points for social actions
   */
  async awardSocialPoints(action: 'share' | 'photo', pubId?: string): Promise<PointsBreakdown> {
    const user = this.authStore.user();
    if (!user) throw new Error('User not authenticated');

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

      return breakdown;

    } catch (error: any) {
      this._error.set(error?.message || 'Failed to award social points');
      throw error;
    }
  }

  // ===================================
  // 🔧 UTILITY METHODS
  // ===================================

  /**
   * Reset all state (for logout)
   */
  reset(): void {
    this._totalPoints.set(0);
    this._recentTransactions.set([]);
    this._loading.set(false);
    this._error.set(null);
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this._error.set(null);
  }

  /**
   * Get points breakdown for display
   */
  getTransactionById(transactionId: string): PointsTransaction | undefined {
    return this.recentTransactions().find(t => t.id === transactionId);
  }
}
