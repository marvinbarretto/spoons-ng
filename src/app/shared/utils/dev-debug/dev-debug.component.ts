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
import { CleanupResult, CleanupService } from '../cleanup.service';

// Import store validation
import {
  validateStoreContract,
  getStoreType,
  addDebugInfoToStore
} from '../../data-access/store.contracts';


@Component({
  imports: [JsonPipe],
  selector: 'app-dev-debug',
  template: `
    <div class="dev-debug">
      <!-- Header with toggle -->
      <div class="header" (click)="toggleExpanded()">
        <h2>🛠️ Dev Debug</h2>
        <span class="toggle">{{ isExpanded() ? '▼' : '▶' }}</span>
      </div>

      @if (isExpanded()) {
        <!-- Quick Status Summary -->
        <div class="status-grid">
          @for (status of storeStatus(); track status.name) {
            <div class="status-item" [attr.data-status]="status.status">
              <span class="indicator">{{ status.indicator }}</span>
              <span class="name">{{ status.name }}</span>
              <span class="count">{{ status.count }}</span>
            </div>
          }
        </div>

        <!-- Actions -->
        <div class="actions">
          <button (click)="refreshStores()" class="btn">🔄 Refresh Stores</button>
          <button (click)="clearErrors()" class="btn">🧹 Clear Errors</button>
          <button (click)="toggleVerbose()" class="btn">
            {{ showVerbose() ? '📋 Hide Details' : '📊 Show Details' }}
          </button>
        </div>

        <!-- Cleanup Section -->
        <div class="cleanup-section">
          <h3>🗑️ Test Data Cleanup</h3>

          <!-- Collection Counts -->
          <div class="counts">
            <div class="count-item">
              <span>Users:</span>
              <strong>{{ counts().users }}</strong>
            </div>
            <div class="count-item">
              <span>Check-ins:</span>
              <strong>{{ counts().checkIns }}</strong>
            </div>
            <div class="count-item">
              <span>Pubs:</span>
              <strong>{{ counts().pubs }}</strong>
            </div>
            <button (click)="refreshCounts()" class="btn-small">🔄</button>
          </div>

          <!-- Cleanup Actions -->
          <div class="cleanup-actions">
            <button
              (click)="clearUsers()"
              [disabled]="cleanupLoading()"
              class="btn-danger">
              Clear Users ({{ counts().users }})
            </button>

            <button
              (click)="clearCheckIns()"
              [disabled]="cleanupLoading()"
              class="btn-danger">
              Clear Check-ins ({{ counts().checkIns }})
            </button>

            <button
              (click)="clearAll()"
              [disabled]="cleanupLoading()"
              class="btn-danger-big">
              💥 Clear ALL Test Data
            </button>
          </div>

          <!-- Cleanup Status -->
          @if (cleanupLoading()) {
            <div class="status loading">🔄 Cleaning up...</div>
          }

          @if (lastCleanupResult()) {
            <div class="status" [class.success]="lastCleanupResult()?.success" [class.error]="!lastCleanupResult()?.success">
              @if (lastCleanupResult()?.success) {
                ✅ Deleted {{ lastCleanupResult()?.deletedCount }} items
              } @else {
                ❌ {{ lastCleanupResult()?.error }}
              }
            </div>
          }

          <!-- Warning -->
          <div class="warning">
            ⚠️ <strong>Development Only:</strong> Permanently deletes Firestore data.
            Pub data unaffected.
          </div>
        </div>

        <!-- Verbose Details -->
        @if (showVerbose()) {
          <div class="verbose-section">
            <div class="detail-grid">
              <div class="detail-item">
                <h4>🔐 Auth</h4>
                <pre>{{ authData() | json }}</pre>
              </div>

              <div class="detail-item">
                <h4>👤 User</h4>
                <pre>{{ userData() | json }}</pre>
              </div>

              <div class="detail-item">
                <h4>🏪 Pubs</h4>
                <pre>{{ pubData() | json }}</pre>
              </div>

              <div class="detail-item">
                <h4>✅ Check-ins</h4>
                <pre>{{ checkinData() | json }}</pre>
              </div>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .dev-debug {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #f8f9fa;
      border: 2px solid #6c757d;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-family: monospace;
      font-size: 12px;
      z-index: 1000;
      max-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
    }

    .header {
      background: #6c757d;
      color: white;
      padding: 8px 12px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      user-select: none;
    }

    .header h2 {
      margin: 0;
      font-size: 14px;
    }

    .toggle {
      font-size: 12px;
    }

    .status-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 4px;
      padding: 8px;
      background: #e9ecef;
    }

    .status-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 4px;
      border-radius: 4px;
      background: white;
    }

    .status-item[data-status="loading"] { background: #fff3cd; }
    .status-item[data-status="error"] { background: #f8d7da; }
    .status-item[data-status="healthy"] { background: #d4edda; }
    .status-item[data-status="empty"] { background: #e2e3e5; }

    .indicator {
      font-size: 16px;
      margin-bottom: 2px;
    }

    .name {
      font-size: 10px;
      font-weight: bold;
    }

    .count {
      font-size: 9px;
      color: #6c757d;
    }

    .actions {
      display: flex;
      gap: 4px;
      padding: 8px;
      flex-wrap: wrap;
    }

    .btn {
      background: #007bff;
      color: white;
      border: none;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 10px;
    }

    .btn:hover { background: #0056b3; }

    .cleanup-section {
      border-top: 1px solid #dee2e6;
      padding: 8px;
      background: #fff5f5;
    }

    .cleanup-section h3 {
      margin: 0 0 8px 0;
      font-size: 12px;
      color: #721c24;
    }

    .counts {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }

    .count-item {
      display: flex;
      gap: 4px;
      align-items: center;
      font-size: 10px;
    }

    .btn-small {
      background: #6c757d;
      color: white;
      border: none;
      padding: 2px 6px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 9px;
    }

    .cleanup-actions {
      display: flex;
      gap: 4px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }

    .btn-danger {
      background: #dc3545;
      color: white;
      border: none;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 9px;
    }

    .btn-danger:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-danger-big {
      background: #721c24;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 10px;
      font-weight: bold;
    }

    .status {
      padding: 4px 8px;
      border-radius: 4px;
      margin-bottom: 8px;
      font-size: 10px;
    }

    .status.loading {
      background: #cce5ff;
      color: #004085;
    }

    .status.success {
      background: #d4edda;
      color: #155724;
    }

    .status.error {
      background: #f8d7da;
      color: #721c24;
    }

    .warning {
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      padding: 6px;
      border-radius: 4px;
      color: #856404;
      font-size: 9px;
    }

    .verbose-section {
      border-top: 1px solid #dee2e6;
      padding: 8px;
      background: #f8f9fa;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .detail-item h4 {
      margin: 0 0 4px 0;
      font-size: 11px;
      color: #495057;
    }

    .detail-item pre {
      background: white;
      border: 1px solid #ced4da;
      border-radius: 3px;
      padding: 4px;
      margin: 0;
      font-size: 9px;
      overflow: auto;
      max-height: 120px;
    }

    @media (max-width: 768px) {
      .dev-debug {
        position: relative;
        bottom: auto;
        right: auto;
        margin: 10px;
        max-width: none;
      }

      .detail-grid {
        grid-template-columns: 1fr;
      }

      .status-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `],
})
export class DevDebugComponent extends BaseComponent {
  // Inject stores
  protected readonly authStore = inject(AuthStore);
  protected readonly userStore = inject(UserStore);
  protected readonly pubStore = inject(PubStore);
  protected readonly checkinStore = inject(CheckinStore);
  private readonly cleanupService = inject(CleanupService);

