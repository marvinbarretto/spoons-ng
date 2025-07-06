import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Mission } from '../../../missions/utils/mission.model';

@Component({
  selector: 'app-mission-card-light',
  imports: [CommonModule],
  template: `
    <div class="mission-card-light" (click)="handleClick()">
      <div class="mission-header">
        <div class="mission-title">
          @if (mission().emoji) {
            <span class="mission-emoji">{{ mission().emoji }}</span>
          }
          <span class="mission-name">{{ mission().name }}</span>
        </div>
        @if (mission().pointsReward) {
          <div class="mission-points">
            <span class="points-icon">💰</span>
            <span class="points-value">{{ mission().pointsReward }}</span>
          </div>
        }
      </div>
      
      @if (isJoined() && progress() !== null) {
        <div class="mission-progress">
          <div class="progress-info">
            <span class="progress-text">{{ progress() }}/{{ mission().pubIds.length }}</span>
            <span class="progress-percentage">{{ progressPercentage() }}%</span>
          </div>
          <div class="progress-bar">
            <div 
              class="progress-fill"
              [style.width.%]="progressPercentage()"
            ></div>
          </div>
        </div>
      } @else {
        <div class="mission-summary">
          <span class="pub-count">{{ mission().pubIds.length }} pubs</span>
          @if (mission().category) {
            <span class="category-badge">{{ mission().category }}</span>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .mission-card-light {
      background: var(--background-lighter);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .mission-card-light:hover {
      background: var(--background-darkest);
      border-color: var(--border-strong);
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .mission-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.75rem;
      gap: 0.5rem;
    }

    .mission-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex: 1;
      min-width: 0;
    }

    .mission-emoji {
      font-size: 1.25rem;
      flex-shrink: 0;
    }

    .mission-name {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text);
      line-height: 1.2;
      word-break: break-word;
    }

    .mission-points {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      background: rgba(59, 130, 246, 0.1);
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      flex-shrink: 0;
    }

    .points-icon {
      font-size: 0.875rem;
    }

    .points-value {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--primary);
    }

    .mission-progress {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .progress-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .progress-text {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text);
    }

    .progress-percentage {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--color-success, #10b981);
    }

    .progress-bar {
      height: 6px;
      background: var(--color-gray-200, #e5e7eb);
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #10b981 0%, #059669 100%);
      border-radius: 3px;
      transition: width 0.3s ease;
    }

    .mission-summary {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      justify-content: space-between;
    }

    .pub-count {
      font-size: 0.875rem;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .category-badge {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      background: rgba(147, 51, 234, 0.1);
      color: #9333ea;
      border-radius: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.025em;
    }

    @media (max-width: 640px) {
      .mission-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }
      
      .mission-points {
        align-self: flex-end;
      }
    }
  `
})
export class MissionCardLightComponent {
  readonly mission = input.required<Mission>();
  readonly isJoined = input<boolean>(false);
  readonly progress = input<number | null>(null);
  
  readonly missionClick = output<Mission>();

  readonly progressPercentage = computed(() => {
    const prog = this.progress();
    const total = this.mission().pubIds.length;
    if (prog === null || total === 0) return 0;
    return Math.round((prog / total) * 100);
  });

  handleClick(): void {
    this.missionClick.emit(this.mission());
  }
}