// badges/data-access/earned-badge.store.ts
import { Injectable, computed, inject } from '@angular/core';
import { BaseStore } from '../../shared/data-access/base.store';
import { AuthStore } from '../../auth/data-access/auth.store';
import { EarnedBadgeService } from './earned-badge.service';
import type { EarnedBadge } from '../utils/badge.model';

@Injectable({ providedIn: 'root' })
export class EarnedBadgeStore extends BaseStore<EarnedBadge> {
  private readonly _service = inject(EarnedBadgeService);
  private readonly _authStore = inject(AuthStore);

  protected async fetchData(): Promise<EarnedBadge[]> {
    const user = this._authStore.user();
    if (!user?.uid) {
      console.log('[EarnedBadgeStore] No authenticated user, returning empty array');
      return [];
    }

    console.log('[EarnedBadgeStore] fetchData for user:', user.uid);
    return this._service.getEarnedBadgesForUser(user.uid);
  }

  // ===================================
  // COMPUTED SIGNALS
  // ===================================

  readonly earnedBadgeCount = computed(() => this.data().length);

  readonly badgesByDate = computed(() =>
    [...this.data()].sort((a, b) => b.awardedAt - a.awardedAt)
  );

  readonly recentBadges = computed(() =>
    this.badgesByDate().slice(0, 3)
  );

  readonly badgeIds = computed(() =>
    this.data().map(eb => eb.badgeId)
  );

  // ===================================
  // QUERY METHODS
  // ===================================

  /**
   * Get earned badge by badge ID
   */
  getEarnedBadge(badgeId: string): EarnedBadge | undefined {
    return this.data().find(eb => eb.badgeId === badgeId);
  }

  /**
   * Check if user has earned a specific badge
   */
  hasEarnedBadge(badgeId: string): boolean {
    return !!this.getEarnedBadge(badgeId);
  }

  /**
   * Get all earned badges from a specific time period
   */
  getEarnedBadgesSince(timestamp: number): EarnedBadge[] {
    return this.data().filter(eb => eb.awardedAt >= timestamp);
  }

  // ===================================
  // CRUD METHODS
  // ===================================

  /**
   * Award a badge to the current user
   */
  async awardBadge(badgeId: string, metadata?: Record<string, any>): Promise<EarnedBadge> {
    const user = this._authStore.user();
    if (!user?.uid) {
      throw new Error('No authenticated user');
    }

    try {
      const earnedBadge = await this._service.awardBadge(user.uid, badgeId, metadata);

      // Update local state
      this._data.update(current => [...current, earnedBadge]);

      console.log(`🏅 Badge added to store: ${badgeId}`);
      return earnedBadge;
    } catch (error: any) {
      this._error.set(error?.message || 'Failed to award badge');
      console.error('[EarnedBadgeStore] awardBadge error:', error);
      throw error;
    }
  }

  /**
   * Revoke a badge from the current user (admin function)
   */
  async revokeBadge(badgeId: string): Promise<void> {
    const user = this._authStore.user();
    if (!user?.uid) {
      throw new Error('No authenticated user');
    }

    try {
      await this._service.revokeBadge(user.uid, badgeId);

      // Update local state
      this._data.update(current =>
        current.filter(eb => eb.badgeId !== badgeId)
      );

      console.log(`🗑️ Badge removed from store: ${badgeId}`);
    } catch (error: any) {
      this._error.set(error?.message || 'Failed to revoke badge');
      console.error('[EarnedBadgeStore] revokeBadge error:', error);
      throw error;
    }
  }

  // ===================================
  // USER-SPECIFIC LOADING
  // ===================================

  /**
   * Load earned badges for a specific user (useful for admin views)
   */
  override async loadForUser(userId: string): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      console.log('[EarnedBadgeStore] loadForUser:', userId);
      const badges = await this._service.getEarnedBadgesForUser(userId);
      this._data.set(badges);
    } catch (error: any) {
      this._error.set(error?.message || 'Failed to load user badges');
      console.error('[EarnedBadgeStore] loadForUser error:', error);
    } finally {
      this._loading.set(false);
    }
  }

  // ===================================
  // UTILITY METHODS
  // ===================================

  /**
   * Get debug info for development
   */
  override getDebugInfo(): {
    name: string;
    itemCount: number;
    hasLoaded: boolean;
    loading: boolean;
    error: string | null;
    hasData: boolean;
    isEmpty: boolean;
    sampleData: EarnedBadge[];
    earnedBadgeCount: number;
    recentBadgeIds: string[];
  } {
    return {
      ...super.getDebugInfo(),
      earnedBadgeCount: this.earnedBadgeCount(),
      recentBadgeIds: this.recentBadges().map(eb => eb.badgeId)
    };
  }
}
