// src/app/pubs/pubs.routes.ts
import { Routes } from '@angular/router';

export const PUBS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../feature/pub-list/pub-list.component').then(
        (m) => m.PubListComponent
      ),
  },
  {
    path: ':pubId',
    loadComponent: () =>
      import('../feature/pub-detail/pub-detail.component').then(
        (m) => m.PubDetailComponent
      ),
  },
];
