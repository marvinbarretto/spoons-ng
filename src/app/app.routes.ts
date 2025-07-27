import { Routes } from '@angular/router';
import { authGuard } from './auth/data-access/auth.guard';
import { adminGuard } from './auth/data-access/admin.guard';
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
    path: 'splash',
    title: 'Welcome to Spoonscount',
    loadComponent: () => import('./auth/feature/splash/splash.component').then(m => m.SplashComponent),
    data: { shell: 'fullscreen' }
  },
  {
    path: 'login',
    title: 'Login',
    loadComponent: () => import('./auth/feature/login/login.component').then(m => m.LoginComponent),
    data: { shell: 'fullscreen' }
  },
  {
    path: 'register',
    title: 'Join Spoonscount',
    loadComponent: () => import('./auth/feature/register/registration-flow.component').then(m => m.RegistrationFlowComponent),
    data: { shell: 'fullscreen' }
  },
  {
    path: 'home',
    canActivate: [authGuard],
    loadComponent: () => import('./home/feature/home/home.component').then(m => m.HomeComponent),
    data: { shell: 'dashboard', preload: true }
  },
  {
    path: 'pubs',
    title: 'Pubs',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./pubs/data-access/pub.routes').then((m) => m.PUBS_ROUTES),
    data: { shell: 'feature' }
  },
  {
    path: 'check-in/:pubId',
    title: 'Check In',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./check-in/feature/checkin/checkin.component').then(m => m.CheckinComponent),
    data: { shell: 'fullscreen' }
  },
  {
    path: 'simplified-checkin',
    title: 'Check In',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./check-in/feature/checkin/checkin.component').then(m => m.CheckinComponent),
    data: { shell: 'fullscreen' }
  },
  {
    path: 'old-check-in/:pubId',
    title: 'Legacy Check In',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./check-in/feature/check-in-page/check-in-page.component').then(m => m.CheckInPageComponent),
    data: { shell: 'fullscreen' }
  },
  {
    path: 'carpets',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./carpets/data-access/carpet.routes').then((m) => m.CARPETS_ROUTES),
    data: { shell: 'feature' }
  },

  {
    path: 'missions',
    title: 'Missions',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./missions/data-access/mission.routes').then((m) => m.MISSIONS_ROUTES),
    data: { shell: 'feature' }
  },
  {
    path: 'leaderboard',
    title: 'Leaderboard',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./leaderboard/data-access/leaderboard.routes').then((m) => m.LEADERBOARD_ROUTES),
    data: { shell: 'feature' }
  },
  // Admin Dashboard Hub
  {
    path: 'admin',
    title: 'Admin Dashboard',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./admin/feature/admin-dashboard/admin-dashboard.component')
        .then(m => m.AdminDashboardComponent),
    data: { shell: 'feature' }
  },
  // Admin Sub-sections
  {
    path: 'admin/badges',
    canActivate: [adminGuard],
    loadChildren: () =>
      import('./badges/data-access/badge.routes').then((m) => m.BADGE_ROUTES),
    data: { shell: 'feature' }
  },
  {
    path: 'admin/missions',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./missions/feature/mission-admin/mission-admin.component')
        .then(m => m.MissionsAdminComponent),
    data: { shell: 'feature' }
  },
  {
    path: 'admin/missions/new',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./missions/feature/mission-form/mission-form.component')
        .then(m => m.MissionFormComponent),
    data: { shell: 'feature' }
  },
  {
    path: 'admin/missions/:id/edit',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./missions/feature/mission-form/mission-form.component')
        .then(m => m.MissionFormComponent),
    data: { shell: 'feature' }
  },
  // Database metrics dashboard removed - was over-engineered
  {
    path: 'admin/feedback',
    title: 'Feedback Management',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./feedback/feature/feedback-admin/feedback-admin.component')
        .then(m => m.FeedbackAdminComponent),
    data: { shell: 'feature' }
  },
  {
    path: 'admin/checkins',
    title: 'Check-ins Management',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./admin/feature/admin-checkins/admin-checkins.component')
        .then(m => m.AdminCheckinsComponent),
    data: { shell: 'feature' }
  },
  {
    path: 'admin/users',
    title: 'User Management',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./admin/feature/users/users.component')
        .then(m => m.AdminUsersComponent),
    data: { shell: 'feature' }
  },
  {
    path: 'admin/users/:username',
    title: 'User Details',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./admin/feature/users/user-detail.component')
        .then(m => m.AdminUserDetailComponent),
    data: { shell: 'feature' }
  },
  {
    path: 'admin/carpets',
    title: 'Carpet Management',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./admin/feature/admin-carpet/admin-carpet.component')
        .then(m => m.AdminCarpetComponent),
    data: { shell: 'feature' }
  },
  {
    path: 'admin/errors',
    title: 'System Error Logs',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./admin/feature/admin-errors/admin-errors.component')
        .then(m => m.AdminErrorsComponent),
    data: { shell: 'feature' }
  },
  {
    path: 'dev/components',
    title: 'Component Showcase',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./dev/component-showcase/component-showcase.component')
        .then(m => m.ComponentShowcaseComponent),
    data: { shell: 'feature' }
  },
  {
    path: 'dev/experiments',
    title: 'Experiments',
    loadComponent: () =>
      import('./dev/experiments/experiments.component')
        .then(m => m.ExperimentsComponent),
    data: { shell: 'feature' }
  },
  {
    path: 'dev/background-carpet',
    title: 'Background Carpet Demo',
    loadComponent: () =>
      import('./dev/background-carpet/background-carpet-page.component')
        .then(m => m.BackgroundCarpetPageComponent),
    data: { shell: 'fullscreen' }
  },
  {
    path: 'profile',
    title: 'Profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./profile/feature/profile/profile.component')
        .then(m => m.ProfileComponent),
    data: { shell: 'feature' }
  },
  {
    path: 'share',
    redirectTo: '/profile',
    pathMatch: 'full'
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
