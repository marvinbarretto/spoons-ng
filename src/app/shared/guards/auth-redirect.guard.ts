import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, filter, timeout, catchError, take } from 'rxjs/operators';
import { of } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { AuthStore } from '../../auth/data-access/auth.store';

export const authRedirectGuard: CanActivateFn = (route, state) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  console.log('[Auth Flow] 🚪 AuthRedirectGuard checking if authenticated user should be redirected...');

  // Convert auth ready signal to observable
  const authReady$ = toObservable(authStore.ready);

  return authReady$.pipe(
    // Wait for auth to be ready
    filter(ready => ready),
    take(1),
    // Add timeout to prevent infinite waiting
    timeout(5000), // Increased timeout to 5 seconds for mobile
    // Handle the actual redirect check
    map(() => {
      const user = authStore.user();
      const isAuthenticated = authStore.isAuthenticated();
      
      console.log('[Auth Flow] 🚪 Processing user for auth redirect:', {
        hasUser: !!user,
        userId: user?.uid?.slice(0, 8),
        isAnonymous: user?.isAnonymous,
        isAuthenticated,
        currentUrl: router.url,
        hasSeenSplash: authStore.hasSeenSplash(),
        isExplicitGuest: authStore.isExplicitGuest()
      });

      // If no user, check if they've seen splash
      if (!user) {
        if (!authStore.hasSeenSplash()) {
          // If user hasn't seen splash and isn't on splash page, redirect to splash
          if (state.url !== '/splash') {
            console.log('[Auth Flow] 🚪 No user and hasn\'t seen splash, redirecting to splash');
            router.navigate(['/splash']);
            return false;
          }
          console.log('[Auth Flow] 🚪 No user and hasn\'t seen splash, allowing access to splash');
          return true;
        }
        console.log('[Auth Flow] 🚪 No user but has seen splash, allowing access to auth pages');
        return true;
      }

      // If user is authenticated (not anonymous), redirect to home
      if (!user.isAnonymous && isAuthenticated) {
        console.log('[Auth Flow] 🚪 Real user is authenticated, redirecting to home');
        router.navigate(['/home']);
        return false;
      }

      // If user is anonymous but NOT an explicit guest, allow access to auth pages
      // (This covers cases where anonymous users were created automatically)
      if (user.isAnonymous && !authStore.isExplicitGuest()) {
        console.log('[Auth Flow] 🚪 Anonymous user (not explicit guest), allowing access to auth pages');
        return true;
      }

      // If user is an explicit guest, redirect to home (they chose to use the app as guest)
      if (user.isAnonymous && authStore.isExplicitGuest() && isAuthenticated) {
        console.log('[Auth Flow] 🚪 Explicit guest user, redirecting to home');
        router.navigate(['/home']);
        return false;
      }

      // Fallback: allow access
      console.log('[Auth Flow] 🚪 Fallback: allowing access to auth pages');
      return true;
    }),
    // Handle timeout or errors with retry logic
    catchError(error => {
      console.warn('[Auth Flow] 🚪 ⚠️ Timeout or error checking auth state:', error);
      
      // For timeout errors, try one more time with a fallback strategy
      if (error.name === 'TimeoutError') {
        const user = authStore.user();
        const isAuthenticated = authStore.isAuthenticated();
        
        console.log('[Auth Flow] 🚪 🔄 Timeout fallback - current auth state:', {
          hasUser: !!user,
          isAuthenticated,
          userId: user?.uid?.slice(0, 8)
        });
        
        // If we have a user and they're authenticated, redirect appropriately
        if (user && isAuthenticated) {
          if (!user.isAnonymous) {
            console.log('[Auth Flow] 🚪 🔄 Timeout fallback: redirecting authenticated user to home');
            router.navigate(['/home']);
            return of(false);
          }
          if (user.isAnonymous && authStore.isExplicitGuest()) {
            console.log('[Auth Flow] 🚪 🔄 Timeout fallback: redirecting explicit guest to home');
            router.navigate(['/home']);
            return of(false);
          }
        }
      }
      
      console.log('[Auth Flow] 🚪 🔄 Allowing access to auth pages (error fallback)');
      return of(true);
    })
  );
};