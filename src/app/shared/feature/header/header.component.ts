// src/app/shared/feature/header/header.component.ts
import {
  Component,
  HostBinding,
  AfterViewInit,
  computed,
  ElementRef,
  ViewChild,
  inject,
  effect,
} from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter, map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';

import { BaseComponent } from '../../base/base.component';
import { PanelStore, PanelType } from '../../ui/panel/panel.store';
import { ViewportService } from '../../data-access/viewport.service';
import { NavComponent } from "../nav/nav.component";
import { UserProfileWidgetComponent } from '../../../home/ui/user-profile-widget/user-profile-widget.component';
import { ProfileCustomisationModalComponent } from '../../../home/ui/profile-customisation-modal/profile-customisation-modal.component';
import { LandlordStore } from '../../../landlord/data-access/landlord.store';
import { AuthStore } from '../../../auth/data-access/auth.store';
import { OverlayService } from '../../data-access/overlay.service';
import { DataAggregatorService } from '../../data-access/data-aggregator.service';

import { APP_VERSION } from '../../utils/version';
import { UserStore } from '../../../users/data-access/user.store';
import { environment } from '../../../../environments/environment';


/**
 * HeaderComponent - Main site header with responsive navigation
 *
 * 🚀 NAVIGATION STRATEGY:
 * - **Desktop (768px+)**: Shows horizontal NavComponent directly in header
 * - **Mobile (<768px)**: Shows hamburger menu that opens NavComponent in panel
 *   + FooterNavComponent provides bottom tab navigation for mobile
 *
 * This ensures optimal UX for each device type:
 * - Desktop: Traditional horizontal nav in header
 * - Mobile: Clean header + accessible bottom nav + panel for full menu
 */
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  imports: [
    RouterModule,
    CommonModule,
    NavComponent,
    UserProfileWidgetComponent,
    // ProfileCustomisationModalComponent,
  ],
})
export class HeaderComponent extends BaseComponent implements AfterViewInit {
  // 🔧 Services
  protected readonly viewportService = inject(ViewportService);
  protected readonly panelStore = inject(PanelStore);
  protected readonly authStore = inject(AuthStore);
  protected readonly overlayService = inject(OverlayService);
  protected readonly dataAggregatorService = inject(DataAggregatorService);

  // ✅ Reactive viewport detection
  readonly isMobile = this.viewportService.isMobile;

  readonly version = APP_VERSION;

  // ✅ Environment detection
  readonly environmentName = computed(() => {
    if (environment.production) {
      return 'PROD';
    }
    if (environment.ACTIVE_DEVELOPMENT_MODE) {
      return 'DEV';
    }
    return 'LOCAL';
  });

  // ✅ Auth signals
  readonly user = this.authStore.user;
  readonly isAnonymous = this.authStore.isAnonymous;
  readonly displayName = this.dataAggregatorService.displayName;

  // ✅ Auth actions
  handleLogin = () => this.authStore.loginWithGoogle();
  handleLogout = () => this.authStore.logout();

  @ViewChild('headerRef', { static: false }) headerRef!: ElementRef;
  @ViewChild('panelTrigger', { static: false }) panelTriggerRef!: ElementRef;

  constructor() {
    super();
    effect(() => {
      console.log('[HeaderComponent] Current route:', this.currentRoute());
      console.log('[HeaderComponent] Is homepage:', this.isHomepage());
      console.log('[HeaderComponent] Display name:', this.displayName());
    });
  }

  ngAfterViewInit(): void {
    this.onlyOnBrowser(() => this.updatePanelOrigin());
  }

  /**
   * Handle panel toggle (theme, search, mobile nav)
   * Used for mobile hamburger menu and utility buttons
   */
  onTogglePanel(panel: PanelType): void {
    this.onlyOnBrowser(() => {
      const button = this.panelTriggerRef?.nativeElement as HTMLElement;
      if (button) {
        const y = button.getBoundingClientRect().bottom + window.scrollY;
        this.panelStore.setOriginY(y);
      }
      this.panelStore.toggle(panel);
    });
  }

  private updatePanelOrigin(): void {
    const rect = this.headerRef?.nativeElement?.getBoundingClientRect();
    if (rect) {
      const offsetY = rect.bottom + window.scrollY;
      this.panelStore.setOriginY(offsetY);
    }
  }

  @HostBinding('class.is-mobile')
  get isMobileClass(): boolean {
    return this.isMobile();
  }

  @HostBinding('class.is-homepage')
  get isHomepageClass(): boolean {
    return this.isHomepage();
  }

  // ✅ Handle user profile actions
  onOpenProfile(): void {
    console.log('[HeaderComponent] Opening profile customization modal');

    const { componentRef, close } = this.overlayService.open(
      ProfileCustomisationModalComponent,
      {
        maxWidth: '600px',
        maxHeight: '90vh'
      }
    );

    // Pass the close callback to the modal component
    componentRef.setInput('closeCallback', close);

    console.log('[HeaderComponent] Profile modal opened, close function available');
  }
}
