// new-auth.store.ts
import { Injectable, signal, computed, effect } from '@angular/core';
import { CookieService } from '../../shared/data-access/cookie.service';
import { inject } from '@angular/core';

export type MinimalUser = {
  uid: string;
  email?: string;
  displayName?: string;
};

@Injectable({ providedIn: 'root' })
export class NewAuthStore {
  private cookieService = inject(CookieService);

  readonly user$$ = signal<MinimalUser | null>(null);
  readonly token$$ = signal<string | null>(null);
  readonly ready$$ = signal(false);

  readonly isAuthenticated$$ = computed(() => !!this.token$$());

  constructor() {
    this.hydrateFromCookies();
  }

  private hydrateFromCookies() {
    const token = this.cookieService.getCookie('authToken');
    if (token) {
      // Eventually: validate token, fetch user profile if needed
      this.token$$.set(token);
      // Optionally hydrate user info from localStorage
      const cachedUser = localStorage.getItem('user');
      if (cachedUser) {
        this.user$$.set(JSON.parse(cachedUser));
      }
    }
    this.ready$$.set(true);
    console.log('[NewAuthStore] 🧠 Bootstrapped auth state from cookies');
  }

  login(token: string, user: MinimalUser) {
    this.token$$.set(token);
    this.user$$.set(user);
    this.cookieService.setCookie('authToken', token);
    localStorage.setItem('user', JSON.stringify(user));
    console.log('[NewAuthStore] ✅ Login succeeded');
  }

  logout() {
    this.token$$.set(null);
    this.user$$.set(null);
    this.cookieService.deleteCookie('authToken');
    localStorage.removeItem('user');
    console.log('[NewAuthStore] 👋 Logged out');
  }
}
