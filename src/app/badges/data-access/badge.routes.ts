import { Routes } from '@angular/router';
import { BadgeAdminPageComponent } from '../feature/badge-admin-page/badge-admin-page.component';

export const BADGE_ROUTES: Routes = [
  {
    path: '',
    title: 'All Badges',
    component: BadgeAdminPageComponent,
  }
];
