import { Component, inject, computed, effect } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { PanelStore } from './shared/ui/panel/panel.store';
import { filter } from 'rxjs';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { DeviceCapabilityService } from './shared/utils/device-capability-check.service';
import { SsrPlatformService } from './shared/utils/ssr/ssr-platform.service';
import { PageTitleService } from './shared/data-access/page-title.service';
import { PubStore } from './pubs/data-access/pub.store';
import { LandlordStore } from './landlord/data-access/landlord.store';
import { CheckInModalService } from './check-in/data-access/check-in-modal.service';
import { CheckInStore } from './check-in/data-access/check-in.store';
import { FullScreenShell } from './shared/feature/shells/full-screen.shell';
import { DashboardShell } from './shared/feature/shells/dashboard.shell';
import { FeatureShell } from './shared/feature/shells/feature.shell';

@Component({
  selector: 'app-root',
  imports: [
    FullScreenShell,
    DashboardShell,
    FeatureShell,
  ],
  template: `
    @switch (currentShell()) {
      @case ('fullscreen') {
        <app-full-screen-shell />
      }
      @case ('dashboard') {
        <app-dashboard-shell />
      }
      @case ('feature') {
        <app-feature-shell />
      }
      @default {
        <app-dashboard-shell />
      }
    }
  `,
  styleUrl: './app.component.scss'
})
export class AppComponent {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);

  readonly device = inject(DeviceCapabilityService);
  readonly panelStore = inject(PanelStore);
  readonly platform = inject(SsrPlatformService);
  readonly titleService = inject(PageTitleService);
  readonly pubStore = inject(PubStore);
  readonly landlordStore = inject(LandlordStore);
  private readonly checkInModalService = inject(CheckInModalService);
  private readonly checkinStore = inject(CheckInStore);

  // Track current shell based on route data
  private readonly navigationEnd$ = this.router.events.pipe(
    filter((event): event is NavigationEnd => event instanceof NavigationEnd)
  );

  private readonly navigationSignal = toSignal(this.navigationEnd$, { initialValue: null });

  readonly currentShell = computed(() => {
    // Force recomputation on navigation changes
    this.navigationSignal();
    
    console.log('[AppComponent] 🔍 Computing current shell...');
    
    // Get the shell from the deepest activated route
    let route = this.activatedRoute;
    let depth = 0;
    
    console.log('[AppComponent] Starting route traversal...');
    while (route.firstChild) {
      route = route.firstChild;
      depth++;
      console.log(`[AppComponent] Traversed to depth ${depth}, route:`, route);
    }
    
    const routeData = route.snapshot.data;
    const shell = routeData?.['shell'];
    
    console.log('[AppComponent] 🎯 Final route data:', routeData);
    console.log('[AppComponent] 🏠 Shell selected:', shell || 'dashboard (default)');
    console.log('[AppComponent] 📍 Current URL:', this.router.url);
    
    return shell || 'dashboard';
  });

  constructor() {
    console.log('[AppComponent] 🚀 Booted at', new Date().toISOString());
    console.time('[SSR] AppComponent init');

    // Auto-load critical data
    this.pubStore.loadOnce();
    console.log('[AppComponent] ✅ PubStore loaded');

    // Global checkin modal handling
    effect(() => {
      const results = this.checkinStore.checkinResults();
      if (results) {
        console.log('[AppComponent] Check-in results received, showing modal:', results);
        this.checkInModalService.showCheckInResults(results);
        // Clear the results after handling
        setTimeout(() => {
          this.checkinStore.clearCheckinResults();
        }, 100);
      }
    });

    this.platform.onlyOnBrowser(() => {
      this.router.events
        .pipe(
          filter((event): event is NavigationEnd => event instanceof NavigationEnd),
          takeUntilDestroyed()
        )
        .subscribe((event) => {
          console.log('[AppComponent] 🧭 Navigation completed to:', event.url);
          console.log('[AppComponent] 🏠 Current shell after navigation:', this.currentShell());
          this.panelStore.close();
        });
    });

    console.timeEnd('[SSR] AppComponent init');
  }
}
