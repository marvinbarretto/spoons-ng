import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventModel } from '../../utils/event.model';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-event-list-item',
  imports: [CommonModule, RouterModule],
  styleUrl: './event-list-item.component.scss',
  template: `
    <li>
      <a
        [ngClass]="{ 'event-list__item--promo': event.featured }"
        class="event-list__item"
        routerLink="/events/{{ event.slug }}"
      >
        <h3>{{ event.title }}</h3>
        <small>{{ event.date | date : 'longDate' }} ({{ event.date }})</small>
      </a>
    </li>
  `,
})
export class EventListItemComponent {
  @Input() event!: EventModel;
  @Output() clicked = new EventEmitter<void>();
}
