// src/app/pubs/feature/pub-detail/pub-detail.component.ts
import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { PubStore } from '../../data-access/pub.store';
import { NewCheckinStore } from '@new-checkin/data-access/new-checkin.store';
import { UserStore } from '@users/data-access/user.store';
import { AuthStore } from '@auth/data-access/auth.store';
import { LocationService } from '@shared/data-access/location.service';
import { BaseComponent } from '@shared/data-access/base.component';
import type { Pub } from '../../utils/pub.models';
import { calculateDistance } from '@shared/utils/location.utils';

@Component({
  selector: 'app-pub-detail',
  imports: [CommonModule],
  template: `
    <section class="pub-detail-page">
      @if (isDataLoading()) {
        <div class="loading-state">
          <p>🍺 Loading pub details...</p>
        </div>
      } @else if (dataError()) {
        <div class="error-state">
          <p>❌ {{ dataError() }}</p>
          <button (click)="retryLoad()" class="retry-btn">Try Again</button>
        </div>
      } @else if (!pubId() || !pub()) {
        <div class="not-found-state">
          <p>🍺 Pub not found</p>
          <button (click)="goBack()" class="back-btn">← Back to Pubs</button>
        </div>
      } @else {
        <!-- Header with Back Button -->
        <header class="pub-header">
          <button (click)="goBack()" class="back-btn">← Back to Pubs</button>
          <h1>{{ pub()!.name }}</h1>
          <p class="pub-address">{{ pub()!.address }}</p>
        </header>

        <!-- Quick Actions -->
        <div class="quick-actions">
          @if (canCheckIn()) {
            <button class="action-btn action-btn--primary">
              📍 Check In Here
            </button>
          } @else if (hasCheckedIn()) {
            <div class="status-badge status-badge--success">
              ✅ You've been here
            </div>
          } @else if (isNearby()) {
            <div class="status-badge status-badge--info">
              📍 You're nearby ({{ distanceText() }})
            </div>
          } @else {
            <div class="status-badge status-badge--neutral">
              📍 {{ distanceText() }}
            </div>
          }
        </div>

        <!-- Reactive Data Display -->
        <div class="data-sections">
          <!-- Basic Pub Info -->
          <section class="data-section">
            <h2>Pub Information</h2>
            <div class="json-display">
              <pre>{{ pubBasicInfo() | json }}</pre>
            </div>
          </section>

          <!-- Location Data -->
          <section class="data-section">
            <h2>Location & Distance</h2>
            <div class="json-display">
              <pre>{{ locationData() | json }}</pre>
            </div>
          </section>

          <!-- User-Specific Data -->
          <section class="data-section">
            <h2>Your Activity</h2>
            <div class="json-display">
              <pre>{{ userActivityData() | json }}</pre>
            </div>
          </section>

          <!-- Check-in Statistics -->
          <section class="data-section">
            <h2>Check-in Statistics</h2>
            <div class="json-display">
              <pre>{{ checkinStats() | json }}</pre>
            </div>
          </section>

          <!-- Landlord Information -->
          @if (pub()!.currentLandlord || pub()!.todayLandlord) {
            <section class="data-section">
              <h2>Landlord Information</h2>
              <div class="json-display">
                <pre>{{ landlordData() | json }}</pre>
              </div>
            </section>
          }

          <!-- Recent Check-ins -->
          @if (recentCheckins().length > 0) {
            <section class="data-section">
              <h2>Recent Check-ins ({{ recentCheckins().length }})</h2>
              <div class="json-display">
                <pre>{{ recentCheckins() | json }}</pre>
              </div>
            </section>
          }

          <!-- Authentication State -->
          <section class="data-section">
            <h2>Authentication State</h2>
            <div class="json-display">
              <pre>{{ authData() | json }}</pre>
            </div>
          </section>

          <!-- Store States -->
          <section class="data-section">
            <h2>Store States</h2>
            <div class="json-display">
              <pre>{{ storeStates() | json }}</pre>
            </div>
          </section>
        </div>
      }
    </section>
  `,
  styles: `
    .pub-detail-page {
      max-width: 1000px;
      margin: 0 auto;
      padding: 1rem;
      background: var(--color-background);
      color: var(--color-text);
      min-height: 100vh;
    }

    .loading-state,
    .error-state,
    .not-found-state {
      text-align: center;
      padding: 3rem 1rem;
      color: var(--color-textSecondary);
    }

    .error-state {
      color: var(--color-error);
    }

    .back-btn,
    .retry-btn {
      padding: 0.5rem 1rem;
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-text);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      font-family: inherit;
    }

    .back-btn:hover,
    .retry-btn:hover {
      background: var(--color-surfaceElevated);
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    .pub-header {
      margin-bottom: 2rem;
      padding: 1.5rem;
      background: var(--color-surface);
      border-radius: 12px;
      border: 1px solid var(--color-border);
    }

    .pub-header h1 {
      font-size: 2.5rem;
      font-weight: 700;
      margin: 1rem 0 0.5rem;
      color: var(--color-text);
    }

    .pub-address {
      font-size: 1.125rem;
      color: var(--color-textSecondary);
      margin: 0;
    }

    .quick-actions {
      margin-bottom: 2rem;
      display: flex;
      gap: 1rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .action-btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-family: inherit;
    }

    .action-btn--primary {
      background: var(--color-primary);
      color: var(--color-primaryText);
    }

    .action-btn--primary:hover {
      background: var(--color-primaryHover);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px var(--color-shadow);
    }

    .status-badge {
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      border: 1px solid var(--color-border);
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
      background: var(--color-surfaceElevated);
      color: var(--color-textSecondary);
      border-color: var(--color-borderSecondary);
    }

    .data-sections {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .data-section {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px var(--color-shadow);
    }

    .data-section h2 {
      background: var(--color-surfaceElevated);
      margin: 0;
      padding: 1rem;
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text);
      border-bottom: 1px solid var(--color-border);
    }

    .json-display {
      padding: 1rem;
      background: var(--color-surface);
    }

    .json-display pre {
      background: var(--color-background);
      border: 1px solid var(--color-borderSecondary);
      border-radius: 6px;
      padding: 1rem;
      overflow-x: auto;
      margin: 0;
      font-size: 0.875rem;
      line-height: 1.5;
      color: var(--color-textMuted);
      white-space: pre-wrap;
      word-break: break-word;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    }

    /* Mobile Optimizations */
    @media (max-width: 768px) {
      .pub-detail-page {
        padding: 0.5rem;
      }

      .pub-header {
        padding: 1rem;
        margin-bottom: 1.5rem;
      }

      .pub-header h1 {
        font-size: 2rem;
        margin: 0.5rem 0 0.25rem;
      }

      .quick-actions {
        flex-direction: column;
        align-items: stretch;
        gap: 0.75rem;
      }

      .action-btn,
      .status-badge {
        text-align: center;
        justify-content: center;
      }

      .data-sections {
        gap: 1.5rem;
      }

      .json-display {
        padding: 0.75rem;
      }

      .json-display pre {
        font-size: 0.75rem;
        padding: 0.75rem;
      }
    }

    /* Focus states for accessibility */
    .back-btn:focus,
    .retry-btn:focus,
    .action-btn:focus {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }

    /* Enhanced hover states */
    .data-section:hover {
      border-color: var(--color-primary);
      box-shadow: 0 4px 16px var(--color-shadow);
    }

    /* Loading animation */
    .loading-state p {
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `
})
export class PubDetailComponent extends BaseComponent {
  // ✅ Store dependencies
  private readonly pubStore = inject(PubStore);
  private readonly checkinStore = inject(NewCheckinStore);
  private readonly userStore = inject(UserStore);
  private readonly authStore = inject(AuthStore);
  private readonly locationService = inject(LocationService);
  protected override readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // ✅ Route parameter from ActivatedRoute
  protected readonly pubId = computed(() => this.route.snapshot.paramMap.get('pubId') || '');

