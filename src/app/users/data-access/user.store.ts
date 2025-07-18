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
 * - CheckInStore data → computed via DataAggregatorService (no direct update needed)
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
import { CacheCoherenceService } from '../../shared/data-access/cache-coherence.service';
import type { User, UserBadgeSummary, UserLandlordSummary } from '../utils/user.model';

@Injectable({ providedIn: 'root' })
export class UserStore {
  // 🔧 Dependencies
  private readonly userService = inject(UserService);
  private readonly authStore = inject(AuthStore);
  private readonly cacheCoherence = inject(CacheCoherenceService);

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
   * @description This eliminates circular dependency between UserStore and CheckInStore.
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
      const currentUserSlice = authUser?.uid?.slice(0, 8) || 'none';
      const lastUserSlice = this.lastLoadedUserId?.slice(0, 8) || 'none';

      console.log(`🔄 [UserStore] Auth state change: ${lastUserSlice} → ${currentUserSlice}`);

      if (!authUser) {
        console.log('🔄 [UserStore] User logged out, clearing cached profile');
        this.reset();
        this.lastLoadedUserId = null;
        return;
      }

      // 🔍 Cache check for existing user profile
      if (authUser.uid === this.lastLoadedUserId) {
        const currentUser = this.user();
        console.log(`✅ [UserStore] Cache HIT - Using cached profile for user: ${currentUserSlice} (${currentUser?.displayName || 'Loading...'})`);
        return;
      }

