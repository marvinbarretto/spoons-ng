// src/app/admin/feature/data-integrity/data-integrity.component.ts
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BaseComponent } from '@shared/base/base.component';
import { LoadingStateComponent } from '@shared/ui/loading-state/loading-state.component';
import { ErrorStateComponent } from '@shared/ui/error-state/error-state.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { DataTableComponent } from '@shared/ui/data-table/data-table.component';

import { DataIntegrityService, type IntegrityReport, type DataInconsistency, type UserDataSummary } from '../../data-access/data-integrity.service';
import type { TableColumn } from '@shared/ui/data-table/data-table.model';

type InconsistencyWithActions = DataInconsistency & {
  repairStatusText: string;
  severityDisplay: string;
  canRepairDisplay: string;
};

@Component({
  selector: 'app-admin-data-integrity',
  imports: [
    CommonModule,
    LoadingStateComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    ButtonComponent,
    DataTableComponent
  ],
  template: `
    <div class="data-integrity">
      <header class="page-header">
        <h1>🔍 Data Integrity Analysis</h1>
        <p>Identify and resolve data inconsistencies across collections</p>
      </header>

      <!-- Analysis Controls -->
      <section class="controls-section">
        <div class="control-group">
          <app-button
            variant="primary"
            [loading]="scanning()"
            (onClick)="performAnalysis()"
            [disabled]="repairing()"
          >
            {{ latestReport() ? '🔄 Re-scan Database' : '🔍 Analyze Database' }}
          </app-button>

          @if (latestReport() && inconsistenciesToDisplay().length > 0) {
            <app-button
              variant="success"
              [loading]="repairing()"
              (onClick)="repairAllAutoRepairableIssues()"
              [disabled]="scanning() || autoRepairableCount() === 0"
            >
              🔧 Auto-Repair All ({{ autoRepairableCount() }})
            </app-button>
          }
        </div>

        @if (latestReport()) {
          <div class="scan-info">
            <span class="scan-timestamp">
              Last scan: {{ formatScanTime(latestReport()!.scanTimestamp) }}
            </span>
          </div>
        }
      </section>

      <!-- Loading/Error States -->
      @if (scanning()) {
        <app-loading-state text="Analyzing database integrity..." />
      } @else if (error()) {
        <app-error-state
          [message]="error()!"
          [showRetry]="true"
          retryText="Try Again"
          (retry)="performAnalysis()"
        />
      } @else if (!latestReport()) {
        <app-empty-state
          icon="🔍"
          title="No analysis performed yet"
          subtitle="Click 'Analyze Database' to start scanning for data inconsistencies"
          [showAction]="true"
          actionText="Start Analysis"
          (action)="performAnalysis()"
        />
      } @else {
        <!-- Analysis Results -->
        @if (latestReport(); as report) {
          <!-- Overview Stats -->
          <section class="stats-overview">
            <div class="section-header">
              <h2>📊 Analysis Overview</h2>
            </div>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-value">{{ report.totalUsers }}</div>
                <div class="stat-label">Total Users</div>
              </div>
              <div class="stat-card" [class.has-issues]="report.usersWithInconsistencies > 0">
                <div class="stat-value">{{ report.usersWithInconsistencies }}</div>
                <div class="stat-label">Users with Issues</div>
              </div>
              <div class="stat-card" [class.has-issues]="report.totalInconsistencies > 0">
                <div class="stat-value">{{ report.totalInconsistencies }}</div>
                <div class="stat-label">Total Issues</div>
              </div>
              <div class="stat-card" [class.can-repair]="report.canAutoRepairCount > 0">
                <div class="stat-value">{{ report.canAutoRepairCount }}</div>
                <div class="stat-label">Auto-Repairable</div>
              </div>
            </div>
          </section>

          <!-- Orphaned Records Summary -->
          @if (hasOrphanedRecords(report)) {
            <section class="orphaned-summary">
              <div class="section-header">
                <h2>🗑️ Orphaned Records</h2>
                <p class="section-subtitle">Records that reference deleted users</p>
              </div>
              <div class="orphaned-grid">
                <div class="orphaned-item" [class.has-orphans]="report.orphanedRecords.checkins > 0">
                  <div class="orphaned-count">{{ report.orphanedRecords.checkins }}</div>
                  <div class="orphaned-label">Orphaned Check-ins</div>
                </div>
                <div class="orphaned-item" [class.has-orphans]="report.orphanedRecords.pointsTransactions > 0">
                  <div class="orphaned-count">{{ report.orphanedRecords.pointsTransactions }}</div>
                  <div class="orphaned-label">Orphaned Points</div>
                </div>
                <div class="orphaned-item" [class.has-orphans]="report.orphanedRecords.earnedBadges > 0">
                  <div class="orphaned-count">{{ report.orphanedRecords.earnedBadges }}</div>
                  <div class="orphaned-label">Orphaned Badges</div>
                </div>
                <div class="orphaned-item" [class.has-orphans]="report.orphanedRecords.landlords > 0">
                  <div class="orphaned-count">{{ report.orphanedRecords.landlords }}</div>
                  <div class="orphaned-label">Orphaned Landlords</div>
                </div>
              </div>
            </section>
          }

          <!-- Inconsistency Types Breakdown -->
          @if (getObjectKeys(report.inconsistenciesByType).length > 0) {
            <section class="inconsistency-types">
              <div class="section-header">
                <h2>📋 Issue Types</h2>
              </div>
              <div class="types-grid">
                @for (type of getObjectKeys(report.inconsistenciesByType); track type) {
                  <div class="type-item">
                    <div class="type-count">{{ report.inconsistenciesByType[type] }}</div>
                    <div class="type-label">{{ formatInconsistencyType(type) }}</div>
                  </div>
                }
              </div>
            </section>
          }

          <!-- Detailed Issues Table -->
          @if (inconsistenciesToDisplay().length > 0) {
            <section class="inconsistencies-section">
              <div class="section-header">
                <h2>🐛 Detailed Issues</h2>
                <div class="table-controls">
                  <label class="filter-control">
                    <select (change)="onSeverityFilterChange($event)" [value]="severityFilter()">
                      <option value="">All Severities</option>
                      <option value="critical">Critical Only</option>
                      <option value="high">High Only</option>
                      <option value="medium">Medium Only</option>
                      <option value="low">Low Only</option>
                    </select>
                  </label>
                  <label class="filter-control">
                    <input
                      type="checkbox"
                      [checked]="showOnlyRepairable()"
                      (change)="toggleRepairableFilter()"
                    />
                    Show only auto-repairable
                  </label>
                </div>
              </div>

              <div class="table-container">
                <app-data-table
                  [data]="inconsistenciesToDisplay()"
                  [columns]="inconsistencyTableColumns"
                  [loading]="repairing()"
                  trackBy="id"
                />
              </div>
            </section>
          } @else {
            <section class="no-issues">
              <app-empty-state
                icon="✅"
                title="No Data Issues Found"
                subtitle="Your database appears to be consistent!"
              />
            </section>
          }

          <!-- User Data Details (Expandable) -->
          @if (report.userSummaries.length > 0) {
            <details class="user-details-section">
              <summary class="details-summary">
                👤 User-by-User Analysis ({{ report.userSummaries.length }} users with issues)
              </summary>
              <div class="user-summaries">
                @for (userSummary of report.userSummaries; track userSummary.userId) {
                  <div class="user-summary-card">
                    <div class="user-header">
                      <h4>{{ userSummary.userName }}</h4>
                      <span class="user-id">{{ userSummary.userId.slice(-8) }}</span>
                      <span class="issue-count">{{ userSummary.inconsistencies.length }} issues</span>
                    </div>
                    
                    <div class="data-comparison">
                      <div class="comparison-section">
                        <h5>📝 Summary Data (User Document)</h5>
                        <div class="data-grid">
                          <div class="data-item">
                            <span class="data-label">Total Points:</span>
                            <span class="data-value">{{ userSummary.summary.totalPoints }}</span>
                          </div>
                          <div class="data-item">
                            <span class="data-label">Verified Pubs:</span>
                            <span class="data-value">{{ userSummary.summary.verifiedPubCount }}</span>
                          </div>
                          <div class="data-item">
                            <span class="data-label">Total Pubs:</span>
                            <span class="data-value">{{ userSummary.summary.totalPubCount }}</span>
                          </div>
                          <div class="data-item">
                            <span class="data-label">Badges:</span>
                            <span class="data-value">{{ userSummary.summary.badgeCount }}</span>
                          </div>
                        </div>
                      </div>

                      <div class="comparison-section">
                        <h5>🔢 Calculated Data (From Collections)</h5>
                        <div class="data-grid">
                          <div class="data-item" [class.mismatch]="userSummary.summary.totalPoints !== userSummary.calculated.totalPointsFromTransactions">
                            <span class="data-label">Total Points:</span>
                            <span class="data-value">{{ userSummary.calculated.totalPointsFromTransactions }}</span>
                          </div>
                          <div class="data-item" [class.mismatch]="userSummary.summary.verifiedPubCount !== userSummary.calculated.verifiedPubCountFromCheckins">
                            <span class="data-label">Check-ins:</span>
                            <span class="data-value">{{ userSummary.calculated.verifiedPubCountFromCheckins }}</span>
                          </div>
                          <div class="data-item">
                            <span class="data-label">Unique Pubs:</span>
                            <span class="data-value">{{ userSummary.calculated.uniquePubsFromCheckins }}</span>
                          </div>
                          <div class="data-item" [class.mismatch]="userSummary.summary.badgeCount !== userSummary.calculated.badgeCountFromEarned">
                            <span class="data-label">Badges:</span>
                            <span class="data-value">{{ userSummary.calculated.badgeCountFromEarned }}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="user-issues">
                      @for (issue of userSummary.inconsistencies; track issue.id) {
                        <div class="issue-item" [class]="issue.severity">
                          <div class="issue-description">{{ issue.description }}</div>
                          @if (issue.canAutoRepair) {
                            <app-button
                              variant="success"
                              size="xs"
                              [loading]="repairingIssue() === issue.id"
                              (onClick)="repairSingleIssue(issue)"
                              [disabled]="repairing()"
                            >
                              🔧 Fix
                            </app-button>
                          }
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            </details>
          }
        }
      }
    </div>
  `,
  styles: `
    .data-integrity {
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

    .control-group {
      display: flex;
      gap: 1rem;
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: 1rem;
    }

    .scan-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
      font-size: 0.9rem;
      color: var(--text-secondary);
    }

    /* Stats Overview */
    .stats-overview {
      margin-bottom: 2rem;
    }

    .section-header {
      margin-bottom: 1.5rem;
    }

    .section-header h2 {
      margin: 0 0 0.5rem;
      color: var(--text);
      font-size: 1.25rem;
    }

    .section-subtitle {
      margin: 0;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    .stat-card {
      background: var(--background-lighter);
      border-radius: 8px;
      padding: 1.5rem;
      text-align: center;
      border: 1px solid var(--border);
      transition: all 0.2s ease;
    }

    .stat-card.has-issues {
      border-color: var(--warning);
      background: color-mix(in srgb, var(--warning) 10%, var(--background-lighter));
    }

    .stat-card.can-repair {
      border-color: var(--success);
      background: color-mix(in srgb, var(--success) 10%, var(--background-lighter));
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 0.5rem;
    }

    .stat-label {
      color: var(--text-secondary);
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Orphaned Records */
    .orphaned-summary {
      background: var(--background-lighter);
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      border: 1px solid var(--border);
    }

    .orphaned-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
    }

    .orphaned-item {
      background: var(--background);
      border-radius: 6px;
      padding: 1rem;
      text-align: center;
      border: 1px solid var(--border);
    }

    .orphaned-item.has-orphans {
      border-color: var(--error);
      background: color-mix(in srgb, var(--error) 10%, var(--background));
    }

    .orphaned-count {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 0.25rem;
    }

    .orphaned-item.has-orphans .orphaned-count {
      color: var(--error);
    }

    .orphaned-label {
      color: var(--text-secondary);
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Inconsistency Types */
    .inconsistency-types {
      background: var(--background-lighter);
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      border: 1px solid var(--border);
    }

    .types-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    .type-item {
      background: var(--background);
      border-radius: 6px;
      padding: 1rem;
      text-align: center;
      border: 1px solid var(--border);
    }

    .type-count {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 0.25rem;
    }

    .type-label {
      color: var(--text-secondary);
      font-size: 0.85rem;
    }

    /* Inconsistencies Section */
    .inconsistencies-section {
      background: var(--background-lighter);
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      border: 1px solid var(--border);
    }

    .table-controls {
      display: flex;
      gap: 1rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .filter-control {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .filter-control select {
      padding: 0.25rem 0.5rem;
      border: 1px solid var(--border);
      border-radius: 4px;
      background: var(--background);
      color: var(--text);
    }

    .table-container {
      margin-top: 1rem;
    }

    /* No Issues State */
    .no-issues {
      background: var(--background-lighter);
      border-radius: 8px;
      padding: 2rem;
      border: 1px solid var(--success);
      background: color-mix(in srgb, var(--success) 10%, var(--background-lighter));
    }

    /* User Details Section */
    .user-details-section {
      background: var(--background-lighter);
      border-radius: 8px;
      border: 1px solid var(--border);
      margin-bottom: 2rem;
    }

    .details-summary {
      padding: 1.5rem;
      cursor: pointer;
      font-weight: 600;
      color: var(--text);
      border-bottom: 1px solid var(--border);
    }

    .details-summary:hover {
      background: var(--background);
    }

    .user-summaries {
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .user-summary-card {
      background: var(--background);
      border-radius: 6px;
      padding: 1.5rem;
      border: 1px solid var(--border);
    }

    .user-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }

    .user-header h4 {
      margin: 0;
      color: var(--text);
    }

    .user-id {
      font-family: 'Courier New', monospace;
      font-size: 0.8rem;
      background: var(--background-darker);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      color: var(--text-secondary);
    }

    .issue-count {
      background: var(--warning);
      color: var(--background);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    /* Data Comparison */
    .data-comparison {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .comparison-section h5 {
      margin: 0 0 0.75rem;
      color: var(--text);
      font-size: 0.9rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--border);
    }

    .data-grid {
      display: grid;
      gap: 0.5rem;
    }

    .data-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem;
      background: var(--background-lighter);
      border-radius: 4px;
    }

    .data-item.mismatch {
      background: color-mix(in srgb, var(--error) 15%, var(--background-lighter));
      border: 1px solid color-mix(in srgb, var(--error) 30%, transparent);
    }

    .data-label {
      font-size: 0.85rem;
      color: var(--text-secondary);
    }

    .data-value {
      font-weight: 600;
      color: var(--text);
    }

    .data-item.mismatch .data-value {
      color: var(--error);
    }

    /* User Issues */
    .user-issues {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .issue-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      border-radius: 4px;
      gap: 1rem;
    }

    .issue-item.critical {
      background: color-mix(in srgb, var(--error) 15%, var(--background-lighter));
      border: 1px solid var(--error);
    }

    .issue-item.high {
      background: color-mix(in srgb, var(--warning) 15%, var(--background-lighter));
      border: 1px solid var(--warning);
    }

    .issue-item.medium {
      background: color-mix(in srgb, var(--info) 15%, var(--background-lighter));
      border: 1px solid var(--info);
    }

    .issue-item.low {
      background: var(--background-lighter);
      border: 1px solid var(--border);
    }

    .issue-description {
      flex: 1;
      font-size: 0.9rem;
      color: var(--text);
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .data-integrity {
        padding: 0.5rem;
      }

      .stats-grid, .orphaned-grid, .types-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .data-comparison {
        grid-template-columns: 1fr;
      }

      .control-group {
        flex-direction: column;
        align-items: stretch;
      }

      .table-controls {
        flex-direction: column;
        align-items: stretch;
      }

      .user-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .issue-item {
        flex-direction: column;
        align-items: stretch;
        text-align: center;
      }
    }
  `
})
export class DataIntegrityComponent extends BaseComponent {
  private readonly dataIntegrityService = inject(DataIntegrityService);

