import { Injectable, inject, signal, effect, computed } from '@angular/core';
import { AuthStore } from '../../auth/data-access/auth.store';
import { MissionStore } from './mission.store';
import { UserMissionProgressService } from './user-mission-progress.service';
import { Mission } from '../utils/mission.model';
import { UserMissionProgress, MissionDisplayData } from '../utils/user-mission-progress.model';

@Injectable({ providedIn: 'root' })
export class UserMissionsStore {
  private readonly authStore = inject(AuthStore);
  private readonly missionStore = inject(MissionStore);
  private readonly userMissionProgressService = inject(UserMissionProgressService);

  // Private signals
  private readonly _userProgress = signal<UserMissionProgress[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private lastLoadedUserId: string | null = null;

  // Public readonly signals
  readonly userProgress = this._userProgress.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed signals for display data
  readonly activeMissions = computed(() => {
    const missions = this.missionStore.missions();
    const progress = this._userProgress();
    
    return progress
      .filter(p => !p.isCompleted)
      .map(p => {
        const mission = missions.find(m => m.id === p.missionId);
        if (!mission) return null;
        
        return {
          mission,
          progress: p,
          isActive: true,
          isCompleted: false,
          progressPercentage: p.progressPercentage,
          completedCount: p.completedPubIds.length,
          totalCount: mission.pubIds.length
        } as MissionDisplayData;
      })
      .filter((item): item is MissionDisplayData => item !== null);
  });

  readonly completedMissions = computed(() => {
    const missions = this.missionStore.missions();
    const progress = this._userProgress();
    
    return progress
      .filter(p => p.isCompleted)
      .map(p => {
        const mission = missions.find(m => m.id === p.missionId);
        if (!mission) return null;
        
        return {
          mission,
          progress: p,
          isActive: false,
          isCompleted: true,
          progressPercentage: 100,
          completedCount: p.completedPubIds.length,
          totalCount: mission.pubIds.length
        } as MissionDisplayData;
      })
      .filter((item): item is MissionDisplayData => item !== null);
  });

  readonly availableMissions = computed(() => {
    const missions = this.missionStore.missions();
    const progress = this._userProgress();
    const progressMissionIds = progress.map(p => p.missionId);
    
    return missions
      .filter(m => !progressMissionIds.includes(m.id))
      .map(mission => ({
        mission,
        progress: undefined,
        isActive: false,
        isCompleted: false,
        progressPercentage: 0,
        completedCount: 0,
        totalCount: mission.pubIds.length
      }));
  });

  constructor() {
    // Auth-reactive effect - load user missions when user changes
    effect(() => {
      const user = this.authStore.user();
      const userId = user?.uid;

      console.log('[UserMissionsStore] Auth effect triggered:', {
        hasUser: !!user,
        userId: userId?.slice(0, 8),
        isAnonymous: user?.isAnonymous,
        previousUserId: this.lastLoadedUserId?.slice(0, 8)
      });

      // Clear data if no user or anonymous user
      if (!user || user.isAnonymous) {
        console.log('[UserMissionsStore] No authenticated user, clearing data');
        this.clearData();
        this.lastLoadedUserId = null;
        return;
      }

      // Load data if user changed
      if (userId !== this.lastLoadedUserId) {
        this.lastLoadedUserId = userId || null;
        console.log('[UserMissionsStore] User changed, loading missions');
        // Use setTimeout to avoid effect timing issues
        setTimeout(() => this.loadUserMissions(), 0);
      }
    });

    // Load all missions when store initializes
    this.missionStore.loadOnce();
  }

  private async loadUserMissions(): Promise<void> {
    const user = this.authStore.user();
    if (!user || user.isAnonymous) return;

    console.log('[UserMissionsStore] Loading user missions...');
    
    // Prevent multiple simultaneous loads
    if (this._loading()) {
      console.log('[UserMissionsStore] Already loading, skipping...');
      return;
    }

    this._loading.set(true);
    this._error.set(null);

    try {
      const progress = await this.userMissionProgressService.getUserProgress(user.uid);
      console.log('[UserMissionsStore] Loaded progress:', progress.length);
      this._userProgress.set(progress);
    } catch (error: any) {
      console.error('[UserMissionsStore] Failed to load user missions:', error);
      this._error.set(error?.message || 'Failed to load missions');
    } finally {
      this._loading.set(false);
    }
  }

  private clearData(): void {
    this._userProgress.set([]);
    this._error.set(null);
    this._loading.set(false);
  }

  /**
   * Start a mission for the current user.
   */
  async startMission(missionId: string): Promise<void> {
    const user = this.authStore.user();
    if (!user || user.isAnonymous) {
      throw new Error('User must be authenticated to start missions');
    }

    try {
      await this.userMissionProgressService.startMission(user.uid, missionId);
      // Reload user missions to reflect changes
      await this.loadUserMissions();
    } catch (error: any) {
      console.error('[UserMissionsStore] Failed to start mission:', error);
      this._error.set(error?.message || 'Failed to start mission');
      throw error;
    }
  }

  /**
   * Update progress when user checks into a pub.
   */
  async updateMissionProgress(missionId: string, pubId: string): Promise<void> {
    const user = this.authStore.user();
    if (!user || user.isAnonymous) return;

    try {
      const mission = this.missionStore.getMissionById(missionId);
      if (!mission) {
        throw new Error('Mission not found');
      }

      await this.userMissionProgressService.updateProgress(
        user.uid, 
        missionId, 
        pubId, 
        mission.pubIds.length
      );
      
      // Reload user missions to reflect changes
      await this.loadUserMissions();
    } catch (error: any) {
      console.error('[UserMissionsStore] Failed to update mission progress:', error);
      this._error.set(error?.message || 'Failed to update progress');
      throw error;
    }
  }
}