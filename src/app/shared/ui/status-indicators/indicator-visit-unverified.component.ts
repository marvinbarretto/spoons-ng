import { Component, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-indicator-visit-unverified',
  imports: [IconComponent],
  template: `
    <div class="unverified-indicator" [title]="title()" [attr.aria-label]="title()">
      <app-icon name="check_circle" size="xl" [filled]="false" class="unverified-icon" />
    </div>
  `,
  styles: `
    .unverified-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: help;
    }

    .unverified-icon {
      color: var(--success);
      opacity: 0.65;
      transition: opacity 0.15s ease;
    }

    .unverified-indicator:hover .unverified-icon {
      opacity: 0.85;
    }

    @media (prefers-reduced-motion: reduce) {
      .unverified-icon {
        transition: none;
      }
    }
  `,
})
export class IndicatorVisitUnverifiedComponent {
  readonly title = input<string>('Manually added visit');
}
