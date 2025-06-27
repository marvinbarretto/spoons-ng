/**
 * @fileoverview UserStore - Single source of truth for user display data
 * 
 * RESPONSIBILITIES:
 * - User profile state management (auth-reactive pattern)
 * - Display data for scoreboard (totalPoints, pubsVisited, badges, landlord status)
 * - User document CRUD operations in Firestore
 * - Sync with Firebase Auth profile updates
 * 
 * DATA FLOW IN:
 * - AuthStore.user() changes → triggers loadOrCreateUser()
 * - PointsStore.awardPoints() → updates totalPoints via patchUser()
 * - NewCheckinStore data → computed via DataAggregatorService (no direct update needed)
 * - BadgeStore awards → updates badgeCount/badgeIds via updateBadgeSummary()
 * - LandlordStore → updates landlordCount/landlordPubIds via updateLandlordSummary()
 * 
 * DATA FLOW OUT:
 * - HomeComponent.scoreboardData → reads totalPoints, pubsVisited from here
 * - All UI components → read user profile data from here
 * - Other stores → read user context for operations
 * 
 * CRITICAL: This store must stay in sync with all user data changes
 * to ensure scoreboard and UI accuracy. Any operation that changes user
 * stats must update this store immediately.
 * 
 * @architecture Auth-Reactive Pattern - automatically loads/clears based on auth state
 */
import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { getAuth, updateProfile } from 'firebase/auth';
import { firstValueFrom } from 'rxjs';
import { UserService } from './user.service';
import { AuthStore } from '../../auth/data-access/auth.store';
import type { User, UserBadgeSummary, UserLandlordSummary } from '../utils/user.model';

@Injectable({ providedIn: 'root' })
export class UserStore {
  // 🔧 Dependencies
  private readonly userService = inject(UserService);
  private readonly authStore = inject(AuthStore);

  // ✅ User profile state
  private readonly _user = signal<User | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  // 📡 Public signals
  readonly user = this._user.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly isLoaded = computed(() => !this._loading() && !!this._user());

  // ✅ User profile computeds
  readonly displayName = computed(() => {
    const user = this.user();
    if (!user) return null;
    if (user.isAnonymous) return user.displayName || 'Anonymous User';
    return user.displayName || user.email?.split('@')[0] || 'User';
  });

  readonly avatarUrl = computed(() => {
    return this.user()?.photoURL || null;
  });

  readonly hasUser = computed(() => !!this.user());
  readonly hasLandlordPubs = computed(() => (this.user()?.landlordCount || 0) > 0);
  readonly badgeCount = computed(() => this.user()?.badgeCount || 0);
  readonly badgeIds = computed(() => this.user()?.badgeIds || []);
  readonly hasBadges = computed(() => this.badgeCount() > 0);
  readonly landlordCount = computed(() => this.user()?.landlordCount || 0);
  readonly landlordPubIds = computed(() => this.user()?.landlordPubIds || []);

  /**
   * REMOVED: pubsVisited computation moved to ScoreboardOrchestratorService
   * @description This eliminates circular dependency between UserStore and NewCheckinStore.
   * Use ScoreboardOrchestratorService.pubsVisited instead.
   */

  /**
   * User's total points (for scoreboard display)
   * @description Updated by PointsStore when points are awarded
   */
  readonly totalPoints = computed(() => this.user()?.totalPoints || 0);

  // 🔄 Track auth user changes
  private lastLoadedUserId: string | null = null;

  constructor() {
    // ✅ Listen to auth changes and load user profile
    effect(() => {
      const authUser = this.authStore.user();

      if (!authUser) {
        console.log('[UserStore] 🚪 User logged out, clearing profile');
        this.reset();
        this.lastLoadedUserId = null;
        return;
      }

      // Only reload if the AUTH USER ID changed (not profile data)
      if (authUser.uid === this.lastLoadedUserId) {
        console.log('[UserStore] ⏭ Auth user unchanged, skipping reload');
        return;
      }

      console.log('[UserStore] 👤 Loading profile for user:', authUser.uid);
      this.lastLoadedUserId = authUser.uid;
      this.loadOrCreateUser(authUser.uid);
    });
  }

  // ===================================
  // PUBLIC LOADING METHODS
  // ===================================

  /**
   * Load user data for a specific user ID
   * @param userId - Firebase Auth user ID
   * @description Called by components when needed. Triggers loadOrCreateUser() internally.
   * Usually not needed since auth-reactive pattern handles loading automatically.
   */
  async loadUser(userId: string): Promise<void> {
    console.log('[UserStore] 🔄 Public loadUser called for:', userId);
    await this.loadOrCreateUser(userId);
  }

  /**
   * Force reload current user data
   */
  async reload(): Promise<void> {
    const currentUser = this.user();
    if (currentUser) {
      console.log('[UserStore] 🔄 Reloading current user:', currentUser.uid);
      await this.loadOrCreateUser(currentUser.uid);
    }
  }

  // ===================================
  // USER PROFILE OPERATIONS
  // ===================================

