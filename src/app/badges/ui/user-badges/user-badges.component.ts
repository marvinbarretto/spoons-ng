import { Component, Input, Signal } from '@angular/core';
import { NgForOf, NgIf } from '@angular/common';
import type { Badge } from '../../utils/badge.model';

@Component({
  selector: 'app-user-badges',
  standalone: true,
  imports: [NgIf],
  template: `
    <section *ngIf="badges().length > 0">
      <h2>Unlocked Badges</h2>
      <ul class="badge-list">
        @for (badge of badges(); track badge.id) {
          <li>
            <img *ngIf="badge.iconUrl" [src]="badge.iconUrl" width="48" height="48" [alt]="badge.name" />
            <div>{{ badge.name }}</div>
          </li>
        }
      </ul>
    </section>
  `,
  styles: [`
    .badge-list {
      display: flex;
      gap: 1rem;
      list-style: none;
      padding: 0;
    }

    li {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    img {
      border-radius: 50%;
      background: var(--color-backgroundLightest);
    }
  `]
})
export class UserBadgesComponent {
  // TODO: old syntax
  @Input() badges!: Signal<Badge[]>;
}
