import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { Badge, EarnedBadge } from '../../utils/badge.model';

// ✅ Type for combined earned badge + definition
type EarnedBadgeWithDefinition = {
  earnedBadge: EarnedBadge;
  badge: Badge | undefined;
};

@Component({
  selector: 'app-earned-badge-list',
  imports: [],
  template: `
    <section class="badges-section">
      <h2>{{ title() }}</h2>

      @if (displayBadges().length === 0) {
        <div class="placeholder">
          <p>🏆 Your badges will appear here</p>
          <small>Check in to pubs to earn your first badge!</small>
        </div>
      } @else {
        <div class="badges-container">
          @for (item of displayBadges(); track item.earnedBadge.id) {
            <div class="badge-item" [class]="'size-' + size()">
              <div class="badge-icon">
                @if (item.badge?.emoji) {
                  <span class="badge-emoji">{{ item.badge?.emoji }}</span>
                } @else if (item.badge?.icon) {
                  <span class="badge-icon-text">{{ item.badge?.icon }}</span>
                } @else {
                  <span class="badge-default-icon">🏆</span>
                }
              </div>

              <div class="badge-content">
                <h4 class="badge-name">
                  {{ item.badge?.name || 'Unknown Badge' }}
                </h4>

                @if (showEarnedDate()) {
                  <small class="badge-date">
                    Earned {{ formatEarnedDate(item.earnedBadge.awardedAt) }}
                  </small>
                }

                @if (item.badge?.description && size() !== 'small') {
                  <p class="badge-description">
                    {{ item.badge?.description }}
                  </p>
                }
              </div>
            </div>
          }
        </div>

        @if (linkToFullPage()) {
          <div class="badges-footer">
            <a href="/badges" class="view-all-link">View All Badges →</a>
          </div>
        }
      }
    </section>
  `,
  styles: `
    .badges-section {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      border: 1px solid #e9ecef;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
    }

    .badges-section h2 {
      margin: 0 0 1.25rem 0;
      color: #333;
      font-size: 1.3rem;
      font-weight: 600;
    }

    .placeholder {
      text-align: center;
      padding: 2rem 1rem;
      color: #6c757d;
      background: #f8f9fa;
      border-radius: 8px;
      border: 2px dashed #dee2e6;
    }

    .placeholder p {
      margin: 0 0 0.5rem 0;
      font-size: 1.1rem;
    }

    .placeholder small {
      color: #adb5bd;
    }

    .badges-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .badge-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e9ecef;
      transition: all 0.2s ease;
    }

    .badge-item:hover {
      background: #e9ecef;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    /* Size variants */
    .badge-item.size-small {
      padding: 0.75rem;
      gap: 0.75rem;
    }

    .badge-item.size-small .badge-icon {
      width: 40px;
      height: 40px;
      font-size: 1.2rem;
    }

    .badge-item.size-medium {
      padding: 1rem;
      gap: 1rem;
    }

    .badge-item.size-medium .badge-icon {
      width: 50px;
      height: 50px;
      font-size: 1.5rem;
    }

    .badge-item.size-large {
      padding: 1.25rem;
      gap: 1.25rem;
    }

    .badge-item.size-large .badge-icon {
      width: 60px;
      height: 60px;
      font-size: 1.8rem;
    }

    .badge-icon {
      width: 50px;
      height: 50px;
      background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 1.5rem;
      box-shadow: 0 2px 4px rgba(255, 215, 0, 0.3);
    }

    .badge-emoji,
    .badge-icon-text,
    .badge-default-icon {
      line-height: 1;
    }

    .badge-content {
      flex: 1;
      min-width: 0;
    }

    .badge-name {
      margin: 0 0 0.25rem 0;
      color: #333;
      font-size: 1rem;
      font-weight: 600;
      line-height: 1.2;
    }

    .badge-item.size-small .badge-name {
      font-size: 0.9rem;
      margin-bottom: 0.125rem;
    }

    .badge-item.size-large .badge-name {
      font-size: 1.1rem;
      margin-bottom: 0.375rem;
    }

    .badge-date {
      color: #6c757d;
      font-size: 0.8rem;
      line-height: 1.2;
    }

    .badge-description {
      margin: 0.5rem 0 0 0;
      color: #666;
      font-size: 0.85rem;
      line-height: 1.3;
    }

    .badges-footer {
      text-align: center;
      margin-top: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid #e9ecef;
    }

    .view-all-link {
      color: #007bff;
      text-decoration: none;
      font-weight: 500;
      font-size: 0.9rem;
    }

    .view-all-link:hover {
      text-decoration: underline;
    }

    /* Mobile responsive */
    @media (max-width: 480px) {
      .badges-section {
        padding: 1.25rem;
      }

      .badge-item {
        padding: 0.75rem;
        gap: 0.75rem;
      }

      .badge-icon {
        width: 40px;
        height: 40px;
        font-size: 1.2rem;
      }

      .badge-name {
        font-size: 0.9rem;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EarnedBadgeListComponent {
  // ✅ Support both input formats for backward compatibility
  readonly earnedBadgesWithDefinitions = input<EarnedBadgeWithDefinition[]>([]);
  readonly recentBadges = input<EarnedBadge[]>([]); // ✅ Legacy support
  readonly title = input<string>('Recent Badges');
  readonly maxItems = input<number>(3);
  readonly size = input<'small' | 'medium' | 'large'>('medium');
  readonly showEarnedDate = input<boolean>(false);
  readonly linkToFullPage = input<boolean>(false);
  readonly showStats = input<boolean>(false); // ✅ Add missing input

  // ✅ Computed properties that work with either input
  readonly displayBadges = computed(() => {
    const withDefinitions = this.earnedBadgesWithDefinitions();
    const rawBadges = this.recentBadges();
    const max = this.maxItems();

    // ✅ Early return pattern for safety
    if (withDefinitions.length === 0 && rawBadges.length === 0) {
      return [];
    }

    // Use earnedBadgesWithDefinitions if provided, otherwise convert recentBadges
    const badges =
      withDefinitions.length > 0
        ? withDefinitions.filter(item => item.badge) // ✅ Filter out undefined badges early
        : rawBadges.map(earnedBadge => ({
            earnedBadge,
            badge: undefined, // Will show "Unknown Badge"
          }));

    return badges.slice(0, max);
  });

  // ✅ Format earned date for display
  formatEarnedDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'today';
    } else if (diffDays === 1) {
      return 'yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  }
}
