// src/app/carpets/carpets.routes.ts
import type { Routes } from '@angular/router';

export const CARPETS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'detector',
    pathMatch: 'full'
  },
  {
    path: 'detector',
    loadComponent: () => import('../feature/carpet-detector/carpet-detector.component')
      .then(c => c.CarpetDetectorComponent),
    title: 'Carpet Detector'
  },
  {
    path: 'capture',
    loadComponent: () => import('../feature/reference-capture/reference-capture.component')
      .then(c => c.ReferenceCaptureComponent),
    title: 'Capture Reference'
  }
];
