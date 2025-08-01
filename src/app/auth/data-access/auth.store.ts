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
import { computed, inject, Injectable, signal } from '@angular/core';
import { OverlayService, SsrPlatformService } from '@fourfold/angular-foundation';
import type { User } from '@users/utils/user.model';
import { User as FirebaseUser, getAuth, updateProfile } from 'firebase/auth';
import { generateRandomName } from '../../shared/utils/anonymous-names';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  protected readonly authService = inject(AuthService);
  protected readonly overlayService = inject(OverlayService);
  protected readonly platform = inject(SsrPlatformService);

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

  constructor() {
    this.platform.onlyOnBrowser(() => {
      // Primary auth listener - Firebase onAuthStateChanged (works for web/Android)
      this.authService.onAuthChange(async firebaseUser => {
        const timestamp = new Date().toISOString();
        const currentState = {
          currentUser: !!this._user(),
          currentToken: !!this._token(),
          currentUid: this._user()?.uid?.slice(0, 8),
          isReady: this._ready(),
        };

        console.log('[AuthStore] 🔄 Firebase auth state change received at', timestamp, ':', {
          hasUser: !!firebaseUser,
          uid: firebaseUser?.uid?.slice(0, 8),
          isAnonymous: firebaseUser?.isAnonymous,
          previousState: currentState,
        });

        if (firebaseUser) {
          console.log('[AuthStore] 👤 Processing user sign-in via Firebase callback...');
          await this.handleUserSignIn(firebaseUser);
        } else {
          console.log('[AuthStore] 🚪 Processing user sign-out (no Firebase user)...');
          this.handleUserSignOut();
        }

        console.log('[AuthStore] 🏁 Setting auth ready to true');
        this._ready.set(true);
      });

      // Backup auth listener - AuthService user signal (iOS native fallback)
      // This catches cases where Firebase onAuthStateChanged doesn't fire (iOS native auth)
      let lastAuthServiceUser: any = null;
      const checkAuthServiceUser = () => {
        const currentAuthServiceUser = this.authService.user$$();
        const currentAuthStoreUser = this._user();
        
        // Only act if AuthService has a user but AuthStore doesn't, and it's different from last check
        if (currentAuthServiceUser && !currentAuthStoreUser && currentAuthServiceUser !== lastAuthServiceUser) {
          console.log('[AuthStore] 🍎 iOS backup: AuthService has user but AuthStore does not, syncing...', {
            authServiceUid: currentAuthServiceUser.uid?.slice(0, 8),
            authStoreUid: 'none'
          });
          
          // Handle iOS native auth sync directly (get real Firebase token)
          this.handleiOSNativeAuth(currentAuthServiceUser).then(() => {
            this._ready.set(true);
          }).catch(error => {
            console.error('[AuthStore] 🍎 iOS native auth sync failed:', error);
            this._ready.set(true);
          });
        }
        
        lastAuthServiceUser = currentAuthServiceUser;
      };
      
      // Check periodically for iOS native auth sync issues
      setInterval(checkAuthServiceUser, 1000); // Check every second
      
      // Also check immediately after a short delay
      setTimeout(checkAuthServiceUser, 500);
    });

    if (this.platform.isServer) {
      this._ready.set(true);
    }
  }

  /**
   * Handle iOS native authentication sync - get the REAL Firebase ID token
   */
  private async handleiOSNativeAuth(authServiceUser: any): Promise<void> {
    try {
      console.log('[AuthStore] 🍎 handleiOSNativeAuth called:', {
        uid: authServiceUser.uid?.slice(0, 8),
        email: authServiceUser.email,
        displayName: authServiceUser.displayName
      });

      // CRITICAL: Get the real Firebase ID token from the Capacitor plugin
      console.log('[AuthStore] 🍎 Getting real Firebase ID token from native plugin...');
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
      const idTokenResult = await FirebaseAuthentication.getIdToken();
      const realToken = idTokenResult.token;
      
      console.log('[AuthStore] 🍎 Got real Firebase ID token:', !!realToken);

      // Create basic user object from AuthService data
      const appUser: User = {
        uid: authServiceUser.uid,
        email: authServiceUser.email ?? null,
        photoURL: authServiceUser.photoURL ?? null,
        displayName: authServiceUser.displayName || 'User',
        isAnonymous: authServiceUser.isAnonymous || false,
        emailVerified: authServiceUser.emailVerified || true,
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
        onboardingCompleted: false,
      };

      // Update auth state with REAL token
      this._user.set(appUser);
      this._token.set(realToken);
      this._userChangeCounter.update(c => c + 1);

      console.log('[AuthStore] 🍎 iOS native auth sync successful:', {
        uid: appUser.uid.slice(0, 8),
        hasRealToken: !!realToken,
        isAuthenticated: true,
        displayName: appUser.displayName,
      });

      // Save to localStorage
      this.platform.onlyOnBrowser(() => {
        try {
          localStorage.setItem('user', JSON.stringify(appUser));
          localStorage.setItem('token', realToken);
          console.log('[AuthStore] 💾 Saved iOS native auth data with real token to localStorage');
        } catch (error) {
          console.warn('[AuthStore] ⚠️ Failed to save iOS native auth data to localStorage:', error);
        }
      });

    } catch (error) {
      console.error('[AuthStore] ❌ iOS native auth sync failed:', error);
      this.handleUserSignOut();
    }
  }

  private async handleUserSignIn(firebaseUser: FirebaseUser): Promise<void> {
    try {
      console.log('[AuthStore] handleUserSignIn called:', {
        uid: firebaseUser.uid.slice(0, 8),
        isAnonymous: firebaseUser.isAnonymous,
        hasDisplayName: !!firebaseUser.displayName,
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
        displayName: appUser.displayName,
      });

      // ✅ Save to localStorage only
      this.platform.onlyOnBrowser(() => {
        try {
          localStorage.setItem('user', JSON.stringify(appUser));
          localStorage.setItem('token', token);
          console.log('[AuthStore] 💾 Saved auth data to localStorage successfully');
        } catch (error) {
          console.error('[AuthStore] ❌ Failed to save auth data to localStorage:', error);
        }
      });

      // ✅ REMOVED: No Firestore operations here
      // UserStore will handle loading/creating user documents
    } catch (error) {
      console.error('[AuthStore] ❌ Sign-in failed:', error);
      this.handleUserSignOut();
    }
  }

  private handleUserSignOut(): void {
    const previousState = {
      hasUser: !!this._user(),
      hasToken: !!this._token(),
      uid: this._user()?.uid?.slice(0, 8),
    };

    console.log('[AuthStore] 🚪 handleUserSignOut - State before logout:', previousState);

    this._user.set(null);
    this._token.set(null);
    this._userChangeCounter.update(c => c + 1);

    this.platform.onlyOnBrowser(() => {
      console.log('[AuthStore] 🗑️ Clearing localStorage auth data');
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      console.log('[AuthStore] ✅ localStorage cleared');
    });

    console.log('[AuthStore] 🚪 handleUserSignOut completed - all auth state cleared');
  }

  // ✅ ONLY auth operations
  logout(): void {
    console.log('[AuthStore] 🚪 logout() called - delegating to AuthService');
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
          displayName: updatedUser.displayName,
        });
      }
    });
  }

  async loginWithGoogle(): Promise<void> {
    console.log('[AuthStore] 🚀 loginWithGoogle() STARTED');
    await this.authService.loginWithGoogle();
    console.log('[AuthStore] ✅ authService.loginWithGoogle() completed');

    // Wait for auth state to be fully ready after Google login
    console.log('[AuthStore] ⏳ Waiting for auth ready...');
    await this.waitForAuthReady();
    console.log('[AuthStore] ✅ Auth ready completed');
    console.log('[AuthStore] 🏁 loginWithGoogle() FINISHED');
  }

  async loginWithEmail(email: string, password: string, rememberMe = false): Promise<void> {
    await this.authService.loginWithEmail(email, password, rememberMe);
  }

  async registerWithEmail(email: string, password: string, displayName?: string): Promise<void> {
    await this.authService.registerWithEmail(email, password, displayName);
  }

  async continueAsGuest(): Promise<void> {
    await this.authService.continueAsGuest();
  }

  /**
   * Wait for auth state to be fully ready
   * This ensures user, token, and all auth state is properly populated
   */
  async waitForAuthReady(): Promise<void> {
    return new Promise(resolve => {
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
          uid: user?.uid?.slice(0, 8),
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
    return new Promise(resolve => {
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
          uid: user?.uid?.slice(0, 8),
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

  /**
   * Check if user previously selected "Remember me"
   */
  getRememberMePreference(): boolean {
    return this.authService.getRememberMePreference();
  }

  openAvatarSelector(): void {
    this.platform.onlyOnBrowser(async () => {
      const { AvatarSelectorComponent } = await import(
        '../../shared/ui/avatar-selector/avatar-selector.component'
      );
      const { componentRef, close } = this.overlayService.open(
        AvatarSelectorComponent,
        {},
        { currentUser: this.user() }
      );
      componentRef.instance.closeModal = close;
    });
  }
}
