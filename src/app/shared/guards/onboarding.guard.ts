import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, filter, timeout, catchError, take } from 'rxjs/operators';
import { of, timer } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { DataAggregatorService } from '../data-access/data-aggregator.service';
import { AuthStore } from '../../auth/data-access/auth.store';
import { environment } from '../../../environments/environment';

export const onboardingGuard: CanActivateFn = (route, state) => {
  const dataAggregatorService = inject(DataAggregatorService);
  const authStore = inject(AuthStore);
  const router = inject(Router);

  console.log('[OnboardingGuard] 🔍 Starting onboarding check...');

  // Skip onboarding check if development flag is enabled
  if (environment.ALLOW_ONBOARDING_ACCESS) {
    console.log('[OnboardingGuard] 🧪 DEV MODE: Onboarding access allowed, allowing route');
    return true;
  }

  // Convert user signal to observable and wait for data to be available
  const user$ = toObservable(dataAggregatorService.user);
  const authUser$ = toObservable(authStore.user);

  return user$.pipe(
    // Wait for either complete user data OR auth indicates no user will be available
    filter(user => {
      const authUser = authStore.user();
      const hasAuth = !!authUser;
      const hasCompleteUser = !!user;
      
      console.log('[OnboardingGuard] 🔍 Waiting for user data:', {
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
    // Handle the actual onboarding check
    map(user => {
      console.log('[OnboardingGuard] 🔍 Processing user for onboarding check:', {
        hasUser: !!user,
        userId: user?.uid?.slice(0, 8),
        onboardingCompleted: user?.onboardingCompleted,
        isAnonymous: user?.isAnonymous,
        currentUrl: router.url
      });

      // If no complete user data, allow route (auth/anonymous flow will handle)
      if (!user) {
        console.log('[OnboardingGuard] ❌ No complete user data, allowing route (auth will handle)');
        return true;
      }

      // If user hasn't completed onboarding, redirect to onboarding
      if (!user.onboardingCompleted) {
        console.log('[OnboardingGuard] 🚀 User needs onboarding, redirecting');
        router.navigate(['/onboarding']);
        return false;
      }

      console.log('[OnboardingGuard] ✅ Onboarding complete, allowing access to home');
      return true;
    }),
    // Handle timeout or errors
    catchError(error => {
      console.warn('[OnboardingGuard] ⚠️ Timeout or error waiting for user data:', error);
      console.log('[OnboardingGuard] 🔄 Allowing route to proceed (fallback)');
      return of(true);
    })
  );
};