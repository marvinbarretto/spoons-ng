import { Component, computed, inject, input, output } from '@angular/core';

import { PubChipComponent } from '../../../missions/ui/pub-chip/pub-chip.component';
import type { Mission } from '../../../missions/utils/mission.model';
import { PubStore } from '../../../pubs/data-access/pub.store';
import { DataAggregatorService } from '../../../shared/data-access/data-aggregator.service';

@Component({
  selector: 'app-mission-card-light',
  imports: [PubChipComponent],
  template: `
    <div class="mission-card-light" (click)="onMissionClick()">
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
            <div class="progress-fill" [style.width.%]="progressPercentage()"></div>
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

      @if (showPubDetails() && missionPubs().pubs.length > 0) {
        <div class="mission-card__pubs">
          <details class="pub-list-details">
            <summary class="pub-list-summary">
              <span class="pub-list-count"
                >{{ missionPubs().pubs.length }} Pubs in this mission</span
              >
              <span class="pub-list-toggle-icon">▼</span>
            </summary>
            <div class="pub-chips">
              @for (pubDetail of missionPubs().pubs; track pubDetail.id) {
                @if (pubDetail.pub) {
                  <app-pub-chip
                    [pub]="pubDetail.pub"
                    [hasVisited]="pubDetail.hasVisited"
                    [visitCount]="pubDetail.visitCount"
                    [showLocation]="true"
                    [showCarpet]="false"
                  />
                }
              }
            </div>
          </details>
        </div>
      }
    </div>
  `,
  styles: `
    .mission-card-light {
      background: linear-gradient(
        135deg,
        var(--background-lighter) 0%,
        var(--background-lightest) 100%
      );
      border: 2px solid var(--border-strong);
      background-clip: padding-box;
      border-radius: 12px;
      padding: 1.25rem;
      transition: all 0.3s ease;
      position: relative;
      overflow: visible;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      cursor: pointer;
    }

    .mission-card-light:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
      border-color: var(--accent);
    }

    .mission-card-light::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: var(--accent);
      opacity: 0.05;
      border-radius: 10px;
      pointer-events: none;
      z-index: 1;
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
      font-size: 1.75rem;
      flex-shrink: 0;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.5rem;
      height: 2.5rem;
      background: linear-gradient(135deg, var(--accent), var(--primary));
      background-clip: text;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-size: 200% 200%;
    }

    .mission-name {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--text);
      line-height: 1.3;
      word-break: break-word;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    .mission-points {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
      padding: 0.5rem 0.75rem;
      border-radius: 16px;
      flex-shrink: 0;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
      position: relative;
      overflow: hidden;
    }

    .mission-points::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
      transition: left 0.5s ease;
    }

    .mission-card-light:active .mission-points::before {
      left: 100%;
    }

    .points-icon {
      font-size: 1rem;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
    }

    .points-value {
      font-size: 0.875rem;
      font-weight: 800;
      color: var(--background);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
      letter-spacing: 0.025em;
    }

    .mission-progress {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }

    .progress-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .progress-text {
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--text);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    .progress-percentage {
      font-size: 0.875rem;
      font-weight: 800;
      background: linear-gradient(135deg, var(--success) 0%, var(--accent) 100%);
      background-clip: text;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: 0.025em;
    }

    .progress-bar {
      height: 8px;
      background: var(--background-darker);
      border-radius: 6px;
      overflow: hidden;
      position: relative;
      box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(
        135deg,
        var(--success) 0%,
        var(--primary) 50%,
        var(--accent) 100%
      );
      border-radius: 6px;
      transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    .progress-fill::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
      border-radius: 6px;
      animation: shimmer 2s infinite;
    }

    @keyframes shimmer {
      0% {
        transform: translateX(-100%);
      }
      100% {
        transform: translateX(100%);
      }
    }

    /* Accessibility: Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      .mission-card-light,
      .mission-points,
      .progress-fill,
      .mission-points::before,
      .progress-fill::after {
        animation: none !important;
        transition: none !important;
      }

      .mission-card-light:active {
        transform: none;
      }

      .progress-fill::after {
        display: none;
      }
    }

    .mission-summary {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      justify-content: space-between;
      margin-top: 0.5rem;
    }

    .pub-count {
      font-size: 0.875rem;
      color: var(--text-secondary);
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .pub-count::before {
      content: '🏛️';
      font-size: 0.75rem;
      opacity: 0.8;
    }

    .category-badge {
      font-size: 0.75rem;
      padding: 0.375rem 0.75rem;
      background: transparent;
      color: var(--text-secondary);
      border: 1px solid var(--border);
      border-radius: 16px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      opacity: 0.8;
      position: relative;
      overflow: hidden;
    }

    .category-badge::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, var(--accent) 0%, var(--primary) 100%);
      opacity: 0.1;
      border-radius: 15px;
    }

    @media (max-width: 640px) {
      .mission-card-light {
        padding: 1rem;
        border-radius: 16px;
        margin-bottom: 0.5rem;
      }

      .mission-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
        margin-bottom: 1rem;
      }

      .mission-points {
        align-self: flex-end;
        padding: 0.625rem 1rem;
        border-radius: 20px;
      }

      .mission-emoji {
        font-size: 2rem;
        width: 3rem;
        height: 3rem;
      }

      .mission-name {
        font-size: 1.25rem;
        line-height: 1.4;
      }

      .progress-bar {
        height: 10px;
        border-radius: 8px;
      }

      .progress-fill {
        border-radius: 8px;
      }

      .category-badge {
        padding: 0.5rem 1rem;
        border-radius: 20px;
        font-size: 0.8rem;
      }
    }

    /* Pub list display with details/summary */
    .mission-card__pubs {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
    }

    .pub-list-details {
      border: none;
      margin: 0;
      padding: 0;
      position: relative;
      z-index: 2;
    }

    .pub-list-summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem;
      background: var(--background-darker);
      border: 1px solid var(--border);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      list-style: none;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 0.75rem;
      position: relative;
      z-index: 3;
      pointer-events: auto;
    }

    .pub-list-summary:hover {
      background: var(--background-darkest);
      border-color: var(--accent);
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .pub-list-summary::-webkit-details-marker {
      display: none;
    }

    .pub-list-count {
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.025em;
    }

    .pub-list-toggle-icon {
      font-size: 0.75rem;
      transition: transform 0.2s ease;
    }

    .pub-list-details[open] .pub-list-toggle-icon {
      transform: rotate(180deg);
    }

    .pub-chips {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      position: relative;
      z-index: 2;
    }
  `,
})
export class MissionCardLightComponent {
  protected readonly dataAggregatorService = inject(DataAggregatorService);
  protected readonly pubStore = inject(PubStore);

