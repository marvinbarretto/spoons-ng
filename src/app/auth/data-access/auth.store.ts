import { inject, Injectable, signal, computed } from '@angular/core';
import { AuthService } from './auth.service';
import { SsrPlatformService } from '../../shared/utils/ssr/ssr-platform.service';
import { User } from '../../users/utils/user.model';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private authService = inject(AuthService);
  private platform = inject(SsrPlatformService);

  // Stores a minimal copy of the Firebase Auth user
  readonly user$$ = signal<User | null>(null);

  // Stores the Firebase ID token (for headers, SSR cookies, etc.)
  readonly token$$ = signal<string | null>(null);

  // Becomes true once auth state is initialized
  readonly ready$$ = signal(false);

  // Convenience computed signal
  readonly isAuthenticated$$ = computed(() => !!this.token$$());

  constructor() {
    // No-op on the server
    if (this.platform.isServer) {
      this.ready$$.set(true);
      return;
    }


    // 1. Try bootstrapping from localStorage
    try {
      const cachedUser = localStorage.getItem('user');
      const cachedToken = localStorage.getItem('token');

      if (cachedUser && cachedToken) {
        this.user$$.set(JSON.parse(cachedUser));
        this.token$$.set(cachedToken);
        console.log('[AuthStore] 🚀 Bootstrapped from localStorage');
      }
    } catch (err) {
      console.warn('[AuthStore] ⚠️ Failed to parse localStorage user:', err);
    }


    console.log('[AuthStore] 🔁 Listening for auth changes...');

    // Watch for Firebase Auth state changes
    this.authService.onAuthChange(async (user) => {
      if (!user) {
        this.logout();
        this.ready$$.set(true);
        return;
      }

      // 1. Fetch the Firebase ID token
      const token = await user.getIdToken();

      // 2. Store a minimal user object
      const minimalUser: User = {
        uid: user.uid,
        email: user.email ?? undefined,
        displayName: user.displayName ?? undefined,
        photoURL: user.photoURL ?? undefined,
        emailVerified: user.emailVerified,
        isAnonymous: user.isAnonymous,

        // App-specific fields — left empty here for bootstrap
        landlordOf: [],
        claimedPubIds: [],
        checkedInPubIds: [],
        badges: [],
        streaks: {},
      };

      // 3. Update reactive state
      this.token$$.set(token);
      this.user$$.set(minimalUser);

      // 4. Store in localStorage for fast PWA boot
      if (this.platform.isBrowser) {
        localStorage.setItem('user', JSON.stringify(minimalUser));
        localStorage.setItem('token', token);
      }

      // 5. Done
      this.ready$$.set(true);
      console.log('[AuthStore] ✅ Firebase user bootstrapped:', minimalUser);
    });
  }

  get uid(): string | null {
    return this.user$$()?.uid ?? null;
  }



  logout() {
    this.token$$.set(null);
    this.user$$.set(null);

    if (this.platform.isBrowser) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }

    this.authService.logout();
    console.log('[AuthStore] 👋 Logged out');
  }

  // These are pass-throughs to your actual AuthService
  loginWithEmail(email: string, password: string) {
    this.authService.loginWithEmail(email, password);
  }

  loginWithGoogle() {
    this.authService.loginWithGoogle();
  }
}
