// src/app/auth/data-access/auth.service.ts
import { Injectable, computed, inject, signal } from '@angular/core';
import {
  Auth,
  GoogleAuthProvider,
  Unsubscribe,
  User,
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInAnonymously,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from '@angular/fire/auth';
import { CapacitorPlatformService } from '@shared/data-access/capacitor-platform.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly capacitorPlatformService = inject(CapacitorPlatformService);

  private readonly userInternal = signal<User | null>(null);
  private readonly loading = signal<boolean>(true);

  // Track if we're in the middle of setting up a new anonymous user
  private settingUpAnonymousUser = false;

  readonly user$$ = computed(() => this.userInternal());
  readonly isAnon$$ = computed(() => !!this.userInternal()?.isAnonymous);
  readonly loading$$ = computed(() => this.loading());

  constructor() {
    // Add critical debugging for Capacitor plugin availability
    console.log('[AuthService] [CRITICAL] Constructor called');
    
    // Wait for CapacitorPlatformService to initialize before checking platform
    this.waitForPlatformInitialization();
  }
  
  private async waitForPlatformInitialization() {
    // Wait for Capacitor platform service to be initialized
    while (!this.capacitorPlatformService.initialized()) {
      console.log('[AuthService] [CRITICAL] Waiting for CapacitorPlatformService initialization...');
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    console.log('[AuthService] [CRITICAL] Capacitor platform info:', {
      isNativePlatform: this.capacitorPlatformService.isNative(),
      platform: this.capacitorPlatformService.platformName()
    });
    
    this.initAuthListener();
  }

  private initAuthListener() {
    console.log('[AuthService] 🔊 Initializing auth state listener...');
    console.log('[AuthService] [VERBOSE] Auth instance info:', {
      config: this.auth.config,
      name: this.auth.name,
      currentUser: this.auth.currentUser,
      settings: this.auth.settings
    });
    console.log('[AuthService] [VERBOSE] About to call onAuthStateChanged...');

    const unsubscribe: Unsubscribe = onAuthStateChanged(this.auth, async firebaseUser => {
      const timestamp = new Date().toISOString();
      console.log('[AuthService] 🔄 onAuthStateChanged triggered at', timestamp);

      try {
        if (firebaseUser) {
          console.log('[AuthService] 👤 Firebase user detected:', {
            uid: firebaseUser.uid.slice(0, 8),
            isAnonymous: firebaseUser.isAnonymous,
            email: firebaseUser.email || 'none',
            displayName: firebaseUser.displayName || 'none',
            emailVerified: firebaseUser.emailVerified,
            settingUpAnonymousUser: this.settingUpAnonymousUser,
          });

          // ✅ For anonymous users, skip document creation until onboarding completion
          if (firebaseUser.isAnonymous && !this.settingUpAnonymousUser) {
            console.log(
              '[AuthService] 👻 Anonymous user detected, skipping document creation until onboarding'
            );
          }

          // Now it's safe to set the user - document is guaranteed to exist
          console.log('[AuthService] 💾 Setting user in internal signal');
          this.userInternal.set(firebaseUser);
          this.loading.set(false);
          console.log('[AuthService] ✅ User set successfully, loading=false');
        } else {
          console.log(
            '[AuthService] 🚫 No Firebase user found - user signed out or never signed in'
          );
          this.userInternal.set(null);
          this.loading.set(false);
          console.log('[AuthService] 🗑️ Internal user cleared, loading=false');
        }
      } catch (error) {
        console.error('[AuthService] ❌ Error in auth state handler:', {
          error: error,
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp,
        });
        this.loading.set(false);
      }
    });

    console.log('[AuthService] ✅ Auth state listener initialized');
  }

  async continueAsGuest(): Promise<void> {
    console.log('[AuthService] 👻 continueAsGuest() called');

    try {
      console.log('[AuthService] 👻 Setting loading=true and settingUpAnonymousUser=true');
      this.loading.set(true);
      this.settingUpAnonymousUser = true;

      console.log('[AuthService] 👻 Calling Firebase signInAnonymously() with 15s timeout...');
      
      // Add timeout wrapper to prevent indefinite hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Anonymous authentication timed out after 15 seconds'));
        }, 15000);
      });

      const result = await Promise.race([
        signInAnonymously(this.auth),
        timeoutPromise
      ]);

      console.log('[AuthService] ✅ Anonymous authentication successful:', {
        uid: result.user.uid.slice(0, 8),
        isAnonymous: result.user.isAnonymous,
        providerId: result.providerId || 'none',
      });

      // Note: onAuthStateChanged will handle user document creation and setting the user
      console.log(
        '[AuthService] 🔄 Waiting for onAuthStateChanged to process new anonymous user...'
      );
    } catch (error) {
      console.error('[AuthService] ❌ Anonymous login failed:', {
        error: error,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      this.loading.set(false);
      this.settingUpAnonymousUser = false;
      throw error;
    }
  }

  async loginWithEmail(email: string, password: string, rememberMe = false): Promise<User> {
    try {
      this.loading.set(true);

      // Set persistence based on rememberMe choice
      const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(this.auth, persistence);
      console.log('[AuthService] ✅ Auth persistence set to:', rememberMe ? 'LOCAL' : 'SESSION');

      const cred = await signInWithEmailAndPassword(this.auth, email, password);
      console.log('[AuthService] ✅ Email login successful:', cred.user.uid);

      // Store remember me preference
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('rememberMe', rememberMe.toString());
        console.log('[AuthService] 💾 Stored rememberMe preference:', rememberMe);
      }

      // For registered users, document creation is deferred until onboarding
      if (!cred.user.isAnonymous) {
        console.log(
          '[AuthService] Registered user login, document creation deferred until onboarding'
        );
      }

      return cred.user;
    } catch (error) {
      this.loading.set(false);
      throw error;
    }
  }

  async loginWithGoogle(): Promise<User> {
    console.log('[AuthService] 🔄 loginWithGoogle() called');

    try {
      console.log('[AuthService] 🔄 Setting loading=true');
      this.loading.set(true);

      // Fork authentication based on platform
      const cred = await this.capacitorPlatformService.withPlatformFallback(
        // Native: Use Capacitor Firebase Authentication plugin
        async () => {
          console.log('[AuthService] 📱 Using native Google Sign-In for iOS/Android...');
          return await this.loginWithGoogleNative();
        },
        // Web: Use Firebase popup authentication
        async () => {
          console.log('[AuthService] 🌐 Using web popup Google Sign-In...');
          return await this.loginWithGoogleWeb();
        }
      );
      console.log('[AuthService] ✅ Google popup authentication successful:', {
        uid: cred.user.uid.slice(0, 8),
        email: cred.user.email || 'none',
        displayName: cred.user.displayName || 'none',
        isAnonymous: cred.user.isAnonymous,
      });

      // User document will be created after onboarding completion
      console.log(
        '[AuthService] 🔄 Google user authenticated, skipping document creation until onboarding'
      );

      // Wait for onAuthStateChanged to complete and auth state to be ready
      console.log('[AuthService] ⏳ Waiting for auth state to be ready...');
      await this.waitForAuthStateReady();

      console.log('[AuthService] ✅ Google authentication fully complete');
      return cred.user;
    } catch (error: any) {
      console.log('[AuthService] ❌ Setting loading=false due to error');
      this.loading.set(false);

      // Enhance error with context for better debugging
      const errorInfo = {
        code: error?.code || 'unknown',
        message: error?.message || 'Unknown error',
        timestamp: new Date().toISOString(),
      };

      if (error?.code === 'auth/popup-closed-by-user') {
        console.log('[AuthService] 💭 User cancelled Google authentication');
      } else if (error?.code === 'auth/popup-blocked') {
        console.warn('[AuthService] 🚫 Popup blocked - user needs to allow popups');
      } else if (error?.code === 'auth/network-request-failed') {
        console.error('[AuthService] 🌐 Network error during Google authentication');
      } else {
        console.error('[AuthService] ❌ Unexpected Google authentication error:', errorInfo);
      }

      throw error;
    }
  }

  async registerWithEmail(email: string, password: string, displayName?: string): Promise<User> {
    try {
      this.loading.set(true);

      console.log('[AuthService] Starting email registration for:', email);
      const cred = await createUserWithEmailAndPassword(this.auth, email, password);

      // Update the user's display name if provided
      if (displayName && displayName.trim()) {
        try {
          await updateProfile(cred.user, { displayName: displayName.trim() });
          console.log('[AuthService] Updated display name:', displayName);
        } catch (profileError) {
          console.warn('[AuthService] Failed to update display name:', profileError);
          // Don't throw here, registration was successful
        }
      }

      console.log('[AuthService] ✅ Email registration successful:', cred.user.uid);

      // User document will be created after onboarding completion
      console.log(
        '[AuthService] Registered user created, skipping document creation until onboarding'
      );

      return cred.user;
    } catch (error) {
      this.loading.set(false);
      console.error('[AuthService] Registration failed:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    const currentUser = this.userInternal();
    console.log('[AuthService] 🚪 logout() called for user:', {
      hasUser: !!currentUser,
      uid: currentUser?.uid?.slice(0, 8),
      isAnonymous: currentUser?.isAnonymous,
    });

    try {
      console.log('[AuthService] 🚪 Calling Firebase signOut()...');
      await signOut(this.auth);
      console.log('[AuthService] ✅ Firebase signOut() completed');

      // Clear remember me preference on logout
      this.clearRememberMePreference();

      console.log('[AuthService] 🗑️ Clearing internal user state');
      this.userInternal.set(null);
      console.log('[AuthService] ✅ User signed out successfully');
    } catch (error) {
      console.error('[AuthService] ❌ Logout failed:', {
        error: error,
        message: error instanceof Error ? error.message : 'Unknown error',
        currentUser: {
          hasUser: !!currentUser,
          uid: currentUser?.uid?.slice(0, 8),
        },
      });
      throw error;
    }
  }

  onAuthChange(callback: (user: User | null) => void): () => void {
    console.log('[AuthService] 🔄 External onAuthChange listener registered');
    return onAuthStateChanged(this.auth, user => {
      console.log('[AuthService] 🔄 External auth change callback triggered:', {
        hasUser: !!user,
        uid: user?.uid?.slice(0, 8),
        isAnonymous: user?.isAnonymous,
      });
      callback(user);
    });
  }

  /**
   * Wait for auth state to be ready after authentication
   * This ensures onAuthStateChanged has completed and user is fully set up
   */
  private async waitForAuthStateReady(): Promise<void> {
    return new Promise(resolve => {
      const maxAttempts = 50; // 5 seconds max for mobile
      let attempts = 0;

      const checkAuthState = () => {
        attempts++;
        const user = this.userInternal();
        const isLoading = this.loading();

        console.log('[AuthService] waitForAuthStateReady check:', {
          attempt: attempts,
          hasUser: !!user,
          isLoading,
          uid: user?.uid?.slice(0, 8),
        });

        // Auth state is ready when we have a user and are not loading
        if (user && !isLoading) {
          console.log('[AuthService] ✅ Auth state ready');
          resolve();
          return;
        }

        // Timeout after max attempts
        if (attempts >= maxAttempts) {
          console.warn('[AuthService] ⚠️ Auth state readiness timeout after', attempts, 'attempts');
          // Still resolve to prevent hanging, but log extensively
          console.log('[AuthService] Final state:', {
            hasUser: !!user,
            isLoading,
            uid: user?.uid?.slice(0, 8),
          });
          resolve(); // Resolve anyway to prevent hanging
          return;
        }

        // Check again in 100ms
        setTimeout(checkAuthState, 100);
      };

      checkAuthState();
    });
  }

  getUid(): string | null {
    return this.userInternal()?.uid ?? null;
  }

  /**
   * Check if user previously selected "Remember me"
   */
  getRememberMePreference(): boolean {
    if (typeof localStorage === 'undefined') return false;

    const stored = localStorage.getItem('rememberMe');
    return stored === 'true';
  }

  /**
   * Clear remember me preference (used on logout)
   */
  clearRememberMePreference(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('rememberMe');
      console.log('[AuthService] 🗑️ Cleared rememberMe preference');
    }
  }

  /**
   * Native Google Sign-In using Capacitor Firebase Authentication plugin
   */
  private async loginWithGoogleNative(): Promise<any> {
    console.log('[AuthService] 📱 Starting native Google Sign-In...');
    
    try {
      // Critical check: Is the plugin even available?
      console.log('[AuthService] [CRITICAL] Checking if FirebaseAuthentication plugin is available...');
      const isPluginAvailable = this.capacitorPlatformService.isPluginAvailable('FirebaseAuthentication');
      console.log('[AuthService] [CRITICAL] Plugin available check result:', isPluginAvailable);
      
      // Import Capacitor Firebase Authentication plugin directly
      console.log('[AuthService] 📱 Importing @capacitor-firebase/authentication...');
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
      console.log('[AuthService] 📱 FirebaseAuthentication plugin imported successfully');
      
      // Check if plugin methods are available
      console.log('[AuthService] [CRITICAL] Plugin methods available:', {
        signInWithGoogle: typeof FirebaseAuthentication.signInWithGoogle,
        getCurrentUser: typeof FirebaseAuthentication.getCurrentUser,
        getIdToken: typeof FirebaseAuthentication.getIdToken
      });
      
      // CRITICAL: Try to get current user to see if plugin is properly initialized
      console.log('[AuthService] [CRITICAL] Testing plugin initialization by getting current user...');
      try {
        const currentUser = await FirebaseAuthentication.getCurrentUser();
        console.log('[AuthService] [CRITICAL] getCurrentUser successful:', {
          hasUser: !!currentUser.user,
          userUid: currentUser.user?.uid?.slice(0, 8)
        });
      } catch (initError: any) {
        console.error('[AuthService] [CRITICAL] Plugin not properly initialized:', initError);
        throw new Error(`FirebaseAuthentication plugin not initialized: ${initError?.message || 'Unknown error'}`);
      }
      
      // Add timeout wrapper to prevent indefinite hanging
      console.log('[AuthService] 📱 Setting up 30s timeout wrapper for native Google Sign-In...');
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          console.error('[AuthService] ⏰ Native Google Sign-In timed out after 30 seconds');
          reject(new Error('Native Google Sign-In timed out after 30 seconds'));
        }, 30000);
      });
      
      console.log('[AuthService] 📱 Calling native Google Sign-In...');
      const startTime = Date.now();
      
      const result = await Promise.race([
        FirebaseAuthentication.signInWithGoogle(),
        timeoutPromise
      ]);
      
      const duration = Date.now() - startTime;
      console.log('[AuthService] ✅ Native Google Sign-In successful after', duration + 'ms:', {
        uid: result.user?.uid?.slice(0, 8) || 'unknown',
        email: result.user?.email || 'none',
      });
      
      // CRITICAL FIX: The Capacitor plugin completed authentication successfully
      // However, the Firebase Auth web SDK may not sync immediately due to plugin limitations
      // Manually update our internal auth state to match the successful native authentication
      console.log('[AuthService] 🔄 Native auth successful, manually updating internal state...');
      
      // Create a Firebase User-like object from the native result
      const firebaseUserFromNative = {
        uid: result.user?.uid,
        email: result.user?.email,
        displayName: result.user?.displayName || 'mb84',
        isAnonymous: false,
        emailVerified: result.user?.emailVerified || true,
        photoURL: result.user?.photoUrl || null,
        providerData: [{
          providerId: 'google.com',
          uid: result.user?.uid,
          email: result.user?.email,
          displayName: result.user?.displayName,
          photoURL: result.user?.photoUrl
        }]
      } as any;
      
      console.log('[AuthService] 📝 Manually setting user in internal signal...');
      this.userInternal.set(firebaseUserFromNative);
      this.loading.set(false);
      
      console.log('[AuthService] ✅ Manual auth state sync complete:', {
        uid: firebaseUserFromNative.uid?.slice(0, 8),
        email: firebaseUserFromNative.email
      });
      
      // CRITICAL: iOS-specific fix - ensure auth state is properly set
      // This only affects iOS native authentication, Android/web use standard Firebase flow
      console.log('[AuthService] 🍎 iOS-specific: Auth state manually updated');
      
      // AuthStore should detect this change via AuthService.user$$ signal
      // No need to trigger Firebase callbacks - we bypass that entirely for iOS native auth
      
      // Return the native result wrapped in Firebase format
      return {
        user: firebaseUserFromNative,
        credential: result.credential
      };
    } catch (error) {
      console.error('[AuthService] ❌ Native Google Sign-In failed:', error);
      throw error;
    }
  }

  /**
   * Web Google Sign-In using Firebase popup authentication
   */
  private async loginWithGoogleWeb(): Promise<any> {
    console.log('[AuthService] 🌐 Starting web popup Google Sign-In...');
    
    try {
      const provider = new GoogleAuthProvider();
      console.log('[AuthService] 🌐 Opening Google authentication popup...');
      const cred = await signInWithPopup(this.auth, provider);
      
      console.log('[AuthService] ✅ Web popup Google Sign-In successful');
      return cred;
    } catch (error) {
      console.error('[AuthService] ❌ Web popup Google Sign-In failed:', error);
      throw error;
    }
  }
}
