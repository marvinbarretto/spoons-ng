import { Routes } from '@angular/router';
import { LeaderboardContainerComponent } from '../feature/leaderboard-container/leaderboard-container.component';

export const LEADERBOARD_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'global/this-month',
    pathMatch: 'full'
  },
  // Global leaderboard routes
  {
    path: 'global/all-time',
    component: LeaderboardContainerComponent,
    data: { period: 'all-time', geographic: 'global' },
    title: 'Global All Time Leaderboard'
  },
  {
    path: 'global/this-month',
    component: LeaderboardContainerComponent,
    data: { period: 'this-month', geographic: 'global' },
    title: 'Global This Month Leaderboard'
  },
  // City-specific leaderboard routes
  {
    path: 'city/:cityName/all-time',
    component: LeaderboardContainerComponent,
    data: { period: 'all-time', geographic: 'city' },
    title: 'City All Time Leaderboard'
  },
  {
    path: 'city/:cityName/this-month',
    component: LeaderboardContainerComponent,
    data: { period: 'this-month', geographic: 'city' },
    title: 'City This Month Leaderboard'
  },
  // Region-specific leaderboard routes
  {
    path: 'region/:regionName/all-time',
    component: LeaderboardContainerComponent,
    data: { period: 'all-time', geographic: 'region' },
    title: 'Region All Time Leaderboard'
  },
  {
    path: 'region/:regionName/this-month',
    component: LeaderboardContainerComponent,
    data: { period: 'this-month', geographic: 'region' },
    title: 'Region This Month Leaderboard'
  },
  // Legacy redirects for backward compatibility
  {
    path: 'all-time',
    redirectTo: 'global/all-time',
    pathMatch: 'full'
  },
  {
    path: 'this-month',
    redirectTo: 'global/this-month',
    pathMatch: 'full'
  },
];