// src/app/pubs/feature/pub-detail/pub-detail.component.ts
import { CheckInStore } from '@/app/check-in/data-access/check-in.store';
import { GlobalCheckInStore } from '@/app/check-in/data-access/global-check-in.store';
import { Component, computed, inject, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import type { CheckIn } from '@app/check-in/utils/check-in.models';
import type { Landlord } from '@app/landlord/utils/landlord.model';
import { AuthStore } from '@auth/data-access/auth.store';
import { LocationService } from '@fourfold/angular-foundation';
import { BaseComponent } from '@shared/base/base.component';
import { DataAggregatorService } from '@shared/data-access/data-aggregator.service';
import { CacheCoherenceService } from '@shared/data-access/cache-coherence.service';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { ButtonSize } from '@shared/ui/button/button.params';
import { generateRandomName } from '@shared/utils/anonymous-names';
import { calculateDistance } from '@shared/utils/location.utils';
import { UserStore } from '@users/data-access/user.store';
import { MissionStore } from '@missions/data-access/mission.store';
import { PubStore } from '../../data-access/pub.store';

@Component({
  selector: 'app-pub-detail',
  imports: [ButtonComponent], // JsonPipe removed - not used
  template: `
    <main class="pub-detail-page" role="main">
      @if (isDataLoading()) {
        <div class="loading-state">
          <div class="loading-skeleton">
            <div class="skeleton-header"></div>
            <div class="skeleton-metrics"></div>
            <div class="skeleton-content"></div>
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
        <!-- Refined Carpet Display - Pure Visual Focus -->
        @if (simplifiedCarpetDisplay()) {
          <section class="refined-carpet-section">
            <div class="carpet-container">
              <img 
                [src]="simplifiedCarpetDisplay()!.carpetUrl" 
                [alt]="simplifiedCarpetDisplay()!.altText"
                class="carpet-image"
                loading="eager"
              />
            </div>
          </section>
        }

        <!-- Centered Header -->
        <header class="pub-header">
          <div class="pub-title-section">
            <h1 class="pub-name">{{ pub()!.name }}</h1>
            <p class="pub-location">{{ pub()!.city }}, {{ pub()!.region }}</p>
          </div>
        </header>


        <!-- Global Stats Section -->
        @if (pubAnalytics()) {
          <section class="section global-stats">
            <h2>Global Statistics</h2>
            
            <div class="analytics-grid">
              <div class="analytics-metric">
                <span class="analytics-number">{{ pubAnalytics()!.totalCheckins }}</span>
                <span class="analytics-label">TOTAL VISITS</span>
              </div>
              <div class="analytics-metric">
                <span class="analytics-number">{{ pubAnalytics()!.uniqueVisitors }}</span>
                <span class="analytics-label">UNIQUE VISITORS</span>
              </div>
              <div class="analytics-metric">
                <span class="analytics-number">{{ pubAnalytics()!.totalPointsGenerated }}</span>
                <span class="analytics-label">POINTS GENERATED</span>
              </div>
            </div>

            <!-- Active Missions -->
            @if (associatedMissions().length > 0) {
              <div class="missions-section">
                <h3>Active Missions</h3>
                <div class="missions-list">
                  @for (mission of associatedMissions(); track mission.id) {
                    <div class="mission-row">
                      <span class="mission-name">{{ mission.name }}</span>
                      @if (mission.pointsReward) {
                        <span class="mission-points">{{ mission.pointsReward }} pts</span>
                      }
                    </div>
                  }
                </div>
              </div>
            }
          </section>
        }

        <!-- User Stats Section -->
        @if (user() && userPubStats()) {
          <section class="section user-stats">
            <h2>Your Statistics</h2>
            
            <div class="analytics-grid">
              <div class="analytics-metric">
                <span class="analytics-number">{{ userPubStats()!.totalVisits }}</span>
                <span class="analytics-label">YOUR VISITS</span>
              </div>
              <div class="analytics-metric">
                <span class="analytics-number">{{ userPubStats()!.totalPointsEarned }}</span>
                <span class="analytics-label">POINTS EARNED</span>
              </div>
              @if (userPubStats()!.rankAmongVisitors) {
                <div class="analytics-metric" [class.highlight]="userPubStats()!.isTopVisitor">
                  <span class="analytics-number">#{{ userPubStats()!.rankAmongVisitors }}</span>
                  <span class="analytics-label">YOUR RANK</span>
                </div>
              }
            </div>

            @if (userPubStats()!.lastVisitDate) {
              <p class="last-visit-text">Last visit: {{ formatDate(userPubStats()!.lastVisitDate) }}</p>
            }
          </section>
        }
      }
    </main>
  `,
  styles: `
    /* ===== MOBILE-FIRST BASE STYLES ===== */
    
    .pub-detail-page {
      max-width: 640px;
      margin: 0 auto;
      background: var(--background);
      min-height: 100vh;
      
      /* Mobile-first approach - clean and simple */
      color: var(--text);
    }

    /* Complex backgrounds removed for performance */

    /* ===== LOADING STATES ===== */
    
    .loading-state {
      padding: 1.5rem 1rem;
    }

    .loading-skeleton {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .skeleton-header,
    .skeleton-metrics,
    .skeleton-content {
      background: var(--background-darker);
      border-radius: 8px;
      animation: skeleton-pulse 1.5s ease-in-out infinite;
    }

    .skeleton-header {
      height: 80px;
    }

    .skeleton-metrics {
      height: 120px;
    }

    .skeleton-content {
      height: 200px;
    }

    @keyframes skeleton-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    .error-state,
    .not-found-state {
      text-align: center;
      padding: 2rem 1rem;
      color: var(--text-secondary);
    }

    .error-state {
      color: var(--error);
    }

    /* ===== REFINED CARPET SECTION - ELEGANT SIMPLICITY ===== */
    
    .refined-carpet-section {
      padding: 2rem 1rem 0;
    }
    
    .carpet-container {
      max-width: 600px;
      margin: 0 auto;
    }
    
    .carpet-image {
      width: 100%;
      aspect-ratio: 4/3;
      object-fit: cover;
      object-position: center;
      border-radius: 6px;
      background: var(--background-darker);
    }


    /* ===== MOBILE-FIRST HEADER ===== */
    
    .pub-header {
      background: var(--background);
      border-bottom: 1px solid var(--border);
      padding: 1rem;
    }

    .header-controls {
      margin-bottom: 1rem;
    }

    .pub-title-section {
      text-align: center;
    }

    .pub-name {
      font-size: 1.75rem;
      font-weight: 600;
      color: var(--text);
      margin: 0 0 0.25rem;
      line-height: 1.2;
    }

    .pub-location {
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin: 0;
    }

    /* Complex hero section removed for simplification */

    /* ===== PRIMARY ACTION ===== */
    
    .primary-action {
      padding: 1rem;
      text-align: center;
    }

    .status-indicator {
      padding: 0.75rem 1.5rem;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .status-indicator.success {
      background: var(--success);
      color: var(--on-primary);
    }

    .status-indicator.neutral {
      background: var(--background-lighter);
      color: var(--text-secondary);
      border: 1px solid var(--border);
    }

    /* ===== REFINED STATS - SOPHISTICATED RESTRAINT ===== */
    
    .refined-stats-container {
      display: flex;
      justify-content: center;
      gap: 3rem;
      padding: 3rem 1rem 2rem;
      border-bottom: 1px solid var(--border);
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      min-width: 80px;
    }

    .stat-number {
      font-size: 2rem;
      font-weight: 300;
      color: var(--text);
      margin-bottom: 0.5rem;
      line-height: 1;
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--text-secondary);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    /* Mobile adjustments */
    @media (max-width: 480px) {
      .refined-stats-container {
        gap: 2rem;
        padding: 2rem 1rem 1.5rem;
      }
      
      .stat-number {
        font-size: 1.75rem;
      }
    }

    /* ===== CONTENT CONTAINER ===== */
    
    .content-container {
      padding: 0 1rem 2rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .section {
      background: var(--background-lighter);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.25rem;
    }

    .section h2,
    .section h3 {
      margin: 0 0 1rem;
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text);
    }

    .section h3 {
      font-size: 1rem;
    }



    /* ===== YOUR ACTIVITY ===== */
    
    .activity-summary {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .activity-stat {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .stat-number {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--primary);
    }

    .stat-label {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .last-visit-text {
      font-size: 0.8125rem;
      color: var(--text-muted);
      margin: 0;
    }

    /* ===== REFINED SECTIONS ===== */
    
    /* ===== SOPHISTICATED ANALYTICS GRID ===== */
    .analytics-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 3rem;
      margin-top: 2rem;
    }
    
    .analytics-metric {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    
    .analytics-number {
      font-size: 2.5rem;
      font-weight: 300; /* Light weight for sophisticated appearance */
      color: var(--text);
      line-height: 1;
      margin-bottom: 0.5rem;
    }
    
    .analytics-label {
      font-size: 0.75rem;
      color: var(--text-secondary);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em; /* Refined spacing */
    }
    
    /* Mobile responsive for analytics grid */
    @media (max-width: 480px) {
      .analytics-grid {
        gap: 2rem; /* Tighter spacing on mobile */
      }
      
      .analytics-number {
        font-size: 2rem; /* Smaller numbers on mobile */
      }
      
      .analytics-label {
        font-size: 0.7rem;
      }
    }
    
    /* ===== MISSIONS SECTION ===== */
    .missions-section {
      margin-top: 3rem;
    }
    
    .missions-section h3 {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text);
      margin: 0 0 1.5rem;
    }
    
    .missions-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .mission-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--border);
    }
    
    .mission-row:last-child {
      border-bottom: none;
    }
    
    .mission-name {
      font-size: 0.875rem;
      color: var(--text);
      font-weight: 500;
    }
    
    .mission-points {
      font-size: 0.75rem;
      color: var(--primary);
      font-weight: 600;
    }
    
    
    
    
    /* Enhanced Your Activity */
    .activity-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }
    
    .activity-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 1rem 0.75rem;
      border: 1px solid var(--border);
      border-radius: 6px;
      transition: all 0.2s ease;
    }
    
    .activity-stat.highlight {
      border-color: var(--accent);
      background: linear-gradient(135deg, var(--background-lighter), var(--background-lightest));
    }
    
    .stat-number {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 0.25rem;
    }
    
    .stat-label {
      font-size: 0.75rem;
      color: var(--text-secondary);
      font-weight: 500;
    }
    

    /* ===== TABLET+ ENHANCEMENTS (768px+) ===== */
    
    @media (min-width: 768px) {
      .pub-detail-page {
        max-width: 800px;
      }
      
      .pub-header {
        padding: 1.5rem;
      }
      
      .pub-name {
        font-size: 2rem;
      }
      
      .refined-stats-container {
        gap: 4rem;
        padding: 4rem 2rem 3rem;
      }
      
      .stat-number {
        font-size: 2.25rem;
      }
      
      .content-container {
        padding: 0 1.5rem 2rem;
      }
      
      .section {
        padding: 1.5rem;
      }
      
      
      .activity-grid {
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 1.5rem;
      }
      
      .activity-stat {
        padding: 1.25rem 1rem;
      }
      
      /* Sophisticated Analytics Grid - Tablet+ */
      .analytics-grid {
        gap: 4rem; /* More generous spacing on larger screens */
      }
      
      .analytics-number {
        font-size: 3rem; /* Larger numbers on tablet+ */
      }
      
      /* Refined Carpet Section - Tablet+ */
      .refined-carpet-section {
        padding: 3rem 2rem 0;
      }
      
      .carpet-container {
        max-width: 700px;
      }
      
    }

    /* ===== ACCESSIBILITY ===== */
    
    @media (prefers-reduced-motion: reduce) {
      .live-indicator,
      .metric-card {
        animation: none;
        transition: none;
      }
    }
    
    @media (prefers-contrast: high) {
      .section,
      .metric-card {
        border-width: 2px;
      }
    }
  `,
})
export class PubDetailComponent extends BaseComponent {
  // ✅ Store dependencies
  protected readonly pubStore = inject(PubStore);
  protected readonly checkinStore = inject(CheckInStore);
  protected readonly globalCheckInStore = inject(GlobalCheckInStore);
  protected readonly userStore = inject(UserStore);
  protected readonly authStore = inject(AuthStore);
  protected readonly locationService = inject(LocationService);
  protected readonly dataAggregator = inject(DataAggregatorService);
  protected readonly missionStore = inject(MissionStore);
  protected readonly cacheCoherence = inject(CacheCoherenceService);
  protected override readonly router = inject(Router);
  protected readonly route = inject(ActivatedRoute);

  // ✅ Expose ButtonSize for template
  readonly ButtonSize = ButtonSize;

  constructor() {
    super();
    
    // ✅ Listen for cache invalidation to refresh global statistics
    effect(() => {
      const invalidation = this.cacheCoherence.invalidations();
      if (invalidation && invalidation.collection === 'checkins') {
        console.log('[PubDetail] 🔄 Cache invalidated, global statistics will update automatically');
        console.log('[PubDetail] 🔄 Invalidation reason:', invalidation.reason);
        
        // The computed signals will automatically update when GlobalCheckInStore refreshes
        // No manual refresh needed - reactive patterns handle this automatically
      }
    });
  }

  // ✅ Route parameter from ActivatedRoute
  protected readonly pubId = computed(() => this.route.snapshot.paramMap.get('pubId') || '');

  // ✅ Computed pub data
  protected readonly pub = computed(() => {
    const id = this.pubId();
    if (!id) return null;
    return this.pubStore.pubs().find(p => p.id === id) || null;
  });

  protected readonly isDataLoading = computed(
    () => this.pubStore.loading() || this.checkinStore.loading() || this.globalCheckInStore.loading()
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

    return this.globalCheckInStore
      .allCheckIns()
      .filter((checkin: any) => checkin.userId === user.uid && checkin.pubId === pubId);
  });

  protected readonly hasCheckedIn = computed(() => this.userCheckins().length > 0);

  protected readonly recentCheckins = computed(() => {
    const pubId = this.pubId();
    return this.globalCheckInStore
      .allCheckIns()
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

  // ✅ REFINED STATS - Essential metrics only
  protected readonly refinedPubStats = computed(() => {
    const analytics = this.pubAnalytics();
    if (!analytics) return null;
    
    return {
      uniqueVisitors: analytics.uniqueVisitors,
      totalVisits: analytics.totalCheckins,
      activeMissions: this.activeMissionsCount()
    };
  });
  
  // ✅ Supporting metric calculations
  protected readonly totalUniqueUsers = computed(() => {
    const pubId = this.pubId();
    if (!pubId) return 0;
    
    const checkins = this.globalCheckInStore.getCheckInsForPub(pubId);
    
    const uniqueUserIds = new Set(
      checkins.map((checkin: any) => checkin.userId)
    );
    return uniqueUserIds.size;
  });

  protected readonly activeMissionsCount = computed(() => {
    const pubId = this.pubId();
    if (!pubId) return 0;
    
    // Get real missions from MissionStore that include this pub
    const missions = this.missionStore.missions();
    const relevantMissions = missions.filter(mission => 
      mission.pubIds.includes(pubId)
    );
    
    return relevantMissions.length;
  });

  protected readonly topVisitorCount = computed(() => {
    const visitors = this.topVisitors();
    return visitors.length > 0 ? visitors[0].visitCount : 0;
  });

  protected readonly topVisitors = computed(() => {
    const pubId = this.pubId();
    if (!pubId) return [];
    
    const checkins = this.globalCheckInStore.getCheckInsForPub(pubId);
    
    // Group by userId and count visits with enhanced data
    const visitorMap = new Map<string, { 
      userId: string; 
      visitCount: number; 
      lastVisit: any; 
      totalPointsEarned: number;
      firstVisit: any;
    }>();
    
    checkins.forEach((checkin: any) => {
      const existing = visitorMap.get(checkin.userId);
      const points = checkin.pointsEarned ?? checkin.pointsBreakdown?.total ?? 0;
      
      if (existing) {
        existing.visitCount++;
        existing.totalPointsEarned += points;
        if (checkin.timestamp.seconds > existing.lastVisit.seconds) {
          existing.lastVisit = checkin.timestamp;
        }
        if (checkin.timestamp.seconds < existing.firstVisit.seconds) {
          existing.firstVisit = checkin.timestamp;
        }
      } else {
        visitorMap.set(checkin.userId, {
          userId: checkin.userId,
          visitCount: 1,
          lastVisit: checkin.timestamp,
          firstVisit: checkin.timestamp,
          totalPointsEarned: points
        });
      }
    });
    
    // Convert to array and sort by visit count
    return Array.from(visitorMap.values())
      .sort((a, b) => {
        // Primary sort: visit count
        if (b.visitCount !== a.visitCount) return b.visitCount - a.visitCount;
        // Secondary sort: total points earned
        return b.totalPointsEarned - a.totalPointsEarned;
      })
      .map(visitor => ({
        id: visitor.userId,
        displayName: generateRandomName(visitor.userId),
        visitCount: visitor.visitCount,
        lastVisit: visitor.lastVisit,
        firstVisit: visitor.firstVisit,
        totalPointsEarned: visitor.totalPointsEarned,
        isRegular: visitor.visitCount >= 3
      }));
  });

  protected readonly associatedMissions = computed(() => {
    const pubId = this.pubId();
    if (!pubId) return [];
    
    // Get real missions from MissionStore that include this pub
    const missions = this.missionStore.missions();
    const relevantMissions = missions.filter(mission => 
      mission.pubIds.includes(pubId)
    );
    
    // Return missions with additional display properties
    return relevantMissions.map(mission => ({
      id: mission.id,
      name: mission.name,
      description: mission.description,
      difficulty: mission.difficulty,
      emoji: mission.emoji,
      category: mission.category,
      totalPubs: mission.pubIds.length,
      pointsReward: mission.pointsReward
    }));
  });

  protected readonly hasRecentActivity = computed(() => {
    const recentCheckins = this.recentCheckins();
    if (recentCheckins.length === 0) return false;
    
    const now = Date.now();
    const fiveMinutesAgo = now - (5 * 60 * 1000);
    
    return recentCheckins.some((checkin: any) => {
      const checkinTime = checkin.timestamp.seconds * 1000;
      return checkinTime > fiveMinutesAgo;
    });
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
    globalCheckInStore: {
      loading: this.globalCheckInStore.loading(),
      totalGlobalCheckins: this.globalCheckInStore.allCheckIns().length,
      dataLoaded: this.globalCheckInStore.allCheckIns().length > 0,
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

  // ✅ SIMPLIFIED CARPET DISPLAY - Pure visual focus
  protected readonly simplifiedCarpetDisplay = computed(() => {
    const pub = this.pub();
    if (!pub?.hasCarpet || !pub?.carpetUrl) return null;
    
    return {
      carpetUrl: pub.carpetUrl,
      altText: `${pub.name} carpet`
    };
  });


  // ✅ New analytics sections using DataAggregatorService
  protected readonly pubAnalytics = computed(() => {
    const pubId = this.pubId();
    const pub = this.pub();
    if (!pubId || !pub) return null;
    
    const checkins = this.globalCheckInStore.getCheckInsForPub(pubId);
    
    // Calculate visit patterns
    const visitsByDay = new Map<string, number>();
    const visitsByHour = new Map<number, number>();
    let totalPointsEarned = 0;
    
    checkins.forEach((checkin: any) => {
      const date = checkin.timestamp.toDate();
      const dayKey = date.toDateString();
      const hour = date.getHours();
      
      visitsByDay.set(dayKey, (visitsByDay.get(dayKey) || 0) + 1);
      visitsByHour.set(hour, (visitsByHour.get(hour) || 0) + 1);
      
      const points = checkin.pointsEarned ?? checkin.pointsBreakdown?.total ?? 0;
      totalPointsEarned += points;
    });
    
    // Find peak hour
    let peakHour = 0;
    let maxVisits = 0;
    visitsByHour.forEach((visits, hour) => {
      if (visits > maxVisits) {
        maxVisits = visits;
        peakHour = hour;
      }
    });
    
    // ✅ Refined to essential 3 metrics for sophisticated display
    return {
      totalCheckins: checkins.length,
      uniqueVisitors: this.totalUniqueUsers(),
      totalPointsGenerated: totalPointsEarned
    };
  });

  protected readonly userPubStats = computed(() => {
    const user = this.user();
    const pubId = this.pubId();
    if (!user || !pubId) return null;
    
    const userCheckins = this.userCheckins();
    const totalPoints = userCheckins.reduce((sum, checkin: any) => {
      const points = checkin.pointsEarned ?? checkin.pointsBreakdown?.total ?? 0;
      return sum + points;
    }, 0);
    
    // Calculate user's rank among all visitors
    const allVisitors = this.topVisitors();
    const userRank = allVisitors.findIndex(visitor => visitor.id === user.uid) + 1;
    
    return {
      totalVisits: userCheckins.length,
      totalPointsEarned: totalPoints,
      averagePointsPerVisit: userCheckins.length > 0 ? Math.round(totalPoints / userCheckins.length) : 0,
      rankAmongVisitors: userRank || null,
      isTopVisitor: userRank <= 5 && userRank > 0,
      firstVisitDate: userCheckins.length > 0 ? userCheckins[userCheckins.length - 1].timestamp : null,
      lastVisitDate: userCheckins.length > 0 ? userCheckins[0].timestamp : null,
      isRegular: userCheckins.length >= 3
    };
  });



  // ✅ Data loading
  protected override onInit(): void {
    this.pubStore.loadOnce();
    this.checkinStore.loadOnce(); // Load user-scoped check-in data for user features
    this.globalCheckInStore.loadFreshGlobalData(); // Load global check-in data for accurate statistics
    this.missionStore.loadOnce(); // Load mission data
  }

  // ✅ Actions
  retryLoad(): void {
    this.pubStore.loadOnce();
    this.checkinStore.loadOnce();
    this.globalCheckInStore.loadFreshGlobalData();
    this.missionStore.loadOnce();
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
