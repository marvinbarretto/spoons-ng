import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

export const pageGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const slug = route.params['slug'];

  // TODO: Get these from a service / source
  const staticRoutes = ['login', 'register', 'site-map', 'events'];

  // Check for conflict with static routes
  if (staticRoutes.includes(slug)) {
    console.warn(`Conflict with static route: ${slug}`);
    router.navigate(['/']); // TODO: Redirect to custom error page
    return false;
  }

  // If no conflict, allow navigation
  return true;
};
