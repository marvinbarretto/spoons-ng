// src/app/badges/data-access/badge.store.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { BaseStore } from '../../shared/data-access/base.store';
import { AuthStore } from '../../auth/data-access/auth.store';
import { BadgeService } from './badge.service';
import { UserStore } from '../../users/data-access/user.store';
import type { Badge, EarnedBadge } from '../utils/badge.model';

/**
 * Unified BadgeStore - manages both badge definitions and user's earned badges
 * Single source of truth for all badge-related functionality
 */
@Injectable({ providedIn: 'root' })
export class BadgeStore extends BaseStore<EarnedBadge> {
  private readonly _badgeService = inject(BadgeService);
  private readonly _userStore = inject(UserStore);
  private readonly _authStore = inject(AuthStore);

  // ===================================
  // BADGE DEFINITIONS (Global)
  // ===================================

  private readonly _definitions = signal<Badge[]>([]);
  private readonly _definitionsLoading = signal(false);
  private readonly _definitionsError = signal<string | null>(null);

  readonly definitions = this._definitions.asReadonly();
  readonly definitionsLoading = this._definitionsLoading.asReadonly();
  readonly definitionsError = this._definitionsError.asReadonly();

  // ✅ Clean alias for badge definitions
  readonly badges = this.definitions;

  // ===================================
  // EARNED BADGES (User-specific, from BaseStore)
  // ===================================

  readonly earnedBadges = this.data; // Alias for clarity
  readonly earnedBadgeCount = computed(() => this.data().length);
  readonly hasEarnedBadges = computed(() => this.earnedBadgeCount() > 0);

  // ===================================
  // COMBINED DATA (For UI)
  // ===================================

  readonly earnedBadgesWithDefinitions = computed(() => {
    const earned = this.earnedBadges();
    const definitions = this._definitions();

    return earned.map(earnedBadge => ({
      earnedBadge,
      badge: definitions.find(def => def.id === earnedBadge.badgeId)
    })).filter(item => item.badge); // Only include badges with valid definitions
  });

  readonly recentBadges = computed(() =>
    this.earnedBadges()
      .sort((a, b) => b.awardedAt - a.awardedAt)
      .slice(0, 5)
  );

  readonly recentBadgesForDisplay = computed(() =>
    this.earnedBadgesWithDefinitions()
      .sort((a, b) => b.earnedBadge.awardedAt - a.earnedBadge.awardedAt)
      .slice(0, 3)
  );

  // ===================================
  // BASESTORE IMPLEMENTATION
  // ===================================

  protected async fetchData(): Promise<EarnedBadge[]> {
    const user = this._authStore.user();
    if (!user?.uid) {
      console.log('[BadgeStore] No authenticated user, returning empty badges');
      return [];
    }

    console.log('[BadgeStore] Loading earned badges for user:', user.uid);
    return this._badgeService.getEarnedBadgesForUser(user.uid);
  }

  // ===================================
  // INITIALIZATION
  // ===================================

  override async loadOnce(): Promise<void> {
    // Load both badge definitions and user's earned badges
    await Promise.all([
      this.loadDefinitions(),
      super.loadOnce() // Load user's earned badges from BaseStore
    ]);
  }

  async loadDefinitions(): Promise<void> {
    if (this._definitions().length || this._definitionsLoading()) return;

    this._definitionsLoading.set(true);
    this._definitionsError.set(null);

    try {
      const definitions = await this._badgeService.getBadges();
      this._definitions.set(definitions);
      console.log('[BadgeStore] ✅ Loaded badge definitions:', definitions.length);
    } catch (error: any) {
      this._definitionsError.set(error?.message || 'Failed to load badge definitions');
      console.error('[BadgeStore] Failed to load badge definitions:', error);
    } finally {
      this._definitionsLoading.set(false);
    }
  }

  // ===================================
  // CLEAN BADGE DEFINITION METHODS
  // ===================================

  /**
   * Create a new badge definition
   */
  async createBadge(badge: Badge): Promise<void> {
    console.log('[BadgeStore] Creating badge:', badge.name);
    await this._badgeService.createBadge(badge);

    // Update local definitions
    this._definitions.update(current => [...current, badge]);
  }

  /**
   * Update an existing badge definition
   */
  async updateBadge(badgeId: string, updates: Partial<Badge>): Promise<void> {
    console.log('[BadgeStore] Updating badge:', badgeId);
    await this._badgeService.updateBadge(badgeId, updates);

    // Update local definitions
    this._definitions.update(current =>
      current.map(badge =>
        badge.id === badgeId ? { ...badge, ...updates } : badge
      )
    );
  }

  /**
   * Delete a badge definition
   */
  async deleteBadge(badgeId: string): Promise<void> {
    console.log('[BadgeStore] Deleting badge:', badgeId);
    await this._badgeService.deleteBadge(badgeId);

    // Update local definitions
    this._definitions.update(current =>
      current.filter(badge => badge.id !== badgeId)
    );
  }

  /**
   * Save a badge (create or update automatically)
   */
  async saveBadge(badge: Badge): Promise<void> {
    const existing = this.getBadge(badge.id);

    if (existing) {
      await this.updateBadge(badge.id, badge);
    } else {
      await this.createBadge(badge);
    }
  }

  /**
   * Get a single badge definition by ID
   */
  getBadge(badgeId: string): Badge | undefined {
    return this._definitions().find(badge => badge.id === badgeId);
  }

