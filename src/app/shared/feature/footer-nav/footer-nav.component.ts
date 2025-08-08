// src/app/shared/feature/footer-nav/footer-nav.component.ts
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { CheckInStore } from '@/app/check-in/data-access/check-in.store';
import { RouterModule } from '@angular/router';
import { AuthStore } from '@auth/data-access/auth.store';
import { OverlayService } from '@fourfold/angular-foundation';
import { NearbyPubStore } from '@pubs/data-access/nearby-pub.store';
import { BaseComponent } from '@shared/base/base.component';
import { AbstractLocationService } from '@shared/data-access/abstract-location.service';
import { ViewportService } from '@shared/data-access/viewport.service';
import { IconComponent } from '@shared/ui/icon/icon.component';
import {
  CheckinErrorDetails,
  ModalCheckinAttemptComponent,
} from '@shared/ui/modals/modal-checkin-attempt.component';

type NavItem = {
  label: string;
  route?: string;
  iconName: string;
  isActive: boolean;
  isCheckin?: boolean;
  action?: () => void;
};

@Component({
  selector: 'app-footer-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, IconComponent],
  template: `
    <!-- ✅ Only show on mobile/tablet devices -->
    @if (shouldShowMobileNav()) {
      <nav class="footer-nav" role="navigation" aria-label="Main navigation">
        @for (item of navItems(); track item.label) {
          @if (item.isCheckin) {
            <!-- ✅ Check-in button - uses CheckInStore -->
            <button
              class="nav-item nav-item--check-in"
              [class.nav-item--pulse]="canCheckIn()"
              (click)="handleCheckIn()"
              type="button"
            >
              <div class="nav-item__icon">
                <app-icon
                  [name]="item.iconName"
                  size="lg"
                  [filled]="canCheckIn()"
                  weight="medium"
                  customClass="check-in-icon"
                />
              </div>
              <span class="nav-item__label">
                {{ isCheckingIn() ? 'Scanning...' : item.label }}
              </span>
            </button>
          } @else {
            <!-- ✅ Regular navigation links -->
            <a
              [routerLink]="item.route"
              class="nav-item"
              [class.nav-item--active]="item.isActive"
              [attr.aria-current]="item.isActive ? 'page' : null"
            >
              <div class="nav-item__icon">
                <app-icon
                  [name]="item.iconName"
                  size="md"
                  [filled]="item.isActive"
                  [weight]="item.isActive ? 'medium' : 'regular'"
                />
              </div>
              <span class="nav-item__label">{{ item.label }}</span>
            </a>
          }
        }
      </nav>
    }
  `,
  styles: `
    .footer-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      background-color: var(--background-darkest);
      border-top: 1px solid var(--border);
      padding: 0.5rem 0;
      z-index: 1000;

      /* ✅ Safe area for notched devices */
      padding-bottom: max(0.5rem, env(safe-area-inset-bottom));

      /* ✅ Backdrop blur for modern feel */
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);

      /* ✅ Shadow for depth */
      box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
    }

    .nav-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0.5rem 0.25rem;
      text-decoration: none;
      color: var(--text-muted);
      transition: all 0.2s ease;
      position: relative;
      border: none;
      background: none;
      cursor: pointer;

      /* ✅ Tap target size for mobile */
      min-height: 44px;

      &:hover,
      &:focus-visible {
        color: var(--primary);
        transform: translateY(-1px);
      }

      &:focus-visible {
        outline: 2px solid var(--primary);
        outline-offset: 2px;
        border-radius: 8px;
      }
    }

    .nav-item--active {
      color: var(--primary);
      background-color: var(--background-lightest);
      border-radius: 12px;
      position: relative;

      /* ✅ Enhanced active state with accent indicator */
      &::before {
        content: '';
        position: absolute;
        top: 2px;
        left: 50%;
        transform: translateX(-50%);
        width: 4px;
        height: 4px;
        background: var(--accent);
        border-radius: 50%;
        box-shadow: 0 0 8px var(--accent);
      }

      .nav-item__icon {
        transform: scale(1.2);
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
      }
    }

    .nav-item--check-in {
      /* ✅ Check-in button with camera/carpet functionality */
      position: relative;

      .nav-item__icon {
        background: var(--primary);
        color: var(--on-primary);
        border-radius: 50%;
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transform: translateY(-8px);
        transition: all 0.3s ease;

        /* ✅ Icon color override for check-in */
        .check-in-icon {
          color: var(--on-primary) !important;
        }
      }

      .nav-item__label {
        margin-top: 4px;
        font-weight: 600;
        font-size: 0.75rem;
        color: var(--primary);
      }

      /* ✅ Disabled state when can't check in */
      &:disabled {
        .nav-item__icon {
          background: var(--text-muted);
          opacity: 0.6;
        }

        .nav-item__label {
          color: var(--text-muted);
        }

        cursor: not-allowed;
      }
    }

    .nav-item--pulse {
      .nav-item__icon {
        animation: pulse-success 1.5s infinite;
      }
    }

    .nav-item__icon {
      margin-bottom: 0.25rem;
      transition: transform 0.2s ease;
      color: var(--text-muted);

      /* ✅ Icon color inheritance */
      app-icon {
        color: inherit;
      }
    }

    .nav-item__label {
      font-size: 0.75rem;
      font-weight: 500;
      text-align: center;
      line-height: 1;
      transition: color 0.2s ease;
    }

    /* ✅ Enhanced pulse animation for available check-in */
    @keyframes pulse-success {
      0%,
      100% {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transform: translateY(-8px) scale(1);
      }
      50% {
        box-shadow:
          0 8px 24px var(--accent),
          0 0 0 6px rgba(var(--accent-rgb, 13, 110, 253), 0.3);
        transform: translateY(-8px) scale(1.15);
      }
    }

    /* ✅ Active states for regular nav items */
    .nav-item--active:not(.nav-item--check-in) {
      .nav-item__icon {
        color: var(--primary);
      }

      .nav-item__label {
        color: var(--primary);
        font-weight: 700;
      }
    }

    /* ✅ Hide on desktop */
    @media (min-width: 768px) {
      .footer-nav {
        display: none;
      }
    }

    /* ✅ Adjust for very small screens */
    @media (max-width: 375px) {
      .nav-item__label {
        font-size: 0.7rem;
      }

      .nav-item--check-in .nav-item__icon {
        width: 44px;
        height: 44px;
      }
    }
  `,
})
export class FooterNavComponent extends BaseComponent {
  protected readonly viewportService = inject(ViewportService);
  protected readonly nearbyPubStore = inject(NearbyPubStore);
  protected readonly authStore = inject(AuthStore);
  protected readonly checkinStore = inject(CheckInStore);
  private readonly overlayService = inject(OverlayService);
  private readonly locationService = inject(AbstractLocationService);

