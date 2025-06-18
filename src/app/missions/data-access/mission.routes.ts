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
    path: 'admin',
    loadComponent: () =>
      import('../feature/mission-admin/mission-admin.component').then(
        (m) => m.MissionAdminComponent
      ),
  },

];
