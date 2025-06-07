// src/app/home/feature/home/home.component.ts
import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NearbyPubStore } from '../../../pubs/data-access/nearby-pub.store';
import { CheckinStore } from '../../../check-in/data-access/check-in.store';
import { CheckInHomepageWidgetComponent } from '../../../check-in/ui/check-in-homepage-widget/check-in-homepage-widget.component';
import { UserBadgesComponent } from '../../../badges/ui/user-badges/user-badges.component';
import { BadgeStore } from '../../../badges/data-access/badge.store';
import { BaseComponent } from '../../../shared/data-access/base.component';
import { PubStore } from '../../../pubs/data-access/pub.store';
import { PubProgressHeroComponent } from '../../../home/ui/pub-progress-hero/pub-progress-hero.component';
import { AuthStore } from '../../../auth/data-access/auth.store';
import { ButtonComponent } from '../../../shared/ui/button/button.component';

@Component({
  selector: 'app-home',
  imports: [
    CommonModule,
    CheckInHomepageWidgetComponent,
    UserBadgesComponent,
    PubProgressHeroComponent,
    ButtonComponent
  ],
  template: `
    <div class="home-container">
      <!-- 🧪 Debug Panel (Development Only) -->
      <details class="auth-debug" *ngIf="!isProduction">
        <summary>Auth Debug</summary>
        <pre>{{ authDebug() | json }}</pre>
      </details>

      <!-- 👋 Welcome Section -->
      <section class="welcome">
        <h1>Welcome, {{ authStore.userDisplayName() }}!</h1>

        @if (authStore.isAnonymous()) {
          <div class="anonymous-actions">
            <p>Customize your pub crawling experience:</p>
            <div class="action-buttons">
              <app-button
                variant="secondary"
                (onClick)="changeUsername()"
                icon="edit"
              >
                Change Name
              </app-button>

              <app-button
                variant="secondary"
                (onClick)="chooseAvatar()"
                icon="person"
              >
                Choose Avatar
              </app-button>

              <app-button
                variant="primary"
                (onClick)="upgradeToFullAccount()"
                icon="upgrade"
              >
                Create Account
              </app-button>
            </div>
          </div>
        }
      </section>

      <!-- 🏆 HERO: Big imposing pub count -->
      <app-pub-progress-hero
        [visitedCount]="visitedPubsCount()"
        [totalPubs]="totalPubs()"
        [hasProgress]="hasProgressData()"
      />

      <!-- ✅ Check-in Widget -->
      @if (closestPub() && userCanCheckIn()) {
        <app-check-in-homepage-widget
          [closestPub]="closestPub()!"
        />
      } @else if (closestPub() && !userCanCheckIn()) {
        <div class="already-checked-in">
          <h3>{{ closestPub()!.name }}</h3>
          <p>✅ You've already checked in today!</p>
          <small>Distance: {{ (closestPub()!.distance / 1000).toFixed(1) }}km</small>
        </div>
      } @else {
        <div class="no-nearby-pubs">
          <h3>🕵️ No Nearby Pubs</h3>
          <p>No pubs found within range. Keep exploring!</p>
        </div>
      }

      <!-- 🍺 Nearby Pubs List -->
      @if (nearestPubs().length > 0) {
        <div class="nearby-pubs">
          <h2>📍 Nearby Pubs ({{ nearestPubs().length }})</h2>
          <ul class="pub-list">
            @for (pub of nearestPubs(); track pub.id) {
              <li class="pub-item">
                <div class="pub-info">
                  <h4>{{ pub.name }}</h4>
                  <small>{{ (pub.distance / 1000).toFixed(1) }}km away</small>
                </div>
                @if (checkinStore.hasCheckedInToday(pub.id)) {
                  <span class="checked-in-badge">✅ Visited today</span>
                }
              </li>
            }
          </ul>
        </div>
      }

      <!-- 🏅 User Badges -->
      @if (badgeStore && badgeStore.data().length > 0) {
        <app-user-badges [badges]="badgeStore.data" />
      }

      <!-- 🔄 Loading State -->
      @if (isLoading()) {
        <div class="loading-state">
          <p>🔄 Loading your pub data...</p>
        </div>
      }
    </div>
  `,
  styleUrl: './home.component.scss'
})
export class HomeComponent extends BaseComponent {
  // ✅ STORES ONLY - No direct service injection
  protected readonly authStore = inject(AuthStore);
  protected readonly checkinStore = inject(CheckinStore);
  protected readonly pubStore = inject(PubStore);
  protected readonly badgeStore = inject(BadgeStore);
  protected readonly nearbyPubStore = inject(NearbyPubStore);

  // ✅ Environment flag for debug panel
  readonly isProduction = false; // TODO: Replace with environment.production

  // ✅ Debug info for development
  readonly authDebug = computed(() => ({
    authReady: this.authStore.ready(),
    hasUser: !!this.authStore.user(),
    userId: this.authStore.user()?.uid,
    isAnonymous: this.authStore.user()?.isAnonymous,
    email: this.authStore.user()?.email,
    checkinCount: this.checkinStore.checkins().length,
    checkinStoreLoading: this.checkinStore.loading(),
  }));

  // ✅ Location & nearby pubs - delegate to stores
  readonly location = this.nearbyPubStore.location;
  readonly allPubs = this.nearbyPubStore.allPubs;
  readonly nearestPubs = this.nearbyPubStore.nearbyPubs;
  readonly closestPub = this.nearbyPubStore.closestPub;

  // ✅ Static total (will be configurable later)
  readonly totalPubs = computed(() => 800);

  /**
   * Count of unique pubs the user has visited
   */
  readonly visitedPubsCount = computed(() => {
    const checkins = this.checkinStore.checkins();
    const user = this.authStore.user();

    if (!user || !checkins.length) return 0;

    const userCheckins = checkins.filter(c => c.userId === user.uid);
    const uniquePubIds = new Set(userCheckins.map(c => c.pubId));

    return uniquePubIds.size;
  });

  /**
   * Progress percentage towards visiting all pubs
   */
  readonly progressPercentage = computed(() => {
    const visited = this.visitedPubsCount();
    const total = this.totalPubs();

    if (total === 0) return 0;
    return Math.round((visited / total) * 100);
  });

  /**
   * Check if user can check in to closest pub today
   */
  readonly userCanCheckIn = computed(() => {
    const pubId = this.closestPub()?.id ?? null;
    if (!pubId) return false;

    const isClose = this.nearbyPubStore.isWithinCheckInRange(pubId);
    const hasntCheckedInToday = this.checkinStore.canCheckInToday(pubId);

    return isClose && hasntCheckedInToday;
  });

  /**
   * Whether we have enough data to show meaningful stats
   */
  readonly hasProgressData = computed(() => this.visitedPubsCount() > 0);

  /**
   * Loading state - true if any critical data is still loading
   */
  readonly isLoading = computed(() =>
    this.pubStore.loading() || this.checkinStore.loading()
  );

  // ✅ USER ACTIONS - Delegate to AuthStore (no direct service calls)

  /**
   * Open username change modal - AuthStore handles overlay logic
   */
  changeUsername(): void {
    this.authStore.openUsernameModal();
  }

  /**
   * Open avatar selection modal - AuthStore handles overlay logic
   */
  chooseAvatar(): void {
    this.authStore.openAvatarSelector();
  }

  /**
   * Upgrade anonymous user to full account
   */
  upgradeToFullAccount(): void {
    this.authStore.loginWithGoogle();
  }
}
