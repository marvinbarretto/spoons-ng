// src/app/check-in/ui/modal-checkin-success/modal-checkin-success.component.ts
import { Component, inject, input, output, computed, signal, effect, OnDestroy } from '@angular/core';

import { ButtonComponent } from '@shared/ui/button/button.component';
import { CheckInStore } from '../../../check-in/data-access/check-in.store';
import { AuthStore } from '@auth/data-access/auth.store';
import { ButtonSize } from '@shared/ui/button/button.params';
import { environment } from '../../../../environments/environment';
import { CheckInResultData } from '../../utils/check-in.models';

type PointsBreakdownItem = {
  type: string;
  points: number;
  description: string;
  icon: string;
  color: string;
  distanceAmount?: string; // For distance display
};

@Component({
  selector: 'app-modal-checkin-points',
  imports: [ButtonComponent],
  template: `
    <div class="checkin-modal-container" [class.success]="data().success">
      <div class="checkin-modal-header">
        <h2>🏆 Points Breakdown</h2>
      </div>

      <div class="checkin-modal-body">
        @if (data().success) {
          <div class="points-content">

            <!-- Points Breakdown Section -->
            @if (pointsBreakdown().length > 0 || totalPointsEarned() > 0) {
              <div class="points-section">
                <h3>🏆 Points Earned</h3>
                <div class="points-table">
                  @for (item of pointsBreakdown(); track item.type; let i = $index) {
                    <div class="points-row">
                      <div class="points-icon" [style.color]="item.color">
                        {{ item.icon }}
                      </div>
                      <div class="points-description">
                        <span class="description-main">{{ item.description }}</span>
                        @if (item.distanceAmount) {
                          <span class="distance-amount">{{ item.distanceAmount }}</span>
                        }
                      </div>
                      <div class="points-value" [style.color]="item.color">
                        +{{ item.points }}
                      </div>
                    </div>
                  }

                  @if (totalPointsEarned() > 0) {
                    <div class="points-total">
                      <div class="total-label">Total Points</div>
                      <div class="total-value">{{ totalPointsEarned() }}</div>
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

      <div class="checkin-modal-footer">
        <div class="button-group">
          <app-button
            variant="primary"
            [size]="ButtonSize.LARGE"
            [fullWidth]="true"
            (onClick)="handleContinue()"
          >
            Continue
          </app-button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @use 'styles/index' as *;
    @import 'styles/components/check-in-modals';

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

    .checkin-modal-header h2 {
      margin: 0;
      color: var(--textPrimary);
      font-size: 1.25rem;
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
    }

    .points-icon {
      font-size: 1.2rem;
      text-align: center;
    }

    .points-description {
      font-size: 0.875rem;
      color: var(--text);
      font-weight: 500;
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .description-main {
      font-weight: 500;
    }

    .distance-amount {
      font-size: 0.75rem;
      color: var(--text-secondary);
      font-weight: normal;
    }

    .points-value {
      font-size: 0.875rem;
      font-weight: bold;
      text-align: right;
    }

    .animated-value {
      font-variant-numeric: tabular-nums;
      transition: all 0.3s ease;
    }

    .animated-total {
      font-variant-numeric: tabular-nums;
      font-size: 1.2rem;
      font-weight: bold;
    }

    .points-total {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem;
      margin-top: 0.25rem;
      background: linear-gradient(135deg, var(--success) 0%, var(--accent) 100%);
      color: var(--on-accent);
      border-radius: 6px;
      font-weight: bold;
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
    // 🎬 ANIMATION MIXINS
    // ===================================

    @mixin slide-up($duration: 0.6s, $delay: 0s) {
      animation: slide-up $duration ease-out $delay both;
    }

    @mixin pop-in($duration: 0.6s, $delay: 0s) {
      animation: pop-in $duration ease-out $delay both;
    }

    @mixin fade-in($duration: 0.6s, $delay: 0s) {
      animation: fade-in $duration ease-out $delay both;
    }

    @mixin pulse($duration: 2s) {
      animation: pulse-glow $duration ease-in-out infinite;
    }

    // Animation keyframes
    @keyframes slide-up {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes pop-in {
      0% {
        opacity: 0;
        transform: scale(0.8);
      }
      50% {
        opacity: 1;
        transform: scale(1.05);
      }
      100% {
        opacity: 1;
        transform: scale(1);
      }
    }

    @keyframes fade-in {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes pulse-glow {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.8;
        transform: scale(1.02);
      }
    }
  `]
})
export class ModalCheckinPointsComponent implements OnDestroy {
  readonly ButtonSize = ButtonSize;

