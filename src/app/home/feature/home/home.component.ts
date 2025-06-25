// src/app/home/feature/home/home.component.ts
import { Component, computed, inject, signal, ChangeDetectionStrategy, effect } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BaseComponent } from '@shared/data-access/base.component';
import { AuthStore } from '@auth/data-access/auth.store';
import { UserStore } from '@users/data-access/user.store';
import { BadgeStore } from '@badges/data-access/badge.store';
import { MissionStore } from '@missions/data-access/mission.store';
import { OverlayService } from '@shared/data-access/overlay.service';
import { PointsStore } from '@points/data-access/points.store';
import { CheckinStore } from '@check-in/data-access/check-in.store';
import { NewCheckinStore } from '../../../new-checkin/data-access/new-checkin.store';
import { DataAggregatorService } from '../../../shared/data-access/data-aggregator.service';

// Import micro-widget components
import { ScoreboardData, ScoreboardHeroComponent } from '@home/ui/scoreboard-hero/scoreboard-hero.component';
import { BadgesShowcaseComponent } from '@home/ui/badges-showcase/badges-showcase.component';
import { MissionsSectionComponent } from '../../ui/missions-widget/missions-widget.component';
import { UserProfileWidgetComponent } from '@home/ui/user-profile-widget/user-profile-widget.component';
import { ProfileCustomisationModalComponent } from '@home/ui/profile-customisation-modal/profile-customisation-modal.component';
import { DeviceCarpetStorageService } from '../../../carpets/data-access/device-carpet-storage.service';
import { CarpetGridComponent, type CarpetDisplayData } from '../../../carpets/ui/carpet-grid/carpet-grid.component';
import { CarpetScannerComponent } from '../../../check-in/feature/carpet-scanner/carpet-scanner.component';
import { CarpetPhotoData, PhotoStats } from '@shared/utils/carpet-photo.models';



@Component({
  selector: 'app-home-three',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ScoreboardHeroComponent,
    BadgesShowcaseComponent,
    MissionsSectionComponent,
    UserProfileWidgetComponent,
    CarpetGridComponent,
    RouterModule,
    CarpetScannerComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent extends BaseComponent {
  private readonly overlayService = inject(OverlayService);

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
  }

  private readonly carpetStorageService = inject(DeviceCarpetStorageService); // ✅ Updated injection



    // Signal for controlling carpet scanner display
    protected readonly showCarpetTest = signal(false);

  protected async onCarpetConfirmed(photoData: CarpetPhotoData): Promise<void> {
    console.log('🎯 [Home] === CARPET CONFIRMED EVENT RECEIVED ===');
    console.log('🎯 [Home] Photo data received:', photoData);

    try {
      console.log('💾 [Home] About to save photo using PhotoStorageService...');

      // ✅ Save the WebP/JPEG binary photo
      await this.carpetStorageService.savePhotoFromCarpetData(photoData);

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
  protected readonly badgeStore = inject(BadgeStore, { optional: true });
  protected readonly missionStore = inject(MissionStore, { optional: true });
  protected readonly pointsStore = inject(PointsStore);
  protected readonly checkinStore = inject(CheckinStore);
  protected readonly newCheckinStore = inject(NewCheckinStore);
  protected readonly dataAggregator = inject(DataAggregatorService);



   protected readonly carpets = signal<CarpetDisplayData[]>([]);
   protected readonly carpetsLoading = signal(false);


  // ✅ Data Signals
  readonly user = this.userStore.user;

  /**
   * Scoreboard data aggregated via DataAggregatorService
   * @description Clean, dependency-free aggregation from multiple stores.
   * DataAggregatorService eliminates circular dependencies and provides
   * reactive computed signals for complex cross-store data.
   */
  readonly scoreboardData = this.dataAggregator.scoreboardData;

  readonly earnedBadges = computed(() => {
    return this.badgeStore?.earnedBadgesWithDefinitions?.() || [];
  });

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
          user.checkedInPubIds?.includes(id)
        ).length || 0,
        total: mission.pubIds?.length || 0
      }))
      .slice(0, 3); // Show max 3 active missions
  });

  readonly isNewUser = computed(() => {
    const user = this.user();
    return !user || (user.checkedInPubIds?.length || 0) === 0;
  });

    // ✅ Placeholder for leaderboard position
    readonly userLeaderboardPosition = computed(() => {
      // TODO: Implement real leaderboard calculation
      const user = this.user();
      if (!user) return null;

      const pubs = user.checkedInPubIds?.length || 0;
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

  handleViewAllBadges(): void {
    console.log('[Home] Viewing all badges');
    this.router.navigate(['/admin/badges']);
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
      pubsVisited: user.checkedInPubIds?.length || 0,
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
    badgeStore: {
      available: !!this.badgeStore,
      badgeCount: this.earnedBadges().length
    },
    missionStore: {
      available: !!this.missionStore,
      activeMissions: this.activeMissions().length
    }
  }));


  private async loadCarpets(): Promise<void> {
    console.log('[HomeComponent] Loading carpet collection...');
    this.carpetsLoading.set(true);

    try {
      // Get carpet data for current user only (getUserCarpets handles initialization internally)
      const carpetData = await this.carpetStorageService.getUserCarpets();
      console.log('[HomeComponent] Found', carpetData.length, 'carpets');

      // Convert to display format
      const displayData: CarpetDisplayData[] = await Promise.all(
        carpetData.map(async (carpet) => {
          // Create object URL for the blob
          const imageUrl = URL.createObjectURL(carpet.blob);

          return {
            key: `${carpet.pubId}_${carpet.dateKey}`,
            pubId: carpet.pubId,
            pubName: carpet.pubName || 'Unknown Pub',
            date: carpet.date,
            imageUrl
          };
        })
      );

      // Sort by date, newest first
      displayData.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      this.carpets.set(displayData);

    } catch (error) {
      console.error('[HomeComponent] Error loading carpets:', error);
    } finally {
      this.carpetsLoading.set(false);
    }
  }


  // ✅ Data Loading
  protected override async onInit() {
    console.log('[Home] Initializing home component with micro-widgets...');


    await this.loadCarpets();

    // Load only the stores we have available
    try {
      this.badgeStore?.loadOnce?.();
      this.missionStore?.loadOnce?.();
    } catch (error) {
      console.warn('[Home] Some stores not available:', error);
    }

    console.log('[Home] Component initialized');
  }
}

// TODO: DO i need to do this?
// // Clean up object URLs when component destroys
// ngOnDestroy() {
//   // Revoke object URLs to free memory
//   this.carpets().forEach(carpet => {
//     URL.revokeObjectURL(carpet.imageUrl);
//   });
// }
