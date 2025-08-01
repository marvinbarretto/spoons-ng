import { Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { BaseComponent } from '@shared/base/base.component';
import { TabGroupComponent, type Tab } from '@shared/ui/tabs';
import { LeaderboardStore } from '../../data-access/leaderboard.store';
import { FriendsLeaderboardComponent } from '../friends-leaderboard/friends-leaderboard.component';
import { GlobalLeaderboardComponent } from '../global-leaderboard/global-leaderboard.component';
import { RegionalLeaderboardComponent } from '../regional-leaderboard/regional-leaderboard.component';

@Component({
  selector: 'app-leaderboard-container',
  imports: [
    TabGroupComponent,
    FriendsLeaderboardComponent,
    GlobalLeaderboardComponent,
    RegionalLeaderboardComponent,
  ],
  template: `
    <div class="leaderboard">
      <!-- Tab Navigation -->
      <ff-tab-group
        [tabs]="leaderboardTabs"
        [selectedTab]="currentTab()"
        (tabChange)="setTab($event)"
      >
        <!-- Tab Content - Component Switching -->
        @switch (currentTab()) {
          @case ('friends') {
            <app-friends-leaderboard />
          }
          @case ('global') {
            <app-global-leaderboard />
          }
          @case ('regional') {
            <app-regional-leaderboard />
          }
          @default {
            <app-global-leaderboard />
          }
        }
      </ff-tab-group>
    </div>
  `,
  styles: `
    .leaderboard {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1rem;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .leaderboard {
        padding: 0.5rem;
      }
    }
  `,
})
export class LeaderboardContainerComponent extends BaseComponent {
  protected readonly store = inject(LeaderboardStore);
  private readonly route = inject(ActivatedRoute);

  // Route-synced tab state
  private readonly routeUrl = toSignal(this.route.url, { initialValue: [] });
  readonly currentTab = signal<'friends' | 'global' | 'regional'>('global');

  // Tab configuration
  readonly leaderboardTabs: Tab[] = [
    {
      id: 'friends',
      label: 'Friends',
      icon: '👥',
    },
    {
      id: 'global',
      label: 'Global',
      icon: '🌍',
    },
    {
      id: 'regional',
      label: 'Regional',
      icon: '🗺️',
    },
  ];

  constructor() {
    super();

    // Sync tab state with current route
    effect(() => {
      const urlSegments = this.routeUrl();
      const lastSegment = urlSegments[urlSegments.length - 1]?.path;

      if (lastSegment === 'friends' || lastSegment === 'global' || lastSegment === 'regional') {
        this.currentTab.set(lastSegment);
      }
    });

    // React to tab changes and update store scope
    effect(() => {
      const scope = this.currentTab();
      this.store.setScope(scope);
    });
  }

  setTab(tab: string): void {
    if (tab === 'friends' || tab === 'global' || tab === 'regional') {
      // Navigate to the new route - this will trigger the route sync effect
      this.router.navigate(['/leaderboard', tab]);
    }
  }
}
