/**
 * @fileoverview UserStore - Single source of truth for ALL user data
 *
 * RESPONSIBILITIES:
 * - User collection state management (extends BaseStore<User>)
 * - Current user profile (auth-reactive pattern)
 * - Display data for scoreboard (totalPoints, pubsVisited, badges, landlord status)
 * - User document CRUD operations in Firestore
 * - Sync with Firebase Auth profile updates
 *
 * DATA FLOW IN:
 * - AuthStore.user() changes → triggers loadOrCreateUser() + loads all users
 * - PointsStore.awardPoints() → updates totalPoints via patchUser()
 * - CheckInStore data → computed via DataAggregatorService (no direct update needed)
 * - BadgeStore awards → updates badgeCount/badgeIds via updateBadgeSummary()
 * - LandlordStore → updates landlordCount/landlordPubIds via updateLandlordSummary()
 *
 * DATA FLOW OUT:
 * - HomeComponent.scoreboardData → reads totalPoints, pubsVisited from here
 * - AdminComponents → reads data() for all users collection
 * - All UI components → read user profile data from here
 * - Other stores → read user context for operations
 *
 * CRITICAL: This store must stay in sync with all user data changes
 * to ensure scoreboard and UI accuracy. Any operation that changes user
 * stats must update this store immediately.
 *
 * @architecture Auth-Reactive + Collection Pattern - automatically loads/clears based on auth state
 */
import { computed, effect, inject, Injectable } from '@angular/core';
import { getAuth, updateProfile } from 'firebase/auth';
import { firstValueFrom } from 'rxjs';
import { GlobalCheckInStore } from '../../check-in/data-access/global-check-in.store';
import { BaseStore } from '../../shared/base/base.store';
import { CacheCoherenceService } from '../../shared/data-access/cache-coherence.service';
import { DataAggregatorService } from '../../shared/data-access/data-aggregator.service';
import type { User, UserBadgeSummary, UserLandlordSummary } from '../utils/user.model';
import { UserService } from './user.service';

@Injectable({ providedIn: 'root' })
export class UserStore extends BaseStore<User> {
  // 🔧 Dependencies
  protected readonly userService = inject(UserService);
  private readonly cacheCoherence = inject(CacheCoherenceService);
  private readonly dataAggregator = inject(DataAggregatorService);
  private readonly globalCheckInStore = inject(GlobalCheckInStore);

  // 📡 Current user computed from collection using Firebase Auth uid
  readonly currentUser = computed(() => {
    const users = this.data();
    const authUid = this.authStore.uid();
    const foundUser = authUid ? users.find(u => u.uid === authUid) || null : null;

    // Debug logging for current user identification and isAdmin field
    console.log('[UserStore] 🔍 Current user computed - Auth UID:', authUid?.slice(0, 8));
    console.log('[UserStore] 🔍 Users in collection:', users.length);
    console.log('[UserStore] 🔍 Found current user:', {
      found: !!foundUser,
      uid: foundUser?.uid?.slice(0, 8),
      displayName: foundUser?.displayName,
      email: foundUser?.email,
      isAdmin: foundUser?.isAdmin,
      hasIsAdminField: foundUser ? 'isAdmin' in foundUser : false,
    });

    return foundUser;
  });

  // 📡 Legacy compatibility (redirect to currentUser and collection loading)
  readonly user = this.currentUser;
  readonly userLoading = this.loading; // Use collection loading state
  readonly userError = this.error; // Use collection error state
  readonly isLoaded = computed(() => !this.loading() && !!this.currentUser());

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
   * User's total points calculated from check-ins via DataAggregatorService
   * @description Uses DataAggregatorService to calculate points from check-ins, eliminating circular dependencies
   */
  readonly totalPoints = computed(() => {
    const currentUser = this.authStore.user();
    if (!currentUser) {
      return 0;
    }

    // Use DataAggregatorService to calculate points from check-ins (no circular dependency)
    return this.dataAggregator.calculateUserPointsFromCheckins(currentUser.uid);
  });

  /**
   * Total pubs visited (verified + manual, deduplicated)
   * @description Pure computation using DataAggregatorService with user data as parameters
   */
  readonly pubsVisited = computed(() => {
    const user = this.currentUser();
    const authUser = this.authStore.user();

    if (!user || !authUser) {
      return 0;
    }

    // Use DataAggregatorService pure method with user data as parameters
    return this.dataAggregator.getPubsVisitedForUser(authUser.uid, user.manuallyAddedPubIds || []);
  });

