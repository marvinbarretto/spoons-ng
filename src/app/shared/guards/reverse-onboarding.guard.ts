import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, filter, timeout, catchError, take } from 'rxjs/operators';
import { of } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { DataAggregatorService } from '../data-access/data-aggregator.service';
import { AuthStore } from '../../auth/data-access/auth.store';
import { environment } from '../../../environments/environment';

export const reverseOnboardingGuard: CanActivateFn = (route, state) => {
  const dataAggregatorService = inject(DataAggregatorService);
  const authStore = inject(AuthStore);
  const router = inject(Router);

  console.log('[ReverseOnboardingGuard] 🔍 Checking if user should be redirected from onboarding...');

  // Allow onboarding access if development flag is enabled
  if (environment.ALLOW_ONBOARDING_ACCESS) {
    console.log('[ReverseOnboardingGuard] 🧪 DEV MODE: Onboarding access allowed, allowing route');
    return true;
  }

  // Convert user signal to observable and wait for data to be available
  const user$ = toObservable(dataAggregatorService.user);

  return user$.pipe(
    // Wait for either complete user data OR auth indicates no user will be available
    filter(user => {
      const authUser = authStore.user();
      const hasAuth = !!authUser;
      const hasCompleteUser = !!user;
      
      console.log('[ReverseOnboardingGuard] 🔍 Waiting for user data:', {
        hasAuth,
        hasCompleteUser,
        authUserId: authUser?.uid?.slice(0, 8),
        isAnonymous: authUser?.isAnonymous,
        timestamp: new Date().toISOString()
      });

      // Wait until we have either:
      // 1. Complete user data (auth + profile)
      // 2. Auth user exists but no profile (anonymous or new user)
      return hasCompleteUser || (hasAuth && authUser?.isAnonymous);
    }),
    // Take the first valid result
    take(1),
    // Add timeout to prevent infinite waiting
    timeout(5000),
    // Handle the reverse onboarding check
    map(user => {
      console.log('[ReverseOnboardingGuard] 🔍 Processing user for reverse onboarding check:', {
        hasUser: !!user,
        userId: user?.uid?.slice(0, 8),
        onboardingCompleted: user?.onboardingCompleted,
        isAnonymous: user?.isAnonymous,
        currentUrl: router.url
      });

      // If no complete user data, allow access to onboarding (new/anonymous users)
      if (!user) {
        console.log('[ReverseOnboardingGuard] ✅ No complete user data, allowing onboarding access');
        return true;
      }

      // If user has completed onboarding, redirect to home
      if (user.onboardingCompleted) {
        console.log('[ReverseOnboardingGuard] 🏠 User has completed onboarding, redirecting to home');
        router.navigate(['/home']);
        return false;
      }

      console.log('[ReverseOnboardingGuard] ✅ User needs onboarding, allowing access');
      return true;
    }),
    // Handle timeout or errors
    catchError(error => {
      console.warn('[ReverseOnboardingGuard] ⚠️ Timeout or error waiting for user data:', error);
      console.log('[ReverseOnboardingGuard] 🔄 Allowing onboarding access (fallback)');
      return of(true);
    })
  );
};