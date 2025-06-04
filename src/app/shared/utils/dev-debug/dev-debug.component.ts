// src/app/shared/utils/dev-debug/dev-debug.component.ts
import { Component, computed, inject, signal } from '@angular/core';
import { JsonPipe, NgClass } from '@angular/common';
import { BaseComponent } from '../../data-access/base.component';
import { AuthStore } from '../../../auth/data-access/auth.store';
import { CheckinStore } from '../../../check-in/data-access/check-in.store';
import { PubStore } from '../../../pubs/data-access/pub.store';
import { NearbyPubStore } from '../../../pubs/data-access/nearby-pub.store';
import { LandlordStore } from '../../../landlord/data-access/landlord.store';
import { environment } from '../../../../environments/environment';
import { toDate, isToday } from '../timestamp.utils';

@Component({
  selector: 'app-dev-debug',
  imports: [JsonPipe, NgClass],
  templateUrl: './dev-debug.component.html',
  styleUrl: './dev-debug.component.scss',
})
export class DevDebugComponent extends BaseComponent {
  // Injected stores
  private readonly authStore = inject(AuthStore);
  private readonly checkinStore = inject(CheckinStore);
  protected readonly pubStore = inject(PubStore);
  protected readonly nearbyPubStore = inject(NearbyPubStore);
  private readonly landlordStore = inject(LandlordStore);

  // Component state
  readonly refreshing = signal(false);

  // Health Check Computed Signals
  readonly authHealth = computed(() => {
    const user = this.authStore.user();
    const token = this.authStore.token();
    const ready = this.authStore.ready();

    if (!ready) return { status: 'LOADING', details: 'Auth initializing...', level: 'warning' };
    if (!user || !token) return { status: 'OFFLINE', details: 'Not authenticated', level: 'error' };
    return { status: 'ONLINE', details: `${user.displayName || user.email}`, level: 'healthy' };
  });

  readonly pubHealth = computed(() => {
    const pubs = this.pubStore.pubs();
    const loading = this.pubStore.loading();
    const error = this.pubStore.error();

    if (loading) return { status: 'LOADING', details: 'Fetching pubs...', level: 'warning' };
    if (error) return { status: 'ERROR', details: error, level: 'error' };
    if (pubs.length === 0) return { status: 'EMPTY', details: 'No pubs loaded', level: 'warning' };
    return { status: 'LOADED', details: `${pubs.length} pubs`, level: 'healthy' };
  });

  readonly locationHealth = computed(() => {
    const location = this.nearbyPubStore.location();
    if (!location) return { status: 'NO_LOCATION', details: 'Location unavailable', level: 'error' };
    return {
      status: 'ACTIVE',
      details: `${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}`,
      level: 'healthy'
    };
  });

  readonly checkinHealth = computed(() => {
    const checkins = this.checkinStore.checkins();
    const loading = this.checkinStore.loading();
    const error = this.checkinStore.error();


    if (loading) return { status: 'LOADING', details: 'Loading checkins...', level: 'warning' };
    if (error) return { status: 'ERROR', details: error, level: 'error' };
    return {
      status: 'LOADED',
      details: `${checkins.length} checkins`,
      level: 'healthy'
    };
  });

  readonly overallHealth = computed(() => {
    const healths = [this.authHealth(), this.pubHealth(), this.locationHealth(), this.checkinHealth()];
    const errorCount = healths.filter(h => h.level === 'error').length;
    const warningCount = healths.filter(h => h.level === 'warning').length;

    if (errorCount > 0) return 'CRITICAL';
    if (warningCount > 0) return 'DEGRADED';
    return 'HEALTHY';
  });

  readonly overallHealthClass = computed(() => {
    const health = this.overallHealth();
    return {
      'overall-healthy': health === 'HEALTHY',
      'overall-warning': health === 'DEGRADED',
      'overall-error': health === 'CRITICAL'
    };
  });

  // Check-in Step-by-Step Diagnosis
  readonly checkinStep1 = computed(() => {
    const isAuth = this.authStore.isAuthenticated();
    const user = this.authStore.user();

    if (!isAuth || !user) {
      return {
        status: '❌ FAIL',
        details: 'Not authenticated',
        level: 'error' as const
      };
    }

    return {
      status: '✅ PASS',
      details: `User: ${user.uid.slice(0, 8)}...`,
      level: 'healthy' as const
    };
  });

