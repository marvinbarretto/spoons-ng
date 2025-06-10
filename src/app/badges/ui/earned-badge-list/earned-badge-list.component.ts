// badges/ui/earned-badge-list.component.ts
import { Component, computed, inject, input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EarnedBadgeStore } from '../../data-access/earned-badge.store';
import { BadgeStore } from '../../data-access/badge.store';
import { BadgeComponent } from '../badge/badge.component';
import type { Badge } from '../../utils/badge.model';

@Component({
  selector: 'app-earned-badge-list',
  imports: [CommonModule, BadgeComponent],
  template: `
    <div class="earned-badges">
      <!-- Header -->
      <div class="earned-badges-header">
        <h2 class="earned-badges-title">
          {{ title() }}
          @if (earnedBadgeStore.hasData()) {
            <span class="badge-count">({{ earnedBadgeStore.earnedBadgeCount() }})</span>
          }
        </h2>

        @if (showStats()) {
          <div class="earned-badges-stats">
            <span class="stat">{{ earnedBadgeStore.earnedBadgeCount() }} earned</span>
            @if (recentBadgeCount() > 0) {
              <span class="stat stat--recent">{{ recentBadgeCount() }} this week</span>
            }
          </div>
        }
      </div>

      <!-- Loading State -->
      @if (earnedBadgeStore.loading()) {
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading your badges...</p>
        </div>
      }

      <!-- Error State -->
      @else if (earnedBadgeStore.error()) {
        <div class="error-state">
          <p class="error-message">{{ earnedBadgeStore.error() }}</p>
          <button (click)="retry()" class="retry-button">Try Again</button>
        </div>
      }

      <!-- Empty State -->
      @else if (earnedBadgeStore.isEmpty()) {
        <div class="empty-state">
          <div class="empty-icon">🏆</div>
          <h3>No badges yet</h3>
          <p>Start checking in to pubs to earn your first badge!</p>
        </div>
      }

      <!-- Badge List -->
      @else {
        <div class="badge-grid" [class]="gridClass()">
          @for (earnedBadge of displayBadges(); track earnedBadge.id) {
            @if (getBadgeDefinition(earnedBadge.badgeId); as badge) {
              <div class="badge-item">
                <app-badge
                  [badge]="badge"
                  [size]="badgeSize()"
                  [showName]="showBadgeNames()"
                  [showDescription]="showDescriptions()"
                  [showCategory]="showCategories()"
                />

                @if (showEarnedDate()) {
                  <div class="earned-date">
                    Earned {{ formatDate(earnedBadge.awardedAt) }}
                  </div>
                }
              </div>
            } @else {
              <!-- Fallback for missing badge definition -->
              <div class="badge-item badge-item--missing">
                <div class="missing-badge">
                  <span class="missing-icon">❓</span>
                  <span class="missing-text">Badge not found</span>
                </div>
              </div>
            }
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .earned-badges {
      width: 100%;
    }

    .earned-badges-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      gap: 1rem;
    }

    .earned-badges-title {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
      color: #111827;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .badge-count {
      font-size: 1rem;
      font-weight: 500;
      color: #6b7280;
    }

    .earned-badges-stats {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .stat {
      font-size: 0.875rem;
      color: #6b7280;
      padding: 0.25rem 0.75rem;
      background: #f3f4f6;
      border-radius: 9999px;
    }

    .stat--recent {
      background: #dbeafe;
      color: #1d4ed8;
    }

    .loading-state,
    .error-state,
    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
    }

    .loading-spinner {
      width: 2rem;
      height: 2rem;
      border: 2px solid #e5e7eb;
      border-top: 2px solid #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-message {
      color: #dc2626;
      margin-bottom: 1rem;
    }

    .retry-button {
      padding: 0.5rem 1rem;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 0.375rem;
      cursor: pointer;
      font-size: 0.875rem;
    }

    .retry-button:hover {
      background: #2563eb;
    }

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .empty-state h3 {
      margin: 0 0 0.5rem 0;
      color: #374151;
    }

    .empty-state p {
      margin: 0;
      color: #6b7280;
    }

    .badge-grid {
      display: grid;
      gap: 1rem;
    }

    .badge-grid--small {
      grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
    }

    .badge-grid--medium {
      grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
    }

    .badge-grid--large {
      grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr));
    }

    .badge-grid--list {
      grid-template-columns: 1fr;
    }

    .badge-item {
      position: relative;
    }

    .badge-item--missing {
      opacity: 0.6;
    }

    .missing-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      border: 1px dashed #d1d5db;
      border-radius: 0.5rem;
      color: #6b7280;
    }

    .earned-date {
      margin-top: 0.5rem;
      font-size: 0.75rem;
      color: #9ca3af;
      text-align: center;
    }
  `]
})
export class EarnedBadgeListComponent implements OnInit {
  protected readonly earnedBadgeStore = inject(EarnedBadgeStore);
  protected readonly badgeStore = inject(BadgeStore);

