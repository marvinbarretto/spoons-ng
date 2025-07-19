import { Component, input, output, computed, inject } from '@angular/core';

import type { Pub } from '../../utils/pub.models';
import { LocationService } from '../../../shared/data-access/location.service';

export type PubCardVariant = 'compact' | 'normal' | 'overlay';

@Component({
  selector: 'app-pub-card-light',
  imports: [],
  template: `
    <div
      class="pub-card-light"
      [class.pub-card-light--compact]="variant() === 'compact'"
      [class.pub-card-light--overlay]="variant() === 'overlay'"
      (click)="handleClick()"
    >
      <div class="pub-header">
        <div class="pub-title">
          <span class="pub-name">{{ pub().name }}</span>
          <div class="pub-indicators">
            @if (visitIndicator()) {
              <span class="pub-visit-indicator"
                    [title]="visitIndicatorTitle()"
                    [class.indicator--target]="isNearestUnvisited()">
                {{ visitIndicator() }}
              </span>
            }
            @if (isLocalPub()) {
              <span class="pub-home-icon" title="Your local pub">🏠</span>
            }
          </div>
        </div>
      </div>

      <div class="pub-details">
        @if (showAddress() && pub().address) {
          <div class="pub-address">{{ pub().address }}</div>
        }

        @if (showLocation()) {
          <div class="pub-location">
            @if (variant() !== 'compact') {
              <span class="location-icon">📍</span>
            }
            <span>{{ locationText() }}</span>
          </div>
        }

        @if (showDistance() && distance()) {
          <div class="pub-distance" [class.distance-pulsing]="isMoving()">
            @if (variant() !== 'compact') {
              <span class="distance-icon">📍</span>
            }
            <span>{{ distanceText() }}</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .pub-card-light {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      cursor: pointer;
      transition: all 0.2s ease;
      flex: 1;
      min-width: 0;
    }

    .pub-card-light:hover {
      opacity: 0.8;
    }

    /* Overlay variant - for hero sections with image backgrounds */
    .pub-card-light--overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 2;
      padding: 2rem 1.5rem 1.5rem;
      background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
      color: white;
      gap: 0.5rem;
    }

    .pub-card-light--overlay .pub-name {
      font-size: 1.5rem;
      font-weight: 700;
    }

    .pub-card-light--overlay .pub-address {
      font-size: 1rem;
    }

    .pub-card-light--overlay .pub-location {
      font-size: 0.875rem;
    }

    /* Compact variant - for dropdown items */
    .pub-card-light--compact {
      gap: 0.125rem;
    }

    .pub-card-light--compact .pub-name {
      font-size: 0.875rem;
    }

    .pub-card-light--compact .pub-address,
    .pub-card-light--compact .pub-location {
      font-size: 0.75rem;
    }

    .pub-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .pub-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      flex: 1;
      min-width: 0;
    }

    .pub-indicators {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      flex-shrink: 0;
    }

    .pub-name {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text);
      line-height: 1.3;
      word-break: break-word;
      margin: 0;
    }

    .pub-home-icon {
      font-size: 0.875rem;
      opacity: 0.8;
      flex-shrink: 0;
    }

    .pub-visit-indicator {
      font-size: 0.875rem;
      opacity: 0.8;
      flex-shrink: 0;
      transition: all 0.2s ease;
    }

    .pub-visit-indicator.indicator--target {
      opacity: 1;
      animation: pulse-indicator 2s infinite;
    }

    @keyframes pulse-indicator {
      0%, 100% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.1);
        opacity: 0.7;
      }
    }

    .pub-details {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .pub-address {
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin: 0;
      line-height: 1.4;
    }

    .pub-location {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.75rem;
      color: var(--text-secondary);
      margin: 0;
    }

    .pub-distance {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.75rem;
      color: var(--text-muted);
      margin: 0;
      font-weight: 500;
    }

    .location-icon,
    .distance-icon {
      font-size: 0.75rem;
      opacity: 0.8;
    }

    .distance-pulsing {
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    /* Mobile optimizations */
    @media (max-width: 640px) {
      .pub-card-light--overlay {
        padding: 1.5rem 1rem 1rem;
      }

      .pub-card-light--overlay .pub-name {
        font-size: 1.25rem;
      }

      .pub-card-light--overlay .pub-address {
        font-size: 0.875rem;
      }
    }

    /* Overlay variant color overrides */
    .pub-card-light--overlay .pub-name,
    .pub-card-light--overlay .pub-address,
    .pub-card-light--overlay .pub-location,
    .pub-card-light--overlay .pub-distance {
      color: white;
    }

    .pub-card-light--overlay .location-icon,
    .pub-card-light--overlay .distance-icon {
      opacity: 0.9;
    }
  `
})
export class PubCardLightComponent {
  private readonly locationService = inject(LocationService);

  // Required inputs
  readonly pub = input.required<Pub>();

  // Optional inputs with defaults
  readonly distance = input<number | null>(null);
  readonly variant = input<PubCardVariant>('normal');
  readonly showAddress = input<boolean>(true);
  readonly showLocation = input<boolean>(true);
  readonly showDistance = input<boolean>(false);
  readonly isLocalPub = input<boolean>(false);

  // ✅ New visit status inputs
  readonly hasVerifiedVisit = input<boolean>(false);    // App check-in exists
  readonly hasUnverifiedVisit = input<boolean>(false);  // Manual addition exists
  readonly isNearestUnvisited = input<boolean>(false);  // Closest unvisited pub

  // Output events
  readonly pubClick = output<Pub>();

  // Movement detection signal
  readonly isMoving = this.locationService.isMoving;

  // Computed properties
  readonly locationText = computed(() => {
    const pub = this.pub();
    const parts = [pub.city, pub.region].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '';
  });

  // TODO: Move this logic out...
  readonly distanceText = computed(() => {
    const dist = this.distance();

    if (!dist) return '';

    if (dist < 150) {
      return `Here`
    }
    if (dist < 1000) {
      return `${Math.round(dist)}m away`;
    }
    return `${(dist / 1000).toFixed(1)}km away`;
  });

  // ✅ New visit status computed properties
  readonly visitIndicator = computed(() => {
    if (this.hasVerifiedVisit()) return '✅';
    if (this.hasUnverifiedVisit()) return '📝';
    if (this.isNearestUnvisited()) return '🎯';
    return null;
  });

  readonly visitIndicatorTitle = computed(() => {
    if (this.hasVerifiedVisit()) return 'Verified visit (app check-in)';
    if (this.hasUnverifiedVisit()) return 'Manual visit (added by user)';
    if (this.isNearestUnvisited()) return 'Next target pub';
    return '';
  });

  handleClick(): void {
    this.pubClick.emit(this.pub());
  }
}
