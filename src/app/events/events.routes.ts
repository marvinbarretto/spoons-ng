import { Routes } from '@angular/router';
import { EventStatus } from './utils/event.model';
import { authGuard } from '../auth/data-access/auth.guard';

export const EVENTS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'upcoming',
    pathMatch: 'full',
  },
  {
    path: 'upcoming',
    data: { filterStatus: EventStatus.UPCOMING },
    loadComponent: () =>
      import(
        './feature/event-list-container/event-list-container.component'
      ).then((m) => m.EventListContainerComponent),
  },
  {
    path: 'archived',
    data: { filterStatus: EventStatus.ARCHIVED },
    loadComponent: () =>
      import(
        './feature/event-list-container/event-list-container.component'
      ).then((m) => m.EventListContainerComponent),
  },
  {
    path: 'review',
    canActivate: [authGuard],
    data: { filterStatus: EventStatus.PENDING },
    loadComponent: () =>
      import(
        './feature/event-list-container/event-list-container.component'
      ).then((m) => m.EventListContainerComponent),
  },
  {
    path: 'new',
    canActivate: [authGuard],
    loadComponent: () =>
      import(
        './feature/create-event-container/create-event-container.component'
      ).then((m) => m.CreateEventContainerComponent),
  },
  {
    path: ':slug',
    loadComponent: () =>
      import(
        './feature/event-detail-container/event-detail-container.component'
      ).then((m) => m.EventDetailContainerComponent),
  },
  {
    path: '**',
    redirectTo: 'upcoming',
  },
];
