import { inject, PLATFORM_ID, Signal, effect, signal } from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SsrPlatformService {
  private readonly platformId = inject(PLATFORM_ID);

  get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  get isServer(): boolean {
    return isPlatformServer(this.platformId);
  }

  /**
   * Run a callback only on the browser — does nothing during SSR.
   */
  onlyOnBrowser<T>(callback: () => T): T | undefined {
    return this.isBrowser ? callback() : undefined;
  }

  /**
   * Safe access to the `window` object.
   */
  getWindow(): Window | undefined {
    return this.isBrowser ? window : undefined;
  }

  /**
   * Safe access to the `document` object.
   */
  getDocument(): Document | undefined {
    return this.isBrowser ? document : undefined;
  }

  /**
   * Signal that represents the current window width. Safe for SSR (null during SSR).
   */
  readonly windowWidth = this.isBrowser
    ? signal(window.innerWidth)
    : signal<number | null>(null);

  /**
   * Subscribe to a signal **only on the browser**. Safe to use in constructor or ngOnInit.
   */
  subscribeOnBrowser<T>(sig: Signal<T>, callback: (value: T) => void): void {
    if (this.isBrowser) {
      effect(() => callback(sig()));
    }
  }

  /**
   * Optional helper to log where the component is executing.
   */
  logContext(context: string): void {
    const env = this.isBrowser ? 'BROWSER' : 'SERVER';
    console.log(`✅ ${env}: ${context}`);
  }
}
