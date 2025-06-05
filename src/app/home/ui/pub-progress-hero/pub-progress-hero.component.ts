import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-pub-progress-hero',
  imports: [],
  styleUrl: './pub-progress-hero.component.scss',
  template: `
    <section class="progress-hero">
      <!-- Main Achievement Display -->
      <div class="main-achievement">
        <span class="big-number">{{ visitedCount() }}</span>
        <h1 class="achievement-title">{{ achievementText() }}</h1>
        <p class="achievement-subtitle">{{ subtitleText() }}</p>
      </div>

      <!-- Progress Visual -->
      <div class="progress-section">
        <div class="progress-bar-container">
          <div class="progress-bar">
            <div
              class="progress-fill"
              [style.width.%]="progressPercent()"
              [attr.aria-valuenow]="progressPercent()"
              aria-valuemin="0"
              aria-valuemax="100"
              role="progressbar"
              [attr.aria-label]="progressAriaLabel()"
            ></div>
          </div>
          <div class="progress-text">
            <span class="current">{{ visitedCount() }}</span>
            <span class="separator">of</span>
            <span class="total">{{ totalPubs() }}</span>
            <span class="label">pubs conquered</span>
          </div>
        </div>
      </div>

      <!-- Motivational Content -->
      <div class="motivation-section">
        @if (motivationalMessage()) {
          <p class="motivation-text">{{ motivationalMessage() }}</p>
        }

        @if (nextMilestone()) {
          <div class="next-milestone">
            <span class="milestone-label">Next milestone:</span>
            <span class="milestone-target">{{ nextMilestone() }} pubs</span>
            <span class="milestone-remaining">({{ pubsToNextMilestone() }} to go!)</span>
          </div>
        }
      </div>
    </section>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PubProgressHeroComponent {
  /**
   * Number of pubs the user has visited
   */
  readonly visitedCount = input.required<number>();

  /**
   * Total number of pubs available to visit
   */
  readonly totalPubs = input.required<number>();

  /**
   * Whether the user has any progress to show
   */
  readonly hasProgress = input(false);

  /**
   * Progress percentage (0-100)
   * @returns Calculated percentage of pubs visited
   */
  readonly progressPercent = computed(() => {
    const visited = this.visitedCount();
    const total = this.totalPubs();

    if (total === 0) return 0;
    return Math.min(Math.round((visited / total) * 100), 100);
  });

  /**
   * Dynamic achievement text based on progress
   * @returns Contextual title text
   */
  readonly achievementText = computed(() => {
    const count = this.visitedCount();

    if (count === 0) return 'Start Your Carpet Quest!';
    if (count === 1) return 'carpet collected!';
    if (count < 5) return 'pubs collected!';
    if (count < 10) return 'Pubs Dominated!';
    if (count < 25) return 'Pub Crawling Pro!';
    if (count < 50) return 'Legendary Pub Explorer!';
    if (count < 100) return 'Ultimate Pub Champion!';
    return 'Pub Conquering Legend!';
  });

  /**
   * Subtitle text with encouraging messaging
   * @returns Subtitle describing achievement level
   */
  readonly subtitleText = computed(() => {
    const count = this.visitedCount();
    const percent = this.progressPercent();

    if (count === 0) return 'Your first pub adventure awaits';
    if (count === 1) return 'The beginning of a beautiful journey';
    if (count < 5) return 'Building momentum, one pint at a time';
    if (count < 10) return `${percent}% of the way to pub mastery`;
    if (count < 25) return `Seriously impressive ${percent}% completion`;
    if (count < 50) return `Halfway there! ${percent}% conquered`;
    return `Absolute legend with ${percent}% completion`;
  });

  /**
   * Motivational message based on current progress
   * @returns Encouraging message or null
   */
  readonly motivationalMessage = computed(() => {
    const count = this.visitedCount();

    if (count === 0) return null;
    if (count < 5) return '🍺 Every pub tells a story. What\'s yours?';
    if (count < 10) return '🏆 You\'re really getting into the swing of this!';
    if (count < 25) return '🎯 The leaderboard is calling your name...';
    if (count < 50) return '🔥 Unstoppable! The pubs fear your approach.';
    if (count < 100) return '👑 Pub royalty in the making. Bow down!';
    return '🌟 You are the stuff of pub legend. Absolutely mental!';
  });

  /**
   * Calculate next meaningful milestone
   * @returns Next milestone number or null if at max
   */
  readonly nextMilestone = computed(() => {
    const count = this.visitedCount();

    const milestones = [5, 10, 25, 50, 100, 200, 500];
    return milestones.find(milestone => milestone > count) || null;
  });

  /**
   * Number of pubs needed to reach next milestone
   * @returns Pubs remaining to next milestone
   */
  readonly pubsToNextMilestone = computed(() => {
    const next = this.nextMilestone();
    const current = this.visitedCount();

    return next ? next - current : 0;
  });

  /**
   * Accessible label for progress bar
   * @returns Screen reader friendly progress description
   */
  readonly progressAriaLabel = computed(() => {
    const visited = this.visitedCount();
    const total = this.totalPubs();
    const percent = this.progressPercent();

    return `Progress: ${visited} out of ${total} pubs visited, ${percent} percent complete`;
  });
}
