// src/app/badges/data-access/badge.store.ts
import { Injectable, computed, inject, signal } from '@angular/core';
import { BaseStore } from '@shared/data-access/base.store';
import { CacheService } from '@shared/data-access/cache.service';
import type { EarnedBadge, Badge } from '../utils/badge.model';
import { BadgeService } from './badge.service';
import { UserStore } from '@users/data-access/user.store';
import { AuthStore } from '@auth/data-access/auth.store';

@Injectable({ providedIn: 'root' })
export class BadgeStore extends BaseStore<EarnedBadge> {
  private readonly _badgeService = inject(BadgeService);
  private readonly _userStore = inject(UserStore);
  private readonly cacheService = inject(CacheService);

  // ===================================
  // 🏆 BADGE DEFINITIONS (Global Data)
  // ===================================

  private readonly _definitions = signal<Badge[]>([]);
  private readonly _definitionsLoading = signal(false);
  private readonly _definitionsError = signal<string | null>(null);
  private _definitionsLoaded = false;

  readonly definitions = this._definitions.asReadonly();
  readonly definitionsLoading = this._definitionsLoading.asReadonly();
  readonly definitionsError = this._definitionsError.asReadonly();

  // Clean aliases
  readonly badges = this.definitions;

  // ===================================
  // 🎖️ EARNED BADGES (User-specific, from BaseStore)
  // ===================================

  readonly earnedBadges = this.data; // Alias for clarity
  readonly earnedBadgeCount = computed(() => this.data().length);
  readonly hasEarnedBadges = computed(() => this.earnedBadgeCount() > 0);

  // ===================================
  // 🔗 COMBINED DATA (For UI)
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

  constructor() {
    super();
    console.log('[BadgeStore] ✅ Initialized with mixed caching strategy');
  }

  // ===================================
  // 🏪 BASESTORE IMPLEMENTATION (Earned Badges)
  // ===================================

  protected async fetchData(): Promise<EarnedBadge[]> {
    const userId = this._userId();
    if (!userId) {
      console.log('[BadgeStore] 📭 No user - returning empty earned badges');
      return [];
    }

    console.log('[BadgeStore] 📡 Loading earned badges for user:', userId);

    // ✅ Earned badges are USER-SPECIFIC data
    return this.cacheService.load({
      key: 'earned-badges',
      userId, // User-specific cache
      ttlMs: 1000 * 60 * 15, // 15 minutes
      loadFresh: async () => {
        console.log('[BadgeStore] 🌐 Fetching earned badges from network...');
        const earnedBadges = await this._badgeService.getEarnedBadgesForUser(userId);
        console.log('[BadgeStore] ✅ Network fetch complete:', earnedBadges.length, 'earned badges');
        return earnedBadges;
      }
    });
  }

  // ===================================
  // 🌍 BADGE DEFINITIONS LOADING (Global Data)
  // ===================================

  async loadDefinitions(): Promise<void> {
    // Check if definitions are actually loaded (not just the flag)
    const currentDefinitions = this._definitions();

    if (this._definitionsLoaded && currentDefinitions.length > 0) {
      console.log('[BadgeStore] ⏭ Badge definitions already loaded:', currentDefinitions.length, 'definitions');
      return;
    }

    if (this._definitionsLoading()) {
      console.log('[BadgeStore] ⏳ Badge definitions currently loading...');
      return;
    }

    // Reset flag if definitions are empty
    if (currentDefinitions.length === 0) {
      console.log('[BadgeStore] ⚠️ Definitions flag was true but array is empty, resetting...');
      this._definitionsLoaded = false;
    }

    this._definitionsLoading.set(true);
    this._definitionsError.set(null);

    try {
      console.log('[BadgeStore] 📡 Loading badge definitions...');

      // ✅ Badge definitions are GLOBAL data
      const definitions = await this.cacheService.load({
        key: 'badge-definitions',
        ttlMs: 1000 * 60 * 60 * 24, // 24 hours (definitions change rarely)
        loadFresh: async () => {
          console.log('[BadgeStore] 🌐 Fetching badge definitions from network...');
          const defs = await this._badgeService.getBadges();
          console.log('[BadgeStore] ✅ Network fetch complete:', defs.length, 'badge definitions');
          console.log('[BadgeStore] 📋 Badge definitions:', defs.map(d => ({ id: d.id, name: d.name })));
          return defs;
        }
        // No userId - global cache
      });

      console.log('[BadgeStore] 📦 Cache returned:', definitions.length, 'definitions');

      if (!definitions || definitions.length === 0) {
        console.warn('[BadgeStore] ⚠️ No badge definitions returned from cache/network!');
      }

      this._definitions.set(definitions);
      this._definitionsLoaded = true;
      console.log('[BadgeStore] ✅ Badge definitions loaded:', definitions.length);
      console.log('[BadgeStore] ✅ Badge IDs:', definitions.map(d => d.id));
    } catch (error: any) {
      this._definitionsError.set(error?.message || 'Failed to load badge definitions');
      console.error('[BadgeStore] ❌ Failed to load badge definitions:', error);
    } finally {
      this._definitionsLoading.set(false);
    }
  }

