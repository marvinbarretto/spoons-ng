import { Injectable, inject } from '@angular/core';
import { PreloadingStrategy, Route, Router } from '@angular/router';
import { Observable, of, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class OnboardingAwarePreloadingStrategy implements PreloadingStrategy {
  private readonly router = inject(Router);

  preload(route: Route, load: () => Observable<any>): Observable<any> {
    // Only preload routes marked with preload: true
    if (!route.data?.['preload']) {
      return of(null);
    }

    // Check if user is currently in onboarding flow
    const currentUrl = this.router.url;
    const isInOnboarding = currentUrl.includes('/register');

    if (isInOnboarding) {
      console.log(
        '[PreloadingStrategy] 🚀 User in onboarding - starting background download of main app'
      );

      // Wait a moment to let onboarding settle, then start preloading
      return timer(2000).pipe(
        switchMap(() => {
          console.log('[PreloadingStrategy] 📦 Beginning main app module download...');
          return load();
        })
      );
    }

    // If user is not in onboarding, preload immediately (for other scenarios)
    console.log('[PreloadingStrategy] 📦 Preloading module immediately');
    return load();
  }

  /**
   * Check if user is currently in the onboarding flow
   */
  private isInOnboardingFlow(): boolean {
    const currentUrl = this.router.url;
    return currentUrl.includes('/register');
  }
}
