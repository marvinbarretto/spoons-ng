// src/app/users/data-access/user.store.ts
import { Injectable, signal, computed } from '@angular/core';
import { User } from '../utils/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserStore {
  private readonly _user = signal<User | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  // Clean signal names
  readonly user = this._user.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly isLoaded = computed(() => !!this.user());
  readonly hasLandlordPubs = computed(() =>
    (this.user()?.landlordOf?.length || 0) > 0
  );

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
