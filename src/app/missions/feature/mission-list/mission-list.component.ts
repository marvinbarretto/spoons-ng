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
            >
              <div slot="actions">
                @if (missionData.isActive || missionData.isCompleted) {
                  <button
                    class="btn btn--secondary btn--small"
                    (click)="handleLeaveMissionClick(missionData.mission)"
                    [disabled]="userMissionsStore.loading()"
                  >
                    @if (userMissionsStore.loading()) {
                      <span class="btn__spinner">⏳</span>
                    }
                    Leave Mission
                  </button>
                  @if (missionData.isCompleted) {
                    <span class="completion-badge">✅ Completed</span>
                  } @else {
                    <span class="progress-badge">📍 {{ missionData.completedCount }}/{{ missionData.totalCount }}</span>
                  }
                } @else {
                  <button
                    class="btn btn--primary btn--small"
                    (click)="handleStartMissionClick(missionData.mission)"
                    [disabled]="userMissionsStore.loading()"
                  >
                    @if (userMissionsStore.loading()) {
                      <span class="btn__spinner">⏳</span>
                    }
                    Join Mission
                  </button>
                }
              </div>
            </app-mission-card>
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
      color: var(--text, #111827);
    }

    .page-subtitle {
      color: var(--text-secondary, #6b7280);
      margin: 0;
      font-size: 1rem;
    }

    .loading-state,
    .error-state,
    .empty-state,
    .empty-filtered-state {
      text-align: center;
      padding: 3rem 1rem;
      color: var(--text-secondary, #6b7280);
    }

    .error-state {
      color: var(--color-error, #ef4444);
    }

    .retry-btn,
    .btn-secondary {
      margin-top: 1rem;
      padding: 0.5rem 1rem;
      border: 1px solid var(--border, #e5e7eb);
      background: var(--background-darkest, #ffffff);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .retry-btn:hover,
    .btn-secondary:hover {
      background: var(--color-gray-50, #f9fafb);
      border-color: var(--primary, #3b82f6);
    }

    .filter-controls {
      margin-bottom: 2rem;
      padding: 1rem;
      background: var(--background-darkest, #ffffff);
      border: 1px solid var(--border, #e5e7eb);
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
      color: var(--text, #111827);
      margin-right: 0.5rem;
    }

    .filter-pill {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border: 1px solid var(--border, #e5e7eb);
      border-radius: 20px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 0.875rem;
    }

    .filter-pill:has(input:checked) {
      background: var(--primary, #3b82f6);
      color: white;
      border-color: var(--primary, #3b82f6);
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
      border: 1px solid var(--border, #e5e7eb);
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

    /* Action buttons styling */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border: 1px solid transparent;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 120px;
      justify-content: center;
    }

    .btn--small {
      padding: 0.5rem 0.75rem;
      font-size: 0.8125rem;
      min-width: 100px;
    }

    .btn--primary {
      background: var(--primary, #3b82f6);
      color: white;
      border-color: var(--primary, #3b82f6);
    }

    .btn--primary:hover:not(:disabled) {
      background: var(--primary-dark, #2563eb);
      border-color: var(--primary-dark, #2563eb);
      transform: translateY(-1px);
    }

    .btn--secondary {
      background: transparent;
      color: var(--text-secondary, #6b7280);
      border-color: var(--border, #e5e7eb);
    }

    .btn--secondary:hover:not(:disabled) {
      background: var(--color-gray-50, #f9fafb);
      border-color: var(--color-gray-300, #d1d5db);
      color: var(--text, #111827);
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .btn__spinner {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .completion-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-success, #10b981);
      background: rgba(16, 185, 129, 0.1);
      padding: 0.375rem 0.75rem;
      border-radius: 6px;
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    .progress-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--primary, #3b82f6);
      background: rgba(59, 130, 246, 0.1);
      padding: 0.375rem 0.75rem;
      border-radius: 6px;
      border: 1px solid rgba(59, 130, 246, 0.2);
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
        flex-direction: row;
        align-items: center;
        gap: 0.5rem;
      }

      .filter-pill {
        padding: 0.375rem 0.75rem;
        font-size: 0.8125rem;
      }

      .btn {
        min-width: 90px;
        padding: 0.5rem 0.75rem;
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
  async handleStartMissionClick(mission: Mission): Promise<void> {
    const user = this.authStore.user();
    if (!user) {
      console.warn('[MissionList] No user available');
      this.showError('Unable to start mission at this time');
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
      console.log('[MissionList] Enrolling in mission:', mission.name);
      await this.userMissionsStore.enrollInMission(mission.id);
      console.log('[MissionList] ✅ Successfully enrolled in mission:', mission.name);
      this.showSuccess(`Enrolled in mission: "${mission.name}"!`);

      // Navigate to homepage after successful enrollment
      console.log('[MissionList] Navigating to homepage after mission enrollment');
      this.router.navigate(['/']);
    } catch (error: any) {
      console.error('[MissionList] ❌ Failed to start mission:', error);
      this.showError(error?.message || 'Failed to start mission');
    }
  }

  // ✅ New action - leave mission
  async handleLeaveMissionClick(mission: Mission): Promise<void> {
    const user = this.authStore.user();
    if (!user) {
      console.warn('[MissionList] No user available');
      this.showError('Unable to leave mission at this time');
      return;
    }

    // Show confirmation dialog
    const confirmed = confirm(`Are you sure you want to leave "${mission.name}"?\n\nThis will delete all your progress in this mission.`);
    if (!confirmed) {
      return;
    }

    try {
      console.log('[MissionList] Leaving mission:', mission.name);
      await this.userMissionsStore.leaveMission(mission.id);
      console.log('[MissionList] ✅ Successfully left mission:', mission.name);
      this.showSuccess(`Left mission: "${mission.name}"`);
    } catch (error: any) {
      console.error('[MissionList] ❌ Failed to leave mission:', error);
      this.showError(error?.message || 'Failed to leave mission');
    }
  }
}