  // UI state
  readonly isExpanded = signal(false);
  readonly showVerbose = signal(false);

  // Cleanup state
  protected readonly counts = signal({ users: 0, checkIns: 0, pubs: 0 });
  protected readonly cleanupLoading = signal(false);
  protected readonly lastCleanupResult = signal<CleanupResult | null>(null);

  // Quick status summary
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
      name: 'User',
      status: this.userStore.loading() ? 'loading' : (this.userStore.user() ? 'healthy' : 'empty'),
      indicator: this.userStore.loading() ? '⏳' : (this.userStore.user() ? '✅' : '👤'),
      count: this.userStore.user() ? 'loaded' : 'none'
    },
    {
      name: 'Check-ins',
      status: this.checkinStore.loading() ? 'loading' :
             this.checkinStore.error() ? 'error' :
             this.checkinStore.data().length > 0 ? 'healthy' : 'empty',
      indicator: this.checkinStore.loading() ? '⏳' :
                this.checkinStore.error() ? '❌' :
                this.checkinStore.data().length > 0 ? '✅' : '📭',
      count: this.checkinStore.data().length.toString()
    }
  ]);

  // Verbose data (reuse from NewHomeComponent patterns)
  readonly authData = computed(() => ({
    ready: this.authStore.ready(),
    isAuthenticated: this.authStore.isAuthenticated(),
    uid: this.authStore.uid(),
    displayName: this.authStore.displayName(),
    isAnonymous: this.authStore.isAnonymous(),
  }));

  readonly userData = computed(() => ({
    loading: this.userStore.loading(),
    error: this.userStore.error(),
    hasUser: !!this.userStore.user(),
    isLoaded: this.userStore.isLoaded(),
  }));

  readonly pubData = computed(() => ({
    loading: this.pubStore.loading(),
    error: this.pubStore.error(),
    count: this.pubStore.data().length,
  }));

  readonly checkinData = computed(() => ({
    loading: this.checkinStore.loading(),
    error: this.checkinStore.error(),
    count: this.checkinStore.data().length,
    canLoad: !!this.authStore.user(),
  }));

  constructor() {
    super();
    // Auto-load counts when expanded
    this.refreshCounts();
  }

  // UI Actions
  toggleExpanded(): void {
    this.isExpanded.update(expanded => !expanded);
  }

  toggleVerbose(): void {
    this.showVerbose.update(verbose => !verbose);
  }

  refreshStores(): void {
    console.log('🔄 [DevDebug] Refreshing stores...');
    this.pubStore.loadOnce();
    if (this.authStore.user()) {
      this.checkinStore.loadOnce();
    }
  }

  clearErrors(): void {
    console.log('🧹 [DevDebug] Clearing store errors...');
    [this.pubStore, this.checkinStore].forEach(store => {
      if ('clearError' in store && typeof store.clearError === 'function') {
        store.clearError();
      }
    });
  }

  // Cleanup Actions
  protected async refreshCounts(): Promise<void> {
    try {
      const newCounts = await this.cleanupService.getCollectionCounts();
      this.counts.set(newCounts);
    } catch (error: any) {
      console.error('[DevDebug] Error refreshing counts:', error);
    }
  }

  protected async clearUsers(): Promise<void> {
    if (!confirm('Delete ALL users? This cannot be undone.')) return;

    this.cleanupLoading.set(true);
    this.lastCleanupResult.set(null);

    try {
      const result = await this.cleanupService.clearUsers();
      this.lastCleanupResult.set(result);
      await this.refreshCounts();

      // Reset user store local state too
      this.userStore.reset();
    } finally {
      this.cleanupLoading.set(false);
    }
  }

  protected async clearCheckIns(): Promise<void> {
    if (!confirm('Delete ALL check-ins? This cannot be undone.')) return;

    this.cleanupLoading.set(true);
    this.lastCleanupResult.set(null);

    try {
      const result = await this.cleanupService.clearCheckIns();
      this.lastCleanupResult.set(result);
      await this.refreshCounts();

      // Reset checkin store local state too
      this.checkinStore.reset();
    } finally {
      this.cleanupLoading.set(false);
    }
  }

  protected async clearAll(): Promise<void> {
    if (!confirm('Delete ALL users AND check-ins? This cannot be undone.')) return;
    if (!confirm('Are you absolutely sure? This will clear all test data.')) return;

    this.cleanupLoading.set(true);
    this.lastCleanupResult.set(null);

    try {
      const results = await this.cleanupService.clearAllTestData();

      // Show combined result
      const totalDeleted = results.users.deletedCount + results.checkIns.deletedCount;
      const allSuccess = results.users.success && results.checkIns.success;

      this.lastCleanupResult.set({
        success: allSuccess,
        deletedCount: totalDeleted,
        error: allSuccess ? undefined : 'Some operations failed'
      });

      await this.refreshCounts();

      // Reset local store state
      this.userStore.reset();
      this.checkinStore.reset();
    } finally {
      this.cleanupLoading.set(false);
    }
  }
}
