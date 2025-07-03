// src/app/missions/feature/mission-list/mission-list.component.ts
import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MissionCardComponent } from '../../ui/mission-card/mission-card.component';
import { UserMissionsStore } from '../../data-access/user-missions.store';
import { AuthStore } from '@auth/data-access/auth.store';
import { BaseComponent } from '../../../shared/base/base.component';
import type { Mission } from '../../utils/mission.model';

@Component({
  selector: 'app-mission-list',
  imports: [CommonModule, MissionCardComponent],
  template: `
    <section class="mission-list-page">
      <header class="page-header">
        <h1>Missions ({{ totalMissionsCount() }})</h1>
        <p class="page-subtitle">
          Complete missions by visiting the required pubs to earn rewards
        </p>
      </header>

      @if (userMissionsStore.loading()) {
        <div class="loading-state">
          <p>📝 Loading missions...</p>
        </div>
      } @else if (userMissionsStore.error()) {
        <div class="error-state">
          <p>❌ {{ userMissionsStore.error() }}</p>
          <button (click)="retryLoad()" class="retry-btn">Try Again</button>
        </div>
      } @else if (totalMissionsCount() === 0) {
        <div class="empty-state">
          <p>📝 No missions available yet.</p>
          <p>Check back later for new challenges!</p>
        </div>
      } @else {
        <!-- Filter Controls -->
        <div class="filter-controls">
          <div class="control-group">
            <span class="control-label">Show:</span>
            <label class="filter-pill">
              <input
                type="radio"
                name="filter"
                value="all"
                [checked]="filterMode() === 'all'"
                (change)="setFilter('all')"
              />
              All ({{ totalMissionsCount() }})
            </label>
            <label class="filter-pill">
              <input
                type="radio"
                name="filter"
                value="available"
                [checked]="filterMode() === 'available'"
                (change)="setFilter('available')"
              />
              Available ({{ userMissionsStore.availableMissions().length }})
            </label>
            <label class="filter-pill">
              <input
                type="radio"
                name="filter"
                value="joined"
                [checked]="filterMode() === 'joined'"
                (change)="setFilter('joined')"
              />
              Joined ({{ userMissionsStore.activeMissions().length + userMissionsStore.completedMissions().length }})
            </label>
          </div>
        </div>

        <!-- Mission Cards -->
        <div class="mission-grid">
          @for (missionData of filteredMissions(); track missionData.mission.id) {
            <app-mission-card
              [mission]="missionData.mission"
              [isJoined]="missionData.isActive || missionData.isCompleted"
              [progress]="missionData.completedCount"
              (cardClicked)="handleMissionClick($event)"
            />
          }
        </div>

        @if (filteredMissions().length === 0) {
          <div class="empty-filtered-state">
            <p>No missions match the current filter.</p>
            <button (click)="setFilter('all')" class="btn-secondary">
              Show All Missions
            </button>
          </div>
        }
      }

      <!-- Development debug info -->
      @if (isDevelopment()) {
        <details class="debug-section">
          <summary>Debug Info</summary>
          <div class="debug-grid">
            <div class="debug-card">
              <h4>User State</h4>
              <pre>{{ debugUserInfo() | json }}</pre>
            </div>
            <div class="debug-card">
              <h4>Mission Stats</h4>
              <pre>{{ debugMissionStats() | json }}</pre>
            </div>
          </div>
        </details>
      }
    </section>
  `,
  styles: `
    .mission-list-page {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1rem;
    }

    .page-header {
      margin-bottom: 2rem;
    }

    .page-header h1 {
      font-size: 2rem;
      font-weight: 700;
      margin: 0 0 0.5rem;
      color: var(--color-text-primary, #111827);
    }

    .page-subtitle {
      color: var(--color-text-secondary, #6b7280);
      margin: 0;
      font-size: 1rem;
    }

    .loading-state,
    .error-state,
    .empty-state,
    .empty-filtered-state {
      text-align: center;
      padding: 3rem 1rem;
      color: var(--color-text-secondary, #6b7280);
    }

    .error-state {
      color: var(--color-error, #ef4444);
    }

    .retry-btn,
    .btn-secondary {
      margin-top: 1rem;
      padding: 0.5rem 1rem;
      border: 1px solid var(--color-border, #e5e7eb);
      background: var(--color-surface, #ffffff);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .retry-btn:hover,
    .btn-secondary:hover {
      background: var(--color-gray-50, #f9fafb);
      border-color: var(--color-primary, #3b82f6);
    }

    .filter-controls {
      margin-bottom: 2rem;
      padding: 1rem;
      background: var(--color-surface, #ffffff);
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: 8px;
    }

    .control-group {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .control-label {
      font-weight: 500;
      color: var(--color-text-primary, #111827);
      margin-right: 0.5rem;
    }

    .filter-pill {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: 20px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 0.875rem;
    }

    .filter-pill:has(input:checked) {
      background: var(--color-primary, #3b82f6);
      color: white;
      border-color: var(--color-primary, #3b82f6);
    }

    .filter-pill input {
      margin: 0;
    }

    .mission-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .debug-section {
      margin-top: 2rem;
      padding: 1rem;
      background: var(--color-gray-50, #f9fafb);
      border-radius: 8px;
    }

    .debug-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }

    .debug-card {
      background: white;
      padding: 1rem;
      border-radius: 6px;
      border: 1px solid var(--color-border, #e5e7eb);
    }

    .debug-card h4 {
      margin: 0 0 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .debug-card pre {
      font-size: 0.75rem;
      background: var(--color-gray-50, #f9fafb);
      padding: 0.5rem;
      border-radius: 4px;
      overflow-x: auto;
      margin: 0;
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .mission-grid {
        grid-template-columns: 1fr;
      }

      .filter-controls {
        padding: 0.75rem;
      }

      .control-group {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
      }

      .filter-pill {
        padding: 0.375rem 0.75rem;
        font-size: 0.8125rem;
      }
    }
  `
})
export class MissionListComponent extends BaseComponent {
  // ✅ Store dependencies
  protected readonly userMissionsStore = inject(UserMissionsStore);
  private readonly authStore = inject(AuthStore);

