/**
 * @fileoverview BadgesWidgetComponent - Badge collection display widget
 *
 * RESPONSIBILITIES:
 * - Display user's badge collection with earned/unearned status
 * - Show progress summary (X of Y badges earned)
 * - Self-contained data loading from BadgeStore
 * - Loading states and error handling
 * - Responsive grid layout
 *
 * @architecture Widget component - extends BaseWidgetComponent, self-contained data loading
 */

import { Component, computed, inject, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseWidgetComponent } from '../base/base-widget.component';
import { BadgeStore } from '../../badges/data-access/badge.store';
import { BadgeCrestComponent } from '../../shared/ui/badge-crest/badge-crest.component';
import { LoadingStateComponent, ErrorStateComponent, EmptyStateComponent } from '../../shared/ui/state-components';
import type { Badge } from '../../badges/utils/badge.model';

type BadgeWithStatus = {
  badge: Badge;
  isEarned: boolean;
};

@Component({
  selector: 'app-badges-widget',
  imports: [CommonModule, BadgeCrestComponent, LoadingStateComponent, ErrorStateComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="badges-widget">
      <div class="widget-header">
        <h3 class="widget-title">🏅 Badge Collection</h3>
        <div class="progress-summary">
          {{ earnedCount() }} of {{ totalBadges() }} badges earned
        </div>
      </div>

      @if (isLoading()) {
        <app-loading-state text="Loading badges..." />
      } @else if (hasError()) {
        <app-error-state 
          [message]="hasError()!"
          [showRetry]="true"
          retryText="Retry"
          (retry)="handleRetry()"
        />
      } @else if (totalBadges() === 0) {
        <app-empty-state 
          icon="🏅"
          title="No badges available"
          subtitle="Check back later for new badges to earn!"
        />
      } @else {
        <div class="badges-grid">
          @for (item of allBadgesWithStatus(); track item.badge.id) {
            <app-badge-crest
              [badge]="item.badge"
              [isEarned]="item.isEarned"
              size="medium"
              [showEarnedIndicator]="true"
              [showBanner]="true" />
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .badges-widget {
      padding: 1rem;
      background: var(--background-lighter);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      box-shadow: var(--shadow);
    }

    .widget-header {
      margin-bottom: 1rem;
      text-align: center;
    }

    .widget-title {
      margin: 0 0 0.5rem 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text);
    }

    .progress-summary {
      font-size: 0.875rem;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .badges-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
      gap: 0.75rem;
      justify-items: center;
      max-width: 600px;
      margin: 0 auto;
    }

    /* Responsive design */
    @media (max-width: 480px) {
      .badges-widget {
        padding: 0.75rem;
      }
      
      .widget-title {
        font-size: 1rem;
      }
      
      .progress-summary {
        font-size: 0.8125rem;
      }
      
      .badges-grid {
        grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
        gap: 0.5rem;
      }
    }
  `]
})
export class BadgesWidgetComponent extends BaseWidgetComponent implements OnInit {
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

  readonly earnedCount = computed(() => {
    return this.allBadgesWithStatus().filter(item => item.isEarned).length;
  });

  readonly totalBadges = computed(() => {
    return this.allBadgesWithStatus().length;
  });

  // ✅ Loading/error state computed signals
  readonly isLoading = computed(() => {
    return this.badgeStore.definitionsLoading() || this.badgeStore.loading();
  });

  readonly hasError = computed(() => {
    return this.badgeStore.definitionsError() || this.badgeStore.error();
  });

  override ngOnInit(): void {
    this.badgeStore.loadOnce();
  }

  handleRetry(): void {
    this.badgeStore.loadOnce();
  }
}