  // ✅ Local state for check-in process
  private readonly _isCheckingIn = signal(false);
  readonly isCheckingIn = this._isCheckingIn.asReadonly();

  constructor() {
    super();
  }

  // ✅ Signals for reactivity
  readonly isMobile = this.viewportService.isMobile;
  readonly closestPub = this.nearbyPubStore.closestPub;
  readonly user = this.authStore.user;

  // ✅ Check if we should show mobile nav
  readonly shouldShowMobileNav = computed(() => {
    return this.isMobile();
  });

  // ✅ Check if user can check in (uses CheckInStore)
  readonly canCheckIn = computed(() => {
    const pub = this.closestPub();
    if (!pub || !this.user() || this.isCheckingIn() || this.checkinStore.isProcessing()) {
      return false;
    }

    // Check if the closest pub is within check-in range
    return this.nearbyPubStore.isWithinCheckInRange(pub.id);
  });

  // ✅ Navigation items with Material Symbols
  readonly navItems = computed((): NavItem[] => {
    return [
      {
        label: 'Home',
        route: '/',
        iconName: 'home',
        isActive: this.isOnRoute('/')(),
      },
      {
        label: 'Pubs',
        route: '/pubs',
        iconName: 'local_bar',
        isActive: this.isOnRoute('/pubs')(),
      },
      {
        label: 'Check In',
        iconName: 'photo_camera',
        isActive: false, // New Check-in is not a route
        isCheckin: true,
      },
      {
        label: 'Leaderboard',
        route: '/leaderboard',
        iconName: 'leaderboard',
        isActive: this.isOnRoute('/leaderboard')(),
      },
      {
        label: 'Missions',
        route: '/missions',
        iconName: 'flag',
        isActive: this.isOnRoute('/missions')(),
      },
    ];
  });

