// src/app/home/ui/pub-count-hero/pub-count-hero.component.ts
import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-pub-count-hero',
  template: `
    <section class="pub-count-hero">
      <div class="count-display">
        <div class="main-count">{{ count() }}</div>
        <div class="count-label">{{ countLabel() }}</div>
      </div>

      @if (showSubtext()) {
        <div class="subtext">{{ subtextMessage() }}</div>
      }

      @if (showGoal()) {
        <div class="goal-hint">
          <span class="goal-text">{{ goalText() }}</span>
        </div>
      }
    </section>
  `,
  styles: `
    .pub-count-hero {
      text-align: center;
      padding: 2rem 1rem;
      background: linear-gradient(135deg, var(--primary, #667eea) 0%, var(--color-secondary, #764ba2) 100%);
      color: white;
      border-radius: 20px;
      position: relative;
      overflow: hidden;
      margin-bottom: 1.5rem;
    }

    .pub-count-hero::before {
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
      position: relative;
      z-index: 1;
      margin-bottom: 1rem;
    }

    .main-count {
      font-size: 4rem;
      font-weight: 900;
      line-height: 1;
      color: var(--accent, #ffd700);
      text-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
      margin-bottom: 0.5rem;
    }

    .count-label {
      font-size: 1.25rem;
      font-weight: 600;
      opacity: 0.95;
      letter-spacing: 0.5px;
    }

    .subtext {
      font-size: 1rem;
      opacity: 0.85;
      margin-bottom: 1rem;
      line-height: 1.4;
      position: relative;
      z-index: 1;
    }

    .goal-hint {
      display: inline-flex;
      align-items: center;
      background: rgba(255, 255, 255, 0.15);
      padding: 0.5rem 1rem;
      border-radius: 20px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      position: relative;
      z-index: 1;
    }

    .goal-text {
      font-size: 0.9rem;
      font-weight: 500;
      opacity: 0.9;
    }

    /* Zero state styling */
    .pub-count-hero[data-count="0"] .main-count {
      color: rgba(255, 215, 0, 0.7);
    }

    .pub-count-hero[data-count="0"] .count-label {
      opacity: 0.7;
    }

    /* First milestone achieved */
    .pub-count-hero[data-milestone="true"] {
      background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
    }

    .pub-count-hero[data-milestone="true"] .main-count {
      color: #ffffff;
      animation: celebrationPulse 2s ease-in-out;
    }

    @keyframes celebrationPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }

    /* Mobile responsive */
    @media (max-width: 480px) {
      .pub-count-hero {
        padding: 1.5rem 1rem;
        margin-bottom: 1rem;
      }

      .main-count {
        font-size: 3rem;
      }

      .count-label {
        font-size: 1.1rem;
      }

      .subtext {
        font-size: 0.9rem;
      }

      .goal-hint {
        padding: 0.4rem 0.8rem;
      }

      .goal-text {
        font-size: 0.8rem;
      }
    }

    /* Large screens - make it even more prominent */
    @media (min-width: 768px) {
      .main-count {
        font-size: 5rem;
      }

      .count-label {
        font-size: 1.4rem;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PubCountHeroComponent {
  // ✅ Required inputs
  readonly count = input.required<number>();

  // ✅ Optional inputs with defaults
  readonly showSubtext = input(true);
  readonly showGoal = input(true);
  readonly nextMilestone = input<number | null>(null);

  // ✅ Computed label based on count
  readonly countLabel = computed(() => {
    const count = this.count();
    return count === 1 ? 'Pub Visited' : 'Pubs Visited';
  });

  // ✅ Dynamic subtext based on user journey stage
  readonly subtextMessage = computed(() => {
    const count = this.count();

    if (count === 0) return 'Your pub adventure awaits!';
    if (count === 1) return 'Great start! Keep exploring';
    if (count < 5) return 'Building momentum, one pub at a time';
    if (count < 10) return 'You\'re getting the hang of this!';
    if (count < 25) return 'Impressive pub exploring skills';
    if (count < 50) return 'Halfway to legendary status';
    if (count < 100) return 'True pub crawling champion';
    return 'Absolute pub master legend!';
  });

  // ✅ Goal text for next milestone
  readonly goalText = computed(() => {
    const milestone = this.nextMilestone();
    const count = this.count();

    if (!milestone) return null;

    const remaining = milestone - count;
    if (remaining <= 0) return null;

    if (remaining === 1) return `1 more pub to reach ${milestone}!`;
    return `${remaining} more pubs to reach ${milestone}`;
  });

  // ✅ Check if user just hit a milestone (for celebration styling)
  readonly justHitMilestone = computed(() => {
    const count = this.count();
    const milestones = [1, 5, 10, 25, 50, 100, 200, 500];
    return milestones.includes(count);
  });
}
