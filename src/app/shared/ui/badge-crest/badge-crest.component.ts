/**
 * @fileoverview BadgeCrestComponent - Reusable badge crest display
 *
 * A dumb component that displays a badge as a shield-like crest with:
 * - Badge icon/emoji
 * - Badge name banner
 * - Earned/unearned states
 * - Multiple size variants
 * - Hover effects
 *
 * Usage:
 * <app-badge-crest
 *   [badge]="badgeDefinition"
 *   [isEarned]="true"
 *   [size]="'small'"
 *   [showEarnedIndicator]="true" />
 */

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { Badge } from '../../../badges/utils/badge.model';

export type BadgeCrestSize = 'tiny' | 'small' | 'medium' | 'large';

@Component({
  selector: 'app-badge-crest',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="badge-crest" [class]="badgeClasses()" [title]="badgeTitle()">
      <div class="badge-shield">
        <div class="badge-icon">{{ badgeIcon() }}</div>
        @if (showBanner()) {
          <div class="badge-banner">{{ badgeBanner() }}</div>
        }
        @if (showEarnedIndicator() && isEarned()) {
          <div class="earned-indicator">✓</div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .badge-crest {
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
        display: inline-block;
      }

      .badge-crest:hover {
        transform: scale(1.05);
      }

      .badge-shield {
        border-radius: 50% 50% 10px 10px;
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
      }

      /* Size Variants */
      .size-tiny .badge-shield {
        width: 32px;
        height: 38px;
      }

      .size-tiny .badge-icon {
        font-size: 0.875rem;
        margin-bottom: 1px;
      }

      .size-tiny .badge-banner {
        font-size: 0.375rem;
        padding: 0px 1px;
      }

      .size-tiny .earned-indicator {
        width: 12px;
        height: 12px;
        font-size: 8px;
        top: -3px;
        right: -3px;
      }

      .size-small .badge-shield {
        width: 45px;
        height: 52px;
      }

      .size-small .badge-icon {
        font-size: 1rem;
        margin-bottom: 1px;
      }

      .size-small .badge-banner {
        font-size: 0.5rem;
        padding: 1px 2px;
      }

      .size-small .earned-indicator {
        width: 14px;
        height: 14px;
        font-size: 9px;
        top: -4px;
        right: -4px;
      }

      .size-medium .badge-shield {
        width: 60px;
        height: 70px;
      }

      .size-medium .badge-icon {
        font-size: 1.5rem;
        margin-bottom: 2px;
      }

      .size-medium .badge-banner {
        font-size: 0.6rem;
        padding: 1px 2px;
      }

      .size-medium .earned-indicator {
        width: 18px;
        height: 18px;
        font-size: 10px;
        top: -5px;
        right: -5px;
      }

      .size-large .badge-shield {
        width: 80px;
        height: 95px;
      }

      .size-large .badge-icon {
        font-size: 2rem;
        margin-bottom: 3px;
      }

      .size-large .badge-banner {
        font-size: 0.75rem;
        padding: 2px 3px;
      }

      .size-large .earned-indicator {
        width: 22px;
        height: 22px;
        font-size: 12px;
        top: -6px;
        right: -6px;
      }

      /* EARNED BADGES - Vibrant and highlighted */
      .earned .badge-shield {
        background: linear-gradient(145deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%);
        border: 3px solid #ffd700;
      }

      .earned .badge-banner {
        background: #ffd700;
        color: #1e40af;
      }

      .earned:hover {
        transform: scale(1.1);
      }

      /* UNEARNED BADGES - Greyed out and subtle */
      .unearned {
        opacity: 0.4;
        filter: grayscale(0.7);
      }

      .unearned .badge-shield {
        background: linear-gradient(145deg, #64748b 0%, #475569 50%, #334155 100%);
        border: 3px solid #94a3b8;
      }

      .unearned .badge-banner {
        background: #cbd5e1;
        color: #475569;
      }

      .unearned:hover {
        opacity: 0.6;
        transform: scale(1.02);
      }

      .badge-icon {
        line-height: 1;
      }

      .badge-banner {
        position: absolute;
        bottom: 2px;
        left: 0;
        right: 0;
        font-weight: 700;
        text-align: center;
        border-radius: 0 0 6px 6px;
        text-transform: uppercase;
      }

      .earned-indicator {
        position: absolute;
        background: #10b981;
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      /* Compact mode for dense layouts */
      .compact .badge-banner {
        display: none;
      }

      .compact:hover .badge-banner {
        display: block;
      }
    `,
  ],
})
export class BadgeCrestComponent {
  // Required inputs
  readonly badge = input.required<Badge>();

  // Optional inputs with defaults
  readonly isEarned = input<boolean>(false);
  readonly size = input<BadgeCrestSize>('medium');
  readonly showEarnedIndicator = input<boolean>(true);
  readonly showBanner = input<boolean>(true);
  readonly compact = input<boolean>(false);

  // Computed properties
  readonly badgeClasses = computed(() => {
    const classes = [];
    classes.push(`size-${this.size()}`);
    classes.push(this.isEarned() ? 'earned' : 'unearned');
    if (this.compact()) classes.push('compact');
    return classes.join(' ');
  });

  readonly badgeIcon = computed(() => {
    const badge = this.badge();
    if (badge.emoji) return badge.emoji;
    if (badge.icon) return badge.icon;

    // Fallback to icon mapping by ID
    return this.getBadgeIconById(badge.id);
  });

  readonly badgeBanner = computed(() => {
    const name = this.badge().name;
    if (!name) return '';
    // Convert "First Check-in" to "FIRST" etc.
    return name.split(' ')[0].toUpperCase().slice(0, 6);
  });

  readonly badgeTitle = computed(() => {
    const badge = this.badge();
    return this.isEarned()
      ? `${badge.name} - Earned!`
      : `${badge.name} - ${badge.description || 'Not yet earned'}`;
  });

  // Badge icon mapping (could be moved to a service later)
  private getBadgeIconById(badgeId: string): string {
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
  }
}