  handleDebugCarpet() {
    console.log('[FooterNav] Debug carpet clicked');
    this.router.navigate(['/debug-carpet-camera']);
  }

  // ✅ Handle check-in button click with error checking
  handleCheckIn(): void {
    // Always allow button click, but check for issues first
    if (this.isCheckingIn()) {
      console.log('[FooterNav] Already checking in');
      return;
    }

    // Check for authentication
    if (!this.user()) {
      this.showCheckinError({
        type: 'not-authenticated',
        message: 'You need to be signed in to check in to pubs.',
      });
      return;
    }

    // Check for location availability
    const location = this.nearbyPubStore.location();
    if (!location) {
      this.showCheckinError({
        type: 'no-location',
        message:
          'We need your location to check you in. Please enable location services and try again.',
      });
      return;
    }

    // Check for location accuracy - commented out as location type doesn't include accuracy
    const locationError = this.locationService.error();
    // if (locationError && location.accuracy > 100) {
    //   this.showCheckinError({
    //     type: 'poor-accuracy',
    //     message: 'GPS accuracy is too low for check-in. Try moving to a window or outside briefly.',
    //     accuracy: location.accuracy
    //   });
    //   return;
    // }

    // Check for nearby pubs
    const nearbyPubs = this.nearbyPubStore.nearbyPubs();
    if (nearbyPubs.length === 0) {
      this.showCheckinError({
        type: 'no-nearby-pubs',
        message: "No pubs found nearby. Make sure you're within 50km of a Wetherspoons.",
      });
      return;
    }

    // Check for closest pub and range
    const pub = this.closestPub();
    if (!pub) {
      this.showCheckinError({
        type: 'no-nearby-pubs',
        message: "No pubs found nearby. Make sure you're within 50km of a Wetherspoons.",
      });
      return;
    }

    // Check if within check-in range
    if (!this.nearbyPubStore.isWithinCheckInRange(pub.id)) {
      this.showCheckinError({
        type: 'out-of-range',
        message: `You're too far from ${pub.name}. Get within 200 meters to check in.`,
        pubName: pub.name,
        distance: pub.distance,
      });
      return;
    }

    // All checks passed - proceed with check-in
    console.log('[FooterNav] All checks passed, navigating to simplified check-in for:', pub.name);
    this.router.navigate(['/simplified-checkin']);
  }

  private showCheckinError(errorDetails: CheckinErrorDetails): void {
    console.log('[FooterNav] Showing check-in error:', errorDetails);

    const overlayResult = this.overlayService.open(
      ModalCheckinAttemptComponent,
      {
        width: 'auto',
        maxWidth: '400px',
      },
      { errorDetails }
    );

    overlayResult.result.then(action => {
      if (action === 'retry') {
        console.log('[FooterNav] User requested retry');

        // Handle different retry actions based on error type
        switch (errorDetails.type) {
          case 'no-location':
          case 'poor-accuracy':
            console.log(
              '[FooterNav] 🔄 Retry clicked for location issue, calling refreshLocation()'
            );
            this.locationService.refreshLocation().catch(error => {
              console.error('[FooterNav] Location refresh failed:', error);
            });
            break;
          case 'no-nearby-pubs':
            console.log('[FooterNav] 🔄 Retry clicked for no nearby pubs, refreshing location');
            this.locationService.refreshLocation().catch(error => {
              console.error('[FooterNav] Location refresh failed:', error);
            });
            break;
          case 'out-of-range':
            console.log('[FooterNav] 🔄 Retry clicked for out of range, refreshing location');
            this.locationService.refreshLocation().catch(error => {
              console.error('[FooterNav] Location refresh failed:', error);
            });
            break;
          case 'not-authenticated':
            console.log('[FooterNav] 🔄 Retry clicked for auth issue, navigating to auth');
            this.router.navigate(['/auth']);
            break;
        }
      }
    });
  }
}
