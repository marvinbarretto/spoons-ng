// src/app/pubs/feature/pub-admin/pub-admin.component.ts
import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { 
  ButtonComponent, 
  LoadingStateComponent, 
  ErrorStateComponent, 
  EmptyStateComponent 
} from '@fourfold/angular-foundation';
import { GlobalCheckInStore } from '@check-in/data-access/global-check-in.store';
import { getRelativeTime } from '@shared/utils/timestamp.utils';
import { BaseComponent } from '../../../shared/base/base.component';
import { PubStore } from '../../data-access/pub.store';
import type { Pub } from '../../utils/pub.models';

@Component({
  selector: 'app-pub-admin',
  imports: [
    CommonModule, 
    RouterModule, 
    ButtonComponent, 
    LoadingStateComponent, 
    ErrorStateComponent, 
    EmptyStateComponent
  ],
  template: `
    <section class="pub-admin-page">
      <header class="page-header">
        <div class="header-content">
          <h1>Pub Management</h1>
          <p class="page-subtitle">View and manage all pubs with CRUD operations</p>
        </div>

        <div class="header-actions">
          <ff-button (onClick)="handleCreate()" variant="primary">
            + Create New Pub
          </ff-button>
        </div>
      </header>

      <!-- Search Section -->
      <section class="search-section">
        <div class="search-controls">
          <input
            type="text"
            placeholder="Search pubs by name, city, or region..."
            class="search-input"
            [value]="searchQuery()"
            (input)="onSearchInput($event)"
          />
          <div class="search-stats">
            Showing {{ filteredPubs().length }} of {{ pubStore.pubs().length }} pubs
          </div>
        </div>
      </section>

      @if (pubStore.loading()) {
        <ff-loading-state>Loading pubs...</ff-loading-state>
      } @else if (pubStore.error()) {
        <ff-error-state 
          [message]="pubStore.error() || 'Unknown error'" 
          (retry)="handleRetry()">
          Failed to load pubs
        </ff-error-state>
      } @else if (pubStore.pubs().length === 0) {
        <ff-empty-state
          icon="🏛️"
          title="No pubs yet"
          message="Create your first pub to get started"
          [showAction]="true"
          actionText="Create First Pub"
          (action)="handleCreate()">
        </ff-empty-state>
      } @else {
        <!-- Pub Statistics -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{{ pubStore.pubs().length }}</div>
            <div class="stat-label">Total Pubs</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ pubsWithCheckinsCount() }}</div>
            <div class="stat-label">With Check-ins</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ averageCheckinsPerPub() }}</div>
            <div class="stat-label">Avg Check-ins/Pub</div>
          </div>
        </div>

        <!-- Pubs Table -->
        <div class="pubs-table-container">
          <table class="pubs-table">
            <thead>
              <tr>
                <th>Pub</th>
                <th>Location</th>
                <th>Check-ins</th>
                <th>Last Activity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (pub of filteredPubs(); track pub.id) {
                <tr class="pub-row">
                  <td class="pub-name">
                    <div class="name-content">
                      <strong>{{ pub.name }}</strong>
                      <span class="pub-id">ID: {{ pub.id }}</span>
                    </div>
                  </td>
                  <td class="pub-location">
                    <div class="location-content">
                      <div class="address">{{ pub.address }}</div>
                      <div class="city-region">{{ pub.city }}, {{ pub.region }}</div>
                    </div>
                  </td>
                  <td class="checkin-count">
                    <div class="count-badge">
                      {{ getRealCheckInCount(pub.id) }}
                    </div>
                  </td>
                  <td class="last-activity">
                    @if (getRealLastCheckInDate(pub.id)) {
                      <span class="activity-date">{{ getRelativeTime(getRealLastCheckInDate(pub.id)) }}</span>
                    } @else {
                      <span class="no-activity">No activity</span>
                    }
                  </td>
                  <td class="actions">
                    <div class="action-buttons">
                      <ff-button (onClick)="handleViewDetail(pub.id)" size="sm" variant="secondary">
                        View Details
                      </ff-button>
                      <ff-button (onClick)="handleEdit(pub.id)" size="sm"> Edit </ff-button>
                      <ff-button (onClick)="handleDelete(pub)" variant="danger" size="sm">
                        Delete
                      </ff-button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Development debug info -->
      @if (isDevelopment()) {
        <details class="debug-section">
          <summary>Admin Debug Info</summary>
          <div class="debug-content">
            <h4>Store State</h4>
            <pre>{{ debugStoreInfo() | json }}</pre>
            <h4>Pub Summary</h4>
            <pre>{{ debugPubSummary() | json }}</pre>
          </div>
        </details>
      }
    </section>
  `,
  styles: `
    .pub-admin-page {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
      gap: 2rem;
    }

    .header-content h1 {
      font-size: 2.25rem;
      font-weight: 700;
      margin: 0 0 0.5rem;
      color: var(--text, #111827);
    }

    .page-subtitle {
      color: var(--text-secondary, #6b7280);
      margin: 0;
      font-size: 1.125rem;
    }

    .header-actions {
      flex-shrink: 0;
    }

    .search-section {
      margin-bottom: 2rem;
    }

    .search-controls {
      display: flex;
      gap: 1rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .search-input {
      flex: 1;
      min-width: 300px;
      padding: 0.75rem 1rem;
      border: 1px solid var(--border, #e5e7eb);
      border-radius: 8px;
      font-size: 1rem;
      background: var(--background-darkest, #ffffff);
      color: var(--text, #111827);
    }

    .search-input:focus {
      outline: none;
      border-color: var(--primary, #3b82f6);
      box-shadow: 0 0 0 3px var(--primary-subtle, rgba(59, 130, 246, 0.1));
    }

    .search-stats {
      font-size: 0.875rem;
      color: var(--text-secondary, #6b7280);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: var(--background-darkest, #ffffff);
      border: 1px solid var(--border, #e5e7eb);
      border-radius: 8px;
      padding: 1.5rem;
      text-align: center;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--primary, #3b82f6);
      margin-bottom: 0.5rem;
    }

    .stat-label {
      color: var(--text-secondary, #6b7280);
      font-size: 0.875rem;
      font-weight: 500;
    }

    .pubs-table-container {
      background: var(--background-darkest, #ffffff);
      border: 1px solid var(--border, #e5e7eb);
      border-radius: 12px;
      overflow: hidden;
      overflow-x: auto;
    }

    .pubs-table {
      width: 100%;
      border-collapse: collapse;
    }

    .pubs-table th {
      background: var(--color-gray-50, #f9fafb);
      padding: 1rem;
      text-align: left;
      font-weight: 600;
      color: var(--text, #111827);
      border-bottom: 1px solid var(--border, #e5e7eb);
      font-size: 0.875rem;
      white-space: nowrap;
    }

    .pubs-table td {
      padding: 1.25rem 1rem;
      border-bottom: 1px solid var(--border, #e5e7eb);
      vertical-align: top;
    }

    .pub-row:hover {
      background: var(--color-gray-50, #f9fafb);
    }

    .name-content {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .name-content strong {
      color: var(--text, #111827);
      font-weight: 600;
    }

    .pub-id {
      font-size: 0.75rem;
      color: var(--text-secondary, #6b7280);
      font-family: monospace;
    }

    .location-content {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .address {
      color: var(--text, #111827);
      font-weight: 500;
    }

    .city-region {
      font-size: 0.875rem;
      color: var(--text-secondary, #6b7280);
    }

    .count-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: var(--primary-subtle, rgba(59, 130, 246, 0.1));
      color: var(--primary, #3b82f6);
      border-radius: 50%;
      font-weight: 600;
      font-size: 0.875rem;
    }

    .activity-date {
      color: var(--text, #111827);
      font-size: 0.875rem;
    }

    .no-activity {
      color: var(--text-secondary, #6b7280);
      font-style: italic;
      font-size: 0.875rem;
    }

    .action-buttons {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .debug-section {
      margin-top: 3rem;
      padding: 1.5rem;
      background: var(--color-gray-50, #f9fafb);
      border: 1px solid var(--border, #e5e7eb);
      border-radius: 8px;
    }

    .debug-content {
      margin-top: 1rem;
    }

    .debug-content h4 {
      margin: 1rem 0 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .debug-content h4:first-child {
      margin-top: 0;
    }

    .debug-content pre {
      background: var(--background-darkest, #ffffff);
      padding: 1rem;
      border-radius: 6px;
      border: 1px solid var(--border, #e5e7eb);
      overflow-x: auto;
      font-size: 0.75rem;
      margin: 0;
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .pub-admin-page {
        padding: 1rem;
      }

      .page-header {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
      }

      .search-controls {
        flex-direction: column;
        align-items: stretch;
      }

      .search-input {
        min-width: auto;
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }

      .pubs-table th,
      .pubs-table td {
        padding: 0.75rem 0.5rem;
      }

      /* Hide less important columns on mobile */
      .pubs-table th:nth-child(4),
      .pubs-table td:nth-child(4) {
        display: none;
      }

      .action-buttons {
        flex-direction: column;
      }
    }

    @media (max-width: 640px) {
      .pubs-table-container {
        font-size: 0.875rem;
      }

      .name-content strong {
        font-size: 0.875rem;
      }

      .stat-value {
        font-size: 1.5rem;
      }

      /* Stack table content vertically on very small screens */
      .pubs-table th:nth-child(2),
      .pubs-table td:nth-child(2) {
        display: none;
      }
    }
  `,
})
export class PubAdminComponent extends BaseComponent {
  // ✅ Dependencies
  protected readonly pubStore = inject(PubStore);
  protected readonly globalCheckInStore = inject(GlobalCheckInStore);

