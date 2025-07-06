// src/app/missions/ui/mission-card/mission-card.component.ts
import { Component, computed, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataAggregatorService } from '../../../shared/data-access/data-aggregator.service';
import { PubStore } from '../../../pubs/data-access/pub.store';
import { PubChipComponent } from '../pub-chip/pub-chip.component';
import type { Mission } from '../../utils/mission.model';
import type { Pub } from '../../../pubs/utils/pub.models';

@Component({
  selector: 'app-mission-card',
  imports: [CommonModule, PubChipComponent],
  template: `
    <article
      class="mission-card"
      [class.mission-card--joined]="isJoined()"
    >
      <header class="mission-card__header">
        <div class="mission-card__title-section">
          <h3 class="mission-card__title">
            @if (mission().emoji) {
              <span class="mission-card__emoji">{{ mission().emoji }}</span>
            }
            {{ mission().name }}
          </h3>
          <div class="mission-card__meta">
            @if (mission().category) {
              <span class="meta-badge meta-badge--category">{{ mission().category }}</span>
            }
            @if (mission().subcategory) {
              <span class="meta-badge meta-badge--subcategory">{{ mission().subcategory }}</span>
            }
            @if (mission().difficulty) {
              <span class="meta-badge meta-badge--difficulty meta-badge--{{ mission().difficulty }}">{{ mission().difficulty }}</span>
            }
            @if (mission().featured) {
              <span class="meta-badge meta-badge--featured">⭐ Featured</span>
            }
          </div>
        </div>
        @if (isJoined()) {
          <div class="mission-card__status">
            <span class="status-badge status-badge--joined">
              <span class="status-badge__icon">🎯</span>
              <span class="status-badge__text">In Progress</span>
            </span>
          </div>
        }
      </header>

      <div class="mission-card__content">
        <p class="mission-card__description">{{ mission().description }}</p>

        <div class="mission-card__stats">
          <div class="stat">
            <span class="stat__label">Pubs to visit:</span>
            <span class="stat__value">{{ mission().pubIds.length }}</span>
          </div>

          @if (mission().pointsReward) {
            <div class="stat stat--highlighted">
              <span class="stat__label">💰 Points:</span>
              <span class="stat__value stat__value--points">{{ mission().pointsReward }}</span>
            </div>
          }

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

          @if (mission().requiredPubs && mission().totalPubs && mission().requiredPubs !== mission().totalPubs) {
            <div class="stat">
              <span class="stat__label">Required:</span>
              <span class="stat__value">{{ mission().requiredPubs }}/{{ mission().totalPubs }}</span>
            </div>
          }
        </div>

        @if (missionPubs().pubs.length > 0) {
          <div class="mission-card__pubs">
            <details class="pub-list-details">
              <summary class="pub-list-summary">
                <span class="pub-list-count">{{ missionPubs().pubs.length }} Pubs in this mission</span>
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

      <!-- Actions slot for parent components to inject buttons -->
      <div class="mission-card__actions">
        <ng-content select="[slot=actions]"></ng-content>
      </div>

    </article>
  `,
  styles: `
    .mission-card {
      background: linear-gradient(135deg, var(--background-darkest, #ffffff) 0%, rgba(59, 130, 246, 0.02) 100%);
      border: 2px solid transparent;
      border-radius: 8px;
      padding: 1.5rem;
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

    /* Hover effects removed - parent components can add their own hover styles */

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

    .mission-card__title-section {
      flex: 1;
      min-width: 0;
    }

    .mission-card__title {
      font-size: 1.375rem;
      font-weight: 700;
      margin: 0 0 0.5rem 0;
      color: var(--text);
      line-height: 1.2;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .mission-card__emoji {
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .mission-card__meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
      margin-bottom: 0.25rem;
    }

    .meta-badge {
      font-size: 0.625rem;
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.025em;
      border: 1px solid transparent;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }

    .meta-badge--category {
      background: rgba(59, 130, 246, 0.1);
      color: var(--primary, #3b82f6);
      border-color: rgba(59, 130, 246, 0.2);
    }

    .meta-badge--subcategory {
      background: rgba(147, 51, 234, 0.1);
      color: #9333ea;
      border-color: rgba(147, 51, 234, 0.2);
    }

    .meta-badge--difficulty {
      border-color: rgba(156, 163, 175, 0.3);
    }

    .meta-badge--easy {
      background: rgba(34, 197, 94, 0.1);
      color: #22c55e;
      border-color: rgba(34, 197, 94, 0.2);
    }

    .meta-badge--medium {
      background: rgba(234, 179, 8, 0.1);
      color: #eab308;
      border-color: rgba(234, 179, 8, 0.2);
    }

    .meta-badge--hard {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      border-color: rgba(239, 68, 68, 0.2);
    }

    .meta-badge--extreme {
      background: rgba(139, 69, 19, 0.1);
      color: #8b4513;
      border-color: rgba(139, 69, 19, 0.2);
    }

    .meta-badge--featured {
      background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
      color: white;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      border-color: #f59e0b;
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
      color: var(--text-secondary, #6b7280);
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
      color: var(--text-secondary, #6b7280);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.025em;
    }

    .stat__value {
      font-size: 0.95rem;
      color: var(--text, #111827);
      font-weight: 700;
    }

    .stat--highlighted {
      padding: 0.5rem;
      background: rgba(59, 130, 246, 0.05);
      border: 1px solid rgba(59, 130, 246, 0.1);
      border-radius: 6px;
    }

    .stat__value--points {
      color: var(--primary, #3b82f6);
      font-size: 1.1rem;
      font-weight: 800;
    }

    .mission-card__progress {
      margin-top: 1rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--border, #e5e7eb);
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
      color: var(--text-secondary, #6b7280);
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
    }

    .pub-list-summary:hover {
      background: var(--background-darkest);
      border-color: var(--border-strong);
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

      /* Hover effects removed - parent components can add their own hover styles */

      /* Title styling handled by theme tokens */

      /* Dark mode styles handled by theme tokens */
    }

    .mission-card__actions {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border, #e5e7eb);
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .mission-card__actions:empty {
      display: none;
    }
  `
})
export class MissionCardComponent {
  // ✅ Dependency injection
  private readonly dataAggregatorService = inject(DataAggregatorService);
  private readonly pubStore = inject(PubStore);