  readonly checkinStep2 = computed(() => {
    const location = this.nearbyPubStore.location();
    // Note: You might need to expose locationService error through NearbyPubStore

    if (!location) {
      return {
        status: '⏳ LOADING',
        details: 'Requesting location...',
        level: 'warning' as const
      };
    }

    return {
      status: '✅ PASS',
      details: `${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}`,
      level: 'healthy' as const
    };
  });

  readonly checkinStep3 = computed(() => {
    const totalPubs = this.totalPubs();
    const nearbyPubs = this.nearbyPubsCount();
    const loading = this.pubStore.loading();
    const error = this.pubStore.error();

    if (loading) {
      return {
        status: '⏳ LOADING',
        details: 'Loading pubs...',
        level: 'warning' as const
      };
    }

    if (error) {
      return {
        status: '❌ FAIL',
        details: error,
        level: 'error' as const
      };
    }

    if (totalPubs === 0) {
      return {
        status: '❌ FAIL',
        details: 'No pubs loaded',
        level: 'error' as const
      };
    }

    return {
      status: '✅ PASS',
      details: `${totalPubs} total, ${nearbyPubs} nearby`,
      level: 'healthy' as const
    };
  });

  readonly checkinStep4 = computed(() => {
    const closestPub = this.closestPub();

    if (!closestPub) {
      return {
        status: '❌ FAIL',
        details: 'No nearby pubs within 50m',
        level: 'error' as const
      };
    }

    const distance = (closestPub as any).distance;
    const isWithinRange = distance <= 50;

    if (!isWithinRange) {
      return {
        status: '❌ FAIL',
        details: `${closestPub.name} is ${distance.toFixed(0)}m away (>50m)`,
        level: 'error' as const
      };
    }

    return {
      status: '✅ PASS',
      details: `${closestPub.name} is ${distance.toFixed(0)}m away`,
      level: 'healthy' as const
    };
  });

  readonly checkinStep5 = computed(() => {
    const closestPub = this.closestPub();

    if (!closestPub) {
      return {
        status: '❌ FAIL',
        details: 'No pub to check eligibility',
        level: 'error' as const
      };
    }

    const alreadyCheckedIn = this.checkinStore.hasCheckedInToday(closestPub.id);

    if (alreadyCheckedIn) {
      return {
        status: '❌ FAIL',
        details: 'Already checked in today',
        level: 'warning' as const
      };
    }

    return {
      status: '✅ PASS',
      details: 'Eligible to check in',
      level: 'healthy' as const
    };
  });

  readonly canCheckInFinal = computed(() => {
    const steps = [
      this.checkinStep1(),
      this.checkinStep2(),
      this.checkinStep3(),
      this.checkinStep4(),
      this.checkinStep5()
    ];

    return steps.every(step => step.status === '✅ PASS');
  });

  // Pub Data Computed Signals
  readonly totalPubs = computed(() => this.pubStore.pubs().length);
  readonly nearbyPubsCount = computed(() => this.nearbyPubStore.nearbyPubs().length);
  readonly closestPub = computed(() => this.nearbyPubStore.closestPub());
  readonly canCheckIn = computed(() => this.nearbyPubStore.canCheckIn());

  readonly visitedPubsCount = computed(() => {
    if (this.checkinStore.loading()) {
      console.log('[DevDebug] CheckinStore still loading...');
      return 0;
    }

    const checkins = this.checkinStore.checkins();
    const uniquePubIds = new Set(checkins.map(c => c.pubId));
    return uniquePubIds.size;
  });

  readonly landlordPubsCount = computed(() => {
    const user = this.authStore.user();
    if (!user) return 0;
    return user.landlordOf?.length || 0;
  });

  readonly todayCheckinsCount = computed(() => {
    return this.checkinStore.todayCheckins().length;
  });

  readonly latestCheckinPub = computed(() => {
    const checkins = this.checkinStore.checkins();
    if (checkins.length === 0) return null;

    const latest = checkins.sort((a, b) =>
      b.timestamp.toMillis() - a.timestamp.toMillis()
    )[0];

    const pub = this.pubStore.pubs().find(p => p.id === latest.pubId);
    return pub?.name || `Pub ID: ${latest.pubId}`;
  });

