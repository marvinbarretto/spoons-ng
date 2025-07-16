import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../data-access/auth.store';

export const authGuard: CanActivateFn = (route, state) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  // Allow access if user is authenticated (includes real users and explicit guests)
  if (authStore.isAuthenticated()) {
    const user = authStore.user();
    
    // Real users (not anonymous) - always allow
    if (user && !user.isAnonymous) {
      return true;
    }
    
    // Anonymous users who explicitly chose to be guests - allow
    if (user && user.isAnonymous && authStore.isExplicitGuest()) {
      return true;
    }
    
    // Anonymous users who didn't explicitly choose guest - redirect to splash
    if (user && user.isAnonymous && !authStore.isExplicitGuest()) {
      router.navigate(['/splash']);
      return false;
    }
  }

  // Not authenticated at all - redirect to splash
  router.navigate(['/splash']);
  return false;
};
