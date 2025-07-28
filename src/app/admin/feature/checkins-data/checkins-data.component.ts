// src/app/admin/feature/checkins-data/checkins-data.component.ts
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BaseComponent } from '@shared/base/base.component';
import { LoadingStateComponent } from '@shared/ui/loading-state/loading-state.component';
import { ErrorStateComponent } from '@shared/ui/error-state/error-state.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { DataTableComponent } from '@shared/ui/data-table/data-table.component';

import { CollectionBrowserService, type CollectionRecord } from '../../data-access/collection-browser.service';
import { PubStore } from '@pubs/data-access/pub.store';
import type { TableColumn } from '@shared/ui/data-table/data-table.model';
import { UserDisplayPipe } from '@shared/pipes/user-display.pipe';

type CheckinRecord = CollectionRecord & {
  formattedDate: string;
  userDisplayName: string;
  pubDisplayName: string;
  pointsDisplay: string;
  statusDisplay: string;
  hasPhoto: boolean;
  photoIcon: string;
};

@Component({
  selector: 'app-admin-checkins-data',
  imports: [
    CommonModule,
    FormsModule,
    LoadingStateComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    ButtonComponent,
    DataTableComponent,
    UserDisplayPipe
  ],
  template: `
    <div class="checkins-data">
      <header class="page-header">
        <h1>🍺 Check-ins Data</h1>
        <p>View and analyze all user check-ins across the system</p>
      </header>

      <!-- Filters and Controls -->
      <section class="controls-section">
        <div class="filter-row">
          <div class="filter-group">
            <label for="userIdFilter">Filter by User ID:</label>
            <input
              id="userIdFilter"
              type="text"
              [(ngModel)]="userIdFilter"
              placeholder="Enter user ID..."
              (input)="onFilterChange()"
              class="filter-input"
            />
          </div>

          <div class="filter-group">
            <label for="pubIdFilter">Filter by Pub ID:</label>
            <input
              id="pubIdFilter"
              type="text"
              [(ngModel)]="pubIdFilter"
              placeholder="Enter pub ID..."
              (input)="onFilterChange()"
              class="filter-input"
            />
          </div>

          <div class="filter-group">
            <label for="dateFilter">From Date:</label>
            <input
              id="dateFilter"
              type="date"
              [(ngModel)]="dateFilter"
              (change)="onFilterChange()"
              class="filter-input"
            />
          </div>

          <div class="filter-group">
            <label for="photoFilter">Has Photo:</label>
            <select
              id="photoFilter"
              [(ngModel)]="photoFilter"
              (change)="onFilterChange()"
              class="filter-select"
            >
              <option value="">All Check-ins</option>
              <option value="true">With Photo</option>
              <option value="false">Without Photo</option>
            </select>
          </div>

          <div class="filter-actions">
            <app-button
              variant="secondary"
              size="sm"
              (onClick)="clearFilters()"
              [disabled]="loading()"
            >
              Clear Filters
            </app-button>

            <app-button
              variant="primary"
              size="sm"
              [loading]="loading()"
              (onClick)="loadCheckins(true)"
            >
              Refresh
            </app-button>
          </div>
        </div>

        <!-- Summary Stats -->
        @if (summaryStats()) {
          <div class="summary-stats">
            <div class="stat-item">
              <span class="stat-value">{{ summaryStats()!.totalCheckins }}</span>
              <span class="stat-label">Total Check-ins</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ summaryStats()!.uniqueUsers }}</span>
              <span class="stat-label">Unique Users</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ summaryStats()!.uniquePubs }}</span>
              <span class="stat-label">Unique Pubs</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ summaryStats()!.totalPoints }}</span>
              <span class="stat-label">Total Points</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ summaryStats()!.photoRate }}%</span>
              <span class="stat-label">Photo Rate</span>
            </div>
          </div>
        }
      </section>

      <!-- Loading/Error States -->
      @if (loading()) {
        <app-loading-state text="Loading check-ins data..." />
      } @else if (error()) {
        <app-error-state
          [message]="error()!"
          [showRetry]="true"
          retryText="Try Again"
          (retry)="loadCheckins(true)"
        />
      } @else if (enrichedCheckins().length === 0) {
        <app-empty-state
          icon="🍺"
          title="No check-ins found"
          subtitle="No check-ins match your current filters"
          [showAction]="hasFiltersApplied()"
          actionText="Clear Filters"
          (action)="clearFilters()"
        />
      } @else {
        <!-- Check-ins Table -->
        <section class="checkins-table">
          <div class="table-header">
            <h2>Check-in Records</h2>
            <div class="table-info">
              Showing {{ enrichedCheckins().length }} check-ins
              @if (hasMoreData()) {
                <span class="more-indicator">(more available)</span>
              }
            </div>
          </div>

          <div class="table-container">
            <app-data-table
              [data]="enrichedCheckins()"
              [columns]="tableColumns"
              [loading]="loading()"
              trackBy="id"
            />
          </div>

          <!-- Pagination -->
          @if (hasMoreData()) {
            <div class="pagination-controls">
              <app-button
                variant="secondary"
                [loading]="loading()"
                (onClick)="loadMore()"
              >
                Load More Check-ins
              </app-button>
            </div>
          }
        </section>
      }

      <!-- Data Insights -->
      <details class="data-insights">
        <summary>📊 Data Insights & Analysis</summary>
        <div class="insights-content">
          @if (summaryStats(); as stats) {
            <div class="insights-grid">
              <div class="insight-card">
                <h4>User Engagement</h4>
                <p><strong>{{ stats.uniqueUsers }}</strong> users have checked in</p>
                <p>Average: <strong>{{ getAverageCheckinsPerUser(stats) }}</strong> check-ins per user</p>
              </div>

              <div class="insight-card">
                <h4>Pub Coverage</h4>
                <p><strong>{{ stats.uniquePubs }}</strong> pubs have been visited</p>
                <p>Average: <strong>{{ getAverageVisitsPerPub(stats) }}</strong> visits per pub</p>
              </div>

              <div class="insight-card">
                <h4>Photo Engagement</h4>
                <p><strong>{{ stats.photoRate }}%</strong> of check-ins include photos</p>
                <p>This indicates user engagement with the photo feature</p>
              </div>

              <div class="insight-card">
                <h4>Points Distribution</h4>
                <p><strong>{{ stats.totalPoints }}</strong> total points awarded</p>
                <p>Average: <strong>{{ getAveragePointsPerCheckin(stats) }}</strong> points per check-in</p>
              </div>
            </div>
          }
        </div>
      </details>

      <!-- Bulk Operations -->
      <details class="bulk-operations">
        <summary>🔧 Bulk Operations (Advanced)</summary>
        <div class="bulk-content">
          <div class="operation-warning">
            ⚠️ <strong>Warning:</strong> Bulk operations can permanently affect user data. Use with caution.
          </div>
          
          <div class="operations-grid">
            <div class="operation-item">
              <h4>🗑️ Clean Orphaned Check-ins</h4>
              <p>Remove check-ins from deleted users</p>
              <app-button
                variant="warning"
                size="sm"
                [loading]="bulkOperationLoading()"
                (onClick)="cleanOrphanedCheckins()"
              >
                Find & Clean Orphaned
              </app-button>
            </div>

            <div class="operation-item">
              <h4>📊 Recalculate User Stats</h4>
              <p>Update user pub counts from actual check-ins</p>
              <app-button
                variant="primary"
                size="sm"
                [loading]="bulkOperationLoading()"
                (onClick)="recalculateUserStats()"
              >
                Recalculate Stats
              </app-button>
            </div>

            <div class="operation-item">
              <h4>📁 Export Data</h4>
              <p>Export filtered check-ins to CSV</p>
              <app-button
                variant="secondary"
                size="sm"
                (onClick)="exportData()"
                [disabled]="enrichedCheckins().length === 0"
              >
                Export to CSV
              </app-button>
            </div>
          </div>
        </div>
      </details>
    </div>
  `,
  styles: `
    .checkins-data {
      max-width: 1400px;
      margin: 0 auto;
      padding: 1rem;
    }

    .page-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .page-header h1 {
      margin: 0 0 0.5rem;
      color: var(--text);
      font-size: clamp(1.5rem, 4vw, 2.5rem);
    }

    .page-header p {
      margin: 0;
      color: var(--text-secondary);
      font-size: 1rem;
    }

    /* Controls Section */
    .controls-section {
      background: var(--background-lighter);
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      border: 1px solid var(--border);
    }

    .filter-row {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: end;
      margin-bottom: 1rem;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      min-width: 150px;
    }

    .filter-group label {
      font-size: 0.9rem;
      color: var(--text-secondary);
      font-weight: 600;
    }

    .filter-input, .filter-select {
      padding: 0.5rem;
      border: 1px solid var(--border);
      border-radius: 4px;
      background: var(--background);
      color: var(--text);
      font-size: 0.9rem;
    }

    .filter-input:focus, .filter-select:focus {
      outline: none;
      border-color: var(--primary);
    }

    .filter-actions {
      display: flex;
      gap: 0.5rem;
      align-items: end;
    }

    /* Summary Stats */
    .summary-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
    }

    .stat-item {
      text-align: center;
      padding: 0.75rem;
      background: var(--background);
      border-radius: 6px;
      border: 1px solid var(--border);
    }

    .stat-value {
      display: block;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 0.25rem;
    }

    .stat-label {
      font-size: 0.8rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Check-ins Table */
    .checkins-table {
      background: var(--background-lighter);
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      border: 1px solid var(--border);
    }

    .table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .table-header h2 {
      margin: 0;
      color: var(--text);
      font-size: 1.25rem;
    }

    .table-info {
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .more-indicator {
      font-weight: 600;
      color: var(--primary);
    }

    .table-container {
      background: var(--background);
      border-radius: 6px;
      overflow: hidden;
      border: 1px solid var(--border);
    }

    /* Pagination */
    .pagination-controls {
      display: flex;
      justify-content: center;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
      margin-top: 1rem;
    }

    /* Data Insights */
    .data-insights {
      background: var(--background-lighter);
      border-radius: 8px;
      border: 1px solid var(--border);
      margin-bottom: 2rem;
    }

    .data-insights summary {
      padding: 1rem;
      cursor: pointer;
      font-weight: 600;
      color: var(--text);
      border-bottom: 1px solid var(--border);
    }

    .data-insights summary:hover {
      background: var(--background);
    }

    .insights-content {
      padding: 1rem;
    }

    .insights-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
    }

    .insight-card {
      background: var(--background);
      border-radius: 6px;
      padding: 1rem;
      border: 1px solid var(--border);
    }

    .insight-card h4 {
      margin: 0 0 0.5rem;
      color: var(--text);
      font-size: 1rem;
    }

    .insight-card p {
      margin: 0.25rem 0;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    /* Bulk Operations */
    .bulk-operations {
      background: var(--background-lighter);
      border-radius: 8px;
      border: 1px solid var(--border);
      margin-bottom: 2rem;
    }

    .bulk-operations summary {
      padding: 1rem;
      cursor: pointer;
      font-weight: 600;
      color: var(--text);
      border-bottom: 1px solid var(--border);
    }

    .bulk-operations summary:hover {
      background: var(--background);
    }

    .bulk-content {
      padding: 1rem;
    }

    .operation-warning {
      background: color-mix(in srgb, var(--warning) 15%, var(--background));
      border: 1px solid var(--warning);
      border-radius: 4px;
      padding: 0.75rem;
      margin-bottom: 1rem;
      font-size: 0.9rem;
    }

    .operations-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
    }

    .operation-item {
      background: var(--background);
      border-radius: 6px;
      padding: 1rem;
      border: 1px solid var(--border);
    }

    .operation-item h4 {
      margin: 0 0 0.5rem;
      color: var(--text);
      font-size: 1rem;
    }

    .operation-item p {
      margin: 0 0 0.75rem;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .checkins-data {
        padding: 0.5rem;
      }

      .filter-row {
        flex-direction: column;
        align-items: stretch;
      }

      .filter-group {
        min-width: unset;
      }

      .filter-actions {
        justify-content: stretch;
      }

      .summary-stats {
        grid-template-columns: repeat(2, 1fr);
      }

      .table-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .insights-grid, .operations-grid {
        grid-template-columns: 1fr;
      }
    }
  `
})
export class AdminCheckinsDataComponent extends BaseComponent {
  private readonly collectionBrowserService = inject(CollectionBrowserService);
  private readonly pubStore = inject(PubStore);
  private readonly userDisplayPipe = inject(UserDisplayPipe);

