// src/app/missions/ui/mission-card/mission-card.component.ts
import { Component, computed, inject, input, output } from '@angular/core';

import { PubStore } from '../../../pubs/data-access/pub.store';
import { DataAggregatorService } from '../../../shared/data-access/data-aggregator.service';
import type { Mission } from '../../utils/mission.model';
import { PubChipComponent } from '../pub-chip/pub-chip.component';

@Component({
  selector: 'app-mission-card',
  imports: [PubChipComponent],
  template: `
    <article
      class="refined-mission-card"
      [class.joined]="isJoined()"
      [class.featured]="mission().featured"
      [class.clickable]="clickable()"
      [class.compact]="variant() === 'compact' || variant() === 'widget'"
      [class.widget]="variant() === 'widget'"
      [attr.aria-labelledby]="'mission-title-' + mission().id"
      role="article"
      (click)="onClick()"
    >
      <!-- Status Indicator Zone -->
      <div class="mission-status-zone">
        <div class="status-indicator">
          @if (isJoined()) {
            <div class="status-content" aria-hidden="true">
              <span class="status-icon">🎯</span>
              <span class="status-label">Active</span>
            </div>
          } @else {
            <div class="status-content" aria-hidden="true">
              <span class="status-icon">⭐</span>
              <span class="status-label">Join</span>
            </div>
          }
        </div>
      </div>

      <!-- Mission Details Zone -->
      <div class="mission-details-zone">
        <!-- Header Section -->
        <header class="card-header">
          <div class="title-section">
            <h3 class="mission-title" [id]="'mission-title-' + mission().id">
              @if (mission().emoji) {
                <span class="mission-emoji" aria-hidden="true">{{ mission().emoji }}</span>
              }
              {{ mission().name }}
              @if (mission().featured) {
                <span
                  class="featured-indicator"
                  aria-label="Featured mission"
                  title="Featured mission"
                >
                  ⭐
                </span>
              }
            </h3>

            <!-- Refined meta badges -->
            <div class="mission-meta">
              @if (mission().difficulty) {
                <span class="meta-tag difficulty-{{ mission().difficulty }}">{{
                  mission().difficulty
                }}</span>
              }
              @if (mission().category) {
                <span class="meta-tag category-tag">{{ mission().category }}</span>
              }
            </div>
          </div>

          <!-- Progress indicator for joined missions -->
          @if (isJoined() && progress() !== null) {
            <div class="progress-badge">
              <span class="progress-percentage">{{ progressPercentage() }}%</span>
            </div>
          }
        </header>

        <!-- Content Section -->
        <div class="card-content">
          <p class="mission-description">{{ mission().description }}</p>

          <!-- Essential stats only -->
          <div class="mission-stats">
            <div class="stat-item">
              <span class="stat-label">Pubs</span>
              <span class="stat-value">{{ mission().pubIds.length }}</span>
            </div>

            @if (mission().pointsReward) {
              <div class="stat-item stat-item--reward">
                <span class="stat-label">Points</span>
                <span class="stat-value stat-value--points">{{ mission().pointsReward }}</span>
              </div>
            }

            @if (isJoined() && progress() !== null) {
              <div class="stat-item">
                <span class="stat-label">Progress</span>
                <span class="stat-value">{{ progress() }}/{{ mission().pubIds.length }}</span>
              </div>
            }
          </div>

          <!-- Refined pub list -->
          @if (showPubDetails() && missionPubs().pubs.length > 0) {
            <div class="mission-pubs">
              <details class="pub-list">
                <summary class="pub-list-toggle">
                  <span class="pub-count">{{ missionPubs().pubs.length }} pubs</span>
                  <span class="toggle-icon" aria-hidden="true">▼</span>
                </summary>
                <div class="pub-list-content">
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

        <!-- Progress bar for active missions -->
        @if (isJoined() && progress() !== null && progressPercentage() > 0) {
          <div class="mission-progress">
            <div class="progress-track">
              <div class="progress-fill" [style.width.%]="progressPercentage()"></div>
            </div>
          </div>
        }
      </div>

      <!-- Actions -->
      <div class="mission-actions">
        <ng-content select="[slot=actions]"></ng-content>
      </div>
    </article>
  `,
  styles: `
    /* ===== REFINED MISSION CARD - MOBILE FIRST ===== */

    .refined-mission-card {
      position: relative;
      display: flex;
      gap: 0;
      padding: 0;

      /* Sophisticated styling inspired by pub card */
      background: var(--background-lighter);
      border: 1px solid var(--border);
      border-radius: 8px;
      box-shadow: 0 1px 2px var(--shadow);

      /* Elegant proportions */
      min-height: 88px;
      overflow: hidden;

      /* Accessibility */
      &:focus-within {
        outline: 2px solid var(--primary);
        outline-offset: 1px;
      }

      /* Clickable state */
      &.clickable {
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px var(--shadow);
          border-color: var(--primary);
        }

        &:active {
          transform: translateY(0);
        }
      }

      /* Widget variant - compact styling */
      &.widget {
        background: linear-gradient(
          135deg,
          var(--background-lighter) 0%,
          var(--background-lightest) 100%
        );
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        border-width: 2px;
        border-color: var(--border-strong);
        min-height: 80px;

        &:hover {
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        }
      }

      /* Compact variant */
      &.compact {
        min-height: 72px;
        border-radius: 6px;
      }
    }

    /* ===== REFINED SPLIT ZONES (LIKE PUB CARD) ===== */

    .mission-status-zone {
      flex-shrink: 0;
      width: 72px;
      display: flex;
      align-items: center;
      justify-content: center;

      /* Refined styling */
      background: var(--background-darker);
      border-right: 1px solid var(--border);
      border-radius: 6px 0 0 6px;

      /* Mobile padding */
      padding: 1rem 0;

      /* Default unjoined state */
      color: var(--text-muted);
    }

    .mission-details-zone {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.875rem;

      text-decoration: none;
      color: inherit;
      min-width: 0; /* Prevent overflow */
    }

    /* ===== STATUS INDICATOR (REFINED) ===== */

    .status-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;

      .status-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.25rem;

        .status-icon {
          font-size: 1.125rem;
        }

        .status-label {
          font-size: 0.625rem;
          font-weight: 500;
          line-height: 1;
          text-align: center;
          white-space: nowrap;
          letter-spacing: 0.02em;
        }
      }
    }

    /* ===== SOPHISTICATED STATE TREATMENTS ===== */

    .refined-mission-card.joined {
      background: var(--background-lightest);
      border-color: var(--success);

      .mission-status-zone {
        background: var(--success);
        color: white;
        border-right-color: var(--success);

        .status-content .status-label {
          color: white;
          font-weight: 500;
        }
      }

      .mission-title {
        font-weight: 500;
        color: var(--text);
      }
    }

    .refined-mission-card.featured {
      border-color: var(--warning);

      .mission-status-zone {
        background: var(--warning);
        color: white;
        border-right-color: var(--warning);

        .status-content .status-label {
          color: white;
          font-weight: 500;
        }
      }
    }

    /* ===== REFINED HEADER LAYOUT ===== */

    .card-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
    }

    .title-section {
      flex: 1;
      min-width: 0;
    }

    .mission-title {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 500;
      line-height: 1.3;
      color: var(--text);
      font-family: 'Fredoka', sans-serif;

      display: flex;
      align-items: center;
      gap: 0.5rem;

      /* Prevent overflow */
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .mission-emoji {
      font-size: 1.25rem;
      flex-shrink: 0;
    }

    .featured-indicator {
      color: var(--warning);
      flex-shrink: 0;
      font-size: 0.875rem;
    }

    /* ===== REFINED META TAGS (LESS IS MORE) ===== */

    .mission-meta {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.375rem;
    }

    .meta-tag {
      font-size: 0.6875rem;
      padding: 0.1875rem 0.375rem;
      border-radius: 4px;
      font-weight: 500;
      background: var(--background-darker);
      color: var(--text-secondary);
      border: 1px solid var(--border);

      /* Refined difficulty colors */
      &.difficulty-easy {
        color: var(--success);
        border-color: var(--success);
      }

      &.difficulty-medium {
        color: var(--warning);
        border-color: var(--warning);
      }

      &.difficulty-hard {
        color: var(--error);
        border-color: var(--error);
      }

      &.category-tag {
        color: var(--primary);
        border-color: var(--primary);
      }
    }

    /* ===== PROGRESS BADGE ===== */

    .progress-badge {
      display: flex;
      align-items: center;
      padding: 0.25rem 0.5rem;
      background: var(--success);
      color: white;
      border-radius: 8px;
      font-size: 0.75rem;
      font-weight: 500;
      white-space: nowrap;
    }

    /* ===== REFINED CONTENT SECTION ===== */

    .card-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .mission-description {
      margin: 0;
      font-size: 0.875rem;
      color: var(--text-secondary);
      line-height: 1.4;

      /* Elegant text overflow */
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* ===== REFINED STATS (HORIZONTAL LAYOUT) ===== */

    .mission-stats {
      display: flex;
      gap: 1rem;
      align-items: flex-end;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;

      .stat-label {
        font-size: 0.6875rem;
        color: var(--text-muted);
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.02em;
      }

      .stat-value {
        font-size: 0.875rem;
        color: var(--text);
        font-weight: 600;
      }
    }

    .stat-item--reward {
      .stat-value--points {
        color: var(--primary);
        font-weight: 700;
      }
    }

    /* ===== REFINED PUB LIST ===== */

    .mission-pubs {
      margin-top: 0.5rem;
    }

    .pub-list {
      border: none;
      margin: 0;
      padding: 0;
    }

    .pub-list-toggle {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0.75rem;
      background: var(--background-darker);
      border: 1px solid var(--border);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
      list-style: none;

      &::-webkit-details-marker {
        display: none;
      }

      &:hover {
        background: var(--background-darkest);
      }
    }

    .pub-count {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text-secondary);
    }

    .toggle-icon {
      font-size: 0.6875rem;
      color: var(--text-muted);
      transition: transform 0.15s ease;
    }

    .pub-list[open] .toggle-icon {
      transform: rotate(180deg);
    }

    .pub-list-content {
      padding-top: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    /* ===== REFINED PROGRESS INDICATOR ===== */

    .mission-progress {
      margin-top: 0.5rem;
    }

    .progress-track {
      height: 3px;
      background: var(--border);
      border-radius: 2px;
      overflow: hidden;
      position: relative;
    }

    .progress-fill {
      height: 100%;
      background: var(--success);
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 2px;
    }

    /* ===== ACTIONS SECTION ===== */

    .mission-actions {
      display: flex;
      gap: 0.5rem;
      padding: 0.75rem;
      border-top: 1px solid var(--border);

      &:empty {
        display: none;
      }
    }

    /* ===== TABLET+ ENHANCEMENTS (768px+) ===== */

    @media (min-width: 768px) {
      .refined-mission-card {
        border-radius: 12px;
        box-shadow: 0 1px 3px var(--shadow);
        min-height: 96px;
      }

      .mission-status-zone {
        width: 80px;
        padding: 1.125rem 0;
        border-radius: 8px 0 0 8px;
      }

      .mission-details-zone {
        gap: 0.625rem;
        padding: 1rem;
      }

      .mission-title {
        font-size: 1.25rem;
      }

      .status-indicator .status-content {
        gap: 0.3125rem;

        .status-icon {
          font-size: 1.25rem;
        }

        .status-label {
          font-size: 0.6875rem;
        }
      }
    }

    /* ===== ACCESSIBILITY & MOTION ===== */

    @media (prefers-reduced-motion: reduce) {
      .refined-mission-card,
      .refined-mission-card.clickable,
      .progress-fill,
      .toggle-icon {
        transition: none;
        animation: none;
      }

      .refined-mission-card.clickable:hover,
      .refined-mission-card.clickable:active {
        transform: none;
      }
    }

    @media (prefers-contrast: high) {
      .refined-mission-card {
        border-width: 2px;
      }
    }
  `,
})
export class MissionCardComponent {
  // ✅ Dependency injection
  protected readonly dataAggregatorService = inject(DataAggregatorService);
  protected readonly pubStore = inject(PubStore);

  // ✅ Required inputs
  readonly mission = input.required<Mission>();

  // ✅ Optional inputs with defaults
  readonly isJoined = input<boolean>(false);
  readonly progress = input<number | null>(null);
  readonly variant = input<'default' | 'compact' | 'widget'>('default');
  readonly clickable = input<boolean>(false);
  readonly showPubDetails = input<boolean>(true);

  // ✅ Optional outputs for widget/clickable variants
  readonly missionClick = output<Mission>();

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
        hasCrest: !!pub?.carpetUrl,
      };
    });

    return {
      pubCount: mission.pubIds.length,
      pubs: pubDetails,
      completedCount: pubDetails.filter(p => p.hasVisited).length,
    };
  });

  // ✅ Event handlers for clickable variants
  protected onClick(): void {
    if (this.clickable()) {
      this.missionClick.emit(this.mission());
    }
  }
}
