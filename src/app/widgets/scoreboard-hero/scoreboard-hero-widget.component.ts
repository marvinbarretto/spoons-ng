/**
 * @fileoverview ScoreboardHeroWidgetComponent - Main stats display widget with smart animations
 *
 * RESPONSIBILITIES:
 * - Display user stats (points, pubs, badges) with visual impact
 * - Smart animations: skip count-up for small changes, use fade-in instead
 * - Self-contained data loading from DataAggregatorService
 * - Loading states and error handling
 * - Responsive design for mobile/desktop
 *
 * ANIMATION STRATEGY:
 * - Small changes (0→1, 1→2): Instant fade-in, feels responsive
 * - Medium changes (10+): Short count-up animation for satisfaction
 * - Large changes (100+): Full count-up animation for excitement
 *
 * DATA FLOW:
 * - Self-contained widget that loads its own data
 * - Uses DataAggregatorService for cross-store data aggregation
 * - Real-time updates when stores change user stats
 *
 * @architecture Widget component - extends BaseWidgetComponent, self-contained data loading
 */

import { Component, computed, effect, signal, ChangeDetectionStrategy, OnDestroy, WritableSignal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseWidgetComponent } from '../base/base-widget.component';
import { DataAggregatorService } from '../../shared/data-access/data-aggregator.service';
import { DebugService } from '../../shared/utils/debug.service';
import { CheckInStore } from '../../check-in/data-access/check-in.store';
import { BadgeStore } from '../../badges/data-access/badge.store';
import { LeaderboardStore } from '../../leaderboard/data-access/leaderboard.store';
import { BadgeCrestComponent } from '../../shared/ui/badge-crest/badge-crest.component';

export type ScoreboardData = {
  totalPoints: number;
  todaysPoints: number;
  pubsVisited: number;
  totalPubs: number;
  badgeCount: number;
  landlordCount: number;
  totalCheckins: number;
  isLoading: boolean;
};

import type { Badge } from '../../badges/utils/badge.model';

export type BadgeWithEarnedStatus = {
  badge: Badge;
  isEarned: boolean;
};

export type EnhancedScoreboardData = ScoreboardData & {
  currentStreak: number;
  recentBadges: BadgeWithEarnedStatus[];
  leaderboardPosition: number | null;
};