      // 📡 Cache miss: New user profile needed
      console.log(`📡 [UserStore] Cache MISS - Fetching user profile from Firebase for: ${currentUserSlice}`);
      this.lastLoadedUserId = authUser.uid;
      // Only load user profile, don't create document during onboarding
      this.loadUserProfile(authUser.uid);
    });
    
    // ✅ Listen to cache invalidation signals
    effect(() => {
      const invalidation = this.cacheCoherence.invalidations();
      if (invalidation?.collection === 'users' && this.authStore.user()) {
        console.log('[UserStore] 🔄 Cache invalidated, reloading user data');
        this.handleCacheInvalidation(invalidation.reason);
      }
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
   * Load existing user profile without creating new document
   * Used during onboarding to avoid premature document creation
   */
  private async loadUserProfile(uid: string): Promise<void> {
    if (this._loading()) {
      console.log('⏳ [UserStore] Load already in progress, waiting for completion...');
      return;
    }

    console.log(`📡 [UserStore] Loading existing user profile: ${uid.slice(0, 8)}`);
    this._loading.set(true);
    this._error.set(null);

    try {
      // ✅ Try to load existing user document only
      const userData = await firstValueFrom(this.userService.getUser(uid));

      if (userData) {
        console.log(`✅ [UserStore] Existing user profile loaded: ${userData.displayName}`);
        this._user.set(userData);
      } else {
        console.log(`📝 [UserStore] No existing user profile found - will be created after onboarding`);
        // Don't create document - let onboarding completion handle it
        this._user.set(null);
      }
    } catch (error: any) {
      console.error(`❌ [UserStore] Failed to load user profile:`, error);
      this._error.set(error?.message || 'Failed to load user profile');
      this._user.set(null);
    } finally {
      this._loading.set(false);
    }
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

    console.log('[UserStore] 🚀 updateProfile called with:', updates);
    console.log('[UserStore] 🔍 Current user before update:', {
      uid: current?.uid?.slice(0, 8),
      onboardingCompleted: current?.onboardingCompleted,
      displayName: current?.displayName
    });

    if (!current || !authUser) {
      throw new Error('No user found');
    }

    this._loading.set(true);
    this._error.set(null);

    // ✅ Optimistic update
    const updatedUser = { ...current, ...updates };
    console.log('[UserStore] 📝 Setting optimistic update:', {
      uid: updatedUser.uid?.slice(0, 8),
      onboardingCompleted: updatedUser.onboardingCompleted,
      displayName: updatedUser.displayName
    });
    this._user.set(updatedUser);

    try {
      // ✅ Update Firestore user document
      console.log('[UserStore] 💾 Updating Firestore document...');
      await this.userService.updateUser(current.uid, updates);
      console.log('[UserStore] ✅ Firestore document updated');

      // ✅ Update Firebase Auth profile if display name or avatar changed
      if (updates.displayName || updates.photoURL) {
        console.log('[UserStore] 🔄 Updating Firebase Auth profile...');
        const auth = getAuth();
        const fbUser = auth.currentUser;
        if (fbUser) {
          await updateProfile(fbUser, {
            displayName: updates.displayName || fbUser.displayName,
            photoURL: updates.photoURL || fbUser.photoURL,
          });
          console.log('[UserStore] ✅ Firebase Auth profile updated');
          
          // ✅ Tell AuthStore to refresh its user signal with fresh Firebase Auth data
          this.authStore.refreshCurrentUser();
        }
      }

      console.log('[UserStore] ✅ Profile update completed successfully');
      
      // Verify the signal was updated
      const finalUser = this._user();
      console.log('[UserStore] 🔍 Final user state:', {
        uid: finalUser?.uid?.slice(0, 8),
        onboardingCompleted: finalUser?.onboardingCompleted,
        displayName: finalUser?.displayName
      });
      
      // ✅ NEW: Trigger cache invalidation to ensure UI consistency
      console.log('[UserStore] 🔄 Triggering cache invalidation for user profile update');
      this.cacheCoherence.invalidate('users', 'profile-update');
      
    } catch (error: any) {
      // ❌ Rollback optimistic update
      console.log('[UserStore] ❌ Rolling back optimistic update due to error');
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

  /**
   * Create a complete user document with all onboarding data
   * Used by registration flow to create user document with all collected data
   */
  async createCompleteUserDocument(uid: string, userData: User): Promise<void> {
    console.log('[UserStore] 📝 Creating complete user document for:', uid);
    
    try {
      // Create the document in Firestore
      await this.userService.createUser(uid, userData);
      
      // Update local state
      this._user.set(userData);
      this._error.set(null);
      
      console.log('[UserStore] ✅ Complete user document created');
    } catch (error: any) {
      console.error('[UserStore] ❌ Failed to create complete user document:', error);
      this._error.set(error?.message || 'Failed to create user document');
      throw error;
    }
  }

  // ===================================
  // CACHE INVALIDATION HANDLING
  // ===================================
  
  /**
   * Handle cache invalidation by reloading fresh user data
   * @param reason - Reason for the invalidation (for logging)
   */
  private async handleCacheInvalidation(reason?: string): Promise<void> {
    const currentUser = this.authStore.user();
    if (!currentUser) {
      console.log('[UserStore] ⚠️ No current user for cache invalidation');
      return;
    }
    
    console.log('[UserStore] 🔄 === HANDLING CACHE INVALIDATION ===');
    console.log('[UserStore] 🔄 Reason:', reason || 'unspecified');
    console.log('[UserStore] 🔄 User ID:', currentUser.uid.slice(0, 8));
    
    try {
      // Reload fresh user data from Firestore (bypasses cache)
      await this.loadOrCreateUser(currentUser.uid);
      console.log('[UserStore] ✅ Fresh user data loaded after cache invalidation');
    } catch (error) {
      console.error('[UserStore] ❌ Failed to reload user data after cache invalidation:', error);
    }
  }

  // ===================================
  // PRIVATE METHODS
  // ===================================

  /**
   * ✅ FIXED: Load user from Firestore, create if doesn't exist
   */
  private async loadOrCreateUser(uid: string): Promise<void> {
    if (this._loading()) {
      console.log('⏳ [UserStore] Load already in progress, waiting for completion...');
      return;
    }

    console.log(`📡 [UserStore] Starting Firebase fetch for user profile: ${uid.slice(0, 8)}`);
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
            manuallyAddedPubIds: [],
            verifiedPubCount: 0,
            unverifiedPubCount: 0,
            totalPubCount: 0,
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
      console.log(`✅ [UserStore] Firebase data loaded successfully: User profile cached for ${userData.displayName || userData.email || 'user'}`);

    } catch (error: any) {
      this._error.set(error?.message || 'Failed to load user');
      console.error('❌ [UserStore] Firebase fetch failed:', error);
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
   * Add a pub to user's visited list (for manual "I've been here" associations)
   */
  async addVisitedPub(pubId: string): Promise<void> {
    const current = this._user();
    if (!current) {
      throw new Error('No user found');
    }

    const currentManualPubs = current.manuallyAddedPubIds || [];
    if (currentManualPubs.includes(pubId)) {
      console.log('[UserStore] Pub already in manually added list:', pubId);
      return;
    }

    const updatedManualPubs = [...currentManualPubs, pubId];
    
    // Update both locally and in Firestore
    await this.updateProfile({ 
      manuallyAddedPubIds: updatedManualPubs,
      unverifiedPubCount: updatedManualPubs.length,
      totalPubCount: (current.verifiedPubCount || 0) + updatedManualPubs.length
    });

    console.log('[UserStore] Added pub to visited list:', pubId);
  }

  /**
   * Remove a pub from user's visited list
   */
  async removeVisitedPub(pubId: string): Promise<void> {
    const current = this._user();
    if (!current) {
      throw new Error('No user found');
    }

    const currentManualPubs = current.manuallyAddedPubIds || [];
    const updatedManualPubs = currentManualPubs.filter(id => id !== pubId);
    
    // Update both locally and in Firestore
    await this.updateProfile({ 
      manuallyAddedPubIds: updatedManualPubs,
      unverifiedPubCount: updatedManualPubs.length,
      totalPubCount: (current.verifiedPubCount || 0) + updatedManualPubs.length
    });

    console.log('[UserStore] Removed pub from visited list:', pubId);
  }

  /**
   * Check if user has marked a pub as visited
   */
  hasVisitedPub(pubId: string): boolean {
    const user = this._user();
    return user?.manuallyAddedPubIds?.includes(pubId) || false;
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
