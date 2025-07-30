import { computed, signal } from '@angular/core';
import type { User } from '../../users/utils/user.model';

export class MockUserStore {
  private _user = signal<User | null>(null);
  private _loading = signal(false);
  private _error = signal<string | null>(null);

  // Expose as readonly to match real UserStore
  readonly user = this._user.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly isLoaded = computed(() => !this._loading() && !!this._user());
  readonly hasUser = computed(() => !!this._user());
  readonly displayName = computed(() => this._user()?.displayName || 'Mock User');
  readonly avatarUrl = computed(() => this._user()?.photoURL || null);
  readonly totalPoints = computed(() => this._user()?.totalPoints || 0);
  readonly badgeCount = computed(() => this._user()?.badgeCount || 0);
  readonly landlordCount = computed(() => this._user()?.landlordCount || 0);

  // Test helper methods
  setUser(user: User | null): void {
    this._user.set(user);
  }

  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  setError(error: string | null): void {
    this._error.set(error);
  }

  // Mock implementations
  async load(): Promise<void> {
    // Mock implementation
  }

  async loadOnce(): Promise<void> {
    // Mock implementation
  }

  patchUser(updates: Partial<User>): void {
    const current = this._user();
    if (current) {
      this._user.set({ ...current, ...updates });
    }
  }

  reset(): void {
    this._user.set(null);
    this._loading.set(false);
    this._error.set(null);
  }
}
