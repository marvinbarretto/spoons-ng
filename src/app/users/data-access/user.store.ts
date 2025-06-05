// src/app/users/data-access/user.store.ts
import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { User } from '../utils/user.model';
import { AuthStore } from '../../auth/data-access/auth.store';
import { UserService } from './user.service';


@Injectable({
  providedIn: 'root'
})
export class UserStore {
  // Since UserStore manages a single user entity (not a collection), don't extend BaseStore

  private readonly authStore = inject(AuthStore);
  private lastLoadedUserId: string | null = null;

  // ✅ Single user signals
  private readonly _user = signal<User | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  // ✅ Clean public interface
  readonly user = this._user.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // ✅ Computed signals
  readonly isLoaded = computed(() => !!this.user());
  readonly hasLandlordPubs = computed(() =>
    (this.user()?.landlordOf?.length || 0) > 0
  );

    constructor() {
      // 🎬 This effect runs EVERY TIME authStore.user() changes
      effect(() => {
        const user = this.authStore.user();
        // whenever authStore.user() changes, this effect runs

        // 🛡️ GUARD: Handle logout
        if (!user) {
          this.reset();                    // Clear all user data
          this.lastLoadedUserId = null;    // Reset tracking
          return;                          // Exit early
        }

        // 🔄 DEDUPLICATION: Don't reload same user
        if (user.uid === this.lastLoadedUserId) {
          return; // Same user, don't reload
        }

        // 🚀 LOAD: New user detected
        this.lastLoadedUserId = user.uid;  // Track this user
        this.loadUser(user.uid);           // Load their data
      });
    }

  setUser(user: User | null): void {
    this._user.set(user);
  }

  async loadUser(userId: string): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      // Mock implementation - replace with actual service call
      const mockUser: User = {
        uid: userId,
        email: `user${userId}@example.com`,
        displayName: `User ${userId}`,
        landlordOf: [],
        claimedPubIds: [],
        checkedInPubIds: [],
        badges: [],
        streaks: {},
        joinedMissionIds: [],
        emailVerified: true,
        isAnonymous: false,
        photoURL: '',
        joinedAt: new Date().toISOString(),
      };

      this._user.set(mockUser);
    } catch (error: any) {
      this._error.set(error.message || 'Failed to load user');
    } finally {
      this._loading.set(false);
    }
  }

  reset(): void {
    this._user.set(null);
    this._loading.set(false);
    this._error.set(null);
  }
}