  // State management
  readonly scanning = signal(false);
  readonly repairing = signal(false);
  readonly repairingIssue = signal<string | null>(null);
  readonly latestReport = signal<IntegrityReport | null>(null);

  // Filters
  readonly severityFilter = signal<string>('');
  readonly showOnlyRepairable = signal(false);

  // Table configuration
  readonly inconsistencyTableColumns: TableColumn[] = [
    {
      key: 'userName',
      label: 'User',
      sortable: true,
      className: 'user-cell'
    },
    {
      key: 'type',
      label: 'Issue Type',
      sortable: true,
      className: 'type-cell'
    },
    {
      key: 'severityDisplay',
      label: 'Severity',
      sortable: true,
      className: 'severity-cell'
    },
    {
      key: 'description',
      label: 'Description',
      sortable: false,
      className: 'description-cell'
    },
    {
      key: 'canRepairDisplay',
      label: 'Auto-Repair',
      sortable: true,
      className: 'repair-cell'
    }
  ];

  // Computed data
  readonly inconsistenciesToDisplay = computed((): InconsistencyWithActions[] => {
    const report = this.latestReport();
    if (!report) return [];

    let inconsistencies = report.userSummaries.flatMap(us => us.inconsistencies);

    // Apply severity filter
    const severityFilter = this.severityFilter();
    if (severityFilter) {
      inconsistencies = inconsistencies.filter(inc => inc.severity === severityFilter);
    }

    // Apply repairable filter
    if (this.showOnlyRepairable()) {
      inconsistencies = inconsistencies.filter(inc => inc.canAutoRepair);
    }

    return inconsistencies.map(inc => ({
      ...inc,
      repairStatusText: inc.canAutoRepair ? '✅ Yes' : '❌ Manual',
      severityDisplay: this.formatSeverity(inc.severity),
      canRepairDisplay: inc.canAutoRepair ? '✅ Yes' : '❌ No'
    }));
  });

