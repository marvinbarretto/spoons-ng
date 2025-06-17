// src/app/home/feature/home/home.component.ts
import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { Router } from '@angular/router';
import { BaseComponent } from '@shared/data-access/base.component';
import { AuthStore } from '@auth/data-access/auth.store';
import { UserStore } from '@users/data-access/user.store';
import { BadgeStore } from '@badges/data-access/badge.store';
import { MissionStore } from '@missions/data-access/mission.store';
import { OverlayService } from '@shared/data-access/overlay.service';

// Import micro-widget components
import { ScoreboardHeroComponent } from '@home/ui/scoreboard-hero/scoreboard-hero.component';
import { BadgesShowcaseComponent } from '@home/ui/badges-showcase/badges-showcase.component';
import { MissionsSectionComponent } from '../../ui/missions-widget/missions-widget.component';
import { ActionCardsComponent } from '@home/ui/action-cards/action-cards.component';
import { UserProfileWidgetComponent } from '@home/ui/user-profile-widget/user-profile-widget.component';
import { ProfileCustomisationModalComponent } from '@home/ui/profile-customisation-modal/profile-customisation-modal.component';
import { PubCountHeroComponent } from '../../ui/pub-count-hero/pub-count-hero.component';



@Component({
  selector: 'app-home-three',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ScoreboardHeroComponent,
    BadgesShowcaseComponent,
    MissionsSectionComponent,
    ActionCardsComponent,
    UserProfileWidgetComponent,
],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent extends BaseComponent {
  private readonly overlayService = inject(OverlayService);

  // ✅ Store Injections
  protected readonly authStore = inject(AuthStore);
  protected readonly userStore = inject(UserStore);
  protected readonly badgeStore = inject(BadgeStore, { optional: true });
  protected readonly missionStore = inject(MissionStore, { optional: true });

  // ✅ Data Signals
  readonly user = this.userStore.user;

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


  // ✅ Data Loading
  protected override onInit(): void {
    console.log('[Home] Initializing home component with micro-widgets...');

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
