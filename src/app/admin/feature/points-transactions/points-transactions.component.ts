// src/app/admin/feature/points-transactions/points-transactions.component.ts
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BaseComponent } from '@shared/base/base.component';
import { LoadingStateComponent } from '@shared/ui/loading-state/loading-state.component';
import { ErrorStateComponent } from '@shared/ui/error-state/error-state.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { DataTableComponent } from '@shared/ui/data-table/data-table.component';

import { CollectionBrowserService, type CollectionRecord, type CollectionBrowserResult } from '../../data-access/collection-browser.service';
import type { TableColumn } from '@shared/ui/data-table/data-table.model';
import { UserStore } from '@users/data-access/user.store';

type PointsTransactionRecord = CollectionRecord & {
  formattedDate: string;
  userDisplayName: string;
  pointsDisplay: string;
  typeDisplay: string;
  reasonDisplay: string;
};

@Component({
  selector: 'app-admin-points-transactions',
  imports: [
    CommonModule,
    FormsModule,
    LoadingStateComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    ButtonComponent,
    DataTableComponent
  ],
  template: `
    <div class="points-transactions">
      <header class="page-header">
        <h1>💰 Points Transactions</h1>
        <p>View and manage all point transactions across the system</p>
      </header>

      <!-- Filters and Controls -->
      <section class="controls-section">
        <div class="filter-row">
          <div class="filter-group">
            <label for="userDisplayNameFilter">Filter by User Name:</label>
            <input
              id="userDisplayNameFilter"
              type="text"
              [(ngModel)]="userDisplayNameFilter"
              placeholder="Enter user name..."
              (input)="onFilterChange()"
              class="filter-input"
            />
          </div>

          <div class="filter-group">
            <label for="pointsFilter">Min Points:</label>
            <input
              id="pointsFilter"
              type="number"
              [(ngModel)]="minPointsFilter"
              placeholder="0"
              (input)="onFilterChange()"
              class="filter-input"
            />
          </div>

          <div class="filter-group">
            <label for="typeFilter">Transaction Type:</label>
            <select
              id="typeFilter"
              [(ngModel)]="typeFilter"
              (change)="onFilterChange()"
              class="filter-select"
            >
              <option value="">All Types</option>
              <option value="checkin">Check-in</option>
              <option value="bonus">Bonus</option>
              <option value="badge">Badge Reward</option>
              <option value="mission">Mission Reward</option>
              <option value="manual">Manual Adjustment</option>
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
              (onClick)="loadTransactions(true)"
            >
              Refresh
            </app-button>
          </div>
        </div>

        <!-- Summary Stats -->
        @if (summaryStats()) {
          <div class="summary-stats">
            <div class="stat-item">
              <span class="stat-value">{{ summaryStats()!.totalTransactions }}</span>
              <span class="stat-label">Total Transactions</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ summaryStats()!.totalPoints }}</span>
              <span class="stat-label">Total Points</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ summaryStats()!.uniqueUsers }}</span>
              <span class="stat-label">Unique Users</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ summaryStats()!.averageTransaction }}</span>
              <span class="stat-label">Avg Per Transaction</span>
            </div>
          </div>
        }
      </section>

      <!-- Loading/Error States -->
      @if (loading()) {
        <app-loading-state text="Loading points transactions..." />
      } @else if (error()) {
        <app-error-state
          [message]="error()!"
          [showRetry]="true"
          retryText="Try Again"
          (retry)="loadTransactions(true)"
        />
      } @else if (enrichedTransactions().length === 0) {
        <app-empty-state
          icon="💰"
          title="No transactions found"
          subtitle="No points transactions match your current filters"
          [showAction]="hasFiltersApplied()"
          actionText="Clear Filters"
          (action)="clearFilters()"
        />
      } @else {
        <!-- Transactions Table -->
        <section class="transactions-table">
          <div class="table-header">
            <h2>Transaction Records</h2>
            <div class="table-info">
              Showing {{ enrichedTransactions().length }} transactions
              @if (hasMoreData()) {
                <span class="more-indicator">(more available)</span>
              }
            </div>
          </div>

          <div class="table-container">
            <app-data-table
              [data]="enrichedTransactions()"
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
                Load More Transactions
              </app-button>
            </div>
          }
        </section>
      }

      <!-- Bulk Actions -->
      <details class="bulk-actions">
        <summary>🔧 Bulk Operations (Advanced)</summary>
        <div class="bulk-content">
          <div class="operation-warning">
            ⚠️ <strong>Warning:</strong> Bulk operations permanently delete transaction data. Use with extreme caution.
          </div>
          
          <div class="operations-grid">
            <div class="operation-item">
              <h4>🗑️ Delete User's Transactions</h4>
              <p>Delete ALL transactions for a specific user ID (for cleaning orphaned data)</p>
              <div class="user-id-input">
                <input
                  type="text"
                  [(ngModel)]="bulkDeleteUserId"
                  placeholder="Enter user ID to delete all their transactions..."
                  class="filter-input"
                />
                <app-button
                  variant="danger"
                  size="sm"
                  [loading]="bulkOperationLoading()"
                  (onClick)="deleteAllTransactionsForUser()"
                  [disabled]="!bulkDeleteUserId().trim() || loading()"
                >
                  Delete All
                </app-button>
              </div>
              <p class="helper-text">⚠️ This will permanently delete ALL transactions for the specified user ID</p>
            </div>

            <div class="operation-item">
              <h4>☢️ Delete ALL Transactions</h4>
              <p>Delete EVERY transaction in the database (nuclear option)</p>
              <app-button
                variant="danger"
                size="sm"
                [loading]="bulkOperationLoading()"
                (onClick)="deleteAllTransactions()"
                [disabled]="loading()"
              >
                Delete Everything
              </app-button>
              <p class="helper-text">⚠️ This will permanently delete ALL transactions for ALL users</p>
            </div>

            <div class="operation-item">
              <h4>🧹 Find Orphaned Transactions</h4>
              <p>Find transactions from users that no longer exist</p>
              <app-button
                variant="secondary"
                size="sm"
                [loading]="bulkOperationLoading()"
                (onClick)="findOrphanedTransactions()"
                [disabled]="loading()"
              >
                Find Orphaned
              </app-button>
            </div>
          </div>

          <div class="future-operations">
            <p><strong>Future planned features:</strong></p>
            <ul>
              <li>Recalculate user totals from transactions</li>
              <li>Export transaction data to CSV</li>
              <li>Find and fix duplicate transactions</li>
            </ul>
          </div>
        </div>
      </details>
    </div>
  `,
  styles: `
    .points-transactions {
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
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
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

    /* Transactions Table */
    .transactions-table {
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

    /* Bulk Actions */
    .bulk-actions {
      background: var(--background-lighter);
      border-radius: 8px;
      border: 1px solid var(--border);
      margin-bottom: 2rem;
    }

    .bulk-actions summary {
      padding: 1rem;
      cursor: pointer;
      font-weight: 600;
      color: var(--text);
      border-bottom: 1px solid var(--border);
    }

    .bulk-actions summary:hover {
      background: var(--background);
    }

    .bulk-content {
      padding: 1rem;
    }

    .bulk-content p {
      margin: 0 0 0.5rem;
      color: var(--text-secondary);
    }

    .bulk-content ul {
      margin: 0.5rem 0 0 1rem;
      color: var(--text-secondary);
    }

    /* Bulk Operations */
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
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
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

    .user-id-input {
      display: flex;
      gap: 0.5rem;
      align-items: end;
      margin-bottom: 0.5rem;
    }

    .user-id-input input {
      flex: 1;
    }

    .helper-text {
      font-size: 0.8rem;
      color: var(--warning);
      font-style: italic;
      margin: 0;
    }

    .future-operations {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
    }

    .future-operations p {
      margin: 0 0 0.5rem;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .future-operations ul {
      margin: 0.5rem 0 0 1rem;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .points-transactions {
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

      .operations-grid {
        grid-template-columns: 1fr;
      }

      .user-id-input {
        flex-direction: column;
        align-items: stretch;
      }
    }
  `
})
export class AdminPointsTransactionsComponent extends BaseComponent {
  private readonly collectionBrowserService = inject(CollectionBrowserService);
  private readonly userStore = inject(UserStore);

