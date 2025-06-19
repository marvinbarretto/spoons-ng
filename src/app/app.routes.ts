import { Routes } from '@angular/router';
import { HomeComponent } from './home/feature/home/home.component';
import {
  UrlSegment,
  Route,
  UrlSegmentGroup,
  UrlMatchResult,
} from '@angular/router';


export const appRoutes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'pubs',
    title: 'Pubs',
    loadChildren: () =>
      import('./pubs/data-access/pub.routes').then((m) => m.PUBS_ROUTES),
  },
  {
    // debug carpet camera
    path: 'debug-carpet-camera',
    loadComponent: () =>
      import('./check-in/feature/debug-carpet-camera/debug-carpet-camera.component')
        .then(m => m.EnhancedDebugCarpetCameraComponent)
  },

  {
    path: 'missions',
    title: 'Missions',
    loadChildren: () =>
      import('./missions/data-access/mission.routes').then((m) => m.MISSIONS_ROUTES),
  },
  {
    path: 'leaderboard',
    loadComponent: () =>
      import('./leaderboard/feature/leaderboard-container/leaderboard-container.component')
        .then(m => m.LeaderboardContainerComponent)
  },
  {
    path: 'admin/badges',
    loadChildren: () =>
      import('./badges/data-access/badge.routes').then((m) => m.BADGE_ROUTES),
  },
  {
    path: 'admin/missions',
    loadComponent: () =>
      import('./missions/feature/mission-admin/mission-admin.component')
        .then(m => m.MissionsAdminComponent)
  },
  {
    path: 'admin/missions/new',
    loadComponent: () =>
      import('./missions/feature/mission-form/mission-form.component')
        .then(m => m.MissionFormComponent)
  },
  {
    path: 'admin/missions/:id/edit',
    loadComponent: () =>
      import('./missions/feature/mission-form/mission-form.component')
        .then(m => m.MissionFormComponent)
  },
  {
    path: 'share',
    loadComponent: () =>
      import('./share/feature/share-container/share-container.component')
        .then(m => m.ShareContainerComponent)
  },
  {
    path: 'check-in',
    loadComponent: () =>
      import('./check-in/feature/check-in-container/check-in-container.component')
        .then(m => m.CheckInContainerComponent)
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
