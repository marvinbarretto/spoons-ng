// src/app/pubs/feature/pub-detail/pub-detail.component.ts
import { CheckInStore } from '@/app/check-in/data-access/check-in.store';
import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import type { CheckIn } from '@app/check-in/utils/check-in.models';
import type { Landlord } from '@app/landlord/utils/landlord.model';
import { AuthStore } from '@auth/data-access/auth.store';
import { LocationService } from '@fourfold/angular-foundation';
import { BaseComponent } from '@shared/base/base.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { ButtonSize } from '@shared/ui/button/button.params';
import { generateRandomName } from '@shared/utils/anonymous-names';
import { calculateDistance } from '@shared/utils/location.utils';
import { UserStore } from '@users/data-access/user.store';
import { PubStore } from '../../data-access/pub.store';

@Component({
  selector: 'app-pub-detail',
  imports: [ButtonComponent], // JsonPipe removed - not used
  template: `
    <section class="pub-detail-page" [class.has-carpet]="pub()?.carpetUrl">
      @if (pub()?.carpetUrl) {
        <div class="page-background">
          <div class="carpet-bg">
            <img [src]="pub()!.carpetUrl" [alt]="pub()!.name + ' background'" />
          </div>
          <div class="bg-overlay"></div>
        </div>
      }
      @if (isDataLoading()) {
        <div class="loading-state">
          <div class="loading-skeleton">
            <div class="skeleton-header"></div>
            <div class="skeleton-content"></div>
            <div class="skeleton-actions"></div>
          </div>
        </div>
      } @else if (dataError()) {
        <div class="error-state">
          <p>❌ {{ dataError() }}</p>
          <app-button variant="secondary" (onClick)="retryLoad()">Try Again</app-button>
        </div>
      } @else if (!pubId() || !pub()) {
        <div class="not-found-state">
          <p>🍺 Pub not found</p>
          <app-button variant="secondary" (onClick)="goBack()">← Back to Pubs</app-button>
        </div>
      } @else {
        <!-- Header with Back Button -->
        <header class="pub-header">
          <app-button variant="ghost" [size]="ButtonSize.SMALL" (onClick)="goBack()"
            >← Back</app-button
          >

          <!-- Pub Hero Section -->
          <div class="pub-hero">
            @if (pub()!.carpetUrl) {
              <div class="carpet-image">
                <img [src]="pub()!.carpetUrl" [alt]="pub()!.name + ' carpet'" />
              </div>
            }
            <div class="pub-info">
              <h1>{{ pub()!.name }}</h1>
              <p class="pub-address">{{ pub()!.address }}</p>
              <div class="pub-location">
                <span class="location-icon">📍</span>
                <span>{{ pub()!.city }}, {{ pub()!.region }}</span>
              </div>
            </div>
          </div>
        </header>

        <!-- Quick Actions -->
        <div class="quick-actions">
          @if (canCheckIn()) {
            <app-button variant="primary" [size]="ButtonSize.LARGE" (onClick)="initiateCheckIn()">
              📸 Check In Here
            </app-button>
          } @else if (hasCheckedIn()) {
            <div class="status-badge status-badge--success">
              ✅ You've been here {{ userCheckins().length }} time{{
                userCheckins().length === 1 ? '' : 's'
              }}
            </div>
          } @else if (isNearby()) {
            <div class="status-badge status-badge--info" [class.distance-pulsing]="isMoving()">
              🚶 You're nearby ({{ distanceText() }})
            </div>
          } @else {
            <div class="status-badge status-badge--neutral" [class.distance-pulsing]="isMoving()">
              📍 {{ distanceText() }}
            </div>
          }
        </div>

        <!-- Main Content Sections -->
        <div class="content-sections">
          <!-- About Section -->
          <section class="content-section">
            <h2>About This Pub</h2>
            <div class="pub-details">
              <div class="detail-item">
                <span class="detail-label">Address</span>
                <span class="detail-value">{{ pub()!.address }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Location</span>
                <span class="detail-value"
                  >{{ pub()!.city }}, {{ pub()!.region }}, {{ pub()!.country }}</span
                >
              </div>
              @if (checkinStats()?.totalCheckins) {
                <div class="detail-item">
                  <span class="detail-label">Total Check-ins</span>
                  <span class="detail-value">{{ checkinStats()!.totalCheckins }}</span>
                </div>
              }
            </div>
          </section>

          <!-- Your Activity Section -->
          @if (user()) {
            <section class="content-section">
              <h2>Your Activity</h2>
              <div class="activity-summary">
                @if (hasCheckedIn()) {
                  <div class="activity-stat">
                    <span class="stat-number">{{ userCheckins().length }}</span>
                    <span class="stat-label"
                      >Check-in{{ userCheckins().length === 1 ? '' : 's' }}</span
                    >
                  </div>
                  @if (userCheckins().length > 0) {
                    <div class="last-visit">
                      <span class="visit-label">Last visit:</span>
                      <span class="visit-date">{{ formatDate(userCheckins()[0].timestamp) }}</span>
                    </div>
                  }
                } @else {
                  <div class="no-activity">
                    <p>You haven't checked in here yet!</p>
                    @if (canCheckIn()) {
                      <p class="encourage-checkin">You're close enough to check in now 📸</p>
                    }
                  </div>
                }
              </div>
            </section>
          }

          <!-- Landlord Section -->
          @if (pub()!.currentLandlord || pub()!.todayLandlord) {
            <section class="content-section">
              <h2>👑 Landlord</h2>
              <div class="landlord-info">
                @if (pub()!.currentLandlord) {
                  <div class="current-landlord">
                    <span class="landlord-label">Current Landlord:</span>
                    <span class="landlord-name">{{
                      getLandlordDisplayName(pub()!.currentLandlord!)
                    }}</span>
                  </div>
                }
                @if (pub()!.todayLandlord && pub()!.todayLandlord !== pub()!.currentLandlord) {
                  <div class="today-landlord">
                    <span class="landlord-label">Today's Landlord:</span>
                    <span class="landlord-name">{{
                      getLandlordDisplayName(pub()!.todayLandlord!)
                    }}</span>
                  </div>
                }
              </div>
            </section>
          }

          <!-- Recent Activity Section -->
          @if (recentCheckins().length > 0) {
            <section class="content-section">
              <h2>Recent Check-ins</h2>
              <div class="recent-checkins">
                @for (checkin of recentCheckins().slice(0, 5); track checkin.id) {
                  <div class="checkin-item">
                    <div class="checkin-user">
                      <span class="user-name">{{ getCheckinUserDisplayName(checkin) }}</span>
                    </div>
                    <div class="checkin-time">
                      {{ formatDate(checkin.timestamp) }}
                    </div>
                  </div>
                }
              </div>
            </section>
          }

          <!-- Statistics Section -->
          @if (checkinStats()) {
            <section class="content-section">
              <h2>📊 Statistics</h2>
              <div class="stats-grid">
                @if (checkinStats()!.totalCheckins) {
                  <div class="stat-card">
                    <span class="stat-number">{{ checkinStats()!.totalCheckins }}</span>
                    <span class="stat-label">Total Check-ins</span>
                  </div>
                }
                @if (checkinStats()!.longestStreak) {
                  <div class="stat-card">
                    <span class="stat-number">{{ checkinStats()!.longestStreak }}</span>
                    <span class="stat-label">Longest Streak</span>
                  </div>
                }
              </div>
            </section>
          }
        </div>
      }
    </section>
  `,
  styles: `
    .pub-detail-page {
      max-width: 800px;
      margin: 0 auto;
      padding: 0;
      background: var(--background);
      color: var(--text);
      min-height: 100vh;
      position: relative;
      overflow: hidden;
    }

    .pub-detail-page.has-carpet {
      background: transparent;
    }

    /* Page Background with Carpet */
    .page-background {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: -1;
      overflow: hidden;
    }

    .carpet-bg {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      opacity: 0.15;
      filter: blur(2px) saturate(0.7);
    }

    .carpet-bg img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scale(1.1);
    }

    .bg-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(
        180deg,
        var(--background) 0%,
        rgba(var(--background-rgb), 0.95) 10%,
        rgba(var(--background-rgb), 0.85) 50%,
        rgba(var(--background-rgb), 0.95) 90%,
        var(--background) 100%
      );
    }

    /* Loading States */
    .loading-state {
      padding: 2rem 1rem;
    }

    .loading-skeleton {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .skeleton-header,
    .skeleton-content,
    .skeleton-actions {
      background: var(--background-darkest);
      border-radius: 8px;
      animation: skeleton-pulse 1.5s ease-in-out infinite;
    }

    .skeleton-header {
      height: 200px;
    }

    .skeleton-content {
      height: 100px;
    }

    .skeleton-actions {
      height: 50px;
    }

    @keyframes skeleton-pulse {
      0%,
      100% {
        opacity: 1;
      }
      50% {
        opacity: 0.6;
      }
    }

    .error-state,
    .not-found-state {
      text-align: center;
      padding: 3rem 1rem;
      color: var(--text-secondary);
    }

    .error-state {
      color: var(--color-error);
    }

    /* Header */
    .pub-header {
      position: relative;
      margin-bottom: 1rem;
    }

    .back-btn,
    .retry-btn {
      position: absolute;
      top: 1rem;
      left: 1rem;
      z-index: 10;
      padding: 0.5rem 1rem;
      border: 1px solid var(--border);
      background: var(--background-darkest);
      color: var(--text);
      border-radius: 20px;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      font-family: inherit;
      backdrop-filter: blur(10px);
    }

    .back-btn:hover,
    .retry-btn:hover {
      background: var(--background-darkestElevated);
      border-color: var(--primary);
      color: var(--primary);
    }

    .pub-hero {
      position: relative;
      border-radius: 0 0 20px 20px;
      overflow: hidden;
      background: var(--background-darkest);
      min-height: 400px;
      margin-bottom: 2rem;
    }

    .has-carpet .pub-hero {
      min-height: 500px;
      background: transparent;
      backdrop-filter: blur(1px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    .carpet-image {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1;
    }

    .carpet-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      filter: saturate(1.2) contrast(1.1);
    }

    .pub-info {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 2;
      padding: 3rem 1.5rem 2rem;
      background: linear-gradient(
        transparent 0%,
        rgba(0, 0, 0, 0.4) 30%,
        rgba(0, 0, 0, 0.8) 70%,
        rgba(0, 0, 0, 0.95) 100%
      );
      color: white;
    }

    .has-carpet .pub-info {
      background: linear-gradient(
        transparent 0%,
        rgba(0, 0, 0, 0.3) 20%,
        rgba(0, 0, 0, 0.7) 60%,
        rgba(0, 0, 0, 0.9) 100%
      );
      backdrop-filter: blur(8px);
    }

    .pub-info h1 {
      font-size: 2rem;
      font-weight: 700;
      margin: 0 0 0.5rem;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
      color: white;
    }

    .has-carpet .pub-info h1 {
      font-size: 2.5rem;
      text-shadow:
        0 2px 4px rgba(0, 0, 0, 0.9),
        0 4px 16px rgba(0, 0, 0, 0.6);
    }

    .pub-address {
      font-size: 1rem;
      margin: 0 0 0.5rem;
      opacity: 0.9;
      text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7);
      color: rgba(255, 255, 255, 0.95);
    }

    .pub-location {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      opacity: 0.8;
      text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7);
      color: rgba(255, 255, 255, 0.9);
    }

    .location-icon {
      font-size: 1rem;
    }

    /* Actions */
    .quick-actions {
      margin: 1.5rem 1rem;
      display: flex;
      gap: 1rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .action-btn {
      padding: 0.875rem 1.5rem;
      border: none;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-family: inherit;
      font-size: 1rem;
    }

    .action-btn--primary {
      background: var(--primary);
      color: var(--primaryText);
      box-shadow: 0 2px 8px var(--shadow);
    }

    .action-btn--primary:hover {
      background: var(--primaryHover);
      transform: translateY(-2px);
      box-shadow: 0 4px 16px var(--shadow);
    }

    .status-badge {
      padding: 0.75rem 1.25rem;
      border-radius: 25px;
      font-size: 0.875rem;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      border: 1px solid var(--border);
      transition: all 0.2s ease;
    }

    .status-badge--success {
      background: var(--color-success);
      color: var(--color-successText);
      border-color: var(--color-success);
    }

    .status-badge--info {
      background: var(--color-info);
      color: var(--color-infoText);
      border-color: var(--color-info);
    }

    .status-badge--neutral {
      background: var(--background-darkestElevated);
      color: var(--text-secondary);
      border-color: var(--borderSecondary);
    }

    .distance-pulsing {
      animation: pulse 2s ease-in-out infinite;
    }

    /* Content Sections */
    .content-sections {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 0 1rem 2rem;
      position: relative;
      z-index: 1;
    }

    .content-section {
      background: var(--background-darkest);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 1.5rem;
      box-shadow: 0 2px 8px var(--shadow);
      transition: all 0.2s ease;
    }

    .has-carpet .content-section {
      background: rgba(var(--background-darkest-rgb, 18, 20, 23), 0.85);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    }

    .content-section:hover {
      box-shadow: 0 4px 16px var(--shadow);
    }

    .has-carpet .content-section:hover {
      background: rgba(var(--background-darkest-rgb, 18, 20, 23), 0.9);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      transform: translateY(-2px);
    }

    .content-section h2 {
      margin: 0 0 1rem;
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text);
    }

    /* Pub Details */
    .pub-details {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--border);
    }

    .detail-item:last-child {
      border-bottom: none;
    }

    .detail-label {
      font-weight: 500;
      color: var(--text-secondary);
    }

    .detail-value {
      font-weight: 600;
      color: var(--text);
      text-align: right;
    }

    /* Activity */
    .activity-summary {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .activity-stat {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .stat-number {
      font-size: 2rem;
      font-weight: 700;
      color: var(--primary);
    }

    .stat-label {
      font-size: 1rem;
      color: var(--text-secondary);
    }

    .last-visit {
      padding: 1rem;
      background: var(--background-darkestElevated);
      border-radius: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .visit-label {
      color: var(--text-secondary);
    }

    .visit-date {
      font-weight: 600;
      color: var(--text);
    }

    .no-activity {
      text-align: center;
      padding: 1rem;
      color: var(--text-secondary);
    }

    .encourage-checkin {
      color: var(--primary);
      font-weight: 500;
      margin-top: 0.5rem;
    }

    /* Landlord */
    .landlord-info {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .current-landlord,
    .today-landlord {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: var(--background-darkestElevated);
      border-radius: 12px;
    }

    .landlord-label {
      color: var(--text-secondary);
    }

    .landlord-name {
      font-weight: 600;
      color: var(--text);
    }

    /* Recent Check-ins */
    .recent-checkins {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .checkin-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: var(--background-darkestElevated);
      border-radius: 12px;
      transition: all 0.2s ease;
    }

    .checkin-item:hover {
      background: var(--background-darkest);
    }

    .user-name {
      font-weight: 500;
      color: var(--text);
    }

    .checkin-time {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    /* Statistics */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 1rem;
    }

    .stat-card {
      text-align: center;
      padding: 1.5rem 1rem;
      background: var(--background-darkestElevated);
      border-radius: 12px;
      transition: all 0.2s ease;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px var(--shadow);
    }

    .stat-card .stat-number {
      display: block;
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 0.25rem;
    }

    .stat-card .stat-label {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    /* Mobile Optimizations */
    @media (max-width: 768px) {
      .pub-detail-page {
        padding: 0;
      }

      .pub-hero {
        min-height: 250px;
      }

      .has-carpet .pub-hero {
        min-height: 350px;
      }

      .pub-info {
        padding: 1.5rem 1rem 1rem;
      }

      .pub-info h1 {
        font-size: 1.75rem;
      }

      .has-carpet .pub-info h1 {
        font-size: 2rem;
      }

      .quick-actions {
        flex-direction: column;
        align-items: stretch;
      }

      .action-btn,
      .status-badge {
        text-align: center;
        justify-content: center;
      }

      .content-sections {
        padding: 0 0.75rem 1.5rem;
      }

      .content-section {
        padding: 1.25rem;
      }

      .detail-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.25rem;
      }

      .detail-value {
        text-align: left;
      }
    }

    /* Focus states for accessibility */
    .back-btn:focus,
    .retry-btn:focus,
    .action-btn:focus {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
    }

    @keyframes pulse {
      0%,
      100% {
        opacity: 1;
      }
      50% {
        opacity: 0.6;
      }
    }
  `,
})
export class PubDetailComponent extends BaseComponent {
  // ✅ Store dependencies
  protected readonly pubStore = inject(PubStore);
  protected readonly checkinStore = inject(CheckInStore);
  protected readonly userStore = inject(UserStore);
  protected readonly authStore = inject(AuthStore);
  protected readonly locationService = inject(LocationService);
  protected override readonly router = inject(Router);
  protected readonly route = inject(ActivatedRoute);

