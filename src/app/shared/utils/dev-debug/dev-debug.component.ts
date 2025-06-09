// src/app/shared/utils/dev-debug/dev-debug.component.ts
import { Component, computed, inject, signal } from '@angular/core';
import { JsonPipe, NgClass } from '@angular/common';
import { BaseComponent } from '../../data-access/base.component';

// Import all stores
import { AuthStore } from '../../../auth/data-access/auth.store';
import { CheckinStore } from '../../../check-in/data-access/check-in.store';
import { PubStore } from '../../../pubs/data-access/pub.store';
import { NearbyPubStore } from '../../../pubs/data-access/nearby-pub.store';
import { LandlordStore } from '../../../landlord/data-access/landlord.store';
import { BadgeStore } from '../../../badges/data-access/badge.store';
import { UserStore } from '../../../users/data-access/user.store';

// Import store validation
import {
  validateStoreContract,
  getStoreType,
  addDebugInfoToStore
} from '../../data-access/store.contracts';

@Component({
  selector: 'app-dev-debug',
  imports: [JsonPipe, NgClass],
  template: `
    <div class="dev-debug" [class.collapsed]="isCollapsed()">
      <!-- Collapse/Expand Toggle -->
      <button
        class="toggle-btn"
        (click)="toggleCollapsed()"
        [attr.aria-label]="isCollapsed() ? 'Expand debug panel' : 'Collapse debug panel'"
      >
        {{ isCollapsed() ? '🔍 Debug' : '❌ Hide' }}
      </button>

      <!-- Main Debug Content -->
      @if (!isCollapsed()) {
        <div class="debug-content">

          <!-- Quick Actions -->
          <div class="debug-section quick-actions">
            <h4>🚀 Quick Actions</h4>
            <div class="action-buttons">
              <button (click)="refreshStores()" class="action-btn">Refresh All</button>
              <button (click)="clearErrors()" class="action-btn">Clear Errors</button>
              <button (click)="toggleVerbose()" class="action-btn">
                {{ showVerbose() ? 'Simple' : 'Verbose' }}
              </button>
            </div>
          </div>

          <!-- Store Status Summary -->
          <div class="debug-section status-summary">
            <h4>📊 Store Status</h4>
            <div class="status-grid">
              @for (store of storeStatus(); track store.name) {
                <div class="status-item" [ngClass]="store.status">
                  <span class="store-name">{{ store.name }}</span>
                  <span class="store-status">{{ store.indicator }}</span>
                  <span class="store-count">{{ store.count }}</span>
                </div>
              }
            </div>
          </div>

          <!-- Auth Flow Debug -->
          <div class="debug-section auth-debug">
            <h4>🔐 Auth Flow</h4>
            <div class="auth-status">
              <div class="auth-step" [ngClass]="{ active: authStatus().ready }">
                1. Ready: {{ authStatus().ready ? '✅' : '⏳' }}
              </div>
              <div class="auth-step" [ngClass]="{ active: authStatus().hasUser }">
                2. User: {{ authStatus().hasUser ? '✅' : '❌' }}
              </div>
              <div class="auth-step" [ngClass]="{ active: authStatus().hasToken }">
                3. Token: {{ authStatus().hasToken ? '✅' : '❌' }}
              </div>
              <div class="auth-step" [ngClass]="{ active: authStatus().canLoadUserStores }">
                4. User Stores: {{ authStatus().canLoadUserStores ? '✅' : '❌' }}
              </div>
            </div>
            @if (authStatus().displayName) {
              <p class="current-user">{{ authStatus().displayName }}</p>
            }
          </div>

          <!-- Raw JSON Data (Expandable Sections) -->
          <div class="debug-section raw-data">
            <h4>📋 Raw Store Data</h4>

            <details class="data-details">
              <summary>🔐 AuthStore ({{ authData().ready ? 'Ready' : 'Loading' }})</summary>
              <pre>{{ authData() | json }}</pre>
            </details>

            @if (showVerbose()) {
              <details class="data-details">
                <summary>👤 UserStore ({{ userData().loading ? 'Loading' : userData().user ? 'Loaded' : 'Empty' }})</summary>
                <pre>{{ userData() | json }}</pre>
              </details>

              <details class="data-details">
                <summary>🏪 PubStore ({{ pubData().pubCount }} pubs)</summary>
                <pre>{{ pubData() | json }}</pre>
              </details>

              <details class="data-details">
                <summary>📍 NearbyPubStore ({{ nearbyPubData().nearbyCount }} nearby)</summary>
                <pre>{{ nearbyPubData() | json }}</pre>
              </details>

              <details class="data-details">
                <summary>✅ CheckinStore ({{ checkinData().checkinCount }} checkins)</summary>
                <pre>{{ checkinData() | json }}</pre>
              </details>

              <details class="data-details">
                <summary>👑 LandlordStore ({{ landlordData().landlordCount }} landlords)</summary>
                <pre>{{ landlordData() | json }}</pre>
              </details>

              <details class="data-details">
                <summary>🏆 BadgeStore ({{ badgeData().badgeCount }} badges)</summary>
                <pre>{{ badgeData() | json }}</pre>
              </details>

              <details class="data-details">
                <summary>🔍 Store Contracts</summary>
                <pre>{{ storeValidation() | json }}</pre>
              </details>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .dev-debug {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: #1a1a1a;
      color: #f0f0f0;
      border-top: 2px solid #333;
      font-family: 'Courier New', monospace;
      font-size: 0.75rem;
      z-index: 1000;
      max-height: 70vh;
      overflow-y: auto;
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
      transition: all 0.3s ease;
    }

    .dev-debug.collapsed {
      max-height: 40px;
    }

    .toggle-btn {
      position: absolute;
      top: 8px;
      right: 16px;
      background: #333;
      color: #f0f0f0;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 0.25rem 0.5rem;
      cursor: pointer;
      font-size: 0.7rem;
      font-weight: bold;
      z-index: 1001;
    }

    .toggle-btn:hover {
      background: #444;
    }

    .debug-content {
      padding: 1rem;
      padding-right: 100px; /* Space for toggle button */
    }

    .debug-section {
      margin-bottom: 1rem;
      padding: 0.5rem;
      background: #2a2a2a;
      border-radius: 4px;
      border-left: 3px solid #007bff;
    }

    .debug-section h4 {
      margin: 0 0 0.5rem 0;
      color: #00bcd4;
      font-size: 0.8rem;
    }

    /* Quick Actions */
    .action-buttons {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .action-btn {
      background: #007bff;
      color: white;
      border: none;
      border-radius: 3px;
      padding: 0.25rem 0.5rem;
      cursor: pointer;
      font-size: 0.7rem;
    }

    .action-btn:hover {
      background: #0056b3;
    }

    /* Status Grid */
    .status-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 0.5rem;
    }

    .status-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.25rem 0.5rem;
      background: #333;
      border-radius: 3px;
      font-size: 0.7rem;
    }

    .status-item.healthy { border-left: 3px solid #28a745; }
    .status-item.loading { border-left: 3px solid #ffc107; }
    .status-item.error { border-left: 3px solid #dc3545; }
    .status-item.empty { border-left: 3px solid #6c757d; }

    .store-name {
      font-weight: bold;
    }

    .store-status {
      font-size: 0.8rem;
    }

    .store-count {
      color: #aaa;
      font-size: 0.65rem;
    }

    /* Auth Flow */
    .auth-status {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .auth-step {
      padding: 0.25rem 0.5rem;
      background: #333;
      border-radius: 3px;
      opacity: 0.5;
      transition: opacity 0.2s;
      font-size: 0.7rem;
    }

    .auth-step.active {
      opacity: 1;
      background: #007bff;
    }

    .current-user {
      margin: 0.5rem 0 0 0;
      color: #00bcd4;
      font-weight: bold;
    }

    /* Raw Data */
    .data-details {
      margin-bottom: 0.5rem;
      background: #333;
      border-radius: 3px;
    }

    .data-details summary {
      padding: 0.5rem;
      cursor: pointer;
      font-weight: bold;
      color: #00bcd4;
      user-select: none;
    }

    .data-details summary:hover {
      background: #444;
    }

    .data-details pre {
      margin: 0;
      padding: 0.5rem;
      background: #1a1a1a;
      border-top: 1px solid #444;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 200px;
      overflow-y: auto;
      font-size: 0.65rem;
      line-height: 1.2;
    }

    /* Mobile responsiveness */
    @media (max-width: 768px) {
      .dev-debug {
        font-size: 0.7rem;
      }

      .debug-content {
        padding: 0.5rem;
        padding-right: 80px;
      }

      .status-grid {
        grid-template-columns: 1fr;
      }

      .auth-status {
        flex-direction: column;
        gap: 0.25rem;
      }
    }
  `],
})
export class DevDebugComponent extends BaseComponent {
  // Inject all stores
  protected readonly authStore = inject(AuthStore);
  protected readonly userStore = inject(UserStore);
  protected readonly pubStore = inject(PubStore);
  protected readonly nearbyPubStore = inject(NearbyPubStore);
  protected readonly checkinStore = inject(CheckinStore);
  protected readonly landlordStore = inject(LandlordStore);
  protected readonly badgeStore = inject(BadgeStore);

