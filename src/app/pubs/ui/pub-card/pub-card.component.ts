// src/app/pubs/ui/pub-card/pub-card.component.ts
import { Component, computed, input, output, inject } from '@angular/core';

import { environment } from '../../../../environments/environment';
import type { Pub } from '../../utils/pub.models';
import { LocationService } from '@shared/data-access/location.service';
import { ChipStatusComponent } from '@shared/ui/chips/chip-status/chip-status.component';
import { IconComponent } from '@shared/ui/icon/icon.component';

@Component({
  selector: 'app-pub-card',
  imports: [ChipStatusComponent, IconComponent],
  templateUrl: './pub-card.component.html',
  styles: `
    /* ===== MOBILE-FIRST BASE STYLES ===== */

    /* Base card styles - optimized for mobile */
    .pub-card {
      display: flex;
      gap: 1rem;
      padding: 1rem;

      background: var(--background-lighter);
      border: 1px solid var(--border);
      border-radius: 8px;

      transition: all 0.2s ease;
      position: relative;
      box-shadow: var(--shadow);
      color: var(--text);
      /* Enhanced touch feedback for mobile */
      -webkit-tap-highlight-color: var(--background-darkest);
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
      background: var(--background-darkest);
    }

        /* Status area - consistent sizing for checkbox and icon */
    .pub-card__status {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      min-width: 40px;
      min-height: 40px;
    }

    .pub-card__checkbox {
      z-index: 10;
      display: flex;
      align-items: flex-start;
      justify-content: center;
    }

    .pub-card__status-icon {
      margin-top: 4px;
      flex-shrink: 0;
      cursor: help;
      color: var(--success);
      filter: drop-shadow(0 2px 4px rgba(72, 187, 120, 0.3));
    }

    .pub-card-inner {
      display: flex;
      flex-direction: column;
      flex: 1;
    }



    /* Status badges - horizontal for mobile */
    .pub-card__status-badges {
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 0.25rem;
    }

    .pub-card__title-container {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex: 1;
    }


    .pub-card__home-icon {
      font-size: 1rem;
      opacity: 0.8;
    }


    /* Content */
    .pub-card__content {
      display: flex;
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



    .pub-checkbox {
      appearance: none;
      -webkit-appearance: none;
      width: 32px;
      height: 32px;
      border: 3px solid var(--border);
      border-radius: 8px;
      background: var(--background);
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
      margin: 0;
      flex-shrink: 0;
    }

    .pub-checkbox:focus {
      outline: 3px solid var(--primary);
      outline-offset: 3px;
      border-color: var(--primary);
    }

    .pub-checkbox:checked {
      background: var(--primary);
      border-color: var(--primary);
    }

    .pub-checkbox:checked::after {
      content: '✓';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: var(--background);
      font-size: 18px;
      font-weight: bold;
      line-height: 1;
    }

    /* Badge styles */
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
      border: solid 1px var(--info);
      color: var(--background);
    }

    .pub-card__badge--verified {
      border: solid 1px var(--success);
      color: var(--background);
    }

    .pub-card__badge--unverified {
      border: solid 1px var(--info);
      color: var(--background);
      opacity: 0.8;
    }

    .pub-card__badge--target {
      background: var(--warning);
      color: var(--background);
      font-weight: 600;
      animation: pulse-glow 2s infinite;
    }

    .pub-card__badge--ghost {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text-muted);
      opacity: 0.7;
    }

    /* Debug styles */
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

    /* Utility styles */
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    /* ===== ANIMATIONS ===== */

    @keyframes visit-celebration {
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

    @keyframes pulse-glow {
      0%, 100% {
        transform: scale(1);
        box-shadow: 0 0 0 0 var(--warning);
      }
      50% {
        transform: scale(1.02);
        box-shadow: 0 0 0 4px rgba(var(--warning-rgb, 255, 165, 0), 0.2);
      }
    }

    /* ===== ACCESSIBILITY ===== */

    @media (prefers-reduced-motion: reduce) {
      .pub-card__badge--target {
        animation: none;
      }
    }

    /* ===== TABLET+ ENHANCEMENTS (641px+) ===== */

    @media (min-width: 641px) {
      /* Enhanced layout for larger screens */
      .pub-card__header {
        flex-direction: row;
        justify-content: space-between;
        align-items: flex-start;
        gap: 0.75rem;
      }

      .pub-card__status-badges {
        flex-direction: column;
        align-items: flex-end;
      }

      .pub-card__title {
        font-size: 1.125rem;
      }
    }

    /* ===== DESKTOP ENHANCEMENTS (1024px+) ===== */

    @media (min-width: 1024px) {
      /* Hover effects for true hover devices */
      .pub-card:hover {
        border-color: var(--accent);
        box-shadow: var(--shadow);
        transform: translateY(-1px);
        background: var(--background-darkest);
      }

      .pub-checkbox:hover {
        border-color: var(--primary);
        background: var(--background-lighter);
        transform: scale(1.05);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
    }
  `
})
export class PubCardComponent {
  // ✅ Inject LocationService for movement detection
  private readonly locationService = inject(LocationService);

