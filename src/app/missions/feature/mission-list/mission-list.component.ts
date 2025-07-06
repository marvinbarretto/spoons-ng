// src/app/missions/feature/mission-list/mission-list.component.ts
import { Component, computed, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MissionCardComponent } from '../../ui/mission-card/mission-card.component';
import { UserMissionsStore } from '../../data-access/user-missions.store';
import { AuthStore } from '@auth/data-access/auth.store';
import { BaseComponent } from '../../../shared/base/base.component';
import { ListFilterControlsComponent } from '../../../shared/ui/list-filter-controls/list-filter-controls.component';
import { ListFilterStore } from '../../../shared/data-access/list-filter.store';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { ButtonSize } from '../../../shared/ui/button/button.params';
import type { Mission } from '../../utils/mission.model';
import type { MissionDisplayData } from '../../utils/user-mission-progress.model';

@Component({
  selector: 'app-mission-list',
  imports: [CommonModule, MissionCardComponent, ListFilterControlsComponent, ButtonComponent],
  providers: [ListFilterStore],
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
          <app-button variant="secondary" (onClick)="retryLoad()">Try Again</app-button>
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

        <!-- Search and Filter Controls -->
        <app-list-filter-controls
          [searchPlaceholder]="'Search missions by name, category, or description...'"
          [showSort]="true"
          [resultsCount]="filteredAndSearchedMissions().length"
          [quickFilters]="quickFilters()"
          (quickFilterChanged)="onQuickFilterChange($event)"
        />

        <!-- Mission Cards -->
        <div class="mission-grid">
          @for (missionData of filteredAndSearchedMissions(); track missionData.mission.id) {
            <app-mission-card
              [mission]="missionData.mission"
              [isJoined]="missionData.isActive || missionData.isCompleted"
              [progress]="missionData.completedCount"
            >
              <div slot="actions">
                @if (missionData.isActive || missionData.isCompleted) {
                  <app-button
                    variant="secondary"
                    [size]="ButtonSize.SMALL"
                    (onClick)="handleLeaveMissionClick(missionData.mission)"
                    [loading]="userMissionsStore.loading()"
                    loadingText="Leaving..."
                  >
                    Leave Mission
                  </app-button>
                  @if (missionData.isCompleted) {
                    <span class="completion-badge">✅ Completed</span>
                  } @else {
                    <span class="progress-badge">📍 {{ missionData.completedCount }}/{{ missionData.totalCount }}</span>
                  }
                } @else {
                  <app-button
                    variant="primary"
                    [size]="ButtonSize.SMALL"
                    (onClick)="handleStartMissionClick(missionData.mission)"
                    [loading]="userMissionsStore.loading() || enrollingMissionId() === missionData.mission.id"
                    [loadingText]="enrollingMissionId() === missionData.mission.id ? 'Joining...' : 'Loading...'"
                  >
                    Join Mission
                  </app-button>
                }
              </div>
            </app-mission-card>
          }
        </div>

        @if (filteredAndSearchedMissions().length === 0) {
          <div class="empty-filtered-state">
            <p>No missions match the current filter.</p>
            <app-button variant="secondary" (onClick)="setFilter('all')">
              Show All Missions
            </app-button>
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
  private readonly filterStore = inject(ListFilterStore<MissionDisplayData>);

  // ✅ Local state
  private readonly _filterMode = signal<'all' | 'available' | 'joined'>('all');
  private readonly _activeQuickFilter = signal<string>('');
  private readonly _enrollingMissionId = signal<string | null>(null);

  // ✅ Expose ButtonSize for template
  readonly ButtonSize = ButtonSize;

  // ✅ Expose state for template
  protected readonly filterMode = this._filterMode.asReadonly();
  protected readonly activeQuickFilter = this._activeQuickFilter.asReadonly();
  protected readonly enrollingMissionId = this._enrollingMissionId.asReadonly();

  // ✅ Computed data using UserMissionsStore
  protected readonly totalMissionsCount = computed(() => {
    const total = this.userMissionsStore.availableMissions().length +
      this.userMissionsStore.activeMissions().length +
      this.userMissionsStore.completedMissions().length;
    console.log('[MissionList] Total missions count:', total, {
      available: this.userMissionsStore.availableMissions().length,
      active: this.userMissionsStore.activeMissions().length,
      completed: this.userMissionsStore.completedMissions().length
    });
    return total;
  });

  protected readonly allMissions = computed(() => {
    const available = this.userMissionsStore.availableMissions();
    const active = this.userMissionsStore.activeMissions();
    const completed = this.userMissionsStore.completedMissions();
    
    // Use array spread to handle type differences
    const combined: MissionDisplayData[] = [...available, ...active, ...completed];
    
    // Deduplication by mission ID (in case of overlaps)
    const unique = combined.filter((mission, index, array) => 
      array.findIndex(m => m.mission.id === mission.mission.id) === index
    );
    
    console.log('[MissionList] All missions computed:', {
      availableCount: available.length,
      activeCount: active.length, 
      completedCount: completed.length,
      combinedCount: combined.length,
      uniqueCount: unique.length,
      availableIds: available.map(m => m.mission.id),
      activeIds: active.map(m => m.mission.id),
      completedIds: completed.map(m => m.mission.id),
      finalIds: unique.map(m => m.mission.id)
    });
    
    return unique;
  });

  protected readonly joinedMissions = computed(() => [
    ...this.userMissionsStore.activeMissions(),
    ...this.userMissionsStore.completedMissions()
  ]);

  protected readonly filteredMissions = computed(() => {
    const mode = this.filterMode();
    let result;
    switch (mode) {
      case 'available': result = this.userMissionsStore.availableMissions(); break;
      case 'joined': result = this.joinedMissions(); break;
      default: result = this.allMissions(); break;
    }
    console.log('[MissionList] Filtered missions:', {
      mode,
      count: result.length,
      missionIds: result.map(m => m.mission.id)
    });
    return result;
  });

  // ✅ Search and filter integration
  protected readonly filteredAndSearchedMissions = computed(() => {
    let missions = this.filteredMissions();

    // Apply quick filter
    const quickFilter = this.activeQuickFilter();
    if (quickFilter) {
      missions = missions.filter(missionData => {
        const mission = missionData.mission;
        switch (quickFilter) {
          case 'featured': return mission.featured;
          case 'easy': return mission.difficulty === 'easy';
          case 'medium': return mission.difficulty === 'medium';
          case 'hard': return mission.difficulty === 'hard';
          case 'extreme': return mission.difficulty === 'extreme';
          case 'regional': return mission.category === 'regional';
          case 'themed': return mission.category === 'themed';
          default: return true;
        }
      });
    }

    // Apply search and sort via filter store
    return this.filterStore.filterAndSort(missions);
  });

  // ✅ Quick filter options
  protected readonly quickFilters = computed(() => [
    { key: 'featured', label: '⭐ Featured' },
    { key: 'easy', label: '🟢 Easy' },
    { key: 'medium', label: '🟡 Medium' },
    { key: 'hard', label: '🔴 Hard' },
    { key: 'extreme', label: '⚫ Extreme' },
    { key: 'regional', label: '🗺️ Regional' },
    { key: 'themed', label: '🎯 Themed' }
  ]);

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

  // ✅ Quick filter handler
  onQuickFilterChange(filterKey: string): void {
    this._activeQuickFilter.set(filterKey);
  }

  // ✅ Initialize filter store
  override ngOnInit(): void {
    // super.ngOnInit();
    this.setupFilterStore();
    this.setupSignalMonitoring();
  }

  private setupFilterStore(): void {
    // Configure search predicate
    this.filterStore.setFilterPredicate(
      ListFilterStore.createSearchPredicate<MissionDisplayData>([
        (missionData: MissionDisplayData) => missionData.mission.name || '',
        (missionData: MissionDisplayData) => missionData.mission.description || '',
        (missionData: MissionDisplayData) => missionData.mission.category || '',
        (missionData: MissionDisplayData) => missionData.mission.subcategory || '',
        (missionData: MissionDisplayData) => missionData.mission.country || '',
        (missionData: MissionDisplayData) => missionData.mission.region || ''
      ])
    );

    // Configure sort options
    this.filterStore.setSortOptions([
      {
        key: 'name',
        label: 'Name',
        getValue: (missionData: MissionDisplayData) => missionData.mission.name || '',
        direction: 'asc'
      },
      {
        key: 'points',
        label: 'Points',
        getValue: (missionData: MissionDisplayData) => missionData.mission.pointsReward || 0,
        direction: 'desc'
      },
      {
        key: 'difficulty',
        label: 'Difficulty',
        getValue: (missionData: MissionDisplayData) => {
          const difficulty = missionData.mission.difficulty || 'medium';
          const order = { easy: 1, medium: 2, hard: 3, extreme: 4 };
          return order[difficulty as keyof typeof order] || 2;
        },
        direction: 'asc'
      },
      {
        key: 'pubCount',
        label: 'Pub Count',
        getValue: (missionData: MissionDisplayData) => missionData.mission.pubIds?.length || 0,
        direction: 'desc'
      }
    ]);
  }

  // ✅ Monitor signal changes for debugging
  private setupSignalMonitoring(): void {
    // Monitor store signal changes
    effect(() => {
      const available = this.userMissionsStore.availableMissions();
      const active = this.userMissionsStore.activeMissions();
      const completed = this.userMissionsStore.completedMissions();
      const loading = this.userMissionsStore.loading();
      
      console.log('🔔 [MissionList] Store signals changed:', {
        counts: {
          available: available.length,
          active: active.length,
          completed: completed.length
        },
        loading,
        availableIds: available.map(m => m.mission.id),
        activeIds: active.map(m => m.mission.id),
        completedIds: completed.map(m => m.mission.id),
        timestamp: new Date().toISOString()
      });
    });
    
    // Monitor computed signals
    effect(() => {
      const all = this.allMissions();
      const filtered = this.filteredMissions();
      const filteredAndSearched = this.filteredAndSearchedMissions();
      
      console.log('🧮 [MissionList] Computed signals changed:', {
        counts: {
          allCount: all.length,
          filteredCount: filtered.length,
          finalCount: filteredAndSearched.length
        },
        filterMode: this.filterMode(),
        allIds: all.map(m => m.mission.id),
        filteredIds: filtered.map(m => m.mission.id),
        finalIds: filteredAndSearched.map(m => m.mission.id),
        timestamp: new Date().toISOString()
      });
    });
    
    // Monitor filter mode changes
    effect(() => {
      const mode = this.filterMode();
      console.log('🎛️ [MissionList] Filter mode changed to:', mode, 'at', new Date().toISOString());
    });
    
    // Monitor enrollment state
    effect(() => {
      const enrollingId = this.enrollingMissionId();
      if (enrollingId) {
        console.log('⏳ [MissionList] Now enrolling in mission ID:', enrollingId);
      } else {
        console.log('✅ [MissionList] Enrollment completed (no active enrollment)');
      }
    });
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
      this._enrollingMissionId.set(mission.id);
      console.log('🚀 [MissionList] Starting enrollment process for:', mission.name, '(ID:', mission.id, ')');
      
      // Log detailed state BEFORE enrollment
      const beforeState = {
        available: this.userMissionsStore.availableMissions(),
        active: this.userMissionsStore.activeMissions(),
        completed: this.userMissionsStore.completedMissions(),
        all: this.allMissions(),
        filtered: this.filteredMissions(),
        finalDisplay: this.filteredAndSearchedMissions()
      };
      
      console.log('📊 [MissionList] BEFORE enrollment - detailed state:', {
        counts: {
          available: beforeState.available.length,
          active: beforeState.active.length,
          completed: beforeState.completed.length,
          all: beforeState.all.length,
          filtered: beforeState.filtered.length,
          finalDisplay: beforeState.finalDisplay.length
        },
        availableIds: beforeState.available.map(m => m.mission.id),
        activeIds: beforeState.active.map(m => m.mission.id),
        completedIds: beforeState.completed.map(m => m.mission.id),
        filterMode: this.filterMode(),
        targetMissionInAvailable: beforeState.available.some(m => m.mission.id === mission.id),
        targetMissionInActive: beforeState.active.some(m => m.mission.id === mission.id),
        targetMissionInFinalDisplay: beforeState.finalDisplay.some(m => m.mission.id === mission.id)
      });
      
      console.log('⏳ [MissionList] Calling userMissionsStore.enrollInMission...');
      await this.userMissionsStore.enrollInMission(mission.id);
      console.log('✅ [MissionList] userMissionsStore.enrollInMission completed');
      
      // Log detailed state AFTER enrollment
      const afterState = {
        available: this.userMissionsStore.availableMissions(),
        active: this.userMissionsStore.activeMissions(),
        completed: this.userMissionsStore.completedMissions(),
        all: this.allMissions(),
        filtered: this.filteredMissions(),
        finalDisplay: this.filteredAndSearchedMissions()
      };
      
      console.log('📊 [MissionList] AFTER enrollment - detailed state:', {
        counts: {
          available: afterState.available.length,
          active: afterState.active.length,
          completed: afterState.completed.length,
          all: afterState.all.length,
          filtered: afterState.filtered.length,
          finalDisplay: afterState.finalDisplay.length
        },
        availableIds: afterState.available.map(m => m.mission.id),
        activeIds: afterState.active.map(m => m.mission.id),
        completedIds: afterState.completed.map(m => m.mission.id),
        filterMode: this.filterMode(),
        targetMissionInAvailable: afterState.available.some(m => m.mission.id === mission.id),
        targetMissionInActive: afterState.active.some(m => m.mission.id === mission.id),
        targetMissionInFinalDisplay: afterState.finalDisplay.some(m => m.mission.id === mission.id)
      });
      
      // Log the changes
      console.log('🔄 [MissionList] State changes detected:', {
        availableChange: afterState.available.length - beforeState.available.length,
        activeChange: afterState.active.length - beforeState.active.length,
        completedChange: afterState.completed.length - beforeState.completed.length,
        allChange: afterState.all.length - beforeState.all.length,
        finalDisplayChange: afterState.finalDisplay.length - beforeState.finalDisplay.length,
        missionMovedFromAvailableToActive: beforeState.available.some(m => m.mission.id === mission.id) && afterState.active.some(m => m.mission.id === mission.id)
      });
      
      console.log('🎉 [MissionList] Successfully enrolled in mission:', mission.name);
      this.showSuccess(`Enrolled in mission: "${mission.name}"!`);
    } catch (error: any) {
      console.error('[MissionList] ❌ Failed to start mission:', error);
      this.showError(error?.message || 'Failed to start mission');
    } finally {
      this._enrollingMissionId.set(null);
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
