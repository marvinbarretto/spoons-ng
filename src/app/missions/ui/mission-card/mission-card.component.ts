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
            <span class="status-badge status-badge--joined">
              <span class="status-badge__icon">🎯</span>
              <span class="status-badge__text">In Progress</span>
            </span>
          } @else {
            <span class="status-badge status-badge--available">
              <span class="status-badge__icon">🚀</span>
              <span class="status-badge__text">Start Mission</span>
            </span>
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
              <span class="stat__label">🏆 Reward:</span>
              <span class="stat__value">Epic Badge</span>
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
          <span class="progress-text">
            <span class="progress-text__percentage">{{ progressPercentage() }}%</span>
            <span class="progress-text__label">Complete</span>
          </span>
        </div>
      }

    </article>
  `,
  styles: `
    .mission-card {
      background: linear-gradient(135deg, var(--color-surface, #ffffff) 0%, rgba(59, 130, 246, 0.02) 100%);
      border: 2px solid transparent;
      border-radius: 16px;
      padding: 1.5rem;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      position: relative;
      overflow: hidden;
    }

    .mission-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%);
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
    }

    .mission-card:hover {
      transform: translateY(-8px) scale(1.02);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      border-color: rgba(59, 130, 246, 0.3);
    }

    .mission-card:hover::before {
      opacity: 1;
    }

    .mission-card--joined {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%);
      border-color: rgba(16, 185, 129, 0.3);
    }

    .mission-card--joined::before {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.1) 100%);
    }

    .mission-card__header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.75rem;
      gap: 1rem;
    }

    .mission-card__title {
      font-size: 1.375rem;
      font-weight: 700;
      margin: 0;
      color: var(--color-text-primary, #111827);
      background: linear-gradient(135deg, #1f2937 0%, #3b82f6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1.2;
    }

    .mission-card__status {
      flex-shrink: 0;
    }

    .status-badge {
      font-size: 0.75rem;
      padding: 0.5rem 0.75rem;
      border-radius: 20px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.375rem;
      text-transform: uppercase;
      letter-spacing: 0.025em;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      transition: all 0.2s ease;
    }

    .status-badge__icon {
      font-size: 0.875rem;
      display: flex;
      align-items: center;
    }

    .status-badge__text {
      font-weight: 700;
    }

    .status-badge--available {
      background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
      color: white;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }

    .status-badge--available:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 8px rgba(245, 158, 11, 0.3);
    }

    .status-badge--joined {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }

    .status-badge--joined:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
    }

    .mission-card__description {
      color: var(--color-text-secondary, #6b7280);
      margin: 0 0 1.5rem;
      line-height: 1.6;
      font-size: 0.95rem;
      font-weight: 400;
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
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.025em;
    }

    .stat__value {
      font-size: 0.95rem;
      color: var(--color-text-primary, #111827);
      font-weight: 700;
    }

    .mission-card__progress {
      margin-top: 1rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--color-border, #e5e7eb);
    }

    .progress-bar {
      height: 10px;
      background: var(--color-gray-200, #e5e7eb);
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 0.75rem;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
      position: relative;
    }

    .progress-bar__fill {
      height: 100%;
      background: linear-gradient(90deg, #10b981 0%, #059669 50%, #047857 100%);
      transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 8px;
      position: relative;
      overflow: hidden;
    }

    .progress-bar__fill::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%);
      animation: shimmer 2s infinite;
    }

    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    .progress-text {
      font-size: 0.875rem;
      color: var(--color-text-secondary, #6b7280);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
    }

    .progress-text__percentage {
      font-size: 1rem;
      font-weight: 700;
      color: var(--color-success, #10b981);
    }

    .progress-text__label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.025em;
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
        background: linear-gradient(135deg, rgba(31, 41, 55, 0.9) 0%, rgba(17, 24, 39, 0.95) 100%);
        border-color: rgba(75, 85, 99, 0.3);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
      }

      .mission-card:hover {
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
      }

      .mission-card__title {
        background: linear-gradient(135deg, #f3f4f6 0%, #60a5fa 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
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


  // ✅ Event handlers
  handleClick(event: Event): void {
    this.cardClicked.emit(this.mission());
  }
}
