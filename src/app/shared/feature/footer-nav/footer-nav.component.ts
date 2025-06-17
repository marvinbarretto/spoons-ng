// src/app/shared/feature/footer-nav/footer-nav.component.ts
import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { BaseComponent } from '@shared/data-access/base.component';
import { ViewportService } from '@shared/data-access/viewport.service';
import { NearbyPubStore } from '@pubs/data-access/nearby-pub.store';
import { AuthStore } from '@auth/data-access/auth.store';
import { IconComponent } from '@shared/ui/icon/icon.component';

type NavItem = {
  label: string;
  route: string;
  iconName: string;
  isActive: boolean;
  isCheckIn?: boolean;
};

@Component({
  selector: 'app-footer-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, IconComponent],
  template: `
    <!-- ✅ Only show on mobile/tablet devices -->
    @if (shouldShowMobileNav()) {
      <nav class="footer-nav" role="navigation" aria-label="Main navigation">
        @for (item of navItems(); track item.route) {
          <a
            [routerLink]="item.route"
            class="nav-item"
            [class.nav-item--active]="item.isActive"
            [class.nav-item--check-in]="item.isCheckIn"
            [class.nav-item--pulse]="item.isCheckIn && canCheckIn()"
            [attr.aria-current]="item.isActive ? 'page' : null"
          >
            <div class="nav-item__icon">
              @if (item.isCheckIn) {
                <!-- ✅ Special styling for check-in button -->
                <app-icon
                  [name]="item.iconName"
                  size="lg"
                  [filled]="canCheckIn()"
                  weight="medium"
                  customClass="check-in-icon" />
              } @else {
                <!-- ✅ Regular navigation icons -->
                <app-icon
                  [name]="item.iconName"
                  size="md"
                  [filled]="item.isActive"
                  [weight]="item.isActive ? 'medium' : 'regular'" />
              }
            </div>
            <span class="nav-item__label">{{ item.label }}</span>
          </a>
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
      /* ✅ Make check-in button stand out */
      position: relative;

      .nav-item__icon {
        background: var(--color-success);
        color: var(--color-success-text);
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
          color: var(--color-success-text) !important;
        }
      }

      .nav-item__label {
        margin-top: 4px;
        font-weight: 600;
        font-size: 0.75rem;
        color: var(--color-success);
      }

      /* ✅ Disabled state when can't check in */
      &:not(.nav-item--pulse) {
        .nav-item__icon {
          background: var(--color-text-muted);
          opacity: 0.6;
        }

        .nav-item__label {
          color: var(--color-text-muted);
        }
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

  // ✅ Signals for reactivity
  readonly isMobile = this.viewportService.isMobile;
  readonly closestPub = this.nearbyPubStore.closestPub;
  readonly user = this.authStore.user;

  // ✅ Check if we should show mobile nav
  readonly shouldShowMobileNav = computed(() => {
    return this.isMobile();
  });

  // ✅ Check if user can check in
  readonly canCheckIn = computed(() => {
    return !!this.closestPub() && !!this.user();
  });

  // ✅ Navigation items with Material Symbols
  readonly navItems = computed((): NavItem[] => {
    return [
      {
        label: 'Pubs',
        route: '/pubs',
        iconName: 'home', // Material Symbol for home/pubs
        isActive: this.isOnRoute('/pubs')()
      },
      {
        label: 'Missions',
        route: '/missions',
        iconName: 'flag', // Material Symbol for missions/goals
        isActive: this.isOnRoute('/missions')()
      },
      {
        label: 'Check In',
        route: '/check-in',
        iconName: 'location_on', // Material Symbol for location
        isActive: this.isOnRoute('/check-in')(),
        isCheckIn: true
      },
      {
        label: 'Leaderboard',
        route: '/leaderboard',
        iconName: 'leaderboard', // Material Symbol for rankings
        isActive: this.isOnRoute('/leaderboard')()
      },
      {
        label: 'Share',
        route: '/share',
        iconName: 'share', // Material Symbol for sharing
        isActive: this.isOnRoute('/share')()
      }
    ];
  });
}
