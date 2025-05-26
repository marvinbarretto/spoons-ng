import { CommonModule } from '@angular/common';
import { Component, computed, effect, OnInit, signal } from '@angular/core';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthStore } from '../../../auth/data-access/auth.store';
import { EventModel, EventStatus } from '../../utils/event.model';
import { EventService } from '../../data-access/event.service';
import { EventListItemComponent } from '../../ui/event-list-item/event-list-item.component';
import { PaginationService } from '../../../shared/data-access/pagination.service';
import { PaginationComponent } from '../../../shared/ui/pagination/pagination.component';
import { EventsNavComponent } from '../../ui/events-nav/events-nav.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { NotificationService } from '../../../shared/data-access/notification.service';

@Component({
  selector: 'app-event-list-container',
  imports: [
    CommonModule,
    RouterModule,
    EventListItemComponent,
    PaginationComponent,
    EventsNavComponent,
  ],
  templateUrl: './event-list-container.component.html',
  styleUrl: './event-list-container.component.scss',
})
export class EventListContainerComponent implements OnInit {
  private readonly authStore = inject(AuthStore);
  private readonly eventService = inject(EventService);
  private readonly paginationService = inject(PaginationService);
  private readonly route = inject(ActivatedRoute);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  readonly filterStatus$$ = toSignal(
    this.route.data.pipe(map((data) => data['filterStatus'] as EventStatus))
  );

  // State
  private readonly allEvents$$ = signal<EventModel[]>([]);
  readonly currentPage$$ = signal(1);
  readonly error$$ = signal<string | null>(null);
  readonly pageSize = 10;

  // Permissions
  readonly canCreateEvent = this.authStore.canCreateEvent$$;
  readonly canReviewEvents = this.authStore.canReviewEvents$$;

  readonly filteredEvents = computed(() => {
    const status = this.filterStatus$$();
    if (!status) return [];

    const validStatuses = Object.values(EventStatus);
    if (!validStatuses.includes(status)) {
      this.notificationService.error('Invalid filter status');
      this.router.navigate(['/events/upcoming']);
    }

    const now = new Date();
    const events = this.canReviewEvents()
      ? this.allEvents$$()
      : this.allEvents$$().filter(
          (e) => e.eventStatus === EventStatus.APPROVED
        );

    return events
      .filter((e) => {
        switch (status) {
          case EventStatus.UPCOMING:
            return new Date(e.date) > now;
          case EventStatus.PAST:
            return new Date(e.date) <= now;
          case EventStatus.PENDING:
            return e.eventStatus === EventStatus.PENDING;
          case EventStatus.ARCHIVED:
            return e.eventStatus === EventStatus.ARCHIVED;
          default:
            return false;
        }
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  });

  readonly totalPages = computed(() =>
    this.paginationService.getTotalPages(
      this.filteredEvents().length,
      this.pageSize
    )
  );

  readonly paginatedEvents = computed(() =>
    this.paginationService.paginate(
      this.filteredEvents(),
      this.currentPage$$(),
      this.pageSize
    )
  );

  readonly nextEvent = computed(
    () =>
      this.filteredEvents().find((e) => new Date(e.date) > new Date()) ?? null
  );

  constructor() {
    effect(() => {
      this.filterStatus$$();
      this.currentPage$$.set(1);
      console.log('[Pagination] Reset due to route change');
    });
  }

  ngOnInit(): void {
    this.eventService.getEvents().subscribe({
      next: (events) => this.allEvents$$.set(events),
      error: () =>
        this.error$$.set('Unable to load events. Please try again later.'),
    });
  }

  onPageChange(page: number): void {
    this.currentPage$$.set(page);
  }

  onItemClicked(event: EventModel): void {
    console.log('Clicked', event.title);
  }

  trackByEventId(index: number, event: EventModel): number {
    return event.id;
  }

  readonly EventStatus = EventStatus; // for template use
}
