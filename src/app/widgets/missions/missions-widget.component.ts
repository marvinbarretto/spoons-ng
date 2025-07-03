import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BaseWidgetComponent } from '../base/base-widget.component';
import { UserMissionsStore } from '../../missions/data-access/user-missions.store';
import { MissionDisplayData } from '../../missions/utils/user-mission-progress.model';
import { Mission } from '../../missions/utils/mission.model';
import { MissionCardComponent } from '../../missions/ui/mission-card/mission-card.component';

@Component({
  selector: 'app-missions-widget',
  imports: [CommonModule, MissionCardComponent],
  template: `
    <div class="missions-widget">
      <h3 class="widget-title">🎯 Your Missions</h3>

      @if (storeLoading()) {
        <div class="widget-loading">
          <span class="loading-spinner"></span>
          <span>Loading missions...</span>
        </div>
      } @else if (storeError()) {
        <div class="widget-error">
          <span class="error-icon">⚠️</span>
          <span>{{ storeError() }}</span>
        </div>
      } @else if (activeMissions().length === 0) {
        <div class="widget-empty">
          <span class="empty-icon">🎯</span>
          <div class="empty-content">
            <p class="empty-title">No active missions</p>
            <p class="empty-subtitle">Suggested mission: Complete the local pub crawl!</p>
            <button class="start-mission-btn" (click)="onStartSuggestedMission()">
              Start Mission
            </button>
          </div>
        </div>
      } @else {
        <div class="missions-grid">
          @for (missionData of activeMissions(); track missionData.mission.id) {
            <app-mission-card
              [mission]="missionData.mission"
              [isJoined]="missionData.isActive"
              [progress]="missionData.completedCount"
              (cardClicked)="onMissionCardClicked($event)"
            />
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .missions-widget {
      padding: 1rem;
      background: var(--color-surface, var(--background-lighter));
      color: var(--color-text, var(--text));
      border: 1px solid var(--color-border, var(--border));
      border-radius: 0.5rem;
      box-shadow: var(--shadow);
    }

    .widget-title {
      margin: 0 0 1rem 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text, var(--text));
    }

    /* Loading, Error, Empty States */
    .widget-loading,
    .widget-error,
    .widget-empty {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 2rem 1rem;
      justify-content: center;
      color: var(--color-text-secondary, var(--text-secondary));
    }

    .widget-empty {
      flex-direction: column;
      text-align: center;
    }

    .loading-spinner {
      width: 1rem;
      height: 1rem;
      border: 2px solid currentColor;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .empty-icon {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }

    .empty-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }

    .empty-title {
      font-weight: 600;
      margin: 0;
      color: var(--color-text, var(--text));
    }

    .empty-subtitle {
      margin: 0;
      font-size: 0.875rem;
      color: var(--color-text-secondary, var(--text-secondary));
    }

    .start-mission-btn {
      margin-top: 0.5rem;
      padding: 0.5rem 1rem;
      background: var(--color-primary, var(--primary));
      color: white;
      border: none;
      border-radius: 0.25rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .start-mission-btn:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }

    /* Missions Grid */
    .missions-grid {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
  `]
})
export class MissionsWidgetComponent extends BaseWidgetComponent {
  private readonly userMissionsStore = inject(UserMissionsStore);

  // Expose store data through computed signals
  protected readonly activeMissions = computed(() => {
    console.log('[MissionsWidget] Computing active missions:', this.userMissionsStore.activeMissions().length);
    return this.userMissionsStore.activeMissions();
  });

  protected readonly storeLoading = computed(() => this.userMissionsStore.loading());
  protected readonly storeError = computed(() => this.userMissionsStore.error());

  onStartSuggestedMission(): void {
    console.log('[MissionsWidget] Start suggested mission clicked - navigating to missions');
    this.router.navigate(['/missions']);
  }

  onMissionCardClicked(mission: Mission): void {
    console.log('[MissionsWidget] Mission card clicked:', mission.id, mission.name);
    this.router.navigate(['/missions']);
  }
}
