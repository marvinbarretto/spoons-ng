// badges/ui/badge.component.ts
import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Badge } from '../../utils/badge.model';

@Component({
  selector: 'app-badge',
  imports: [CommonModule],
  template: `
    <div class="badge" [class]="badgeClass()">
      <div class="badge-icon">
        @if (badge().emoji) {
          <span class="badge-emoji">{{ badge().emoji }}</span>
        } @else if (badge().iconUrl) {
          <img [src]="badge().iconUrl" [alt]="badge().name" class="badge-image">
        } @else if (badge().icon) {
          <i [class]="badge().icon" class="badge-icon-font"></i>
        } @else {
          <span class="badge-emoji">🏆</span>
        }
      </div>

      @if (showName()) {
        <div class="badge-content">
          <h3 class="badge-name">{{ badge().name }}</h3>
          @if (showDescription()) {
            <p class="badge-description">{{ badge().description }}</p>
          }
          @if (showCategory()) {
            <span class="badge-category">{{ badge().category }}</span>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .badge {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      border-radius: 0.5rem;
      border: 1px solid #e5e7eb;
      background: white;
      transition: all 0.2s ease;
    }

    .badge:hover {
      border-color: #d1d5db;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .badge--small {
      padding: 0.5rem;
      gap: 0.5rem;
    }

    .badge--large {
      padding: 1rem;
      gap: 1rem;
    }

    .badge--icon-only {
      justify-content: center;
      width: 3rem;
      height: 3rem;
      padding: 0.75rem;
    }

    .badge-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 2rem;
      min-height: 2rem;
    }

    .badge-emoji {
      font-size: 1.5rem;
      line-height: 1;
    }

    .badge--small .badge-emoji {
      font-size: 1.25rem;
    }

    .badge--large .badge-emoji {
      font-size: 2rem;
    }

    .badge-image {
      width: 2rem;
      height: 2rem;
      border-radius: 0.25rem;
      object-fit: cover;
    }

    .badge--small .badge-image {
      width: 1.5rem;
      height: 1.5rem;
    }

    .badge--large .badge-image {
      width: 2.5rem;
      height: 2.5rem;
    }

    .badge-icon-font {
      font-size: 1.5rem;
      color: #6b7280;
    }

    .badge-content {
      flex: 1;
      min-width: 0;
    }

    .badge-name {
      margin: 0;
      font-size: 0.875rem;
      font-weight: 600;
      color: #111827;
      line-height: 1.25;
    }

    .badge--large .badge-name {
      font-size: 1rem;
    }

    .badge-description {
      margin: 0.25rem 0 0 0;
      font-size: 0.75rem;
      color: #6b7280;
      line-height: 1.33;
    }

    .badge--large .badge-description {
      font-size: 0.875rem;
    }

    .badge-category {
      display: inline-block;
      margin-top: 0.5rem;
      padding: 0.125rem 0.5rem;
      font-size: 0.625rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6b7280;
      background: #f3f4f6;
      border-radius: 9999px;
    }
  `]
})
export class BadgeComponent {
  // Required inputs
  readonly badge = input.required<Badge>();

  // Optional display options
  readonly size = input<'small' | 'medium' | 'large'>('medium');
  readonly showName = input<boolean>(true);
  readonly showDescription = input<boolean>(true);
  readonly showCategory = input<boolean>(false);

  // Computed class for styling
  protected readonly badgeClass = () => {
    const classes = [];

    if (this.size() !== 'medium') {
      classes.push(`badge--${this.size()}`);
    }

    if (!this.showName()) {
      classes.push('badge--icon-only');
    }

    return classes.join(' ');
  };
}
