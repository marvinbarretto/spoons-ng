import { Routes } from '@angular/router';
import { LeaderboardContainerComponent } from '../feature/leaderboard-container/leaderboard-container.component';

export const LEADERBOARD_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'points',
    pathMatch: 'full',
  },
  {
    path: 'points',
    component: LeaderboardContainerComponent,
    title: 'Points Leaderboard',
  },
  {
    path: 'pubs',
    component: LeaderboardContainerComponent,
    title: 'Pubs Leaderboard',
  },
];