  // ✅ Expose ButtonSize for template
  readonly ButtonSize = ButtonSize;

  // ✅ Route parameter from ActivatedRoute
  protected readonly pubId = computed(() => this.route.snapshot.paramMap.get('pubId') || '');

  // ✅ Computed pub data
  protected readonly pub = computed(() => {
    const id = this.pubId();
    if (!id) return null;
    return this.pubStore.pubs().find(p => p.id === id) || null;
  });

  protected readonly isDataLoading = computed(
    () => this.pubStore.loading() || this.checkinStore.loading()
  );

  protected readonly dataError = computed(() => this.pubStore.error() || this.checkinStore.error());

  // ✅ User and location data
  protected readonly user = this.userStore.user;
  protected readonly currentLocation = this.locationService.location;
  protected readonly isMoving = this.locationService.isMoving;

  // ✅ Distance calculations
  protected readonly distance = computed(() => {
    const pub = this.pub();
    const location = this.currentLocation();

    if (!pub || !location) return Infinity;

    return calculateDistance(location, {
      lat: pub.location.lat,
      lng: pub.location.lng,
    });
  });

  protected readonly distanceText = computed(() => {
    const dist = this.distance();
    if (dist === Infinity) return 'Distance unknown';

    if (dist < 1000) {
      return `${Math.round(dist)}m away`;
    }
    return `${(dist / 1000).toFixed(1)}km away`;
  });

