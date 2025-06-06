// src/app/leaderboard/feature/leaderboard-container/leaderboard-container.component.ts
import { CommonModule } from "@angular/common";
import { Component, computed, inject } from "@angular/core";
import { BaseComponent } from "../../../shared/data-access/base.component";
import { LeaderboardStore } from "../../data-access/leaderboard.store";
import { DataTableComponent } from "../../../shared/ui/data-table/data-table.component";

@Component({
  selector: 'app-leaderboard-container',
  imports: [CommonModule, DataTableComponent],
  template: `
    <div class="leaderboard-page">
      <header class="leaderboard-header">
        <h1>Leaderboard</h1>
      </header>

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
          <div class="stats-summary">
            <div class="stat">
              <span class="stat-value">{{ leaderboardStore.data().length }}</span>
              <span class="stat-label">Total Crawlers</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ totalVisits() }}</span>
              <span class="stat-label">Total Visits</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ activeCrawlers() }}</span>
              <span class="stat-label">Active Crawlers</span>
            </div>
          </div>

          <app-data-table
            [data]="leaderboardStore.data()"
            [loading]="leaderboardStore.loading()"
          />
        </div>
      }
    </div>
  `,
  styles: `
    .leaderboard-page {
      max-width: 800px;
      margin: 0 auto;
      padding: 1rem;
    }

    .leaderboard-header {
      text-align: center;
      margin-bottom: 2rem;
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

    .stats-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .stat {
      text-align: center;
      padding: 1rem;
      background: var(--color-subtleLighter);
      border-radius: 8px;
    }

    .stat-value {
      display: block;
      font-size: 2rem;
      font-weight: 700;
      color: var(--color-buttonPrimaryBase);
      line-height: 1;
    }

    .stat-label {
      display: block;
      margin-top: 0.5rem;
      font-size: 0.9rem;
      opacity: 0.8;
      color: var(--color-text);
    }

    .leaderboard-content {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    @media (max-width: 600px) {
      .leaderboard-page {
        padding: 0.5rem;
      }

      .stats-summary {
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 0.75rem;
        margin-bottom: 1.5rem;
      }

      .stat {
        padding: 0.75rem;
      }

      .stat-value {
        font-size: 1.5rem;
      }
    }
  `
})
export class LeaderboardContainerComponent extends BaseComponent {
  protected readonly leaderboardStore = inject(LeaderboardStore);

  protected override onInit(): void {
    this.leaderboardStore.loadOnce();
  }

  // Computed stats for summary
  readonly totalVisits = computed(() =>
    this.leaderboardStore.data().reduce((sum, entry) => sum + entry.totalVisits, 0)
  );

  readonly activeCrawlers = computed(() =>
    this.leaderboardStore.data().filter(entry => entry.totalVisits > 0).length
  );

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