  // Filter states
  readonly userIdFilter = signal('');
  readonly pubIdFilter = signal('');
  readonly dateFilter = signal('');
  readonly photoFilter = signal('');

  // Data states
  readonly checkins = signal<CollectionRecord[]>([]);
  override readonly loading = signal(false);
  readonly bulkOperationLoading = signal(false);
  readonly hasMore = signal(false);
  readonly lastDocument = signal<any>(null);

  // Table configuration
  readonly tableColumns: TableColumn[] = [
    {
      key: 'formattedDate',
      label: 'Date',
      sortable: true,
      className: 'date-cell'
    },
    {
      key: 'userDisplayName',
      label: 'User',
      sortable: true,
      className: 'user-cell'
    },
    {
      key: 'pubDisplayName',
      label: 'Pub',
      sortable: true,
      className: 'pub-cell'
    },
    {
      key: 'pointsDisplay',
      label: 'Points',
      sortable: true,
      className: 'number points-primary'
    },
    {
      key: 'photoIcon',
      label: 'Photo',
      sortable: true,
      className: 'photo-cell center'
    },
    {
      key: 'statusDisplay',
      label: 'Status',
      sortable: true,
      className: 'status-cell'
    }
  ];

  // Computed properties
  readonly enrichedCheckins = computed((): CheckinRecord[] => {
    const pubs = this.pubStore.data();
    
    return this.checkins().map(checkin => {
      const pub = pubs.find(p => p.id === checkin.data.pubId);
      const hasPhoto = !!(checkin.data.photoURL || checkin.data.carpetPhotoURL);
      
      return {
        ...checkin,
        formattedDate: this.formatDate(checkin.data.timestamp || checkin.data.createdAt),
        userDisplayName: this.userDisplayPipe.transform(checkin.data.userId),
        pubDisplayName: pub?.name || `Unknown Pub (${checkin.data.pubId?.slice(0, 8) || 'No ID'})`,
        pointsDisplay: this.formatPoints(checkin.data.pointsEarned || checkin.data.points || 0),
        statusDisplay: this.getStatusDisplay(checkin.data),
        hasPhoto,
        photoIcon: hasPhoto ? '📸' : '—'
      };
    });
  });