  /**
   * Complete scoreboard data for this user
   * @description Reactive scoreboard data using pure DataAggregatorService computation
   */
  readonly scoreboardData = computed(() => {
    const user = this.currentUser();
    const authUser = this.authStore.user();

    if (!user || !authUser) {
      return {
        totalPoints: 0,
        todaysPoints: 0,
        pubsVisited: 0,
        totalPubs: 0,
        badgeCount: 0,
        landlordCount: 0,
        totalCheckins: 0,
        isLoading: false,
      };
    }

    // Get user's check-ins from GlobalCheckInStore for scoreboard calculation
    const allCheckIns = this.globalCheckInStore.allCheckIns();
    const userCheckIns = allCheckIns.filter(c => c.userId === authUser.uid);
    const isLoading = this.globalCheckInStore.loading();

    // Use DataAggregatorService pure method with all required parameters
    return this.dataAggregator.getScoreboardDataForUser(
      authUser.uid,
      {
        manuallyAddedPubIds: user.manuallyAddedPubIds || [],
        badgeCount: user.badgeCount || 0,
        landlordCount: user.landlordCount || 0,
      },
      userCheckIns,
      isLoading
    );
  });

  // 🔄 Track auth user changes
  private lastLoadedUserId: string | null = null;

  constructor() {
    super(); // Call BaseStore constructor - this sets up auth-reactive collection loading

    // ✅ Cache invalidation effect
    effect(() => {
      const invalidation = this.cacheCoherence.invalidations();
      if (invalidation && invalidation.collection === 'users') {
        console.log('[UserStore] 🔄 Cache invalidated, refreshing users collection');
        this.refresh();
      }
    });

    // ✅ Auth change detection with comprehensive cache clearing
    effect(() => {
      const authUid = this.authStore.uid();
      const currentUser = this.currentUser();

      console.log('🔍 [UserStore] === AUTH CHANGE DETECTION ===');
      console.log('🔍 [UserStore] Auth state:', {
        currentAuthUid: authUid?.slice(0, 8),
        lastLoadedUserId: this.lastLoadedUserId?.slice(0, 8),
        hasCurrentUser: !!currentUser,
        currentUserUid: currentUser?.uid?.slice(0, 8),
        isLoading: this.loading(),
        authChanged: authUid !== this.lastLoadedUserId,
      });

      // Detect auth user changes (login, logout, account switch)
      if (authUid !== this.lastLoadedUserId) {
        console.log('🔄 [UserStore] === AUTH USER CHANGED ===');
        console.log('🔄 [UserStore] Previous user:', this.lastLoadedUserId?.slice(0, 8) || 'none');
        console.log('🔄 [UserStore] New user:', authUid?.slice(0, 8) || 'none');

        // Clear potentially stale cached data from previous user
        if (this.lastLoadedUserId && authUid) {
          console.log(
            '🗋 [UserStore] User account switched - triggering comprehensive cache invalidation'
          );
          this.cacheCoherence.invalidateMultiple(
            ['users', 'checkins', 'points', 'user-profiles'],
            'auth-user-switched'
          );
        } else if (!this.lastLoadedUserId && authUid) {
          console.log('🔑 [UserStore] User logged in - triggering cache refresh for new session');
          this.cacheCoherence.invalidate('users', 'auth-user-login');
        } else if (this.lastLoadedUserId && !authUid) {
          console.log('🚪 [UserStore] User logged out - clearing all cached data');
          this.cacheCoherence.invalidateMultiple(
            ['users', 'checkins', 'points', 'user-profiles', 'leaderboards'],
            'auth-user-logout'
          );
          // Clear local state immediately on logout
          this.reset();
        }

        this.lastLoadedUserId = authUid;
      }

      // Ensure current user exists in collection if auth is present but user not loaded
      if (authUid && !currentUser && !this.loading()) {
        console.log(
          `[UserStore] Current user ${authUid.slice(0, 8)} not in collection, creating if needed`
        );
        this.ensureCurrentUserExists(authUid);
      }
    });
  }

  // ===================================
  // PUBLIC LOADING METHODS
  // ===================================

  /**
   * Ensure current user exists in collection and Firestore
   */
  async ensureCurrentUserExists(uid: string): Promise<void> {
    try {
      // First check if user document exists in Firestore
      let userData = await firstValueFrom(this.userService.getUser(uid));

      // If user document doesn't exist, create it using auth data
      if (!userData) {
        const authUser = this.authStore.user();
        if (authUser) {
          console.log('[UserStore] 📝 Creating new user document for:', uid.slice(0, 8));

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

          await this.userService.createUser(uid, newUserData);
          userData = newUserData;
        }
      }

      // Add to collection if not already there
      if (userData) {
        this.addUserToCollection(userData);
      }
    } catch (error: any) {
      console.error('[UserStore] ❌ Failed to ensure current user exists:', error);
      this._error.set(error?.message || 'Failed to load current user');
    }
  }

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
   * Check if a user document exists in Firestore without creating it
   * Useful for registration flow to detect existing users
   */
  async checkUserExists(uid: string): Promise<any | null> {
    try {
      const userDoc = await this.userService.getDocByPath<any>(`users/${uid}`);
      return userDoc || null;
    } catch (error) {
      console.log(`[UserStore] User document not found for uid: ${uid.slice(0, 8)}`);
      return null;
    }
  }

