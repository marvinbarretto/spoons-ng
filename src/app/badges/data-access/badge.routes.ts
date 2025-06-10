import { Routes } from '@angular/router';
import { BadgeAdminComponent } from '../feature/badge-admin/badge-admin.component';

export const BADGE_ROUTES: Routes = [
  {
    path: '',
    title: 'All Badges',
    component: BadgeAdminComponent,
  }
];
