// src/app/check-in/ui/modal-checkin-success/modal-checkin-success.component.ts
import { Component, inject, input, output, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { BadgeIconComponent } from '@badges/ui/badge-icon/badge-icon.component';
import { CheckInStore } from '../../../check-in/data-access/check-in.store';
import { AuthStore } from '@auth/data-access/auth.store';
import { PubStore } from '@pubs/data-access/pub.store';
import { CarpetStorageService } from '@carpets/data-access/carpet-storage.service';
import { BADGE_DEFINITIONS } from '@badges/utils/badge.config';
import { ButtonVariant } from '@shared/ui/button/button.params';
import { environment } from '../../../../environments/environment';
import { CheckInResultData } from '../../utils/check-in.models';

type PointsBreakdownItem = {
  type: string;
  points: number;
  description: string;
  icon: string;
  color: string;
};

@Component({
  selector: 'app-modal-checkin-success',
  imports: [CommonModule, ButtonComponent, BadgeIconComponent],
  template: `
    <div class="modal-container" [class.success]="data().success">
      <div class="modal-header">
        <h2>{{ title() }}</h2>
      </div>

      <div class="modal-body">
        @if (data().success) {
          <div class="success-content">
            <!-- Main Success Icon -->
            <!-- <div class="main-icon">✅</div> -->

            <!-- Basic Check-in Info -->
            <div class="basic-info">
              <p><strong>Checked into {{ data().pub?.name }}!</strong></p>
              @if (data().checkin?.timestamp) {
                <p class="timestamp">
                  {{ formatTimestamp(data().checkin!.timestamp) }}
                </p>
              }
            </div>

            <!-- Personalized Stats Section -->
            <div class="personalized-stats">
              <div class="stats-grid">
                <div class="stat-item featured-stat">
                  <span class="stat-number">{{ totalPubsCount() }}</span>
                  <span class="stat-label">Pubs Discovered</span>
                  @if (isFirstTimeAtPub()) {
                    <div class="stat-badge">+1 NEW!</div>
                  }
                </div>

                <div class="stat-item">
                  <span class="stat-number">{{ totalCheckinsCount() }}</span>
                  <span class="stat-label">Total Check-ins</span>
                </div>
              </div>

              <!-- Pub-specific info -->
              <div class="pub-specific">
                @if (isFirstTimeAtPub()) {
                  <p class="milestone first-time">🎉 First visit to {{ data().pub?.name }}!</p>
                } @else {
                  <p class="milestone">
                    {{ getCurrentPubCheckinsCount() }}{{ getOrdinalSuffix(getCurrentPubCheckinsCount()) }}
                    visit to {{ data().pub?.name }}
                  </p>
                }
              </div>

              <!-- Consecutive days (if applicable) -->
              @if (consecutiveDaysCount() > 1) {
                <div class="consecutive-days">
                  <p class="milestone">
                    🔥 {{ consecutiveDaysCount() }} consecutive days checked in!
                  </p>
                </div>
              }
            </div>

            <!-- Points Breakdown Section with Suspense -->
            @if (pointsBreakdown().length > 0 || totalPointsEarned() > 0) {
              @defer (on timer(1500ms)) {
                <div class="points-section">
                  <h3>🏆 Points Earned</h3>
                  <div class="points-table">
                    @for (item of pointsBreakdown(); track item.type; let i = $index) {
                      <div
                        class="points-row animate"
                        [style.animation-delay]="getAnimationDelay(i)"
                      >
                        <div class="points-icon" [style.color]="item.color">
                          {{ item.icon }}
                        </div>
                        <div class="points-description">
                          {{ item.description }}
                        </div>
                        <div class="points-value" [style.color]="item.color">
                          +{{ item.points }}
                        </div>
                      </div>
                    }

                    @if (totalPointsEarned() > 0) {
                      <div class="points-total animate">
                        <div class="total-label">Total Points</div>
                        <div class="total-value">{{ totalPointsEarned() }}</div>
                      </div>
                    }
                  </div>
                </div>
              } @placeholder (minimum 1200ms) {
                <div class="points-calculating">
                  <div class="calculating-icon">🧮</div>
                  <div class="calculating-text">
                    Calculating points<span class="calculating-dots">
                      <span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>
                    </span>
                  </div>
                  <div class="calculating-bar">
                    <div class="calculating-progress"></div>
                  </div>
                </div>
              }
            }

            <!-- Badges Section -->
            @if (hasNewBadges()) {
              <div class="badges-section">
                <h3>🏅 New Badges Earned!</h3>
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
        } @else {
          <div class="error-content">
            <div class="main-icon">❌</div>
            <p><strong>{{ data().error || 'Check-in failed' }}</strong></p>
          </div>
        }
      </div>

      <div class="modal-footer">
        <div class="button-group">
          <app-button
            [variant]="ButtonVariant.PRIMARY"
            [fullWidth]="true"
            (onClick)="handleDismiss()"
          >
            OK
          </app-button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @use 'styles/index' as *;

    // ===================================
    // ⏱️ POINTS ANIMATION TIMING CONFIG
    // ===================================

    // 🎯 Adjust these values to control animation speed:
    // - Increase for slower, more dramatic reveals
    // - Decrease for snappier, quicker animations

    // Suspense timing (for building anticipation)
    $suspense-calculation-delay: 1500ms;  // How long to show "Calculating..."
    $suspense-minimum-show: 1200ms;      // Minimum time for placeholder

    // Individual point row animations
    $points-row-duration: 0.6s;        // How long each row takes to slide in
    $points-row-stagger: 0.15s;        // Delay between each row appearing

    // Total points summary animation
    $points-total-delay: 0.8s;         // When total appears after rows start
    $points-total-duration: 0.6s;      // How long total takes to pop in

    // Value pulsing animation
    $points-pulse-duration: 2s;        // Speed of the pulsing number effect

    // Badge animations
    $badge-pulse-duration: 1.5s;       // Speed of badge pulsing

    .modal-container {
      background: var(--background);
      border: 1px solid var(--background-darker);
      border-radius: 8px;
      max-width: 420px;
      width: 100%;
    }

    .modal-container.success {
      border-color: #28a745;
    }

    .modal-header, .modal-body, .modal-footer {
      padding: 0.25rem;
    }

    .modal-header {
      border-bottom: 1px solid var(--background-lighter);
      text-align: center;
      padding: 0.375rem;
    }

    .modal-header h2 {
      margin: 0;
      color: var(--textPrimary);
      font-size: 1.25rem;
    }

    .modal-footer {
      border-top: 1px solid var(--background-lighter);
      padding: 0.25rem;
    }

    .main-icon {
      font-size: 1.5rem;
      text-align: center;
      margin-bottom: 0.25rem;
    }

    .success-content {
      text-align: center;
    }

    .basic-info {
      margin-bottom: 0.25rem;
    }

    .basic-info p {
      margin: 0.25rem 0;
    }

    .timestamp {
      font-size: 0.85rem;
      color: var(--text-secondary);
    }

    /* Personalized Stats Section */
    .personalized-stats {
      background: var(--background-lighter);
      border-radius: 6px;
      padding: 0.5rem;
      margin: 0.25rem 0;
      text-align: left;
    }

    .personalized-stats h3 {
      margin: 0 0 0.25rem 0;
      color: var(--textPrimary);
      font-size: 0.9rem;
      text-align: center;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.25rem;
      margin-bottom: 0.25rem;
    }

    .stat-item {
      text-align: center;
      padding: 0.375rem;
      background: var(--background);
      border-radius: 4px;
      border: 1px solid var(--background-darker);
      position: relative;
    }

    .stat-item.featured-stat {
      background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
      color: white;
      border: 1px solid #1e7e34;
      box-shadow: 0 2px 4px rgba(40, 167, 69, 0.3);
    }

    .stat-icon {
      font-size: 1.5rem;
      margin-bottom: 0.25rem;
      display: block;
    }

    .stat-badge {
      position: absolute;
      top: -8px;
      right: -8px;
      background: #ffc107;
      color: #000;
      font-size: 0.6rem;
      font-weight: bold;
      padding: 0.125rem 0.25rem;
      border-radius: 4px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.2);
      @include pulse($badge-pulse-duration);
    }

    .stat-number {
      display: block;
      font-size: 1.25rem;
      font-weight: bold;
      color: #28a745;
      margin-bottom: 0.125rem;
    }

    .featured-stat .stat-number {
      color: white;
      font-size: 1.5rem;
    }

    .stat-label {
      display: block;
      font-size: 0.7rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .pub-specific, .consecutive-days {
      text-align: center;
      margin: 0.125rem 0;
    }

    .milestone {
      font-weight: 600;
      color: var(--textPrimary);
      margin: 0.125rem 0;
      padding: 0.25rem;
      background: rgba(40, 167, 69, 0.1);
      border-radius: 4px;
      border-left: 3px solid #28a745;
      font-size: 0.85rem;
    }

    .milestone.first-time {
      background: linear-gradient(135deg, rgba(255, 193, 7, 0.2) 0%, rgba(255, 152, 0, 0.2) 100%);
      border-left: 3px solid #ffc107;
      color: #856404;
      font-weight: 700;
    }

    /* Badges Section */
    .badges-section {
      background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
      border-radius: 6px;
      padding: 0.75rem;
      margin: 0.5rem 0;
      color: #333;
    }

    .badges-section h3 {
      margin: 0 0 0.5rem 0;
      text-align: center;
      font-size: 1rem;
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

    .badge-display {
      flex-shrink: 0;
    }

    .badge-info {
      flex: 1;
    }

    .badge-name {
      display: block;
      font-weight: bold;
      font-size: 0.9rem;
      color: #333;
      margin-bottom: 0.125rem;
    }

    .badge-description {
      display: block;
      font-size: 0.8rem;
      color: #666;
      line-height: 1.2;
    }

    .error-content {
      text-align: center;
      color: #dc3545;
    }

    .button-group {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
    }


    @media (max-width: 480px) {
      .modal-header, .modal-body, .modal-footer {
        padding: 0.75rem;
      }

      .modal-header {
        padding: 0.5rem 0.75rem;
      }

      .modal-footer {
        padding: 0.5rem 0.75rem;
      }

      .stats-grid {
        grid-template-columns: 1fr;
        gap: 0.5rem;
      }

      .button-group {
        flex-direction: column;
        gap: 0.5rem;
      }

      .badge-award {
        flex-direction: row;
        text-align: left;
        gap: 0.5rem;
        padding: 0.5rem;
      }

      .main-icon {
        font-size: 2rem;
        margin-bottom: 0.5rem;
      }

      .carpet-image {
        max-width: 120px;
        max-height: 120px;
      }

      .points-section {
        padding: 0.5rem;
        margin: 0.375rem 0;
      }

      .points-row {
        grid-template-columns: 1.5rem 1fr auto;
        gap: 0.375rem;
        padding: 0.25rem 0.375rem;
      }

      .points-icon {
        font-size: 1rem;
      }

      .points-description {
        font-size: 0.8rem;
      }

      .points-value {
        font-size: 0.8rem;
      }

      .points-total {
        padding: 0.375rem;
        font-size: 0.85rem;
      }

      .total-value {
        font-size: 1rem;
      }
    }

    /* Carpet Section Styles */
    .carpet-section {
      margin: 0.25rem 0;
      padding: 0;
      background: transparent;
      border-radius: 6px;
    }


    .carpet-display {
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .carpet-image {
      max-width: 120px;
      max-height: 120px;
      width: auto;
      height: auto;
      border-radius: 6px;
      border: 1px solid var(--border);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }

    .carpet-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1rem;
      color: var(--text-muted);
    }

    .carpet-placeholder span {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }

    .carpet-placeholder p {
      margin: 0;
      font-size: 0.875rem;
      text-align: center;
    }

    /* Points Breakdown Section */
    .points-section {
      background: linear-gradient(135deg, var(--background-lighter) 0%, var(--background) 100%);
      border-radius: 6px;
      padding: 0.5rem;
      margin: 0.25rem 0;
      border: 1px solid var(--border);
    }

    .points-section h3 {
      margin: 0 0 0.25rem 0;
      color: var(--text);
      font-size: 0.9rem;
      font-weight: 600;
      text-align: center;
    }

    .points-table {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .points-row {
      display: grid;
      grid-template-columns: 2rem 1fr auto;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0.5rem;
      background: var(--background-darkest);
      border-radius: 6px;
      border: 1px solid var(--border);

      // Slide up animation for each row
      &.animate {
        @include slide-up($duration: $points-row-duration);
      }
    }

    .points-icon {
      font-size: 1.2rem;
      text-align: center;
    }

    .points-description {
      font-size: 0.875rem;
      color: var(--text);
      font-weight: 500;
    }

    .points-value {
      font-size: 0.875rem;
      font-weight: bold;
      text-align: right;
    }

    .points-total {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem;
      margin-top: 0.25rem;
      background: linear-gradient(135deg, var(--success) 0%, var(--accent) 100%);
      color: var(--accent-contrast);
      border-radius: 6px;
      font-weight: bold;

      // Pop in animation with delay
      &.animate {
        @include pop-in($duration: $points-total-duration, $delay: $points-total-delay);
      }
    }

    .total-label {
      font-size: 0.9rem;
    }

    .total-value {
      font-size: 1.1rem;
      text-align: right;
    }

    .total-value {
      @include pulse($points-pulse-duration);
    }

    // ===================================
    // 🧮 CALCULATING POINTS ANIMATION
    // ===================================

    .points-calculating {
      text-align: center;
      padding: 2rem 1rem;
      background: linear-gradient(135deg, var(--background-lighter) 0%, var(--background) 100%);
      border-radius: 6px;
      margin: 0.25rem 0;
      border: 1px solid var(--border);

      @include fade-in();
    }

    .calculating-icon {
      font-size: 2rem;
      margin-bottom: 0.5rem;
      @include pulse(1.5s);
    }

    .calculating-text {
      font-size: 1rem;
      color: var(--text);
      font-weight: 600;
      margin-bottom: 1rem;
    }

    .calculating-dots {
      display: inline-block;

      .dot {
        animation: calculating-dot-fade 1.5s infinite;

        &:nth-child(1) { animation-delay: 0s; }
        &:nth-child(2) { animation-delay: 0.3s; }
        &:nth-child(3) { animation-delay: 0.6s; }
      }
    }

    .calculating-bar {
      width: 200px;
      height: 4px;
      background: var(--background-darker);
      border-radius: 2px;
      margin: 0 auto;
      overflow: hidden;
      position: relative;
    }

    .calculating-progress {
      height: 100%;
      background: linear-gradient(90deg, var(--success), var(--accent));
      border-radius: 2px;
      animation: calculating-progress 1.2s ease-in-out infinite;
      transform-origin: left;
    }

    // Calculating animations
    @keyframes calculating-dot-fade {
      0%, 60% { opacity: 0.3; }
      30% { opacity: 1; }
      100% { opacity: 0.3; }
    }

    @keyframes calculating-progress {
      0% { transform: scaleX(0); }
      50% { transform: scaleX(0.6); }
      100% { transform: scaleX(1); }
    }
  `]
})
export class ModalCheckinSuccessComponent {
  protected readonly ButtonVariant = ButtonVariant;

