// src/app/pubs/ui/improved-pub-card/improved-pub-card.component.ts
import { Component, computed, inject, input, output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LocationService } from '@fourfold/angular-foundation';
import { IconComponent } from '@shared/ui/icon/icon.component';
import type { Pub } from '../../utils/pub.models';

type ViewMode = 'exploration' | 'completion';

@Component({
  selector: 'app-improved-pub-card',
  imports: [RouterModule, IconComponent],
  template: `
    <article
      class="improved-pub-card"
      [class.visited]="hasAnyVisit()"
      [class.verified]="hasVerifiedVisit()"
      [class.unverified]="hasUnverifiedVisit()"
      [class.exploration-mode]="viewMode() === 'exploration'"
      [class.completion-mode]="viewMode() === 'completion'"
      [class.can-check-in]="canCheckIn()"
      [class.is-local]="isLocalPub()"
      [attr.aria-labelledby]="'pub-title-' + pub().id"
      [attr.aria-describedby]="'pub-details-' + pub().id"
      role="article"
    >
      <!-- ✅ Left Zone: Checkbox-like Visit Status with Status Label -->
      <button
        class="visit-status-zone"
        [attr.aria-label]="visitStatusActionLabel()"
        [attr.aria-pressed]="hasAnyVisit()"
        (click)="handleVisitStatusClick()"
        type="button"
        role="checkbox"
        [attr.aria-checked]="hasAnyVisit()"
      >
        <div class="visit-status-indicator">
          @if (hasVerifiedVisit()) {
            <div class="status-content" aria-hidden="true">
              <app-icon name="verified" size="sm" />
              <span class="status-label">Verified</span>
            </div>
          } @else if (hasUnverifiedVisit()) {
            <div class="status-content" aria-hidden="true">
              <app-icon name="check_circle" size="sm" />
              <span class="status-label">Manual</span>
            </div>
          } @else {
            <div class="status-content" aria-hidden="true">
              <app-icon name="radio_button_unchecked" size="sm" />
              <span class="status-label">Visit?</span>
            </div>
          }
        </div>
      </button>

      <!-- ✅ Right Zone: Pub Details with Navigation -->
      <a
        [routerLink]="['/pubs', pub().id]"
        class="pub-details-zone"
        [attr.aria-label]="'View details for ' + pub().name"
      >
        <!-- Header Section -->
        <header class="card-header">
          <div class="title-section">
            <h3 class="pub-title" [id]="'pub-title-' + pub().id">
              {{ pub().name }}
              @if (isLocalPub()) {
                <span class="local-indicator" aria-label="Your local pub" title="Your local pub">
                  <app-icon name="home" size="sm" />
                </span>
              }
            </h3>

            @if (canCheckIn()) {
              <div class="check-in-badge" role="status" aria-label="You can check in here now">
                📍 You're here!
              </div>
            }
          </div>

          <!-- Visit Count Badge -->
          @if (showCheckinCount() && checkinCount() > 0) {
            <div
              class="visit-count-badge"
              [attr.aria-label]="checkinCount() + ' visit' + (checkinCount() === 1 ? '' : 's')"
            >
              <app-icon name="repeat" size="xs" aria-hidden="true" />
              <span>{{ checkinCount() }}</span>
            </div>
          }
        </header>

        <!-- Details Section -->
        <div class="card-details" [id]="'pub-details-' + pub().id">
          <!-- Town/City -->
          @if (locationText()) {
            <div class="pub-location">{{ locationText() }}</div>
          }

          @if (distanceText()) {
            <div class="pub-distance" [attr.aria-label]="'Distance: ' + distanceText()">
              {{ distanceText() }}
            </div>
          }

          <!-- Status information now in left zone for space efficiency -->
        </div>
      </a>

      <!-- ✅ Subtle Progress Indicator for Completion Mode -->
      @if (viewMode() === 'completion') {
        <div
          class="card-progress-indicator"
          [class.completed]="hasAnyVisit()"
          aria-hidden="true"
        ></div>
      }
    </article>
  `,
  styles: `
    /* ===== MOBILE-FIRST BASE STYLES ===== */

    .improved-pub-card {
      position: relative;
      display: flex;
      gap: 0;
      padding: 0;

      /* Mobile-optimized styling */
      background: var(--background-lighter);
      border: 1px solid var(--border);
      border-radius: 8px; /* Smaller radius for mobile */

      /* Mobile-friendly shadow */
      box-shadow: 0 1px 2px var(--shadow);

      /* Mobile touch targets - minimum 44px height */
      min-height: 60px;
      overflow: hidden;

      /* Focus styles for accessibility */
      &:focus-within {
        outline: 2px solid var(--primary);
        outline-offset: 1px;
      }
    }

    /* ===== MOBILE-FIRST SPLIT ZONES ===== */

    .visit-status-zone {
      flex-shrink: 0;
      width: 56px; /* Smaller for mobile */
      display: flex;
      align-items: center;
      justify-content: center;

      /* Mobile-first styling */
      background: var(--background-darker);
      border: none;
      border-right: 1px solid var(--border);
      border-radius: 6px 0 0 6px; /* Match smaller card radius */

      cursor: pointer;
      transition: all 0.15s ease;

      /* Mobile touch target - reduced padding */
      padding: 0.75rem 0;

      /* Default unvisited state */
      color: var(--text-muted);

      /* Mobile active state (no hover on touch) */
      &:active {
        background: var(--primary-alpha-20);
        transform: scale(0.98);
      }

      /* Focus for keyboard/screen readers */
      &:focus-visible {
        outline: 2px solid var(--primary);
        outline-offset: 1px;
        background: var(--background-darkest);
      }

      /* Checkbox-like pressed state */
      &[aria-pressed='true'] {
        box-shadow: inset 0 1px 2px var(--shadow);
      }
    }

    .pub-details-zone {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.375rem; /* Tighter mobile spacing */
      padding: 0.75rem; /* Reduced mobile padding */

      text-decoration: none;
      color: inherit;

      /* Mobile active state */
      &:active {
        background: var(--background-lightest);
      }

      /* Focus for accessibility */
      &:focus {
        outline: 2px solid var(--primary);
        outline-offset: -1px;
        background: var(--background-lightest);
      }
    }

    /* ===== VISIT STATUS INDICATOR ===== */

    .visit-status-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;

      .status-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.1875rem; /* 3px - tighter for mobile */

        .status-label {
          font-size: 0.5625rem; /* 9px - smaller for mobile 56px zone */
          font-weight: 500;
          line-height: 1;
          text-align: center;
          white-space: nowrap;
          letter-spacing: 0.02em; /* Improve readability at small size */
        }
      }
    }

    /* ===== REFINED VISITED STATE TREATMENTS ===== */

    .improved-pub-card.visited {
      /* Clean, elegant background elevation */
      background: var(--background-lightest);
      border-color: var(--border);

      .pub-title {
        font-weight: 500;
        color: var(--text);
      }

      .visit-status-zone {
        background: var(--background-darker);
      }
    }

    /* Verified state: White text on green background */
    .improved-pub-card.verified .visit-status-zone {
      background: var(--success);
      color: white;
      border-right-color: var(--success);

      .status-content .status-label {
        color: white;
        font-weight: 500;
      }

      &:hover {
        background: var(--success);
        filter: brightness(1.1);
      }

      &:active {
        background: var(--success);
        filter: brightness(0.9);
      }
    }

    // TODO: Move these colours out
    /* Unverified state: White text on darker green background */
    .improved-pub-card.unverified .visit-status-zone {
      background: #0f7534; /* Darker green - closer to verified */
      color: white;
      border-right-color: #0f7534;

      .status-content .status-label {
        color: white;
        font-weight: 500;
      }

      &:active {
        background: #15803d; /* Even darker on press */
      }
    }

    /* ===== CONTENT LAYOUT ===== */

    .card-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      min-width: 0; /* Prevent text overflow */
    }

    .card-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .title-section {
      flex: 1;
      min-width: 0;
    }

    .pub-title {
      margin: 0;
      font-size: 1.125rem; /* Mobile-first size */
      font-weight: 500;
      line-height: 1.3;
      color: var(--text);
      font-family: 'Fredoka', sans-serif;

      display: flex;
      align-items: center;
      gap: 0.5rem;

      /* Prevent text overflow */
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .local-indicator {
      color: var(--warning);
      flex-shrink: 0;
    }

    /* ===== BADGES ===== */

    .check-in-badge {
      padding: 0.25rem 0.75rem;
      background: var(--warning);
      color: var(--background);
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 500;
      white-space: nowrap;

      animation: pulse-gentle 2s infinite;
    }

    @keyframes pulse-gentle {
      0%,
      100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.9;
        transform: scale(1.02);
      }
    }

    .visit-count-badge {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      background: var(--background-darker);
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--text-secondary);
      white-space: nowrap;
    }

    /* ===== DETAILS SECTION ===== */

    .card-details {
      display: flex;
      flex-direction: column;
      gap: 0.0625rem; /* 1px - tighter mobile spacing */
    }

    .pub-address {
      margin: 0;
      font-size: 0.9rem;
      color: var(--text-secondary);
      line-height: 1.4;
      font-style: normal;

      /* Prevent overflow */
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .pub-location {
      font-size: 0.875rem;
      color: var(--text-secondary);
      line-height: 1.3;
      margin-bottom: 0.125rem;
    }

    .pub-distance {
      font-size: 0.8rem;
      color: var(--text-muted);
      font-weight: 400;
    }

    /* Status text styles removed - now consolidated in left zone */

    /* ===== COMPLETION MODE ACTIONS ===== */

    .card-actions {
      margin-top: 0.5rem;
      padding-top: 0.5rem;
      border-top: 1px solid var(--border);
    }

    .quick-visit-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;

      background: var(--primary);
      color: var(--primary-contrast);
      border: none;
      border-radius: 8px;

      font-size: 0.875rem;
      font-weight: 500;
      font-family: 'Fredoka', sans-serif;

      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: var(--primary-hover);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px var(--shadow);
      }

      &:active {
        transform: translateY(0);
      }
    }

    /* ===== PROGRESS INDICATOR ===== */

    .card-progress-indicator {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 2px;
      background: var(--border);
      border-radius: 0 0 12px 12px;

      transition: all 0.3s ease;

      &.completed {
        background: var(--success);
        height: 3px;
      }
    }

    /* ===== TABLET+ ENHANCEMENTS (768px+) ===== */

    @media (min-width: 768px) {
      .improved-pub-card {
        border-radius: 12px; /* Larger radius on bigger screens */
        box-shadow: 0 1px 3px var(--shadow); /* Enhanced shadow */
        min-height: 68px; /* Taller on desktop */
      }

      .visit-status-zone {
        width: 64px; /* Wider zone on desktop */
        padding: 0.875rem 0;
        border-radius: 8px 0 0 8px;

        /* Hover effects for non-touch devices */
        &:hover {
          background: var(--background-darkest);
          transform: translateY(-1px);

          .visit-status-indicator {
            transform: scale(1.05);
          }
        }
      }

      .pub-details-zone {
        gap: 0.5rem;
        padding: 0.875rem;

        &:hover {
          background: var(--background-lightest);
        }
      }

      .visit-status-indicator .status-content {
        gap: 0.25rem;

        .status-label {
          font-size: 0.625rem; /* 10px on desktop */
        }
      }

      .pub-title {
        font-size: 1.25rem; /* Keep larger title on desktop */
      }
    }

    /* ===== ACCESSIBILITY ===== */

    @media (prefers-reduced-motion: reduce) {
      .improved-pub-card,
      .quick-visit-btn,
      .check-in-badge {
        transition: none;
        animation: none;
      }

      /* Remove animations from visited states */
      .improved-pub-card.visited {
        transform: none;

        &:hover {
          transform: none;
        }
      }

      .status-verified,
      .status-unverified {
        animation: none !important;
      }

      /* Keep static visual enhancements but remove motion */
      .improved-pub-card.verified .status-verified,
      .improved-pub-card.unverified .status-unverified {
        filter: none;
        transform: none;
      }
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .improved-pub-card {
        border-width: 2px;
      }

      .visit-status-indicator .status-unvisited {
        opacity: 0.8;
      }

      /* Enhanced contrast for visited states */
      .improved-pub-card.visited {
        border: 2px solid var(--border-strong);

        &::before {
          opacity: 1;
          height: 6px;
        }

        &::after {
          opacity: 0.3;
          border-width: 0 32px 32px 0;
        }
      }

      .improved-pub-card.verified {
        border: 3px solid var(--success);

        &::before {
          background: var(--success);
        }
      }

      .improved-pub-card.unverified {
        border: 3px solid var(--info);

        &::before {
          background: var(--info);
          mask: none; /* Remove dashed effect for better contrast */
        }
      }
    }

    /* ===== DARK MODE OPTIMIZATIONS ===== */

    @media (prefers-color-scheme: dark) {
      .improved-pub-card:hover {
        background: var(--background);
      }
    }
  `,
})
export class ImprovedPubCardComponent {
  // ✅ Inject LocationService for movement detection
  private readonly locationService = inject(LocationService);

