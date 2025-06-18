// src/app/missions/ui/mission-card/mission-card.component.ts
import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Mission } from '../../utils/mission.model';

@Component({
  selector: 'app-mission-card',
  imports: [CommonModule],
  template: `
    <article
      class="mission-card"
      [class.mission-card--joined]="isJoined()"
      (click)="handleClick($event)"
    >
      <header class="mission-card__header">
        <h3 class="mission-card__title">{{ mission().name }}</h3>
        <div class="mission-card__status">
          @if (isJoined()) {
            <span class="status-badge status-badge--joined">✅ Joined</span>
          } @else {
            <span class="status-badge status-badge--available">📝 Available</span>
          }
        </div>
      </header>

      <div class="mission-card__content">
        <p class="mission-card__description">{{ mission().description }}</p>

        <div class="mission-card__stats">
          <div class="stat">
            <span class="stat__label">Pubs to visit:</span>
            <span class="stat__value">{{ mission().pubIds.length }}</span>
          </div>

          @if (mission().badgeRewardId) {
            <div class="stat">
              <span class="stat__label">Badge reward:</span>
              <span class="stat__value">🏅 Yes</span>
            </div>
          }

          @if (isJoined() && progress() !== null) {
            <div class="stat">
              <span class="stat__label">Progress:</span>
              <span class="stat__value">{{ progress() }}/{{ mission().pubIds.length }}</span>
            </div>
          }
        </div>
      </div>

      @if (isJoined() && progress() !== null) {
        <div class="mission-card__progress">
          <div class="progress-bar">
            <div
              class="progress-bar__fill"
              [style.width.%]="progressPercentage()"
            ></div>
          </div>
          <span class="progress-text">{{ progressPercentage() }}% complete</span>
        </div>
      }

      <!-- Development debug info -->
      @if (isDevelopment()) {
        <details class="debug-info">
          <summary>Debug Info</summary>
          <pre>{{ debugInfo() | json }}</pre>
        </details>
      }
    </article>
  `,
  styles: `
    .mission-card {
      background: var(--color-surface, #ffffff);
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: 8px;
      padding: 1rem;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .mission-card:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      border-color: var(--color-primary, #3b82f6);
    }

    .mission-card--joined {
      border-color: var(--color-success, #10b981);
      background: var(--color-success-subtle, rgba(16, 185, 129, 0.05));
    }

    .mission-card__header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.75rem;
      gap: 1rem;
    }

    .mission-card__title {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0;
      color: var(--color-text-primary, #111827);
    }

    .mission-card__status {
      flex-shrink: 0;
    }

    .status-badge {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-weight: 500;
    }

    .status-badge--available {
      background: var(--color-warning-subtle, rgba(245, 158, 11, 0.1));
      color: var(--color-warning, #f59e0b);
    }

    .status-badge--joined {
      background: var(--color-success-subtle, rgba(16, 185, 129, 0.1));
      color: var(--color-success, #10b981);
    }

    .mission-card__description {
      color: var(--color-text-secondary, #6b7280);
      margin: 0 0 1rem;
      line-height: 1.5;
    }

    .mission-card__stats {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .stat {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .stat__label {
      font-size: 0.75rem;
      color: var(--color-text-secondary, #6b7280);
      font-weight: 500;
    }

    .stat__value {
      font-size: 0.875rem;
      color: var(--color-text-primary, #111827);
      font-weight: 600;
    }

    .mission-card__progress {
      margin-top: 1rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--color-border, #e5e7eb);
    }

    .progress-bar {
      height: 6px;
      background: var(--color-gray-200, #e5e7eb);
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 0.5rem;
    }

    .progress-bar__fill {
      height: 100%;
      background: var(--color-success, #10b981);
      transition: width 0.3s ease;
    }

    .progress-text {
      font-size: 0.75rem;
      color: var(--color-text-secondary, #6b7280);
    }

    .debug-info {
      margin-top: 1rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--color-border, #e5e7eb);
      font-size: 0.75rem;
    }

    .debug-info pre {
      background: var(--color-gray-50, #f9fafb);
      padding: 0.5rem;
      border-radius: 4px;
      overflow-x: auto;
    }

    /* Responsive design */
    @media (max-width: 640px) {
      .mission-card__header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }

      .mission-card__stats {
        flex-direction: column;
        gap: 0.5rem;
      }
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .mission-card {
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      }

      .mission-card:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
      }
    }
  `
})
export class MissionCardComponent {
  // ✅ Required inputs
  readonly mission = input.required<Mission>();

  // ✅ Optional inputs with defaults
  readonly isJoined = input<boolean>(false);
  readonly progress = input<number | null>(null);

  // ✅ Outputs for interactions
  readonly cardClicked = output<Mission>();

  // ✅ Computed properties
  readonly progressPercentage = computed(() => {
    const prog = this.progress();
    const total = this.mission().pubIds.length;
    if (prog === null || total === 0) return 0;
    return Math.round((prog / total) * 100);
  });

  // ✅ Development helper
  readonly isDevelopment = computed(() => true); // Set based on environment

  // ✅ Debug info for development
  readonly debugInfo = computed(() => ({
    missionId: this.mission().id,
    missionName: this.mission().name,
    isJoined: this.isJoined(),
    progress: this.progress(),
    totalPubs: this.mission().pubIds.length,
    progressPercentage: this.progressPercentage(),
    hasBadgeReward: !!this.mission().badgeRewardId
  }));

  // ✅ Event handlers
  handleClick(event: Event): void {
    this.cardClicked.emit(this.mission());
  }
}
