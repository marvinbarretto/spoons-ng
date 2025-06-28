import { Routes } from '@angular/router';

export const checkInRoutes: Routes = [
  {
    path: 'check-in/:pubId',
    loadComponent: () => import('./feature/check-in-page/check-in-page.component').then(m => m.CheckInPageComponent),
    title: 'Check In'
  }
];