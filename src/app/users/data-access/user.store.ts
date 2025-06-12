// src/app/users/data-access/user.store.ts
import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { User } from '../utils/user.model';
import { AuthStore } from '../../auth/data-access/auth.store';
import { UserService } from './user.service';
import { Badge, EarnedBadge } from '../../badges/utils/badge.model';
import { BadgeService } from '../../badges/data-access/badge.service';
import { generateAnonymousName } from '../../shared/utils/anonymous-names';
import { firstValueFrom } from 'rxjs';
import { CheckinStore } from '../../check-in/data-access/check-in.store';





@Injectable({
  providedIn: 'root'
})
export class UserStore {
  private readonly authStore = inject(AuthStore);
  private readonly userService = inject(UserService);
  private readonly badgeService = inject(BadgeService);
  private lastLoadedUserId: string | null = null;

  // ✅ Single user signals
  private readonly _user = signal<User | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  // ✅ Public readonly signals
  readonly user = this._user.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // ✅ Computed signals for general user data
  readonly isLoaded = computed(() => !!this.user());
  readonly hasLandlordPubs = computed(() =>
    (this.user()?.landlordOf?.length || 0) > 0
  );

  // ✅ Badge-specific computed signals (using EarnedBadge type)
  readonly userBadges = computed(() => this.user()?.badges || []);

  readonly recentBadges = computed(() =>
    this.userBadges()
      .sort((a, b) => b.awardedAt - a.awardedAt) // ✅ Using number timestamp
      .slice(0, 5)
  );

  readonly badgeCount = computed(() => this.userBadges().length);
  readonly hasBadges = computed(() => this.badgeCount() > 0);

  // ✅ Badge utility methods using correct types
  hasBadge(badgeId: string): boolean {
    return this.userBadges().some(badge => badge.badgeId === badgeId);
  }

  getBadgeById(badgeId: string): EarnedBadge | undefined {
    return this.userBadges().find(badge => badge.badgeId === badgeId);
  }

  // ✅ Constructor remains the same
  constructor() {
    effect(() => {
      const user = this.authStore.user();
      if (!user) {
        this.reset();
        this.lastLoadedUserId = null;
        return;
      }

      if (user.uid === this.lastLoadedUserId) {
        return;
      }

      this.lastLoadedUserId = user.uid;
      this.loadUser(user.uid);
    });
  }

  // ✅ Add badge using correct EarnedBadge type
  addBadge(badge: EarnedBadge): void {
    const currentUser = this._user();
    if (!currentUser) return;

    // ✅ Check for duplicates before adding
    if (this.hasBadge(badge.badgeId)) {
      console.warn('[UserStore] Attempted to add duplicate badge:', badge.badgeId);
      return;
    }

    const updatedBadges = [...currentUser.badges, badge];
    this.patchUser({ badges: updatedBadges });
    console.log('[UserStore] ✅ Badge added to user:', badge.badgeId);
  }

  // ✅ Remove badge helper (for revocation)
  removeBadge(earnedBadgeId: string): void {
    const currentUser = this._user();
    if (!currentUser) return;

    const updatedBadges = currentUser.badges.filter(badge => badge.id !== earnedBadgeId);
    this.patchUser({ badges: updatedBadges });
    console.log('[UserStore] ✅ Badge removed from user:', earnedBadgeId);
  }

  // ✅ Award badge helper (creates EarnedBadge) - LOCAL ONLY
  // Note: This should typically be called by BadgeStore after API success
  awardBadgeLocally(badgeId: string, metadata?: Record<string, any>): EarnedBadge | null {
    const currentUser = this._user();
    if (!currentUser) return null;

    // Check if already has this badge
    if (this.hasBadge(badgeId)) {
      console.log('[UserStore] User already has badge:', badgeId);
      return null;
    }

    const earnedBadge: EarnedBadge = {
      id: crypto.randomUUID(),
      userId: currentUser.uid,
      badgeId,
      awardedAt: Date.now(), // ✅ Using number timestamp
      metadata,
    };

    this.addBadge(earnedBadge);
    return earnedBadge;
  }

  // ✅ DEPRECATED: Use BadgeStore.awardBadge() instead
  // This method is kept for backward compatibility but should not be used directly
  awardBadge(badgeId: string, metadata?: Record<string, any>): void {
    console.warn('[UserStore] awardBadge() is deprecated. Use BadgeStore.awardBadge() instead.');
    this.awardBadgeLocally(badgeId, metadata);
  }

  // ✅ Existing methods remain the same
  setUser(user: User | null): void {
    this._user.set(user);
  }

  patchUser(updates: Partial<User>): void {
    const current = this._user();
    if (!current) return;
    this._user.set({ ...current, ...updates });
  }