  // ✅ Local state
  private readonly _filterMode = signal<'all' | 'available' | 'joined'>('all');

  // ✅ Expose state for template
  protected readonly filterMode = this._filterMode.asReadonly();

  // ✅ Computed data using UserMissionsStore
  protected readonly totalMissionsCount = computed(() => 
    this.userMissionsStore.availableMissions().length + 
    this.userMissionsStore.activeMissions().length + 
    this.userMissionsStore.completedMissions().length
  );

  protected readonly allMissions = computed(() => [
    ...this.userMissionsStore.availableMissions(),
    ...this.userMissionsStore.activeMissions(),
    ...this.userMissionsStore.completedMissions()
  ]);

  protected readonly joinedMissions = computed(() => [
    ...this.userMissionsStore.activeMissions(),
    ...this.userMissionsStore.completedMissions()
  ]);

  protected readonly filteredMissions = computed(() => {
    const mode = this.filterMode();
    switch (mode) {
      case 'available': return this.userMissionsStore.availableMissions();
      case 'joined': return this.joinedMissions();
      default: return this.allMissions();
    }
  });

  // ✅ Development helper
  protected readonly isDevelopment = computed(() => true);

  // ✅ Debug information
  protected readonly debugUserInfo = computed(() => {
    const user = this.authStore.user();
    return {
      hasUser: !!user,
      uid: user?.uid,
      isAnonymous: user?.isAnonymous,
      joinedMissionCount: this.joinedMissions().length
    };
  });

  protected readonly debugMissionStats = computed(() => ({
    totalMissions: this.totalMissionsCount(),
    availableCount: this.userMissionsStore.availableMissions().length,
    activeCount: this.userMissionsStore.activeMissions().length,
    completedCount: this.userMissionsStore.completedMissions().length,
    currentFilter: this.filterMode(),
    filteredCount: this.filteredMissions().length,
    loading: this.userMissionsStore.loading(),
    error: this.userMissionsStore.error()
  }));

  // ✅ Filter controls
  setFilter(mode: 'all' | 'available' | 'joined'): void {
    this._filterMode.set(mode);
  }

  // ✅ Retry loading - no-op since UserMissionsStore handles loading automatically
  retryLoad(): void {
    console.log('[MissionList] Retry load requested - UserMissionsStore handles loading automatically');
  }

  // ✅ Main action - start mission
  async handleMissionClick(mission: Mission): Promise<void> {
    const user = this.authStore.user();
    if (!user || user.isAnonymous) {
      console.warn('[MissionList] No authenticated user');
      this.showError('Please log in to join missions');
      return;
    }

    // Check if already joined by looking in all mission lists
    const allUserMissions = [...this.joinedMissions()];
    const isAlreadyJoined = allUserMissions.some(m => m.mission.id === mission.id);
    
    if (isAlreadyJoined) {
      console.log('[MissionList] Mission already joined:', mission.name);
      this.showInfo(`You've already joined "${mission.name}"`);
      return;
    }

    try {
      console.log('[MissionList] Starting mission:', mission.name);
      await this.userMissionsStore.startMission(mission.id);
      console.log('[MissionList] ✅ Successfully started mission:', mission.name);
      this.showSuccess(`Started mission: "${mission.name}"!`);
    } catch (error: any) {
      console.error('[MissionList] ❌ Failed to start mission:', error);
      this.showError(error?.message || 'Failed to start mission');
    }
  }
}
