/**
 * @fileoverview ScoreboardHeroComponent - Main stats display with smart animations
 * 
 * RESPONSIBILITIES:
 * - Display user stats (points, pubs, badges) with visual impact
 * - Smart animations: skip count-up for small changes, use fade-in instead
 * - Loading states and error handling
 * - Responsive design for mobile/desktop
 * 
 * ANIMATION STRATEGY:
 * - Small changes (0→1, 1→2): Instant fade-in, feels responsive
 * - Medium changes (10+): Short count-up animation for satisfaction
 * - Large changes (100+): Full count-up animation for excitement
 * 
 * DATA FLOW:
 * - Receives ScoreboardData from HomeComponent as input
 * - HomeComponent gets data from UserStore (single source of truth)
 * - Real-time updates when stores change user stats
 * 
 * @architecture Dumb component - all data via inputs, animations self-contained
 */

import { Component, input, computed, effect, signal, ChangeDetectionStrategy, OnDestroy, WritableSignal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DebugService } from '../../../shared/utils/debug.service';

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
@Component({
  selector: 'app-scoreboard-hero',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="scoreboard-hero" [class.loading]="data().isLoading">
      <div class="scoreboard-content">
        <!-- Main Score Display -->
        <div class="main-scores">
          <div class="score-item primary">
            <div class="score-number">{{ animatedPoints() }}</div>
            <div class="score-label">Points</div>
            @if (data().todaysPoints > 0) {
              <div class="score-bonus">+{{ data().todaysPoints }} today</div>
            }
          </div>

          <div class="score-divider">•</div>

          <div class="score-item primary">
            <div class="score-number">{{ animatedPubs() }}</div>
            <div class="score-label">of {{ data().totalPubs }} Pubs</div>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="progress-section">
          <div class="progress-bar">
            <div class="progress-fill" [style.width.%]="progressPercentage()"></div>
          </div>
          <div class="progress-text">{{ progressPercentage() }}% explored</div>
        </div>

        <!-- Quick Stats -->
        <div class="quick-stats">
          <div class="stat">
            <span class="stat-number">{{ animatedBadges() }}</span>
            <span class="stat-label">Badges</span>
          </div>
          <div class="stat">
            <span class="stat-number">{{ animatedLandlord() }}</span>
            <span class="stat-label">Landlord</span>
          </div>
          <div class="stat">
            <span class="stat-number">{{ animatedCheckins() }}</span>
            <span class="stat-label">Total</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .scoreboard-hero {
      /* ✅ Theme-aware background using existing theme properties */
      background: linear-gradient(135deg,
        var(--color-accent) 0%,
        var(--color-primary) 50%,
        var(--color-dark) 100%);
      color: var(--color-text);
      border-radius: 12px;
      padding: 1.25rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 4px 12px var(--color-shadow);
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    /* ✅ Subtle background pattern */
    .scoreboard-hero::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: radial-gradient(circle at 70% 30%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
      pointer-events: none;
    }

    .scoreboard-content {
      position: relative;
      z-index: 1;
    }

    .main-scores {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1.5rem;
      margin-bottom: 1rem;
    }

    .score-item {
      text-align: center;
      flex: 1;
      max-width: 120px;
    }

    .score-number {
      font-size: 2.25rem;
      font-weight: 800;
      line-height: 1;
      margin-bottom: 0.25rem;
      background: linear-gradient(45deg, #ffd700, #ffed4e);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);

      /* ✅ Count-up animation styling */
      font-variant-numeric: tabular-nums;
      transition: all 0.3s ease;
    }

    .score-label {
      font-size: 0.75rem;
      font-weight: 600;
      opacity: 0.9;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .score-bonus {
      font-size: 0.625rem;
      margin-top: 0.25rem;
      padding: 0.125rem 0.375rem;
      background: var(--color-lighter);
      border-radius: 8px;
      font-weight: 600;
      display: inline-block;
      animation: slideInUp 0.5s ease-out 0.5s both;
    }

    @keyframes slideInUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .score-divider {
      font-size: 1.5rem;
      opacity: 0.5;
      font-weight: bold;
    }

    .progress-section {
      margin-bottom: 1rem;
    }

    .progress-bar {
      background: var(--color-lighter);
      border-radius: 6px;
      height: 6px;
      overflow: hidden;
      margin-bottom: 0.375rem;
    }

    .progress-fill {
      background: linear-gradient(90deg, var(--color-accent), var(--color-accentLight));
      height: 100%;
      border-radius: 6px;
      transition: width 1.2s ease-out 0.3s;
    }

    .progress-text {
      font-size: 0.75rem;
      font-weight: 500;
      opacity: 0.8;
      text-align: center;
    }

    .quick-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
    }

    .stat {
      text-align: center;
      padding: 0.5rem;
      background: var(--color-lighter);
      border-radius: 6px;
      backdrop-filter: blur(10px);
      transition: background-color 0.3s ease;
    }

    .stat:hover {
      background: var(--color-lighter);
    }

    .stat-number {
      display: block;
      font-size: 1rem;
      font-weight: 700;
      margin-bottom: 0.125rem;

      /* ✅ Count-up animation styling */
      font-variant-numeric: tabular-nums;
      transition: all 0.3s ease;
    }

    .stat-label {
      font-size: 0.625rem;
      opacity: 0.7;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* ✅ Loading state */
    .loading .score-number,
    .loading .stat-number {
      background: var(--color-lighter);
      border-radius: 4px;
      color: transparent;
      -webkit-text-fill-color: transparent;
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }

    /* ✅ Responsive design */
    @media (max-width: 480px) {
      .scoreboard-hero {
        padding: 1rem;
        margin-bottom: 1rem;
      }

      .main-scores {
        flex-direction: column;
        gap: 1rem;
      }

      .score-item {
        max-width: none;
      }

      .score-number {
        font-size: 2rem;
      }

      .quick-stats {
        gap: 0.5rem;
      }

      .stat {
        padding: 0.375rem;
      }

      .score-divider {
        transform: rotate(90deg);
        font-size: 1.25rem;
      }
    }
  `]
})
export class ScoreboardHeroComponent implements OnDestroy {
  // ✅ Dumb component - receives all data as input
  readonly data = input.required<ScoreboardData>();
  
  // 🔧 Dependencies
  private readonly debug = inject(DebugService);

  // ✅ Count-up animation signals
  private readonly animatedPointsValue = signal(0);
  private readonly animatedPubsValue = signal(0);
  private readonly animatedBadgesValue = signal(0);
  private readonly animatedLandlordValue = signal(0);
  private readonly animatedCheckinsValue = signal(0);

  readonly animatedPoints = this.animatedPointsValue.asReadonly();
  readonly animatedPubs = this.animatedPubsValue.asReadonly();
  readonly animatedBadges = this.animatedBadgesValue.asReadonly();
  readonly animatedLandlord = this.animatedLandlordValue.asReadonly();
  readonly animatedCheckins = this.animatedCheckinsValue.asReadonly();

  // ✅ Animation tracking - CRITICAL for preventing overlaps
  private activeAnimations = new Map<string, number>();

  // ✅ Computed values
  readonly progressPercentage = computed(() => {
    const data = this.data();
    return data.totalPubs > 0 ? Math.round((data.pubsVisited / data.totalPubs) * 100) : 0;
  });

  constructor() {
    // ✅ Set up smart animations when data changes
    effect(() => {
      const data = this.data();

      this.debug.extreme('[ScoreboardHero] Data changed:', {
        totalPoints: data.totalPoints,
        pubsVisited: data.pubsVisited,
        isLoading: data.isLoading,
        timestamp: Date.now()
      });

      if (!data.isLoading) {
        // ✅ Cancel all previous animations before starting new ones
        this.cancelAllAnimations();

        // ✅ Smart animation strategy based on change size
        this.smartAnimateValue('points', this.animatedPointsValue, data.totalPoints, 1200);
        setTimeout(() => this.smartAnimateValue('pubs', this.animatedPubsValue, data.pubsVisited, 800), 100);
        setTimeout(() => this.smartAnimateValue('badges', this.animatedBadgesValue, data.badgeCount, 600), 200);
        setTimeout(() => this.smartAnimateValue('landlord', this.animatedLandlordValue, data.landlordCount, 700), 250);
        setTimeout(() => this.smartAnimateValue('checkins', this.animatedCheckinsValue, data.totalCheckins, 900), 300);
      }
    });
  }

  ngOnDestroy() {
    // ✅ Clean up any remaining animations
    this.cancelAllAnimations();
  }

  // ✅ FIXED: Cancel all active animations
  private cancelAllAnimations(): void {
    this.activeAnimations.forEach((animationId) => {
      cancelAnimationFrame(animationId);
    });
    this.activeAnimations.clear();
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
    
    this.debug.extreme(`[ScoreboardHero] Smart animate ${key}:`, {
      from: currentValue,
      to: targetValue,
      change,
      strategy: change <= 3 ? 'instant' : change <= 20 ? 'quick' : 'full'
    });

    // Strategy 1: Small changes (0→1, 1→2, etc.) - instant update feels more responsive
    if (change <= 3) {
      signalRef.set(targetValue);
      return;
    }

    // Strategy 2: Medium changes - quick animation
    if (change <= 20) {
      this.animateValue(key, signalRef, targetValue, baseDuration * 0.3);
      return;
    }

    // Strategy 3: Large changes - full animation for excitement
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
    // ✅ Cancel any existing animation for this key
    if (this.activeAnimations.has(key)) {
      cancelAnimationFrame(this.activeAnimations.get(key)!);
    }

    const startValue = signalRef();
    const startTime = performance.now();



    // If values are the same, no animation needed
    if (startValue === targetValue) {
      return;
    }

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth animation (ease-out-quart)
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.round(startValue + (targetValue - startValue) * easeOutQuart);

      signalRef.set(currentValue);

      if (progress < 1) {
        // ✅ Store animation ID for cleanup
        const animationId = requestAnimationFrame(animate);
        this.activeAnimations.set(key, animationId);
      } else {
        // ✅ Animation complete - remove from tracking
        this.activeAnimations.delete(key);
      }
    };

    // ✅ Start animation and track it
    const animationId = requestAnimationFrame(animate);
    this.activeAnimations.set(key, animationId);
  }
}
