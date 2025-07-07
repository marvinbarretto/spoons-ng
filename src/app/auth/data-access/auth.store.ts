// src/app/auth/data-access/auth.store.ts
/**
 * AuthStore - Authentication State Management
 *
 * SINGLE RESPONSIBILITY: Manages authentication state ONLY
 * - Login/logout operations
 * - Auth tokens and session state
 * - Basic user identity from Firebase Auth
 *
 * DOES NOT:
 * - Save to Firestore (UserStore handles that)
 * - Manage user profile data (displayName, avatar, etc.)
 * - Update user documents in Firestore
 * - Handle user preferences or settings
 *
 * LINKS TO:
 * - UserStore listens to AuthStore.user() changes
 * - When user logs in/out, UserStore loads/clears profile data
 * - AuthStore provides uid → UserStore loads user/{uid} document
 */
import { signal, computed, inject, Injectable } from '@angular/core';
import { getAuth, updateProfile, User as FirebaseUser } from 'firebase/auth';
import { AuthService } from './auth.service';
import { SsrPlatformService } from '../../shared/utils/ssr/ssr-platform.service';
import { OverlayService } from '../../shared/data-access/overlay.service';
import { generateRandomName } from '../../shared/utils/anonymous-names';
import type { User } from '@users/utils/user.model';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly authService = inject(AuthService);
  private readonly overlayService = inject(OverlayService);
  private readonly platform = inject(SsrPlatformService);

  // ✅ ONLY authentication state
  private readonly _user = signal<User | null>(null);
  private readonly _token = signal<string | null>(null);
  private readonly _ready = signal(false);
  private readonly _userChangeCounter = signal(0);

  // ✅ Public auth signals
  readonly user = this._user.asReadonly();
  readonly token = this._token.asReadonly();
  readonly ready = this._ready.asReadonly();
  readonly userChangeSignal = this._userChangeCounter.asReadonly();

  // ✅ ONLY auth-derived computeds
  readonly isAuthenticated = computed(() => !!this.token());
  readonly isAnonymous = computed(() => this.user()?.isAnonymous ?? true);
  readonly uid = computed(() => this.user()?.uid ?? null);
  
  // ✅ Fresh display name from Firebase Auth (no stale cache)
  readonly freshDisplayName = computed(() => {
    const user = this.user();
    if (!user) return null;
    
    // Always read fresh from Firebase Auth since UserStore keeps it in sync
    const firebaseUser = this.platform.isBrowser ? getAuth().currentUser : null;
    return firebaseUser?.displayName || user.displayName || 'User';
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

      // ✅ Only update Firebase Auth profile for anonymous users WITHOUT custom names
      if (firebaseUser.isAnonymous && !displayName) {
        displayName = generateRandomName(firebaseUser.uid);
        try {
          await updateProfile(firebaseUser, { displayName });
        } catch (error) {
          console.warn('[AuthStore] ⚠️ Failed to save anonymous display name:', error);
        }
      }

      // ✅ Create basic user object with Firebase Auth data only
      const appUser: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email ?? null,
        photoURL: firebaseUser.photoURL ?? null,
        displayName: displayName || 'User', // ✅ Anonymous users keep their chosen names
        isAnonymous: firebaseUser.isAnonymous,
        emailVerified: firebaseUser.emailVerified,
        streaks: {},
        joinedAt: new Date().toISOString(),
        badgeCount: 0,
        badgeIds: [],
        landlordCount: 0,
        landlordPubIds: [],
        joinedMissionIds: [],
      };

      // ✅ Update auth state only
      this._user.set(appUser);
      this._token.set(token);
      this._userChangeCounter.update(c => c + 1);

      // ✅ Save to localStorage only
      this.platform.onlyOnBrowser(() => {
        localStorage.setItem('user', JSON.stringify(appUser));
        localStorage.setItem('token', token);
      });

      // ✅ REMOVED: No Firestore operations here
      // UserStore will handle loading/creating user documents

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


  // ✅ ONLY auth operations
  logout(): void {
    this.authService.logout();
  }

  loginWithGoogle(): void {
    this.authService.loginWithGoogle();
  }

  loginWithEmail(email: string, password: string): void {
    this.authService.loginWithEmail(email, password);
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
}
