// src/app/pubs/ui/pub-card/pub-card.component.ts
import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../environments/environment';
import type { Pub } from '../../utils/pub.models';

@Component({
  selector: 'app-pub-card',
  imports: [CommonModule],
  template: `
 <div class="pub-card"
      [class.pub-card--selected]="isSelected()"
      [class.pub-card--selectable]="selectable()"
      (click)="handleClick($event)"
    >

    <!-- Selection checkbox when in selectable mode -->
    @if (selectable()) {
        <div class="pub-card__checkbox">
          <input
            type="checkbox"
            [checked]="isSelected()"
            (click)="$event.stopPropagation()"
            (change)="handleSelectionChange($event)"
          />
        </div>
      }

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
    </div>
  `,
  styles: `
    .pub-card {
      display: block;
      padding: 1rem;
      background: var(--background-lighter);
      border: 1px solid var(--border);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
      box-shadow: var(--shadow);
      color: var(--text);
    }

    .pub-card:hover {
      border-color: var(--accent);
      box-shadow: var(--shadow);
      transform: translateY(-1px);
      background: var(--background-lightest);
    }

    .pub-card:active {
      transform: translateY(0);
    }

    .pub-card--selectable {
      cursor: pointer;
      position: relative;
    }

    .pub-card--selected {
      border-color: var(--accent);
      background: var(--background-lightest);
    }

    .pub-card__checkbox {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      z-index: 1;
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
      color: var(--text);
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
      background: var(--success);
      color: var(--background);
    }

    .pub-card__badge--info {
      background: var(--info);
      color: var(--background);
    }

    .pub-card__content {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .pub-card__address {
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin: 0;
      line-height: 1.4;
    }

    .pub-card__location {
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin: 0;
      font-style: italic;
    }

    .pub-card__distance {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .pub-card__checkins {
      font-size: 0.75rem;
      color: var(--success);
      margin: 0;
      font-weight: 500;
    }

    .pub-card__debug {
      margin-top: 0.75rem;
      padding: 0.5rem;
      background: var(--background-darker);
      border: 1px solid var(--border);
      border-radius: 4px;
      font-size: 0.75rem;
    }

    .pub-card__debug summary {
      cursor: pointer;
      font-weight: 500;
      color: var(--text-secondary);
    }

    .pub-card__debug pre {
      margin: 0.5rem 0 0 0;
      padding: 0.5rem;
      background: var(--background);
      border-radius: 4px;
      overflow-x: auto;
      font-size: 0.6rem;
      line-height: 1.4;
    }

    /* Mobile optimizations */
    @media (max-width: 640px) {
      .pub-card {
        /* Enhanced touch feedback */
        -webkit-tap-highlight-color: var(--background-lightest);
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

    /* Theme-aware shadows already defined above */
  `
})
export class PubCardComponent {
  // ✅ Required inputs - pure component pattern
  readonly pub = input.required<Pub & { distance: number | null }>();

    // ✅ Selection mode inputs
    readonly selectable = input<boolean>(false);
    readonly isSelected = input<boolean>(false);


  // ✅ Optional inputs with defaults
  readonly hasCheckedIn = input<boolean>(false);
  readonly checkinCount = input<number>(0);
  readonly showCheckinCount = input<boolean>(false);

  // ✅ Outputs for interactions
  readonly cardClicked = output<Pub>();
  readonly selectionChanged = output<{ pub: Pub; selected: boolean }>();

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
  handleClick(event: Event): void {
    if (this.selectable()) {
      event.preventDefault(); // Prevent navigation when selecting
    }
    this.cardClicked.emit(this.pub());
  }

  handleSelectionChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.selectionChanged.emit({
      pub: this.pub(),
      selected: target.checked
    });
  }
}
