// src/app/home/ui/scoreboard-hero/scoreboard-hero.component.ts
import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { User } from '@users/utils/user.model';

@Component({
  selector: 'app-scoreboard-hero',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="scoreboard-hero">
      <!-- ✅ Main Scoreboard -->
      <div class="scoreboard">
        <div class="score-display">
          <div class="score-item">
            <span class="score-number">{{ totalPoints() }}</span>
            <span class="score-label">Points</span>
          </div>
          <div class="score-divider">•</div>
          <div class="score-item">
            <span class="score-number">{{ pubsVisited() }}</span>
            <span class="score-label">/ {{ totalPubs() }} Pubs</span>
          </div>
        </div>

        <!-- ✅ Overall Progress Bar -->
        <div class="progress-container">
          <div class="progress-bar">
            <div
              class="progress-fill"
              [style.width.%]="overallProgress()"
            ></div>
          </div>
          <span class="progress-text">{{ overallProgress() }}% Complete</span>
        </div>
      </div>
    </div>
  `,
  styles: `
    .scoreboard-hero {
      background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 50%, #581c87 100%);
      color: white;
      border-radius: 16px;
      padding: 2rem;
      margin-bottom: 2rem;
      position: relative;
      overflow: hidden;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
    }

    /* ✅ Main Scoreboard */
    .scoreboard {
      text-align: center;
    }

    .score-display {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .score-item {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .score-number {
      font-size: 3rem;
      font-weight: 900;
      line-height: 1;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
      background: linear-gradient(45deg, #ffd700, #ffed4e);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .score-label {
      font-size: 0.875rem;
      font-weight: 600;
      opacity: 0.9;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .score-divider {
      font-size: 2rem;
      opacity: 0.6;
      font-weight: bold;
    }

    .progress-container {
      max-width: 300px;
      margin: 0 auto;
    }

    .progress-bar {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 10px;
      height: 8px;
      overflow: hidden;
      margin-bottom: 0.5rem;
    }

    .progress-fill {
      background: linear-gradient(90deg, #ffd700, #ffed4e);
      height: 100%;
      border-radius: 10px;
      transition: width 0.8s ease;
    }

    .progress-text {
      font-size: 0.875rem;
      font-weight: 600;
      opacity: 0.9;
    }

    /* ✅ Responsive Design */
    @media (max-width: 640px) {
      .scoreboard-hero {
        padding: 1.5rem;
      }

      .score-number {
        font-size: 2.5rem;
      }
    }
  `
})
export class ScoreboardHeroComponent {
  // ✅ Inputs
  readonly user = input<User | null>(null);
  readonly totalPubs = input(856);

  // ✅ Computed Values
  readonly pubsVisited = computed(() => {
    const currentUser = this.user();
    return currentUser?.checkedInPubIds?.length || 0;
  });

  readonly totalPoints = computed(() => {
    // TODO: Implement real points calculation
    const pubs = this.pubsVisited();
    const user = this.user();
    const badges = user?.badgeCount || 0;
    return pubs * 10 + badges * 50; // Placeholder calculation
  });

  readonly overallProgress = computed(() => {
    const visited = this.pubsVisited();
    const total = this.totalPubs();
    return total > 0 ? Math.round((visited / total) * 100) : 0;
  });
}