  readonly autoRepairableCount = computed(() => {
    const report = this.latestReport();
    if (!report) return 0;
    return report.canAutoRepairCount;
  });

  // Actions
  async performAnalysis(): Promise<void> {
    this.scanning.set(true);
    this.error.set(null);

    try {
      console.log('[DataIntegrityComponent] 🔍 Starting database analysis...');
      const report = await this.dataIntegrityService.analyzeDataIntegrity();
      this.latestReport.set(report);
      
      if (report.totalInconsistencies === 0) {
        this.showSuccess('✅ Database analysis complete - no issues found!');
      } else {
        this.showSuccess(`📊 Analysis complete - found ${report.totalInconsistencies} issues across ${report.usersWithInconsistencies} users`);
      }

    } catch (error: any) {
      console.error('[DataIntegrityComponent] ❌ Analysis failed:', error);
      this.error.set(`Analysis failed: ${error?.message || 'Unknown error'}`);
    } finally {
      this.scanning.set(false);
    }
  }

  async repairSingleIssue(inconsistency: DataInconsistency): Promise<void> {
    this.repairingIssue.set(inconsistency.id);

    try {
      console.log(`[DataIntegrityComponent] 🔧 Repairing issue: ${inconsistency.id}`);
      const result = await this.dataIntegrityService.repairInconsistency(inconsistency);
      
      if (result.success) {
        this.showSuccess(`✅ Fixed: ${inconsistency.type} for ${inconsistency.userName}`);
        // Re-run analysis to update the display
        await this.performAnalysis();
      } else {
        this.showError(`❌ Repair failed: ${result.error}`);
      }

    } catch (error: any) {
      console.error('[DataIntegrityComponent] ❌ Repair failed:', error);
      this.showError(`Repair failed: ${error?.message || 'Unknown error'}`);
    } finally {
      this.repairingIssue.set(null);
    }
  }

