import { Component, computed, effect, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { SsrPlatformService } from '@fourfold/angular-foundation';
import { filter } from 'rxjs';
import { CheckInModalService } from './check-in/data-access/check-in-modal.service';
import { CheckInStore } from './check-in/data-access/check-in.store';
import { LandlordStore } from './landlord/data-access/landlord.store';
import { PubStore } from './pubs/data-access/pub.store';
import { PageTitleService } from './shared/data-access/page-title.service';
import { SessionService } from './shared/data-access/session.service';
import { DashboardShell } from './shared/feature/shells/dashboard.shell';
import { FeatureShell } from './shared/feature/shells/feature.shell';
import { FullScreenShell } from './shared/feature/shells/full-screen.shell';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FullScreenShell, DashboardShell, FeatureShell],
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
  styleUrl: './app.component.scss',
})
export class AppComponent {
  protected readonly router = inject(Router);
  protected readonly activatedRoute = inject(ActivatedRoute);

  protected readonly platform = inject(SsrPlatformService);
  protected readonly titleService = inject(PageTitleService);
  protected readonly pubStore = inject(PubStore);
  protected readonly landlordStore = inject(LandlordStore);
  protected readonly checkInModalService = inject(CheckInModalService);
  protected readonly checkinStore = inject(CheckInStore);
  
  // Initialize SessionService to handle app-wide session data management
  private readonly sessionService = inject(SessionService);

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
        .subscribe(event => {
          console.log('[AppComponent] 🧭 Navigation completed to:', event.url);
          console.log('[AppComponent] 🏠 Current shell after navigation:', this.currentShell());
        });

      // Simple bundle size smoke test
      if (!window.location.hostname.includes('spoons')) {
        window.addEventListener('load', () => {
          const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
          const jsResources = resources.filter(
            r => r.name.includes('.js') && !r.name.includes('node_modules')
          );
          const totalTransferSize = jsResources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
          const totalSize = jsResources.reduce((sum, r) => sum + (r.decodedBodySize || 0), 0);

          console.log(
            `📦 Bundle: ${jsResources.length} JS files, ${(totalTransferSize / 1024).toFixed(0)}KB transferred, ${(totalSize / 1024).toFixed(0)}KB uncompressed`
          );
        });
      }
    });

    console.timeEnd('[SSR] AppComponent init');
  }
}
