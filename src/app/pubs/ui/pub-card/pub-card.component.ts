// src/app/pubs/ui/pub-card/pub-card.component.ts
import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../environments/environment';
import type { Pub } from '../../utils/pub.models';

@Component({
  selector: 'app-pub-card',
  imports: [CommonModule],
  template: `
    <div class="pub-card" (click)="onPubClicked()">
      <header class="pub-card__header">
        <h3 class="pub-card__title">{{ pub().name }}</h3>

        @if (hasCheckedIn()) {
          <span class="pub-card__badge pub-card__badge--success">✅ Visited</span>
        } @else if (canCheckIn()) {
          <span class="pub-card__badge pub-card__badge--info">📍 Can check in</span>
        }
      </header>

      <div class="pub-card__content">
        <p class="pub-card__address">{{ pub().address }}</p>

        @if (locationText()) {
          <p class="pub-card__location">{{ locationText() }}</p>
        }

        @if (distanceText()) {
          <p class="pub-card__distance">{{ distanceText() }}</p>
        }

        @if (showCheckinCount() && checkinCount() > 0) {
          <p class="pub-card__checkins">
            {{ checkinCount() }} check-in{{ checkinCount() !== 1 ? 's' : '' }}
          </p>
        }
      </div>

      <!-- Debug info during development -->
      @if (isDevelopment()) {
        <details class="pub-card__debug">
          <summary>🔧 Debug Info</summary>
          <pre>{{ debugInfo() | json }}</pre>
        </details>
      }
    </div>
  `,
  styles: `
    .pub-card {
      display: block;
      padding: 1rem;
      background: var(--color-surface, #ffffff);
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
    }

    .pub-card:hover {
      border-color: var(--color-primary, #3b82f6);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      transform: translateY(-1px);
    }

    .pub-card:active {
      transform: translateY(0);
    }

    .pub-card__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }

    .pub-card__title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text, #111827);
      margin: 0;
      line-height: 1.3;
      flex: 1;
    }

    .pub-card__badge {
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .pub-card__badge--success {
      background: var(--color-success-subtle, #dcfce7);
      color: var(--color-success, #16a34a);
    }

    .pub-card__badge--info {
      background: var(--color-info-subtle, #dbeafe);
      color: var(--color-info, #2563eb);
    }

    .pub-card__content {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .pub-card__address {
      font-size: 0.875rem;
      color: var(--color-text-secondary, #6b7280);
      margin: 0;
      line-height: 1.4;
    }

    .pub-card__location {
      font-size: 0.875rem;
      color: var(--color-text-secondary, #6b7280);
      margin: 0;
      font-style: italic;
    }

    .pub-card__distance {
      font-size: 0.75rem;
      color: var(--color-text-secondary, #6b7280);
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .pub-card__checkins {
      font-size: 0.75rem;
      color: var(--color-text-secondary, #6b7280);
      margin: 0;
    }

    .pub-card__debug {
      margin-top: 0.75rem;
      padding: 0.5rem;
      background: var(--color-background, #f9fafb);
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: 4px;
      font-size: 0.75rem;
    }

    .pub-card__debug summary {
      cursor: pointer;
      font-weight: 500;
      color: var(--color-text-secondary, #6b7280);
    }

    .pub-card__debug pre {
      margin: 0.5rem 0 0 0;
      padding: 0.5rem;
      background: var(--color-surface, #ffffff);
      border-radius: 4px;
      overflow-x: auto;
      font-size: 0.6rem;
      line-height: 1.4;
    }

    /* Mobile optimizations */
    @media (max-width: 640px) {
      .pub-card {
        /* Enhanced touch feedback */
        -webkit-tap-highlight-color: var(--color-primary-subtle, rgba(59, 130, 246, 0.1));
      }

      .pub-card__title {
        font-size: 1rem;
      }

      .pub-card__header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .pub-card {
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      }

      .pub-card:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
      }
    }
  `
})
export class PubCardComponent {
  // ✅ Required inputs - pure component pattern
  readonly pub = input.required<Pub & { distance: number | null }>();

  // ✅ Optional inputs with defaults
  readonly hasCheckedIn = input<boolean>(false);
  readonly checkinCount = input<number>(0);
  readonly showCheckinCount = input<boolean>(false);

  // ✅ Outputs for interactions
  readonly pubClicked = output<Pub>();

  // ✅ Computed properties - no store dependencies
  readonly distanceText = computed(() => {
    const distance = this.pub().distance;
    if (!distance) return '';

    if (distance < 1000) {
      return `📍 ${Math.round(distance)}m away`;
    }
    return `📍 ${(distance / 1000).toFixed(1)}km away`;
  });

  readonly locationText = computed(() => {
    const pub = this.pub();
    const parts = [pub.city, pub.region].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '';
  });

  readonly canCheckIn = computed(() => {
    const distance = this.pub().distance;
    return distance !== null && distance <= 500 && !this.hasCheckedIn();
  });

  // ✅ Development helper
  readonly isDevelopment = computed(() => !environment.production);

  // ✅ Debug info for development
  readonly debugInfo = computed(() => ({
    pubId: this.pub().id,
    pubName: this.pub().name,
    distance: this.pub().distance,
    hasCheckedIn: this.hasCheckedIn(),
    checkinCount: this.checkinCount(),
    location: this.pub().location,
    canCheckIn: this.canCheckIn()
  }));

  // ✅ Event handlers
  onPubClicked(): void {
    this.pubClicked.emit(this.pub());
  }
}
