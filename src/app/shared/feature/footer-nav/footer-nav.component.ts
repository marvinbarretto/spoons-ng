// src/app/shared/feature/footer-nav/footer-nav.component.ts
import { Component, computed, inject, ChangeDetectionStrategy, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { BaseComponent } from '@shared/data-access/base.component';
import { ViewportService } from '@shared/data-access/viewport.service';
import { NearbyPubStore } from '@pubs/data-access/nearby-pub.store';
import { AuthStore } from '@auth/data-access/auth.store';
import { CheckInModalService } from '@check-in/data-access/check-in-modal.service';
import { NewCheckinStore } from '../../../new-checkin/data-access/new-checkin.store';
import { IconComponent } from '@shared/ui/icon/icon.component';

type NavItem = {
  label: string;
  route?: string;
  iconName: string;
  isActive: boolean;
  isNewCheckIn?: boolean;
  action?: () => void;
};

@Component({
  selector: 'app-footer-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, IconComponent],
  template: `
    <!-- ✅ Only show on mobile/tablet devices -->
    @if (shouldShowMobileNav()) {
      <nav class="footer-nav" role="navigation" aria-label="Main navigation">
        @for (item of navItems(); track item.label) {

          @if (item.isNewCheckIn) {
            <!-- ✅ Check-in button - uses NewCheckinStore -->
            <button
              class="nav-item nav-item--check-in"
              [class.nav-item--pulse]="canCheckIn()"
              [disabled]="!canCheckIn() || isCheckingIn()"
              (click)="handleCheckIn()"
              type="button"
            >
              <div class="nav-item__icon">
                <app-icon
                  [name]="item.iconName"
                  size="lg"
                  [filled]="canCheckIn()"
                  weight="medium"
                  customClass="check-in-icon" />
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
                  [weight]="item.isActive ? 'medium' : 'regular'" />
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
      background-color: var(--color-surface-elevated);
      border-top: 1px solid var(--color-border);
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
      color: var(--color-text-muted);
      transition: all 0.2s ease;
      position: relative;
      border: none;
      background: none;
      cursor: pointer;

      /* ✅ Tap target size for mobile */
      min-height: 44px;

      &:hover,
      &:focus-visible {
        color: var(--color-primary);
        transform: translateY(-1px);
      }

      &:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
        border-radius: 8px;
      }
    }

    .nav-item--active {
      color: var(--color-primary);

      .nav-item__icon {
        transform: scale(1.1);
      }
    }

    .nav-item--check-in {
      /* ✅ Check-in button with camera/carpet functionality */
      position: relative;

      .nav-item__icon {
        background: var(--color-primary);
        color: var(--color-primary-text);
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
          color: var(--color-primary-text) !important;
        }
      }

      .nav-item__label {
        margin-top: 4px;
        font-weight: 600;
        font-size: 0.75rem;
        color: var(--color-primary);
      }

      /* ✅ Disabled state when can't check in */
      &:disabled {
        .nav-item__icon {
          background: var(--color-text-muted);
          opacity: 0.6;
        }

        .nav-item__label {
          color: var(--color-text-muted);
        }

        cursor: not-allowed;
      }
    }

    .nav-item--pulse {
      .nav-item__icon {
        animation: pulse-success 2s infinite;
      }
    }

    .nav-item__icon {
      margin-bottom: 0.25rem;
      transition: transform 0.2s ease;
      color: var(--color-text-muted);

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

    /* ✅ Pulse animation for available check-in */
    @keyframes pulse-success {
      0%, 100% {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transform: translateY(-8px) scale(1);
      }
      50% {
        box-shadow: 0 6px 20px var(--color-success), 0 0 0 4px rgba(var(--color-success-rgb, 34, 197, 94), 0.2);
        transform: translateY(-8px) scale(1.05);
      }
    }

    /* ✅ Active states for regular nav items */
    .nav-item--active:not(.nav-item--check-in) {
      .nav-item__icon {
        color: var(--color-primary);
      }

      .nav-item__label {
        color: var(--color-primary);
        font-weight: 600;
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
  `
})
export class FooterNavComponent extends BaseComponent {
  private readonly viewportService = inject(ViewportService);
  private readonly nearbyPubStore = inject(NearbyPubStore);
  private readonly authStore = inject(AuthStore);
  private readonly checkInModalService = inject(CheckInModalService);
  private readonly newCheckinStore = inject(NewCheckinStore);

  // ✅ Local state for check-in process
  private readonly _isCheckingIn = signal(false);
  readonly isCheckingIn = this._isCheckingIn.asReadonly();

  // ✅ Watch for check-in results and show modals
  constructor() {
    super();

    effect(() => {
      const results = this.newCheckinStore.checkinResults();
      if (results) {
        console.log('[FooterNavComponent] Check-in results received, showing modal:', results);
        this.checkInModalService.showCheckInResults(results);
        // Clear the results after handling
        setTimeout(() => {
          this.newCheckinStore.clearCheckinResults();
        }, 100);
      }
    });
  }

  // ✅ Signals for reactivity
  readonly isMobile = this.viewportService.isMobile;
  readonly closestPub = this.nearbyPubStore.closestPub;
  readonly user = this.authStore.user;

  // ✅ Check if we should show mobile nav
  readonly shouldShowMobileNav = computed(() => {
    return this.isMobile();
  });

  // ✅ Check if user can check in (uses NewCheckinStore)
  readonly canCheckIn = computed(() => {
    return !!this.closestPub() && !!this.user() && !this.isCheckingIn() && !this.newCheckinStore.isProcessing();
  });

  // ✅ Navigation items with Material Symbols
  readonly navItems = computed((): NavItem[] => {
    return [
      {
        label: 'Home',
        route: '/',
        iconName: 'home',
        isActive: this.isOnRoute('/')()
      },
      {
        label: 'Pubs',
        route: '/pubs',
        iconName: 'local_bar',
        isActive: this.isOnRoute('/pubs')()
      },
      {
        label: 'Check In',
        iconName: 'photo_camera',
        isActive: false, // New Check-in is not a route
        isNewCheckIn: true
      },
      {
        label: 'Leaderboard',
        route: '/leaderboard',
        iconName: 'leaderboard',
        isActive: this.isOnRoute('/leaderboard')()
      },
      {
        label: 'Share',
        route: '/share',
        iconName: 'share',
        isActive: this.isOnRoute('/share')()
      }
    ];
  });

  handleDebugCarpet() {
    console.log('[FooterNav] Debug carpet clicked');
    this.router.navigate(['/debug-carpet-camera']);
  }

  // ✅ Handle check-in button click (uses NewCheckinStore)
  async handleCheckIn(): Promise<void> {
    if (!this.canCheckIn() || this.isCheckingIn()) {
      console.log('[FooterNav] Check-in not available');
      return;
    }

    const pub = this.closestPub();
    if (!pub) {
      console.warn('[FooterNav] No pub available for check-in');
      return;
    }

    console.log('[FooterNav] Starting check-in for:', pub.name);
    this._isCheckingIn.set(true);

    try {
      // ✅ Perform check-in via NewCheckinStore - handles carpet scanning, landlord logic, etc.
      await this.newCheckinStore.checkinToPub(pub.id);

      console.log('[FooterNav] ✅ Check-in flow completed successfully');

    } catch (error: any) {
      console.error('[FooterNav] Check-in failed:', error);

      // ✅ NewCheckinStore handles its own error flow and modals

    } finally {
      this._isCheckingIn.set(false);
    }
  }
}
