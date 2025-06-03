// src/app/shared/utils/dev-debug/dev-debug.component.ts
import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { JsonPipe, NgClass } from '@angular/common';
import { BaseComponent } from '../../data-access/base.component';
import { AuthStore } from '../../../auth/data-access/auth.store';
import { CheckinStore } from '../../../check-in/data-access/check-in.store';
import { PubStore } from '../../../pubs/data-access/pub.store';
import { NearbyPubStore } from '../../../pubs/data-access/nearby-pub.store';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-dev-debug',
  standalone: true,
  imports: [JsonPipe, NgClass],
  template: `
    <details class="debug-panel">
      <summary>
        🛠️ Signal Health
        <span [ngClass]="overallHealthClass()">{{ overallHealth() }}</span>
      </summary>

      <!-- Signal Health Matrix -->
      <div class="health-grid">
        <div class="health-item" [ngClass]="getHealthClass(authHealth())">
          <strong>Auth</strong>
          <span>{{ authHealth().status }}</span>
          <small>{{ authHealth().details }}</small>
        </div>

        <div class="health-item" [ngClass]="getHealthClass(pubHealth())">
          <strong>Pubs</strong>
          <span>{{ pubHealth().status }}</span>
          <small>{{ pubHealth().details }}</small>
        </div>

        <div class="health-item" [ngClass]="getHealthClass(locationHealth())">
          <strong>Location</strong>
          <span>{{ locationHealth().status }}</span>
          <small>{{ locationHealth().details }}</small>
        </div>

        <div class="health-item" [ngClass]="getHealthClass(checkinHealth())">
          <strong>Checkins</strong>
          <span>{{ checkinHealth().status }}</span>
          <small>{{ checkinHealth().details }}</small>
        </div>
      </div>

      <!-- Device Capabilities -->
      <div class="device-section">
        <h4>Device Reality Check</h4>
        <div class="device-grid">
          <span>Screen: {{ deviceInfo().screen }}</span>
          <span>Memory: {{ deviceInfo().memory }}</span>
          <span>Connection: {{ deviceInfo().connection }}</span>
          <span>Touch: {{ deviceInfo().touch ? '👆' : '🖱️' }}</span>
          <span>Battery: {{ deviceInfo().battery }}</span>
          <span>Platform: {{ deviceInfo().platform }}</span>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="actions">
        <button (click)="refreshAll()" [disabled]="refreshing()">
          {{ refreshing() ? '🔄' : '🔄' }} Refresh All
        </button>
        <button (click)="resetAuth()">🔐 Reset Auth</button>
        <button (click)="copyDiagnostics()">📋 Copy Diagnostics</button>
      </div>

      <!-- Raw Signal Values (Collapsed) -->
      <details class="raw-signals">
        <summary>Raw Signal Values</summary>
        <pre class="raw-data">{{ rawSignals() | json }}</pre>
      </details>
    </details>
  `,
  styles: [`
    .debug-panel {
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.9);
      color: #00ff00;
      padding: 12px;
      border-radius: 8px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      max-width: 400px;
      z-index: 9999;
      border: 1px solid #333;
    }

    .health-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin: 12px 0;
    }

    .health-item {
      padding: 8px;
      border-radius: 4px;
      border: 1px solid #333;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .health-item.healthy { background: rgba(0, 255, 0, 0.1); border-color: #0f0; }
    .health-item.warning { background: rgba(255, 255, 0, 0.1); border-color: #ff0; }
    .health-item.error { background: rgba(255, 0, 0, 0.1); border-color: #f00; }

    .health-item strong { font-size: 10px; opacity: 0.7; }
    .health-item span { font-weight: bold; }
    .health-item small { font-size: 9px; opacity: 0.6; }

    .device-section h4 { margin: 12px 0 6px; font-size: 11px; }
    .device-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px;
      font-size: 10px;
    }

    .actions {
      display: flex;
      gap: 8px;
      margin: 12px 0;
    }

    .actions button {
      background: #333;
      color: #0f0;
      border: 1px solid #555;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 10px;
      cursor: pointer;
    }

    .actions button:hover { background: #444; }
    .actions button:disabled { opacity: 0.5; cursor: not-allowed; }

    .raw-signals { margin-top: 12px; }
    .raw-data {
      font-size: 9px;
      max-height: 200px;
      overflow-y: auto;
      background: rgba(0, 0, 0, 0.5);
      padding: 8px;
      border-radius: 4px;
    }

    .overall-healthy { color: #0f0; }
    .overall-warning { color: #ff0; }
    .overall-error { color: #f00; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DevDebugComponent extends BaseComponent {
  private readonly _authStore = inject(AuthStore);
  private readonly _checkinStore = inject(CheckinStore);
  private readonly _pubStore = inject(PubStore);
  private readonly _nearbyPubStore = inject(NearbyPubStore);

  readonly refreshing = signal(false);

  // Health Checks
  readonly authHealth = computed(() => {
    const user = this._authStore.user();
    const token = this._authStore.token();
    const ready = this._authStore.ready();

    if (!ready) return { status: 'LOADING', details: 'Auth initializing...', level: 'warning' };
    if (!user || !token) return { status: 'OFFLINE', details: 'Not authenticated', level: 'error' };
    return { status: 'ONLINE', details: `${user.displayName || user.email}`, level: 'healthy' };
  });

  readonly pubHealth = computed(() => {
    const pubs = this._pubStore.pubs();
    const loading = this._pubStore.loading();
    const error = this._pubStore.error();

    if (loading) return { status: 'LOADING', details: 'Fetching pubs...', level: 'warning' };
    if (error) return { status: 'ERROR', details: error, level: 'error' };
    if (pubs.length === 0) return { status: 'EMPTY', details: 'No pubs loaded', level: 'warning' };
    return { status: 'LOADED', details: `${pubs.length} pubs`, level: 'healthy' };
  });

  readonly locationHealth = computed(() => {
    const location = this._nearbyPubStore.location();
    if (!location) return { status: 'NO_LOCATION', details: 'Location unavailable', level: 'error' };
    return {
      status: 'ACTIVE',
      details: `${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}`,
      level: 'healthy'
    };
  });

  readonly checkinHealth = computed(() => {
    const checkins = this._checkinStore.checkins();
    const loading = this._checkinStore.loading();
    const error = this._checkinStore.error();

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

  // Real Device Capabilities
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

  // Raw signal snapshot for diagnostics
  readonly rawSignals = computed(() => ({
    auth: {
      user: !!this._authStore.user(),
      token: !!this._authStore.token(),
      ready: this._authStore.ready()
    },
    pubs: {
      count: this._pubStore.pubs().length,
      loading: this._pubStore.loading(),
      error: this._pubStore.error()
    },
    location: this._nearbyPubStore.location(),
    checkins: {
      count: this._checkinStore.checkins().length,
      loading: this._checkinStore.loading()
    },
    device: this.deviceInfo(),
    env: {
      production: environment.production,
      timestamp: Date.now()
    }
  }));

  getHealthClass(health: any) {
    return {
      'healthy': health.level === 'healthy',
      'warning': health.level === 'warning',
      'error': health.level === 'error'
    };
  }

  async refreshAll(): Promise<void> {
    this.refreshing.set(true);
    try {
      const promises = [this._pubStore.load()];

      // Only load checkins if user is authenticated
      if (this._authStore.user()) {
        promises.push(this._checkinStore.load());
      }

      await Promise.all(promises);
    } finally {
      this.refreshing.set(false);
    }
  }

  resetAuth(): void {
    this._authStore.logout();
  }

  copyDiagnostics(): void {
    navigator.clipboard?.writeText(JSON.stringify(this.rawSignals(), null, 2));
  }
}