  // Filter states
  readonly userDisplayNameFilter = signal('');
  readonly minPointsFilter = signal<number | null>(null);
  readonly typeFilter = signal('');
  
  // Bulk operations
  readonly bulkDeleteUserId = signal('');
  readonly bulkOperationLoading = signal(false);

  // Data states
  readonly transactions = signal<CollectionRecord[]>([]);
  override readonly loading = signal(false);
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
      key: 'data.userId',
      label: 'User ID',
      sortable: true,
      className: 'id-cell monospace'
    },
    {
      key: 'pointsDisplay',
      label: 'Points',
      sortable: true,
      className: 'number points-primary'
    },
    {
      key: 'typeDisplay',
      label: 'Type',
      sortable: true,
      className: 'type-cell'
    },
    {
      key: 'reasonDisplay',
      label: 'Reason',
      sortable: false,
      className: 'reason-cell'
    },
    {
      key: 'id',
      label: 'Transaction ID',
      sortable: false,
      className: 'id-cell monospace'
    }
  ];

  // Computed properties
  readonly enrichedTransactions = computed((): PointsTransactionRecord[] => {
    let transactions = this.transactions().map(transaction => ({
      ...transaction,
      formattedDate: this.formatDate(transaction.data.createdAt || transaction.data.timestamp),
      userDisplayName: this.getUserDisplayName(transaction.data.userId),
      pointsDisplay: this.formatPoints(transaction.data.points || transaction.data.amount || 0),
      typeDisplay: this.formatTransactionType(transaction.data.type || transaction.data.source),
      reasonDisplay: this.formatReason(transaction.data.reason || transaction.data.description || 'No reason specified')
    }));

    // Apply client-side filtering by user display name
    const userNameFilter = this.userDisplayNameFilter().toLowerCase().trim();
    if (userNameFilter) {
      transactions = transactions.filter(transaction => 
        transaction.userDisplayName.toLowerCase().includes(userNameFilter)
      );
    }

    return transactions;
  });

  readonly summaryStats = computed(() => {
    const transactions = this.transactions();
    if (transactions.length === 0) return null;

    const totalTransactions = transactions.length;
    const totalPoints = transactions.reduce((sum, t) => sum + (t.data.points || t.data.amount || 0), 0);
    const uniqueUsers = new Set(transactions.map(t => t.data.userId)).size;
    const averageTransaction = totalTransactions > 0 ? Math.round(totalPoints / totalTransactions) : 0;

    return {
      totalTransactions,
      totalPoints,
      uniqueUsers,
      averageTransaction
    };
  });

  readonly hasFiltersApplied = computed(() => {
    return this.userDisplayNameFilter() !== '' || 
           this.minPointsFilter() !== null || 
           this.typeFilter() !== '';
  });

  readonly hasMoreData = computed(() => this.hasMore());

  override async ngOnInit(): Promise<void> {
    // Load user data for display names
    await this.userStore.loadOnce();
    await this.loadTransactions(true);
  }

  async loadTransactions(reset: boolean = false): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    if (reset) {
      this.transactions.set([]);
      this.lastDocument.set(null);
    }

    try {
      const filters = this.buildFilters();
      
      const result = await this.collectionBrowserService.browseCollection({
        collectionName: 'pointsTransactions',
        pageSize: 50,
        lastDocument: reset ? undefined : this.lastDocument(),
        filters,
        orderByField: 'createdAt',
        orderDirection: 'desc'
      });

      if (reset) {
        this.transactions.set(result.records);
      } else {
        this.transactions.update(current => [...current, ...result.records]);
      }

      this.hasMore.set(result.hasMore);
      this.lastDocument.set(result.lastDocument);

      console.log(`[AdminPointsTransactions] Loaded ${result.records.length} transactions, hasMore: ${result.hasMore}`);

    } catch (error: any) {
      console.error('[AdminPointsTransactions] Failed to load transactions:', error);
      this.error.set(`Failed to load transactions: ${error?.message || 'Unknown error'}`);
    } finally {
      this.loading.set(false);
    }
  }

  async loadMore(): Promise<void> {
    if (!this.hasMore() || this.loading()) return;
    await this.loadTransactions(false);
  }

  onFilterChange(): void {
    // Debounce filter changes
    setTimeout(() => {
      this.loadTransactions(true);
    }, 300);
  }

  clearFilters(): void {
    this.userDisplayNameFilter.set('');
    this.minPointsFilter.set(null);
    this.typeFilter.set('');
    this.loadTransactions(true);
  }

  private buildFilters() {
    const filters: any[] = [];

    // User display name filter is handled client-side since we need to search by displayName
    // but the database stores userId

    const minPoints = this.minPointsFilter();
    if (minPoints !== null && minPoints > 0) {
      filters.push({ field: 'points', operator: '>=', value: minPoints });
    }

    const type = this.typeFilter();
    if (type) {
      filters.push({ field: 'type', operator: '==', value: type });
    }

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

  private getUserDisplayName(userId: string): string {
    if (!userId) return 'Unknown User';
    
    const users = this.userStore.data();
    const user = users.find(u => u.uid === userId);
    
    // Return displayName if found, otherwise show more of the user ID
    return user?.displayName || `${userId.slice(0, 12)}...`;
  }

  private formatPoints(points: number): string {
    return points >= 0 ? `+${points}` : `${points}`;
  }

  private formatTransactionType(type: string): string {
    if (!type) return 'Unknown';
    
    const typeMap: { [key: string]: string } = {
      'checkin': '🍺 Check-in',
      'bonus': '🎉 Bonus',
      'badge': '🏆 Badge',
      'mission': '🎯 Mission',
      'manual': '⚙️ Manual',
      'landlord': '🏠 Landlord',
      'carpet': '📸 Carpet'
    };

    return typeMap[type.toLowerCase()] || `📝 ${type}`;
  }

  private formatReason(reason: string): string {
    if (!reason || reason === 'No reason specified') return '—';
    
    // Truncate long reasons
    return reason.length > 50 ? `${reason.substring(0, 50)}...` : reason;
  }

  // Bulk Operations
  async deleteAllTransactionsForUser(): Promise<void> {
    const userId = this.bulkDeleteUserId().trim();
    if (!userId) return;

    const confirmed = confirm(
      `🗑️ Delete ALL transactions for user ID: ${userId}?\n\n` +
      `This will permanently delete ALL point transactions for this user.\n` +
      `This action CANNOT be undone.\n\n` +
      `Are you absolutely sure you want to continue?`
    );

    if (!confirmed) return;

    this.bulkOperationLoading.set(true);

    try {
      // First, get ALL transactions for this user
      const allUserTransactions: CollectionRecord[] = [];
      let lastDoc: any = null;
      let hasMore = true;

      // Fetch all transactions for this user in batches
      while (hasMore) {
        const result = await this.collectionBrowserService.browseCollection({
          collectionName: 'pointsTransactions',
          pageSize: 100,
          lastDocument: lastDoc,
          filters: [{ field: 'userId', operator: '==', value: userId }],
          orderByField: 'createdAt',
          orderDirection: 'desc'
        });

        allUserTransactions.push(...result.records);
        hasMore = result.hasMore;
        lastDoc = result.lastDocument;
      }

      if (allUserTransactions.length === 0) {
        this.showError(`No transactions found for user ID: ${userId}`);
        return;
      }

      // Delete all transactions
      const transactionIds = allUserTransactions.map(t => t.id);
      const deleteResult = await this.collectionBrowserService.deleteRecords('pointsTransactions', transactionIds);

      if (deleteResult.successCount > 0) {
        this.showSuccess(`✅ Successfully deleted ${deleteResult.successCount} transactions for user ${userId}`);
        
        // Clear the input and reload the current view
        this.bulkDeleteUserId.set('');
        await this.loadTransactions(true);
      }

      if (deleteResult.failureCount > 0) {
        this.showError(`⚠️ Failed to delete ${deleteResult.failureCount} transactions`);
      }

    } catch (error: any) {
      console.error('[AdminPointsTransactions] Failed to delete user transactions:', error);
      this.showError(`Failed to delete transactions: ${error?.message || 'Unknown error'}`);
    } finally {
      this.bulkOperationLoading.set(false);
    }
  }

  async deleteAllTransactions(): Promise<void> {
    const confirmed = confirm(
      `☢️ NUCLEAR OPTION: Delete ALL transactions?\n\n` +
      `This will permanently delete EVERY point transaction in the database.\n` +
      `This affects ALL users and CANNOT be undone.\n\n` +
      `Are you absolutely sure you want to continue?`
    );

    if (!confirmed) return;

    const doubleConfirm = confirm(
      `🚨 FINAL WARNING\n\n` +
      `You are about to delete ALL transactions for ALL users.\n` +
      `This will completely reset everyone's point history.\n\n` +
      `This action is IRREVERSIBLE.\n\n` +
      `Type YES to confirm or Cancel to abort.`
    );

    if (!doubleConfirm) return;

    this.bulkOperationLoading.set(true);

    try {
      // Get ALL transactions in batches and delete them
      const allTransactions: CollectionRecord[] = [];
      let lastDoc: any = null;
      let hasMore = true;
      let batchCount = 0;

      console.log('[AdminPointsTransactions] 🗑️ Starting nuclear deletion of ALL transactions...');

      // Fetch all transactions in batches
      while (hasMore) {
        batchCount++;
        console.log(`[AdminPointsTransactions] Fetching batch ${batchCount}...`);

        const result = await this.collectionBrowserService.browseCollection({
          collectionName: 'pointsTransactions',
          pageSize: 100,
          lastDocument: lastDoc,
          filters: [], // No filters = get everything
          orderByField: 'createdAt',
          orderDirection: 'desc'
        });

        allTransactions.push(...result.records);
        hasMore = result.hasMore;
        lastDoc = result.lastDocument;

        console.log(`[AdminPointsTransactions] Batch ${batchCount}: +${result.records.length} transactions (total: ${allTransactions.length})`);
      }

      if (allTransactions.length === 0) {
        this.showSuccess('✅ No transactions found to delete');
        return;
      }

      console.log(`[AdminPointsTransactions] 💥 Deleting ${allTransactions.length} total transactions...`);

      // Delete all transactions
      const transactionIds = allTransactions.map(t => t.id);
      const deleteResult = await this.collectionBrowserService.deleteRecords('pointsTransactions', transactionIds);

      if (deleteResult.successCount > 0) {
        this.showSuccess(`☢️ NUCLEAR DELETION COMPLETE: Deleted ${deleteResult.successCount} transactions`);
        
        // Reload the current view (should be empty now)
        await this.loadTransactions(true);
      }

      if (deleteResult.failureCount > 0) {
        this.showError(`⚠️ Failed to delete ${deleteResult.failureCount} transactions`);
      }

      console.log(`[AdminPointsTransactions] ✅ Nuclear deletion completed: ${deleteResult.successCount} deleted, ${deleteResult.failureCount} failed`);

    } catch (error: any) {
      console.error('[AdminPointsTransactions] Failed to delete all transactions:', error);
      this.showError(`Failed to delete all transactions: ${error?.message || 'Unknown error'}`);
    } finally {
      this.bulkOperationLoading.set(false);
    }
  }

  async findOrphanedTransactions(): Promise<void> {
    this.bulkOperationLoading.set(true);

    try {
      const orphanedRecords = await this.collectionBrowserService.findOrphanedRecords();
      const orphanedTransactions = orphanedRecords['pointsTransactions'] || [];

      if (orphanedTransactions.length === 0) {
        this.showSuccess('✅ No orphaned transactions found');
      } else {
        this.showSuccess(`🔍 Found ${orphanedTransactions.length} orphaned transactions`);
        console.log('[AdminPointsTransactions] Orphaned transactions:', orphanedTransactions);
      }

    } catch (error: any) {
      console.error('[AdminPointsTransactions] Failed to find orphaned transactions:', error);
      this.showError(`Failed to find orphaned transactions: ${error?.message || 'Unknown error'}`);
    } finally {
      this.bulkOperationLoading.set(false);
    }
  }
}