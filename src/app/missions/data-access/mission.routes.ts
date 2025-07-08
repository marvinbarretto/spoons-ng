import { Routes } from '@angular/router';

export const MISSIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../feature/mission-list/mission-list.component').then(
        (m) => m.MissionListComponent
      ),
  },
  {
    path: ':missionId',
    loadComponent: () =>
      import('../feature/mission-detail/mission-detail.component').then(
        (m) => m.MissionDetailComponent
      ),
  },
];