  readonly landlordToday = computed(() => {
    const user = this.authStore.user();
    if (!user) return [];

    const todayLandlords = this.landlordStore.todayLandlord();
    const userLandlordPubs: string[] = [];

    Object.entries(todayLandlords).forEach(([pubId, landlord]) => {
      try {
        if (landlord.userId === user.uid) {
          const claimDate = toDate(landlord.claimedAt);
          if (claimDate && isToday(claimDate)) {
            const pub = this.pubStore.pubs().find(p => p.id === pubId);
            userLandlordPubs.push(pub?.name || pubId);
          }
        }
      } catch (error) {
        console.warn('[DevDebug] Failed to process landlord:', landlord, error);
      }
    });

    return userLandlordPubs;
  });

  readonly deviceInfo = computed(() => {
    const nav = navigator as any;
    return {
      screen: `${screen.width}×${screen.height}`,
      memory: nav.deviceMemory ? `${nav.deviceMemory}GB` : 'Unknown',
      connection: nav.connection?.effectiveType || 'Unknown',
      touch: 'ontouchstart' in window,
      battery: nav.getBattery ? 'API Available' : 'Not Available',
      platform: nav.platform || nav.userAgentData?.platform || 'Unknown'
    };
  });

  readonly rawSignals = computed(() => ({
    auth: {
      user: !!this.authStore.user(),
      token: !!this.authStore.token(),
      ready: this.authStore.ready(),
      uid: this.authStore.user()?.uid
    },
    pubs: {
      total: this.totalPubs(),
      nearby: this.nearbyPubsCount(),
      visited: this.visitedPubsCount(),
      loading: this.pubStore.loading(),
      error: this.pubStore.error(),
      closestPub: this.closestPub()?.name,
      canCheckIn: this.canCheckIn()
    },
    location: this.nearbyPubStore.location(),
    checkins: {
      total: this.checkinStore.checkins().length,
      today: this.todayCheckinsCount(),
      latest: this.latestCheckinPub(),
      loading: this.checkinStore.loading()
    },
    landlord: {
      myPubs: this.landlordPubsCount(),
      todayPubs: this.landlordToday()
    },
    device: this.deviceInfo(),
    env: {
      production: environment.production,
      timestamp: Date.now()
    }
  }));

  // Helper Methods
  getHealthClass(health: any) {
    return {
      'healthy': health.level === 'healthy',
      'warning': health.level === 'warning',
      'error': health.level === 'error'
    };
  }

  getStepClass(step: any) {
    return {
      'step-pass': step.level === 'healthy',
      'step-warning': step.level === 'warning',
      'step-error': step.level === 'error'
    };
  }

  getFinalResultClass() {
    return {
      'final-pass': this.canCheckInFinal(),
      'final-fail': !this.canCheckInFinal()
    };
  }

  // Action Methods
  setTestLocationNearPub(): void {
    const pubs = this.pubStore.pubs();
    if (pubs.length > 0) {
      const testPub = pubs[0];
      const offset = 0.0001; // ~11 meters
      const nearbyLat = testPub.location.lat + offset;
      const nearbyLng = testPub.location.lng + offset;

      // You'll need to expose setMockLocation through NearbyPubStore or LocationService
      // For now, this is a placeholder
      console.log(`[DevDebug] Would set location near ${testPub.name}: ${nearbyLat}, ${nearbyLng}`);
      this.showInfo(`Mock: Set location near ${testPub.name}`);
    } else {
      this.showWarning('No pubs loaded to set location near');
    }
  }

  async refreshAll(): Promise<void> {
    this.refreshing.set(true);
    try {
      const promises = [this.pubStore.load()];

      if (this.authStore.user()) {
        promises.push(this.checkinStore.load());
      }

      await Promise.all(promises);
      this.showSuccess('All data refreshed!');
    } catch (error) {
      this.showError('Failed to refresh data');
    } finally {
      this.refreshing.set(false);
    }
  }

  resetAuth(): void {
    this.authStore.logout();
    this.showInfo('Auth reset - logged out');
  }

  resetPubs(): void {
    this.pubStore.reset();
    this.showInfo('Pub store reset');
  }

  resetCheckins(): void {
    this.checkinStore.reset();
    this.showInfo('Check-in store reset');
  }

  copyDiagnostics(): void {
    const diagnostics = {
      ...this.rawSignals(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };

    navigator.clipboard?.writeText(JSON.stringify(diagnostics, null, 2))
      .then(() => this.showSuccess('Diagnostics copied to clipboard'))
      .catch(() => this.showWarning('Failed to copy diagnostics'));
  }
}
