// src/app/auth/data-access/auth.store.ts
import { inject, Injectable, signal, computed, effect } from '@angular/core';
import { AuthService } from './auth.service';
import { OverlayService } from '../../shared/data-access/overlay.service';
import { SsrPlatformService } from '../../shared/utils/ssr/ssr-platform.service';
import { User } from '../../users/utils/user.model';
import { generateAnonymousName } from '../../shared/utils/anonymous-names';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly authService = inject(AuthService);
  private readonly overlayService = inject(OverlayService);
  private readonly platform = inject(SsrPlatformService);

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

  // ✅ User display helpers
  readonly userDisplayName = computed(() => {
    const user = this.user();
    if (!user) return 'Guest';

    if (user.isAnonymous) {
      return generateAnonymousName(user.uid);
    }

    return user.displayName || user.email || 'User';
  });

  readonly userShortName = computed(() => {
    const user = this.user();
    if (!user) return '';

    if (user.isAnonymous) {
      // Just the base name without number for compact displays
      const fullName = generateAnonymousName(user.uid);
      return fullName.split('-').slice(0, 2).join('-'); // "tipsy-landlord"
    }

    const displayName = user.displayName;
    if (displayName) {
      return displayName.split(' ')[0];
    }

    const email = user.email;
    if (email) {
      return email.split('@')[0];
    }

    return 'User';
  });

  readonly isAnonymous = computed(() => this.user()?.isAnonymous ?? true);

  // ✅ User change signal for other stores to listen to
  private readonly _userChangeCounter = signal(0);
  readonly userChangeSignal = this._userChangeCounter.asReadonly();

  constructor() {
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

    if (this.platform.isServer) {
      this._ready.set(true);
    }
  }

  // ✅ MODAL MANAGEMENT - Store handles overlay logic
  openUsernameModal(): void {
    this.platform.onlyOnBrowser(async () => {
      const { UsernameModalComponent } = await import('../../shared/ui/username-modal/username-modal.component');

      const { componentRef, close } = this.overlayService.open(
        UsernameModalComponent,
        {},
        { currentUser: this.user() }
      );

      componentRef.instance.closeModal = close;
    });
  }

  openAvatarSelector(): void {
    this.platform.onlyOnBrowser(async () => {
      const { AvatarSelectorComponent } = await import('../../shared/ui/avatar-selector/avatar-selector.component');

      const { componentRef, close } = this.overlayService.open(
        AvatarSelectorComponent,
        {},
        { currentUser: this.user() }
      );

      componentRef.instance.closeModal = close;
    });
  }

  /**
   * Handle user sign in - build app user and store state
   */
  private async handleUserSignIn(firebaseUser: any): Promise<void> {
    try {
      console.log('[AuthStore] ✅ User signed in:', firebaseUser.uid, firebaseUser.isAnonymous ? '(anonymous)' : '(authenticated)');

      const token = await firebaseUser.getIdToken();

      const appUser: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email ?? undefined,
        displayName: firebaseUser.displayName ?? undefined,
        photoURL: firebaseUser.photoURL ?? undefined,
        emailVerified: firebaseUser.emailVerified,
        isAnonymous: firebaseUser.isAnonymous,

        // App-specific fields
        landlordOf: [],
        claimedPubIds: [],
        checkedInPubIds: [],
        badges: [],
        streaks: {},
        joinedMissionIds: [],
      };

      this._token.set(token);
      this._user.set(appUser);

      this.platform.onlyOnBrowser(() => {
        localStorage.setItem('user', JSON.stringify(appUser));
        localStorage.setItem('token', token);
      });

      this._userChangeCounter.update(c => c + 1);

      console.log('[AuthStore] ✅ User state updated:', appUser.uid);

    } catch (error) {
      console.error('[AuthStore] ❌ Error handling user sign in:', error);
      this.handleUserSignOut();
    }
  }

  /**
   * Handle user sign out - clean up all state
   */
  private handleUserSignOut(): void {
    console.log('[AuthStore] 👋 User signed out - cleaning up state');

    this._user.set(null);
    this._token.set(null);

    this.platform.onlyOnBrowser(() => {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    });

    this._userChangeCounter.update(c => c + 1);
    console.log('[AuthStore] ✅ Cleanup complete');
  }

  /**
   * Initiate logout
   */
  logout(): void {
    console.log('[AuthStore] 🚪 Logout initiated');
    this.authService.logout();
  }

  /**
   * Initiate Google login
   */
  loginWithGoogle(): void {
    console.log('[AuthStore] 🔐 Google login initiated');
    this.authService.loginWithGoogle();
  }

  /**
   * Initiate email login
   */
  loginWithEmail(email: string, password: string): void {
    console.log('[AuthStore] 📧 Email login initiated');
    this.authService.loginWithEmail(email, password);
  }
}