  // ===================================
  // 🚀 INITIALIZATION
  // ===================================

  override async loadOnce(): Promise<void> {
    console.log('[BadgeStore] 🚀 Loading both definitions and earned badges...');

    // Load both badge definitions and user's earned badges
    await Promise.all([
      this.loadDefinitions(),
      super.loadOnce() // Load user's earned badges from BaseStore
    ]);

    console.log('[BadgeStore] ✅ Full badge data loaded');
  }

  // ===================================
  // 🧽 CACHE MANAGEMENT
  // ===================================

  /**
   * Override reset to also clear cache for current user
   */
  override reset(): void {
    const currentUser = this.authStore.user();
    console.log('[BadgeStore] 🧽 Resetting badge store, current user:', currentUser?.uid || 'none');

    // Clear cache for current user if exists
    if (currentUser?.uid) {
      this.cacheService.clear('earned-badges', currentUser.uid);
    }

    // Call parent reset to clear data and state
    super.reset();

    console.log('[BadgeStore] ✅ Badge store reset complete');
  }

  protected override onUserReset(userId?: string): void {
    if (userId) {
      console.log('[BadgeStore] 🧽 Clearing earned badges cache for user:', userId);
      this.cacheService.clear('earned-badges', userId);
      this._data.set([]);
    } else {
      console.log('[BadgeStore] 👋 User logged out - no earned badges cache to clear');
    }

    // ✅ Don't clear badge definitions - they're global
    console.log('[BadgeStore] 🌍 Keeping global badge definitions cache');
  }

  // ===================================
  // 🏆 BADGE DEFINITION MANAGEMENT
  // ===================================

  /**
   * Create a new badge definition
   */
  async createBadge(badge: Badge): Promise<void> {
    console.log('[BadgeStore] 🆕 Creating badge:', badge.name);
    await this._badgeService.createBadge(badge);

    // Update local definitions
    this._definitions.update(current => [...current, badge]);

    // Clear global cache to ensure fresh data
    this.cacheService.clear('badge-definitions');
    console.log('[BadgeStore] 🧽 Cleared global definitions cache after create');
  }

  /**
   * Update an existing badge definition
   */
  async updateBadge(badgeId: string, updates: Partial<Badge>): Promise<void> {
    console.log('[BadgeStore] ✏️ Updating badge:', badgeId);
    await this._badgeService.updateBadge(badgeId, updates);

    // Update local definitions
    this._definitions.update(current =>
      current.map(badge =>
        badge.id === badgeId ? { ...badge, ...updates } : badge
      )
    );

    // Clear global cache to ensure fresh data
    this.cacheService.clear('badge-definitions');
    console.log('[BadgeStore] 🧽 Cleared global definitions cache after update');
  }

