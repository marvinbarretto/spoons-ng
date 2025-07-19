import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../data-access/auth.store';

export const authGuard: CanActivateFn = async (route, state) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  // Wait for auth to be ready
  if (!authStore.ready()) {
    await authStore.waitForAuthReady();
  }

  // If authenticated (any user with token), allow access
  if (authStore.isAuthenticated()) {
    return true;
  }

  // Not authenticated - go to splash
  router.navigate(['/splash']);
  return false;
};
