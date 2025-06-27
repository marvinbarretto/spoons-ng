// src/app/home/feature/home/home.component.ts
import { Component, computed, inject, signal, ChangeDetectionStrategy, effect } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BaseComponent } from '@shared/data-access/base.component';
import { AuthStore } from '@auth/data-access/auth.store';
import { UserStore } from '@users/data-access/user.store';
import { MissionStore } from '@missions/data-access/mission.store';
import { OverlayService } from '@shared/data-access/overlay.service';
import { PointsStore } from '@points/data-access/points.store';
import { NewCheckinStore } from '../../../new-checkin/data-access/new-checkin.store';
import { DataAggregatorService } from '../../../shared/data-access/data-aggregator.service';
import { PubStore } from '../../../pubs/data-access/pub.store';

// Import micro-widget components
import { ScoreboardData, ScoreboardHeroComponent } from '@home/ui/scoreboard-hero/scoreboard-hero.component';
import { BadgesShowcaseComponent } from '@home/ui/badges-showcase/badges-showcase.component';
import { MissionsSectionComponent } from '../../ui/missions-widget/missions-widget.component';
import { UserProfileWidgetComponent } from '@home/ui/user-profile-widget/user-profile-widget.component';
import { ProfileCustomisationModalComponent } from '@home/ui/profile-customisation-modal/profile-customisation-modal.component';
import { OptimizedCarpetGridComponent, CarpetDisplayData } from '../../ui/optimized-carpet-grid/optimized-carpet-grid.component';
import { CarpetScannerComponent } from '../../../check-in/feature/carpet-scanner/carpet-scanner.component';
import { CarpetPhotoData, PhotoStats } from '@shared/utils/carpet-photo.models';
import { DeviceCarpetStorageService } from '../../../carpets/data-access/device-carpet-storage.service';
import { LLMTestComponent } from '../../../shared/ui/llm-test/llm-test.component';



