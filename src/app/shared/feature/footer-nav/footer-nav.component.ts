// src/app/shared/feature/footer-nav/footer-nav.component.ts
import { Component, computed, inject, ChangeDetectionStrategy, signal, effect, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { BaseComponent } from '@shared/base/base.component';
import { ViewportService } from '@shared/data-access/viewport.service';
import { NearbyPubStore } from '@pubs/data-access/nearby-pub.store';
import { AuthStore } from '@auth/data-access/auth.store';
import { CheckInStore } from '@/app/check-in/data-access/check-in.store';
import { IconComponent } from '@shared/ui/icon/icon.component';

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
  imports: [CommonModule, RouterModule, IconComponent],
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

      .nav-item__icon {
        transform: scale(1.1);
      }
    }

    .nav-item--check-in {
      /* ✅ Check-in button with camera/carpet functionality */
      position: relative;

      .nav-item__icon {
        background: var(--primary);
        color: var(--primary-contrast);
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
          color: var(--primary-contrast) !important;
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
        animation: pulse-success 2s infinite;
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
        color: var(--primary);
      }

      .nav-item__label {
        color: var(--primary);
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
  private readonly checkinStore = inject(CheckInStore);

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
    return !!this.closestPub() && !!this.user() && !this.isCheckingIn() && !this.checkinStore.isProcessing();
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
        isCheckin: true
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

  // ✅ Handle check-in button click (uses CheckInStore)
  handleCheckIn(): void {
    if (!this.canCheckIn() || this.isCheckingIn()) {
      console.log('[FooterNav] Check-in not available');
      return;
    }

    const pub = this.closestPub();
    if (!pub) {
      console.warn('[FooterNav] No pub available for check-in');
      return;
    }

    console.log('[FooterNav] Navigating to check-in page for:', pub.name);

    // Navigate to dedicated check-in page
    this.router.navigate(['/check-in', pub.id]);
  }
}
