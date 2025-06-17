// src/app/home/ui/badges-showcase/badges-showcase.component.ts
import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { EarnedBadge, Badge } from '@badges/utils/badge.model';

type EarnedBadgeWithDefinition = {
  earnedBadge: EarnedBadge;
  badge: Badge | undefined;
};

@Component({
  selector: 'app-badges-showcase',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="badges-showcase">
      <h3 class="badges-title">🏅 Your Badges</h3>
      <div class="badges-grid">
        @for (badge of displayBadges(); track badge.badge?.id) {
          <div class="badge-crest" [title]="badge.badge?.name">
            <div class="badge-shield">
              <div class="badge-icon">{{ getBadgeIcon(badge.badge?.id) }}</div>
              <div class="badge-banner">{{ getBadgeShortName(badge.badge?.name) }}</div>
            </div>
          </div>
        }

        <!-- Show "view all" if more badges than displayed -->
        @if (hasMoreBadges()) {
          <div class="badge-crest view-all" (click)="handleViewAllBadges()">
            <div class="badge-shield">
              <div class="badge-icon">+{{ remainingBadgeCount() }}</div>
              <div class="badge-banner">More</div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .badges-showcase {
      margin-bottom: 2rem;
    }

    .badges-title {
      font-size: 1.125rem;
      font-weight: 700;
      margin-bottom: 1rem;
      text-align: center;
      color: var(--color-text, #1f2937);
    }

    .badges-grid {
      display: flex;
      justify-content: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .badge-crest {
      cursor: pointer;
      transition: transform 0.2s ease;
    }

    .badge-crest:hover {
      transform: scale(1.1);
    }

    .badge-shield {
      width: 60px;
      height: 70px;
      background: linear-gradient(145deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%);
      border: 3px solid #ffd700;
      border-radius: 50% 50% 10px 10px;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
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
      background: #ffd700;
      color: #1e40af;
      font-size: 0.6rem;
      font-weight: 700;
      text-align: center;
      padding: 1px 2px;
      border-radius: 0 0 6px 6px;
      text-transform: uppercase;
    }

    .badge-crest.view-all .badge-shield {
      background: linear-gradient(145deg, #64748b 0%, #475569 50%, #334155 100%);
      border-color: #e2e8f0;
    }

    .badge-crest.view-all .badge-banner {
      background: #e2e8f0;
      color: #334155;
    }
  `
})
export class BadgesShowcaseComponent {
  // ✅ Inputs
  readonly badges = input<EarnedBadgeWithDefinition[]>([]);
  readonly maxDisplay = input(6);

  // ✅ Outputs
  readonly viewAllBadges = output<void>();

  // ✅ Computed Values
  readonly displayBadges = computed(() => {
    return this.badges().slice(0, this.maxDisplay());
  });

  readonly hasMoreBadges = computed(() => {
    return this.badges().length > this.maxDisplay();
  });

  readonly remainingBadgeCount = computed(() => {
    const total = this.badges().length;
    const displayed = this.maxDisplay();
    return Math.max(0, total - displayed);
  });

  // ✅ Utility Methods
  getBadgeIcon(badgeId?: string): string {
    const iconMap: Record<string, string> = {
      'first-checkin': '🥇',
      'early-bird': '🌅',
      'night-owl': '🦉',
      'weekend-warrior': '⚔️',
      'local-hero': '🏠',
      'explorer': '🗺️',
      'social-butterfly': '🦋',
      'regular': '⭐',
      'landlord': '👑',
      'marathon': '🏃',
    };
    return iconMap[badgeId || ''] || '🏅';
  }

  getBadgeShortName(name?: string): string {
    if (!name) return '';
    // Convert "First Check-in" to "FIRST" etc.
    return name.split(' ')[0].toUpperCase().slice(0, 6);
  }

  // ✅ Event Handler
  handleViewAllBadges(): void {
    this.viewAllBadges.emit();
  }
}