  readonly mission = input.required<Mission>();
  readonly isJoined = input<boolean>(false);
  readonly progress = input<number | null>(null);
  readonly showPubDetails = input<boolean>(false);

  readonly missionClick = output<Mission>();

  protected onMissionClick(): void {
    this.missionClick.emit(this.mission());
  }

  readonly progressPercentage = computed(() => {
    const prog = this.progress();
    const total = this.mission().pubIds.length;
    if (prog === null || total === 0) return 0;
    return Math.round((prog / total) * 100);
  });

  readonly missionPubs = computed(() => {
    const mission = this.mission();
    const allPubs = this.pubStore.pubs();

    const pubDetails = mission.pubIds.map(pubId => {
      const pub = allPubs.find(p => p.id === pubId);
      const hasVisited = this.isJoined() ? this.dataAggregatorService.hasVisitedPub(pubId) : false;

      return {
        id: pubId,
        pub: pub || null,
        name: pub?.name || 'Unknown Pub',
        hasVisited,
        visitCount: hasVisited ? this.dataAggregatorService.getVisitCountForPub(pubId) : 0,
        hasCrest: !!pub?.carpetUrl,
      };
    });

    return {
      pubCount: mission.pubIds.length,
      pubs: pubDetails,
      completedCount: pubDetails.filter(p => p.hasVisited).length,
    };
  });
}