  // Inputs
  readonly data = input.required<CheckInResultData>();
  readonly UserExperienceLevel = input<string>('');

  // Outputs
  readonly navigate = output<void>();
  readonly dismiss = output<void>();
  readonly nextModal = output<void>();

  // Store injections
  private readonly checkinStore = inject(CheckInStore);
  private readonly authStore = inject(AuthStore);
  private readonly pubStore = inject(PubStore);
  private readonly carpetStorageService = inject(CarpetStorageService);

  // Carpet image state
  private readonly _carpetImageUrl = signal<string | null>(null);
  readonly carpetImageUrl = this._carpetImageUrl.asReadonly();

  // Animation timing configuration
  readonly POINTS_ROW_STAGGER = 0.15; // seconds between each row reveal

  constructor() {
    // Debug effect to log when modal data changes
    effect(() => {
      const data = this.data();
      const allCheckins = this.checkinStore.checkins();
      const storeLoading = this.checkinStore.loading();

      console.log('[ModalCheckinSuccess] Modal data changed:', {
        success: data.success,
        pubId: data.pub?.id,
        pubName: data.pub?.name,
        carpetCaptured: data.carpetCaptured,
        carpetImageKey: data.checkin?.carpetImageKey,
        checkinId: data.checkin?.id,
        timestamp: data.checkin?.timestamp
      });

      console.log('[ModalCheckinSuccess] CheckInStore state:', {
        allCheckinsCount: allCheckins.length,
        storeLoading,
        checkinIds: allCheckins.map(c => c.id),
        storeHasLoadMethod: typeof this.checkinStore.load === 'function'
      });
    });

    // Load carpet image when data changes
    effect(() => {
      const carpetKey = this.data().checkin?.carpetImageKey;
      if (carpetKey && this.data().carpetCaptured) {
        console.log('[ModalCheckinSuccess] Loading carpet image for key:', carpetKey);
        this.loadCarpetImage(carpetKey);
      }
    });
  }

