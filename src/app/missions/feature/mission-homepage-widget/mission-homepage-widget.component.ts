// src/app/missions/ui/mission-homepage-widget/mission-homepage-widget.component.ts
import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UserStore } from '@users/data-access/user.store';
import { MissionStore } from '../../data-access/mission.store';
import { BaseComponent } from '../../../shared/data-access/base.component';

type MissionProgress = {
  id: string;
  name: string;
  description: string;
  progress: number;
  total: number;
  progressPercentage: number;
  isComplete: boolean;
  badgeRewardId?: string;
};

@Component({
  selector: 'app-mission-homepage-widget',
  imports: [CommonModule, RouterModule],
  template: `
    <section class="mission-widget">
      <header class="widget-header">
        <h2 class="widget-title">
          📝 Your Missions
          @if (activeMissions().length > 0) {
            <span class="mission-count">({{ activeMissions().length }})</span>
          }
        </h2>

        <div class="header-actions">
          @if (activeMissions().length === 0) {
            <a routerLink="/missions" class="btn-primary">
              Start a Mission
            </a>
          } @else {
            <a routerLink="/missions" class="btn-secondary">
              View All
            </a>
          }
        </div>
      </header>

      <div class="widget-content">
        @if (missionStore.loading()) {
          <div class="loading-state">
            <p>Loading missions...</p>
          </div>
        } @else if (missionStore.error()) {
          <div class="error-state">
            <p>❌ {{ missionStore.error() }}</p>
          </div>
        } @else if (activeMissions().length === 0) {
          <div class="empty-state">
            <div class="empty-icon">📝</div>
            <p class="empty-title">No active missions</p>
            <p class="empty-subtitle">
              Join a mission to start earning badges and completing challenges!
            </p>
            <a routerLink="/missions" class="btn-primary">
              Browse Missions
            </a>
          </div>
        } @else {
          <div class="mission-list">
            @for (mission of activeMissions(); track mission.id) {
              <div class="mission-item" [class.mission-item--complete]="mission.isComplete">
                <div class="mission-content">
                  <div class="mission-header">
                    <h3 class="mission-name">{{ mission.name }}</h3>
                    @if (mission.isComplete) {
                      <span class="completion-badge">✅ Complete</span>
                    } @else {
                      <span class="progress-badge">
                        {{ mission.progress }}/{{ mission.total }}
                      </span>
                    }
                  </div>

                  <p class="mission-description">{{ mission.description }}</p>

                  <div class="mission-stats">
                    <div class="progress-section">
                      <div class="progress-bar">
                        <div
                          class="progress-fill"
                          [style.width.%]="mission.progressPercentage"
                        ></div>
                      </div>
                      <span class="progress-text">
                        {{ mission.progressPercentage }}% complete
                      </span>
                    </div>

                    @if (mission.badgeRewardId) {
                      <div class="reward-info">
                        <span class="reward-badge">🏅 Badge reward</span>
                      </div>
                    }
                  </div>
                </div>

                <div class="mission-actions">
                  <a
                    routerLink="/missions"
                    [fragment]="mission.id"
                    class="btn-outline"
                  >
                    View Details
                  </a>
                </div>
              </div>
        }

      </div>

          @if (totalMissions() > activeMissions().length) {
            <div class="widget-footer">
              <a routerLink="/missions" class="view-all-link">
                View all {{ totalMissions() }} missions →
              </a>
            </div>
          }
        }
      </div>

      <!-- Development debug info -->
      @if (isDevelopment()) {
        <details class="debug-info">
          <summary>Mission Widget Debug</summary>
          <pre>{{ debugInfo() | json }}</pre>
        </details>
      }
    </section>
  `,
  styles: `
    .mission-widget {
      background: var(--color-surface, #ffffff);
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: 12px;
      overflow: hidden;
    }

    .widget-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid var(--color-border, #e5e7eb);
      background: var(--color-gray-50, #f9fafb);
    }

    .widget-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 0;
      color: var(--color-text-primary, #111827);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .mission-count {
      font-size: 0.875rem;
      color: var(--color-text-secondary, #6b7280);
      font-weight: 500;
    }

    .header-actions {
      display: flex;
      gap: 0.75rem;
    }

    .btn-primary,
    .btn-secondary,
    .btn-outline {
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      text-decoration: none;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-primary {
      background: var(--color-primary, #3b82f6);
      color: white;
      border: 1px solid var(--color-primary, #3b82f6);
    }

    .btn-primary:hover {
      background: var(--color-primary-dark, #2563eb);
      border-color: var(--color-primary-dark, #2563eb);
    }

    .btn-secondary {
      background: var(--color-surface, #ffffff);
      color: var(--color-text-primary, #111827);
      border: 1px solid var(--color-border, #e5e7eb);
    }

    .btn-secondary:hover {
      background: var(--color-gray-50, #f9fafb);
      border-color: var(--color-primary, #3b82f6);
    }

    .btn-outline {
      background: transparent;
      color: var(--color-primary, #3b82f6);
      border: 1px solid var(--color-primary, #3b82f6);
    }

    .btn-outline:hover {
      background: var(--color-primary, #3b82f6);
      color: white;
    }

    .widget-content {
      padding: 1.5rem;
    }

    .loading-state,
    .error-state {
      text-align: center;
      padding: 2rem;
      color: var(--color-text-secondary, #6b7280);
    }

    .error-state {
      color: var(--color-error, #ef4444);
    }

    .empty-state {
      text-align: center;
      padding: 3rem 2rem;
    }

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .empty-title {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0 0 0.5rem;
      color: var(--color-text-primary, #111827);
    }

    .empty-subtitle {
      color: var(--color-text-secondary, #6b7280);
      margin: 0 0 1.5rem;
      line-height: 1.5;
    }

    .mission-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .mission-item {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1rem;
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: 8px;
      transition: all 0.2s ease;
      gap: 1rem;
    }

    .mission-item:hover {
      border-color: var(--color-primary, #3b82f6);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .mission-item--complete {
      border-color: var(--color-success, #10b981);
      background: var(--color-success-subtle, rgba(16, 185, 129, 0.05));
    }

    .mission-content {
      flex: 1;
      min-width: 0;
    }

    .mission-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.5rem;
      gap: 1rem;
    }

    .mission-name {
      font-size: 1rem;
      font-weight: 600;
      margin: 0;
      color: var(--color-text-primary, #111827);
    }

    .progress-badge,
    .completion-badge {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-weight: 500;
      flex-shrink: 0;
    }

    .progress-badge {
      background: var(--color-primary-subtle, rgba(59, 130, 246, 0.1));
      color: var(--color-primary, #3b82f6);
    }

    .completion-badge {
      background: var(--color-success-subtle, rgba(16, 185, 129, 0.1));
      color: var(--color-success, #10b981);
    }

    .mission-description {
      color: var(--color-text-secondary, #6b7280);
      margin: 0 0 1rem;
      font-size: 0.875rem;
      line-height: 1.4;
    }

    .mission-stats {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .progress-section {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .progress-bar {
      flex: 1;
      height: 6px;
      background: var(--color-gray-200, #e5e7eb);
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: var(--color-primary, #3b82f6);
      transition: width 0.3s ease;
    }

    .mission-item--complete .progress-fill {
      background: var(--color-success, #10b981);
    }

    .progress-text {
      font-size: 0.75rem;
      color: var(--color-text-secondary, #6b7280);
      font-weight: 500;
      min-width: fit-content;
    }

    .reward-info {
      display: flex;
      align-items: center;
    }

    .reward-badge {
      font-size: 0.75rem;
      color: var(--color-warning, #f59e0b);
      font-weight: 500;
    }

    .mission-actions {
      flex-shrink: 0;
      display: flex;
      align-items: flex-start;
    }

    .widget-footer {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--color-border, #e5e7eb);
      text-align: center;
    }

    .view-all-link {
      color: var(--color-primary, #3b82f6);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .view-all-link:hover {
      text-decoration: underline;
    }

    .debug-info {
      margin-top: 1rem;
      padding: 1rem;
      background: var(--color-gray-50, #f9fafb);
      border-top: 1px solid var(--color-border, #e5e7eb);
      font-size: 0.75rem;
    }

    .debug-info pre {
      background: white;
      padding: 0.5rem;
      border-radius: 4px;
      overflow-x: auto;
      margin: 0.5rem 0 0;
    }

    /* Responsive design */
    @media (max-width: 640px) {
      .widget-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }

      .mission-item {
        flex-direction: column;
        align-items: stretch;
        gap: 0.75rem;
      }

      .mission-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }

      .progress-section {
        flex-direction: column;
        align-items: stretch;
        gap: 0.5rem;
      }

      .progress-text {
        text-align: center;
      }
    }
  `
})
export class MissionHomepageWidgetComponent extends BaseComponent {
  // ✅ Store dependencies
  private readonly userStore = inject(UserStore);
  protected readonly missionStore = inject(MissionStore);

