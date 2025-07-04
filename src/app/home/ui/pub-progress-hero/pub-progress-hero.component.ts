// src/app/features/home/ui/pub-progress-hero/pub-progress-hero.component.ts
import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-pub-progress-hero',
  imports: [],
  template: `
    <section class="progress-hero" [class.has-progress]="hasProgress()">

      <!-- Main Count Display -->
      <div class="count-display">
        <div class="count-circle">
          <span class="big-number">{{ visitedCount() }}</span>
          <svg class="progress-ring" viewBox="0 0 120 120" aria-hidden="true">
            <circle class="progress-ring-background" cx="60" cy="60" r="54" />
            <circle
              class="progress-ring-fill"
              cx="60" cy="60"
              r="54"
              [style.stroke-dasharray]="circumference"
              [style.stroke-dashoffset]="progressOffset()"
            />
          </svg>
        </div>

        <div class="count-text">
          <h1 class="achievement-title">{{ achievementText() }}</h1>
          <p class="achievement-subtitle">{{ subtitleText() }}</p>
        </div>
      </div>

      <!-- Progress Stats -->
      <div class="progress-stats">
        <div class="stat-item">
          <span class="stat-number">{{ progressPercent() }}%</span>
          <span class="stat-label">Complete</span>
        </div>

        @if (nextMilestone()) {
          <div class="stat-item milestone">
            <span class="stat-number">{{ pubsToNextMilestone() }}</span>
            <span class="stat-label">to next milestone</span>
          </div>
        }


      </div>

      <!-- Milestone Progress Bar -->
      @if (nextMilestone()) {
        <div class="milestone-progress">
          <div class="milestone-info">
            <span class="milestone-current">{{ lastMilestone() || 0 }}</span>
            <span class="milestone-target">{{ nextMilestone() }}</span>
          </div>
          <div class="milestone-bar">
            <div
              class="milestone-fill"
              [style.width.%]="milestoneProgress()"
            ></div>
          </div>
        </div>
      }
    </section>
  `,
  styles: `
    .progress-hero {
      background: linear-gradient(135deg, var(--primary) 0%, var(--color-secondary) 100%);
      border-radius: 16px;
      padding: 2rem;
      color: var(--primaryText);
      position: relative;
      overflow: hidden;
    }

    .progress-hero::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="20" cy="20" r="2" fill="rgba(255,255,255,0.1)"/><circle cx="80" cy="40" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="40" cy="80" r="1.5" fill="rgba(255,255,255,0.1)"/></svg>');
      opacity: 0.3;
      pointer-events: none;
    }

    .count-display {
      display: flex;
      align-items: center;
      gap: 2rem;
      margin-bottom: 2rem;
      position: relative;
      z-index: 1;
    }

    .count-circle {
      position: relative;
      width: 120px;
      height: 120px;
      flex-shrink: 0;
    }

    .big-number {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 2.5rem;
      font-weight: 800;
      color: var(--accent);
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      z-index: 2;
    }

    .progress-ring {
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
    }

    .progress-ring-background {
      fill: none;
      stroke: rgba(255, 255, 255, 0.2);
      stroke-width: 4;
    }

    .progress-ring-fill {
      fill: none;
      stroke: #ffd700;
      stroke-width: 4;
      stroke-linecap: round;
      transition: stroke-dashoffset 0.8s ease-in-out;
      filter: drop-shadow(0 0 6px rgba(255, 215, 0, 0.4));
    }

    .count-text {
      flex: 1;
      min-width: 0;
    }

    .achievement-title {
      margin: 0 0 0.5rem 0;
      font-size: 1.6rem;
      font-weight: 700;
      line-height: 1.2;

    }

    .achievement-subtitle {
      margin: 0;
      font-size: 1rem;
      opacity: 0.9;
      line-height: 1.4;
    }

    .progress-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 1.5rem;
      margin-bottom: 1.5rem;
      position: relative;
      z-index: 1;
    }

    .stat-item {
      text-align: center;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 1rem 0.75rem;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .stat-item.milestone {
      background: rgba(255, 215, 0, 0.15);
      border-color: rgba(255, 215, 0, 0.3);
    }

    .stat-number {
      display: block;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--primaryText);
      margin-bottom: 0.25rem;
    }

    .stat-label {
      font-size: 0.8rem;
      opacity: 0.9;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .milestone-progress {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 1rem;
      position: relative;
      z-index: 1;
    }

    .milestone-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
      font-weight: 600;
    }

    .milestone-current {
      color: #ffd700;
    }

    .milestone-target {
      color: rgba(255, 255, 255, 0.9);
    }

    .milestone-bar {
      height: 8px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      overflow: hidden;
    }

    .milestone-fill {
      height: 100%;
      background: linear-gradient(90deg, #ffd700 0%, #ffed4e 100%);
      border-radius: 4px;
      transition: width 0.8s ease-out;
      box-shadow: 0 0 10px rgba(255, 215, 0, 0.4);
    }

    /* No progress state */
    .progress-hero:not(.has-progress) .count-circle {
      opacity: 0.7;
    }

    .progress-hero:not(.has-progress) .achievement-title {
      color: #ffd700;
    }

    /* Mobile responsive */
    @media (max-width: 480px) {
      .progress-hero {
        padding: 1.5rem;
      }

      .count-display {
        flex-direction: column;
        text-align: center;
        gap: 1.5rem;
        margin-bottom: 1.5rem;
      }

      .count-circle {
        width: 100px;
        height: 100px;
      }

      .big-number {
        font-size: 2rem;
      }

      .achievement-title {
        font-size: 1.4rem;
      }

      .progress-stats {
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
      }

      .stat-item {
        padding: 0.75rem 0.5rem;
      }

      .stat-number {
        font-size: 1.3rem;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PubProgressHeroComponent {
  readonly visitedCount = input.required<number>();
  readonly totalPubs = input.required<number>();
  readonly hasProgress = input(false);

  // ✅ Existing computed properties
  readonly progressPercent = computed(() => {
    const visited = this.visitedCount();
    const total = this.totalPubs();
    if (total === 0) return 0;
    return Math.min(Math.round((visited / total) * 100), 100);
  });

  readonly achievementText = computed(() => {
    const count = this.visitedCount();
    if (count === 0) return 'Start Your Pub Quest!';
    if (count === 1) return 'First Pub Conquered!';
    if (count < 5) return 'Pubs Collected!';
    if (count < 10) return 'Pub Explorer!';
    if (count < 25) return 'Pub Crawling Pro!';
    if (count < 50) return 'Legendary Explorer!';
    if (count < 100) return 'Ultimate Champion!';
    return 'Pub Master Legend!';
  });

  readonly subtitleText = computed(() => {
    const count = this.visitedCount();
    const percent = this.progressPercent();
    if (count === 0) return 'Your first pub adventure awaits';
    if (count === 1) return 'The beginning of an epic journey';
    if (count < 5) return 'Building momentum, one pint at a time';
    if (count < 10) return `${percent}% of the way to pub mastery`;
    if (count < 25) return `Impressive ${percent}% completion rate`;
    if (count < 50) return `Halfway champion with ${percent}%`;
    return `Absolute legend with ${percent}% conquered`;
  });

  readonly nextMilestone = computed(() => {
    const count = this.visitedCount();
    const milestones = [5, 10, 25, 50, 100, 200, 500];
    return milestones.find(milestone => milestone > count) || null;
  });

  readonly lastMilestone = computed(() => {
    const count = this.visitedCount();
    const milestones = [0, 5, 10, 25, 50, 100, 200, 500];
    const last = milestones.reverse().find(milestone => milestone <= count);
    return last === 0 ? null : last;
  });

  readonly pubsToNextMilestone = computed(() => {
    const next = this.nextMilestone();
    const current = this.visitedCount();
    return next ? next - current : 0;
  });

  // ✅ New computed properties for circular progress
  readonly circumference = 2 * Math.PI * 54; // radius = 54

  readonly progressOffset = computed(() => {
    const percent = this.progressPercent();
    return this.circumference - (percent / 100) * this.circumference;
  });

  readonly milestoneProgress = computed(() => {
    const current = this.visitedCount();
    const last = this.lastMilestone() || 0;
    const next = this.nextMilestone();

    if (!next) return 100;

    const progress = ((current - last) / (next - last)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  });
}