  // ✅ Required inputs
  readonly mission = input.required<Mission>();

  // ✅ Optional inputs with defaults
  readonly isJoined = input<boolean>(false);
  readonly progress = input<number | null>(null);

  // ✅ No outputs - parent components handle their own interactions

  // ✅ Computed properties
  readonly progressPercentage = computed(() => {
    const prog = this.progress();
    const total = this.mission().pubIds.length;
    if (prog === null || total === 0) return 0;
    return Math.round((prog / total) * 100);
  });

  // ✅ Mission pub details
  readonly missionPubs = computed(() => {
    const mission = this.mission();
    const allPubs = this.pubStore.pubs();

    // Get pub details for all mission pubs, regardless of joined status
    const pubDetails = mission.pubIds.map(pubId => {
      const pub = allPubs.find(p => p.id === pubId);
      const hasVisited = this.isJoined() ? this.dataAggregatorService.hasVisitedPub(pubId) : false;

      return {
        id: pubId,
        pub: pub || null,
        name: pub?.name || 'Unknown Pub',
        hasVisited,
        visitCount: hasVisited ? this.dataAggregatorService.getVisitCountForPub(pubId) : 0,
        hasCrest: !!pub?.carpetUrl
      };
    });

    return {
      pubCount: mission.pubIds.length,
      pubs: pubDetails,
      completedCount: pubDetails.filter(p => p.hasVisited).length
    };
  });


  // ✅ No event handlers - purely presentational component
}
