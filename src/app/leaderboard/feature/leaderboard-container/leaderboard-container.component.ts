// src/app/leaderboard/feature/leaderboard-container/leaderboard-container.component.ts
import { CommonModule } from "@angular/common";
import { Component, computed, inject, signal } from "@angular/core";
import { ActivatedRoute, RouterModule } from "@angular/router";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { BaseComponent } from "../../../shared/data-access/base.component";
import { LeaderboardStore } from "../../data-access/leaderboard.store";
import { DataTableComponent } from "../../../shared/ui/data-table/data-table.component";
import { TableColumn } from "../../../shared/ui/data-table/data-table.model";
import { LeaderboardTimeRange, LeaderboardEntry } from "../../utils/leaderboard.models";
import { AuthStore } from "../../../auth/data-access/auth.store";

@Component({
  selector: 'app-leaderboard-container',
  imports: [CommonModule, DataTableComponent, RouterModule],
  template: `
    <div class="leaderboard-page">
      <header class="leaderboard-header">
        <h1>🏆 Leaderboard</h1>
        <p>Compete with fellow pub crawlers across the city!</p>
      </header>

      <!-- Time Period Tabs -->
      <nav class="time-period-tabs">
        <a 
          routerLink="/leaderboard/this-week" 
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }"
          class="tab-link"
        >
          This Week
        </a>
        <a 
          routerLink="/leaderboard/this-month" 
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }"
          class="tab-link"
        >
          This Month
        </a>
        <a 
          routerLink="/leaderboard/all-time" 
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }"
          class="tab-link"
        >
          All Time
        </a>
      </nav>

      @if (loading() || leaderboardStore.loading()) {
        <div class="loading-state">
          <p>🔄 Loading leaderboard...</p>
        </div>
      } @else if (error() || leaderboardStore.error()) {
        <div class="error-state">
          <p>❌ Error: {{ error() || leaderboardStore.error() }}</p>
          <button (click)="retry()">Try Again</button>
        </div>
      } @else {
        <div class="leaderboard-content">
          <!-- User Position (if not visible in table) -->
          @if (userPosition() && userPosition()! > 100) {
            <div class="user-position-indicator">
              <p>Your position: <strong>#{{ userPosition() }}</strong> of {{ leaderboardStore.filteredData().length }} crawlers</p>
            </div>
          }

          <!-- Leaderboard Table -->
          <app-data-table
            [data]="topEntries()"
            [columns]="columns()"
            [loading]="leaderboardStore.loading()"
            [highlightRow]="isCurrentUser"
            [trackBy]="'userId'"
            [onRowClick]="handleRowClick"
          />
        </div>
      }
    </div>
  `,
  styles: `
    .leaderboard-page {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1rem;
    }

    .leaderboard-header {
      text-align: center;
      margin-bottom: 1.5rem;
    }

    .leaderboard-header h1 {
      margin: 0 0 0.5rem;
      color: var(--color-text);
      font-size: clamp(1.5rem, 4vw, 2.5rem);
    }

    .leaderboard-header p {
      margin: 0;
      opacity: 0.8;
      color: var(--color-text);
    }

    .time-period-tabs {
      display: flex;
      justify-content: center;
      gap: 0.5rem;
      margin-bottom: 2rem;
      border-bottom: 2px solid var(--color-subtleLighter);
    }

    .tab-link {
      padding: 0.75rem 1.5rem;
      text-decoration: none;
      color: var(--color-text);
      border-bottom: 3px solid transparent;
      transition: all 0.2s ease;
      font-weight: 500;
    }

    .tab-link:hover {
      background: var(--color-subtleLighter);
      border-radius: 8px 8px 0 0;
    }

    .tab-link.active {
      color: var(--color-buttonPrimaryBase);
      border-bottom-color: var(--color-buttonPrimaryBase);
      font-weight: 600;
    }

    .loading-state, .error-state {
      text-align: center;
      padding: 2rem;
    }

    .error-state button {
      margin-top: 1rem;
      padding: 0.5rem 1rem;
      background: var(--color-buttonPrimaryBase);
      color: var(--color-buttonPrimaryText);
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }


    .user-position-indicator {
      background: var(--color-subtleLighter);
      padding: 1rem;
      border-radius: 8px;
      text-align: center;
      margin-bottom: 1rem;
    }

    .user-position-indicator p {
      margin: 0;
      color: var(--color-text);
    }

    .leaderboard-content {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }


    @media (max-width: 768px) {
      .leaderboard-page {
        padding: 0.5rem;
      }

      .time-period-tabs {
        gap: 0.25rem;
      }

      .tab-link {
        padding: 0.5rem 1rem;
        font-size: 0.9rem;
      }
    }
  `
})
export class LeaderboardContainerComponent extends BaseComponent {
  protected readonly leaderboardStore = inject(LeaderboardStore);
  private readonly authStore = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);


  // Route data subscription - initialized in field initializer for injection context
  private readonly routeDataSubscription = this.route.data.pipe(takeUntilDestroyed()).subscribe(data => {
    const routeData = data as Record<string, unknown>;
    const period = (routeData['period'] as LeaderboardTimeRange) || 'all-time';
    console.log('[LeaderboardContainer] Route data changed, setting time range to:', period);
    this.leaderboardStore.setTimeRange(period);
    console.log('[LeaderboardContainer] Current leaderboard store time range:', this.leaderboardStore.timeRange());
  });

  protected override onInit(): void {
    this.leaderboardStore.loadOnce();
  }

  // Computed data for display
  readonly topEntries = computed(() => 
    this.leaderboardStore.topByPoints().slice(0, 100)
  );

  readonly userPosition = computed(() => 
    this.leaderboardStore.userRankByPoints()
  );

  // Table columns configuration
  readonly columns = computed((): TableColumn[] => [
    {
      key: 'rank',
      label: 'Rank',
      className: 'rank',
      width: '80px',
      sortable: false,
      formatter: (_, row, index) => {
        const rank = (index ?? 0) + 1;
        return `#${rank}`;
      }
    },
    {
      key: 'displayName',
      label: 'Pub Crawler',
      className: 'user-cell',
      sortable: false,
      formatter: (_, entry: LeaderboardEntry) => {
        // Simple text-only formatter to avoid HTML sanitization
        return entry.displayName || 'Unknown User';
      }
    },
    {
      key: 'totalPoints',
      label: 'Points',
      className: 'number points-primary',
      width: '120px',
      sortable: true,
      formatter: (points) => points?.toLocaleString() || '0'
    },
    {
      key: 'uniquePubs',
      label: 'Pubs',
      className: 'number',
      width: '100px',
      sortable: true
    },
    {
      key: 'totalCheckins',
      label: 'Check-ins',
      className: 'number',
      width: '120px',
      sortable: true
    }
  ]);

  readonly isCurrentUser = (entry: LeaderboardEntry): boolean => {
    return entry.userId === this.authStore.user()?.uid;
  };

  handleRowClick = (entry: any): void => {
    console.log('User clicked:', entry.displayName);
    // TODO: Navigate to user profile or show user details
  };


  async retry(): Promise<void> {
    await this.handleAsync(
      () => this.leaderboardStore.load(),
      {
        successMessage: 'Leaderboard refreshed!',
        errorMessage: 'Failed to load leaderboard'
      }
    );
  }
}
