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
import { Pub } from '../../../pubs/utils/pub.models';

@Component({
  selector: 'app-dev-debug',
  imports: [JsonPipe, NgClass],
  templateUrl: './dev-debug.component.html',
  styleUrl: './dev-debug.component.scss',
})
export class DevDebugComponent extends BaseComponent {
  // Injected stores
  protected readonly authStore = inject(AuthStore);
  protected readonly checkinStore = inject(CheckinStore);
  protected readonly pubStore = inject(PubStore);
  protected readonly nearbyPubStore = inject(NearbyPubStore);
  protected readonly landlordStore = inject(LandlordStore);

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
    const pubs = this.pubStore.data();
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

  readonly landlordHealth = computed(() => {
    const todayLandlords = this.landlordStore.todayLandlord();
    const loading = this.landlordStore.loading();
    const error = this.landlordStore.error();

    if (loading) return { status: 'LOADING', details: 'Loading landlords...', level: 'warning' as const };
    if (error) return { status: 'ERROR', details: error, level: 'error' as const };

    const totalPubs = Object.keys(todayLandlords).length;
    const activeLandlords = Object.values(todayLandlords).filter(l => l !== null).length;

    return {
      status: 'LOADED',
      details: `${activeLandlords}/${totalPubs} pubs have landlords`,
      level: 'healthy' as const
    };
  });