  // ✅ Required inputs
  readonly pub = input.required<Pub & { distance: number }>();
  readonly viewMode = input<ViewMode>('exploration');

  // ✅ Optional inputs with defaults
  readonly hasCheckedIn = input<boolean>(false);
  readonly checkinCount = input<number>(0);
  readonly showCheckinCount = input<boolean>(false);
  readonly isLocalPub = input<boolean>(false);
  readonly checkInDistanceThreshold = input<number>(500);

  // ✅ Visit status inputs
  readonly hasVerifiedVisit = input<boolean>(false);
  readonly hasUnverifiedVisit = input<boolean>(false);

  // ✅ Outputs
  readonly pubVisited = output<string>();
  readonly pubVisitToggled = output<string>();

  // ✅ Computed properties
  readonly hasAnyVisit = computed(
    () => this.hasVerifiedVisit() || this.hasUnverifiedVisit() || this.hasCheckedIn()
  );

  readonly canCheckIn = computed(() => {
    const distance = this.pub().distance;
    return (
      distance !== null &&
      distance !== Infinity &&
      distance <= this.checkInDistanceThreshold() &&
      !this.hasCheckedIn()
    );
  });

  readonly distanceText = computed(() => {
    const distance = this.pub().distance;
    if (!distance || distance === Infinity) return '';

    if (this.canCheckIn()) {
      return `📍 You're here`;
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

  readonly displayAddress = computed(() => {
    const pub = this.pub();
    const parts = [pub.city, pub.region].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : pub.address;
  });

  readonly visitStatusLabel = computed(() => {
    if (this.hasVerifiedVisit()) return 'Verified visit with photo';
    if (this.hasUnverifiedVisit()) return 'Manually added visit';
    if (this.hasCheckedIn()) return 'Visited';
    return 'Not visited yet';
  });

  readonly visitStatusActionLabel = computed(() => {
    if (this.hasAnyVisit()) return 'Edit visit status for ' + this.pub().name;
    return 'Mark ' + this.pub().name + ' as visited';
  });

  // ✅ Event handlers
  handleVisitStatusClick(): void {
    // Always emit toggle - let parent decide what to do
    this.pubVisitToggled.emit(this.pub().id);
  }

  handleQuickVisit(): void {
    this.pubVisited.emit(this.pub().id);
  }
}
