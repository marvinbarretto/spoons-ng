// src/app/home/feature/new-home/new-home.component.ts
import { Component, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../shared/data-access/base.component';

// Import all the stores
import { AuthStore } from '../../../auth/data-access/auth.store';
import { PubStore } from '../../../pubs/data-access/pub.store';
import { NearbyPubStore } from '../../../pubs/data-access/nearby-pub.store';
import { CheckinStore } from '../../../check-in/data-access/check-in.store';
import { LandlordStore } from '../../../landlord/data-access/landlord.store';
import { BadgeStore } from '../../../badges/data-access/badge.store';
import { UserStore } from '../../../users/data-access/user.store';

// Import store contract utilities
import {
  validateStoreContract,
  getStoreType,
  addDebugInfoToStore
} from '../../../shared/data-access/store.contracts';
import { generateAnonymousName } from '../../../shared/utils/anonymous-names';

@Component({
  selector: 'app-new-home',
  template: `
    <div class="new-home">
      <h1>🏠 New Home - Raw Data Display</h1>

      <div class="actions">
        <button (click)="onLoginAnonymous()" class="btn">Login Anonymous</button>
        <button (click)="onLoginGoogle()" class="btn">Login Google</button>
        <button (click)="onLogout()" class="btn">Logout</button>
        <button (click)="testUpdateDisplayName()" class="btn">Test Update Name</button>
        <button (click)="refreshAllData()" class="btn">Refresh All Data</button>
      </div>

      <div class="data-grid">

        <!-- AUTH STORE -->
        <div class="data-section">
          <h3>🔐 AuthStore</h3>
          <pre>{{ authData() | json }}</pre>
        </div>

        <!-- USER STORE -->
        <div class="data-section">
          <h3>👤 UserStore</h3>
          <pre>{{ userData() | json }}</pre>
        </div>

        <!-- PUB STORE -->
        <div class="data-section">
          <h3>🏪 PubStore</h3>
          <pre>{{ pubData() | json }}</pre>
        </div>

        <!-- NEARBY PUB STORE -->
        <div class="data-section">
          <h3>📍 NearbyPubStore</h3>
          <pre>{{ nearbyPubData() | json }}</pre>
        </div>

        <!-- CHECKIN STORE -->
        <div class="data-section">
          <h3>✅ CheckinStore</h3>
          <pre>{{ checkinData() | json }}</pre>
        </div>

        <!-- LANDLORD STORE -->
        <div class="data-section">
          <h3>🏠 LandlordStore</h3>
          <pre>{{ landlordData() | json }}</pre>
        </div>

        <!-- BADGE STORE -->
        <div class="data-section">
          <h3>🏆 BadgeStore</h3>
          <pre>{{ badgeData() | json }}</pre>
        </div>

        <!-- STORE TYPE VALIDATION -->
        <div class="data-section">
          <h3>🔍 Store Contract Validation</h3>
          <pre>{{ storeValidation() | json }}</pre>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .new-home {
      padding: 1rem;
      font-family: monospace;
    }

    .actions {
      margin: 1rem 0;
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .btn {
      padding: 0.5rem 1rem;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
    }

    .btn:hover {
      background: #0056b3;
    }

    .data-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 1rem;
      margin: 2rem 0;
    }

    .data-section {
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      padding: 1rem;
    }

    .data-section h3 {
      margin: 0 0 0.5rem 0;
      color: #495057;
      font-size: 1rem;
    }

    .data-section pre {
      background: white;
      border: 1px solid #ced4da;
      border-radius: 4px;
      padding: 0.75rem;
      margin: 0;
      font-size: 0.8rem;
      overflow-x: auto;
      max-height: 300px;
      overflow-y: auto;
    }

    .reactive-log {
      margin-top: 2rem;
      background: #343a40;
      color: white;
      border-radius: 6px;
      padding: 1rem;
    }

    .reactive-log h3 {
      margin: 0 0 1rem 0;
      color: #f8f9fa;
    }

    .log-entries {
      max-height: 200px;
      overflow-y: auto;
    }

    .log-entry {
      padding: 0.25rem 0;
      font-size: 0.8rem;
      border-bottom: 1px solid #495057;
      display: flex;
      gap: 0.5rem;
    }

    .log-index {
      color: #6c757d;
      min-width: 2rem;
      font-weight: bold;
    }

    .timestamp {
      color: #6c757d;
      margin-right: 1rem;
    }

    .message {
      color: #f8f9fa;
    }

    @media (max-width: 768px) {
      .data-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
  imports: [CommonModule],
})
export class NewHomeComponent extends BaseComponent {
  // ✅ STORE NAMING CONVENTIONS APPLIED:
  //
  // BaseStore Pattern (Collections):
  //   - pubStore.data() ✅
  //   - checkinStore.data() ✅
  //   - badgeStore.data() ✅
  //
  // Standalone Store Pattern (Single Entity):
  //   - authStore.user() ✅
  //   - userStore.user() ✅
  //
  // Computed Store Pattern (Derived):
  //   - nearbyPubStore.nearbyPubs() ✅ (not .data())
  //   - nearbyPubStore.closestPub() ✅
  //
  // Map Store Pattern (Key-Value):
  //   - landlordStore.todayLandlord() ✅ (not .data())
  //   - landlordStore.loadOnce(pubId) ✅ (requires pubId)

  // ✅ Inject ALL the stores
  protected readonly authStore = inject(AuthStore);
  protected readonly userStore = inject(UserStore);
  protected readonly pubStore = inject(PubStore);
  protected readonly nearbyPubStore = inject(NearbyPubStore);
  protected readonly checkinStore = inject(CheckinStore);
  protected readonly landlordStore = inject(LandlordStore);
  protected readonly badgeStore = inject(BadgeStore);

  readonly reactiveLog = computed(() => []);

  // ✅ Raw data from each store
  readonly authData = computed(() => {
    const user = this.authStore.user();
    const ready = this.authStore.ready();
    const isAuth = this.authStore.isAuthenticated();

    const data = {
      ready,
      isAuthenticated: isAuth,
      user: user,
      uid: this.authStore.uid(),
      displayName: this.authStore.displayName(),
      isAnonymous: this.authStore.isAnonymous(),
      token: this.authStore.token() ? '[TOKEN_PRESENT]' : null,
      authFlow: {
        step1_ready: ready,
        step2_hasUser: !!user,
        step3_hasToken: !!this.authStore.token(),
        step4_canLoadUserStores: ready && !!user,
      }
    };

    return data;
  });

  readonly userData = computed(() => {
    const user = this.userStore.user();
    const loading = this.userStore.loading();
    const error = this.userStore.error();

    const data = {
      loading,
      error,
      user: user,
      isLoaded: this.userStore.isLoaded(),
      hasLandlordPubs: this.userStore.hasLandlordPubs(),
    };

    return data;
  });

  readonly pubData = computed(() => {
    const pubs = this.pubStore.data();
    const loading = this.pubStore.loading();
    const error = this.pubStore.error();

    const data = {
      loading,
      error,
      pubCount: pubs.length,
      pubs: pubs.slice(0, 3), // First 3 for brevity
      allPubIds: pubs.map(p => p.id),
    };

    return data;
  });

  readonly nearbyPubData = computed(() => {
    const pubs = this.nearbyPubStore.nearbyPubs();
    const closestPub = this.nearbyPubStore.closestPub();

    const data = {
      loading: false, // Computed stores don't have loading state
      error: null,    // They derive from source stores
      nearbyCount: pubs.length,
      pubs: pubs.slice(0, 3),
      closestPub: closestPub,
      canCheckIn: this.nearbyPubStore.canCheckIn(),
    };

    return data;
  });

  readonly checkinData = computed(() => {
    const checkins = this.checkinStore.data();
    const loading = this.checkinStore.loading();
    const error = this.checkinStore.error();
    const user = this.authStore.user();

    const data = {
      loading,
      error,
      authStatus: user ? 'authenticated' : 'not authenticated',
      checkinCount: checkins.length,
      recentCheckins: checkins.slice(0, 3),
      // Show why it might not be loading
      canLoad: !!user,
    };

    return data;
  });

  readonly landlordData = computed(() => {
    const todayLandlords = this.landlordStore.todayLandlord();
    const loading = this.landlordStore.loading();
    const error = this.landlordStore.error();

    const data = {
      loading,
      error,
      landlordCount: this.landlordStore.landlordCount(),
      landlordPubIds: this.landlordStore.landlordPubIds(),
      sampleLandlords: Object.entries(todayLandlords).slice(0, 3).map(([pubId, landlord]) => ({
        pubId,
        landlord
      })),
    };

    return data;
  });

  readonly badgeData = computed(() => {
    const badges = this.badgeStore.badges();
    const loading = this.badgeStore.loading();
    const error = this.badgeStore.error();
    const user = this.authStore.user();

    const data = {
      loading,
      error,
      authStatus: user ? 'authenticated' : 'not authenticated',
      badgeCount: badges.length,
      badges: badges.slice(0, 3),
      // Show if this is user badges or badge definitions
      dataType: user ? 'user badges' : 'badge definitions',
    };

    return data;
  });

  readonly computedValues = computed(() => {
    const user = this.authStore.user();

    return {
      currentTime: new Date().toISOString(),
      hasUser: !!user,
      anonymousDisplayName: user ? generateAnonymousName(user.uid) : null,
      userStats: user ? {
        checkedInPubs: user.checkedInPubIds?.length || 0,
        claimedPubs: user.claimedPubIds?.length || 0,
        landlordOf: user.landlordOf?.length || 0,
        badges: user.badges?.length || 0,
        streaks: Object.keys(user.streaks || {}).length,
      } : null,
    };
  });

  // ✅ Store contract validation with safe debug info access
  readonly storeValidation = computed(() => {
    return {
      pubStore: {
        type: getStoreType(this.pubStore),
        isCollection: validateStoreContract(this.pubStore, 'collection'),
        debugInfo: this.getStoreDebugInfo(this.pubStore),
      },
      userStore: {
        type: getStoreType(this.userStore),
        isEntity: validateStoreContract(this.userStore, 'entity'),
        debugInfo: this.getStoreDebugInfo(this.userStore),
      },
      nearbyPubStore: {
        type: getStoreType(this.nearbyPubStore),
        isComputed: validateStoreContract(this.nearbyPubStore, 'computed'),
        debugInfo: 'Computed stores have no debug info',
      },
      landlordStore: {
        type: getStoreType(this.landlordStore),
        isMap: validateStoreContract(this.landlordStore, 'map'),
        debugInfo: this.getStoreDebugInfo(this.landlordStore),
      },
      checkinStore: {
        type: getStoreType(this.checkinStore),
        isCollection: validateStoreContract(this.checkinStore, 'collection'),
        debugInfo: this.getStoreDebugInfo(this.checkinStore),
      },
      badgeStore: {
        type: getStoreType(this.badgeStore),
        isCollection: validateStoreContract(this.badgeStore, 'collection'),
        debugInfo: this.getStoreDebugInfo(this.badgeStore),
      },
    };
  });

  constructor() {
    super();

    // ✅ Global effect to track ALL signal changes
    effect(() => {
      console.log('🔄 [NewHomeComponent] Global reactive effect triggered');
      console.log('  Auth ready:', this.authStore.ready());
      console.log('  Auth user:', this.authStore.user()?.uid);
      console.log('  User store:', this.userStore.user()?.uid);
      console.log('  Pub count:', this.pubStore.data().length);
      console.log('  Nearby count:', this.nearbyPubStore.nearbyPubs().length);
    });

    // ✅ Smart loading effect - wait for auth then load user-specific stores
    effect(() => {
      const authReady = this.authStore.ready();
      const user = this.authStore.user();

      if (authReady && user) {
        console.log(`[NewHomeComponent] Auth ready with user: ${user.uid} - loading user stores`);
        // Load user-specific stores now that we have authentication
        this.checkinStore.loadOnce();
        // BadgeStore might need user context - check if it's an AuthAwareStore
        if ('initialize' in this.badgeStore && typeof this.badgeStore.initialize === 'function') {
          this.badgeStore.initialize(user.uid);
        }
      } else if (authReady && !user) {
        console.log('[NewHomeComponent] Auth ready but no user - user stores will remain empty');
      }
    });
  }

  protected override onInit(): void {
    console.log('[NewHomeComponent] 🏠 Initialized');

    // ✅ Add debug info to stores that don't have it yet
    addDebugInfoToStore(this.landlordStore, {
      landlordCount: () => this.landlordStore.landlordCount?.() || 0,
      loadedPubs: () => Array.from(this.landlordStore['_loadedPubs']?.() || []),
    });

    addDebugInfoToStore(this.nearbyPubStore, {
      nearbyCount: () => this.nearbyPubStore.nearbyPubs?.().length || 0,
      closestPub: () => this.nearbyPubStore.closestPub?.()?.id || null,
    });

    // Load initial data
    this.refreshAllData();
  }

  // ✅ Action handlers
  onLoginAnonymous(): void {
    console.log('[NewHomeComponent] 🔐 Anonymous login requested');
    // The auth service should auto-login anonymously
    this.authStore.loginWithGoogle(); // This might trigger anonymous if Google fails
  }

  onLoginGoogle(): void {
    console.log('[NewHomeComponent] 🔐 Google login requested');
    this.authStore.loginWithGoogle();
  }

  onLogout(): void {
    console.log('[NewHomeComponent] 🚪 Logout requested');
    this.authStore.logout();
  }

  testUpdateDisplayName(): void {
    const user = this.authStore.user();
    if (!user) {
      console.log('[NewHomeComponent] Cannot update name - no user');
      return;
    }

    const newName = `Test Name ${Date.now()}`;
    console.log('[NewHomeComponent] 🧪 Testing display name update:', newName);

    this.authStore.updateDisplayName(newName).then(() => {
      console.log('[NewHomeComponent] Name updated successfully to:', newName);
    }).catch(err => {
      console.log('[NewHomeComponent] Name update failed:', err.message);
    });
  }

  refreshAllData(): void {
    console.log('[NewHomeComponent] 🔄 Refreshing all store data');

    // ✅ Always safe to load - no auth required
    this.pubStore.loadOnce();
    this.badgeStore.loadOnce(); // Badge definitions (not user badges)

    // ✅ Only load auth-dependent stores if user is authenticated
    const user = this.authStore.user();
    if (user) {
      console.log(`[NewHomeComponent] Loading user-specific data for: ${user.uid}`);
      this.checkinStore.loadOnce();
      // Note: LandlordStore.loadOnce() requires pubId - skip for now
      // Note: NearbyPubStore is computed - it auto-updates when PubStore or LocationService change
    } else {
      console.log('[NewHomeComponent] No authenticated user - skipping user-specific stores');
    }
  }

  // ✅ Helper method to safely get debug info from any store
  private getStoreDebugInfo(store: any): any {
    if (store && typeof store.getDebugInfo === 'function') {
      try {
        return store.getDebugInfo();
      } catch (error) {
        return { error: `Failed to get debug info: ${error}` };
      }
    }

    // Fallback debug info for stores without getDebugInfo()
    return {
      name: store.constructor?.name || 'Unknown Store',
      hasMethod: false,
      availableMethods: Object.getOwnPropertyNames(store).filter(prop =>
        typeof store[prop] === 'function'
      ).slice(0, 5), // First 5 methods
      note: 'This store does not implement getDebugInfo() yet'
    };
  }
}
