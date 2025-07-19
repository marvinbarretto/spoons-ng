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

import { filter, map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';

import { BaseComponent } from '../../base/base.component';
import { NavComponent } from "../nav/nav.component";
import { AdminNavComponent } from '../../../admin/ui/admin-nav/admin-nav.component';
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
  imports: [
    RouterModule,
    NavComponent,
    AdminNavComponent
],
})
export class HeaderComponent extends BaseComponent {
  // 🔧 Services
  protected readonly authStore = inject(AuthStore);
  protected readonly overlayService = inject(OverlayService);
  protected readonly dataAggregatorService = inject(DataAggregatorService);

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