  // Computed properties for UI logic
  readonly title = computed(() =>
    this.data().success ? 'Check-in Successful!' : 'Check-in Failed'
  );


  readonly hasNewBadges = computed(() =>
    this.data().badges && this.data().badges!.length > 0
  );

  readonly displayBadges = computed(() =>
    this.data().badges || []
  );

  // Points breakdown computed properties
  readonly pointsBreakdown = computed((): PointsBreakdownItem[] => {
    const checkin = this.data().checkin;

    // If we have points but no breakdown, create a simple one
    if (checkin?.pointsEarned && !checkin.pointsBreakdown) {
      return [{
        type: 'total',
        points: checkin.pointsEarned,
        description: 'Check-in points',
        icon: '🍺',
        color: '#28a745'
      }];
    }

    if (!checkin?.pointsBreakdown) return [];

    try {
      // Parse the points breakdown string
      const breakdown = JSON.parse(checkin.pointsBreakdown);
      const items: PointsBreakdownItem[] = [];

      // Base points
      if (breakdown.base > 0) {
        items.push({
          type: 'base',
          points: breakdown.base,
          description: 'Base check-in',
          icon: '🍺',
          color: '#28a745'
        });
      }

      // Distance bonus
      if (breakdown.distance > 0) {
        items.push({
          type: 'distance',
          points: breakdown.distance,
          description: 'Distance bonus',
          icon: '📍',
          color: '#007bff'
        });
      }

      // Parse bonus points from reason string
      if (breakdown.reason && breakdown.bonus > 0) {
        const reason = breakdown.reason.toLowerCase();

        if (reason.includes('first check-in') || reason.includes('first visit')) {
          const points = reason.includes('first check-in') ? 25 : 10;
          items.push({
            type: 'first-time',
            points: points,
            description: reason.includes('first check-in') ? 'First ever check-in!' : 'First visit to pub',
            icon: '🎆',
            color: '#ffc107'
          });
        }

        if (reason.includes('photo')) {
          items.push({
            type: 'photo',
            points: 3,
            description: 'Carpet photo bonus',
            icon: '📷',
            color: '#6f42c1'
          });
        }

        if (reason.includes('streak')) {
          const streakMatch = reason.match(/(\d+)\s*(-day\s*)?streak/i);
          const streakDays = streakMatch ? parseInt(streakMatch[1]) : 0;
          const streakPoints = reason.match(/(\d+)\s+\d+-day\s*streak/i);
          const points = streakPoints ? parseInt(streakPoints[1]) : 10;

          items.push({
            type: 'streak',
            points: points,
            description: `${streakDays}-day streak bonus`,
            icon: '🔥',
            color: '#fd7e14'
          });
        }

        if (reason.includes('social')) {
          items.push({
            type: 'social',
            points: 5,
            description: 'Social share bonus',
            icon: '📱',
            color: '#20c997'
          });
        }
      }

      return items;
    } catch (error) {
      console.warn('Failed to parse points breakdown:', error);
      // Fallback to simple points display
      if (checkin?.pointsEarned) {
        return [{
          type: 'total',
          points: checkin.pointsEarned,
          description: 'Check-in points',
          icon: '🍺',
          color: '#28a745'
        }];
      }
      return [];
    }
  });

