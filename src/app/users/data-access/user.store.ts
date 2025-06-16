// src/app/users/data-access/user.store.ts
import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from '../../auth/data-access/auth.store';
import { UserService } from './user.service';
import type { User, UserBadgeSummary, UserLandlordSummary } from '../utils/user.model';

@Injectable({ providedIn: 'root' })
export class UserStore {
  private readonly _service = inject(UserService);
  private readonly authStore = inject(AuthStore);

  // ===================================
  // STATE
  // ===================================

  private readonly _user = signal<User | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private lastLoadedUserId: string | null = null;

  // ===================================
  // READONLY SIGNALS
  // ===================================

  readonly user = this._user.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // ✅ ADD THIS: Missing isLoaded computed signal
  readonly isLoaded = computed(() => !!this._user());


  // ===================================
  // COMPUTED PROPERTIES (User Profile)
  // ===================================

  readonly hasUser = computed(() => !!this.user());
  readonly hasLandlordPubs = computed(() =>
    (this.user()?.landlordCount || 0) > 0
  );

  // ✅ Badge summaries (read from user document for performance)
  readonly badgeCount = computed(() => this.user()?.badgeCount || 0);
  readonly badgeIds = computed(() => this.user()?.badgeIds || []);
  readonly hasBadges = computed(() => this.badgeCount() > 0);

  // ✅ Landlord summaries (read from user document for performance)
  readonly landlordCount = computed(() => this.user()?.landlordCount || 0);
  readonly landlordPubIds = computed(() => this.user()?.landlordPubIds || []);

  // ===================================
  // INITIALIZATION
  // ===================================

  constructor() {
    // Auto-load user when auth changes
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
      const userData = await this.loadUserData(userId);
      this._user.set(userData);
      console.log('[UserStore] ✅ User loaded successfully');
    } catch (error: any) {
      this._error.set(error.message || 'Failed to load user');
      console.error('[UserStore] loadUser error:', error);
    } finally {
      this._loading.set(false);
    }
  }

  private async loadUserData(userId: string): Promise<User> {
    const userData = await firstValueFrom(this._service.getUser(userId));

    if (!userData) {
      throw new Error('User not found');
    }

    // ✅ Build user object with defaults for new fields
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

      // ✅ Badge summaries (with defaults for existing users)
      badgeCount: userData.badgeCount || 0,
      badgeIds: userData.badgeIds || [],

      // ✅ Landlord summaries (with defaults for existing users)
      landlordCount: userData.landlordCount || 0,
      landlordPubIds: userData.landlordPubIds || [],
    };

    return user;
  }

  // ===================================
  // USER UPDATES
  // ===================================

  setUser(user: User | null): void {
    this._user.set(user);
  }

  patchUser(updates: Partial<User>): void {
    const current = this._user();
    if (!current) return;
    this._user.set({ ...current, ...updates });
  }

  // ✅ Badge summary updates (called by BadgeStore)
  updateBadgeSummary(summary: UserBadgeSummary): void {
    this.patchUser(summary);
    console.log('[UserStore] ✅ Badge summary updated:', summary);
  }

  // ✅ Landlord summary updates (called by LandlordStore)
  updateLandlordSummary(summary: UserLandlordSummary): void {
    this.patchUser(summary);
    console.log('[UserStore] ✅ Landlord summary updated:', summary);
  }

  // ===================================
  // QUICK QUERY METHODS (Using summaries)
  // ===================================

  hasBadge(badgeId: string): boolean {
    return this.badgeIds().includes(badgeId);
  }

  isLandlordOf(pubId: string): boolean {
    return this.landlordPubIds().includes(pubId);
  }

  // ===================================
  // AUTH SYNC
  // ===================================

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

  // ===================================
  // UTILITY
  // ===================================

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

  getDebugInfo() {
    const user = this._user();
    return {
      hasUser: !!user,
      userId: user?.uid,
      displayName: user?.displayName,
      badgeCount: this.badgeCount(),
      hasBadges: this.hasBadges(),
      landlordCount: this.landlordCount(),
      isLoading: this._loading(),
      hasError: !!this._error(),
      lastLoadedUserId: this.lastLoadedUserId,
    };
  }
}
