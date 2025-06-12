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
import { OverlayService } from '@shared/data-access/overlay.service';
import { ProfileCustomizationModalComponent } from '../../ui/profile-customization-modal/profile-customization-modal.component';
import { UserProgressionService } from '../../../shared/data-access/user-progression.service';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PubProgressHeroComponent,
    CheckInHomepageWidgetComponent,
    EarnedBadgeListComponent,
    NearbyPubListComponent,
    WelcomeComponent,
    JsonPipe
  ],
  template: `
    <div class="home-container">

      <app-welcome [user]="authStore.user()" (openSettings)="openProfileSettings()" />

      @if (shouldShowCheckInWidget() && closestPub()) {
        <app-check-in-homepage-widget
          [closestPub]="closestPub()!"
          [canCheckIn]="canCheckInToClosestPub()"
          [distanceKm]="closestPubDistanceKm()"
        />
      }

      <!-- ✅ Progress hero (always show if has data) -->
      <app-pub-progress-hero
        [visitedCount]="progression.uniquePubsVisited()"
        [totalPubs]="totalPubs()"
        [hasProgress]="progression.totalCheckinsCount() > 0"
      />

      <!-- ✅ Badges (progression service determines visibility) -->
      @if (progression.shouldShowBadges()) {
        <app-earned-badge-list
          [earnedBadgesWithDefinitions]="badgeStore.recentBadgesForDisplay()"
          [maxItems]="3"
          size="small"
          [showEarnedDate]="true"
        />
      }

      <!-- ✅ Nearby pubs with smart empty state -->
      @if (nearestPubs().length > 0) {
        <app-nearby-pub-list
          [pubs]="nearestPubs()"
          [userCheckins]="todaysCheckins()"
        />
      } @else if (progression.shouldShowProgressFeatures()) {
        <div class="no-nearby-pubs-message">
          <h3>🕵️ No Nearby Pubs</h3>
          <p>Move closer to pubs to see check-in options!</p>
        </div>
      }

      <!-- ✅ Loading state -->
      @if (isLoading()) {
        <div class="loading-state">
          <p>🔄 Loading your pub data...</p>
        </div>
      }

      <!-- ✅ Development debug info -->
      @if (!isProduction) {
        <details class="debug-panel">
          <summary>🐛 Debug Info</summary>
          <pre>{{ debugInfo() | json }}</pre>
        </details>
      }

    </div>
  `,
  styleUrl: './home.component.scss'
})
export class HomeComponent extends BaseComponent {
  // ✅ Store Injections
  protected readonly authStore = inject(AuthStore);
  protected readonly checkinStore = inject(CheckinStore);
  protected readonly pubStore = inject(PubStore);
  protected readonly userStore = inject(UserStore);
  protected readonly badgeStore = inject(BadgeStore);
  protected readonly nearbyPubStore = inject(NearbyPubStore);

  private readonly overlayService = inject(OverlayService);

  // ✅ User progression service (replaces local progression logic)
  protected readonly progression = inject(UserProgressionService);

  // ✅ Environment
  readonly isProduction = false; // TODO: inject from environment

   // ✅ All existing computed properties can now use userStage directly
   readonly isBrandNewUser = computed(() => {
    const user = this.authStore.user();
    return user?.userStage === 'brandNew';
  });

  readonly shouldShowAdvancedFeatures = computed(() => {
    const user = this.authStore.user();
    return user?.userStage === 'powerUser' || user?.userStage === 'explorer';
  });

  readonly shouldShowOnboarding = computed(() => {
    const user = this.authStore.user();
    return user?.userStage === 'brandNew' || user?.userStage === 'firstTime';
  });

  constructor() {
    super();

    // ✅ Initialize stores that need loading
    this.badgeStore.loadOnce();
    this.pubStore.loadOnce();
  }

  // ✅ Location & check-in specific computed signals (HomeComponent responsibility)
  readonly closestPub = this.nearbyPubStore.closestPub;
  readonly nearestPubs = this.nearbyPubStore.nearbyPubs;

  readonly closestPubDistanceKm = computed(() => {
    const pub = this.closestPub();
    return pub ? (pub.distance / 1000).toFixed(1) : '0';
  });

  readonly shouldShowCheckInWidget = computed(() => {
    const closestPub = this.closestPub();
    if (!closestPub) return false;

    const isWithinRange = this.nearbyPubStore.isWithinCheckInRange(closestPub.id);
    const canCheckInToday = this.checkinStore.canCheckInToday(closestPub.id);

    return isWithinRange && canCheckInToday;
  });

  readonly canCheckInToClosestPub = computed(() => {
    const pub = this.closestPub();
    if (!pub) return false;

    const isWithinRange = this.nearbyPubStore.isWithinCheckInRange(pub.id);
    const hasntCheckedInToThisPubToday = this.checkinStore.canCheckInToday(pub.id);

    return isWithinRange && hasntCheckedInToThisPubToday;
  });

  readonly todaysCheckins = computed(() => {
    const user = this.authStore.user();
    if (!user) return [];

    const today = new Date().toDateString();
    return this.checkinStore.checkins()
      .filter(c => c.userId === user.uid && new Date(c.timestamp.toDate()).toDateString() === today);
  });

  // ✅ App-specific constants
  readonly totalPubs = computed(() => 800); // TODO: make configurable

  readonly isLoading = computed(() =>
    this.pubStore.loading() || this.checkinStore.loading()
  );

  // ✅ Consolidated debug information
  readonly debugInfo = computed(() => ({
    // Progression service data
    userStage: this.progression.userStage(),
    progressionStats: this.progression.progressionStats(),
    uiFlags: this.progression.uiFlags(),

    // HomeComponent specific data
    location: {
      closestPubDistance: this.closestPubDistanceKm(),
      nearbyPubsCount: this.nearestPubs().length,
      canCheckIn: this.canCheckInToClosestPub(),
      shouldShowWidget: this.shouldShowCheckInWidget(),
    },

    // App state
    todaysCheckins: this.todaysCheckins().length,
    isLoading: this.isLoading(),
    isProduction: this.isProduction,
  }));

  // ✅ User actions
  protected openProfileSettings(): void {
    console.log('[Home] Opening profile settings modal');

    const { componentRef, close } = this.overlayService.open(
      ProfileCustomizationModalComponent,
      {},
      { currentUser: this.authStore.user() }
    );

    componentRef.instance.closeModal = close;
  }

  protected upgradeToFullAccount(): void {
    console.log('[Home] Upgrading to full account');
    this.authStore.loginWithGoogle();
  }
}
