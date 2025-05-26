// The idea is that this store is the single source of truth for authentication state

import { Roles } from '../utils/roles.enum';
import { AuthResponse, RegisterPayload } from '../utils/auth.model';
import { AuthService } from './auth.service';
import { UserService } from '../../users/data-access/user.service';
import { CookieService } from '../../shared/data-access/cookie.service';
import { ToastService } from '../../shared/data-access/toast.service';
import { SsrPlatformService } from '../../shared/utils/ssr/ssr-platform.service';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap, take, catchError } from 'rxjs/operators';
import { User } from '../../users/utils/user.model';
import { of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly cookieService = inject(CookieService);
  private readonly platform = inject(SsrPlatformService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  readonly user$$ = signal<User | null>(null);
  readonly token$$ = signal<string | null>(null);
  readonly loading$$ = signal<boolean>(false);
  readonly error$$ = signal<string | null>(null);
  readonly ready$$ = signal<boolean>(false);

  constructor() {
    this.platform.onlyOnBrowser(() => {
      // const token = this.cookieService.getCookie('authToken');
      // const user = localStorage.getItem('user');
      // console.log('[AuthStore] Bootstrapping from cookie — token:', token);
      // console.log('[AuthStore] Bootstrapping from localStorage — user:', user);

      this.loadUserFromStorage();
    });
  }

  // Reactive role checks
  readonly isAuthenticated$$ = computed(() => !!this.token$$());
  readonly role$$ = computed(() => this.user$$()?.role.name ?? Roles.Public);
  readonly isAdmin$$ = computed(() => this.role$$() === Roles.Admin);
  readonly isAuthor$$ = computed(() => this.role$$() === Roles.Author);

  readonly canCreateEvent$$ = computed(
    () => this.isAdmin$$() || this.isAuthor$$()
  );
  readonly canCreateArticle$$ = computed(
    () => this.isAdmin$$() || this.isAuthor$$()
  );
  readonly canCreateUser$$ = computed(() => this.isAdmin$$());
  readonly canReviewEvents$$ = computed(() => this.isAdmin$$());
  readonly canReviewArticles$$ = computed(() => this.isAdmin$$());

  // Non-reactive

  /**
   * @deprecated Use isAuthenticated$$ instead
   */
  isAuthenticated(): boolean {
    return !!this.token$$();
  }

  /**
   * @deprecated Use isAdmin$$ instead
   */
  isAdmin(): boolean {
    return this.hasRole(Roles.Admin);
  }

  /**
   * @deprecated Use role$$ instead
   */
  hasRole(role: Roles): boolean {
    return this.user$$()?.role.name === role;
  }

  /**
   * @deprecated Use canCreateEvent$$ instead
   */
  canCreateEvent(): boolean {
    return this.hasRole(Roles.Author) || this.hasRole(Roles.Admin);
  }

  /**
   * @deprecated Use canCreateArticle$$ instead
   */
  canCreateArticle(): boolean {
    return this.hasRole(Roles.Author) || this.hasRole(Roles.Admin);
  }

  /**
   * @deprecated Use canCreateUser$$ instead
   */
  canCreateUser(): boolean {
    return this.hasRole(Roles.Admin);
  }

  /**
   * @deprecated Use canReviewEvents$$ instead
   */
  canReviewEvents(): boolean {
    return this.hasRole(Roles.Admin);
  }

  /**
   * @deprecated Use canReviewArticles$$ instead
   */
  canReviewArticles(): boolean {
    return this.hasRole(Roles.Admin);
  }

  bootstrapFromCookie(): void {
    if (!this.platform.isBrowser) return;

    const token = this.cookieService.getCookie('authToken');
    if (!token) {
      this.token$$.set(null);
      this.user$$.set(null);
      this.ready$$.set(true);
      return;
    }

    this.token$$.set(token);

    this.userService.getUserDetails().subscribe({
      next: (user) => {
        this.user$$.set(user);
        localStorage.setItem('user', JSON.stringify(user));
      },
      error: () => {
        this.user$$.set(null);
      },
      complete: () => {
        this.ready$$.set(true);
      },
    });
  }
  private loadUserFromStorage() {
    if (!this.platform.isBrowser) return;

    const token = this.cookieService.getCookie('authToken');
    const user = localStorage.getItem('user');

    if (token) {
      this.token$$.set(token);

      if (user) {
        this.user$$.set(JSON.parse(user));
      } else {
        this.userService.getUserDetails().subscribe((user: User) => {
          this.user$$.set(user);
          localStorage.setItem('user', JSON.stringify(user));
        });
      }
    }
  }

  login(identifier: string, password: string) {
    this.loading$$.set(true);
    this.error$$.set(null);

    return this.authService
      .login({ identifier, password })
      .pipe(
        tap((response: AuthResponse) => this.handleLoginSuccess(response)),
        catchError((error: any) => {
          this.error$$.set(`Login failed ${error}`);
          this.loading$$.set(false);
          return of(null);
        }),
        take(1)
      )
      .subscribe();
  }

  logout() {
    this.cookieService.deleteCookie('authToken');

    this.platform.onlyOnBrowser(() => {
      localStorage.removeItem('user');
    });

    this.token$$.set(null);
    this.user$$.set(null);

    // TODO: Get these labels out of a central place
    this.toastService.success('Logout worked');
    this.router.navigate(['/login']);
  }

  register(payload: RegisterPayload) {
    this.loading$$.set(true);
    this.error$$.set(null);

    return this.authService
      .register(payload)
      .pipe(
        tap((response: AuthResponse) => this.handleLoginSuccess(response)),
        catchError((error: any) => {
          this.error$$.set(`Login failed ${error}`);
          this.loading$$.set(false);
          return of(null);
        }),
        take(1)
      )
      .subscribe();
  }

  private handleLoginSuccess(response: AuthResponse) {
    this.token$$.set(response.jwt);
    this.cookieService.setCookie('authToken', response.jwt);

    this.userService.getUserDetails().subscribe({
      next: (user) => {
        this.user$$.set(user);
        this.platform.onlyOnBrowser(() => {
          localStorage.setItem('user', JSON.stringify(user));
        });
        this.loading$$.set(false);
        this.error$$.set(null);
        this.toastService.success('Login successful!');
        this.router.navigate(['/']);
      },
      error: (error: any) => {
        this.error$$.set(`Login failed ${error}`);
        this.loading$$.set(false);
      },
    });
  }
}
