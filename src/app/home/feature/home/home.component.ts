// src/app/home/feature/home/home.component.ts
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { BaseComponent } from '@shared/base/base.component';

import { AuthStore } from '@auth/data-access/auth.store';
import { LocationService, OverlayService } from '@fourfold/angular-foundation';
import { MissionStore } from '@missions/data-access/mission.store';
import { PointsStore } from '@points/data-access/points.store';
import { UserStore } from '@users/data-access/user.store';
import { CheckInStore } from '../../../check-in/data-access/check-in.store';
import { LeaderboardStore } from '../../../leaderboard/data-access/leaderboard.store';
import { PubStore } from '../../../pubs/data-access/pub.store';
import { DataAggregatorService } from '../../../shared/data-access/data-aggregator.service';

// ✅ Critical components loaded immediately
import { ScoreboardHeroWidgetComponent } from '@app/widgets/scoreboard-hero/scoreboard-hero-widget.component';

// ✅ Components for modal overlays (not deferred)
import { ProfileCustomisationModalComponent } from '@home/ui/profile-customisation-modal/profile-customisation-modal.component';

// ✅ Deferred components - imported for TypeScript but NOT in @Component.imports
// This allows Angular's @defer to handle lazy loading automatically
import { BadgesWidgetComponent } from '@app/widgets/badges/badges-widget.component';
import { WidgetCheckInGalleryComponent } from '@app/widgets/check-in-gallery/widget-check-in-gallery.component';
import { MissionsWidgetComponent } from '@app/widgets/missions/missions-widget.component';
import { NearestPubComponent } from '@app/widgets/nearest-pub/nearest-pub.component';
import { RecentActivityWidgetComponent } from '@app/widgets/recent-activity/recent-activity-widget.component';
import { SuggestedMissionWidgetComponent } from '@app/widgets/suggested-mission/suggested-mission-widget.component';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    // ✅ Critical components (load immediately)
    ScoreboardHeroWidgetComponent,

    // ✅ Essential Angular modules
    RouterModule,

    // ✅ Deferred components - included for template compilation, Angular handles lazy loading
    BadgesWidgetComponent,
    MissionsWidgetComponent,
    WidgetCheckInGalleryComponent,
    NearestPubComponent,
    RecentActivityWidgetComponent,
    SuggestedMissionWidgetComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
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
  protected readonly leaderboardStore = inject(LeaderboardStore, { optional: true });

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

  readonly userState = computed(() => {
    const user = this.user();
    const scoreboardData = this.dataAggregatorService.scoreboardData();
    const checkInCount = scoreboardData.totalCheckins || 0;
    const pubsVisited = scoreboardData.pubsVisited || 0;

    if (!user) return 'anonymous';
    if (checkInCount === 0) return 'new';
    if (checkInCount < 5 && pubsVisited < 3) return 'beginner';
    return 'experienced';
  });

  readonly isNewUser = computed(() => this.userState() === 'new');
  readonly isBeginner = computed(() => this.userState() === 'beginner');
  readonly isExperienced = computed(() => this.userState() === 'experienced');

  // Site stats for new user hero
  readonly siteStats = computed(() => {
    if (!this.leaderboardStore) {
      return {
        allTime: { users: 1234, checkins: 0, pubsConquered: 0 },
        thisMonth: { activeUsers: 0, checkins: 0 },
      };
    }

    const stats = this.leaderboardStore.siteStats();
    console.log('[Home] Site stats for hero:', stats);

    return (
      stats || {
        allTime: { users: 1234, checkins: 0, pubsConquered: 0 },
        thisMonth: { activeUsers: 0, checkins: 0 },
      }
    );
  });

  // Dynamic distance bonus text based on user's home location setup
  readonly distanceBonusText = computed(() => {
    const user = this.user();
    const hasHomeLocation = user?.homePubId; // Check if user has set a home pub

    if (hasHomeLocation) {
      return 'Pilgrimage Points';
    } else {
      return 'Travel Bonus';
    }
  });

  readonly distanceBonusPoints = computed(() => {
    const user = this.user();
    const hasHomeLocation = user?.homePubId;

    if (hasHomeLocation) {
      return 'Up to +15pts'; // Dynamic based on distance from home
    } else {
      return '+5pts'; // Standard bonus without home location
    }
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

  handleStartFirstCheckIn(): void {
    console.log('[Home] Starting first check-in flow');
    // Navigate to simplified check-in flow
    this.router.navigate(['/simplified-checkin']);
  }

  managePubCount(): void {
    console.log('[Home] Navigating to pub list in management mode');
    this.router.navigate(['/pubs'], { queryParams: { manage: 'true' } });
  }

  getRecentActivityText(): string {
    // TODO: Replace with real recent activity data from DataAggregatorService
    const humorousActivities = [
      'Sarah just earned legendary status at The Red Lion',
      'Mike spotted a rare carpet pattern (+25pts dedication)',
      'Emma completed her 100th Spoons pilgrimage',
      'James traveled 47 miles for Tim Martin (+15pts respect)',
      'Alex discovered an untouched carpet design',
      'Jordan proved true dedication with a Tuesday morning visit',
      'Sam photographed the mythical blue geometric pattern',
      'Casey achieved "Breakfast Champion" status at 9am',
    ];

    const randomActivity =
      humorousActivities[Math.floor(Math.random() * humorousActivities.length)];
    return randomActivity;
  }

  // ✅ Event Handlers
  handleOpenProfile(): void {
    console.log('[Home] Opening profile customization modal');

    const { componentRef, close } = this.overlayService.open(ProfileCustomisationModalComponent, {
      maxWidth: '600px',
      maxHeight: '90vh',
    });

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
      missions: user.joinedMissionIds?.length || 0,
    };
  });

  readonly debugStoresInfo = computed(() => ({
    auth: {
      hasUser: !!this.authStore.user(),
      userType: this.authStore.user()?.isAnonymous ? 'anonymous' : 'authenticated',
    },
    userStore: {
      hasUser: !!this.userStore.user(),
      loading: this.userStore.loading?.() || false,
    },
    missionStore: {
      available: !!this.missionStore,
    },
  }));
}
