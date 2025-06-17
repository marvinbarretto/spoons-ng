// src/app/users/data-access/user.store.ts
import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { UserService } from './user.service';
import { AuthStore } from '../../auth/data-access/auth.store';
import type { User, UserBadgeSummary, UserLandlordSummary } from '../utils/user.model';

@Injectable({ providedIn: 'root' })
export class UserStore {
  // 🔧 Dependencies
  private readonly _service = inject(UserService);
  private readonly authStore = inject(AuthStore);

  // 🔒 Internal state
  private readonly _user = signal<User | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  // 📡 Readonly signals
  readonly user = this._user.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly isLoaded = computed(() => !this._loading() && !!this._user());

  // 🔄 Track auth user ID changes separately from user data changes
  private lastLoadedUserId: string | null = null;

  // ===================================
  // COMPUTED PROPERTIES (User Profile)
  // ===================================

  readonly hasUser = computed(() => !!this.user());
  readonly hasLandlordPubs = computed(() =>
    (this.user()?.landlordCount || 0) > 0
  );

  // Badge summaries
  readonly badgeCount = computed(() => this.user()?.badgeCount || 0);
  readonly badgeIds = computed(() => this.user()?.badgeIds || []);
  readonly hasBadges = computed(() => this.badgeCount() > 0);

  // Landlord summaries
  readonly landlordCount = computed(() => this.user()?.landlordCount || 0);
  readonly landlordPubIds = computed(() => this.user()?.landlordPubIds || []);

  // ===================================
  // INITIALIZATION
  // ===================================

  constructor() {
    // ✅ FIXED: Only track auth user ID changes, not local user data changes
    effect(() => {
      const authUser = this.authStore.user();

      if (!authUser) {
        console.log('[UserStore] 🚪 User logged out, resetting');
        this.reset();
        this.lastLoadedUserId = null;
        return;
      }

      // ✅ KEY FIX: Only reload if the AUTH USER ID changed
      // Don't reload if just the user data was updated locally
      if (authUser.uid === this.lastLoadedUserId) {
        console.log('[UserStore] ⏭ Auth user unchanged, skipping reload');
        return;
      }

      console.log('[UserStore] 👤 New auth user detected:', authUser.uid);
      this.lastLoadedUserId = authUser.uid;
      this.loadUser(authUser.uid);
    });
  }

  // ===================================
  // USER LOADING
  // ===================================

  async loadUser(userId: string): Promise<void> {
    if (this._loading()) {
      console.log('[UserStore] Load already in progress, skipping');
      return;
    }

    this._loading.set(true);
    this._error.set(null);

    try {
      console.log('[UserStore] Loading user data for:', userId);

      // ✅ Simple load - document should exist thanks to AuthService coordination
      const userData = await firstValueFrom(this._service.getUser(userId));

      if (!userData) {
        throw new Error('User document not found - this should not happen with fixed AuthService');
      }

      // Build user object with defaults for any missing fields
      const user: User = {
        uid: userData.uid,
        email: userData.email || null,
        displayName: userData.displayName,
        emailVerified: userData.emailVerified,
        isAnonymous: userData.isAnonymous,
        photoURL: userData.photoURL,
        joinedAt: userData.joinedAt || new Date().toISOString(),

        // Pub-related data
        checkedInPubIds: userData.checkedInPubIds || [],
        streaks: userData.streaks || {},
        joinedMissionIds: userData.joinedMissionIds || [],

        // Badge summaries (with defaults for existing users)
        badgeCount: userData.badgeCount || 0,
        badgeIds: userData.badgeIds || [],

        // Landlord summaries (with defaults for existing users)
        landlordCount: userData.landlordCount || 0,
        landlordPubIds: userData.landlordPubIds || [],
      };

      this._user.set(user);
      console.log('[UserStore] ✅ User loaded successfully');

    } catch (error: any) {
      this._error.set(error.message || 'Failed to load user');
      console.error('[UserStore] loadUser error:', error);
    } finally {
      this._loading.set(false);
    }
  }

  // ===================================
  // USER UPDATES
  // ===================================

  setUser(user: User | null): void {
    console.log('[UserStore] 📝 Setting user:', user?.uid || 'null');
    this._user.set(user);
  }

  patchUser(updates: Partial<User>): void {
    const current = this._user();
    if (!current) {
      console.warn('[UserStore] ⚠️ Cannot patch user - no current user');
      return;
    }

    console.log('[UserStore] 🔧 Patching user with:', updates);
    this._user.set({ ...current, ...updates });
  }

  // Badge summary updates (called by BadgeStore)
  updateBadgeSummary(summary: UserBadgeSummary): void {
    console.log('[UserStore] 🏅 Updating badge summary:', summary);
    this.patchUser(summary);
    console.log('[UserStore] ✅ Badge summary updated');
  }

  // Landlord summary updates (called by LandlordStore)
  updateLandlordSummary(summary: UserLandlordSummary): void {
    console.log('[UserStore] 👑 Updating landlord summary:', summary);
    this.patchUser(summary);
    console.log('[UserStore] ✅ Landlord summary updated');
  }

  // ===================================
  // STATE MANAGEMENT
  // ===================================

  reset(): void {
    console.log('[UserStore] 🔄 Resetting store');
    this._user.set(null);
    this._loading.set(false);
    this._error.set(null);
  }

  clearError(): void {
    this._error.set(null);
  }

  // ===================================
  // UTILITY METHODS
  // ===================================

  has(predicate: (user: User) => boolean): boolean {
    const user = this._user();
    return user ? predicate(user) : false;
  }

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
}
