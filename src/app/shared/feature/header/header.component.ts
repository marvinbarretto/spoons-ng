// src/app/shared/feature/header/header.component.ts
import {
  Component,
  computed,
  effect,
  ElementRef,
  HostBinding,
  inject,
  ViewChild,
} from '@angular/core';
import { RouterModule } from '@angular/router';

import { OverlayService } from '@fourfold/angular-foundation';
import { AdminNavComponent } from '../../../admin/ui/admin-nav/admin-nav.component';
import { AuthStore } from '../../../auth/data-access/auth.store';
import { ProfileCustomisationModalComponent } from '../../../home/ui/profile-customisation-modal/profile-customisation-modal.component';
import { BaseComponent } from '../../base/base.component';
import { CapacitorPlatformService } from '../../data-access/capacitor-platform.service';
import { DataAggregatorService } from '../../data-access/data-aggregator.service';
import { NavComponent } from '../nav/nav.component';

import { environment } from '../../../../environments/environment';
import { APP_VERSION } from '../../utils/version';

/**
 * HeaderComponent - Main site header
 *
 * 🚀 NAVIGATION STRATEGY:
 * - NavComponent handles its own responsive behavior
 * - Desktop: Shows full nav menu inline
 * - Mobile: Nav hides menu list, FooterNavComponent provides mobile navigation
 * - Always shows user profile widget
 */
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  imports: [RouterModule, NavComponent, AdminNavComponent],
})
export class HeaderComponent extends BaseComponent {
  // 🔧 Services
  protected readonly authStore = inject(AuthStore);
  protected readonly overlayService = inject(OverlayService);
  protected readonly dataAggregatorService = inject(DataAggregatorService);
  protected readonly capacitorPlatform = inject(CapacitorPlatformService);

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

  // ✅ Platform detection for iOS-specific header handling
  readonly isIOS = this.capacitorPlatform.isIOS;
  readonly isNative = this.capacitorPlatform.isNative;
  readonly platformName = this.capacitorPlatform.platformName;

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

  @HostBinding('class.is-homepage')
  get isHomepageClass(): boolean {
    return this.isHomepage();
  }

  // ✅ Handle user profile actions
  onOpenProfile(): void {
    console.log('[HeaderComponent] Opening profile customization modal');

    const { componentRef, close } = this.overlayService.open(ProfileCustomisationModalComponent, {
      maxWidth: '600px',
      maxHeight: '90vh',
    });

    // Pass the close callback to the modal component
    componentRef.setInput('closeCallback', close);

    console.log('[HeaderComponent] Profile modal opened, close function available');
  }
}
