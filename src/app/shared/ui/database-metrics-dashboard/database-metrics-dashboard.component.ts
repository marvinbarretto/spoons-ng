// src/app/shared/ui/database-metrics-dashboard/database-metrics-dashboard.component.ts
import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatabaseMetricsService } from '../../data-access/database-metrics.service';
import { FirebaseMetricsService } from '../../data-access/firebase-metrics.service';

@Component({
  selector: 'app-database-metrics-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="metrics-dashboard">
      <header class="dashboard-header">
        <h2>Database Metrics Dashboard</h2>
        <button
          class="reset-btn"
          (click)="resetMetrics()"
          [disabled]="isResetting()"
        >
          {{ isResetting() ? 'Resetting...' : 'Reset Metrics' }}
        </button>
      </header>

      <!-- Performance Overview -->
      <section class="metrics-section">
        <h3>Performance Overview</h3>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value">{{ formatLatency(performance().avgIndexedDbLatency) }}</div>
            <div class="metric-label">Avg Cache Read Time</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{{ formatLatency(performance().avgFirestoreLatency) }}</div>
            <div class="metric-label">Avg Firestore Time</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{{ formatPercentage(cacheEffectiveness().hitRatio) }}</div>
            <div class="metric-label">Cache Hit Ratio</div>
          </div>
          <div class="metric-card performance-boost">
            <div class="metric-value">{{ formatMultiplier(cacheEffectiveness().speedImprovement) }}</div>
            <div class="metric-label">Speed Improvement</div>
          </div>
        </div>
      </section>

      <!-- Cost Analysis -->
      <section class="metrics-section">
        <h3>Cost Analysis</h3>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value">&dollar;{{ formatCurrency(costs().firestore.monthlyCost) }}</div>
            <div class="metric-label">Current Monthly Cost</div>
            <div class="metric-detail">{{ costs().firestore.reads }} reads, {{ costs().firestore.writes }} writes</div>
          </div>
          <div class="metric-card savings">
            <div class="metric-value">&dollar;{{ formatCurrency(costs().savings.monthlySavings) }}</div>
            <div class="metric-label">Monthly Savings</div>
            <div class="metric-detail">{{ costs().savings.preventedReads }} prevented reads</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{{ formatPercentage(cacheEffectiveness().costSavingsPercentage) }}</div>
            <div class="metric-label">Cost Reduction</div>
          </div>
        </div>
      </section>

      <!-- Usage Statistics -->
      <section class="metrics-section">
        <h3>Usage Statistics</h3>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value">{{ performance().totalOperations }}</div>
            <div class="metric-label">Total Operations</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{{ performance().operationsToday }}</div>
            <div class="metric-label">Operations Today</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{{ formatBytes(estimatedStorageSize()) }}</div>
            <div class="metric-label">Cache Storage Used</div>
          </div>
        </div>
      </section>

      <!-- Top Collections -->
      <section class="metrics-section">
        <h3>Most Active Collections</h3>
        <div class="collections-list">
          @for (collection of topCollections(); track collection.collection) {
            <div class="collection-item">
              <div class="collection-name">{{ collection.collection }}</div>
              <div class="collection-stats">
                <span class="stat">{{ collection.operations }} ops</span>
                <span class="stat">{{ formatPercentage(collection.cacheHitRatio) }} hit rate</span>
                <span class="stat">{{ collection.reads }}R / {{ collection.writes }}W</span>
              </div>
            </div>
          }
          @empty {
            <div class="no-data">No collection data available</div>
          }
        </div>
      </section>

      <!-- Daily Activity Chart -->
      <section class="metrics-section">
        <h3>Daily Activity (Last 7 Days)</h3>
        <div class="activity-chart">
          @for (day of dailyActivity(); track day.date) {
            <div class="activity-day">
              <div class="day-label">{{ formatDate(day.date) }}</div>
              <div class="day-bars">
                <div
                  class="bar firestore-bar"
                  [style.height.px]="getBarHeight(day.firestore, maxDailyOps())"
                  [title]="day.firestore + ' Firestore operations'"
                ></div>
                <div
                  class="bar cache-bar"
                  [style.height.px]="getBarHeight(day.cached, maxDailyOps())"
                  [title]="day.cached + ' cached operations'"
                ></div>
              </div>
              <div class="day-total">{{ day.firestore + day.indexeddb + day.cached }}</div>
            </div>
          }
        </div>
        <div class="chart-legend">
          <span class="legend-item"><span class="legend-color firestore"></span>Firestore</span>
          <span class="legend-item"><span class="legend-color cache"></span>Cache</span>
        </div>
      </section>

      <!-- Real-time Firebase Operations Feed -->
      <section class="metrics-section">
        <h3>🔥 Real-time Firebase Operations</h3>
        <div class="firebase-realtime">
          <div class="realtime-stats">
            <div class="realtime-stat">
              <div class="stat-value">{{ firebaseMetrics().operationsPerMinute.toFixed(1) }}</div>
              <div class="stat-label">Ops/Min</div>
            </div>
            <div class="realtime-stat">
              <div class="stat-value">{{ firebaseMetrics().errorAnalysis.totalErrors }}</div>
              <div class="stat-label">Errors</div>
            </div>
            <div class="realtime-stat">
              <div class="stat-value">{{ (performance().errorRate * 100).toFixed(1) }}%</div>
              <div class="stat-label">Error Rate</div>
            </div>
          </div>
          
          <div class="operations-feed">
            <h4>Recent Operations (Last 50)</h4>
            <div class="feed-container">
              @for (op of firebaseMetrics().recentOperations; track op.callId) {
                <div class="feed-item" 
                     [class.cached]="op.cached" 
                     [class.error]="op.error"
                     [class.slow]="op.latency && op.latency > 1000">
                  <div class="feed-timestamp">{{ formatDetailedTime(op.timestamp) }}</div>
                  <div class="feed-operation">{{ op.operation.toUpperCase() }}</div>
                  <div class="feed-collection">{{ op.collection }}</div>
                  @if (op.documentId) {
                    <div class="feed-document">{{ op.documentId }}</div>
                  }
                  @if (op.latency) {
                    <div class="feed-latency">{{ op.latency.toFixed(0) }}ms</div>
                  }
                  <div class="feed-status">
                    @if (op.error) {
                      <span class="status-error">❌ {{ op.error }}</span>
                    } @else if (op.cached) {
                      <span class="status-cached">⚡ cached</span>
                    } @else {
                      <span class="status-network">🌐 network</span>
                    }
                  </div>
                </div>
              } @empty {
                <div class="feed-empty">No operations recorded yet</div>
              }
            </div>
          </div>
        </div>
      </section>

      <!-- Cache Performance Breakdown -->
      <section class="metrics-section">
        <h3>⚡ Cache Performance Analysis</h3>
        <div class="cache-analysis">
          <div class="cache-summary">
            <div class="cache-stat-card">
              <div class="cache-stat-value">{{ formatBytes(cachePerformance().totalCacheSize) }}</div>
              <div class="cache-stat-label">Total Cache Size</div>
            </div>
            <div class="cache-stat-card">
              <div class="cache-stat-value">{{ cachePerformance().cacheSavings.operationsSaved }}</div>
              <div class="cache-stat-label">Operations Saved</div>
            </div>
            <div class="cache-stat-card">
              <div class="cache-stat-value">{{ cachePerformance().cacheSavings.timeSaved.toFixed(0) }}ms</div>
              <div class="cache-stat-label">Time Saved</div>
            </div>
            <div class="cache-stat-card">
              <div class="cache-stat-value">&dollar;{{ formatCurrency(cachePerformance().cacheSavings.costSaved) }}</div>
              <div class="cache-stat-label">Cost Saved</div>
            </div>
          </div>
          
          <div class="cache-by-collection">
            <h4>Cache Performance by Collection</h4>
            <div class="collection-cache-list">
              @for (cache of cachePerformance().cachesByCollection; track cache.collection) {
                <div class="collection-cache-item">
                  <div class="collection-cache-name">{{ cache.collection }}</div>
                  <div class="collection-cache-metrics">
                    <div class="cache-metric">
                      <span class="metric-label">Hit Ratio:</span>
                      <span class="metric-value">{{ (cache.hitRatio * 100).toFixed(1) }}%</span>
                    </div>
                    <div class="cache-metric">
                      <span class="metric-label">Hits:</span>
                      <span class="metric-value hits">{{ cache.totalHits }}</span>
                    </div>
                    <div class="cache-metric">
                      <span class="metric-label">Misses:</span>
                      <span class="metric-value misses">{{ cache.totalMisses }}</span>
                    </div>
                    <div class="cache-metric">
                      <span class="metric-label">Avg Latency:</span>
                      <span class="metric-value">{{ cache.avgLatency.toFixed(0) }}ms</span>
                    </div>
                  </div>
                </div>
              } @empty {
                <div class="no-cache-data">No cache data available</div>
              }
            </div>
          </div>
        </div>
      </section>

      <!-- Export Section -->
      <section class="metrics-section">
        <h3>Export Data</h3>
        <div class="export-controls">
          <button
            class="export-btn"
            (click)="exportMetrics()"
            [disabled]="isExporting()"
          >
            {{ isExporting() ? 'Exporting...' : 'Export Metrics JSON' }}
          </button>
          <span class="export-info">
            Export all metrics data for external analysis
          </span>
        </div>
      </section>
    </div>
  `,
  styleUrl: './database-metrics-dashboard.component.scss'
})
export class DatabaseMetricsDashboardComponent implements OnInit, OnDestroy {
  private readonly metricsService = inject(DatabaseMetricsService);
  private readonly firebaseMetricsService = inject(FirebaseMetricsService);

  // Component state
  readonly isResetting = signal(false);
  readonly isExporting = signal(false);
  private refreshInterval?: number;

  // Computed metrics
  readonly performance = this.metricsService.performanceMetrics;
  readonly costs = this.metricsService.costEstimate;
  readonly cacheEffectiveness = computed(() => this.metricsService.getCacheEffectiveness());
  readonly topCollections = computed(() => this.metricsService.getTopCollections(5));
  readonly dailyActivity = computed(() => this.metricsService.getDailyOperationCounts(7));
  readonly maxDailyOps = computed(() => {
    const daily = this.dailyActivity();
    return Math.max(...daily.map(d => d.firestore + d.indexeddb + d.cached), 1);
  });

  readonly estimatedStorageSize = computed(() => {
    // Rough estimate based on operations
    const totalOps = this.performance().totalOperations;
    return totalOps * 1024; // Estimate 1KB per operation
  });

  // Firebase-specific metrics
  readonly firebaseMetrics = computed(() => this.metricsService.getFirebaseMetrics());
  readonly cachePerformance = computed(() => this.metricsService.getCachePerformanceBreakdown());

  ngOnInit(): void {
    // Refresh metrics every 5 seconds for real-time updates
    this.refreshInterval = window.setInterval(() => {
      // Force recomputation by accessing signals
      this.performance();
      this.firebaseMetrics();
    }, 5000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  async resetMetrics(): Promise<void> {
    this.isResetting.set(true);
    try {
      this.metricsService.resetAllMetrics();
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay for UX
    } finally {
      this.isResetting.set(false);
    }
  }

  async exportMetrics(): Promise<void> {
    this.isExporting.set(true);
    try {
      const metrics = this.metricsService.exportMetrics();
      const blob = new Blob([JSON.stringify(metrics, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `database-metrics-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);

      await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay for UX
    } finally {
      this.isExporting.set(false);
    }
  }

  formatLatency(ms: number): string {
    return ms < 1 ? '<1ms' : `${Math.round(ms)}ms`;
  }

  formatPercentage(ratio: number): string {
    return `${Math.round(ratio * 100)}%`;
  }

  formatMultiplier(value: number): string {
    return value < 1 ? '1x' : `${value.toFixed(1)}x`;
  }

  formatCurrency(value: number): string {
    return value.toFixed(2);
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  getBarHeight(value: number, max: number): number {
    const maxHeight = 50; // Maximum bar height in pixels
    return max > 0 ? (value / max) * maxHeight : 0;
  }

  formatDetailedTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  }
}