  readonly overallHealth = computed(() => {
    const healths = [
      this.authHealth(),
      this.pubHealth(),
      this.locationHealth(),
      this.checkinHealth(),
      this.landlordHealth()
    ];
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
    const isWithinRange = distance <= 50000;

    if (!isWithinRange) {
      return {
        status: '❌ FAIL',
        details: `${closestPub.name} is ${distance.toFixed(0)}m away (>50,000m)`,
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

  readonly checkinStep6 = computed(() => {
    const closestPub = this.closestPub();
    const user = this.authStore.user();

    if (!closestPub || !user) {
      return {
        status: '❌ FAIL',
        details: 'No pub or user for landlord check',
        level: 'error' as const
      };
    }

    const currentLandlord = this.landlordStore.getLandlordForPub(closestPub.id);

    if (!currentLandlord) {
      return {
        status: '👑 AVAILABLE',
        details: 'No landlord - you can claim it!',
        level: 'healthy' as const
      };
    }

    if (currentLandlord.userId === user.uid) {
      return {
        status: '👑 YOU ARE LANDLORD',
        details: 'You already rule this pub!',
        level: 'healthy' as const
      };
    }

    return {
      status: '👑 TAKEN',
      details: `${currentLandlord.userId.slice(0, 8)}... is landlord`,
      level: 'warning' as const
    };
  });

  readonly canCheckInFinal = computed(() => {
    const steps = [
      this.checkinStep1(),
      this.checkinStep2(),
      this.checkinStep3(),
      this.checkinStep4(),
      this.checkinStep5(),
      this.checkinStep6()
    ];

    return steps.every(step =>
      step.status.includes('✅ PASS') ||
      step.status.includes('👑 AVAILABLE') ||
      step.status.includes('👑 YOU ARE LANDLORD')
    );
  });

  // Pub Data Computed Signals
  readonly totalPubs = computed(() => this.pubStore.data().length);
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

    const pub = this.pubStore.data().find((p: Pub) => p.id === latest.pubId);
    return pub?.name || `Pub ID: ${latest.pubId}`;
  });

  readonly landlordToday = computed(() => {
    const user = this.authStore.user();
    if (!user) return [];

    const todayLandlords = this.landlordStore.todayLandlord();
    const userLandlordPubs: string[] = [];

    Object.entries(todayLandlords).forEach(([pubId, landlord]) => {
      try {
        if (landlord && landlord.userId === user.uid) {
          const claimDate = toDate(landlord.claimedAt);
          if (claimDate && isToday(claimDate)) {
            const pub = this.pubStore.data().find((p: Pub) => p.id === pubId);
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

  // Detailed landlord debugging data
  readonly landlordDebugData = computed(() => {
    const user = this.authStore.user();
    const todayLandlords = this.landlordStore.todayLandlord();
    const pubs = this.pubStore.data();

    if (!user) return {
      userLandlordPubs: [],
      totalLandlordPubs: 0,
      pubsWithLandlords: [],
      pubsWithoutLandlords: []
    };

    // Find pubs where current user is landlord
    const userLandlordPubs = Object.entries(todayLandlords)
      .filter(([_, landlord]) => landlord?.userId === user.uid)
      .map(([pubId, landlord]) => {
        const pub = pubs.find(p => p.id === pubId);
        return {
          pubId,
          pubName: pub?.name || 'Unknown',
          claimedAt: landlord?.claimedAt,
          dateKey: landlord?.dateKey
        };
      });

    // All pubs with landlords (any user)
    const pubsWithLandlords = Object.entries(todayLandlords)
      .filter(([_, landlord]) => landlord !== null)
      .map(([pubId, landlord]) => {
        const pub = pubs.find(p => p.id === pubId);
        return {
          pubId,
          pubName: pub?.name || 'Unknown',
          landlordUserId: landlord?.userId || 'Unknown',
          claimedAt: landlord?.claimedAt,
          isCurrentUser: landlord?.userId === user.uid
        };
      });

    // Pubs that have been checked but have no landlord
    const pubsWithoutLandlords = Object.entries(todayLandlords)
      .filter(([_, landlord]) => landlord === null)
      .map(([pubId]) => {
        const pub = pubs.find((p: Pub) => p.id === pubId);
        return {
          pubId,
          pubName: pub?.name || 'Unknown'
        };
      });

    return {
      userLandlordPubs,
      totalLandlordPubs: Object.keys(todayLandlords).length,
      pubsWithLandlords,
      pubsWithoutLandlords,
      allLandlordsRaw: todayLandlords
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
      myPubs: this.landlordDebugData().userLandlordPubs.length,
      myPubNames: this.landlordDebugData().userLandlordPubs.map(p => p.pubName),
      totalChecked: this.landlordDebugData().totalLandlordPubs,
      pubsWithLandlords: this.landlordDebugData().pubsWithLandlords.length,
      pubsWithoutLandlords: this.landlordDebugData().pubsWithoutLandlords.length,
      loading: this.landlordStore.loading(),
      error: this.landlordStore.error(),
      closestPubLandlord: this.closestPub() ? this.landlordStore.getLandlordForPub(this.closestPub()!.id)?.userId : null
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
    const pubs = this.pubStore.data();
    if (pubs.length > 0) {
      const testPub = pubs[0];
      const offset = 0.0001; // ~11 meters
      const nearbyLat = testPub.location.lat + offset;
      const nearbyLng = testPub.location.lng + offset;

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

  async refreshLandlords(): Promise<void> {
    const pubs = this.pubStore.data();
    if (pubs.length === 0) {
      this.showWarning('No pubs loaded to refresh landlords for');
      return;
    }

    this.landlordStore.reset();

    try {
      // Load landlord data for first 5 pubs (to avoid overwhelming)
      const pubsToCheck = pubs.slice(0, 5);
      const promises = pubsToCheck.map(pub => this.landlordStore.loadLandlordOnce(pub.id));
      await Promise.all(promises);

      this.showSuccess(`Refreshed landlord data for ${pubsToCheck.length} pubs`);
    } catch (error) {
      this.showError('Failed to refresh landlord data');
    }
  }

  loadLandlordForClosestPub(): void {
    const closestPub = this.closestPub();
    if (!closestPub) {
      this.showWarning('No closest pub to load landlord for');
      return;
    }

    this.landlordStore.loadLandlordOnce(closestPub.id);
    this.showInfo(`Loading landlord data for ${closestPub.name}`);
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
