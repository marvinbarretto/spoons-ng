import { Routes } from '@angular/router';
import { NewLeaderboardContainerComponent } from '../feature/new-leaderboard-container/new-leaderboard-container.component';

export const NEW_LEADERBOARD_ROUTES: Routes = [
  {
    path: '',
    component: NewLeaderboardContainerComponent,
    title: 'New Leaderboard'
  }
];