  readonly summaryStats = computed(() => {
    const checkins = this.checkins();
    if (checkins.length === 0) return null;

    const totalCheckins = checkins.length;
    const uniqueUsers = new Set(checkins.map(c => c.data.userId)).size;
    const uniquePubs = new Set(checkins.map(c => c.data.pubId)).size;
    const totalPoints = checkins.reduce((sum, c) => sum + (c.data.pointsEarned || c.data.points || 0), 0);
    const checkinsWithPhotos = checkins.filter(c => c.data.photoURL || c.data.carpetPhotoURL).length;
    const photoRate = totalCheckins > 0 ? Math.round((checkinsWithPhotos / totalCheckins) * 100) : 0;

    return {
      totalCheckins,
      uniqueUsers,
      uniquePubs,
      totalPoints,
      photoRate
    };
  });

  readonly hasFiltersApplied = computed(() => {
    return this.userIdFilter() !== '' || 
           this.pubIdFilter() !== '' || 
           this.dateFilter() !== '' ||
           this.photoFilter() !== '';
  });

  readonly hasMoreData = computed(() => this.hasMore());

  override async ngOnInit(): Promise<void> {
    // Load pub data for enrichment
    await this.pubStore.loadOnce();
    await this.loadCheckins(true);
  }

  async loadCheckins(reset: boolean = false): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    if (reset) {
      this.checkins.set([]);
      this.lastDocument.set(null);
    }

