import { Routes } from '@angular/router';
import { LeaderboardContainerComponent } from '../feature/leaderboard-container/leaderboard-container.component';

export const LEADERBOARD_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'all-time',
    pathMatch: 'full'
  },
  {
    path: 'all-time',
    component: LeaderboardContainerComponent,
    data: { period: 'all-time' },
    title: 'All Time Leaderboard'
  },
  {
    path: 'this-month',
    component: LeaderboardContainerComponent,
    data: { period: 'this-month' },
    title: 'This Month Leaderboard'
  },
  {
    path: 'this-week',
    component: LeaderboardContainerComponent,
    data: { period: 'this-week' },
    title: 'This Week Leaderboard'
  }
];