  // Inputs
  readonly data = input.required<CheckInResultData>();
  readonly UserExperienceLevel = input<string>('');

  // Outputs
  readonly continue = output<void>();
  readonly dismiss = output<void>();

  // Store injections
  protected readonly checkinStore = inject(CheckInStore);
  protected readonly authStore = inject(AuthStore);



  constructor() {
    // Debug effect to log when modal data changes
    effect(() => {
      const data = this.data();
      const allCheckins = this.checkinStore.checkins();
      const storeLoading = this.checkinStore.loading();

      console.log('[ModalCheckinPoints] Modal data changed:', {
        success: data.success,
        pubId: data.pub?.id,
        pubName: data.pub?.name,
        carpetCaptured: data.carpetCaptured,
        carpetImageKey: data.checkin?.carpetImageKey,
        checkinId: data.checkin?.id,
        timestamp: data.checkin?.timestamp
      });

      console.log('[ModalCheckinPoints] CheckInStore state:', {
        allCheckinsCount: allCheckins.length,
        storeLoading,
        checkinIds: allCheckins.map(c => c.id),
        storeHasLoadMethod: typeof this.checkinStore.load === 'function'
      });
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

    console.log('[ModalCheckinPoints] 🔍 === POINTS BREAKDOWN DEBUG ===');
    console.log('[ModalCheckinPoints] 🔍 Checkin data:', {
      hasCheckin: !!checkin,
      checkinId: checkin?.id,
      pointsEarned: checkin?.pointsEarned,
      hasPointsBreakdown: !!checkin?.pointsBreakdown,
      pointsBreakdownRaw: checkin?.pointsBreakdown
    });

    // If we have points but no breakdown, create a simple one
    if (checkin?.pointsEarned && checkin.pointsEarned > 0 && !checkin.pointsBreakdown) {
      console.log('[ModalCheckinPoints] 📝 Using simple breakdown for points:', checkin.pointsEarned);
      return [{
        type: 'total',
        points: checkin.pointsEarned,
        description: 'Check-in points',
        icon: '🍺',
        color: '#28a745'
      }];
    }

    if (!checkin?.pointsBreakdown) {
      console.log('[ModalCheckinPoints] ❌ No points breakdown available - returning empty array');
      return [];
    }

    // Use structured breakdown data directly
    const breakdown = checkin.pointsBreakdown;
    console.log('[ModalCheckinPoints] 📊 Using structured breakdown:', breakdown);
    console.log('[ModalCheckinPoints] 📊 Breakdown properties:', {
      base: breakdown.base,
      distance: breakdown.distance,
      bonus: breakdown.bonus,
      total: breakdown.total,
      reason: breakdown.reason,
      hasReason: !!breakdown.reason
    });
    
    const items: PointsBreakdownItem[] = [];

    // Base points
    if (breakdown.base > 0) {
      console.log('[ModalCheckinPoints] 🍺 Adding base points:', breakdown.base);
      items.push({
        type: 'base',
        points: breakdown.base,
        description: 'Base check-in',
        icon: '🍺',
        color: '#28a745'
      });
    } else {
      console.log('[ModalCheckinPoints] ⚠️ No base points found:', breakdown.base);
    }

    // Distance bonus
    if (breakdown.distance > 0) {
      console.log('[ModalCheckinPoints] ✅ Adding distance bonus:', breakdown.distance);
        
        // Extract distance from reason string if available
        let distanceText = 'Distance bonus';
        let distanceAmount = '';
        if (breakdown.reason) {
          const distanceMatch = breakdown.reason.match(/(\d+(?:\.\d+)?)\s*km/);
          if (distanceMatch) {
            distanceAmount = `${distanceMatch[1]}km`;
            distanceText = 'Distance bonus';
          }
        }
        
        items.push({
          type: 'distance',
          points: breakdown.distance,
          description: distanceText,
          distanceAmount: distanceAmount,
          icon: '📍',
          color: '#007bff'
        });
      } else {
        console.log('[ModalCheckinPoints] ❌ No distance bonus found:', {
          hasDistanceProperty: 'distance' in breakdown,
          distanceValue: breakdown.distance
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

        if (reason.includes('carpet confirmed')) {
          items.push({
            type: 'carpet',
            points: 5,
            description: 'Carpet confirmed bonus',
            icon: '🏺',
            color: '#6f42c1'
          });
        }

        // Enhanced photo quality bonuses
        if (reason.includes('photo quality bonus')) {
          const qualityMatch = reason.match(/(\d+)\s+([\w-]+)\s+photo quality bonus/i);
          if (qualityMatch) {
            const points = parseInt(qualityMatch[1]);
            const tier = qualityMatch[2];
            
            let icon = '📸';
            let color = '#28a745';
            let description = 'Photo quality bonus';
            
            switch (tier.toLowerCase()) {
              case 'perfect':
                icon = '🌟';
                color = '#ffd700';
                description = 'Perfect photo quality!';
                break;
              case 'exceptional':
                icon = '✨';
                color = '#ff6b6b';
                description = 'Exceptional photo quality!';
                break;
              case 'high-quality':
                icon = '💎';
                color = '#4ecdc4';
                description = 'High-quality photo!';
                break;
            }
            
            items.push({
              type: 'photo-quality',
              points: points,
              description: description,
              icon: icon,
              color: color
            });
          }
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

        if (reason.includes('home pub')) {
          items.push({
            type: 'home-pub',
            points: 3,
            description: 'Home pub bonus',
            icon: '🏠',
            color: '#fd7e14'
          });
        }
      }

      // ✅ NEW: Simple photoQuality property access (instead of complex string parsing)
      if (breakdown.photoQuality && typeof breakdown.photoQuality === 'number') {
        // Calculate points based on photo quality score (0-100)
        let points = 0;
        let tier = 'standard';
        let icon = '📸';
        let color = '#28a745';
        let description = 'Photo quality bonus';

        // Calculate bonus points and tier based on quality score
        if (breakdown.photoQuality >= 95) {
          points = 20;
          tier = 'perfect';
          icon = '🌟';
          color = '#ffd700';
          description = 'Perfect photo quality!';
        } else if (breakdown.photoQuality >= 90) {
          points = 15;
          tier = 'exceptional';
          icon = '✨';
          color = '#ff6b6b';
          description = 'Exceptional photo quality!';
        } else if (breakdown.photoQuality >= 80) {
          points = 10;
          tier = 'high';
          icon = '💎';
          color = '#4ecdc4';
          description = 'High-quality photo!';
        } else if (breakdown.photoQuality >= 70) {
          points = 5;
          tier = 'good';
          icon = '📸';
          color = '#28a745';
          description = 'Good photo quality';
        }

        if (points > 0) {
          items.push({
            type: 'photo-quality',
            points: points,
            description: description,
            icon: icon,
            color: color
          });
        }
      }

      console.log('[ModalCheckinPoints] 🎯 Final breakdown items count:', items.length);
      console.log('[ModalCheckinPoints] 🎯 Final breakdown items:', items);
      
      // If we parsed successfully but got no items, and we know there should be points, add fallback
      if (items.length === 0 && breakdown.total > 0) {
        console.log('[ModalCheckinPoints] ⚠️ No items but total > 0, adding fallback item');
        items.push({
          type: 'total',
          points: breakdown.total,
          description: 'Check-in points',
          icon: '🍺',
          color: '#28a745'
        });
      }
      
    // If we got no items but total > 0, add fallback
    if (items.length === 0 && breakdown.total > 0) {
      console.log('[ModalCheckinPoints] ⚠️ No items but total > 0, adding fallback item');
      items.push({
        type: 'total',
        points: breakdown.total,
        description: 'Check-in points',
        icon: '🍺',
        color: '#28a745'
      });
    }
    
    console.log('[ModalCheckinPoints] 🎯 Final breakdown items count:', items.length);
    console.log('[ModalCheckinPoints] 🎯 Final breakdown items:', items);
    return items;
  });

  readonly totalPointsEarned = computed(() => {
    const checkin = this.data().checkin;
    return checkin?.pointsEarned || this.pointsBreakdown().reduce((sum, item) => sum + item.points, 0);
  });


  // Event handlers
  handleContinue(): void {
    console.log('[ModalCheckinPoints] Continue to next modal');
    this.continue.emit();
  }

  handleDismiss(): void {
    console.log('[ModalCheckinPoints] Dismiss requested');
    this.dismiss.emit();
  }


  // Utility methods

  ngOnDestroy(): void {
    // Component cleanup
  }

}
