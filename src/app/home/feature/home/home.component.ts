// src/app/home/feature/home/home.component.ts
import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { BaseComponent } from '@shared/data-access/base.component';
import { AuthStore } from '@auth/data-access/auth.store';
import { CheckinStore } from '@check-in/data-access/check-in.store';
import { PubStore } from '@pubs/data-access/pub.store';
import { UserStore } from '@users/data-access/user.store';
import { BadgeStore } from '@badges/data-access/badge.store';
import { NearbyPubStore } from '@pubs/data-access/nearby-pub.store';

// Import your UI components
import { PubProgressHeroComponent } from '@home/ui/pub-progress-hero/pub-progress-hero.component';
import { CheckInHomepageWidgetComponent } from '@check-in/ui/check-in-homepage-widget/check-in-homepage-widget.component';
import { EarnedBadgeListComponent } from '@badges/ui/earned-badge-list/earned-badge-list.component';
import { NearbyPubListComponent } from '@home/ui/nearby-pub-list/nearby-pub-list.component';
import { WelcomeComponent } from '@home/ui/welcome/welcome.component';
import { PubCountHeroComponent } from "../../ui/pub-count-hero/pub-count-hero.component";
import { ScoreboardHeroComponent } from "../../ui/scoreboard-hero/scoreboard-hero.component";
import { OverlayService } from '../../../shared/data-access/overlay.service';
import { MissionStore } from '../../../missions/data-access/mission.store';