  // UI state
  readonly isCollapsed = signal(false);
  readonly showVerbose = signal(false);

  // Store data (copied from NewHomeComponent)
  readonly authData = computed(() => {
    const user = this.authStore.user();
    const ready = this.authStore.ready();

    return {
      ready,
      isAuthenticated: this.authStore.isAuthenticated(),
      user: user,
      uid: this.authStore.uid(),
      isAnonymous: this.authStore.isAnonymous(),
      userDisplayName: this.authStore.displayName(),
      token: this.authStore.token() ? '[TOKEN_PRESENT]' : null,
    };
  });

  readonly userData = computed(() => ({
    loading: this.userStore.loading(),
    error: this.userStore.error(),
    user: this.userStore.user(),
    isLoaded: this.userStore.isLoaded(),
  }));

  readonly pubData = computed(() => {
    const pubs = this.pubStore.data();
    return {
      loading: this.pubStore.loading(),
      error: this.pubStore.error(),
      pubCount: pubs.length,
      samplePubs: pubs.slice(0, 2).map(p => ({ id: p.id, name: p.name })),
    };
  });

  readonly nearbyPubData = computed(() => {
    const pubs = this.nearbyPubStore.nearbyPubs();
    return {
      nearbyCount: pubs.length,
      closestPub: this.nearbyPubStore.closestPub(),
      canCheckIn: this.nearbyPubStore.canCheckIn(),
    };
  });

