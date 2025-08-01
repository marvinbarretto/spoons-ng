import { Routes } from '@angular/router';
import { LeaderboardContainerComponent } from '../feature/leaderboard-container/leaderboard-container.component';

export const LEADERBOARD_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'global',
    pathMatch: 'full',
  },
  {
    path: 'friends',
    component: LeaderboardContainerComponent,
    title: 'Friends Leaderboard',
  },
  {
    path: 'global',
    component: LeaderboardContainerComponent,
    title: 'Global Leaderboard',
  },
  {
    path: 'regional',
    component: LeaderboardContainerComponent,
    title: 'Regional Leaderboard',
  },
];
