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

  // ✅ Debug method for platform detection
  debugPlatformDetection() {
    console.log('[HeaderComponent] 🐛 DEBUG PLATFORM DETECTION:');
    console.log('  capacitorPlatform service:', this.capacitorPlatform);
    console.log('  initialized():', this.capacitorPlatform.initialized());
    console.log('  platformName():', this.platformName());
    console.log('  isIOS():', this.isIOS());
    console.log('  isNative():', this.isNative());
    console.log('  isWeb():', this.capacitorPlatform.isWeb());
    console.log('  isAndroid():', this.capacitorPlatform.isAndroid());
    console.log('  User agent:', navigator.userAgent);
    console.log('  Window location:', window.location.href);
    
    // Force template re-evaluation
    console.log('  Template condition isIOS():', this.isIOS());
  }

  @ViewChild('headerRef', { static: false }) headerRef!: ElementRef;
  @ViewChild('panelTrigger', { static: false }) panelTriggerRef!: ElementRef;

  constructor() {
    super();
    
    // CRITICAL: Basic component instantiation check
    console.log('[HeaderComponent] 🚀 CONSTRUCTOR CALLED - Component is being created');
    console.log('[HeaderComponent] 🔍 Platform service available:', !!this.capacitorPlatform);
    console.log('[HeaderComponent] 🔍 Immediate platform check:', {
      isIOS: this.capacitorPlatform?.isIOS(),
      platformName: this.capacitorPlatform?.platformName(),
      initialized: this.capacitorPlatform?.initialized()
    });
    
    // Enhanced logging for route info
    effect(() => {
      console.log('[HeaderComponent] Current route:', this.currentRoute());
      console.log('[HeaderComponent] Is homepage:', this.isHomepage());
      console.log('[HeaderComponent] Display name:', this.displayName());
    });

    // Critical: Platform detection logging
    effect(() => {
      console.log('[HeaderComponent] 🔍 Platform Detection:', {
        initialized: this.capacitorPlatform.initialized(),
        platformName: this.platformName(),
        isIOS: this.isIOS(),
        isNative: this.isNative(),
        isWeb: this.capacitorPlatform.isWeb(),
        isAndroid: this.capacitorPlatform.isAndroid(),
        capacitorAvailable: !!this.capacitorPlatform,
      });
    });

    // Template rendering decision logging
    effect(() => {
      const templateChoice = this.isIOS() ? 'iOS-SPECIFIC' : 'WEB/ANDROID';
      console.log(`[HeaderComponent] 🎨 Template Choice: ${templateChoice}`, {
        isIOS: this.isIOS(),
        shouldShowiOSHeader: this.isIOS(),
        platformName: this.platformName(),
      });
    });

    // Call debug method after a short delay to ensure initialization
    setTimeout(() => {
      this.debugPlatformDetection();
    }, 1000);
  }

  @HostBinding('class.is-homepage')
  get isHomepageClass(): boolean {
    return this.isHomepage();
  }

  override ngOnInit(): void {
    super.ngOnInit();
    console.log('[HeaderComponent] 🎬 ngOnInit called');
    console.log('[HeaderComponent] 🔍 Platform detection in ngOnInit:', {
      capacitorPlatformExists: !!this.capacitorPlatform,
      isIOS: this.isIOS(),
      isNative: this.isNative(),
      platformName: this.platformName(),
      initialized: this.capacitorPlatform.initialized()
    });
    
    // Force template condition check
    const templateCondition = this.isIOS();
    console.log('[HeaderComponent] 🎨 Template condition isIOS():', templateCondition);
    console.log('[HeaderComponent] 🎨 Should show iOS header:', templateCondition);
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
