import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../data-access/auth.store';

export const authGuard: CanActivateFn = (route, state) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);
  const timestamp = new Date().toISOString();

  console.log('[AuthGuard] 🔒 AuthGuard triggered at', timestamp, 'for route:', state.url);
  
  const userState = {
    hasSeenSplash: authStore.hasSeenSplash(),
    isAuthenticated: authStore.isAuthenticated(),
    isExplicitGuest: authStore.isExplicitGuest(),
    userId: authStore.user()?.uid?.slice(0, 8),
    isAnonymous: authStore.user()?.isAnonymous,
    authReady: authStore.ready(),
    hasUser: !!authStore.user(),
    hasToken: !!authStore.token()
  };
  
  console.log('[AuthGuard] 🔒 Current user state:', userState);

  // Check if user has seen splash - if not, show splash first
  if (!authStore.hasSeenSplash()) {
    console.log('[AuthGuard] 🎆 CONDITION 1: User has not seen splash');
    console.log('[AuthGuard] ➡️ REDIRECT: Navigating to /splash (first-time user)');
    router.navigate(['/splash']);
    return false;
  }
  
  console.log('[AuthGuard] ✅ CONDITION 1 PASSED: User has seen splash');

  // Allow access if user is authenticated (includes real users and explicit guests)
  if (authStore.isAuthenticated()) {
    console.log('[AuthGuard] ✅ CONDITION 2 PASSED: User is authenticated');
    const user = authStore.user();
    
    // Real users (not anonymous) - always allow
    if (user && !user.isAnonymous) {
      console.log('[AuthGuard] 👤 CONDITION 3A: Registered user (non-anonymous)');
      console.log('[AuthGuard] ✅ ACCESS GRANTED: Allowing access to:', state.url);
      return true;
    }
    
    // Anonymous users who explicitly chose to be guests - allow
    if (user && user.isAnonymous && authStore.isExplicitGuest()) {
      console.log('[AuthGuard] 👻 CONDITION 3B: Anonymous user who is explicit guest');
      console.log('[AuthGuard] ✅ ACCESS GRANTED: Allowing guest access to:', state.url);
      return true;
    }
    
    // Anonymous users who didn't explicitly choose guest - redirect to splash
    if (user && user.isAnonymous && !authStore.isExplicitGuest()) {
      console.log('[AuthGuard] ⚠️ CONDITION 3C: Anonymous user but NOT explicit guest');
      console.log('[AuthGuard] ➡️ REDIRECT: Anonymous user needs to choose auth method, redirecting to /splash');
      router.navigate(['/splash']);
      return false;
    }
    
    console.log('[AuthGuard] 🤔 EDGE CASE: Authenticated but no valid user object');
  } else {
    console.log('[AuthGuard] ⚠️ CONDITION 2 FAILED: User is NOT authenticated');
  }

  // Not authenticated at all - redirect to splash (they've seen it but need to choose auth method)
  console.log('[AuthGuard] ❌ FINAL CONDITION: User not authenticated or no valid state');
  console.log('[AuthGuard] ➡️ REDIRECT: Redirecting to /splash for authentication');
  
  // Add extra debugging for unexpected states
  if (authStore.ready()) {
    console.log('[AuthGuard] 🚨 DEBUG: Auth is ready but user still not authenticated - potential auth state corruption');
  } else {
    console.log('[AuthGuard] ⏳ DEBUG: Auth not yet ready - this might be expected during initial load');
  }
  
  router.navigate(['/splash']);
  return false;
};