  // ✅ Expose utility functions for template
  readonly getRelativeTime = getRelativeTime;

  // ✅ Search state
  private readonly _searchQuery = signal('');
  readonly searchQuery = this._searchQuery.asReadonly();

  // ✅ Computed filtered pubs
  protected readonly filteredPubs = computed(() => {
    const pubs = this.pubStore.pubs();
    const query = this.searchQuery().toLowerCase().trim();

    if (!query) return pubs;

    return pubs.filter(pub =>
      pub.name.toLowerCase().includes(query) ||
      pub.city?.toLowerCase().includes(query) ||
      pub.region?.toLowerCase().includes(query) ||
      pub.address.toLowerCase().includes(query)
    );
  });

  // ✅ Computed statistics (using REAL data from GlobalCheckInStore)
  protected readonly pubsWithCheckinsCount = computed(() => {
    const pubs = this.pubStore.pubs();
    return pubs.filter(pub => this.getRealCheckInCount(pub.id) > 0).length;
  });

  protected readonly averageCheckinsPerPub = computed(() => {
    const pubs = this.pubStore.pubs();
    if (pubs.length === 0) return 0;

    const totalCheckIns = pubs.reduce((sum, pub) => sum + this.getRealCheckInCount(pub.id), 0);
    return Math.round(totalCheckIns / pubs.length);
  });