  /**
   * Load existing user profile without creating new document
   * Used during onboarding to avoid premature document creation
   */
  private async loadUserProfile(uid: string): Promise<void> {
    if (this.loading()) {
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
        this.addUserToCollection(userData);
      } else {
        console.log(
          `📝 [UserStore] No existing user profile found - will be created after onboarding`
        );
        // Don't create document - let onboarding completion handle it
        // User not found - will be created later if needed
      }
    } catch (error: any) {
      console.error(`❌ [UserStore] Failed to load user profile:`, error);
      this._error.set(error?.message || 'Failed to load user profile');
      // User not found - skip setting
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
    const current = this.currentUser();
    const authUser = this.authStore.user();

    console.log('[UserStore] 🚀 updateProfile called with:', updates);
    console.log('[UserStore] 🔍 Current user before update:', {
      uid: current?.uid?.slice(0, 8),
      onboardingCompleted: current?.onboardingCompleted,
      displayName: current?.displayName,
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
      displayName: updatedUser.displayName,
    });
    this.updateUserInCollection(current.uid, updates);

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
      const finalUser = this.currentUser();
      console.log('[UserStore] 🔍 Final user state:', {
        uid: finalUser?.uid?.slice(0, 8),
        onboardingCompleted: finalUser?.onboardingCompleted,
        displayName: finalUser?.displayName,
      });

      // ✅ NEW: Trigger cache invalidation to ensure UI consistency
      console.log('[UserStore] 🔄 Triggering cache invalidation for user profile update');
      this.cacheCoherence.invalidate('users', 'profile-update');
    } catch (error: any) {
      // ❌ Rollback optimistic update
      console.log('[UserStore] ❌ Rolling back optimistic update due to error');
      // User will be updated in collection via updateProfile
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

      // Update local state - use setUser to handle both add/update cases
      this.setUser(userData);
      this._error.set(null);

      console.log('[UserStore] ✅ Complete user document created and local state updated');
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
    if (this.loading()) {
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

      this.addUserToCollection(userData);
      console.log(
        `✅ [UserStore] Firebase data loaded successfully: User profile cached for ${userData.displayName || userData.email || 'user'}`
      );
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
    const current = this.currentUser();
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
      totalPubCount: (current.verifiedPubCount || 0) + updatedManualPubs.length,
    });

