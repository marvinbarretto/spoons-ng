import { Routes } from '@angular/router';
import { onboardingGuard } from './shared/guards/onboarding.guard';
import {
  UrlSegment,
  Route,
  UrlSegmentGroup,
  UrlMatchResult,
} from '@angular/router';


export const appRoutes: Routes = [
  {
    path: '',
    redirectTo: '/home',
    pathMatch: 'full'
  },
  {
    path: 'onboarding',
    title: 'Welcome to Spoonscount',
    loadComponent: () => import('./onboarding/feature/onboarding/onboarding.component').then(m => m.OnboardingComponent),
    data: { shell: 'fullscreen' }
  },
  {
    path: 'home',
    canLoad: [onboardingGuard],
    canActivate: [onboardingGuard],
    loadComponent: () => import('./home/feature/home/home.component').then(m => m.HomeComponent),
    data: { shell: 'dashboard', preload: true }
  },
  {
    path: 'pubs',
    title: 'Pubs',
    canActivate: [onboardingGuard],
    loadChildren: () =>
      import('./pubs/data-access/pub.routes').then((m) => m.PUBS_ROUTES),
    data: { shell: 'feature' }
  },
  {
    path: 'check-in/:pubId',
    title: 'Check In',
    canActivate: [onboardingGuard],
    loadComponent: () =>
      import('./check-in/feature/check-in-page/check-in-page.component').then(m => m.CheckInPageComponent),
    data: { shell: 'fullscreen' }
  },
  {
    path: 'carpets',
    canActivate: [onboardingGuard],
    loadChildren: () =>
      import('./carpets/data-access/carpet.routes').then((m) => m.CARPETS_ROUTES),
    data: { shell: 'feature' }
  },

  {
    path: 'missions',
    title: 'Missions',
    canActivate: [onboardingGuard],
    loadChildren: () =>
      import('./missions/data-access/mission.routes').then((m) => m.MISSIONS_ROUTES),
    data: { shell: 'feature' }
  },
  {
    path: 'leaderboard',
    title: 'Leaderboard',
    canActivate: [onboardingGuard],
    loadChildren: () =>
      import('./leaderboard/data-access/leaderboard.routes').then((m) => m.LEADERBOARD_ROUTES),
    data: { shell: 'feature' }
  },
  // Admin Dashboard Hub
  {
    path: 'admin',
    title: 'Admin Dashboard',
    loadComponent: () =>
      import('./admin/feature/admin-dashboard/admin-dashboard.component')
        .then(m => m.AdminDashboardComponent),
    data: { shell: 'feature' }
  },
  // Admin Sub-sections
  {
    path: 'admin/badges',
    loadChildren: () =>
      import('./badges/data-access/badge.routes').then((m) => m.BADGE_ROUTES),
    data: { shell: 'feature' }
  },
  {
    path: 'admin/missions',
    loadComponent: () =>
      import('./missions/feature/mission-admin/mission-admin.component')
        .then(m => m.MissionsAdminComponent),
    data: { shell: 'feature' }
  },
  {
    path: 'admin/missions/new',
    loadComponent: () =>
      import('./missions/feature/mission-form/mission-form.component')
        .then(m => m.MissionFormComponent),
    data: { shell: 'feature' }
  },
  {
    path: 'admin/missions/:id/edit',
    loadComponent: () =>
      import('./missions/feature/mission-form/mission-form.component')
        .then(m => m.MissionFormComponent),
    data: { shell: 'feature' }
  },
  {
    path: 'admin/metrics',
    title: 'Database Metrics',
    loadComponent: () =>
      import('./shared/ui/database-metrics-dashboard/database-metrics-dashboard.component')
        .then(m => m.DatabaseMetricsDashboardComponent),
    data: { shell: 'feature' }
  },
  {
    path: 'admin/feedback',
    title: 'Feedback Management',
    loadComponent: () =>
      import('./feedback/feature/feedback-admin/feedback-admin.component')
        .then(m => m.FeedbackAdminComponent),
    data: { shell: 'feature' }
  },
  {
    path: 'share',
    loadComponent: () =>
      import('./share/feature/share-container/share-container.component')
        .then(m => m.ShareContainerComponent),
    data: { shell: 'feature' }
  },
  {
    path: '**',
    redirectTo: '/',
  },
];

// Custom matcher to handle multi-segment routes
export function multiSegmentMatcher(
  segments: UrlSegment[],
  group: UrlSegmentGroup,
  route: Route
): UrlMatchResult | null {
  const slug = segments.map((s) => s.path).join('/'); // Join all segments into a single slug

  // If there are segments, return the combined slug
  if (segments.length) {
    return {
      consumed: segments, // All segments are consumed as part of this route
      posParams: { slug: new UrlSegment(slug, {}) }, // Return the combined slug
    };
  }

  return null; // No match if there are no segments
}
