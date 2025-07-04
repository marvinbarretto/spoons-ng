// src/app/home/ui/badges-showcase/badges-showcase.component.ts
import { Component, inject, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Badge } from '@badges/utils/badge.model';
import { BadgeStore } from '@badges/data-access/badge.store';
import { BadgeCrestComponent } from '../../../shared/ui/badge-crest/badge-crest.component';

type BadgeWithStatus = {
  badge: Badge;
  isEarned: boolean;
};

@Component({
  selector: 'app-badges-showcase',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, BadgeCrestComponent],
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
  styles: `
    .badges-showcase {
      margin-bottom: 2rem;
    }

    .badges-title {
      font-size: 1.125rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      text-align: center;
      color: var(--text, #1f2937);
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
}