  // Configuration inputs
  readonly title = input<string>('Your Badges');
  readonly layout = input<'grid' | 'list'>('grid');
  readonly badgeSize = input<'small' | 'medium' | 'large'>('medium');
  readonly maxItems = input<number | null>(null);
  readonly showStats = input<boolean>(true);
  readonly showBadgeNames = input<boolean>(true);
  readonly showDescriptions = input<boolean>(false);
  readonly showCategories = input<boolean>(false);
  readonly showEarnedDate = input<boolean>(false);

  ngOnInit(): void {
    // Load both stores
    this.earnedBadgeStore.loadOnce();
    this.badgeStore.loadOnce();

      // Debug logs
      setTimeout(() => {
        console.log('=== EARNED BADGE LIST DEBUG ===');
        console.log('BadgeStore loaded:', this.badgeStore.badges().length);
        console.log('EarnedBadgeStore loaded:', this.earnedBadgeStore.data().length);

        // 🔍 NEW: Check actual badge IDs in store
        console.log('Available badge IDs:', this.badgeStore.badges().map(b => b.id));
        console.log('Earned badge IDs:', this.earnedBadgeStore.data().map(eb => eb.badgeId));

        // 🔍 NEW: Check exact lookup
        const earnedBadgeId = this.earnedBadgeStore.data()[0]?.badgeId;
        console.log('Looking for badge ID:', earnedBadgeId);
        console.log('Badge store get() result:', this.badgeStore.badges().find(b => b.id === earnedBadgeId));

        this.displayBadges().forEach(earnedBadge => {
          const badgeDefinition = this.getBadgeDefinition(earnedBadge.badgeId);
          console.log(`Badge ${earnedBadge.badgeId}:`, badgeDefinition ? 'FOUND' : 'NOT FOUND');
        });
      }, 3000);
  }

  // Computed signals
  protected readonly displayBadges = computed(() => {
    const badges = this.earnedBadgeStore.badgesByDate();
    const max = this.maxItems();
    return max ? badges.slice(0, max) : badges;
  });

  protected readonly gridClass = computed(() => {
    if (this.layout() === 'list') return 'badge-grid--list';
    return `badge-grid--${this.badgeSize()}`;
  });

  protected readonly recentBadgeCount = computed(() => {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    return this.earnedBadgeStore.getEarnedBadgesSince(oneWeekAgo).length;
  });

  // Helper methods
  protected getBadgeDefinition(badgeId: string): Badge | undefined {
    return this.badgeStore.badges().find(b => b.id === badgeId);
  }

  protected formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) return 'today';
    if (daysDiff === 1) return 'yesterday';
    if (daysDiff < 7) return `${daysDiff} days ago`;
    if (daysDiff < 30) return `${Math.floor(daysDiff / 7)} weeks ago`;

    return date.toLocaleDateString();
  }

  protected retry(): void {
    this.earnedBadgeStore.load();
  }
}
