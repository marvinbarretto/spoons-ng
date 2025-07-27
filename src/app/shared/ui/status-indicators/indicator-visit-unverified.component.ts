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
      color: #333; // var(--info);
      opacity: 0.8;
      filter: drop-shadow(0 1px 2px rgba(59, 130, 246, 0.2));
      animation: unverified-fade-in 0.4s ease-in-out;
    }

    @keyframes unverified-fade-in {
      0% {
        opacity: 0;
        transform: scale(0.9);
      }
      100% {
        opacity: 0.8;
        transform: scale(1);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .unverified-icon {
        animation: none;
      }
    }
  `,
})
export class IndicatorVisitUnverifiedComponent {
  readonly title = input<string>('Manually added visit');
}
