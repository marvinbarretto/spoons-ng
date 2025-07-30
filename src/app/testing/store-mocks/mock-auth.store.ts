import { computed, signal } from '@angular/core';
import type { User } from '../../users/utils/user.model';

export class MockAuthStore {
  private _user = signal<User | null>(null);
  private _token = signal<string | null>(null);
  private _ready = signal(true);

  // Expose as readonly to match real AuthStore
  readonly user = this._user.asReadonly();
  readonly token = this._token.asReadonly();
  readonly ready = this._ready.asReadonly();

  readonly isAuthenticated = computed(() => !!this._user());
  readonly isAnonymous = computed(() => this._user()?.isAnonymous ?? false);
  readonly uid = computed(() => this._user()?.uid ?? null);

  // Test helper methods
  setUser(user: User | null): void {
    this._user.set(user);
  }

  setToken(token: string | null): void {
    this._token.set(token);
  }

  setReady(ready: boolean): void {
    this._ready.set(ready);
  }

  // Mock implementations of methods
  async signOut(): Promise<void> {
    this._user.set(null);
    this._token.set(null);
  }

  async deleteAccount(): Promise<void> {
    this._user.set(null);
    this._token.set(null);
  }

  openAvatarSelector(): void {
    // Mock implementation
  }
}
