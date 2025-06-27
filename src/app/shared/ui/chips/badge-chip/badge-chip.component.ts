import { Component, input, computed, output } from '@angular/core';
import type { Badge } from '@badges/utils/badge.model';

export type ChipSize = 'xs' | 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-badge-chip',
  template: `
    <div
      class="badge-chip"
      [class]="chipClasses()"
      [attr.role]="clickable() ? 'button' : null"
      [attr.tabindex]="clickable() ? '0' : null"
      [attr.aria-label]="ariaLabel()"
      [attr.title]="tooltipText()"
      (click)="handleClick()"
      (keydown.enter)="handleClick()"
      (keydown.space)="handleClick()">

      <span class="chip-icon">{{ badgeIcon() }}</span>

      @if (showName()) {
        <span class="chip-text">{{ badgeShortName() }}</span>
      }

      @if (earned()) {
        <span class="earned-indicator" aria-label="Earned">✓</span>
      }
    </div>
  `,
  styleUrl: './badge-chip.component.scss'
})
export class BadgeChipComponent {
  readonly badge = input.required<Badge>();
  readonly earned = input(false);
  readonly size = input<ChipSize>('md');
  readonly showName = input(true);
  readonly clickable = input(false);
  readonly customClass = input<string>('');

  readonly clicked = output<Badge>();

  readonly badgeIcon = computed(() => {
    const badgeId = this.badge().id;

    // Use emoji from badge or fall back to icon mapping
    if (this.badge().emoji) {
      return this.badge().emoji;
    }

    const iconMap: Record<string, string> = {
      // Basic badges
      'first-checkin': '🌟',
      'early-riser': '🌞',
      'night-owl': '🌙',
      'streak-3': '🔥',

      // Regional Explorer
      'northern-soul': '🏔️',
      'southern-comfort': '🌾',
      'midlands-wanderer': '⚙️',
      'scottish-adventurer': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
      'welsh-warrior': '🐉',
      'cornish-pilgrim': '🏖️',
      'yorkshire-tyke': '🐑',
      'london-cabbie': '🚕',

      // Pub Chains
      'spoons-specialist': '🥄',
      'greene-king-groupie': '👑',
      'independent-advocate': '🍺',
      'chain-breaker': '⛓️',
      'brand-collector': '📊',
      'local-hero': '🏠',

      // Historic & Architectural
      'tudor-detective': '🏰',
      'coaching-inn-connoisseur': '🐎',
      'thatched-roof-hunter': '🏡',
      'gastro-pub-pioneer': '🍽️',
      'river-pub-navigator': '🚣',

      // Carpet Patterns
      'paisley-pattern-pro': '🌀',
      'tartan-tracker': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
      'floral-fanatic': '🌺',
      'geometric-genius': '📐',
      'burgundy-specialist': '🍷',
      'pattern-matcher': '🧩',

      // Seasonal & Weather
      'winter-warrior': '❄️',
      'summer-session-master': '☀️',
      'rainy-day-refugee': '🌧️',

      // Transport
      'train-station-tracker': '🚂',
      'motorway-services-survivor': '🛣️',
    };

    return iconMap[badgeId] || '🏅';
  });

  readonly badgeShortName = computed(() => {
    const name = this.badge().name;
    if (!name) return '';

    // Convert "First Check-in" to "FIRST" etc.
    return name.split(' ')[0].toUpperCase().slice(0, 6);
  });

  readonly chipClasses = computed(() => {
    const classes: string[] = [];

    classes.push(`size--${this.size()}`);

    if (this.earned()) {
      classes.push('earned');
    } else {
      classes.push('unearned');
    }

    if (this.clickable()) {
      classes.push('clickable');
    }

    if (this.customClass()) {
      classes.push(this.customClass());
    }

    return classes.join(' ');
  });

  readonly ariaLabel = computed(() => {
    const badge = this.badge();
    const earnedText = this.earned() ? 'earned' : 'not earned';
    const clickableText = this.clickable() ? ', clickable' : '';
    return `Badge ${badge.name}, ${earnedText}${clickableText}`;
  });

  readonly tooltipText = computed(() => {
    const badge = this.badge();
    const earnedText = this.earned() ? 'Earned!' : badge.description || 'Badge description';
    return `${badge.name} - ${earnedText}`;
  });

  handleClick(): void {
    if (this.clickable()) {
      this.clicked.emit(this.badge());
    }
  }
}
