// src/app/carpets/carpets.routes.ts
import type { Routes } from '@angular/router';

export const CARPETS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'detector',
    pathMatch: 'full',
  },
];
