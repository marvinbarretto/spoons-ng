// src/app/pubs/pubs.routes.ts
import { Routes } from '@angular/router';

export const PUBS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../feature/pubs-list/pubs-list.component').then(
        (m) => m.PubListComponent
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('../feature/pub-detail/pub-detail.component').then(
        (m) => m.PubDetailComponent
      ),
  },
];
