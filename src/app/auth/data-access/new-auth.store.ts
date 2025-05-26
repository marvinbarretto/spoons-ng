import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from 'express';
import { CookieService } from '../../shared/data-access/cookie.service';
import { ToastService } from '../../shared/data-access/toast.service';
import { SsrPlatformService } from '../../shared/utils/ssr/ssr-platform.service';
import { UserService } from '../../users/data-access/user.service';
import { User } from '../../users/utils/user.model';
import { AuthService } from './auth.service';
import { Roles } from '../utils/roles.enum';
import { firstValueFrom } from 'rxjs';
import { RegisterPayload } from '../utils/auth.model';

@Injectable({
  providedIn: 'root'
})
export class NewAuthStore {
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly cookieService = inject(CookieService);
  private readonly platform = inject(SsrPlatformService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  readonly user$$ = signal<User | null>(null);
  readonly token$$ = signal<string | null>(null);
  readonly loading$$ = signal(false);
  readonly error$$ = signal<string | null>(null);
  readonly ready$$ = signal(false);

  constructor() {
    this.platform.onlyOnBrowser(() => {
      this.loadUserFromStorage();
    });
  }

  readonly isAuthenticated$$ = computed(() => !!this.token$$());
  readonly role$$ = computed(() => this.user$$()?.role.name ?? Roles.Public);
  readonly isAdmin$$ = computed(() => this.role$$() === Roles.Admin);



  async login(identifier: string, password: string): Promise<void> {
    this.loading$$.set(true);
    this.error$$.set(null);

    try {
      const res = await firstValueFrom(this.authService.login({ identifier, password }));
      this.token$$.set(res.jwt);
      this.cookieService.setCookie('authToken', res.jwt);

      const user = await firstValueFrom(this.userService.getUserDetails());
      this.user$$.set(user);

      this.platform.onlyOnBrowser(() => {
        localStorage.setItem('user', JSON.stringify(user));
      });

      this.toastService.success('Login successful!');
      this.router.navigate(['/']);
    } catch (err) {
      this.error$$.set('Login failed');
      console.error('[NewAuthStore] login error:', err);
    } finally {
      this.loading$$.set(false);
    }
  }

  logout(): void {
    this.cookieService.deleteCookie('authToken');
    this.platform.onlyOnBrowser(() => localStorage.removeItem('user'));
    this.token$$.set(null);
    this.user$$.set(null);
    this.toastService.success('Logout worked');
    this.router.navigate(['/login']);
  }

  async register(payload: RegisterPayload): Promise<void> {
    this.loading$$.set(true);
    this.error$$.set(null);

    try {
      const res = await firstValueFrom(this.authService.register(payload));
      this.token$$.set(res.jwt);
      this.cookieService.setCookie('authToken', res.jwt);

      const user = await firstValueFrom(this.userService.getUserDetails());
      this.user$$.set(user);

      this.platform.onlyOnBrowser(() => {
        localStorage.setItem('user', JSON.stringify(user));
      });

      this.toastService.success('Registration complete!');
      this.router.navigate(['/']);
    } catch (err) {
      this.error$$.set('Registration failed');
      console.error('[NewAuthStore] register error:', err);
    } finally {
      this.loading$$.set(false);
    }
  }

  private loadUserFromStorage(): void {
    const token = this.cookieService.getCookie('authToken');
    const user = localStorage.getItem('user');

    if (!token) return;

    this.token$$.set(token);

    if (user) {
      this.user$$.set(JSON.parse(user));
    } else {
      this.userService.getUserDetails().subscribe({
        next: (user) => {
          this.user$$.set(user);
          localStorage.setItem('user', JSON.stringify(user));
        },
        error: () => {
          this.user$$.set(null);
        },
      });
    }

    this.ready$$.set(true);
  }



}