  // ✅ Development helper
  protected readonly isDevelopment = computed(() => true);

  // ✅ Debug information
  protected readonly debugStoreInfo = computed(() => ({
    pubStore: {
      loading: this.pubStore.loading(),
      error: this.pubStore.error(),
      pubCount: this.pubStore.pubs().length,
      hasData: this.pubStore.pubs().length > 0,
    },
    globalCheckInStore: {
      loading: this.globalCheckInStore.loading(),
      totalCheckIns: this.globalCheckInStore.totalCheckInCount(),
      uniqueUsers: this.globalCheckInStore.uniqueUserCount(),
      uniquePubs: this.globalCheckInStore.uniquePubCount(),
      hasData: this.globalCheckInStore.totalCheckInCount() > 0,
    },
  }));

  protected readonly debugPubSummary = computed(() => {
    const pubs = this.pubStore.pubs();
    const filteredPubs = this.filteredPubs();
    
    return {
      totalPubs: pubs.length,
      filteredPubs: filteredPubs.length,
      withCheckIns: this.pubsWithCheckinsCount(),
      averageCheckIns: this.averageCheckinsPerPub(),
      searchQuery: this.searchQuery(),
      checkInDataRange: pubs.length > 0 ? {
        min: Math.min(...pubs.map(p => this.getRealCheckInCount(p.id))),
        max: Math.max(...pubs.map(p => this.getRealCheckInCount(p.id))),
      } : null,
    };
  });

  // ✅ Real statistics methods using GlobalCheckInStore
  getRealCheckInCount(pubId: string): number {
    return this.globalCheckInStore.getPubVisitCount(pubId);
  }

  getRealLastCheckInDate(pubId: string): any {
    const checkIns = this.globalCheckInStore.getCheckInsForPub(pubId);
    if (checkIns.length === 0) return null;
    
    // Sort by timestamp and get the most recent
    const sortedCheckIns = checkIns.sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);
    return sortedCheckIns[0].timestamp;
  }

  getRealUniqueVisitors(pubId: string): number {
    const checkIns = this.globalCheckInStore.getCheckInsForPub(pubId);
    const uniqueUserIds = new Set(checkIns.map(checkIn => checkIn.userId));
    return uniqueUserIds.size;
  }

  // ✅ Data loading
  protected override onInit(): void {
    this.pubStore.loadOnce();
    this.globalCheckInStore.loadFreshGlobalData(); // Load real check-in data
  }

  // ✅ Search handling
  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this._searchQuery.set(target.value);
  }

  // ✅ Navigation actions
  handleCreate(): void {
    console.log('[PubAdmin] Navigating to create pub');
    this.router.navigate(['/admin/pubs/new']);
  }

  handleEdit(pubId: string): void {
    console.log('[PubAdmin] Navigating to edit pub:', pubId);
    this.router.navigate(['/admin/pubs', pubId, 'edit']);
  }

  handleViewDetail(pubId: string): void {
    console.log('[PubAdmin] Navigating to pub detail:', pubId);
    this.router.navigate(['/pubs', pubId]);
  }

  handleRetry(): void {
    console.log('[PubAdmin] Retrying pub load');
    this.pubStore.loadOnce();
    this.globalCheckInStore.loadFreshGlobalData();
  }

  // ✅ Delete with confirmation
  async handleDelete(pub: Pub): Promise<void> {
    const checkInCount = this.getRealCheckInCount(pub.id);
    
    const confirmed = confirm(
      `Are you sure you want to delete "${pub.name}"?\n\n` +
        `Location: ${pub.address}, ${pub.city}, ${pub.region}\n` +
        `This pub has ${checkInCount} check-ins and will be permanently removed.\n\n` +
        `This action cannot be undone.`
    );

    if (!confirmed) {
      console.log('[PubAdmin] Delete cancelled by user');
      return;
    }

    try {
      console.log('[PubAdmin] Deleting pub:', pub.name);
      await this.pubStore.remove(pub.id);
      console.log('[PubAdmin] ✅ Pub deleted successfully');
      this.showSuccess(`Pub "${pub.name}" deleted successfully`);
    } catch (error: any) {
      console.error('[PubAdmin] ❌ Delete failed:', error);
      this.showError(error?.message || 'Failed to delete pub');
    }
  }
}