  // ✅ Required inputs - pure component pattern
  readonly pub = input.required<Pub & { distance: number | null }>();

    // ✅ Selection mode inputs
    readonly selectable = input<boolean>(false);
    readonly isSelected = input<boolean>(false);

  // ✅ Movement detection signal
  readonly isMoving = this.locationService.isMoving;


  // ✅ Optional inputs with defaults
  readonly hasCheckedIn = input<boolean>(false);
  readonly checkinCount = input<number>(0);
  readonly showCheckinCount = input<boolean>(false);
  readonly isLocalPub = input<boolean>(false);
  readonly checkInDistanceThreshold = input<number>(500); // Default 500m for backwards compatibility

  // ✅ New visit status inputs
  readonly hasVerifiedVisit = input<boolean>(false);    // App check-in exists
  readonly hasUnverifiedVisit = input<boolean>(false);  // Manual addition exists
  readonly isNearestUnvisited = input<boolean>(false);  // Closest unvisited pub

  // ✅ Address display control
  readonly displayFullAddress = input<boolean>(false);  // Show full address vs city/region only

  // ✅ Outputs for interactions
  readonly cardClicked = output<Pub>();
  readonly selectionChanged = output<{ pub: Pub; selected: boolean }>();

  // ✅ Computed properties - no store dependencies
  readonly distanceText = computed(() => {
    const distance = this.pub().distance;
    if (!distance) return '';

    // Show "Here" when within check-in range
    if (this.canCheckIn()) {
      return `📍 Here`;
    }

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
    return distance !== null && distance <= this.checkInDistanceThreshold() && !this.hasCheckedIn();
  });

  // ✅ New visit status computed properties
  readonly visitStatus = computed(() => {
    if (this.hasVerifiedVisit()) return 'verified';
    if (this.hasUnverifiedVisit()) return 'unverified';
    return 'unvisited';
  });

  readonly shouldShowVerificationBadge = computed(() =>
    this.hasVerifiedVisit() || this.hasUnverifiedVisit()
  );

  readonly visitBadgeText = computed(() => {
    if (this.hasVerifiedVisit()) return '✅ Verified Visit';
    if (this.hasUnverifiedVisit()) return '📝 Manual Visit';
    return '✅ Visited'; // fallback for legacy hasCheckedIn
  });

  readonly visitBadgeClass = computed(() => {
    if (this.hasVerifiedVisit()) return 'pub-card__badge--ghost';
    if (this.hasUnverifiedVisit()) return 'pub-card__badge--ghost';
    return 'pub-card__badge--success'; // fallback
  });

  // ✅ Visit status icon for display in title area
  readonly hasAnyVisit = computed(() =>
    this.hasVerifiedVisit() || this.hasUnverifiedVisit() || this.hasCheckedIn()
  );

  readonly visitStatusIcon = computed(() => {
    if (this.hasVerifiedVisit()) return 'verified'; // Verified visit (app check-in) - star badge
    if (this.hasUnverifiedVisit()) return 'check_circle'; // Manual/unverified visit
    if (this.hasCheckedIn()) return 'check_circle'; // Legacy check-in
    return '';
  });

  readonly visitStatusTitle = computed(() => {
    if (this.hasVerifiedVisit()) return 'Verified visit with photo';
    if (this.hasUnverifiedVisit()) return 'Manually added visit';
    if (this.hasCheckedIn()) return 'Visited';
    return '';
  });

  // ✅ Address display logic
  readonly displayAddress = computed(() => {
    if (this.displayFullAddress()) {
      return this.pub().address;
    }
    // Show city, region when not displaying full address
    const parts = [this.pub().city, this.pub().region].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : this.pub().address;
  });

  // ✅ Checkbox helpers for semantic HTML
  readonly checkboxId = computed(() => `pub-checkbox-${this.pub().id}`);

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


  // ✅ Semantic checkbox change handler
  handleCheckboxChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.selectionChanged.emit({
      pub: this.pub(),
      selected: target.checked
    });
  }
}
