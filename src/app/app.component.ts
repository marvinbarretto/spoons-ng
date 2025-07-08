import { Component, inject, computed, effect } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd, RouterOutlet } from '@angular/router';
import { PanelStore } from './shared/ui/panel/panel.store';
import { filter } from 'rxjs';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
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
    RouterOutlet,
    FullScreenShell,
    DashboardShell,
    FeatureShell,
  ],
  template: `
    @if (currentShell()) {
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
      }
    } @else {
      <!-- Minimal render while route resolves -->
      <router-outlet></router-outlet>
    }
  `,
  styleUrl: './app.component.scss'
})
export class AppComponent {
  protected readonly router = inject(Router);
  protected readonly activatedRoute = inject(ActivatedRoute);

  protected readonly panelStore = inject(PanelStore);
  protected readonly platform = inject(SsrPlatformService);
  protected readonly titleService = inject(PageTitleService);
  protected readonly pubStore = inject(PubStore);
  protected readonly landlordStore = inject(LandlordStore);
  protected readonly checkInModalService = inject(CheckInModalService);
  protected readonly checkinStore = inject(CheckInStore);

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
    console.log('[AppComponent] 🏠 Shell selected:', shell || 'none (waiting for route)');
    console.log('[AppComponent] 📍 Current URL:', this.router.url);

    return shell; // No default - wait for route data
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
