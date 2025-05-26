import { Injectable, inject } from '@angular/core';
import { SsrPlatformService } from '../utils/ssr/ssr-platform.service';

@Injectable({ providedIn: 'root' })
export class CookieService {
  private readonly platform = inject(SsrPlatformService);

  // getCookie(name: string): string | null {
  //   if (!this.platform.isBrowser) return null;

  //   const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  //   return match ? decodeURIComponent(match[2]) : null;
  // }

  // setCookie(name: string, value: string, days = 7): void {
  //   if (!this.platform.isBrowser) return;

  //   const expires = new Date(Date.now() + days * 86400000).toUTCString();
  //   document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  // }

  getCookie(name: string): string | null {
    if (!this.platform.isBrowser) return null;

    const match = document.cookie.match(
      new RegExp('(^| )' + name + '=([^;]+)')
    );
    const value = match ? decodeURIComponent(match[2]) : null;
    console.log(`[CookieService] getCookie("${name}") =>`, value);
    return value;
  }

  setCookie(name: string, value: string, days = 7): void {
    if (!this.platform.isBrowser) return;

    const expires = new Date(Date.now() + days * 86400000).toUTCString();
    const cookieString = `${name}=${encodeURIComponent(
      value
    )}; expires=${expires}; path=/; SameSite=Lax`;
    document.cookie = cookieString;
    console.log(
      `[CookieService] setCookie("${name}", "${value}") =>`,
      cookieString
    );
  }

  deleteCookie(name: string): void {
    if (!this.platform.isBrowser) return;

    document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
  }
}
