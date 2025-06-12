import { signal, computed, inject, Injectable } from '@angular/core';
import { getAuth, updateProfile, User as FirebaseUser } from 'firebase/auth';
import { AuthService } from './auth.service';
import { SsrPlatformService } from '../../shared/utils/ssr/ssr-platform.service';
import { OverlayService } from '../../shared/data-access/overlay.service';
import { generateAnonymousName } from '../../shared/utils/anonymous-names';
import type { User } from '@users/utils/user.model';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly authService = inject(AuthService);
  private readonly overlayService = inject(OverlayService);
  private readonly platform = inject(SsrPlatformService);

  // 🔐 Internal state
  private readonly _user = signal<User | null>(null);
  private readonly _token = signal<string | null>(null);
  private readonly _ready = signal(false);
  private readonly _userChangeCounter = signal(0);

  // ✅ Public signals
  readonly user = this._user.asReadonly();
  readonly token = this._token.asReadonly();
  readonly ready = this._ready.asReadonly();
  readonly userChangeSignal = this._userChangeCounter.asReadonly();

  // ✅ Derived signals
  readonly isAuthenticated = computed(() => !!this.token());
  readonly isAnonymous = computed(() => this.user()?.isAnonymous ?? true);
  readonly uid = computed(() => this.user()?.uid ?? null);

  readonly displayName = computed(() => {
    const user = this.user();
    if (!user) return;
    if (user.isAnonymous) return user.displayName || generateAnonymousName(user.uid);
    return user.displayName || user.email?.split('@')[0] || 'User';
  });

  readonly avatarUrl = computed(() => {
    const user = this.user();
    if (!user) return null;
    return user.photoURL || null;
  });

  constructor() {
    this.platform.onlyOnBrowser(() => {
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

  private async handleUserSignIn(firebaseUser: FirebaseUser): Promise<void> {
    try {
      const token = await firebaseUser.getIdToken();
      let displayName = firebaseUser.displayName;

      if (firebaseUser.isAnonymous && !displayName) {
        displayName = generateAnonymousName(firebaseUser.uid);
        try {
          await updateProfile(firebaseUser, { displayName });
        } catch (error) {
          console.warn('[AuthStore] ⚠️ Failed to save anonymous display name:', error);
        }
      }

      const appUser: User = {
        uid: firebaseUser.uid,
        displayName: displayName ?? generateAnonymousName(firebaseUser.uid),
        isAnonymous: firebaseUser.isAnonymous,
        email: firebaseUser.email ?? undefined,
        emailVerified: firebaseUser.emailVerified,
        photoURL: firebaseUser.photoURL ?? undefined,
        landlordOf: [],
        claimedPubIds: [],
        checkedInPubIds: [],
        badges: [],
        streaks: {},
        joinedAt: new Date().toISOString(),
        userStage: 'guest',
      };

      this._user.set(appUser);
      this._token.set(token);
      this._userChangeCounter.update(c => c + 1);

      this.platform.onlyOnBrowser(() => {
        localStorage.setItem('user', JSON.stringify(appUser));
        localStorage.setItem('token', token);
      });

      await this.saveUserToFirestore(appUser);
    } catch (error) {
      console.error('[AuthStore] ❌ Sign-in failed:', error);
      this.handleUserSignOut();
    }
  }

  private handleUserSignOut(): void {
    this._user.set(null);
    this._token.set(null);
    this._userChangeCounter.update(c => c + 1);

    this.platform.onlyOnBrowser(() => {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    });
  }

  async updateDisplayName(newDisplayName: string): Promise<void> {
    const current = this._user();
    if (!current) return;

    const auth = getAuth();
    const fbUser = auth.currentUser;
    if (!fbUser) throw new Error('No Firebase user found');

    await updateProfile(fbUser, { displayName: newDisplayName });

    const updatedUser: User = { ...current, displayName: newDisplayName };
    this._user.set(updatedUser);

    this.platform.onlyOnBrowser(() => {
      localStorage.setItem('user', JSON.stringify(updatedUser));
    });

    await this.saveUserToFirestore(updatedUser);
  }

  async updateUserProfile(updates: Partial<User>): Promise<void> {
    const current = this._user();
    if (!current) return;

    const auth = getAuth();
    const fbUser = auth.currentUser;
    if (!fbUser) throw new Error('No Firebase user found');

    await updateProfile(fbUser, {
      displayName: updates.displayName,
      photoURL: updates.photoURL,
    });

    this._user.set({ ...current, ...updates });
  }

  private async saveUserToFirestore(user: User): Promise<void> {
    try {
      console.log('[AuthStore] Would save to Firestore:', {
        uid: user.uid,
        displayName: user.displayName,
        isAnonymous: user.isAnonymous,
        joinedAt: user.joinedAt,
      });
    } catch (error) {
      console.warn('[AuthStore] ⚠️ Firestore save failed:', error);
    }
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

  // ✅ Login/logout
  logout(): void {
    this.authService.logout();
  }

  loginWithGoogle(): void {
    this.authService.loginWithGoogle();
  }

  loginWithEmail(email: string, password: string): void {
    this.authService.loginWithEmail(email, password);
  }
}
