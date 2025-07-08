import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BaseWidgetComponent } from '../base/base-widget.component';
import { UserMissionsStore } from '../../missions/data-access/user-missions.store';
import { MissionDisplayData } from '../../missions/utils/user-mission-progress.model';
import { Mission } from '../../missions/utils/mission.model';
import { MissionCardLightComponent } from '../../home/ui/mission-card-light/mission-card-light.component';
import { LoadingStateComponent, ErrorStateComponent, EmptyStateComponent } from '../../shared/ui/state-components';

@Component({
  selector: 'app-missions-widget',
  imports: [CommonModule, MissionCardLightComponent, LoadingStateComponent, ErrorStateComponent, EmptyStateComponent],
  template: `
    <div class="missions-widget">
      <div class="widget-header">
        <h3 class="widget-title">🎯 Your Missions</h3>
        <button class="see-all-btn" (click)="onSeeAllMissions()">
          See All Missions
        </button>
      </div>

      @if (storeLoading()) {
        <app-loading-state text="Loading missions..." />
      } @else if (storeError()) {
        <app-error-state [message]="storeError()!" />
      } @else if (activeMissions().length === 0) {
        <app-empty-state 
          icon="🎯"
          title="No active missions"
          subtitle="Suggested mission: Complete the local pub crawl!"
          [showAction]="true"
          actionText="Start Mission"
          (action)="onStartSuggestedMission()"
        />
      } @else {
        <div class="missions-grid">
          @for (missionData of activeMissions(); track missionData.mission.id) {
            <app-mission-card-light
              [mission]="missionData.mission"
              [isJoined]="missionData.isActive"
              [progress]="missionData.completedCount"
              (missionClick)="onMissionCardClicked($event)"
            />
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .missions-widget {
      padding: 1rem;
      background: var(--background-darkest, var(--background-lighter));
      color: var(--text, var(--text));
      border: 1px solid var(--border, var(--border));
      border-radius: 0.5rem;
      box-shadow: var(--shadow);
    }

    .widget-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .widget-title {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text, var(--text));
    }

    .see-all-btn {
      padding: 0.375rem 0.75rem;
      background: transparent;
      color: var(--primary, var(--primary));
      border: 1px solid var(--primary, var(--primary));
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .see-all-btn:hover {
      background: var(--primary, var(--primary));
      color: white;
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

  onSeeAllMissions(): void {
    console.log('[MissionsWidget] See all missions clicked - navigating to missions page');
    this.router.navigate(['/missions']);
  }

  onMissionCardClicked(mission: Mission): void {
    console.log('[MissionsWidget] Mission card clicked:', mission.id, mission.name);
    this.router.navigate(['/missions', mission.id]);
  }
}
