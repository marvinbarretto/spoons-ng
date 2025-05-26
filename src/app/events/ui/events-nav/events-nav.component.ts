import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { inject } from '@angular/core';
import { AuthStore } from '../../../auth/data-access/auth.store';

@Component({
  selector: 'app-events-nav',
  imports: [CommonModule, RouterModule],
  templateUrl: './events-nav.component.html',
  styleUrl: './events-nav.component.scss',
})
export class EventsNavComponent {
  private readonly authStore = inject(AuthStore);

  readonly links = computed(() => {
    const baseLinks = [{ label: 'Archived', url: '/events/archived' }];

    if (this.authStore.canCreateEvent$$()) {
      baseLinks.push({ label: 'Create new event', url: '/events/new' });
    }

    if (this.authStore.canReviewEvents$$()) {
      baseLinks.push({ label: 'Review pending events', url: '/events/review' });
    }

    return baseLinks;
  });
}
