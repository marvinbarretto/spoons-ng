// auth.store.ts
import { inject, Injectable, signal, computed } from '@angular/core';
import { AuthService } from './auth.service';
import { CookieService } from '../../shared/data-access/cookie.service';
import { SsrPlatformService } from '../../shared/utils/ssr/ssr-platform.service';
import { User } from '../../users/utils/user.model';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private authService = inject(AuthService);
  private cookieService = inject(CookieService);
  private platform = inject(SsrPlatformService);

  readonly user$$ = signal<User | null>(null);
  readonly token$$ = signal<string | null>(null);
  readonly ready$$ = signal(false);
  readonly isAuthenticated$$ = computed(() => !!this.token$$());

  constructor() {
    if (this.platform.isServer) {
      this.ready$$.set(true);
      return;
    }

    console.log('[AuthStore] 🔁 Listening for auth changes...');

    this.authService.onAuthChange(async (user) => {
      if (!user) {
        this.logout();
        this.ready$$.set(true);
        return;
      }

      const token = await user.getIdToken();

      const minimalUser: User = {
        uid: user.uid,
        email: user.email ?? undefined,
        displayName: user.displayName ?? undefined,
        photoURL: user.photoURL ?? undefined,
        emailVerified: user.emailVerified,
        isAnonymous: user.isAnonymous,
      };

      this.token$$.set(token);
      this.user$$.set(minimalUser);
      this.cookieService.setCookie('authToken', token);

      // Only safe in browser
      localStorage.setItem('user', JSON.stringify(minimalUser));

      this.ready$$.set(true);
      console.log('[AuthStore] ✅ Firebase user bootstrapped:', minimalUser);
    });
  }

  logout() {
    this.token$$.set(null);
    this.user$$.set(null);
    this.cookieService.deleteCookie('authToken');

    if (this.platform.isBrowser) {
      localStorage.removeItem('user');
    }

    this.authService.logout();
    console.log('[AuthStore] 👋 Logged out');
  }

  // QUERY: Why not use the service directly?
  loginWithEmail(email: string, password: string) {
    this.authService.loginWithEmail(email, password);
  }

  loginWithGoogle() {
    this.authService.loginWithGoogle();
  }
}
