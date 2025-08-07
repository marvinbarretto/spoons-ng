// src/app/check-in/ui/modal-checkin-celebration/modal-checkin-celebration.component.ts
import { Component, computed, inject, input, OnDestroy, output, signal } from '@angular/core';

import { AuthStore } from '@auth/data-access/auth.store';
import { BadgeIconComponent } from '@badges/ui/badge-icon/badge-icon.component';
import { DataAggregatorService } from '@shared/data-access/data-aggregator.service';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CheckInStore } from '../../../check-in/data-access/check-in.store';
// TODO: Re-enable LeaderboardStore when available
// import { LeaderboardStore } from '../../../leaderboard/data-access/leaderboard.store';
import { BADGE_DEFINITIONS } from '@badges/utils/badge.config';
import { ButtonSize } from '@shared/ui/button/button.params';
import { CheckInResultData } from '../../utils/check-in.models';

@Component({
  selector: 'app-modal-checkin-celebration',
  imports: [ButtonComponent, BadgeIconComponent],
  template: `
    <div class="checkin-modal-container celebration">
      <div class="checkin-modal-header">
        <h2>🎉 Check-in Success!</h2>
      </div>

      <div class="checkin-modal-body">
        <div class="celebration-content">
          <!-- Main Check-in Celebration -->
          <div class="checkin-announcement">
            <h3>
              Checked into<br />
              {{ data().pub?.name }}!
            </h3>
            @if (data().checkin?.timestamp) {
              <p class="timestamp">
                {{ formatTimestamp(data().checkin!.timestamp) }}
              </p>
            }
          </div>

          <!-- Key Progress Metrics -->
          <div class="progress-section">
            <div class="progress-grid">
              <!-- Pub Discovery Progress -->
              <div class="progress-item featured">
                <div class="progress-header">
                  <span class="progress-icon">🍺</span>
                  <span class="progress-label">Pubs Discovered</span>
                </div>
                <div class="progress-value">
                  <span class="current-count">{{ celebrationData().pubsVisited }}</span>
                  <span class="total-count">of {{ celebrationData().totalPubs }}</span>
                  @if (isFirstTimeAtPub()) {
                    <div class="achievement-badge new">+1 NEW!</div>
                  }
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" [style.width.%]="pubProgressPercentage()"></div>
                </div>
              </div>

              <!-- Total Check-ins -->
              <div class="progress-item">
                <div class="progress-header">
                  <span class="progress-icon">📍</span>
                  <span class="progress-label">Total Check-ins</span>
                </div>
                <div class="progress-value">
                  <span class="current-count">{{ celebrationData().totalCheckins }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Pub-specific Milestones -->
          <div class="milestones-section">
            @if (isFirstTimeAtPub()) {
              <div class="milestone first-time">
                <span class="milestone-icon">🎆</span>
                <span class="milestone-text">First visit to {{ data().pub?.name }}!</span>
              </div>
            } @else {
              <div class="milestone return-visit">
                <span class="milestone-icon">🔄</span>
                <span class="milestone-text">
                  {{ getCurrentPubCheckinsCount()
                  }}{{ getOrdinalSuffix(getCurrentPubCheckinsCount()) }} visit to
                  {{ data().pub?.name }}
                </span>
              </div>
            }

            <!-- Streak Info -->
            @if (consecutiveDaysCount() > 1) {
              <div class="milestone streak">
                <span class="milestone-icon">🔥</span>
                <span class="milestone-text">
                  {{ consecutiveDaysCount() }} consecutive days checked in!
                </span>
              </div>
            }

            <!-- Leaderboard Position -->
            @if (celebrationData().userRank) {
              <div class="milestone rank">
                <span class="milestone-icon">📊</span>
                <span class="milestone-text">
                  Rank #{{ celebrationData().userRank }} of
                  {{ celebrationData().totalUsers }} crawlers
                </span>
              </div>
            }
          </div>

          <!-- Badge Awards -->
          @if (hasNewBadges()) {
            <div class="badges-section">
              <h4>🏅 New Badges Earned!</h4>
              <div class="badges-grid">
                @for (badgeData of displayBadges(); track badgeData.badgeId) {
                  <div class="badge-award">
                    <div class="badge-display">
                      <app-badge-icon
                        [badge]="getBadgeDefinition(badgeData.badgeId)"
                      ></app-badge-icon>
                    </div>
                    <div class="badge-info">
                      <span class="badge-name">{{ badgeData.name }}</span>
                      @if (getBadgeDefinition(badgeData.badgeId)?.description) {
                        <span class="badge-description">
                          {{ getBadgeDefinition(badgeData.badgeId)?.description }}
                        </span>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </div>

      <div class="checkin-modal-footer">
        @if (!autoAdvanceComplete()) {
          <div class="skip-link">
            <button type="button" class="skip-text-link" (click)="handleSkip()">
              Skip ({{ countdown() }}s)
            </button>
          </div>
        }
        <div class="main-action">
          <app-button
            variant="primary"
            [size]="ButtonSize.LARGE"
            [fullWidth]="true"
            (onClick)="handleContinue()"
          >
            {{ autoAdvanceComplete() ? 'Continue' : 'See Points Details' }}
          </app-button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      @use 'styles/components/check-in-modals';
      .checkin-modal-header {
        background: linear-gradient(135deg, var(--success) 0%, var(--accent) 100%);
        color: white;
        border-radius: 8px 8px 0 0;
      }

      .checkin-modal-header h2 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 700;
      }

      .celebration-content {
        text-align: center;
      }

      /* Check-in Announcement */
      .checkin-announcement {
        margin-bottom: 1.5rem;
      }

      .checkin-announcement h3 {
        margin: 0 0 0.5rem 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--text);
      }

      .timestamp {
        margin: 0;
        font-size: 0.875rem;
        color: var(--text-secondary);
      }

      /* Progress Section */
      .progress-section {
        margin-bottom: 1.5rem;
      }

      .progress-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }

      .progress-item {
        background: var(--background-lighter);
        border-radius: 8px;
        padding: 1rem;
        border: 1px solid var(--border);
        position: relative;
      }

      .progress-item.featured {
        background: linear-gradient(
          135deg,
          rgba(40, 167, 69, 0.1) 0%,
          rgba(32, 201, 151, 0.1) 100%
        );
        border-color: var(--success);
      }

      .progress-header {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
        text-align: center;
      }

      .progress-icon {
        font-size: 1.25rem;
      }

      .progress-label {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .progress-value {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
        position: relative;
        text-align: center;
      }

      .current-count {
        font-size: 2.25rem;
        font-weight: 700;
        color: var(--success);
      }

      .total-count {
        font-size: 1.125rem;
        color: var(--text-secondary);
        font-weight: 500;
      }

      .achievement-badge {
        position: absolute;
        top: -8px;
        right: -8px;
        background: var(--warning);
        color: var(--background);
        font-size: 0.6rem;
        font-weight: bold;
        padding: 0.125rem 0.25rem;
        border-radius: 4px;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        animation: pulse-badge 2s ease-in-out infinite;
      }

      .progress-bar {
        width: 100%;
        height: 6px;
        background: var(--background-darker);
        border-radius: 3px;
        overflow: hidden;
      }

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--success), var(--accent));
        border-radius: 3px;
        transition: width 0.8s ease-out;
      }

      /* Milestones Section */
      .milestones-section {
        margin-bottom: 1.5rem;
      }

      .milestone {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem;
        margin-bottom: 0.5rem;
        background: var(--background-lighter);
        border-radius: 6px;
        border-left: 3px solid var(--success);
        text-align: left;
      }

      .milestone.first-time {
        background: linear-gradient(135deg, rgba(255, 193, 7, 0.2) 0%, rgba(255, 152, 0, 0.2) 100%);
        border-left-color: var(--warning);
      }

      .milestone.streak {
        border-left-color: #fd7e14;
      }

      .milestone.rank {
        border-left-color: #007bff;
      }

      .milestone-icon {
        font-size: 1.25rem;
        flex-shrink: 0;
      }

      .milestone-text {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--text);
      }

      /* Badges Section */
      .badges-section {
        background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 1rem;
        color: #333;
      }

      .badges-section h4 {
        margin: 0 0 0.75rem 0;
        font-size: 1rem;
        text-align: center;
      }

      .badges-grid {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .badge-award {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: rgba(255, 255, 255, 0.9);
        padding: 0.5rem;
        border-radius: 6px;
        text-align: left;
      }

      .badge-name {
        display: block;
        font-weight: bold;
        font-size: 0.875rem;
        margin-bottom: 0.125rem;
      }

      .badge-description {
        display: block;
        font-size: 0.75rem;
        color: #666;
      }

      .skip-link {
        text-align: center;
        margin-bottom: 0.75rem;
      }

      .skip-text-link {
        background: none;
        border: none;
        color: var(--text-secondary);
        font-size: 0.875rem;
        cursor: pointer;
        text-decoration: underline;
        padding: 0.25rem 0.5rem;
        transition: color 0.2s ease;
      }

      .skip-text-link:hover {
        color: var(--text);
      }

      .main-action {
        width: 100%;
      }

      /* Animations */
      @keyframes pulse-badge {
        0%,
        100% {
          transform: scale(1);
          opacity: 1;
        }
        50% {
          transform: scale(1.05);
          opacity: 0.9;
        }
      }

      /* Mobile Responsive */
      @media (max-width: 480px) {
        .progress-grid {
          gap: 0.75rem;
        }

        .current-count {
          font-size: 2rem;
        }

        .skip-link {
          margin-bottom: 0.5rem;
        }
      }
    `,
  ],
})
export class ModalCheckinCelebrationComponent implements OnDestroy {
  readonly ButtonSize = ButtonSize;

