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

import { BaseComponent } from '../../data-access/base.component';
import { FeatureFlagPipe } from '../../utils/feature-flag.pipe';
import { PanelStore, PanelType } from '../../ui/panel/panel.store';
import { ViewportService } from '../../data-access/viewport.service';
import { UserInfoComponent } from "../../ui/user-info/user-info.component";
import { NavComponent } from "../nav/nav.component";
import { LandlordStore } from '../../../landlord/data-access/landlord.store';
import { NearbyPubStore } from '../../../pubs/data-access/nearby-pub.store';
import { AuthStore } from '../../../auth/data-access/auth.store';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  imports: [
    RouterModule,
    CommonModule,
    FeatureFlagPipe,
    UserInfoComponent,
    NavComponent,
  ],
})
export class HeaderComponent extends BaseComponent implements AfterViewInit {
  // 🔧 Services
  private readonly router = inject(Router);
  private readonly viewportService = inject(ViewportService);
  private readonly panelStore = inject(PanelStore);
  private readonly landlordStore = inject(LandlordStore);
  private readonly nearbyPubStore = inject(NearbyPubStore);
  private readonly authStore = inject(AuthStore);

  private readonly currentRoute$ = this.router.events.pipe(
    filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    map(event => event.url)
  );

  private readonly currentRoute = toSignal(this.currentRoute$, {
    initialValue: this.router.url,
  });

  readonly isHomepage = computed(() => this.currentRoute() === '/');
  readonly isMobile = this.viewportService.isMobile;
  readonly closestPub = computed(() => this.nearbyPubStore.closestPub());

  // ✅ Auth signals
  readonly user = this.authStore.user;
  readonly isAnonymous = this.authStore.isAnonymous;
  readonly displayName = this.authStore.displayName;

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
}