@Component({
  selector: 'app-home-three',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PubProgressHeroComponent,
    CheckInHomepageWidgetComponent,
    EarnedBadgeListComponent,
    NearbyPubListComponent,
    WelcomeComponent,
    JsonPipe,
    PubCountHeroComponent,
    ScoreboardHeroComponent
],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent extends BaseComponent {
  // ✅ Store Injections
  protected readonly authStore = inject(AuthStore);
  protected readonly userStore = inject(UserStore);
  protected readonly pubStore = inject(PubStore);
  protected readonly badgeStore = inject(BadgeStore);
  protected readonly missionStore = inject(MissionStore);
  protected readonly checkinStore = inject(CheckinStore);
  protected readonly nearbyPubStore = inject(NearbyPubStore);


  private readonly overlayService = inject(OverlayService);

  // ✅ Data Loading
  protected override onInit(): void {
    console.log('[Home] Initializing component...');

    // Load critical data
    this.pubStore.loadOnce();
    this.badgeStore.loadOnce();
    this.missionStore.loadOnce();

    console.log('[Home] Initial data loading triggered');
  }

  // ✅ Data Signals
  readonly user = this.userStore.user;
  readonly closestPub = this.nearbyPubStore.closestPub;
  readonly nearbyPubs = this.nearbyPubStore.nearbyPubs;
  readonly recentBadges = this.badgeStore.recentBadgesForDisplay;


  // ✅ Environment
  readonly isDevelopment = computed(() => {
    // TODO: Replace with proper environment check
    return !this.currentRoute().includes('production');
  });

  readonly isProduction = false; // TODO: inject from environment

  constructor() {
    super();

    // ✅ Initialize stores
    this.badgeStore.loadOnce(); // Loads both definitions and earned badges
    this.pubStore.loadOnce();   // Load pub data
    // UserStore loads automatically via auth effect
    // CheckinStore loads automatically via auth effect
    // NearbyPubStore is reactive - no loading needed
  }

  // ===================================
  // BADGE DISPLAY LOGIC
  // ===================================

  readonly shouldShowBadges = computed(() => {
    return this.badgeStore.hasEarnedBadges();
  });

  // ===================================
  // USER STATUS COMPUTED PROPERTIES
  // ===================================

  readonly visitedPubsCount = computed(() => {
    return this.userStore.user()?.checkedInPubIds?.length || 0;
  });

  readonly totalPubs = computed(() => {
    return this.pubStore.data().length;
  });

  readonly hasProgressData = computed(() => {
    return this.totalPubs() > 0 && this.visitedPubsCount() >= 0;
  });




// ✅ Next milestone calculation for the hero
readonly nextMilestone = computed(() => {
  const count = this.visitedPubsCount();
  const milestones = [1, 5, 10, 25, 50, 100, 200, 500];
  return milestones.find(milestone => milestone > count) || null;
});

// ✅ Progressive disclosure based on user stage
readonly UserExperienceLevel = computed(() => {
  const count = this.visitedPubsCount();
  const user = this.authStore.user();

  if (!user) return 'guest';
  if (count === 0) return 'brandNew';
  if (count <= 3) return 'firstTime';
  if (count <= 10) return 'earlyUser';
  return 'regularUser';
});

// ✅ Control what to show based on user stage
readonly shouldShowSubtext = computed(() => {
  const stage = this.UserExperienceLevel();
  return stage !== 'guest'; // Don't confuse guests with too much text
});

readonly shouldShowGoal = computed(() => {
  const stage = this.UserExperienceLevel();
  const count = this.visitedPubsCount();
  // Show goals once they have at least 1 check-in
  return stage !== 'guest' && stage !== 'brandNew' && count > 0;
});



// ✅ Event Handlers
handleOpenSettings(): void {
  console.log('[Home] Opening profile settings');
  // TODO: Implement ProfileCustomizationModal
  this.showInfo('Profile customization coming soon!');
}

handleOpenGuide(): void {
  console.log('[Home] Opening how-to-play guide');
  // TODO: Implement HowToPlayModal using OverlayService
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
  this.router.navigate(['/admin/badges']); // TODO: Create user-facing badges page
}

  // ===================================
  // NEARBY PUBS COMPUTED PROPERTIES (using existing NearbyPubStore interface)
  // ===================================

  readonly nearestPubs = computed(() => {
    return this.nearbyPubStore.nearbyPubs().slice(0, 5);
  });

  // ✅ Use the existing canCheckIn signal from NearbyPubStore
  readonly canCheckInToClosestPub = computed(() => {
    return this.nearbyPubStore.canCheckIn();
  });

  // ✅ Convert distance to string for the component
  readonly closestPubDistanceKm = computed(() => {
    const closest = this.closestPub();
    if (!closest) return '0.00';

    // Convert meters to kilometers and format as string
    const distanceKm = closest.distance / 1000;
    return distanceKm.toFixed(2);
  });

  readonly todaysCheckins = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.checkinStore.data().filter(checkin =>
      checkin.dateKey === today
    );
  });

  // ✅ Use existing signals from NearbyPubStore
  readonly shouldShowNearbyPubsEmptyState = computed(() => {
    const hasLocation = !!this.nearbyPubStore.location();
    const hasNearbyPubs = this.nearbyPubStore.hasNearbyPubs();
    const totalPubs = this.pubStore.data().length;

    // Show empty state if:
    // - We have location data
    // - We have loaded pubs from the database
    // - But no pubs are nearby
    return hasLocation && totalPubs > 0 && !hasNearbyPubs;
  });

  readonly isLoading = computed(() => {
    return this.pubStore.loading() ||
           this.userStore.loading() ||
           this.badgeStore.loading();
  });

  // ===================================
  // UTILITY METHODS (using NearbyPubStore methods)
  // ===================================

  // ✅ Helper to check if a specific pub is in range
  isPubInCheckInRange(pubId: string): boolean {
    return this.nearbyPubStore.isWithinCheckInRange(pubId);
  }

  // ✅ Helper to get distance to a specific pub
  getDistanceToSpecificPub(pubId: string): number | null {
    return this.nearbyPubStore.getDistanceToPub(pubId);
  }

  // ===================================
  // ACTION METHODS
  // ===================================

  openProfileSettings(): void {
    // Implement profile settings modal opening logic
    console.log('[HomeComponent] Opening profile settings...');

    // Example implementation - replace with your actual modal service:
    // this.overlayService.open(ProfileSettingsComponent);

    // Or call existing methods:
    // this.changeUsername();
    // this.chooseAvatar();
    // this.upgradeToFullAccount();
  }

  // ===================================
  // DEBUG INFO
  // ===================================

  readonly userStatusDebug = computed(() => {
    return {
      user: this.authStore.user(),
      visitedPubs: this.visitedPubsCount(),
      totalPubs: this.totalPubs(),
      badges: this.badgeStore.earnedBadgeCount(),
      nearbyPubs: this.nearestPubs().length,
      location: this.nearbyPubStore.location(),
      canCheckIn: this.nearbyPubStore.canCheckIn(),
      isLoading: this.isLoading()
    };
  });
}

// ✅ PERFECT INTEGRATION with existing NearbyPubStore:
// 1. Uses nearbyPubStore.closestPub() signal ✅
// 2. Uses nearbyPubStore.canCheckIn() signal (not method call) ✅
// 3. Uses nearbyPubStore.hasNearbyPubs() for empty state ✅
// 4. Uses nearbyPubStore.location() to check if location available ✅
// 5. Converts distance from meters to km string properly ✅
// 6. Uses existing utility methods for additional functionality ✅
// 7. Enhanced debug panel with NearbyPubStore info ✅
