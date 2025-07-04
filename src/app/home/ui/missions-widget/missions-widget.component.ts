import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

type MissionWithProgress = {
  id: string;
  title: string;
  description?: string;
  progress: number;
  total: number;
};

@Component({
  selector: 'app-missions-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="missions-section">
      <h3 class="missions-title">🎯 Active Missions</h3>
      <div class="missions-grid">
        @for (mission of displayMissions(); track mission.id) {
          <div class="mission-card" (click)="handleViewMission(mission.id)">
            <div class="mission-header">
              <span class="mission-name">{{ mission.title }}</span>
              <span class="mission-progress">{{ mission.progress }}/{{ mission.total }}</span>
            </div>
            <div class="mission-progress-bar">
              <div
                class="mission-fill"
                [style.width.%]="getMissionProgress(mission)"
              ></div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .missions-section {
      margin-bottom: 2rem;
    }

    .missions-title {
      font-size: 1.125rem;
      font-weight: 700;
      margin-bottom: 1rem;
      text-align: center;
      color: var(--text, #1f2937);
    }

    .missions-grid {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .mission-card {
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.2);
      border-radius: 8px;
      padding: 1rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .mission-card:hover {
      background: rgba(59, 130, 246, 0.15);
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(59, 130, 246, 0.1);
    }

    .mission-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .mission-name {
      font-weight: 600;
      font-size: 0.9rem;
      color: var(--text, #1f2937);
    }

    .mission-progress {
      font-size: 0.8rem;
      font-weight: 700;
      color: #3b82f6;
    }

    .mission-progress-bar {
      background: rgba(59, 130, 246, 0.2);
      border-radius: 4px;
      height: 6px;
      overflow: hidden;
    }

    .mission-fill {
      background: linear-gradient(90deg, #10b981, #059669);
      height: 100%;
      border-radius: 4px;
      transition: width 0.6s ease;
    }

    /* ✅ Responsive Design */
    @media (max-width: 640px) {
      .mission-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.25rem;
      }

      .mission-progress {
        align-self: flex-end;
      }
    }
  `
})
export class MissionsSectionComponent {
  // ✅ Inputs
  readonly missions = input<MissionWithProgress[]>([]);
  readonly maxDisplay = input(3);

  // ✅ Outputs
  readonly viewMission = output<string>();

  // ✅ Computed Values
  readonly displayMissions = computed(() => {
    return this.missions().slice(0, this.maxDisplay());
  });

  // ✅ Utility Methods
  getMissionProgress(mission: MissionWithProgress): number {
    return mission.total > 0 ? Math.round((mission.progress / mission.total) * 100) : 0;
  }

  // ✅ Event Handler
  handleViewMission(missionId: string): void {
    this.viewMission.emit(missionId);
  }
}