  /**
   * Update user profile (handles both Firestore and Firebase Auth)
   * @param updates - Partial user data to update
   * @description Updates Firestore user document and Firebase Auth profile.
   * Uses optimistic updates - immediately updates local state, rollback on error.
   * @throws Error if update fails (after rollback)
   */
  async updateProfile(updates: Partial<User>): Promise<void> {
    const current = this._user();
    const authUser = this.authStore.user();

    if (!current || !authUser) {
      throw new Error('No user found');
    }

    this._loading.set(true);
    this._error.set(null);

    // ✅ Optimistic update
    const updatedUser = { ...current, ...updates };
    this._user.set(updatedUser);

    try {
      // ✅ Update Firestore user document
      await this.userService.updateUser(current.uid, updates);

      // ✅ Update Firebase Auth profile if display name or avatar changed
      if (updates.displayName || updates.photoURL) {
        const auth = getAuth();
        const fbUser = auth.currentUser;
        if (fbUser) {
          await updateProfile(fbUser, {
            displayName: updates.displayName || fbUser.displayName,
            photoURL: updates.photoURL || fbUser.photoURL,
          });
        }
      }

      console.log('[UserStore] ✅ Profile updated');
    } catch (error: any) {
      // ❌ Rollback optimistic update
      this._user.set(current);
      this._error.set(error?.message || 'Failed to update profile');
      console.error('[UserStore] ❌ Profile update failed:', error);
      throw error;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Update user avatar
   */
  async updateAvatar(avatarUrl: string): Promise<void> {
    await this.updateProfile({ photoURL: avatarUrl });
  }

  /**
   * Update display name
   */
  async updateDisplayName(displayName: string): Promise<void> {
    await this.updateProfile({ displayName });
  }

  // ===================================
  // PRIVATE METHODS
  // ===================================

  /**
   * ✅ FIXED: Load user from Firestore, create if doesn't exist
   */
  private async loadOrCreateUser(uid: string): Promise<void> {
    if (this._loading()) {
      console.log('[UserStore] Load already in progress, skipping');
      return;
    }

    this._loading.set(true);
    this._error.set(null);

    try {
      // ✅ Try to load existing user document
      let userData = await firstValueFrom(this.userService.getUser(uid));

      // ✅ If user document doesn't exist, create it using auth data
      if (!userData) {
        const authUser = this.authStore.user();
        if (authUser) {
          console.log('[UserStore] 📝 Creating new user document for:', uid);

          const newUserData: User = {
            uid: authUser.uid,
            email: authUser.email,
            photoURL: authUser.photoURL,
            displayName: authUser.displayName,
            isAnonymous: authUser.isAnonymous,
            emailVerified: authUser.emailVerified,
            streaks: {},
            joinedAt: new Date().toISOString(),
            badgeCount: 0,
            badgeIds: [],
            landlordCount: 0,
            landlordPubIds: [],
            joinedMissionIds: [],
          };

          // ✅ Create the document in Firestore
          await this.userService.createUser(uid, newUserData);
          userData = newUserData;

          console.log('[UserStore] ✅ New user document created');
        } else {
          throw new Error('No auth user data available for document creation');
        }
      }

      this._user.set(userData);
      console.log('[UserStore] ✅ User profile loaded');

    } catch (error: any) {
      this._error.set(error?.message || 'Failed to load user');
      console.error('[UserStore] ❌ Load/create user failed:', error);
    } finally {
      this._loading.set(false);
    }
  }

  // ===================================
  // SUMMARY UPDATES (Called by other stores)
  // ===================================

  /**
   * Update badge summary (called by BadgeStore)
   */
  updateBadgeSummary(summary: UserBadgeSummary): void {
    console.log('[UserStore] 🏅 Updating badge summary:', summary);
    this.patchUser(summary);
  }

  /**
   * Update landlord summary (called by LandlordStore)
   */
  updateLandlordSummary(summary: UserLandlordSummary): void {
    console.log('[UserStore] 👑 Updating landlord summary:', summary);
    this.patchUser(summary);
  }

  /**
   * Patch user data (optimistic local update only)
   * @param updates - Partial user data to merge with current user
   * @description CRITICAL for scoreboard accuracy. Used by other stores
   * to immediately update user stats (points, badges, check-ins).
   * Only updates local state - does not persist to Firestore.
   * @example 
   * // PointsStore awards points
   * userStore.patchUser({ totalPoints: newTotal });
   * 
   * // pubsVisited count now computed by DataAggregatorService
   */
  patchUser(updates: Partial<User>): void {
    const current = this._user();
    if (!current) {
      console.warn('[UserStore] ⚠️ Cannot patch user - no current user');
      return;
    }

    console.log('[UserStore] 🔧 Patching user with:', updates);
    this._user.set({ ...current, ...updates });
  }

  /**
   * Set user directly (used by other systems)
   */
  setUser(user: User | null): void {
    console.log('[UserStore] 📝 Setting user:', user?.uid || 'null');
    this._user.set(user);
  }

  // ===================================
  // UTILITY METHODS
  // ===================================

  /**
   * Check user condition
   */
  has(predicate: (user: User) => boolean): boolean {
    const user = this._user();
    return user ? predicate(user) : false;
  }

  /**
   * Get debug information
   */
  getDebugInfo(): object {
    return {
      hasUser: !!this._user(),
      loading: this._loading(),
      error: this._error(),
      lastLoadedUserId: this.lastLoadedUserId,
      userUid: this._user()?.uid || null,
      badgeCount: this.badgeCount(),
      landlordCount: this.landlordCount()
    };
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this._error.set(null);
  }

  reset(): void {
    this._user.set(null);
    this._loading.set(false);
    this._error.set(null);
  }
}
