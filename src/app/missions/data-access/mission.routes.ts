import { Routes } from '@angular/router';

export const MISSION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../feature/missions-page/missions-page.component').then(
        (m) => m.MissionsPageComponent
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('../feature/edit-mission-page/edit-mission-page.component').then(
        (m) => m.EditMissionPageComponent
      ),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('../feature/create-mission-page/create-mission-page.component').then(
        (m) => m.CreateMissionPageComponent
      ),
  },
];
