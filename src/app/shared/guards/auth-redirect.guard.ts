import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, filter, timeout, catchError, take } from 'rxjs/operators';
import { of } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { AuthStore } from '../../auth/data-access/auth.store';

export const authRedirectGuard: CanActivateFn = (route, state) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  console.log('[AuthRedirectGuard] 🔍 Checking if authenticated user should be redirected...');

  // Convert auth ready signal to observable
  const authReady$ = toObservable(authStore.ready);

  return authReady$.pipe(
    // Wait for auth to be ready
    filter(ready => ready),
    take(1),
    // Add timeout to prevent infinite waiting
    timeout(3000),
    // Handle the actual redirect check
    map(() => {
      const user = authStore.user();
      
      console.log('[AuthRedirectGuard] 🔍 Processing user for auth redirect:', {
        hasUser: !!user,
        userId: user?.uid?.slice(0, 8),
        isAnonymous: user?.isAnonymous,
        currentUrl: router.url
      });

      // If no user, allow access to splash/login/register pages
      if (!user) {
        console.log('[AuthRedirectGuard] ✅ No user, allowing access to auth pages');
        return true;
      }

      // If user exists, redirect to home
      console.log('[AuthRedirectGuard] 🏠 User is authenticated, redirecting to home');
      router.navigate(['/home']);
      return false;
    }),
    // Handle timeout or errors
    catchError(error => {
      console.warn('[AuthRedirectGuard] ⚠️ Timeout or error checking auth state:', error);
      console.log('[AuthRedirectGuard] 🔄 Allowing access to auth pages (fallback)');
      return of(true);
    })
  );
};