  // Inputs
  readonly data = input.required<CheckInResultData>();

  // Outputs
  readonly continue = output<void>();
  readonly skip = output<void>();

  // Store injections
  protected readonly checkinStore = inject(CheckInStore);
  protected readonly authStore = inject(AuthStore);
  protected readonly dataAggregatorService = inject(DataAggregatorService);
  // TODO: Re-enable LeaderboardStore when available
  // protected readonly leaderboardStore = inject(LeaderboardStore);

  // Auto-advance timer state
  private readonly _countdown = signal(8); // 8 second default
  private readonly _autoAdvanceComplete = signal(false);
  private countdownInterval?: number;

  readonly countdown = this._countdown.asReadonly();
  readonly autoAdvanceComplete = this._autoAdvanceComplete.asReadonly();

  constructor() {
    // Start countdown timer
    this.startCountdown();
  }

  // Optimized celebration data using existing reactive stores
  readonly celebrationData = computed(() => {
    const scoreboard = this.dataAggregatorService.scoreboardData();
    // TODO: Re-enable when LeaderboardStore is available
    // const userRank = this.leaderboardStore.userRankByPoints() || null;
    // const leaderboardData = this.leaderboardStore.data() || [];
    const userRank = null; // Placeholder until LeaderboardStore is available
    const leaderboardData: any[] = []; // Placeholder until LeaderboardStore is available

    return {
      pubsVisited: scoreboard.pubsVisited,
      totalPubs: scoreboard.totalPubs,
      totalCheckins: scoreboard.totalCheckins,
      totalPoints: scoreboard.totalPoints,
      userRank: userRank,
      totalUsers: leaderboardData.length || null,
      isLoading: scoreboard.isLoading,
    };
  });