    console.log('[UserStore] Added pub to visited list:', pubId);
  }

  /**
   * Remove a pub from user's visited list
   */
  async removeVisitedPub(pubId: string): Promise<void> {
    const current = this.currentUser();
    if (!current) {
      throw new Error('No user found');
    }

    const currentManualPubs = current.manuallyAddedPubIds || [];
    const updatedManualPubs = currentManualPubs.filter(id => id !== pubId);

    // Update both locally and in Firestore
    await this.updateProfile({
      manuallyAddedPubIds: updatedManualPubs,
      unverifiedPubCount: updatedManualPubs.length,
      totalPubCount: (current.verifiedPubCount || 0) + updatedManualPubs.length,
    });

    console.log('[UserStore] Removed pub from visited list:', pubId);
  }

  /**
   * Check if user has marked a pub as visited
   */
  hasVisitedPub(pubId: string): boolean {
    const user = this.currentUser();
    return user?.manuallyAddedPubIds?.includes(pubId) || false;
  }

  /**
   * Patch user data (immediate local update + Firestore persistence)
   * @param updates - Partial user data to merge with current user
   * @description CRITICAL for scoreboard accuracy. Used by other stores
   * to immediately update user stats (points, badges, check-ins).
   * Updates both local state AND persists to Firestore for leaderboard accuracy.
   * @example
   * // PointsStore awards points
   * userStore.patchUser({ totalPoints: newTotal });
   *
   * // pubsVisited count now computed by DataAggregatorService
   */
  async patchUser(updates: Partial<User>): Promise<void> {
    const current = this.currentUser();
    if (!current) {
      console.warn('[UserStore] ⚠️ Cannot patch user - no current user');
      return;
    }

    console.log('[UserStore] 🔧 Patching user with:', updates);

    // ✅ Immediate local update for responsive UI
    this.updateUserInCollection(current.uid, updates);

    // ✅ Persist to Firestore for leaderboard accuracy
    try {
      await this.userService.updateUser(current.uid, updates);
      console.log('[UserStore] ✅ User patch persisted to Firestore:', updates);

      // ✅ Trigger cache invalidation to ensure UI consistency
      this.cacheCoherence.invalidate('users', 'user-patch-update');
    } catch (error: any) {
      console.error('[UserStore] ❌ Failed to persist user patch to Firestore:', error);
      // Keep the local update - Cloud Functions might repair this later
    }
  }

  /**
   * Set user directly (used by other systems) - updates collection
   */
  setUser(user: User | null): void {
    console.log('[UserStore] 📝 Setting user:', user?.uid || 'null');
    if (user) {
      this.upsertUserInCollection(user);
    }
  }

  // ===================================
  // UTILITY METHODS
  // ===================================

  /**
   * Check user condition
   */
  has(predicate: (user: User) => boolean): boolean {
    const user = this.currentUser();
    return user ? predicate(user) : false;
  }

  /**
   * Get debug information
   */
  override getDebugInfo(): {
    name: string;
    itemCount: number;
    hasLoaded: boolean;
    loading: boolean;
    error: string | null;
    hasData: boolean;
    isEmpty: boolean;
    userId: string | null;
    sampleData: User[];
  } {
    return {
      name: this.constructor.name,
      itemCount: this.itemCount(),
      hasLoaded: !this.loading() && this.hasData(),
      loading: this.loading(),
      error: this.error(),
      hasData: this.hasData(),
      isEmpty: this.isEmpty(),
      userId: this.userId(),
      sampleData: this.data().slice(0, 3),
    };
  }

  /**
   * Clear error state
   */
  override clearError(): void {
    this._error.set(null);
  }

  override reset(): void {
    // Reset collection data when needed
    this._data.set([]);
    this._loading.set(false);
    this._error.set(null);
  }

  // ===================================
  // BaseStore Required Methods
  // ===================================

  /**
   * Fetch users data (required by BaseStore abstract method)
   */
  protected async fetchData(): Promise<User[]> {
    console.log('[UserStore] 📡 Fetching all users from Firestore...');
    const users = await this.userService.getAllUsers();

    // Debug logging for isAdmin field tracking
    console.log(
      '[UserStore] 🔍 Fetched users with isAdmin field processing:',
      users.map(u => ({
        uid: u.uid.slice(0, 8),
        displayName: u.displayName,
        email: u.email,
        isAdmin: u.isAdmin,
        hasIsAdminField: 'isAdmin' in u,
      }))
    );

    return users;
  }

  /**
   * Load all users for collection (required by BaseStore)
   */
  async loadData(): Promise<void> {
    console.log('[UserStore] 📡 Loading all users collection...');
    this._loading.set(true);
    this._error.set(null);

    try {
      const users = await this.fetchData();
      console.log(`[UserStore] ✅ Loaded ${users.length} users`);
      this._data.set(users);
    } catch (error: any) {
      console.error('[UserStore] ❌ Failed to load users collection:', error);
      this._error.set(error?.message || 'Failed to load users');
      throw error;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Refresh all users collection
   */
  async refresh(): Promise<void> {
    console.log('[UserStore] 🔄 Refreshing users collection...');
    await this.loadData();
  }

  // ===================================
  // Collection Management Methods (moved from UserService)
  // ===================================

  /**
   * Add a user to the collection (for immediate reactivity)
   */
  addUserToCollection(user: User): void {
    this._data.update(users => {
      const exists = users.some(u => u.uid === user.uid);
      if (!exists) {
        console.log(`[UserStore] Adding user ${user.uid} to collection`);
        return [...users, user];
      }
      return users;
    });
  }

  /**
   * Update a user in the collection
   */
  updateUserInCollection(uid: string, updates: Partial<User>): void {
    this._data.update(users =>
      users.map(user => (user.uid === uid ? { ...user, ...updates } : user))
    );
    console.log(`[UserStore] Updated user ${uid} in collection`);
  }

  /**
   * Upsert user in collection (add if doesn't exist, update if exists)
   */
  upsertUserInCollection(user: User): void {
    this._data.update(users => {
      const existingIndex = users.findIndex(u => u.uid === user.uid);
      if (existingIndex >= 0) {
        // Update existing user
        console.log(`[UserStore] Updating existing user ${user.uid} in collection`);
        const updated = [...users];
        updated[existingIndex] = user;
        return updated;
      } else {
        // Add new user
        console.log(`[UserStore] Adding new user ${user.uid} to collection`);
        return [...users, user];
      }
    });
  }
}