  async repairAllAutoRepairableIssues(): Promise<void> {
    const report = this.latestReport();
    if (!report) return;

    const autoRepairableIssues = report.userSummaries
      .flatMap(us => us.inconsistencies)
      .filter(inc => inc.canAutoRepair);

    if (autoRepairableIssues.length === 0) {
      this.showError('No auto-repairable issues found');
      return;
    }

    if (!confirm(`🔧 Auto-repair ${autoRepairableIssues.length} issues?\n\nThis will update user summary fields to match calculated values from transactional data. This action cannot be undone.\n\nContinue?`)) {
      return;
    }

    this.repairing.set(true);

    try {
      console.log(`[DataIntegrityComponent] 🔧 Batch repairing ${autoRepairableIssues.length} issues...`);
      
      let successCount = 0;
      let failureCount = 0;

      for (const issue of autoRepairableIssues) {
        try {
          const result = await this.dataIntegrityService.repairInconsistency(issue);
          if (result.success) {
            successCount++;
          } else {
            failureCount++;
            console.error(`[DataIntegrityComponent] Failed to repair ${issue.id}:`, result.error);
          }
        } catch (error) {
          failureCount++;
          console.error(`[DataIntegrityComponent] Exception repairing ${issue.id}:`, error);
        }
      }

      if (failureCount === 0) {
        this.showSuccess(`✅ Successfully repaired all ${successCount} issues!`);
      } else {
        this.showSuccess(`⚠️ Repaired ${successCount} issues, but ${failureCount} failed. Check console for details.`);
      }

      // Re-run analysis to update the display
      await this.performAnalysis();

    } catch (error: any) {
      console.error('[DataIntegrityComponent] ❌ Batch repair failed:', error);
      this.showError(`Batch repair failed: ${error?.message || 'Unknown error'}`);
    } finally {
      this.repairing.set(false);
    }
  }

  onSeverityFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.severityFilter.set(target.value);
  }

  toggleRepairableFilter(): void {
    this.showOnlyRepairable.update(current => !current);
  }

  // Utility methods
  formatScanTime(timestamp: number): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(timestamp));
  }

  formatSeverity(severity: string): string {
    const severityMap = {
      'critical': '🔴 Critical',
      'high': '🟠 High',
      'medium': '🟡 Medium',
      'low': '🟢 Low'
    };
    return severityMap[severity as keyof typeof severityMap] || severity;
  }

  formatInconsistencyType(type: string): string {
    const typeMap = {
      'points-mismatch': 'Points Mismatch',
      'pub-count-mismatch': 'Pub Count Mismatch',
      'badge-count-mismatch': 'Badge Count Mismatch',
      'missing-user-summary': 'Missing Summary Fields',
      'orphaned-checkin': 'Orphaned Check-in',
      'orphaned-transaction': 'Orphaned Transaction'
    };
    return typeMap[type as keyof typeof typeMap] || type;
  }

  hasOrphanedRecords(report: IntegrityReport): boolean {
    return Object.values(report.orphanedRecords).some(count => count > 0);
  }

  getObjectKeys(obj: Record<string, any>): string[] {
    return Object.keys(obj);
  }
}