  protected readonly isNearby = computed(() => {
    const dist = this.distance();
    return dist !== Infinity && dist <= 2000; // 2km
  });

  protected readonly canCheckIn = computed(() => {
    const dist = this.distance();
    return dist !== Infinity && dist <= 500 && !this.hasCheckedIn(); // 500m
  });

  // ✅ User activity data
  protected readonly userCheckins = computed(() => {
    const user = this.user();
    const pubId = this.pubId();

    if (!user) return [];

    return this.checkinStore
      .checkins()
      .filter((checkin: any) => checkin.userId === user.uid && checkin.pubId === pubId);
  });

  protected readonly hasCheckedIn = computed(() => this.userCheckins().length > 0);

  protected readonly recentCheckins = computed(() => {
    const pubId = this.pubId();
    return this.checkinStore
      .checkins()
      .filter((checkin: any) => checkin.pubId === pubId)
      .sort((a: any, b: any) => b.timestamp.seconds - a.timestamp.seconds)
      .slice(0, 10); // Latest 10 check-ins
  });

  // ✅ JSON data for display
  protected readonly pubBasicInfo = computed(() => {
    const pub = this.pub();
    if (!pub) return null;

    return {
      id: pub.id,
      name: pub.name,
      address: pub.address,
      city: pub.city,
      region: pub.region,
      country: pub.country,
      location: pub.location,
      carpetUrl: pub.carpetUrl,
    };
  });

