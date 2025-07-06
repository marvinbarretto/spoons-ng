// src/app/admin/feature/admin-dashboard/admin-dashboard.component.ts
import { Component, inject, computed, isDevMode, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DatabaseMetricsService } from '../../../shared/data-access/database-metrics.service';
import { FirebaseMetricsService } from '../../../shared/data-access/firebase-metrics.service';
import { LeaderboardStore } from '../../../leaderboard/data-access/leaderboard.store';
import { FeedbackStore } from '../../../feedback/data-access/feedback.store';
import { DataAggregatorService } from '../../../shared/data-access/data-aggregator.service';

type AdminSection = {
  id: string;
  title: string;
  description: string;
  route: string;
  icon: string;
  status: 'active' | 'coming-soon';
  stats?: string;
};

type DataSourceType = 'real' | 'calculated' | 'placeholder';

type StatData = {
  value: string | number;
  label: string;
  sourceType: DataSourceType;
  sourceDetail: string;
  icon: string;
};

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="admin-dashboard">
      <header class="dashboard-header">
        <h1>Admin Dashboard</h1>
        <p class="dashboard-subtitle">Monitor and manage your Spoonscount application</p>
      </header>

      <!-- Quick Stats Overview -->
      <section class="stats-overview">
        <div class="section-header">
          <h2>Key Metrics</h2>
          <div class="data-legend">
            <span class="legend-item">
              <span class="legend-icon">✅</span>
              Real Data
            </span>
            <span class="legend-item">
              <span class="legend-icon">⚠️</span>
              Calculated
            </span>
            <span class="legend-item">
              <span class="legend-icon">🔶</span>
              Placeholder
            </span>
          </div>
        </div>
        <div class="stats-grid">
          @for (stat of dashboardStats(); track stat.label) {
            <div class="stat-card" [attr.data-source]="stat.sourceType">
              <div class="stat-header">
                <span class="data-source-icon" [title]="stat.sourceDetail">{{ stat.icon }}</span>
                @if (isDevMode()) {
                  <span class="debug-badge">{{ stat.sourceType }}</span>
                }
              </div>
              <div class="stat-value">{{ stat.value }}</div>
              <div class="stat-label">{{ stat.label }}</div>
              @if (isDevMode()) {
                <div class="debug-source">{{ stat.sourceDetail }}</div>
              }
            </div>
          }
        </div>
      </section>

      <!-- Admin Sections -->
      <section class="admin-sections">
        <h2>Admin Tools</h2>
        <div class="sections-grid">
          @for (section of adminSections; track section.id) {
            <div
              class="admin-card"
              [class.active]="section.status === 'active'"
              [class.coming-soon]="section.status === 'coming-soon'"
            >
              @if (section.status === 'active') {
                <a [routerLink]="section.route" class="card-link">
                  <div class="card-icon">{{ section.icon }}</div>
                  <div class="card-content">
                    <h3>{{ section.title }}</h3>
                    <p>{{ section.description }}</p>
                    @if (section.stats) {
                      <div class="card-stats">{{ section.stats }}</div>
                    }
                  </div>
                  <div class="card-arrow">→</div>
                </a>
              } @else {
                <div class="card-disabled">
                  <div class="card-icon">{{ section.icon }}</div>
                  <div class="card-content">
                    <h3>{{ section.title }}</h3>
                    <p>{{ section.description }}</p>
                    <div class="coming-soon-badge">Coming Soon</div>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </section>

      <!-- Firebase Operations Widget -->
      @if (showFirebaseWidget()) {
        <section class="firebase-operations-section">
          <div class="section-header">
            <h2>🔥 Firebase Operations Monitor</h2>
            <div class="firebase-controls">
              <button
                class="clear-cache-btn"
                (click)="clearFirebaseCache()"
                title="Clear Firebase cache and reset metrics"
              >
                🗑️ Clear Cache
              </button>
              <a
                class="metrics-link"
                routerLink="/admin/metrics"
                title="View detailed metrics"
              >
                📊 Detailed Metrics
              </a>
            </div>
          </div>
          
          <div class="firebase-grid">
            <!-- Operations Summary -->
            <div class="firebase-card operations-summary">
              <h3>📈 Live Operations</h3>
              <div class="firebase-stats">
                <div class="firebase-stat">
                  <div class="firebase-value">{{ firebaseOperations().totalOperations }}</div>
                  <div class="firebase-label">Total Operations</div>
                </div>
                <div class="firebase-stat">
                  <div class="firebase-value">{{ firebaseOperations().operationsPerMinute.toFixed(1) }}</div>
                  <div class="firebase-label">Ops/Min</div>
                </div>
                <div class="firebase-stat">
                  <div class="firebase-value">{{ (firebaseOperations().averageLatency || 0).toFixed(0) }}ms</div>
                  <div class="firebase-label">Avg Latency</div>
                </div>
              </div>
            </div>

            <!-- Cache Performance -->
            <div class="firebase-card cache-performance">
              <h3>⚡ Cache Performance</h3>
              <div class="cache-metrics">
                <div class="cache-ratio">
                  <div class="ratio-circle" [style.--ratio]="firebaseOperations().cacheHitRatio">
                    <span class="ratio-text">{{ (firebaseOperations().cacheHitRatio * 100).toFixed(0) }}%</span>
                  </div>
                  <div class="ratio-label">Hit Ratio</div>
                </div>
                <div class="cache-details">
                  <div class="cache-detail">
                    <span class="cache-icon">✅</span>
                    <span>Cache Hits</span>
                  </div>
                  <div class="cache-detail">
                    <span class="cache-icon">🔄</span>
                    <span>Speed Boost: {{ cacheEffectiveness().speedImprovement.toFixed(1) }}x</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Top Collections -->
            <div class="firebase-card top-collections">
              <h3>🏆 Top Collections</h3>
              <div class="collections-list">
                @for (collection of firebaseOperations().topCollections; track collection.collection) {
                  <div class="collection-row">
                    <div class="collection-name">{{ collection.collection }}</div>
                    <div class="collection-stats">
                      <span class="collection-ops">{{ collection.operations }} ops</span>
                      <span class="collection-cache">{{ (collection.cacheHitRatio * 100).toFixed(0) }}% cached</span>
                    </div>
                  </div>
                } @empty {
                  <div class="no-collections">No operations yet</div>
                }
              </div>
            </div>

            <!-- Error Tracking -->
            <div class="firebase-card error-tracking">
              <h3>⚠️ Error Monitor</h3>
              <div class="error-stats">
                <div class="error-summary">
                  <div class="error-rate" [class.has-errors]="firebaseOperations().errorRate > 0">
                    {{ (firebaseOperations().errorRate * 100).toFixed(1) }}%
                  </div>
                  <div class="error-label">Error Rate</div>
                </div>
                <div class="error-details">
                  @if (firebaseOperations().totalErrors > 0) {
                    <div class="error-count">{{ firebaseOperations().totalErrors }} total errors</div>
                  } @else {
                    <div class="no-errors">✅ No errors detected</div>
                  }
                </div>
              </div>
            </div>
          </div>

          <!-- Recent Operations -->
          <div class="recent-operations">
            <h3>📋 Recent Operations (Last 10)</h3>
            <div class="operations-list">
              @for (op of firebaseOperations().recentOperations; track op.callId) {
                <div class="operation-item" [class.cached]="op.cached" [class.error]="op.error">
                  <div class="operation-type">{{ op.operation.toUpperCase() }}</div>
                  <div class="operation-collection">{{ op.collection }}</div>
                  @if (op.latency) {
                    <div class="operation-latency">{{ op.latency.toFixed(0) }}ms</div>
                  }
                  @if (op.cached) {
                    <div class="operation-cache">⚡ cached</div>
                  }
                  @if (op.error) {
                    <div class="operation-error">❌ {{ op.error }}</div>
                  }
                  <div class="operation-time">{{ formatTime(op.timestamp) }}</div>
                </div>
              } @empty {
                <div class="no-operations">No recent operations</div>
              }
            </div>
          </div>
        </section>
      }

      <!-- System Status -->
      <section class="system-status">
        <h2>System Status</h2>
        <div class="status-grid">
          <div class="status-item">
            <div class="status-indicator active"></div>
            <div class="status-info">
              <div class="status-title">Database 🔶</div>
              <div class="status-detail">Operational (hardcoded)</div>
            </div>
            @if (isDevMode()) {
              <div class="debug-badge">placeholder</div>
            }
          </div>
          <div class="status-item">
            <div class="status-indicator active"></div>
            <div class="status-info">
              <div class="status-title">Cache ✅</div>
              <div class="status-detail">{{ cacheHitRatio() }}% hit rate</div>
            </div>
            @if (isDevMode()) {
              <div class="debug-badge">real</div>
            }
          </div>
          <div class="status-item">
            <div class="status-indicator warning"></div>
            <div class="status-info">
              <div class="status-title">Monitoring ✅</div>
              <div class="status-detail">Tracking {{ totalOperations() }} operations</div>
            </div>
            @if (isDevMode()) {
              <div class="debug-badge">real</div>
            }
          </div>
        </div>
      </section>

      <!-- Detailed Data Debug Section -->
      <section class="data-debug-section">
        <h2>🔍 Data Source Debug (Show Your Working)</h2>

        <div class="debug-grid">
          <!-- LeaderboardStore Debug -->
          <div class="debug-card">
            <h3>LeaderboardStore Analysis</h3>
            <div class="debug-content">
              <div class="debug-item">
                <strong>Loading State:</strong> {{ leaderboardStore.loading() }}
              </div>
              <div class="debug-item">
                <strong>Error State:</strong> {{ leaderboardStore.error() || 'None' }}
              </div>
              <div class="debug-item">
                <strong>Raw siteStats:</strong>
                <pre>{{ formatJSON(siteStats()) }}</pre>
              </div>
              <div class="debug-item">
                <strong>Raw globalDataStats:</strong>
                <pre>{{ formatJSON(globalDataStats()) }}</pre>
              </div>
            </div>
          </div>

          <!-- FeedbackStore Debug -->
          <div class="debug-card">
            <h3>FeedbackStore Analysis</h3>
            <div class="debug-content">
              <div class="debug-item">
                <strong>Loading State:</strong> {{ feedbackStore.loading() }}
              </div>
              <div class="debug-item">
                <strong>Error State:</strong> {{ feedbackStore.error() || 'None' }}
              </div>
              <div class="debug-item">
                <strong>Total Feedback Items:</strong> {{ feedbackStore.data().length }}
              </div>
              <div class="debug-item">
                <strong>Pending Feedback:</strong> {{ feedbackStore.pendingFeedback().length }}
              </div>
              <div class="debug-item">
                <strong>Resolved Feedback:</strong> {{ feedbackStore.resolvedFeedback().length }}
              </div>
              <div class="debug-item">
                <strong>Raw Feedback Data:</strong>
                <pre>{{ formatJSON(feedbackStore.data().slice(0, 3)) }}...</pre>
              </div>
            </div>
          </div>

          <!-- DataAggregator Debug -->
          <div class="debug-card">
            <h3>DataAggregatorService Analysis</h3>
            <div class="debug-content">
              <div class="debug-item">
                <strong>Raw scoreboardData:</strong>
                <pre>{{ formatJSON(scoreboardData()) }}</pre>
              </div>
            </div>
          </div>

          <!-- DatabaseMetrics Debug -->
          <div class="debug-card">
            <h3>DatabaseMetricsService Analysis</h3>
            <div class="debug-content">
              <div class="debug-item">
                <strong>Performance Metrics:</strong>
                <pre>{{ formatJSON(performanceMetrics()) }}</pre>
              </div>
              <div class="debug-item">
                <strong>Cost Estimate:</strong>
                <pre>{{ formatJSON(costEstimate()) }}</pre>
              </div>
            </div>
          </div>
        </div>

        <!-- Store Loading Status Summary -->
        <div class="loading-status-summary">
          <h3>Store Loading Status Summary</h3>
          <div class="status-items">
            <div class="status-item-debug" [class.loading]="leaderboardStore.loading()" [class.error]="leaderboardStore.error()">
              <span class="store-name">LeaderboardStore:</span>
              <span class="store-status">
                @if (leaderboardStore.loading()) {
                  🔄 Loading...
                } @else if (leaderboardStore.error()) {
                  ❌ Error: {{ leaderboardStore.error() }}
                } @else {
                  ✅ Loaded
                }
              </span>
            </div>

            <div class="status-item-debug" [class.loading]="feedbackStore.loading()" [class.error]="feedbackStore.error()">
              <span class="store-name">FeedbackStore:</span>
              <span class="store-status">
                @if (feedbackStore.loading()) {
                  🔄 Loading...
                } @else if (feedbackStore.error()) {
                  ❌ Error: {{ feedbackStore.error() }}
                } @else {
                  ✅ Loaded ({{ feedbackStore.data().length }} items)
                }
              </span>
            </div>
          </div>
        </div>

        <!-- Raw Data Inspection -->
        <div class="raw-data-inspection">
          <h3>Raw Data Inspection</h3>
          <div class="inspection-grid">
            <div class="inspection-item">
              <strong>Auth State:</strong> Check if user is authenticated and has data access
            </div>
            <div class="inspection-item">
              <strong>Firestore Rules:</strong> Verify admin permissions for reading all collections
            </div>
            <div class="inspection-item">
              <strong>Data Existence:</strong> Check if collections exist in Firestore database
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent {
  private readonly metricsService = inject(DatabaseMetricsService);
  private readonly firebaseMetricsService = inject(FirebaseMetricsService);
  protected readonly leaderboardStore = inject(LeaderboardStore);
  protected readonly feedbackStore = inject(FeedbackStore);
  private readonly dataAggregator = inject(DataAggregatorService);

  // Firebase operations state
  readonly showFirebaseWidget = signal(true);

  // Computed stats from metrics service
  readonly performanceMetrics = this.metricsService.performanceMetrics;
  readonly costEstimate = this.metricsService.costEstimate;

  // Real business data from stores
  readonly siteStats = this.leaderboardStore.siteStats;
  readonly globalDataStats = this.leaderboardStore.globalDataStats;
  readonly pendingFeedback = this.feedbackStore.pendingFeedback;
  readonly scoreboardData = this.dataAggregator.scoreboardData;

  readonly totalOperations = computed(() => {
    const value = this.performanceMetrics().totalOperations;
    console.log('🔍 [AdminDashboard] totalOperations from DatabaseMetricsService.performanceMetrics:', value);
    return value;
  });

  readonly operationsToday = computed(() => {
    const value = this.performanceMetrics().operationsToday;
    console.log('🔍 [AdminDashboard] operationsToday from DatabaseMetricsService.performanceMetrics:', value);
    return value;
  });

  readonly cacheHitRatio = computed(() => {
    const rawValue = this.performanceMetrics().cacheHitRatio;
    const value = Math.round(rawValue * 100);
    console.log('🔍 [AdminDashboard] cacheHitRatio from DatabaseMetricsService.performanceMetrics:', { raw: rawValue, rounded: value });
    return value;
  });

  readonly monthlyCost = computed(() => {
    const value = this.costEstimate().firestore.monthlyCost.toFixed(2);
    console.log('🔍 [AdminDashboard] monthlyCost from DatabaseMetricsService.costEstimate:', value);
    return value;
  });

  readonly dashboardStats = computed((): StatData[] => {
    const siteData = this.siteStats();
    const globalData = this.globalDataStats();
    const pendingCount = this.pendingFeedback().length;
    const allFeedback = this.feedbackStore.data();
    const scoreboardData = this.scoreboardData();

    const stats: StatData[] = [
      // Business Metrics (Real Data)
      {
        value: siteData.allTime.users,
        label: 'Total Users',
        sourceType: siteData.allTime.users > 0 ? 'real' : 'placeholder',
        sourceDetail: `LeaderboardStore.siteStats.allTime.users | Raw siteData: ${JSON.stringify(siteData.allTime)}`,
        icon: siteData.allTime.users > 0 ? '✅' : '🔶'
      },
      {
        value: siteData.allTime.checkins,
        label: 'Total Check-ins',
        sourceType: siteData.allTime.checkins > 0 ? 'real' : 'placeholder',
        sourceDetail: `LeaderboardStore.siteStats.allTime.checkins | Monthly: ${siteData.thisMonth.checkins}`,
        icon: siteData.allTime.checkins > 0 ? '✅' : '🔶'
      },
      {
        value: siteData.allTime.pubsConquered,
        label: 'Pubs Visited',
        sourceType: siteData.allTime.pubsConquered > 0 ? 'real' : 'placeholder',
        sourceDetail: `LeaderboardStore.siteStats.allTime.pubsConquered | Total pubs in system: ${siteData.allTime.totalPubsInSystem}`,
        icon: siteData.allTime.pubsConquered > 0 ? '✅' : '🔶'
      },
      {
        value: pendingCount,
        label: 'Pending Feedback',
        sourceType: allFeedback.length > 0 ? 'real' : 'placeholder',
        sourceDetail: `FeedbackStore.pendingFeedback.length | Total feedback: ${allFeedback.length}, Loading: ${this.feedbackStore.loading()}, Error: ${this.feedbackStore.error()}`,
        icon: allFeedback.length > 0 ? '✅' : '🔶'
      },
      // Activity Metrics (Real Data)
      {
        value: siteData.thisMonth.activeUsers,
        label: 'Active This Month',
        sourceType: siteData.thisMonth.activeUsers > 0 ? 'real' : 'placeholder',
        sourceDetail: `LeaderboardStore.siteStats.thisMonth.activeUsers | New users: ${siteData.thisMonth.newUsers}`,
        icon: siteData.thisMonth.activeUsers > 0 ? '✅' : '🔶'
      },
      {
        value: siteData.thisMonth.checkins,
        label: 'Check-ins This Month',
        sourceType: siteData.thisMonth.checkins > 0 ? 'real' : 'placeholder',
        sourceDetail: `LeaderboardStore.siteStats.thisMonth.checkins | Raw monthly data: ${JSON.stringify(siteData.thisMonth)}`,
        icon: siteData.thisMonth.checkins > 0 ? '✅' : '🔶'
      },
      // Global Data Debug
      {
        value: globalData.totalUsers,
        label: 'Global Users',
        sourceType: globalData.totalUsers > 0 ? 'real' : 'placeholder',
        sourceDetail: `LeaderboardStore.globalDataStats.totalUsers | CheckIns: ${globalData.totalCheckIns}, Active: ${globalData.activeUsers}`,
        icon: globalData.totalUsers > 0 ? '✅' : '🔶'
      },
      {
        value: scoreboardData.totalPubs || 0,
        label: 'Total Pubs',
        sourceType: (scoreboardData.totalPubs || 0) > 0 ? 'real' : 'placeholder',
        sourceDetail: `DataAggregator.scoreboardData.totalPubs | Loading: ${scoreboardData.isLoading}, Pubs visited: ${scoreboardData.pubsVisited}`,
        icon: (scoreboardData.totalPubs || 0) > 0 ? '✅' : '🔶'
      }
    ];

    console.log('🔍 [AdminDashboard] FULL DEBUG DATA:', {
      siteData,
      globalData,
      scoreboardData,
      pendingCount,
      allFeedback: allFeedback.length,
      feedbackStore: {
        loading: this.feedbackStore.loading(),
        error: this.feedbackStore.error(),
        data: allFeedback
      },
      leaderboardStore: {
        loading: this.leaderboardStore.loading(),
        error: this.leaderboardStore.error()
      },
      stats
    });
    return stats;
  });

  readonly isDevMode = isDevMode;

  readonly adminSections: AdminSection[] = [
    // Active sections
    {
      id: 'missions',
      title: 'Missions ✅',
      description: 'Create and manage game missions and challenges',
      route: '/admin/missions',
      icon: '🎯',
      status: 'active',
      stats: 'Real CRUD via MissionStore'
    },
    {
      id: 'badges',
      title: 'Badges ✅',
      description: 'Manage achievement badges and rewards',
      route: '/admin/badges',
      icon: '🏆',
      status: 'active',
      stats: 'Real CRUD via BadgeStore'
    },
    {
      id: 'metrics',
      title: 'Database Metrics ✅',
      description: 'Monitor database performance and costs',
      route: '/admin/metrics',
      icon: '📊',
      status: 'active',
      stats: `Real data: ${this.totalOperations()} operations tracked`
    },

    // High Priority - Real Data Available
    {
      id: 'feedback',
      title: 'Feedback Review ✅',
      description: 'Review user feedback and support tickets',
      route: '/admin/feedback',
      icon: '💬',
      status: 'active',
      stats: `${this.pendingFeedback().length} pending reviews - Real CRUD available`
    },
    {
      id: 'users',
      title: 'User Management 🔶',
      description: 'Manage user accounts, roles, and permissions',
      route: '/admin/users',
      icon: '👥',
      status: 'coming-soon',
      stats: `${this.siteStats().allTime.users} users (UserStore ready)`
    },
    {
      id: 'analytics',
      title: 'Analytics Hub 🔶',
      description: 'Business intelligence and user engagement metrics',
      route: '/admin/analytics',
      icon: '📈',
      status: 'coming-soon',
      stats: 'LeaderboardStore + DataAggregator ready'
    },

    // Future sections
    {
      id: 'pubs',
      title: 'Pub Management',
      description: 'Add, edit, and manage pub locations and details',
      route: '/admin/pubs',
      icon: '🍺',
      status: 'coming-soon'
    },
    {
      id: 'checkins',
      title: 'Check-in Review',
      description: 'Review and validate user check-ins and carpets',
      route: '/admin/check-ins',
      icon: '✅',
      status: 'coming-soon'
    },
    {
      id: 'content',
      title: 'Content Moderation',
      description: 'Moderate user-generated content and photos',
      route: '/admin/content',
      icon: '🛡️',
      status: 'coming-soon'
    },
    {
      id: 'settings',
      title: 'System Settings',
      description: 'Configure global app settings and feature flags',
      route: '/admin/settings',
      icon: '⚙️',
      status: 'coming-soon'
    },
    {
      id: 'reports',
      title: 'Reports & Exports',
      description: 'Generate reports and export system data',
      route: '/admin/reports',
      icon: '📋',
      status: 'coming-soon'
    },
    {
      id: 'audit',
      title: 'Audit Logs',
      description: 'Track admin actions and system changes',
      route: '/admin/audit',
      icon: '🔍',
      status: 'coming-soon'
    }
  ];

  // Firebase-specific computed properties
  readonly firebaseOperations = computed(() => {
    const fbMetrics = this.firebaseMetricsService.getSessionSummary();
    const recent = this.firebaseMetricsService.getRecentOperations(10);
    const errors = this.firebaseMetricsService.getErrorAnalysis();
    
    return {
      totalOperations: fbMetrics.totalCalls,
      operationsPerMinute: fbMetrics.callsPerMinute,
      cacheHitRatio: fbMetrics.cacheHitRatio,
      errorRate: fbMetrics.errorRate,
      averageLatency: fbMetrics.averageLatency,
      recentOperations: recent,
      topCollections: this.metricsService.getTopCollections(3),
      totalErrors: errors.totalErrors
    };
  });

  readonly cacheEffectiveness = computed(() => this.metricsService.getCacheEffectiveness());

  clearFirebaseCache(): void {
    // This will be implemented when we integrate the CachedFirestoreService
    this.firebaseMetricsService.resetSession('Manual cache clear from dashboard');
    console.log('🗑️ [AdminDashboard] Firebase cache cleared');
  }

  formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  }

  formatJSON(data: any): string {
    try {
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return `[Error formatting JSON: ${error}]`;
    }
  }
}