  readonly totalPointsEarned = computed(() => {
    const checkin = this.data().checkin;
    return checkin?.pointsEarned || this.pointsBreakdown().reduce((sum, item) => sum + item.points, 0);
  });

  // Personalized stats computations - now using CheckInStore's computed signals
  readonly totalCheckinsCount = computed(() => {
    const userId = this.authStore.uid();
    if (!userId) return 0;

    const allCheckins = this.checkinStore.checkins();
    const userCheckins = allCheckins.filter(c => c.userId === userId);

    console.log('[ModalCheckinSuccess] totalCheckinsCount computed:', {
      allCheckinsCount: allCheckins.length,
      userId,
      userCheckinsCount: userCheckins.length,
      userCheckins: userCheckins.map(c => ({ id: c.id, pubId: c.pubId, timestamp: c.timestamp }))
    });

    return userCheckins.length;
  });

  readonly totalPubsCount = computed(() => {
    const userId = this.authStore.uid();
    if (!userId) return 0;

    const allCheckins = this.checkinStore.checkins();
    const userCheckins = allCheckins.filter(c => c.userId === userId);
    const uniquePubIds = new Set(userCheckins.map(c => c.pubId));

    console.log('[ModalCheckinSuccess] totalPubsCount computed:', {
      allCheckinsCount: allCheckins.length,
      userId,
      userCheckinsCount: userCheckins.length,
      uniquePubIds: Array.from(uniquePubIds),
      uniquePubsCount: uniquePubIds.size
    });

    return uniquePubIds.size;
  });

