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
  private readonly _isExplicitGuest = signal(false);
  private readonly _hasSeenSplash = signal(false);

  // ✅ Public auth signals
  readonly user = this._user.asReadonly();
  readonly token = this._token.asReadonly();
  readonly ready = this._ready.asReadonly();
  readonly userChangeSignal = this._userChangeCounter.asReadonly();
  readonly isExplicitGuest = this._isExplicitGuest.asReadonly();
  readonly hasSeenSplash = this._hasSeenSplash.asReadonly();

  // ✅ ONLY auth-derived computeds
  readonly isAuthenticated = computed(() => !!this.token());
  readonly isAnonymous = computed(() => this.user()?.isAnonymous ?? true);
  readonly uid = computed(() => this.user()?.uid ?? null);

  constructor() {
    this.platform.onlyOnBrowser(() => {
      // Restore explicit guest state from localStorage
      const storedIsExplicitGuest = localStorage.getItem('isExplicitGuest') === 'true';
      this._isExplicitGuest.set(storedIsExplicitGuest);
      
      // Restore splash seen state from localStorage
      const storedHasSeenSplash = localStorage.getItem('hasSeenSplash') === 'true';
      this._hasSeenSplash.set(storedHasSeenSplash);

      this.authService.onAuthChange(async (firebaseUser) => {
        console.log('[AuthStore] Auth state change received:', {
          hasUser: !!firebaseUser,
          uid: firebaseUser?.uid?.slice(0, 8),
          isAnonymous: firebaseUser?.isAnonymous,
          isExplicitGuest: this._isExplicitGuest()
        });
        
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
      console.log('[AuthStore] handleUserSignIn called:', {
        uid: firebaseUser.uid.slice(0, 8),
        isAnonymous: firebaseUser.isAnonymous,
        hasDisplayName: !!firebaseUser.displayName
      });
      
      const token = await firebaseUser.getIdToken();
      console.log('[AuthStore] Got token:', !!token);
      
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
        manuallyAddedPubIds: [],
        verifiedPubCount: 0,
        unverifiedPubCount: 0,
        totalPubCount: 0,
        onboardingCompleted: false, // ✅ New users need onboarding
      };

      // ✅ Update auth state only
      this._user.set(appUser);
      this._token.set(token);
      this._userChangeCounter.update(c => c + 1);

      console.log('[AuthStore] User and token set:', {
        uid: appUser.uid.slice(0, 8),
        hasToken: !!token,
        isAuthenticated: !!token,
        displayName: appUser.displayName
      });

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
    this._isExplicitGuest.set(false);
    this._hasSeenSplash.set(false);

    this.platform.onlyOnBrowser(() => {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('isExplicitGuest');
      localStorage.removeItem('hasSeenSplash');
    });
  }


  // ✅ ONLY auth operations
  logout(): void {
    this.authService.logout();
  }

  // ✅ Refresh current user data from Firebase Auth (called when profile updates)
  refreshCurrentUser(): void {
    this.platform.onlyOnBrowser(() => {
      const firebaseUser = getAuth().currentUser;
      if (firebaseUser && this._user()) {
        // Update our user signal with fresh Firebase Auth data
        const currentUser = this._user()!;
        const updatedUser: User = {
          ...currentUser,
          displayName: firebaseUser.displayName || currentUser.displayName,
          photoURL: firebaseUser.photoURL || currentUser.photoURL,
        };

        this._user.set(updatedUser);
        this._userChangeCounter.update(c => c + 1);

        // Update localStorage
        localStorage.setItem('user', JSON.stringify(updatedUser));

        console.log('[AuthStore] ✅ Refreshed user from Firebase Auth:', {
          uid: updatedUser.uid.slice(0, 8),
          displayName: updatedUser.displayName
        });
      }
    });
  }

  async loginWithGoogle(): Promise<void> {
    await this.authService.loginWithGoogle();
    
    // Wait for auth state to be fully ready after Google login
    await this.waitForAuthReady();
  }

  loginWithEmail(email: string, password: string): void {
    this.authService.loginWithEmail(email, password);
  }

  async registerWithEmail(email: string, password: string, displayName?: string): Promise<void> {
    await this.authService.registerWithEmail(email, password, displayName);
  }

  async continueAsGuest(): Promise<void> {
    // Mark that this is an explicit guest choice
    this._isExplicitGuest.set(true);
    this.platform.onlyOnBrowser(() => {
      localStorage.setItem('isExplicitGuest', 'true');
    });
    
    // Mark splash as seen since user is taking action from splash
    this.markSplashAsSeen();
    
    // Now create the anonymous user
    await this.authService.continueAsGuest();
  }

  markSplashAsSeen(): void {
    this._hasSeenSplash.set(true);
    this.platform.onlyOnBrowser(() => {
      localStorage.setItem('hasSeenSplash', 'true');
    });
  }

  /**
   * Wait for auth state to be fully ready
   * This ensures user, token, and all auth state is properly populated
   */
  async waitForAuthReady(): Promise<void> {
    return new Promise((resolve) => {
      const maxAttempts = 30; // 3 seconds max
      let attempts = 0;
      
      const checkAuthState = () => {
        attempts++;
        const user = this.user();
        const token = this.token();
        const isReady = this.ready();
        
        console.log('[AuthStore] waitForAuthReady check:', {
          attempt: attempts,
          hasUser: !!user,
          hasToken: !!token,
          isReady,
          uid: user?.uid?.slice(0, 8)
        });
        
        // Auth is ready when we have a user, token, and ready flag is true
        if (user && token && isReady) {
          console.log('[AuthStore] ✅ Auth state fully ready');
          resolve();
          return;
        }
        
        // Timeout after max attempts
        if (attempts >= maxAttempts) {
          console.warn('[AuthStore] ⚠️ Auth state readiness timeout');
          resolve(); // Resolve anyway to prevent hanging
          return;
        }
        
        // Check again in 100ms
        setTimeout(checkAuthState, 100);
      };
      
      checkAuthState();
    });
  }

  /**
   * Wait for user authentication to complete
   * This ensures the user is authenticated and has a valid token
   */
  async waitForUserAuthenticated(): Promise<void> {
    return new Promise((resolve) => {
      const maxAttempts = 30; // 3 seconds max
      let attempts = 0;
      
      const checkAuth = () => {
        attempts++;
        const user = this.user();
        const isAuthenticated = this.isAuthenticated();
        
        console.log('[AuthStore] waitForUserAuthenticated check:', {
          attempt: attempts,
          hasUser: !!user,
          isAuthenticated,
          uid: user?.uid?.slice(0, 8)
        });
        
        if (user && isAuthenticated) {
          console.log('[AuthStore] ✅ User authenticated');
          resolve();
          return;
        }
        
        // Timeout after max attempts
        if (attempts >= maxAttempts) {
          console.warn('[AuthStore] ⚠️ User authentication timeout');
          resolve(); // Resolve anyway to prevent hanging
          return;
        }
        
        // Check again in 100ms
        setTimeout(checkAuth, 100);
      };
      
      checkAuth();
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
}