  protected readonly locationData = computed(() => ({
    userLocation: this.currentLocation(),
    pubLocation: this.pub()?.location,
    distance: {
      meters: this.distance(),
      formatted: this.distanceText(),
      isNearby: this.isNearby(),
      canCheckIn: this.canCheckIn(),
    },
    locationPermission: {
      hasPermission: !!this.currentLocation(),
      timestamp: new Date().toISOString(),
    },
  }));

  protected readonly userActivityData = computed(() => {
    const user = this.user();
    const checkins = this.userCheckins();

    return {
      isLoggedIn: !!user,
      userId: user?.uid,
      userDisplayName: user?.displayName,
      hasCheckedIn: this.hasCheckedIn(),
      totalCheckins: checkins.length,
      firstCheckin: checkins.length > 0 ? checkins[checkins.length - 1] : null,
      lastCheckin: checkins.length > 0 ? checkins[0] : null,
      checkinHistory: checkins.map(c => ({
        id: c.id,
        timestamp: c.timestamp,
        // points: c.points // TODO: add points if available
      })),
    };
  });

  protected readonly checkinStats = computed(() => {
    const pub = this.pub();
    if (!pub) return null;

    return {
      totalCheckins: pub.checkinCount || 0,
      lastCheckinAt: pub.lastCheckinAt,
      recordEarlyCheckinAt: pub.recordEarlyCheckinAt,
      recordLatestCheckinAt: pub.recordLatestCheckinAt,
      longestStreak: pub.longestStreak,
    };
  });

