import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../data-access/auth.store';

export const authGuard: CanActivateFn = (route, state) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  console.log('[AuthGuard] 🔒 AuthGuard checking access to:', state.url);
  console.log('[AuthGuard] 🔒 User state:', {
    hasSeenSplash: authStore.hasSeenSplash(),
    isAuthenticated: authStore.isAuthenticated(),
    isExplicitGuest: authStore.isExplicitGuest(),
    userId: authStore.user()?.uid?.slice(0, 8),
    isAnonymous: authStore.user()?.isAnonymous
  });

  // Check if user has seen splash - if not, show splash first
  if (!authStore.hasSeenSplash()) {
    console.log('[AuthGuard] 🔒 User has not seen splash, redirecting to /splash');
    router.navigate(['/splash']);
    return false;
  }

  // Allow access if user is authenticated (includes real users and explicit guests)
  if (authStore.isAuthenticated()) {
    const user = authStore.user();
    
    // Real users (not anonymous) - always allow
    if (user && !user.isAnonymous) {
      console.log('[AuthGuard] 🔒 Registered user authenticated, allowing access to:', state.url);
      return true;
    }
    
    // Anonymous users who explicitly chose to be guests - allow
    if (user && user.isAnonymous && authStore.isExplicitGuest()) {
      console.log('[AuthGuard] 🔒 Explicit guest user, allowing access to:', state.url);
      return true;
    }
    
    // Anonymous users who didn't explicitly choose guest - redirect to splash
    if (user && user.isAnonymous && !authStore.isExplicitGuest()) {
      console.log('[AuthGuard] 🔒 Anonymous user (not explicit guest), redirecting to /splash');
      router.navigate(['/splash']);
      return false;
    }
  }

  // Not authenticated at all - redirect to splash (they've seen it but need to choose auth method)
  console.log('[AuthGuard] 🔒 User not authenticated, redirecting to /splash');
  router.navigate(['/splash']);
  return false;
};