  readonly isFirstTimeAtPub = computed(() => {
    const currentPubId = this.data().pub?.id;
    const allCheckins = this.checkinStore.checkins();
    const userId = this.authStore.uid();

    if (!currentPubId || !userId) {
      console.log('[ModalCheckinSuccess] isFirstTimeAtPub: No current pub ID or user ID');
      return false;
    }

    const userCheckins = allCheckins.filter(
      c => c.userId === userId && c.pubId === currentPubId
    );

    const isFirst = userCheckins.length === 1;

    console.log('[ModalCheckinSuccess] isFirstTimeAtPub computed:', {
      currentPubId,
      userId,
      allCheckinsCount: allCheckins.length,
      userCheckinsForThisPub: userCheckins.length,
      isFirstTime: isFirst,
      userCheckinsForThisPubData: userCheckins.map(c => ({ id: c.id, timestamp: c.timestamp }))
    });

    return isFirst;
  });

  readonly getCurrentPubCheckinsCount = computed(() => {
    const currentPubId = this.data().pub?.id;
    const userId = this.authStore.uid();
    if (!currentPubId || !userId) return 0;

    const userCheckins = this.checkinStore.checkins().filter(
      c => c.userId === userId && c.pubId === currentPubId
    );
    return userCheckins.length;
  });