  protected readonly landlordData = computed(() => {
    const pub = this.pub();
    if (!pub) return null;

    return {
      currentLandlord: pub.currentLandlord,
      todayLandlord: pub.todayLandlord,
      landlordHistory: pub.landlordHistory?.slice(0, 5), // Latest 5
    };
  });

  protected readonly authData = computed(() => {
    const user = this.authStore.user();

    return {
      isLoggedIn: !!user,
      isAnonymous: user?.isAnonymous,
      uid: user?.uid,
      email: user?.email,
      displayName: user?.displayName,
      emailVerified: user?.emailVerified,
      lastSignInTime: (user as any)?.metadata?.lastSignInTime,
      creationTime: (user as any)?.metadata?.creationTime,
    };
  });

  protected readonly storeStates = computed(() => ({
    pubStore: {
      loading: this.pubStore.loading(),
      error: this.pubStore.error(),
      totalPubs: this.pubStore.totalCount(),
      dataLoaded: this.pubStore.pubs().length > 0,
    },
    checkinStore: {
      loading: this.checkinStore.loading(),
      error: this.checkinStore.error(),
      totalCheckins: this.checkinStore.checkins().length,
      dataLoaded: this.checkinStore.checkins().length > 0,
    },
    userStore: {
      loading: this.userStore.loading(),
      error: this.userStore.error(),
      hasUser: !!this.userStore.user(),
      dataLoaded: !!this.userStore.user(),
    },
    locationService: {
      hasLocation: !!this.locationService.location(),
      lastUpdated: new Date().toISOString(),
      isWatching: false,
    },
  }));