  readonly pubProgressPercentage = computed(() => {
    const data = this.celebrationData();
    if (data.totalPubs === 0) return 0;
    return Math.min((data.pubsVisited / data.totalPubs) * 100, 100);
  });

  // Check-in specific data
  readonly isFirstTimeAtPub = computed(() => {
    const userId = this.authStore.uid();
    const pubId = this.data().pub?.id;

    if (!userId || !pubId) return false;

    const allCheckins = this.checkinStore.checkins();
    const pubCheckins = allCheckins.filter(c => c.userId === userId && c.pubId === pubId);

    return pubCheckins.length === 1; // Only this check-in
  });

  readonly getCurrentPubCheckinsCount = computed(() => {
    const userId = this.authStore.uid();
    const pubId = this.data().pub?.id;

    if (!userId || !pubId) return 0;

    const allCheckins = this.checkinStore.checkins();
    return allCheckins.filter(c => c.userId === userId && c.pubId === pubId).length;
  });

  readonly consecutiveDaysCount = computed(() => {
    // TODO: Implement streak calculation
    return 0;
  });

  readonly hasNewBadges = computed(() => this.data().badges && this.data().badges!.length > 0);

  readonly displayBadges = computed(() => this.data().badges || []);

  // Event handlers
  handleContinue(): void {
    this.clearCountdown();
    this.continue.emit();
  }

  handleSkip(): void {
    this.clearCountdown();
    this.skip.emit();
  }

  // Auto-advance functionality
  private startCountdown(): void {
    this.countdownInterval = window.setInterval(() => {
      const current = this._countdown();
      if (current <= 1) {
        this._autoAdvanceComplete.set(true);
        this.clearCountdown();
        // Auto-advance to next modal
        setTimeout(() => this.handleContinue(), 500);
      } else {
        this._countdown.set(current - 1);
      }
    }, 1000);
  }

  private clearCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = undefined;
    }
  }

  ngOnDestroy(): void {
    this.clearCountdown();
  }

  // Utility methods
  formatTimestamp(timestamp: any): string {
    if (!timestamp) return '';

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString();
    } catch {
      return 'Just now';
    }
  }

  getOrdinalSuffix(num: number): string {
    const lastDigit = num % 10;
    const lastTwoDigits = num % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
      return 'th';
    }

    switch (lastDigit) {
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
    }
  }

  getBadgeDefinition(badgeId: string) {
    return BADGE_DEFINITIONS.find(b => b.id === badgeId);
  }
}
