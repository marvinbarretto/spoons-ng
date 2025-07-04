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
        <!-- Main Points Display -->
        <div class="points-section">
          <div class="points-value">{{ animatedPoints() }}</div>
          <div class="points-label">POINTS</div>
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
      </div>
    </div>
  `,
  styles: [`
    .scoreboard-hero {
      background: var(--color-background-lightest);
      color: var(--color-text);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 2px 8px var(--color-shadow);
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
      color: var(--color-text);
      font-variant-numeric: tabular-nums;
      transition: all 0.3s ease;
    }

    .points-label {
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-textSecondary);
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
      color: var(--color-textSecondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.25rem;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-text);
      font-variant-numeric: tabular-nums;
      transition: all 0.3s ease;
    }

    .stat-divider {
      font-size: 1.5rem;
      color: var(--color-textMuted);
      font-weight: 300;
    }

    /* Loading state */
    .loading .points-value,
    .loading .stat-value {
      background: var(--color-background-lightestElevated);
      border-radius: 4px;
      color: transparent;
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }

    /* Responsive design */
    @media (max-width: 480px) {
      .scoreboard-hero {
        padding: 1.25rem;
        margin-bottom: 1rem;
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
    }
  `]
})
export class ScoreboardHeroComponent implements OnDestroy {
  // ✅ Dumb component - receives all data as input
  readonly data = input.required<ScoreboardData>();

  // 🔧 Dependencies
  private readonly debug = inject(DebugService);

  // ✅ Count-up animation signals - simplified for new design
  private readonly animatedPointsValue = signal(0);
  private readonly animatedPubsValue = signal(0);
  private readonly animatedCheckinsValue = signal(0);

  readonly animatedPoints = this.animatedPointsValue.asReadonly();
  readonly animatedPubs = this.animatedPubsValue.asReadonly();
  readonly animatedCheckins = this.animatedCheckinsValue.asReadonly();

  // ✅ Animation tracking - CRITICAL for preventing overlaps
  private activeAnimations = new Map<string, number>();

  // Removed progress percentage - not needed in simplified design

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

        // ✅ Smart animation strategy for simplified design
        this.smartAnimateValue('points', this.animatedPointsValue, data.totalPoints, 1200);
        setTimeout(() => this.smartAnimateValue('pubs', this.animatedPubsValue, data.pubsVisited, 800), 100);
        setTimeout(() => this.smartAnimateValue('checkins', this.animatedCheckinsValue, data.totalCheckins, 900), 200);
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