  /**
   * Delete a badge definition
   */
  async deleteBadge(badgeId: string): Promise<void> {
    console.log('[BadgeStore] 🗑️ Deleting badge:', badgeId);
    await this._badgeService.deleteBadge(badgeId);

    // Update local definitions
    this._definitions.update(current =>
      current.filter(badge => badge.id !== badgeId)
    );

    // Clear global cache to ensure fresh data
    this.cacheService.clear('badge-definitions');
    console.log('[BadgeStore] 🧽 Cleared global definitions cache after delete');
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
  // 🎖️ BADGE AWARDING
  // ===================================

  async awardBadge(badgeId: string, metadata?: Record<string, any>): Promise<EarnedBadge> {
    const user = this.authStore.user();
    if (!user?.uid) {
      throw new Error('No authenticated user');
    }

    console.log('[BadgeStore] 🏅 Awarding badge:', badgeId, 'to user:', user.uid);

    // Log current state
    const currentDefinitions = this._definitions();
    console.log('[BadgeStore] 📊 Current definitions count:', currentDefinitions.length);
    console.log('[BadgeStore] 📊 Available badge IDs:', currentDefinitions.map(d => d.id));

    // Check if badge definition exists
    const badgeDefinition = this.getBadge(badgeId);
    if (!badgeDefinition) {
      console.error('[BadgeStore] ❌ Badge not found in definitions:', badgeId);
      console.error('[BadgeStore] ❌ Loaded flag:', this._definitionsLoaded);
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

      // 3. Clear user cache to ensure fresh data
      this.cacheService.clear('earned-badges', user.uid);

      // 4. Update user summary for performance
      await this.updateUserBadgeSummary(user.uid);

      console.log('[BadgeStore] ✅ Badge awarded successfully:', badgeId);
      return earnedBadge;
    } catch (error: any) {
      this._error.set(error?.message || 'Failed to award badge');
      console.error('[BadgeStore] ❌ awardBadge error:', error);
      throw error;
    }
  }

  // ===================================
  // 👤 USER SUMMARY UPDATES
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
      console.error('[BadgeStore] ⚠️ Failed to update user badge summary:', error);
      // Don't throw - badge was awarded successfully, summary update is secondary
    }
  }

  // ===================================
  // 🔍 QUERY METHODS
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

  getEarnedBadgesForPub(pubId: string): EarnedBadge[] {
    return this.filter(earned => earned.metadata?.['pubId'] === pubId);
  }

  // ===================================
  // 🚫 BADGE REVOCATION (Admin)
  // ===================================

  async revokeBadge(badgeId: string): Promise<void> {
    const user = this.authStore.user();
    if (!user?.uid) {
      throw new Error('No authenticated user');
    }

    const earnedBadge = this.getEarnedBadge(badgeId);
    if (!earnedBadge) {
      throw new Error(`User does not have badge: ${badgeId}`);
    }

    console.log('[BadgeStore] 🚫 Revoking badge:', badgeId, 'from user:', user.uid);

    try {
      // 1. Revoke via service
      await this._badgeService.revokeBadge(user.uid, badgeId);

      // 2. Update local state
      this._data.update(current => current.filter(b => b.badgeId !== badgeId));

      // 3. Clear user cache
      this.cacheService.clear('earned-badges', user.uid);

      // 4. Update user summary
      await this.updateUserBadgeSummary(user.uid);

      console.log('[BadgeStore] ✅ Badge revoked successfully:', badgeId);
    } catch (error: any) {
      this._error.set(error?.message || 'Failed to revoke badge');
      console.error('[BadgeStore] ❌ revokeBadge error:', error);
      throw error;
    }
  }

  // ===================================
  // 📊 LEADERBOARDS & STATISTICS
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
  // 🔧 MANUAL CACHE MANAGEMENT
  // ===================================

  async refreshDefinitions(): Promise<void> {
    console.log('[BadgeStore] 🔄 Manually refreshing badge definitions');
    this.cacheService.clear('badge-definitions');
    this._definitionsLoaded = false;
    await this.loadDefinitions();
  }

  async refreshUserBadges(): Promise<void> {
    const userId = this._userId();
    if (userId) {
      console.log('[BadgeStore] 🔄 Manually refreshing user badges');
      this.cacheService.clear('earned-badges', userId);
      await this.load();
    }
  }

  clearDefinitionsCache(): void {
    this.cacheService.clear('badge-definitions');
    this._definitionsLoaded = false;
    console.log('[BadgeStore] 🧽 Badge definitions cache cleared');
  }

  clearUserBadgeCache(): void {
    const userId = this._userId();
    if (userId) {
      this.cacheService.clear('earned-badges', userId);
      console.log('[BadgeStore] 🧽 User badge cache cleared for:', userId);
    }
  }

  // ===================================
  // 🔄 BACKWARD COMPATIBILITY
  // ===================================

  createBadgeDefinition = this.createBadge;
  updateBadgeDefinition = this.updateBadge;
  deleteBadgeDefinition = this.deleteBadge;
  getBadgeDefinition = this.getBadge;

  // ===================================
  // 📊 ENHANCED DEBUG INFO
  // ===================================

  override getDebugInfo() {
    return {
      ...super.getDebugInfo(),
      definitionCount: this._definitions().length,
      definitionsLoading: this._definitionsLoading(),
      definitionsLoaded: this._definitionsLoaded,
      earnedBadgeCount: this.earnedBadgeCount(),
      recentBadgeIds: this.recentBadges().map(b => b.badgeId),
      hasDefinitions: this._definitions().length > 0,
      hasEarnedBadges: this.hasEarnedBadges(),
      cacheStatus: {
        definitionsCache: 'global',
        earnedBadgesCache: this._userId() ? `user-${this._userId()}` : 'none'
      }
    };
  }
}
