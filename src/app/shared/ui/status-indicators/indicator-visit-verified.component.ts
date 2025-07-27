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
      filter: drop-shadow(0 2px 4px rgba(72, 187, 120, 0.3));
      animation: verified-celebration 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @keyframes verified-celebration {
      0% {
        transform: scale(0.8);
        opacity: 0.8;
      }
      50% {
        transform: scale(1.1);
        opacity: 1;
      }
      100% {
        transform: scale(1);
        opacity: 1;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .verified-icon {
        animation: none;
      }
    }
  `,
})
export class IndicatorVisitVerifiedComponent {
  readonly title = input<string>('Verified visit with photo');
}