  readonly checkinData = computed(() => {
    const checkins = this.checkinStore.data();
    return {
      loading: this.checkinStore.loading(),
      error: this.checkinStore.error(),
      checkinCount: checkins.length,
      canLoad: !!this.authStore.user(),
    };
  });

  readonly landlordData = computed(() => ({
    loading: this.landlordStore.loading(),
    error: this.landlordStore.error(),
    landlordCount: this.landlordStore.landlordCount(),
    landlordPubIds: this.landlordStore.landlordPubIds(),
  }));

  readonly badgeData = computed(() => {
    const badges = this.badgeStore.badges();
    return {
      loading: this.badgeStore.loading(),
      error: this.badgeStore.error(),
      badgeCount: badges.length,
    };
  });

  // Store validation
  readonly storeValidation = computed(() => ({
    pubStore: { type: getStoreType(this.pubStore), valid: validateStoreContract(this.pubStore, 'collection') },
    userStore: { type: getStoreType(this.userStore), valid: validateStoreContract(this.userStore, 'entity') },
    nearbyPubStore: { type: getStoreType(this.nearbyPubStore), valid: validateStoreContract(this.nearbyPubStore, 'computed') },
    landlordStore: { type: getStoreType(this.landlordStore), valid: validateStoreContract(this.landlordStore, 'map') },
  }));

  // Status summary for quick overview
  readonly storeStatus = computed(() => [
    {
      name: 'Auth',
      status: this.authStore.ready() ? (this.authStore.user() ? 'healthy' : 'empty') : 'loading',
      indicator: this.authStore.ready() ? (this.authStore.user() ? '✅' : '👤') : '⏳',
      count: this.authStore.user()?.uid?.slice(-4) || 'none'
    },
    {
      name: 'Pubs',
      status: this.pubStore.loading() ? 'loading' : (this.pubStore.data().length > 0 ? 'healthy' : 'empty'),
      indicator: this.pubStore.loading() ? '⏳' : (this.pubStore.data().length > 0 ? '✅' : '📭'),
      count: this.pubStore.data().length.toString()
    },
    {
      name: 'Nearby',
      status: this.nearbyPubStore.nearbyPubs().length > 0 ? 'healthy' : 'empty',
      indicator: this.nearbyPubStore.nearbyPubs().length > 0 ? '📍' : '🚫',
      count: this.nearbyPubStore.nearbyPubs().length.toString()
    },
    {
      name: 'Checkins',
      status: this.checkinStore.loading() ? 'loading' :
             this.checkinStore.error() ? 'error' :
             this.checkinStore.data().length > 0 ? 'healthy' : 'empty',
      indicator: this.checkinStore.loading() ? '⏳' :
                this.checkinStore.error() ? '❌' :
                this.checkinStore.data().length > 0 ? '✅' : '📭',
      count: this.checkinStore.data().length.toString()
    }
  ]);

  readonly authStatus = computed(() => {
    const ready = this.authStore.ready();
    const user = this.authStore.user();
    const token = this.authStore.token();

    return {
      ready,
      hasUser: !!user,
      hasToken: !!token,
      canLoadUserStores: ready && !!user,
      displayName: user ? this.authStore.displayName() : null,
    };
  });

  constructor() {
    super();

    // Add debug info to stores that don't have it
    this.onlyOnBrowser(() => {
      addDebugInfoToStore(this.landlordStore);
      addDebugInfoToStore(this.nearbyPubStore);
    });
  }

  // UI Actions
  toggleCollapsed(): void {
    this.isCollapsed.update(collapsed => !collapsed);
  }

  toggleVerbose(): void {
    this.showVerbose.update(verbose => !verbose);
  }

  refreshStores(): void {
    console.log('🔄 Refreshing all stores...');
    this.pubStore.loadOnce();
    if (this.authStore.user()) {
      this.checkinStore.loadOnce();
    }
  }

  clearErrors(): void {
    console.log('🧹 Clearing store errors...');
    [this.pubStore, this.checkinStore, this.badgeStore, this.landlordStore].forEach(store => {
      if ('clearError' in store && typeof store.clearError === 'function') {
        store.clearError();
      }
    });
  }
}