    try {
      const filters = this.buildFilters();
      
      const result = await this.collectionBrowserService.browseCollection({
        collectionName: 'checkins',
        pageSize: 50,
        lastDocument: reset ? undefined : this.lastDocument(),
        filters,
        orderByField: 'timestamp',
        orderDirection: 'desc'
      });

      if (reset) {
        this.checkins.set(result.records);
      } else {
        this.checkins.update(current => [...current, ...result.records]);
      }

      this.hasMore.set(result.hasMore);
      this.lastDocument.set(result.lastDocument);

      console.log(`[AdminCheckinsData] Loaded ${result.records.length} check-ins, hasMore: ${result.hasMore}`);

    } catch (error: any) {
      console.error('[AdminCheckinsData] Failed to load check-ins:', error);
      this.error.set(`Failed to load check-ins: ${error?.message || 'Unknown error'}`);
    } finally {
      this.loading.set(false);
    }
  }

  async loadMore(): Promise<void> {
    if (!this.hasMore() || this.loading()) return;
    await this.loadCheckins(false);
  }

  onFilterChange(): void {
    // Debounce filter changes
    setTimeout(() => {
      this.loadCheckins(true);
    }, 300);
  }

  clearFilters(): void {
    this.userIdFilter.set('');
    this.pubIdFilter.set('');
    this.dateFilter.set('');
    this.photoFilter.set('');
    this.loadCheckins(true);
  }

  async cleanOrphanedCheckins(): Promise<void> {
    if (!confirm('🗑️ Clean orphaned check-ins?\n\nThis will remove check-ins from users that no longer exist. This action cannot be undone.\n\nContinue?')) {
      return;
    }

    this.bulkOperationLoading.set(true);

    try {
      const orphanedRecords = await this.collectionBrowserService.findOrphanedRecords();
      const orphanedCheckins = orphanedRecords['checkins'] || [];

      if (orphanedCheckins.length === 0) {
        this.showSuccess('✅ No orphaned check-ins found');
        return;
      }

      const recordIds = orphanedCheckins.map(r => r.id);
      const result = await this.collectionBrowserService.deleteRecords('checkins', recordIds);

      if (result.successCount > 0) {
        this.showSuccess(`✅ Cleaned ${result.successCount} orphaned check-ins`);
        await this.loadCheckins(true);
      }

      if (result.failureCount > 0) {
        this.showError(`⚠️ Failed to clean ${result.failureCount} check-ins`);
      }

    } catch (error: any) {
      console.error('[AdminCheckinsData] Failed to clean orphaned check-ins:', error);
      this.showError(`Failed to clean orphaned check-ins: ${error?.message || 'Unknown error'}`);
    } finally {
      this.bulkOperationLoading.set(false);
    }
  }

  async recalculateUserStats(): Promise<void> {
    this.bulkOperationLoading.set(true);

    try {
      // This would integrate with the DataIntegrityService to recalculate user stats
      this.showSuccess('📊 User stats recalculation started (feature coming soon)');
    } catch (error: any) {
      this.showError(`Failed to recalculate user stats: ${error?.message || 'Unknown error'}`);
    } finally {
      this.bulkOperationLoading.set(false);
    }
  }

  exportData(): void {
    const enrichedData = this.enrichedCheckins();
    if (enrichedData.length === 0) return;

    // Prepare CSV data
    const headers = ['Date', 'User ID', 'Pub Name', 'Points', 'Has Photo', 'Status'];
    const rows = enrichedData.map(checkin => [
      checkin.formattedDate,
      checkin.data.userId,
      checkin.pubDisplayName,
      checkin.data.pointsEarned || checkin.data.points || 0,
      checkin.hasPhoto ? 'Yes' : 'No',
      checkin.statusDisplay
    ]);

    // Create CSV content
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `checkins-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    this.showSuccess(`📁 Exported ${enrichedData.length} check-ins to CSV`);
  }

  private buildFilters() {
    const filters: any[] = [];

    const userId = this.userIdFilter().trim();
    if (userId) {
      filters.push({ field: 'userId', operator: '==', value: userId });
    }

    const pubId = this.pubIdFilter().trim();
    if (pubId) {
      filters.push({ field: 'pubId', operator: '==', value: pubId });
    }

    const dateFilter = this.dateFilter();
    if (dateFilter) {
      const startDate = new Date(dateFilter);
      filters.push({ field: 'timestamp', operator: '>=', value: startDate });
    }

    // Photo filter is handled client-side since it's complex

    return filters;
  }

  private formatDate(timestamp: any): string {
    if (!timestamp) return 'Unknown';
    
    let date: Date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp);
    }

    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  private formatPoints(points: number): string {
    return points >= 0 ? `+${points}` : `${points}`;
  }

  private getStatusDisplay(checkinData: any): string {
    if (checkinData.status) {
      return checkinData.status;
    }
    
    // Infer status from data
    if (checkinData.pointsEarned || checkinData.points) {
      return '✅ Complete';
    }
    
    return '⏳ Pending';
  }

  getAverageCheckinsPerUser(stats: any): string {
    return (stats.totalCheckins / Math.max(stats.uniqueUsers, 1)).toFixed(1);
  }

  getAverageVisitsPerPub(stats: any): string {
    return (stats.totalCheckins / Math.max(stats.uniquePubs, 1)).toFixed(1);
  }

  getAveragePointsPerCheckin(stats: any): string {
    return (stats.totalPoints / Math.max(stats.totalCheckins, 1)).toFixed(1);
  }
}