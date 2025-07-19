import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from './auth.store';
import { UserStore } from '../../users/data-access/user.store';

export const adminGuard: CanActivateFn = async (route, state) => {
  const authStore = inject(AuthStore);
  const userStore = inject(UserStore);
  const router = inject(Router);

  // Wait for auth to be ready
  if (!authStore.ready()) {
    await authStore.waitForAuthReady();
  }

  // Check if user is authenticated
  if (!authStore.isAuthenticated()) {
    console.log('[AdminGuard] User not authenticated, redirecting to splash');
    router.navigate(['/splash']);
    return false;
  }

  // Wait for user data to be loaded
  let attempts = 0;
  const maxAttempts = 30; // 3 seconds max
  while (!userStore.currentUser() && !userStore.loading() && attempts < maxAttempts) {
    console.log('[AdminGuard] Waiting for user data to load...');
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }

  const currentUser = userStore.currentUser();
  
  // Check if user has admin privileges
  if (!currentUser?.isAdmin) {
    console.log('[AdminGuard] User lacks admin privileges, redirecting to home', {
      hasUser: !!currentUser,
      uid: currentUser?.uid?.slice(0, 8),
      isAdmin: currentUser?.isAdmin
    });
    router.navigate(['/']);
    return false;
  }

  console.log('[AdminGuard] Admin access granted', {
    uid: currentUser.uid.slice(0, 8),
    isAdmin: currentUser.isAdmin
  });
  return true;
};