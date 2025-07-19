import { Routes } from '@angular/router';
import { LeaderboardContainerComponent } from '../feature/leaderboard-container/leaderboard-container.component';

export const LEADERBOARD_ROUTES: Routes = [
  {
    path: '',
    component: LeaderboardContainerComponent,
    title: 'Leaderboard'
  }
];