@Component({
  selector: 'app-scoreboard-hero-widget',
  imports: [CommonModule, BadgeCrestComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="scoreboard-hero-widget">
      <h3 class="widget-title">Your Progress</h3>

      <div class="scoreboard-hero" [class.loading]="enhancedData().isLoading">
        <div class="scoreboard-content">
          <!-- Main Points Display -->
          <div class="points-section">
            <div class="points-value">{{ animatedPoints() }}</div>
            <div class="points-label">POINTS</div>
            @if (enhancedData().todaysPoints > 0) {
              <div class="today-badge">+{{ animatedTodaysPoints() }} today</div>
            }
          </div>

          <!-- Stats Row -->
          <div class="stats-row">
            <div class="stat-item">
              <div class="stat-label">PUBS</div>
              <div class="stat-value">{{ animatedPubs() }}</div>
            </div>
            <div class="stat-divider">|</div>
            <div class="stat-item">
              <div class="stat-label">CHECK-INS</div>
              <div class="stat-value">{{ animatedCheckins() }}</div>
            </div>
          </div>

          <!-- Enhanced Metrics Row -->
          <div class="enhanced-metrics">
            @if (enhancedData().currentStreak > 0) {
              <div class="metric-card streak">
                <div class="metric-icon">🔥</div>
                <div class="metric-content">
                  <div class="metric-value">{{ animatedStreak() }}</div>
                  <div class="metric-label">Day Streak</div>
                </div>
              </div>
            }

            @if (enhancedData().landlordCount > 0) {
              <div class="metric-card landlord">
                <div class="metric-icon">👑</div>
                <div class="metric-content">
                  <div class="metric-value">{{ animatedLandlords() }}</div>
                  <div class="metric-label">Pubs Owned</div>
                </div>
              </div>
            }

            @if (enhancedData().badgeCount > 0) {
              <div class="metric-card badges">
                <div class="metric-icon">🏆</div>
                <div class="metric-content">
                  <div class="metric-value">{{ enhancedData().badgeCount }}</div>
                  <div class="metric-label">Badges</div>
                  @if (enhancedData().recentBadges.length > 0) {
                    <div class="badge-crests">
                      @for (badgeItem of enhancedData().recentBadges; track badgeItem.badge.id) {
                        <app-badge-crest
                          [badge]="badgeItem.badge"
                          [isEarned]="badgeItem.isEarned"
                          size="tiny"
                          [showEarnedIndicator]="false"
                          [showBanner]="false"
                          [compact]="true" />
                      }
                      @if (enhancedData().badgeCount > enhancedData().recentBadges.length) {
                        <span class="more-badges">+{{ enhancedData().badgeCount - enhancedData().recentBadges.length }}</span>
                      }
                    </div>
                  }
                </div>
              </div>
            }

            @if (enhancedData().leaderboardPosition) {
              <div class="metric-card rank">
                <div class="metric-icon">📊</div>
                <div class="metric-content">
                  <div class="metric-value">#{{ enhancedData().leaderboardPosition }}</div>
                  <div class="metric-label">Rank</div>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .scoreboard-hero-widget {
      padding: 1rem;
      background: var(--background-lighter);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      box-shadow: var(--shadow);
    }

    .widget-title {
      margin: 0 0 1rem 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text);
    }

    .today-badge {
      font-size: 0.875rem;
      color: var(--primary);
      font-weight: 600;
      margin-top: 0.25rem;
      opacity: 0.9;
    }

    .scoreboard-hero {
      background: var(--background-darkest);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 2px 8px var(--shadow);
      transition: all 0.3s ease;
    }

    .scoreboard-content {
      text-align: center;
    }

    /* Points Section */
    .points-section {
      margin-bottom: 1.5rem;
    }

    .points-value {
      font-size: 3rem;
      font-weight: 800;
      line-height: 1;
      margin-bottom: 0.5rem;
      color: var(--text);
      font-variant-numeric: tabular-nums;
      transition: all 0.3s ease;
    }

    .points-label {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    /* Stats Row */
    .stats-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2rem;
    }

    .stat-item {
      text-align: center;
    }

    .stat-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.25rem;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text);
      font-variant-numeric: tabular-nums;
      transition: all 0.3s ease;
    }

    .stat-divider {
      font-size: 1.5rem;
      color: var(--textMuted);
      font-weight: 300;
    }

    /* Loading state */
    .loading .points-value,
    .loading .stat-value {
      background: var(--background-darkestElevated);
      border-radius: 4px;
      color: transparent;
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }

    /* Enhanced Metrics Section */
    .enhanced-metrics {
      display: flex;
      gap: 0.75rem;
      margin-top: 1.5rem;
      flex-wrap: wrap;
      justify-content: center;
    }

    .metric-card {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      background: var(--background-darkestElevated);
      border: 1px solid var(--borderLight);
      border-radius: 8px;
      min-width: 100px;
      flex: 1;
      max-width: 140px;
      transition: all 0.3s ease;
    }

    .metric-card:hover {
      background: var(--primary);
      color: var(--onPrimary);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px var(--shadow);
    }

    .metric-icon {
      font-size: 1.25rem;
      line-height: 1;
    }

    .metric-content {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      flex: 1;
      min-width: 0;
    }

    .metric-value {
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--text);
      line-height: 1;
    }

    .metric-card:hover .metric-value {
      color: var(--onPrimary);
    }

    .metric-label {
      font-size: 0.6875rem;
      font-weight: 500;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      line-height: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .metric-card:hover .metric-label {
      color: var(--onPrimary);
      opacity: 0.9;
    }

    /* Badge Crests Display */
    .badge-crests {
      display: flex;
      gap: 0.25rem;
      margin-top: 0.5rem;
      flex-wrap: wrap;
      justify-content: center;
      align-items: flex-end;
    }

    .more-badges {
      font-size: 0.625rem;
      font-weight: bold;
      color: var(--text-secondary);
      background: var(--background-darkestElevated);
      border: 1px solid var(--borderLight);
      border-radius: 50%;
      width: 1.5rem;
      height: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-left: 0.125rem;
    }

    .metric-card:hover .more-badges {
      background: var(--onPrimary);
      border-color: var(--onPrimary);
      color: var(--primary);
    }

    /* Specific metric card colors */
    .metric-card.streak {
      border-color: #ff6b35;
    }

    .metric-card.streak:hover {
      background: #ff6b35;
    }

    .metric-card.landlord {
      border-color: #ffd700;
    }

    .metric-card.landlord:hover {
      background: #ffd700;
      color: #333;
    }

    .metric-card.badges {
      border-color: #4caf50;
    }

    .metric-card.badges:hover {
      background: #4caf50;
    }

    .metric-card.rank {
      border-color: #2196f3;
    }

    .metric-card.rank:hover {
      background: #2196f3;
    }

    /* Responsive design */
    @media (max-width: 480px) {
      .scoreboard-hero {
        padding: 1.25rem;
      }

      .points-value {
        font-size: 2.5rem;
      }

      .points-label {
        font-size: 0.875rem;
      }

      .stats-row {
        gap: 1.5rem;
      }

      .stat-value {
        font-size: 1.25rem;
      }

      .stat-label {
        font-size: 0.75rem;
      }

      .enhanced-metrics {
        gap: 0.5rem;
        margin-top: 1rem;
      }

      .metric-card {
        padding: 0.5rem;
        min-width: 80px;
        max-width: 120px;
      }

      .metric-icon {
        font-size: 1rem;
      }

      .metric-value {
        font-size: 0.75rem;
      }

      .metric-label {
        font-size: 0.625rem;
      }

      .today-badge {
        font-size: 0.75rem;
      }

      .badge-crests {
        gap: 0.1875rem;
        margin-top: 0.375rem;
      }

      .more-badges {
        font-size: 0.5rem;
        width: 1.25rem;
        height: 1.25rem;
      }
    }
  `]
})
export class ScoreboardHeroWidgetComponent extends BaseWidgetComponent implements OnDestroy {
  // ✅ Self-contained data loading via DataAggregatorService
  protected readonly dataAggregatorService = inject(DataAggregatorService);
  private readonly debug = inject(DebugService);
  private readonly checkinStore = inject(CheckInStore);
  private readonly badgeStore = inject(BadgeStore);
  private readonly leaderboardStore = inject(LeaderboardStore);

  // ✅ Widget loads its own data
  readonly data = computed((): ScoreboardData => {
    const scoreboardData = this.dataAggregatorService.scoreboardData();
    this.debug.extreme('[ScoreboardHeroWidget] Data computed:', scoreboardData);
    return scoreboardData;
  });

  // ✅ Enhanced data with additional metrics
  readonly enhancedData = computed((): EnhancedScoreboardData => {
    const baseData = this.data();

    // Get additional metrics - using safe property access since these features may not be implemented yet
    const currentStreak = 0; // TODO: Implement streak calculation in CheckInStore

    // Get badge collection data
    const earnedBadgesWithDefinitions = this.badgeStore.earnedBadgesWithDefinitions?.() || [];
    const recentBadges: BadgeWithEarnedStatus[] = earnedBadgesWithDefinitions
      .slice(0, 4) // Limit to first 4 badges for scoreboard display
      .filter(item => item.badge) // Only include badges with valid definitions
      .map(item => ({
        badge: item.badge!,
        isEarned: true
      }));

    const leaderboardPosition = this.leaderboardStore.userRankByPoints?.() || null;

    const enhanced: EnhancedScoreboardData = {
      ...baseData,
      currentStreak,
      recentBadges,
      leaderboardPosition
    };

    this.debug.extreme('[ScoreboardHeroWidget] Enhanced data computed:', {
      ...enhanced,
      recentBadgesCount: recentBadges.length
    });
    return enhanced;
  });

  // ✅ Count-up animation signals - simplified for new design
  private readonly animatedPointsValue = signal(0);
  private readonly animatedPubsValue = signal(0);
  private readonly animatedCheckinsValue = signal(0);
  private readonly animatedTodaysPointsValue = signal(0);
  private readonly animatedStreakValue = signal(0);
  private readonly animatedLandlordsValue = signal(0);

  readonly animatedPoints = this.animatedPointsValue.asReadonly();
  readonly animatedPubs = this.animatedPubsValue.asReadonly();
  readonly animatedCheckins = this.animatedCheckinsValue.asReadonly();
  readonly animatedTodaysPoints = this.animatedTodaysPointsValue.asReadonly();
  readonly animatedStreak = this.animatedStreakValue.asReadonly();
  readonly animatedLandlords = this.animatedLandlordsValue.asReadonly();

  // ✅ Animation tracking - CRITICAL for preventing overlaps
  private activeAnimations = new Map<string, number>();

  constructor() {
    super();

    // ✅ Set up smart animations when data changes
    effect(() => {
      const data = this.enhancedData();

      console.log('[Scoreboard] 🔄 Effect triggered - Enhanced data changed:', {
        totalPoints: data.totalPoints,
        todaysPoints: data.todaysPoints,
        pubsVisited: data.pubsVisited,
        totalCheckins: data.totalCheckins,
        currentStreak: data.currentStreak,
        landlordCount: data.landlordCount,
        isLoading: data.isLoading,
        timestamp: Date.now()
      });

      // ✅ Log current animated signal states BEFORE any changes
      console.log('[Scoreboard] 📊 Current animated signal states:', {
        animatedPoints: this.animatedPointsValue(),
        animatedPubs: this.animatedPubsValue(),
        animatedCheckins: this.animatedCheckinsValue(),
        animatedTodaysPoints: this.animatedTodaysPointsValue(),
        animatedStreak: this.animatedStreakValue(),
        animatedLandlords: this.animatedLandlordsValue(),
        activeAnimationsCount: this.activeAnimations.size,
        activeAnimationKeys: Array.from(this.activeAnimations.keys())
      });

      if (!data.isLoading) {
        console.log('[Scoreboard] 🎬 Starting animation sequence - data loaded');
        
        // ✅ Cancel all previous animations before starting new ones
        this.cancelAllAnimations();

        // ✅ Smart animation strategy for enhanced design
        // Primary metrics
        console.log('[Scoreboard] 🎯 Starting primary metrics animations');
        this.smartAnimateValue('points', this.animatedPointsValue, data.totalPoints, 1200);
        setTimeout(() => this.smartAnimateValue('pubs', this.animatedPubsValue, data.pubsVisited, 800), 100);
        setTimeout(() => this.smartAnimateValue('checkins', this.animatedCheckinsValue, data.totalCheckins, 900), 200);

        // Enhanced metrics with staggered timing
        console.log('[Scoreboard] ✨ Scheduling enhanced metrics animations');
        setTimeout(() => this.smartAnimateValue('todaysPoints', this.animatedTodaysPointsValue, data.todaysPoints, 600), 300);
        setTimeout(() => this.smartAnimateValue('streak', this.animatedStreakValue, data.currentStreak, 700), 400);
        setTimeout(() => this.smartAnimateValue('landlords', this.animatedLandlordsValue, data.landlordCount, 800), 500);
      } else {
        console.log('[Scoreboard] ⏳ Data still loading, skipping animations');
      }
    });
  }

  ngOnDestroy() {
    // ✅ Clean up any remaining animations
    this.cancelAllAnimations();
  }

  // ✅ FIXED: Cancel all active animations
  private cancelAllAnimations(): void {
    console.log('[Scoreboard] 🛑 Cancelling all animations:', {
      activeCount: this.activeAnimations.size,
      keys: Array.from(this.activeAnimations.keys()),
      timestamp: Date.now()
    });
    
    this.activeAnimations.forEach((animationId, key) => {
      console.log(`[Scoreboard] 🚫 Cancelling animation: ${key} (ID: ${animationId})`);
      cancelAnimationFrame(animationId);
    });
    this.activeAnimations.clear();
    
    console.log('[Scoreboard] ✅ All animations cancelled');
  }

  /**
   * Smart animation that chooses strategy based on change size
   * @param key - Animation key for tracking
   * @param signalRef - Signal to animate
   * @param targetValue - Target number to animate to
   * @param baseDuration - Base duration for large changes
   * @description Decides animation strategy:
   * - Small changes (0-3): Instant update with fade-in
   * - Medium changes (4-20): Quick count-up
   * - Large changes (20+): Full count-up animation
   */
  private smartAnimateValue(
    key: string,
    signalRef: WritableSignal<number>,
    targetValue: number,
    baseDuration: number = 1000
  ): void {
    const currentValue = signalRef();
    const change = Math.abs(targetValue - currentValue);
    const strategy = change <= 3 ? 'instant' : change <= 20 ? 'quick' : 'full';

    console.log(`[Scoreboard] 🎯 Smart animate decision for ${key}:`, {
      from: currentValue,
      to: targetValue,
      change,
      strategy,
      baseDuration,
      timestamp: Date.now()
    });

    // ✅ CRITICAL: Check for negative values before any animation
    if (targetValue < 0) {
      console.error(`[Scoreboard] ❌ NEGATIVE TARGET VALUE DETECTED!`, {
        key,
        targetValue,
        currentValue,
        change
      });
      return;
    }

    // Strategy 1: Small changes (0→1, 1→2, etc.) - instant update feels more responsive
    if (change <= 3) {
      console.log(`[Scoreboard] ⚡ ${key}: Instant update (${currentValue} → ${targetValue})`);
      signalRef.set(targetValue);
      return;
    }

    // Strategy 2: Medium changes - quick animation
    if (change <= 20) {
      console.log(`[Scoreboard] 🏃 ${key}: Quick animation (${currentValue} → ${targetValue})`);
      this.animateValue(key, signalRef, targetValue, baseDuration * 0.3);
      return;
    }

    // Strategy 3: Large changes - full animation for excitement
    console.log(`[Scoreboard] 🎬 ${key}: Full animation (${currentValue} → ${targetValue})`);
    this.animateValue(key, signalRef, targetValue, baseDuration);
  }

  /**
   * Traditional count-up animation with easing
   * @param key - Animation key for tracking/cleanup
   * @param signalRef - Signal to animate
   * @param targetValue - Target number to animate to
   * @param duration - Animation duration in milliseconds
   */
  private animateValue(
    key: string,
    signalRef: WritableSignal<number>,
    targetValue: number,
    duration: number = 1000
  ): void {
    console.log(`[Scoreboard] 🎬 Starting animation for ${key}:`, {
      targetValue,
      duration,
      currentSignalValue: signalRef(),
      timestamp: Date.now()
    });

    // ✅ Cancel any existing animation for this key
    if (this.activeAnimations.has(key)) {
      const existingId = this.activeAnimations.get(key)!;
      console.log(`[Scoreboard] 🔄 Cancelling existing animation for ${key} (ID: ${existingId})`);
      cancelAnimationFrame(existingId);
    }

    const startValue = signalRef();
    const startTime = performance.now();

    console.log(`[Scoreboard] 📍 Animation setup for ${key}:`, {
      startValue,
      targetValue,
      difference: targetValue - startValue,
      startTime
    });

    // If values are the same, no animation needed
    if (startValue === targetValue) {
      console.log(`[Scoreboard] ⏭️ ${key}: No animation needed (values are equal: ${startValue})`);
      return;
    }

    // ✅ CRITICAL: Validate values before animation
    if (startValue < 0 || targetValue < 0) {
      console.error(`[Scoreboard] ❌ NEGATIVE VALUES IN ANIMATION!`, {
        key,
        startValue,
        targetValue
      });
    }

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth animation (ease-out-quart)
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.round(startValue + (targetValue - startValue) * easeOutQuart);

      // ✅ CRITICAL: Prevent negative values from being displayed
      const safeValue = Math.max(0, currentValue);
      
      if (currentValue !== safeValue) {
        console.error(`[Scoreboard] ❌ NEGATIVE VALUE PREVENTED!`, {
          key,
          calculatedValue: currentValue,
          safeValue,
          startValue,
          targetValue,
          progress,
          elapsed
        });
      }

      signalRef.set(safeValue);

      if (progress < 1) {
        // ✅ Store animation ID for cleanup
        const animationId = requestAnimationFrame(animate);
        this.activeAnimations.set(key, animationId);
      } else {
        // ✅ Animation complete - remove from tracking
        console.log(`[Scoreboard] ✅ Animation complete for ${key}: ${startValue} → ${targetValue}`);
        this.activeAnimations.delete(key);
      }
    };

    // ✅ Start animation and track it
    const animationId = requestAnimationFrame(animate);
    this.activeAnimations.set(key, animationId);
    console.log(`[Scoreboard] 🚀 Animation started for ${key} (ID: ${animationId})`);
  }
}
