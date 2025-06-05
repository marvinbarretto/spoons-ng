// auth/data-access/auth.store.ts
import { inject, Injectable, signal, computed, effect } from '@angular/core';
import { AuthService } from './auth.service';
import { SsrPlatformService } from '../../shared/utils/ssr/ssr-platform.service';
import { User } from '../../users/utils/user.model';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private authService = inject(AuthService);
  private platform = inject(SsrPlatformService);

  // ✅ Core auth state
  private readonly _user = signal<User | null>(null);
  private readonly _token = signal<string | null>(null);
  private readonly _ready = signal(false);

  // ✅ Public readonly signals
  readonly user = this._user.asReadonly();
  readonly token = this._token.asReadonly();
  readonly ready = this._ready.asReadonly();

  // ✅ Derived state
  readonly isAuthenticated = computed(() => !!this.token());
  readonly uid = computed(() => this.user()?.uid ?? null);

  // ✅ User change signal for other stores to listen to
  private readonly _userChangeCounter = signal(0);
  readonly userChangeSignal = this._userChangeCounter.asReadonly();

  constructor() {
    // ✅ Single source of truth: Firebase auth only
    this.platform.onlyOnBrowser(() => {
      console.log('[AuthStore] 🔁 Starting Firebase auth listener...');

      this.authService.onAuthChange(async (firebaseUser) => {
        if (firebaseUser) {
          await this.handleUserSignIn(firebaseUser);
        } else {
          this.handleUserSignOut();
        }

        this._ready.set(true);
      });
    });

    // ✅ Server-side: just mark as ready
    if (this.platform.isServer) {
      this._ready.set(true);
    }
  }

  /**
   * Handle user sign in - build app user and store state
   * @param firebaseUser - Firebase auth user
   */
  private async handleUserSignIn(firebaseUser: any): Promise<void> {
    try {
      console.log('[AuthStore] ✅ User signed in:', firebaseUser.uid, firebaseUser.isAnonymous ? '(anonymous)' : '(authenticated)');

      // Get Firebase ID token
      const token = await firebaseUser.getIdToken();

      // Build minimal app user
      const appUser: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email ?? undefined,
        displayName: firebaseUser.displayName ?? undefined,
        photoURL: firebaseUser.photoURL ?? undefined,
        emailVerified: firebaseUser.emailVerified,
        isAnonymous: firebaseUser.isAnonymous,

        // App-specific fields - empty for new user
        landlordOf: [],
        claimedPubIds: [],
        checkedInPubIds: [],
        badges: [],
        streaks: {},
        joinedMissionIds: [],
      };

      // ✅ Update state atomically
      this._token.set(token);
      this._user.set(appUser);

      // ✅ Persist to localStorage for fast PWA boot
      this.platform.onlyOnBrowser(() => {
        localStorage.setItem('user', JSON.stringify(appUser));
        localStorage.setItem('token', token);
      });

      // ✅ Trigger user change event for dependent stores
      this._userChangeCounter.update(c => c + 1);

      console.log('[AuthStore] ✅ User state updated:', appUser.uid);

    } catch (error) {
      console.error('[AuthStore] ❌ Error handling user sign in:', error);
      this.handleUserSignOut(); // Fallback to signed out state
    }
  }

  /**
   * Handle user sign out - clean up all state
   */
  private handleUserSignOut(): void {
    console.log('[AuthStore] 👋 User signed out - cleaning up state');

    // ✅ Clear auth state
    this._user.set(null);
    this._token.set(null);

    // ✅ Clear localStorage
    this.platform.onlyOnBrowser(() => {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    });

    // ✅ Trigger user change event - this is KEY for cleanup
    this._userChangeCounter.update(c => c + 1);

    console.log('[AuthStore] ✅ Cleanup complete');
  }

  /**
   * Initiate logout
   */
  logout(): void {
    console.log('[AuthStore] 🚪 Logout initiated');
    this.authService.logout();
    // handleUserSignOut() will be called by the auth listener
  }

  /**
   * Initiate Google login
   */
  loginWithGoogle(): void {
    console.log('[AuthStore] 🔐 Google login initiated');
    this.authService.loginWithGoogle();
    // handleUserSignIn() will be called by the auth listener
  }

  /**
   * Initiate email login
   */
  loginWithEmail(email: string, password: string): void {
    console.log('[AuthStore] 📧 Email login initiated');
    this.authService.loginWithEmail(email, password);
    // handleUserSignIn() will be called by the auth listener
  }
}