  readonly consecutiveDaysCount = computed(() => {
    const userId = this.authStore.uid();
    if (!userId) return 0;

    const userCheckins = this.checkinStore.checkins()
      .filter(c => c.userId === userId)
      .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());

    if (userCheckins.length === 0) return 0;

    let consecutiveDays = 1;
    const today = new Date().toISOString().split('T')[0];
    let currentDate = today;

    for (let i = 1; i < userCheckins.length; i++) {
      const prevDate = new Date(currentDate);
      prevDate.setDate(prevDate.getDate() - 1);
      const expectedPrevDate = prevDate.toISOString().split('T')[0];

      const checkInDate = userCheckins[i].dateKey;

      if (checkInDate === expectedPrevDate) {
        consecutiveDays++;
        currentDate = checkInDate;
      } else {
        break;
      }
    }

    return consecutiveDays;
  });

  // Event handlers
  handleDismiss(): void {
    console.log('[ModalCheckinSuccess] Dismiss requested');
    this.dismiss.emit();
  }

  // Carpet image methods
  private async loadCarpetImage(carpetKey: string): Promise<void> {
    try {
      console.log('[ModalCheckinSuccess] Loading carpet image:', carpetKey);
      const imageUrl = await this.carpetStorageService.getPhotoUrl(carpetKey);
      if (imageUrl) {
        this._carpetImageUrl.set(imageUrl);
        console.log('[ModalCheckinSuccess] Carpet image loaded successfully');
      }
    } catch (error) {
      console.error('[ModalCheckinSuccess] Failed to load carpet image:', error);
      this._carpetImageUrl.set(null);
    }
  }

  onCarpetImageError(): void {
    console.log('[ModalCheckinSuccess] Carpet image failed to load, showing placeholder');
    this._carpetImageUrl.set(null);
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
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  getBadgeDefinition(badgeId: string) {
    return BADGE_DEFINITIONS.find(b => b.id === badgeId);
  }

  // Animation helper
  getAnimationDelay(index: number): string {
    return `${index * this.POINTS_ROW_STAGGER}s`;
  }

}
