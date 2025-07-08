// src/app/home/feature/home/home.component.ts
import { Component, computed, inject, signal, ChangeDetectionStrategy, effect } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BaseComponent } from '@shared/base/base.component';
import { environment } from '../../../../environments/environment';

import { AuthStore } from '@auth/data-access/auth.store';
import { UserStore } from '@users/data-access/user.store';
import { MissionStore } from '@missions/data-access/mission.store';
import { OverlayService } from '@shared/data-access/overlay.service';
import { PointsStore } from '@points/data-access/points.store';
import { CheckInStore } from '../../../check-in/data-access/check-in.store';
import { DataAggregatorService } from '../../../shared/data-access/data-aggregator.service';
import { PubStore } from '../../../pubs/data-access/pub.store';
import { LocationService } from '../../../shared/data-access/location.service';

import { BadgesWidgetComponent } from '../../../widgets/badges/badges-widget.component';
import { MissionsWidgetComponent } from '../../../widgets/missions/missions-widget.component';
import { ProfileCustomisationModalComponent } from '@home/ui/profile-customisation-modal/profile-customisation-modal.component';
import { CarpetWidgetComponent } from '../../../widgets/carpet/carpet-widget.component';
// import { LLMTestComponent } from '../../../shared/ui/llm-test/llm-test.component';
import { UserAvatarComponent } from "../../../shared/ui/user-avatar/user-avatar.component";
import { NearestPubComponent } from '../../../widgets/nearest-pub/nearest-pub.component';
import { LeaderboardWidgetComponent } from '../../../widgets/leaderboard/leaderboard-widget.component';
import { LocalLeaderboardWidgetComponent } from '../../../widgets/local-leaderboard/local-leaderboard-widget.component';
import { RecentActivityWidgetComponent } from '../../../widgets/recent-activity/recent-activity-widget.component';
import { ScoreboardHeroWidgetComponent } from '../../../widgets/scoreboard-hero/scoreboard-hero-widget.component';
import { SuggestedMissionWidgetComponent } from '../../../widgets/suggested-mission/suggested-mission-widget.component';


@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ScoreboardHeroWidgetComponent,
    BadgesWidgetComponent,
    MissionsWidgetComponent,
    SuggestedMissionWidgetComponent,
    CarpetWidgetComponent,
    RouterModule,
    NearestPubComponent,
    LeaderboardWidgetComponent,
    LocalLeaderboardWidgetComponent,
    RecentActivityWidgetComponent,
],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent extends BaseComponent {
  protected readonly overlayService = inject(OverlayService);

  constructor() {
    super();

    console.log('[Home] 🏠 HomeComponent initialized - onboarding handled by guard');
  }

  override async onInit() {
    console.log('[Home] Initializing home component with micro-widgets...');

    // Initialize location service for proximity-based features
    const user = this.user();
    if (user && user.onboardingCompleted) {
      console.log('[Home] User completed onboarding, initializing location service...');
      this.locationService.getCurrentLocation();
    }

    // Load only the stores we have available
    try {
      this.missionStore?.loadOnce?.();
    } catch (error) {
      console.warn('[Home] Some stores not available:', error);
    }

    console.log('[Home] Component initialized');
  }













  // ✅ Store Injections
  protected readonly authStore = inject(AuthStore);
  protected readonly userStore = inject(UserStore);
  protected readonly missionStore = inject(MissionStore, { optional: true });
  protected readonly pointsStore = inject(PointsStore);
  protected readonly checkinStore = inject(CheckInStore);
  protected readonly dataAggregatorService = inject(DataAggregatorService);
  protected readonly pubStore = inject(PubStore);
  protected readonly locationService = inject(LocationService);



  handleAvatarClick(event: any) {
    console.log('Avatar clicked', event);
  }

  // ✅ Data Signals
  readonly user = this.userStore.user;

  /**
   * Scoreboard data aggregated via DataAggregatorService
   * @description Clean, dependency-free aggregation from multiple stores.
   * DataAggregatorService eliminates circular dependencies and provides
   * reactive computed signals for complex cross-store data.
   */
  readonly scoreboardData = this.dataAggregatorService.scoreboardData;



  readonly isNewUser = computed(() => {
    const user = this.user();
    return !user || this.dataAggregatorService.pubsVisited() === 0;
  });

    // ✅ Placeholder for leaderboard position
    readonly userLeaderboardPosition = computed(() => {
      // TODO: Implement real leaderboard calculation
      const user = this.user();
      if (!user) return null;

      const pubs = this.dataAggregatorService.pubsVisited();
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

  // Pass the close callback to the modal component
  componentRef.setInput('closeCallback', close);

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
      pubsVisited: this.dataAggregatorService.pubsVisited(),
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
      available: !!this.missionStore
    }
  }));


}