  // ✅ Data loading
  protected override onInit(): void {
    this.pubStore.loadOnce();
    this.checkinStore.loadOnce();
  }

  // ✅ Actions
  retryLoad(): void {
    this.pubStore.loadOnce();
    this.checkinStore.loadOnce();
  }

  goBack(): void {
    this.router.navigate(['/pubs']);
  }

  initiateCheckIn(): void {
    const pubId = this.pubId();
    const user = this.user();

    if (!pubId) {
      console.error('No pub ID available for check-in');
      return;
    }

    if (!user) {
      console.error('User not authenticated for check-in');
      return;
    }

    // Navigate to the dedicated check-in page
    this.router.navigate(['/check-in', pubId]);
  }

  getLandlordDisplayName(landlord: Landlord): string {
    // For landlords, we only have the userId, so we need to generate a display name
    // TODO: In a real app, you'd want to resolve the userId to the actual user's display name
    return generateRandomName(landlord.userId);
  }

  getCheckinUserDisplayName(checkin: CheckIn): string {
    // For check-ins, we only have the userId, so we need to generate a display name
    // TODO: In a real app, you'd want to resolve the userId to the actual user's display name
    return generateRandomName(checkin.userId);
  }

  formatDate(timestamp: any): string {
    if (!timestamp) return 'Unknown';

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hour${Math.floor(diffInHours) === 1 ? '' : 's'} ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  }
}
