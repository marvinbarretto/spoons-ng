import { Routes } from '@angular/router';
import { HomeComponent } from './home/feature/home/home.component';
import {
  UrlSegment,
  Route,
  UrlSegmentGroup,
  UrlMatchResult,
} from '@angular/router';
import { CheckInContainerComponent } from './check-in/feature/check-in-container/check-in-container.component';
import { MISSIONS_ROUTES } from './missions/data-access/mission.routes';
import { BADGE_ROUTES } from './badges/data-access/badge.routes';
import { LeaderboardContainerComponent } from './leaderboard/feature/leaderboard-container/leaderboard-container.component';
import { ShareContainerComponent } from './share/feature/share-container/share-container.component';
import { NewHomeComponent } from './home/feature/new-home/new-home.component';

export const appRoutes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'new',
    component: NewHomeComponent,
  },
  {
    path: 'pubs',
    title: 'Pubs',
    loadChildren: () =>
      import('./pubs/data-access/pub.routes').then((m) => m.PUBS_ROUTES),
  },
  {
    path: 'missions',
    title: 'Missions',
    loadChildren: () =>
      import('./missions/data-access/mission.routes').then((m) => m.MISSIONS_ROUTES),
  },
// app.routes.ts
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
    path: 'share',
    component: ShareContainerComponent,
  },
  {
    path: 'check-in',
    component: CheckInContainerComponent,
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
