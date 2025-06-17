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
import { MissionStore } from '../../../missions/data-access/mission.store';


// Import your UI components
import { PubProgressHeroComponent } from '@home/ui/pub-progress-hero/pub-progress-hero.component';
import { CheckInHomepageWidgetComponent } from '@check-in/ui/check-in-homepage-widget/check-in-homepage-widget.component';
import { EarnedBadgeListComponent } from '@badges/ui/earned-badge-list/earned-badge-list.component';
import { NearbyPubListComponent } from '@home/ui/nearby-pub-list/nearby-pub-list.component';
import { WelcomeComponent } from '@home/ui/welcome/welcome.component';
import { PubCountHeroComponent } from "../../ui/pub-count-hero/pub-count-hero.component";

import { OverlayService } from '../../../shared/data-access/overlay.service';

import { ScoreboardHeroComponent } from '@home/ui/scoreboard-hero/scoreboard-hero.component';
import { BadgesShowcaseComponent } from '@home/ui/badges-showcase/badges-showcase.component';
import { MissionsSectionComponent } from '@home/ui/missions-widget/missions-widget.component';
import { ActionCardsComponent } from '@home/ui/action-cards/action-cards.component';


@Component({
  selector: 'app-home-three',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PubCountHeroComponent,
    ScoreboardHeroComponent,
    BadgesShowcaseComponent,
    MissionsSectionComponent,
    ActionCardsComponent,
    JsonPipe

],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent extends BaseComponent {
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