@Component({
  selector: 'app-home-three',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ScoreboardHeroComponent,
    BadgesShowcaseComponent,
    MissionsSectionComponent,
    UserProfileWidgetComponent,
    OptimizedCarpetGridComponent,
    RouterModule,
    CarpetScannerComponent,
    LLMTestComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent extends BaseComponent {
  private readonly overlayService = inject(OverlayService);

  // Carpet grid state management
  protected readonly carpets = signal<CarpetDisplayData[]>([]);
  protected readonly carpetsLoading = signal(false);
  protected readonly carpetsError = signal<string | null>(null);
  private lastLoadedUserId: string | null = null;

  constructor() {
    super();

    // Watch for when check-in needs carpet scanning
    effect(() => {
      const needsCarpetForPub = this.newCheckinStore.needsCarpetScan();
      if (needsCarpetForPub) {
        console.log('[Home] Check-in needs carpet scan for pub:', needsCarpetForPub);
        this.showCarpetTest.set(true);
      }
    });

    // Watch for auth changes and load carpets accordingly
    effect(() => {
      const user = this.authStore.user();
      const userId = user?.uid;

      console.log('[Home] Auth effect triggered for carpets:', {
        hasUser: !!user,
        userId: userId?.slice(0, 8),
        isAnonymous: user?.isAnonymous,
        previousUserId: this.lastLoadedUserId?.slice(0, 8)
      });

      // Clear carpets if no user
      if (!user) {
        console.log('[Home] No user, clearing carpets');
        this.clearCarpets();
        this.lastLoadedUserId = null;
        return;
      }

      // Load carpets if user changed
      if (userId !== this.lastLoadedUserId) {
        console.log('[Home] User changed, loading carpets for:', userId?.slice(0, 8));
        this.lastLoadedUserId = userId || null;
        
        // Use setTimeout to handle async operation outside effect
        setTimeout(() => this.loadUserCarpets(), 0);
      }
    });
  }

  private readonly carpetStorageService = inject(DeviceCarpetStorageService); // ✅ Still needed for carpet scanner



    // Signal for controlling carpet scanner display
    protected readonly showCarpetTest = signal(false);

  protected async onCarpetConfirmed(photoData: CarpetPhotoData): Promise<void> {
    console.log('🎯 [Home] === CARPET CONFIRMED EVENT RECEIVED ===');
    console.log('🎯 [Home] Photo data received:', photoData);

    try {
      console.log('💾 [Home] About to save photo using PhotoStorageService...');

      // Get pub info for the carpet scan
      const pubId = this.newCheckinStore.needsCarpetScan();
      const pub = pubId ? this.pubStore.get(pubId) : null;
      
      console.log('🏠 [Home] Pub context for carpet:', {
        pubId,
        pubName: pub?.name,
        hasPub: !!pub
      });

      if (!pub) {
        throw new Error(`Pub not found for carpet scan: ${pubId}`);
      }

      // ✅ Save the WebP/JPEG binary photo with pub context
      await this.carpetStorageService.savePhotoFromCarpetData(photoData, pub);

      console.log('✅ [Home] Photo saved successfully via PhotoStorageService');


      // Check if this was part of a check-in flow
      if (this.newCheckinStore.needsCarpetScan()) {
        // Send result back to check-in store using filename as imageKey
        this.newCheckinStore.processCarpetScanResult(photoData.filename);
      }

      // Hide scanner
      this.showCarpetTest.set(false);

      console.log('✅ [Home] === CARPET PROCESSING COMPLETE ===');

    } catch (error) {
      console.error('❌ [Home] === CARPET PROCESSING FAILED ===');
      console.error('❌ [Home] Error details:', error);
      console.error('❌ [Home] Photo data when error occurred:', photoData);
    }
  }

  protected onExitCarpetTest(): void {
    console.log('🚪 [Home] Exiting carpet test');

    // Check if this was part of a check-in flow
    if (this.newCheckinStore.needsCarpetScan()) {
      // Tell check-in store to proceed without carpet
      this.newCheckinStore.processCarpetScanResult(undefined);
    }

    this.showCarpetTest.set(false);
  }






  // ✅ Store Injections
  protected readonly authStore = inject(AuthStore);
  protected readonly userStore = inject(UserStore);
  protected readonly missionStore = inject(MissionStore, { optional: true });
  protected readonly pointsStore = inject(PointsStore);
  protected readonly newCheckinStore = inject(NewCheckinStore);
  protected readonly dataAggregator = inject(DataAggregatorService);
  protected readonly pubStore = inject(PubStore);





  // ✅ Data Signals
  readonly user = this.userStore.user;

  /**
   * Scoreboard data aggregated via DataAggregatorService
   * @description Clean, dependency-free aggregation from multiple stores.
   * DataAggregatorService eliminates circular dependencies and provides
   * reactive computed signals for complex cross-store data.
   */
  readonly scoreboardData = this.dataAggregator.scoreboardData;


  readonly activeMissions = computed(() => {
    const user = this.user();
    const allMissions = this.missionStore?.missions?.() || [];

    if (!user?.joinedMissionIds?.length || !allMissions.length) return [];

    return allMissions
      .filter(mission => user.joinedMissionIds!.includes(mission.id))
      .map(mission => ({
        id: mission.id,
        title: mission.name,
        description: mission.description,
        progress: mission.pubIds?.filter(id =>
          this.dataAggregator.hasVisitedPub(id)
        ).length || 0,
        total: mission.pubIds?.length || 0
      }))
      .slice(0, 3); // Show max 3 active missions
  });

  readonly isNewUser = computed(() => {
    const user = this.user();
    return !user || this.dataAggregator.pubsVisited() === 0;
  });

    // ✅ Placeholder for leaderboard position
    readonly userLeaderboardPosition = computed(() => {
      // TODO: Implement real leaderboard calculation
      const user = this.user();
      if (!user) return null;

      const pubs = this.dataAggregator.pubsVisited();
      const badges = user.badgeCount || 0;

      // Fake calculation for demo - higher activity = better position
      if (pubs >= 50 || badges >= 20) return Math.floor(Math.random() * 10) + 1;
      if (pubs >= 20 || badges >= 10) return Math.floor(Math.random() * 50) + 10;
      if (pubs >= 5 || badges >= 3) return Math.floor(Math.random() * 200) + 50;

      return null; // Not on leaderboard yet
    });

  // ✅ Development helper
  readonly isDevelopment = computed(() => {
    return true; // Always show debug in development
  });

  // ✅ Carpet management methods
  private async loadUserCarpets(): Promise<void> {
    console.log('[Home] Loading user carpets...');
    
    // Prevent multiple simultaneous loads
    if (this.carpetsLoading()) {
      console.log('[Home] Already loading carpets, skipping...');
      return;
    }
    
    this.carpetsLoading.set(true);
    this.carpetsError.set(null);

    try {
      // Ensure carpet storage is initialized
      await this.carpetStorageService.initialize();
      
      // Get carpet data from storage
      const carpetData = await this.carpetStorageService.getUserCarpets();
      console.log('[Home] Got carpet data from storage:', {
        userId: this.authStore.user()?.uid?.slice(0, 8),
        carpetCount: carpetData.length,
        sampleCarpet: carpetData[0] ? {
          pubId: carpetData[0].pubId,
          pubName: carpetData[0].pubName,
          date: carpetData[0].date,
          blobSize: carpetData[0].blob.size
        } : null
      });

      // Convert to display format - create object URLs here
      const displayData: CarpetDisplayData[] = carpetData.map(carpet => ({
        key: `${carpet.pubId}_${carpet.dateKey}`,
        pubId: carpet.pubId,
        pubName: carpet.pubName || 'Unknown Pub',
        date: carpet.date,
        imageUrl: URL.createObjectURL(carpet.blob)
      }));

      // Sort by date, newest first
      displayData.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      this.carpets.set(displayData);
      console.log('[Home] Carpets loaded successfully:', {
        userId: this.authStore.user()?.uid?.slice(0, 8),
        carpetCount: displayData.length,
        rawData: displayData.map(c => ({ key: c.key, pubName: c.pubName, date: c.date }))
      });

    } catch (error) {
      console.error('[Home] Error loading carpets:', error);
      this.carpetsError.set(error instanceof Error ? error.message : 'Failed to load carpets');
    } finally {
      this.carpetsLoading.set(false);
    }
  }

  private clearCarpets(): void {
    console.log('[Home] Clearing carpet data');
    
    // Just clear the signal - OptimizedCarpetGridComponent handles URL cleanup
    this.carpets.set([]);
    this.carpetsError.set(null);
  }

  // ✅ Event Handlers
  handleOpenSettings(): void {
    console.log('[Home] Opening profile settings');
    this.showInfo('Profile customization coming soon!');
  }

  handleOpenGuide(): void {
    console.log('[Home] Opening how-to-play guide');
    this.showInfo('How to play guide coming soon!');
  }

  handleStartMission(): void {
    console.log('[Home] Navigating to missions');
    this.router.navigate(['/missions']);
  }

  handleViewMission(missionId: string): void {
    console.log('[Home] Viewing mission:', missionId);
    this.router.navigate(['/missions', missionId]);
  }


// ✅ Event Handlers
handleOpenProfile(): void {
  console.log('[Home] Opening profile customization modal');

  const { componentRef, close } = this.overlayService.open(
    ProfileCustomisationModalComponent,
    {
      maxWidth: '600px',
      maxHeight: '90vh'
    }
  );

  // ✅ No need to subscribe to modal events - the close function handles everything
  console.log('[Home] Profile modal opened, close function available');
}

  // ✅ Debug Information
  readonly debugUserInfo = computed(() => {
    const user = this.user();
    if (!user) return { status: 'No user logged in' };

    return {
      uid: user.uid,
      displayName: user.displayName,
      isAnonymous: user.isAnonymous,
      pubsVisited: this.dataAggregator.pubsVisited(),
      badges: user.badgeCount || 0,
      missions: user.joinedMissionIds?.length || 0
    };
  });

  readonly debugStoresInfo = computed(() => ({
    auth: {
      hasUser: !!this.authStore.user(),
      userType: this.authStore.user()?.isAnonymous ? 'anonymous' : 'authenticated'
    },
    userStore: {
      hasUser: !!this.userStore.user(),
      loading: this.userStore.loading?.() || false
    },
    missionStore: {
      available: !!this.missionStore,
      activeMissions: this.activeMissions().length
    }
  }));




  // ✅ Data Loading
  protected override async onInit() {
    console.log('[Home] Initializing home component with micro-widgets...');



    // Load only the stores we have available
    try {
      this.missionStore?.loadOnce?.();
    } catch (error) {
      console.warn('[Home] Some stores not available:', error);
    }

    console.log('[Home] Component initialized');
  }

  // Clean up when component destroys
  ngOnDestroy(): void {
    this.clearCarpets();
  }
}
