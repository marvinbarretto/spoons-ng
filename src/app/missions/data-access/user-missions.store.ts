import { Injectable, inject, signal, effect, computed } from '@angular/core';
import { AuthStore } from '../../auth/data-access/auth.store';
import { MissionStore } from './mission.store';
import { UserMissionProgressService } from './user-mission-progress.service';
import { CheckInStore } from '../../check-in/data-access/check-in.store';
import { Mission } from '../utils/mission.model';
import { UserMissionProgress, MissionDisplayData } from '../utils/user-mission-progress.model';

@Injectable({ providedIn: 'root' })
export class UserMissionsStore {
  private readonly authStore = inject(AuthStore);
  private readonly missionStore = inject(MissionStore);
  private readonly userMissionProgressService = inject(UserMissionProgressService);
  private readonly checkinStore = inject(CheckInStore);

  // Private signals
  private readonly _userProgress = signal<UserMissionProgress[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private lastLoadedUserId: string | null = null;
  private processedCheckinIds = new Set<string>();

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

      // Clear data if no user
      if (!user) {
        console.log('[UserMissionsStore] No user available, clearing data');
        this.clearData();
        this.lastLoadedUserId = null;
        this.processedCheckinIds.clear();
        return;
      }

      // Load data if user changed
      if (userId !== this.lastLoadedUserId) {
        this.lastLoadedUserId = userId || null;
        this.processedCheckinIds.clear(); // Clear processed check-ins for new user
        console.log('[UserMissionsStore] User changed, loading missions');
        // Use setTimeout to avoid effect timing issues
        setTimeout(() => this.loadUserMissions(), 0);
      }
    });

    // Load all missions when store initializes
    this.missionStore.loadOnce();

    // Watch for new check-ins and update mission progress automatically
    effect(() => {
      const user = this.authStore.user();
      const checkins = this.checkinStore.checkins();
      
      if (!user || checkins.length === 0) return;

      console.log('[UserMissionsStore] Check-ins changed, checking for mission updates', {
        userId: user.uid.slice(0, 8),
        totalCheckins: checkins.length
      });

      // Get user check-ins that haven't been processed yet
      const userCheckins = checkins
        .filter(c => c.userId === user.uid && !this.processedCheckinIds.has(c.id));
      
      if (userCheckins.length === 0) {
        console.log('[UserMissionsStore] No new check-ins to process');
        return;
      }

      console.log('[UserMissionsStore] Processing new check-ins', {
        newCheckins: userCheckins.length,
        checkinIds: userCheckins.map(c => c.id)
      });

      // Process each new check-in
      userCheckins.forEach(checkin => {
        // Mark as processed immediately to prevent reprocessing
        this.processedCheckinIds.add(checkin.id);
        
        // Check if this pub is part of any active missions
        const activeMissions = this._userProgress().filter(p => !p.isCompleted);
        const relevantMissions = activeMissions.filter(progress => {
          const mission = this.missionStore.getMissionById(progress.missionId);
          return mission && mission.pubIds.includes(checkin.pubId);
        });

        if (relevantMissions.length > 0) {
          console.log('[UserMissionsStore] Found relevant missions for check-in', {
            checkinId: checkin.id,
            pubId: checkin.pubId,
            relevantMissionIds: relevantMissions.map(m => m.missionId)
          });

          // Update mission progress for each relevant mission
          relevantMissions.forEach(progress => {
            this.recordMissionProgress(progress.missionId, checkin.pubId).catch(error => {
              console.error('[UserMissionsStore] Failed to auto-update mission progress:', error);
            });
          });
        }
      });
    });
  }

  private async loadUserMissions(): Promise<void> {
    const user = this.authStore.user();
    if (!user) return;

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
    this.processedCheckinIds.clear();
  }

  /**
   * Enroll the current user in a mission.
   */
  async enrollInMission(missionId: string): Promise<void> {
    const user = this.authStore.user();
    if (!user) {
      throw new Error('User must be available to enroll in missions');
    }

    try {
      await this.userMissionProgressService.enrollInMission(user.uid, missionId);
      // Reload user missions to reflect changes
      await this.loadUserMissions();
    } catch (error: any) {
      console.error('[UserMissionsStore] Failed to enroll in mission:', error);
      this._error.set(error?.message || 'Failed to enroll in mission');
      throw error;
    }
  }

  /**
   * Record mission progress when user checks into a pub.
   */
  async recordMissionProgress(missionId: string, pubId: string): Promise<void> {
    const user = this.authStore.user();
    if (!user) return;

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
      console.error('[UserMissionsStore] Failed to record mission progress:', error);
      this._error.set(error?.message || 'Failed to record progress');
      throw error;
    }
  }
}