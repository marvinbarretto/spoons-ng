import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from './auth.store';
import { UserStore } from '@users/data-access/user.store';

/**
 * Guard to ensure users have completed onboarding before accessing main app
 * - Anonymous users: Skip onboarding entirely (allowed through)
 * - Google/Email users: Must complete onboarding via /onboarding route
 */
export const onboardingGuard: CanActivateFn = async (route, state) => {
  const authStore = inject(AuthStore);
  const userStore = inject(UserStore);
  const router = inject(Router);

  // Wait for auth to be ready
  if (!authStore.ready()) {
    await authStore.waitForAuthReady();
  }

  // If not authenticated, redirect to splash (authGuard will handle this too)
  if (!authStore.isAuthenticated()) {
    console.log('[OnboardingGuard] User not authenticated, redirecting to splash');
    router.navigate(['/splash']);
    return false;
  }

  const authUser = authStore.user();
  
  // Anonymous users skip onboarding completely
  if (authUser?.isAnonymous) {
    console.log('[OnboardingGuard] Anonymous user detected, skipping onboarding requirement');
    return true;
  }

  // For authenticated (Google/Email) users, check onboarding completion
  console.log('[OnboardingGuard] Authenticated user detected, checking onboarding status');

  // Wait for user data to be loaded
  const user = userStore.currentUser();
  if (!user) {
    console.log('[OnboardingGuard] User data not loaded yet, waiting...');
    // Give user store a moment to load
    await new Promise(resolve => setTimeout(resolve, 1000));
    const retryUser = userStore.currentUser();
    
    if (!retryUser) {
      console.log('[OnboardingGuard] User data still not available, redirecting to onboarding');
      router.navigate(['/onboarding']);
      return false;
    }
  }

  const currentUser = userStore.currentUser();
  
  // Check if onboarding is completed
  if (!currentUser?.onboardingCompleted) {
    console.log('[OnboardingGuard] Authenticated user has not completed onboarding, redirecting to /onboarding');
    router.navigate(['/onboarding']);
    return false;
  }

  console.log('[OnboardingGuard] User has completed onboarding, allowing access');
  return true;
};