  async loadUser(userId: string): Promise<void> {
    if (this._loading()) {
      console.log('[UserStore] Load already in progress, skipping');
      return;
    }

    this._loading.set(true);
    this._error.set(null);

    try {
      // ✅ Load user data and badges in parallel
      const [userData, userBadges] = await Promise.all([
        this.loadUserData(userId),
        this.badgeService.getUserBadges(userId).catch(err => {
          console.warn('[UserStore] Failed to load badges, continuing with empty array:', err);
          return []; // ✅ Graceful degradation if badges fail
        })
      ]);

      // Combine user data with badges
      const user: User = {
        ...userData,
        badges: userBadges,
      };

      this._user.set(user);
      console.log(`[UserStore] ✅ Loaded user with ${userBadges.length} badges`);
    } catch (error: any) {
      this._error.set(error.message || 'Failed to load user');
      console.error('[UserStore] loadUser error:', error);
    } finally {
      this._loading.set(false);
    }
  }

  private async loadUserData(userId: string): Promise<Omit<User, 'badges'>> {
    try {
      // ✅ Modern RxJS pattern - use firstValueFrom instead of toPromise()
      const userData = await firstValueFrom(this.userService.getUser(userId));

      // ✅ Early return pattern with proper type checking
      if (!userData) {
        throw new Error('No user data returned from service');
      }

      // ✅ Convert User to Omit<User, 'badges'> explicitly
      const userWithoutBadges: Omit<User, 'badges'> = {
        uid: userData.uid,
        email: userData.email,
        displayName: userData.displayName,
        landlordOf: userData.landlordOf || [],
        claimedPubIds: userData.claimedPubIds || [],
        checkedInPubIds: userData.checkedInPubIds || [],
        streaks: userData.streaks || {},
        joinedMissionIds: userData.joinedMissionIds || [],
        emailVerified: userData.emailVerified,
        isAnonymous: userData.isAnonymous,
        photoURL: userData.photoURL,
        joinedAt: userData.joinedAt,
      };

      return userWithoutBadges;

    } catch (error) {
      console.warn('[UserStore] UserService failed, using AuthStore data:', error);
    }

    // ✅ Fallback to AuthStore data if service fails
    const authUser = this.authStore.user();

    // ✅ Early return pattern for safety
    if (!authUser || authUser.uid !== userId) {
      throw new Error(`Unable to load user data for ${userId}`);
    }

    const userWithoutBadges: Omit<User, 'badges'> = {
      uid: authUser.uid,
      email: authUser.email,
      displayName: authUser.displayName || generateAnonymousName(authUser.uid),
      landlordOf: authUser.landlordOf || [],
      claimedPubIds: authUser.claimedPubIds || [],
      checkedInPubIds: authUser.checkedInPubIds || [],
      streaks: authUser.streaks || {},
      joinedMissionIds: authUser.joinedMissionIds || [],
      emailVerified: authUser.emailVerified,
      isAnonymous: authUser.isAnonymous,
      photoURL: authUser.photoURL,
      joinedAt: authUser.joinedAt || new Date().toISOString(),
    };

    return userWithoutBadges;
  }

  // ✅ Sync user data from AuthStore to UserStore
  syncFromAuthStore(): void {
    const authUser = this.authStore.user();
    const currentUser = this._user();

    if (!authUser || !currentUser) return;

    // Only sync basic fields that can change in AuthStore
    const updates: Partial<User> = {};
    let hasUpdates = false;

    if (authUser.displayName !== currentUser.displayName) {
      updates.displayName = authUser.displayName;
      hasUpdates = true;
    }

    if (authUser.photoURL !== currentUser.photoURL) {
      updates.photoURL = authUser.photoURL;
      hasUpdates = true;
    }

    if (authUser.email !== currentUser.email) {
      updates.email = authUser.email;
      hasUpdates = true;
    }

    if (hasUpdates) {
      this.patchUser(updates);
      console.log('[UserStore] ✅ Synced updates from AuthStore:', updates);
    }
  }

  // ✅ Clear error state
  clearError(): void {
    this._error.set(null);
  }

  reset(): void {
    this._user.set(null);
    this._loading.set(false);
    this._error.set(null);
    this.lastLoadedUserId = null;
    console.log('[UserStore] 🔄 Reset complete');
  }

  // ✅ Debug helper
  getDebugInfo() {
    const user = this._user();
    return {
      hasUser: !!user,
      userId: user?.uid,
      displayName: user?.displayName,
      badgeCount: this.badgeCount(),
      isLoading: this._loading(),
      hasError: !!this._error(),
      lastLoadedUserId: this.lastLoadedUserId,
    };
  }
}
