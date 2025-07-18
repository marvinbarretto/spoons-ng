// src/app/auth/data-access/auth.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  User,
  onAuthStateChanged,
  Unsubscribe,
  signInAnonymously,
  updateProfile,
} from '@angular/fire/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);

  private readonly userInternal = signal<User | null>(null);
  private readonly loading = signal<boolean>(true);

  // Track if we're in the middle of setting up a new anonymous user
  private settingUpAnonymousUser = false;

  readonly user$$ = computed(() => this.userInternal());
  readonly isAnon$$ = computed(() => !!this.userInternal()?.isAnonymous);
  readonly loading$$ = computed(() => this.loading());

  constructor() {
    this.initAuthListener();
  }

  private initAuthListener() {
    console.log('[AuthService] Initializing auth state listener...');

    const unsubscribe: Unsubscribe = onAuthStateChanged(this.auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          console.log('[AuthService] Auth state changed:', firebaseUser.uid, firebaseUser.isAnonymous ? '(anonymous)' : '(registered)');

          // ✅ For anonymous users, skip document creation until onboarding completion
          if (firebaseUser.isAnonymous && !this.settingUpAnonymousUser) {
            console.log('[AuthService] Anonymous user logged in, skipping document creation until onboarding');
          }

          // Now it's safe to set the user - document is guaranteed to exist
          this.userInternal.set(firebaseUser);
          this.loading.set(false);
        } else {
          console.log('[AuthService] No user session found. User needs to login or continue as guest.');
          this.userInternal.set(null);
          this.loading.set(false);
        }
      } catch (error) {
        console.error('[AuthService] Error in auth state handler:', error);
        this.loading.set(false);
      }
    });
  }

  async continueAsGuest(): Promise<void> {
    try {
      this.loading.set(true);
      this.settingUpAnonymousUser = true;

      console.log('[AuthService] Starting anonymous sign-in...');
      const result = await signInAnonymously(this.auth);

      console.log('[AuthService] ✅ Anonymous authentication successful:', result.user.uid);

      // Note: onAuthStateChanged will handle user document creation and setting the user
      // We don't need to do anything else here

    } catch (error) {
      console.error('[AuthService] Anonymous login failed:', error);
      this.loading.set(false);
      this.settingUpAnonymousUser = false;
    }
  }


  async loginWithEmail(email: string, password: string): Promise<User> {
    try {
      this.loading.set(true);
      const cred = await signInWithEmailAndPassword(this.auth, email, password);
      console.log('[AuthService] ✅ Email login successful:', cred.user.uid);

      // For registered users, document creation is deferred until onboarding
      if (!cred.user.isAnonymous) {
        console.log('[AuthService] Registered user login, document creation deferred until onboarding');
      }

      return cred.user;
    } catch (error) {
      this.loading.set(false);
      throw error;
    }
  }

  async loginWithGoogle(): Promise<User> {
    try {
      this.loading.set(true);
      const provider = new GoogleAuthProvider();
      
      console.log('[AuthService] Starting Google authentication popup...');
      const cred = await signInWithPopup(this.auth, provider);
      console.log('[AuthService] ✅ Google login successful:', cred.user.uid);

      // User document will be created after onboarding completion
      console.log('[AuthService] Google user created, skipping document creation until onboarding');

      // Wait for onAuthStateChanged to complete and auth state to be ready
      await this.waitForAuthStateReady();

      console.log('[AuthService] ✅ Google auth fully complete');
      return cred.user;
    } catch (error: any) {
      this.loading.set(false);
      console.error('[AuthService] Google authentication failed:', error);
      
      // Enhance error with context for better debugging
      if (error?.code === 'auth/popup-closed-by-user') {
        console.log('[AuthService] User cancelled Google authentication');
      } else if (error?.code === 'auth/popup-blocked') {
        console.warn('[AuthService] Popup blocked - user needs to allow popups');
      } else if (error?.code === 'auth/network-request-failed') {
        console.error('[AuthService] Network error during Google authentication');
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
      console.log('[AuthService] Registered user created, skipping document creation until onboarding');

      return cred.user;
    } catch (error) {
      this.loading.set(false);
      console.error('[AuthService] Registration failed:', error);
      throw error;
    }
  }


  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      console.log('[AuthService] ✅ User signed out');
      this.userInternal.set(null);
    } catch (error) {
      console.error('[AuthService] Logout failed:', error);
      throw error;
    }
  }

  onAuthChange(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(this.auth, callback);
  }

  /**
   * Wait for auth state to be ready after authentication
   * This ensures onAuthStateChanged has completed and user is fully set up
   */
  private async waitForAuthStateReady(): Promise<void> {
    return new Promise((resolve) => {
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
          uid: user?.uid?.slice(0, 8)
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
            uid: user?.uid?.slice(0, 8)
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
}
