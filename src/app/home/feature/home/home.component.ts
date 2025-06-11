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

@Component({
  selector: 'app-home-three',
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

      <app-welcome
        [displayName]="authStore.displayName()"
        [avatarUrl]="authStore.avatarUrl()"
        [isAnonymous]="authStore.isAnonymous()"
        [isBrandNew]="isBrandNewUser()"
        [showWelcomeText]="shouldShowWelcomeText()"
        (changeUsername)="changeUsername()"
        (chooseAvatar)="chooseAvatar()"
        (upgradeAccount)="upgradeToFullAccount()"
      />

      <!-- ✅ Check-in widget (always show if there's a nearby pub) -->
      @if (closestPub()) {
        <app-check-in-homepage-widget
          [closestPub]="closestPub()!"
          [canCheckIn]="canCheckInToClosestPub()"
          [distanceKm]="closestPubDistanceKm()"
        />
      }

      <!-- ✅ Progress hero (always show) -->
      <app-pub-progress-hero
        [visitedCount]="visitedPubsCount()"
        [totalPubs]="totalPubs()"
        [hasProgress]="hasProgressData()"
      />

      <!-- ✅ Only show badges if user has earned any -->
      @if (shouldShowBadges()) {
        <app-earned-badge-list
          [earnedBadgesWithDefinitions]="badgeStore.recentBadgesForDisplay()"
          [maxItems]="3"
          size="small"
          [showEarnedDate]="true"
        />
      }

      <!-- ✅ Nearby pubs list -->
      @if (nearestPubs().length > 0) {
        <app-nearby-pub-list
          [pubs]="nearestPubs()"
          [userCheckins]="todaysCheckins()"
        />
      } @else if (shouldShowNearbyPubsEmptyState()) {
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

      <!-- ✅ Debug panel for development -->
      @if (!isProduction) {
        <details class="debug-panel">
          <summary>🐛 User Status Debug</summary>
          <pre>{{ userStatusDebug() | json }}</pre>
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

  // ✅ Environment
  readonly isProduction = false; // TODO: inject from environment

  constructor() {
    super();

    // ✅ Initialize stores that need loading
    this.badgeStore.loadOnce(); // Load badge definitions
    this.pubStore.loadOnce();   // Load pub data
    // UserStore loads automatically via auth effect
    // CheckinStore loads automatically via auth effect
  }

  // ✅ User Status Computed Properties
  readonly isBrandNewUser = computed(() => {
    const checkinCount = this.visitedPubsCount();
    const user = this.authStore.user();

    // Brand new if no check-ins and anonymous user
    return checkinCount === 0 && !!user?.isAnonymous; // ✅ Ensure boolean
  });

  readonly isNewUser = computed(() => {
    const checkinCount = this.visitedPubsCount();
    // New user if they have 0-2 check-ins
    return checkinCount <= 2;
  });

  readonly isRegularUser = computed(() => {
    const checkinCount = this.visitedPubsCount();
    // Regular user if they have 3+ check-ins
    return checkinCount >= 3;
  });

  readonly shouldShowWelcomeText = computed(() => {
    // Show "Welcome, {name}" for brand new users, otherwise just show name
    return this.isBrandNewUser(); // ✅ Already returns boolean
  });

  readonly shouldShowBadges = computed(() => {
    // Only show badges if user has earned some
    return this.badgeStore.hasBadges();
  });

  readonly shouldShowNearbyPubsEmptyState = computed(() => {
    // Only show empty state if user is not brand new (they understand the app)
    return !this.isBrandNewUser();
  });

  // ✅ Existing Computed Properties
  readonly visitedPubsCount = computed(() => {
    const checkins = this.checkinStore.checkins();
    const user = this.authStore.user();

    if (!user || !checkins.length) return 0;

    const userCheckins = checkins.filter(c => c.userId === user.uid);
    const uniquePubIds = new Set(userCheckins.map(c => c.pubId));
    return uniquePubIds.size;
  });

  readonly totalPubs = computed(() => 800); // TODO: make configurable

  readonly progressPercentage = computed(() => {
    const visited = this.visitedPubsCount();
    const total = this.totalPubs();
    return total === 0 ? 0 : Math.round((visited / total) * 100);
  });

  readonly closestPub = this.nearbyPubStore.closestPub;
  readonly nearestPubs = this.nearbyPubStore.nearbyPubs;

  readonly closestPubDistanceKm = computed(() => {
    const pub = this.closestPub();
    return pub ? (pub.distance / 1000).toFixed(1) : '0';
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

  readonly hasProgressData = computed(() => this.visitedPubsCount() > 0);

  readonly isLoading = computed(() =>
    this.pubStore.loading() || this.checkinStore.loading()
  );

  // ✅ Debug information
  readonly userStatusDebug = computed(() => ({
    visitedPubs: this.visitedPubsCount(),
    isBrandNew: this.isBrandNewUser(),
    isNew: this.isNewUser(),
    isRegular: this.isRegularUser(),
    shouldShowWelcome: this.shouldShowWelcomeText(),
    shouldShowBadges: this.shouldShowBadges(),
    badgeCount: this.badgeStore.badgeCount(),
    shouldShowEmptyState: this.shouldShowNearbyPubsEmptyState(),
    isAnonymous: this.authStore.user()?.isAnonymous,
    hasUser: !!this.authStore.user(),
  }));

  // ✅ User Actions
  changeUsername(): void {
    this.authStore.openUsernameModal();
  }

  chooseAvatar(): void {
    this.authStore.openAvatarSelector();
  }

  upgradeToFullAccount(): void {
    this.authStore.loginWithGoogle();
  }
}
