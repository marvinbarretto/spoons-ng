// src/app/home/ui/badges-showcase/badges-showcase.component.ts
import { Component, inject, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Badge } from '@badges/utils/badge.model';
import { BadgeStore } from '@badges/data-access/badge.store';

type BadgeWithStatus = {
  badge: Badge;
  isEarned: boolean;
};

@Component({
  selector: 'app-badges-showcase',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="badges-showcase">
      <h3 class="badges-title">🏅 Badge Collection</h3>
      <div class="progress-summary">
        {{ earnedCount() }} of {{ totalBadges() }} badges earned
      </div>
      
      @if (loading()) {
        <div class="loading-state">Loading badges...</div>
      } @else if (error()) {
        <div class="error-state">{{ error() }}</div>
      } @else {
        <div class="badges-grid">
          @for (item of allBadgesWithStatus(); track item.badge.id) {
            <div 
              class="badge-crest" 
              [class.badge-earned]="item.isEarned"
              [class.badge-unearned]="!item.isEarned"
              [title]="getBadgeTitle(item)">
              <div class="badge-shield">
                <div class="badge-icon">{{ getBadgeIcon(item.badge.id) }}</div>
                <div class="badge-banner">{{ getBadgeShortName(item.badge.name) }}</div>
                @if (item.isEarned) {
                  <div class="earned-indicator">✓</div>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .badges-showcase {
      margin-bottom: 2rem;
    }

    .badges-title {
      font-size: 1.125rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      text-align: center;
      color: var(--color-text, #1f2937);
    }

    .progress-summary {
      text-align: center;
      font-size: 0.875rem;
      color: #6b7280;
      margin-bottom: 1rem;
      font-weight: 500;
    }

    .loading-state, .error-state {
      text-align: center;
      padding: 2rem;
      color: #6b7280;
    }

    .error-state {
      color: #dc2626;
    }

    .badges-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
      gap: 0.75rem;
      justify-items: center;
      max-width: 600px;
      margin: 0 auto;
    }

    .badge-crest {
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
    }

    .badge-crest:hover {
      transform: scale(1.05);
    }

    .badge-shield {
      width: 60px;
      height: 70px;
      border-radius: 50% 50% 10px 10px;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    }

    /* EARNED BADGES - Vibrant and highlighted */
    .badge-earned .badge-shield {
      background: linear-gradient(145deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%);
      border: 3px solid #ffd700;
    }

    .badge-earned .badge-banner {
      background: #ffd700;
      color: #1e40af;
    }

    .badge-earned:hover {
      transform: scale(1.1);
    }

    /* UNEARNED BADGES - Greyed out and subtle */
    .badge-unearned {
      opacity: 0.4;
      filter: grayscale(0.7);
    }

    .badge-unearned .badge-shield {
      background: linear-gradient(145deg, #64748b 0%, #475569 50%, #334155 100%);
      border: 3px solid #94a3b8;
    }

    .badge-unearned .badge-banner {
      background: #cbd5e1;
      color: #475569;
    }

    .badge-unearned:hover {
      opacity: 0.6;
      transform: scale(1.02);
    }

    .badge-icon {
      font-size: 1.5rem;
      margin-bottom: 2px;
    }

    .badge-banner {
      position: absolute;
      bottom: 2px;
      left: 0;
      right: 0;
      font-size: 0.6rem;
      font-weight: 700;
      text-align: center;
      padding: 1px 2px;
      border-radius: 0 0 6px 6px;
      text-transform: uppercase;
    }

    .earned-indicator {
      position: absolute;
      top: -5px;
      right: -5px;
      background: #10b981;
      color: white;
      border-radius: 50%;
      width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: bold;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
  `
})
export class BadgesShowcaseComponent implements OnInit {
  private readonly badgeStore = inject(BadgeStore);

  // ✅ Computed Values
  readonly allBadgesWithStatus = computed(() => {
    const definitions = this.badgeStore.definitions();
    const earned = this.badgeStore.earnedBadges();
    
    return definitions.map(badge => ({
      badge,
      isEarned: earned.some(e => e.badgeId === badge.id)
    }));
  });

  readonly loading = computed(() => {
    return this.badgeStore.definitionsLoading() || this.badgeStore.loading();
  });

  readonly error = computed(() => {
    return this.badgeStore.definitionsError() || this.badgeStore.error();
  });

  readonly earnedCount = computed(() => {
    return this.allBadgesWithStatus().filter(item => item.isEarned).length;
  });

  readonly totalBadges = computed(() => {
    return this.allBadgesWithStatus().length;
  });

  ngOnInit(): void {
    this.badgeStore.loadOnce();
  }

  // ✅ Utility Methods
  getBadgeIcon(badgeId?: string): string {
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
    return iconMap[badgeId || ''] || '🏅';
  }

  getBadgeShortName(name?: string): string {
    if (!name) return '';
    // Convert "First Check-in" to "FIRST" etc.
    return name.split(' ')[0].toUpperCase().slice(0, 6);
  }

  getBadgeTitle(item: BadgeWithStatus): string {
    return item.isEarned 
      ? `${item.badge.name} - Earned!` 
      : `${item.badge.name} - ${item.badge.description}`;
  }
}