  // ✅ Computed pub data
  protected readonly pub = computed(() => {
    const id = this.pubId();
    if (!id) return null;
    return this.pubStore.pubs().find(p => p.id === id) || null;
  });

  protected readonly isDataLoading = computed(() =>
    this.pubStore.loading() || this.checkinStore.loading()
  );

  protected readonly dataError = computed(() =>
    this.pubStore.error() || this.checkinStore.error()
  );

  // ✅ User and location data
  protected readonly user = this.userStore.user;
  protected readonly currentLocation = this.locationService.location;

  // ✅ Distance calculations
  protected readonly distance = computed(() => {
    const pub = this.pub();
    const location = this.currentLocation();

    if (!pub || !location) return Infinity;

    return calculateDistance(location, {
      lat: pub.location.lat,
      lng: pub.location.lng
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

    return this.checkinStore.checkins().filter(
      (checkin: any) => checkin.userId === user.uid && checkin.pubId === pubId
    );
  });

  protected readonly hasCheckedIn = computed(() => this.userCheckins().length > 0);

  protected readonly recentCheckins = computed(() => {
    const pubId = this.pubId();
    return this.checkinStore.checkins()
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
      carpetUrl: pub.carpetUrl
    };
  });

  protected readonly locationData = computed(() => ({
    userLocation: this.currentLocation(),
    pubLocation: this.pub()?.location,
    distance: {
      meters: this.distance(),
      formatted: this.distanceText(),
      isNearby: this.isNearby(),
      canCheckIn: this.canCheckIn()
    },
    locationPermission: {
      hasPermission: !!this.currentLocation(),
      timestamp: new Date().toISOString()
    }
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
      }))
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
      longestStreak: pub.longestStreak
    };
  });

  protected readonly landlordData = computed(() => {
    const pub = this.pub();
    if (!pub) return null;

    return {
      currentLandlord: pub.currentLandlord,
      todayLandlord: pub.todayLandlord,
      landlordHistory: pub.landlordHistory?.slice(0, 5) // Latest 5
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
      creationTime: (user as any)?.metadata?.creationTime
    };
  });

  protected readonly storeStates = computed(() => ({
    pubStore: {
      loading: this.pubStore.loading(),
      error: this.pubStore.error(),
      totalPubs: this.pubStore.totalCount(),
      dataLoaded: this.pubStore.pubs().length > 0
    },
    checkinStore: {
      loading: this.checkinStore.loading(),
      error: this.checkinStore.error(),
      totalCheckins: this.checkinStore.checkins().length,
      dataLoaded: this.checkinStore.checkins().length > 0
    },
    userStore: {
      loading: this.userStore.loading(),
      error: this.userStore.error(),
      hasUser: !!this.userStore.user(),
      dataLoaded: !!this.userStore.user()
    },
    locationService: {
      hasLocation: !!this.locationService.location(),
      lastUpdated: new Date().toISOString(),
      isWatching: false
    }
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
}
