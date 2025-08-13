// src/app/pubs/pubs.routes.ts
import { Routes } from '@angular/router';

export const PUBS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../feature/improved-pub-list/improved-pub-list.component').then(m => m.ImprovedPubListComponent),
  },
  {
    path: ':pubId',
    loadComponent: () =>
      import('../feature/pub-detail/pub-detail.component').then(m => m.PubDetailComponent),
  },
];
