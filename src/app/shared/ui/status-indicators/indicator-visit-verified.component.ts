import { Component, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-indicator-visit-verified',
  imports: [IconComponent],
  template: `
    <div class="verified-indicator" [title]="title()" [attr.aria-label]="title()">
      <app-icon name="check_circle" size="xl" [filled]="true" class="verified-icon" />
    </div>
  `,
  styles: `
    .verified-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: help;
    }

    .verified-icon {
      color: var(--success);
      opacity: 0.85;
      transition: opacity 0.15s ease;
    }

    .verified-indicator:hover .verified-icon {
      opacity: 1;
    }

    @media (prefers-reduced-motion: reduce) {
      .verified-icon {
        transition: none;
      }
    }
  `,
})
export class IndicatorVisitVerifiedComponent {
  readonly title = input<string>('Verified visit with photo');
}