  // ===================================
  // BACKWARD COMPATIBILITY
  // ===================================

  createBadgeDefinition = this.createBadge;
  updateBadgeDefinition = this.updateBadge;
  deleteBadgeDefinition = this.deleteBadge;
  getBadgeDefinition = this.getBadge;

  // ===================================
  // BADGE AWARDING
  // ===================================

  async awardBadge(badgeId: string, metadata?: Record<string, any>): Promise<EarnedBadge> {
    const user = this._authStore.user();
    if (!user?.uid) {
      throw new Error('No authenticated user');
    }

    // Check if badge definition exists
    const badgeDefinition = this.getBadge(badgeId);
    if (!badgeDefinition) {
      throw new Error(`Badge definition not found: ${badgeId}`);
    }

    // Check if user already has this badge
    if (this.hasEarnedBadge(badgeId)) {
      throw new Error(`User already has badge: ${badgeId}`);
    }

    try {
      // 1. Award badge via service (creates in earnedBadges collection)
      const earnedBadge = await this._badgeService.awardBadge(user.uid, badgeId, metadata);

      // 2. Update local earned badges state
      this._data.update(current => [...current, earnedBadge]);

      // 3. Update user summary for performance
      await this.updateUserBadgeSummary(user.uid);

      console.log(`[BadgeStore] ✅ Badge awarded: ${badgeId} to user ${user.uid}`);
      return earnedBadge;
    } catch (error: any) {
      this._error.set(error?.message || 'Failed to award badge');
      console.error('[BadgeStore] awardBadge error:', error);
      throw error;
    }
  }

  // ===================================
  // USER SUMMARY UPDATES
  // ===================================

  private async updateUserBadgeSummary(userId: string): Promise<void> {
    const currentBadges = this.earnedBadges();
    const summary = {
      badgeCount: currentBadges.length,
      badgeIds: currentBadges.map(b => b.badgeId)
    };

    try {
      // Update user document summary
      await this._badgeService.updateUserBadgeSummary(userId, summary);

      // Update local UserStore
      this._userStore.updateBadgeSummary(summary);

      console.log('[BadgeStore] ✅ Updated user badge summary:', summary);
    } catch (error) {
      console.error('[BadgeStore] Failed to update user badge summary:', error);
      // Don't throw - badge was awarded successfully, summary update is secondary
    }
  }

  // ===================================
  // QUERY METHODS
  // ===================================

  hasEarnedBadge(badgeId: string): boolean {
    return this.earnedBadges().some(badge => badge.badgeId === badgeId);
  }

  getEarnedBadge(badgeId: string): EarnedBadge | undefined {
    return this.earnedBadges().find(badge => badge.badgeId === badgeId);
  }

  getEarnedBadgesSince(timestamp: number): EarnedBadge[] {
    return this.earnedBadges().filter(badge => badge.awardedAt >= timestamp);
  }

  // ===================================
  // BADGE REVOCATION (Admin)
  // ===================================

  async revokeBadge(badgeId: string): Promise<void> {
    const user = this._authStore.user();
    if (!user?.uid) {
      throw new Error('No authenticated user');
    }

    const earnedBadge = this.getEarnedBadge(badgeId);
    if (!earnedBadge) {
      throw new Error(`User does not have badge: ${badgeId}`);
    }

    try {
      // 1. Revoke via service
      await this._badgeService.revokeBadge(user.uid, badgeId);

      // 2. Update local state
      this._data.update(current => current.filter(b => b.badgeId !== badgeId));

      // 3. Update user summary
      await this.updateUserBadgeSummary(user.uid);

      console.log(`[BadgeStore] ✅ Badge revoked: ${badgeId}`);
    } catch (error: any) {
      this._error.set(error?.message || 'Failed to revoke badge');
      console.error('[BadgeStore] revokeBadge error:', error);
      throw error;
    }
  }

  // ===================================
  // UTILITY METHODS
  // ===================================

  /**
   * Check if a badge exists by ID
   */
  badgeExists(badgeId: string): boolean {
    return !!this.getBadge(badgeId);
  }

  /**
   * Get badge by name (useful for admin features)
   */
  async getBadgeByName(name: string): Promise<Badge | null> {
    return this._badgeService.getBadgeByName(name);
  }

  /**
   * Get users who have earned a specific badge
   */
  async getUsersWithBadge(badgeId: string): Promise<string[]> {
    return this._badgeService.getUsersWithBadge(badgeId);
  }

  /**
   * Get leaderboard for a specific badge (first to earn)
   */
  async getBadgeLeaderboard(badgeId: string, limit: number = 10): Promise<EarnedBadge[]> {
    return this._badgeService.getBadgeLeaderboard(badgeId, limit);
  }

  /**
   * Get badge award statistics
   */
  async getBadgeStats(): Promise<Record<string, number>> {
    return this._badgeService.getBadgeAwardCounts();
  }

  // ===================================
  // DEBUG INFO
  // ===================================

  override getDebugInfo() {
    return {
      ...super.getDebugInfo(),
      definitionCount: this._definitions().length,
      definitionsLoading: this._definitionsLoading(),
      earnedBadgeCount: this.earnedBadgeCount(),
      recentBadgeIds: this.recentBadges().map(b => b.badgeId),
      hasDefinitions: this._definitions().length > 0,
      hasEarnedBadges: this.hasEarnedBadges()
    };
  }
}
