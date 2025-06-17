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

type NavItem = {
  label: string;
  route: string;
  icon: string;
  isActive: boolean;
  isCheckIn?: boolean;
};

@Component({
  selector: 'app-footer-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule],
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
            <span class="nav-item__icon" [innerHTML]="item.icon"></span>
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
      background-color: var(--color-surface-elevated, #ffffff);
      border-top: 1px solid var(--color-border, #e2e8f0);
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
      color: var(--color-text-secondary, #64748b);
      transition: all 0.2s ease;
      position: relative;

      /* ✅ Tap target size for mobile */
      min-height: 44px;

      &:hover,
      &:focus-visible {
        color: var(--color-primary, #3b82f6);
        transform: translateY(-1px);
      }

      &:focus-visible {
        outline: 2px solid var(--color-accent-500, #3b82f6);
        outline-offset: 2px;
        border-radius: 8px;
      }
    }

    .nav-item--active {
      color: var(--color-primary, #3b82f6);

      .nav-item__icon {
        transform: scale(1.1);
      }
    }

    .nav-item--check-in {
      /* ✅ Make check-in button stand out */
      position: relative;

      .nav-item__icon {
        background: linear-gradient(135deg, var(--color-primary, #3b82f6) 0%, var(--color-accent-500, #8b5cf6) 100%);
        color: white;
        border-radius: 50%;
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        transform: translateY(-8px);
      }

      .nav-item__label {
        margin-top: 4px;
        font-weight: 600;
        font-size: 0.75rem;
      }
    }

    .nav-item--pulse {
      .nav-item__icon {
        animation: pulse 2s infinite;
      }
    }

    .nav-item__icon {
      font-size: 1.25rem;
      margin-bottom: 0.25rem;
      transition: transform 0.2s ease;
    }

    .nav-item__label {
      font-size: 0.75rem;
      font-weight: 500;
      text-align: center;
      line-height: 1;
    }

    /* ✅ Pulse animation for check-in button */
    @keyframes pulse {
      0%, 100% {
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        transform: translateY(-8px) scale(1);
      }
      50% {
        box-shadow: 0 6px 20px rgba(59, 130, 246, 0.5);
        transform: translateY(-8px) scale(1.05);
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
        font-size: 1.3rem;
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
    // Show on mobile and tablet, hide on desktop
    return this.isMobile();
  });

  // ✅ Check if user can check in
  readonly canCheckIn = computed(() => {
    return !!this.closestPub() && !!this.user();
  });

  // ✅ Navigation items with active state
  readonly navItems = computed((): NavItem[] => {
    const currentPath = this.currentRoute();

    return [
      {
        label: 'Pubs',
        route: '/pubs',
        icon: '🏠', // Alternative: 🍺 or ⌂
        isActive: this.isOnRoute('/pubs')()
      },
      {
        label: 'Missions',
        route: '/missions',
        icon: '🎯', // Alternative: ⭐ or 🎮
        isActive: this.isOnRoute('/missions')()
      },
      {
        label: 'Check In',
        route: '/check-in',
        icon: '✓', // Alternative: 📍 or ⊕
        isActive: this.isOnRoute('/check-in')(),
        isCheckIn: true
      },
      {
        label: 'Leaderboard',
        route: '/leaderboard',
        icon: '🏆', // Alternative: 📊 or 👑
        isActive: this.isOnRoute('/leaderboard')()
      },
      {
        label: 'Share',
        route: '/share',
        icon: '↗', // Alternative: 📤 or ⤴
        isActive: this.isOnRoute('/share')()
      }
    ];
  });
}
