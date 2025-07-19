import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { BaseWidgetComponent } from '../base/base-widget.component';
import { DataAggregatorService } from '../../shared/data-access/data-aggregator.service';
import { CheckInStore } from '../../check-in/data-access/check-in.store';
import { PubStore } from '../../pubs/data-access/pub.store';
import { AuthStore } from '../../auth/data-access/auth.store';

import { LoadingStateComponent, ErrorStateComponent, EmptyStateComponent } from '../../shared/ui/state-components';
import type { CheckIn } from '../../check-in/utils/check-in.models';
import type { Pub } from '../../pubs/utils/pub.models';

type RecentActivityEntry = {
  checkIn: CheckIn;
  pub: Pub | null;
  timeAgo: string;
  isToday: boolean;
};

@Component({
  selector: 'app-recent-activity-widget',
  imports: [LoadingStateComponent, ErrorStateComponent, EmptyStateComponent],
  template: `
    <div class="recent-activity-widget">
      <h3 class="widget-title">Recent Activity</h3>

      @if (checkinStore.loading()) {
        <app-loading-state text="Loading activity..." />
      } @else if (checkinStore.error()) {
        <app-error-state [message]="checkinStore.error()!" />
      } @else if (recentActivity().length === 0) {
        <app-empty-state
          icon="📱"
          title="No Recent Activity"
          subtitle="Start checking in to pubs to see your activity here"
        />
      } @else {
        <div class="activity-list">
          @for (activity of recentActivity(); track activity.checkIn.id) {
            <div class="activity-entry" [class.today]="activity.isToday">
              <div class="activity-icon">
                @if (activity.checkIn.carpetImageKey) {
                  <span class="carpet-icon">🔍</span>
                } @else {
                  <span class="checkin-icon">🍺</span>
                }
              </div>

              <div class="activity-content">
                <div class="activity-main">
                  <span class="pub-name">{{ activity.pub?.name || 'Unknown Pub' }}</span>
                  @if (activity.checkIn.pointsEarned) {
                    <span class="points">+{{ activity.checkIn.pointsEarned }} pts</span>
                  }
                </div>

                <div class="activity-meta">
                  <span class="time">{{ activity.timeAgo }}</span>
                  @if (activity.checkIn.carpetImageKey) {
                    <span class="carpet-badge">Carpet detected</span>
                  }
                  @if (activity.isToday) {
                    <span class="today-badge">Today</span>
                  }
                </div>
              </div>
            </div>
          }
        </div>

        @if (hasMoreActivity()) {
          <button
            class="view-all-activity"
            (click)="navigateToFullActivity()"
            type="button"
          >
            View All Activity
          </button>
        }
      }
    </div>
  `,
  styles: [`
    .recent-activity-widget {
      padding: 1rem;
      background: var(--background-lighter);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      box-shadow: var(--shadow);
    }

    .widget-title {
      margin: 0 0 1rem 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text);
    }


    .activity-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .activity-entry {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.75rem;
      background: var(--background);
      border: 1px solid var(--border-lighter);
      border-radius: 0.375rem;
      transition: all 0.2s ease;
    }

    .activity-entry:hover {
      background: var(--background-lighter);
      border-color: var(--border);
    }

    .activity-entry.today {
      border-left: 3px solid var(--accent);
      background: var(--accent-bg);
    }

    .activity-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--accent);
      color: var(--on-accent);
      font-size: 0.875rem;
      flex-shrink: 0;
    }

    .activity-entry.today .activity-icon {
      background: var(--accent-hover);
    }

    .carpet-icon {
      font-size: 0.75rem;
    }

    .activity-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 0;
    }

    .activity-main {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .pub-name {
      font-weight: 500;
      font-size: 0.875rem;
      color: var(--text);
      truncate: ellipsis;
      overflow: hidden;
      white-space: nowrap;
      flex: 1;
    }

    .points {
      font-size: 0.75rem;
      color: var(--success);
      font-weight: 600;
      flex-shrink: 0;
    }

    .activity-meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .time {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .carpet-badge,
    .today-badge {
      font-size: 0.6875rem;
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
      font-weight: 500;
    }

    .carpet-badge {
      background: var(--info);
      color: white;
    }

    .today-badge {
      background: var(--accent);
      color: var(--on-accent);
    }

    .view-all-activity {
      width: 100%;
      padding: 0.75rem;
      background: var(--secondary);
      color: var(--on-secondary);
      border: 1px solid var(--secondary);
      border-radius: 0.375rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .view-all-activity:hover {
      background: var(--secondary-hover);
    }

    .view-all-activity:focus {
      outline: none;
      box-shadow: 0 0 0 2px var(--accent);
    }

    /* Mobile responsive */
    @media (max-width: 640px) {
      .recent-activity-widget {
        padding: 0.75rem;
      }

      .activity-entry {
        padding: 0.5rem;
        gap: 0.5rem;
      }

      .activity-icon {
        width: 28px;
        height: 28px;
        font-size: 0.8125rem;
      }

      .widget-title {
        font-size: 1rem;
      }

      .pub-name {
        font-size: 0.8125rem;
      }

      .points {
        font-size: 0.6875rem;
      }

      .activity-meta {
        gap: 0.375rem;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecentActivityWidgetComponent extends BaseWidgetComponent {
  protected readonly dataAggregatorService = inject(DataAggregatorService);
  protected readonly checkinStore = inject(CheckInStore);
  protected readonly pubStore = inject(PubStore);
  private readonly authStore = inject(AuthStore);

  protected readonly recentActivity = computed((): RecentActivityEntry[] => {
    const user = this.authStore.user();
    if (!user?.uid) return [];

    const recentCheckins = this.dataAggregatorService.getRecentCheckinsForUser(user.uid, 5);
    const today = new Date().toISOString().split('T')[0];

    return recentCheckins.map(checkIn => {
      const pub = this.pubStore.get(checkIn.pubId) || null;
      const checkInDate = checkIn.timestamp.toDate();
      const checkInDateKey = checkInDate.toISOString().split('T')[0];

      return {
        checkIn,
        pub,
        timeAgo: this.formatTimeAgo(checkInDate),
        isToday: checkInDateKey === today
      };
    });
  });

  protected readonly hasMoreActivity = computed(() => {
    const user = this.authStore.user();
    if (!user?.uid) return false;

    const totalCheckins = this.checkinStore.checkins().filter(c => c.userId === user.uid).length;
    return totalCheckins > 5;
  });

  private formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes < 1 ? 'Just now' : `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  protected navigateToFullActivity(): void {
    // TODO: Navigate to full activity page when implemented
    console.log('Navigate to full activity page');
  }
}
