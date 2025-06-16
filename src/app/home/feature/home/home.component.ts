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

      <!-- ✅ SIMPLIFIED: Just pass the user, WelcomeComponent handles the rest -->
      <app-welcome
        [user]="userStore.user()"
        (openSettings)="openProfileSettings()"
      />

      <!-- ✅ Check-in widget (show if there's a nearby pub) -->
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

      <!-- ✅ Badges section - using new unified BadgeStore -->
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
          <summary>🐛 Debug Info</summary>
          <div class="debug-content">
            <h4>🏆 BadgeStore State:</h4>
            <ul>
              <li>Definitions Loading: {{ badgeStore.definitionsLoading() }}</li>
              <li>Definitions Count: {{ badgeStore.definitions().length }}</li>
              <li>Earned Badges Loading: {{ badgeStore.loading() }}</li>
              <li>Earned Badge Count: {{ badgeStore.earnedBadgeCount() }}</li>
              <li>Recent For Display: {{ badgeStore.recentBadgesForDisplay().length }}</li>
              <li>Should Show Badges: {{ shouldShowBadges() }}</li>
            </ul>

            <h4>👤 UserStore Badge Summaries:</h4>
            <ul>
              <li>Badge Count: {{ userStore.badgeCount() }}</li>
              <li>Badge IDs: {{ userStore.badgeIds().join(', ') }}</li>
              <li>Has Badges: {{ userStore.hasBadges() }}</li>
            </ul>

            <h4>📍 NearbyPubStore State:</h4>
            <ul>
              <li>Has Location: {{ nearbyPubStore.location() ? 'Yes' : 'No' }}</li>
              <li>Nearby Pubs Count: {{ nearbyPubStore.nearbyPubsCount() }}</li>
              <li>Closest Pub: {{ nearbyPubStore.closestPub()?.name || 'None' }}</li>
              <li>Can Check In: {{ nearbyPubStore.canCheckIn() }}</li>
            </ul>

            <details>
              <summary>Raw NearbyPubStore Debug</summary>
              <pre>{{ nearbyPubStore.getDebugInfo() | json }}</pre>
            </details>

            <details>
              <summary>Raw BadgeStore Data</summary>
              <pre>{{ badgeStore.getDebugInfo() | json }}</pre>
            </details>
          </div>
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

  // ===================================
  // NEARBY PUBS COMPUTED PROPERTIES (using existing NearbyPubStore interface)
  // ===================================

  readonly closestPub = computed(() => {
    return this.nearbyPubStore.closestPub();
  });

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
