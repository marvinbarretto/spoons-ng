// auth.store.ts
import { inject, Injectable, signal, computed } from '@angular/core';
import { AuthService } from './auth.service';
import { MinimalUser } from '../utils/auth.model';
import { CookieService } from '../../shared/data-access/cookie.service';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private authService = inject(AuthService);
  private cookieService = inject(CookieService);

  readonly user$$ = signal<MinimalUser | null>(null);
  readonly token$$ = signal<string | null>(null);
  readonly ready$$ = signal(false);
  readonly isAuthenticated$$ = computed(() => !!this.token$$());

  constructor() {
    this.authService.onAuthChange(async (user) => {
      if (!user) {
        this.logout();
        this.ready$$.set(true);
        return;
      }

      const token = await user.getIdToken();

      const minimalUser: MinimalUser = {
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
      localStorage.setItem('user', JSON.stringify(minimalUser));
      this.ready$$.set(true);
      console.log('[AuthStore] ✅ Firebase user bootstrapped:', minimalUser);
    });

    console.log('[AuthStore] 🔁 Listening for auth changes...');
  }

  async loginWithEmail(email: string, password: string) {
    const user = await this.authService.loginWithEmail(email, password);
    console.log('[AuthStore] 🔐 Email login success:', user.uid);
  }

  async loginWithGoogle() {
    const user = await this.authService.loginWithGoogle();
    console.log('[AuthStore] 🔐 Google login success:', user.uid);
  }

  logout() {
    this.token$$.set(null);
    this.user$$.set(null);
    this.cookieService.deleteCookie('authToken');
    localStorage.removeItem('user');
    this.authService.logout();
    console.log('[AuthStore] 👋 Logged out');
  }
}