  // ✅ Expose user for template
  protected readonly user = this.userStore.user;

  // ✅ Computed mission progress data
  protected readonly joinedMissionIds = computed(() =>
    this.user()?.joinedMissionIds ?? []
  );

  protected readonly userCheckedInPubIds = computed(() =>
    this.user()?.checkedInPubIds ?? []
  );

  protected readonly activeMissions = computed((): MissionProgress[] => {
    const user = this.user();
    const allMissions = this.missionStore.missions();

    if (!user?.joinedMissionIds?.length || !allMissions.length) return [];

    return allMissions
      .filter(mission => user.joinedMissionIds!.includes(mission.id))
      .map(mission => {
        const progress = mission.pubIds.filter(pubId =>
          user.checkedInPubIds?.includes(pubId)
        ).length;
        const total = mission.pubIds.length;
        const progressPercentage = total > 0 ? Math.round((progress / total) * 100) : 0;

        return {
          id: mission.id,
          name: mission.name,
          description: mission.description,
          progress,
          total,
          progressPercentage,
          isComplete: progress === total && total > 0,
          badgeRewardId: mission.badgeRewardId
        };
      })
      .sort((a, b) => {
        // Sort incomplete first, then by progress percentage
        if (a.isComplete && !b.isComplete) return 1;
        if (!a.isComplete && b.isComplete) return -1;
        return b.progressPercentage - a.progressPercentage;
      })
      .slice(0, 3); // Show max 3 missions
  });

  protected readonly totalMissions = computed(() =>
    this.missionStore.missions().length
  );

  // ✅ Development helper
  protected readonly isDevelopment = computed(() => true);

  // ✅ Debug information
  protected readonly debugInfo = computed(() => ({
    hasUser: !!this.user(),
    joinedMissionCount: this.joinedMissionIds().length,
    activeMissionCount: this.activeMissions().length,
    totalMissionCount: this.totalMissions(),
    checkedInPubCount: this.userCheckedInPubIds().length,
    activeMissions: this.activeMissions().map(m => ({
      id: m.id,
      name: m.name,
      progress: `${m.progress}/${m.total}`,
      percentage: `${m.progressPercentage}%`,
      complete: m.isComplete
    }))
  }));

  // ✅ Data loading
  protected override onInit(): void {
    this.missionStore.loadOnce();
  }
}
