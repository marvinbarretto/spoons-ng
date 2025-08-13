import { Component, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FeedbackStore } from '../../../feedback/data-access/feedback.store';
import { LeaderboardStore } from '../../../leaderboard/data-access/leaderboard.store';
import { AnalyticsService } from '../../../shared/data-access/analytics.service';
import { DataAggregatorService } from '../../../shared/data-access/data-aggregator.service';
import { ErrorLoggingService } from '../../../shared/data-access/error-logging.service';
import { TabGroupComponent, type Tab } from '../../../shared/ui/tabs/tab-group.component';
import { UserStore } from '../../../users/data-access/user.store';

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
  imports: [RouterModule, TabGroupComponent],
  template: `
    <div class="admin-dashboard">
      <header class="dashboard-header">
        <h1>Admin Dashboard</h1>
        <p class="dashboard-subtitle">Monitor and manage your Spoonscount application</p>
      </header>

      <!-- Time Period Selector -->
      <section class="time-period-section">
        <ff-tab-group
          [tabs]="timePeriodTabs"
          [selectedTab]="selectedTimePeriod()"
          (tabChange)="onTimePeriodChange($event)"
        />
      </section>

      <!-- Executive Summary - Dense 2x2 Grid -->
      <section class="executive-summary-dense">
        <div class="section-header">
          <h2>📋 Executive Summary</h2>
          <div class="system-health-inline">
            {{ systemHealth().dataFreshness.icon }} Live Data
            <span class="data-quality"
              >{{ systemHealth().dataConsistency.icon }}
              {{ systemHealth().dataConsistency.score }}%</span
            >
          </div>
        </div>

        <div class="metrics-grid-2x2">
          @for (kpi of executiveKPIs(); track kpi.id) {
            <div class="metric-card-dense" [class]="kpi.status">
              <div class="metric-header">
                <span class="metric-icon">{{ kpi.icon }}</span>
                <span class="metric-trend">{{ kpi.trend }}</span>
              </div>
              <div class="metric-values">
                <div class="primary-metric">{{ kpi.primaryValue }}</div>
                <div class="primary-label">{{ kpi.primaryLabel }}</div>
                <div class="secondary-metric">{{ kpi.secondaryValue }}</div>
                <div class="secondary-label">{{ kpi.secondaryLabel }}</div>
              </div>
            </div>
          }
        </div>
      </section>

      <!-- Firebase Analytics Integration -->
      <section class="firebase-analytics">
        <div class="section-header">
          <h2>📊 Firebase Analytics</h2>
          <div class="analytics-actions">
            <a
              href="https://console.firebase.google.com/project/spoonscount/analytics"
              target="_blank"
              class="analytics-link"
            >
              📈 View Console
            </a>
          </div>
        </div>
        <div class="analytics-grid">
          <div class="analytics-card">
            <div class="analytics-title">User Engagement</div>
            <div class="analytics-subtitle">
              Check Firebase Console for real-time user activity metrics
            </div>
          </div>
          <div class="analytics-card">
            <div class="analytics-title">App Performance</div>
            <div class="analytics-subtitle">Monitor crash reports and performance issues</div>
          </div>
        </div>
      </section>

      <!-- Compact Data Validation -->
      <section class="debug-metrics-compact">
        <details>
          <summary>
            🔍 Data Validation ({{ systemHealth().dataConsistency.score }}% Quality)
          </summary>
          <div class="debug-inline-grid">
            <span class="debug-compact"
              >Users: <strong>{{ debugMetrics().totalUsers }}</strong></span
            >
            <span class="debug-compact"
              >Check-ins: <strong>{{ debugMetrics().totalCheckIns }}</strong></span
            >
            <span class="debug-compact"
              >Points: <strong>{{ debugMetrics().totalSystemPoints }}</strong></span
            >
            <span class="debug-compact"
              >Monthly Active: <strong>{{ debugMetrics().monthlyActiveUsers }}</strong></span
            >
            <span class="debug-compact"
              >Monthly Check-ins: <strong>{{ debugMetrics().monthlyCheckIns }}</strong></span
            >
          </div>
        </details>
      </section>

      <!-- Data Analysis & Investigation Tools (Priority) -->
      <section class="admin-sections priority-section">
        <h2>🔍 Data Analysis & Investigation Tools</h2>
        <p class="section-subtitle">
          ⭐ Essential tools for investigating data inconsistencies like mb84's case
        </p>
        <div class="sections-grid">
          @for (section of dataAnalysisTools; track section.id) {
            <div class="admin-card active priority">
              <a [routerLink]="section.route" class="card-link">
                <div class="card-icon">{{ section.icon }}</div>
                <h3>{{ section.title }}</h3>
                <p>{{ section.description }}</p>
                @if (section.stats) {
                  <div class="card-stats">{{ section.stats }}</div>
                }
              </a>
            </div>
          }
        </div>
      </section>

      <!-- Core Management Tools -->
      <section class="admin-sections">
        <h2>📋 Core Management Tools</h2>
        <p class="section-subtitle">Standard admin operations for content and user management</p>
        <div class="sections-grid">
          @for (section of managementTools; track section.id) {
            <div class="admin-card active">
              <a [routerLink]="section.route" class="card-link">
                <div class="card-icon">{{ section.icon }}</div>
                <h3>{{ section.title }}</h3>
                <p>{{ section.description }}</p>
                @if (section.stats) {
                  <div class="card-stats">{{ section.stats }}</div>
                }
              </a>
            </div>
          }
        </div>
      </section>

      <!-- System & Development Tools -->
      <section class="admin-sections">
        <h2>🛠️ System & Development Tools</h2>
        <p class="section-subtitle">Technical tools for monitoring and development</p>
        <div class="sections-grid">
          @for (section of systemTools; track section.id) {
            <div class="admin-card active">
              <a [routerLink]="section.route" class="card-link">
                <div class="card-icon">{{ section.icon }}</div>
                <h3>{{ section.title }}</h3>
                <p>{{ section.description }}</p>
                @if (section.stats) {
                  <div class="card-stats">{{ section.stats }}</div>
                }
              </a>
            </div>
          }
        </div>
      </section>

      <!-- Business Intelligence Tools -->
      <section class="admin-sections priority-section">
        <h2>💰 Business Intelligence & Monetization</h2>
        <p class="section-subtitle">Track user behavior and identify revenue opportunities</p>
        <div class="sections-grid">
          @for (section of businessIntelligence; track section.id) {
            <div class="admin-card active priority">
              <a [routerLink]="section.route" class="card-link">
                <div class="card-icon">{{ section.icon }}</div>
                <h3>{{ section.title }}</h3>
                <p>{{ section.description }}</p>
                @if (section.stats) {
                  <div class="card-stats">{{ section.stats }}</div>
                }
              </a>
            </div>
          }
        </div>
      </section>

      <!-- System Status -->
      <section class="system-status">
        <h2>System Status</h2>
        <div class="status-grid">
          <div class="status-item">
            <div class="status-indicator active"></div>
            <div class="status-info">
              <div class="status-title">Database</div>
              <div class="status-detail">Operational</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent {
  protected readonly leaderboardStore = inject(LeaderboardStore);
  protected readonly feedbackStore = inject(FeedbackStore);
  protected readonly userStore = inject(UserStore);
  private readonly dataAggregator = inject(DataAggregatorService);
  private readonly errorLoggingService = inject(ErrorLoggingService);
  private readonly analyticsService = inject(AnalyticsService);

  // Time period state
  private readonly _selectedTimePeriod = signal<'today' | 'week' | 'month' | 'all-time'>('month');
  readonly selectedTimePeriod = this._selectedTimePeriod.asReadonly();

  // Time period tabs configuration
  readonly timePeriodTabs: Tab[] = [
    { id: 'today', label: 'Today', icon: '📅' },
    { id: 'week', label: 'This Week', icon: '📊' },
    { id: 'month', label: 'This Month', icon: '📈' },
    { id: 'all-time', label: 'All Time', icon: '🌍' },
  ];

  // Database metrics removed - focus on core business metrics instead

  // Single Source of Truth - DataAggregatorService for all dashboard metrics
  readonly comprehensiveDashboardMetrics = computed(() =>
    this.dataAggregator.calculateDashboardMetrics(this.selectedTimePeriod())
  );
  readonly pendingFeedback = this.feedbackStore.pendingFeedback;
  readonly errorStats = computed(() => this.errorLoggingService.getErrorStats());

  // Database metrics computeds removed - focus on real business metrics instead

  // Executive Dashboard - Primary KPIs (Clean & Simple)
  readonly executiveKPIs = computed(() => {
    const metrics = this.comprehensiveDashboardMetrics();

    return [
      {
        id: 'user-growth',
        title: 'User Growth',
        primaryValue: metrics.userGrowth.total,
        primaryLabel: 'Total Users',
        secondaryValue: `${metrics.userGrowth.monthlyGrowth > 0 ? '+' : ''}${metrics.userGrowth.monthlyGrowth}%`,
        secondaryLabel: 'Monthly Growth',
        status: metrics.userGrowth.total > 0 ? 'healthy' : 'needs-attention',
        trend:
          metrics.userGrowth.monthlyGrowth > 0
            ? '📈'
            : metrics.userGrowth.monthlyGrowth < 0
              ? '📉'
              : '➡️',
        icon: '👥',
      },
      {
        id: 'engagement-health',
        title: 'Engagement Health',
        primaryValue: metrics.engagement.activeUsers,
        primaryLabel: 'Active Users',
        secondaryValue: metrics.engagement.checkInsPerUser,
        secondaryLabel: 'Check-ins/User',
        status:
          metrics.engagement.trend === 'up'
            ? 'healthy'
            : metrics.engagement.trend === 'stable'
              ? 'stable'
              : 'needs-attention',
        trend:
          metrics.engagement.trend === 'up'
            ? '📈'
            : metrics.engagement.trend === 'down'
              ? '📉'
              : '➡️',
        icon: '🎯',
      },
      {
        id: 'market-penetration',
        title: 'Market Penetration',
        primaryValue: `${metrics.marketPenetration.percentage}%`,
        primaryLabel: 'Coverage',
        secondaryValue: `${metrics.marketPenetration.pubsConquered}/${metrics.marketPenetration.totalPubs}`,
        secondaryLabel: 'Pubs Conquered',
        status:
          metrics.marketPenetration.percentage > 10
            ? 'healthy'
            : metrics.marketPenetration.percentage > 5
              ? 'stable'
              : 'needs-attention',
        trend: metrics.marketPenetration.percentage > 5 ? '🏆' : '🎯',
        icon: '🏛️',
      },
      {
        id: 'platform-value',
        title: 'Platform Value',
        primaryValue: metrics.platformValue.totalPoints,
        primaryLabel: 'Total Points',
        secondaryValue: metrics.platformValue.avgPointsPerUser,
        secondaryLabel: 'Avg/User',
        status: metrics.platformValue.totalPoints > 0 ? 'healthy' : 'needs-attention',
        trend: metrics.platformValue.totalPoints > 300 ? '⭐' : '📊',
        icon: '💰',
      },
    ];
  });

  // System Health Dashboard
  readonly systemHealth = computed(() => {
    const metrics = this.comprehensiveDashboardMetrics();
    const errors = this.errorStats();
    const pendingCount = this.pendingFeedback().length;

    return {
      dataConsistency: {
        score: metrics.dataConsistencyScore,
        status: metrics.systemHealth.status,
        description: `${metrics.dataConsistencyScore}% data consistency`,
        icon:
          metrics.dataConsistencyScore > 90
            ? '🟢'
            : metrics.dataConsistencyScore > 70
              ? '🟡'
              : '🔴',
      },
      operationalHealth: {
        errors: errors.unresolvedErrors,
        criticalErrors: errors.criticalErrors,
        pendingFeedback: pendingCount,
        description: `${errors.unresolvedErrors} unresolved errors`,
        status:
          errors.criticalErrors > 0
            ? 'critical'
            : errors.unresolvedErrors > 5
              ? 'warning'
              : 'healthy',
        icon: errors.criticalErrors > 0 ? '🔴' : errors.unresolvedErrors > 0 ? '🟡' : '🟢',
      },
      dataFreshness: {
        lastUpdate: new Date().toISOString(),
        status: 'live',
        description: 'Real-time data',
        icon: '🟢',
      },
    };
  });

  // Raw metrics for debugging/validation
  readonly debugMetrics = computed(() => {
    const metrics = this.comprehensiveDashboardMetrics();
    return metrics.rawMetrics;
  });

  // Data Analysis & Investigation Tools (Priority section)
  readonly dataAnalysisTools: AdminSection[] = [
    {
      id: 'data-integrity',
      title: '🔍 Cross-Collection Data Analysis',
      description: '⭐ Find data inconsistencies, orphaned records, and summary mismatches',
      route: '/admin/data-integrity',
      icon: '🔍',
      status: 'active',
      stats: '📊 Essential for data reconciliation - START HERE',
    },
    {
      id: 'points-transactions',
      title: '💰 Points Transactions Browser',
      description: '⭐ Browse all points transactions with user name filtering',
      route: '/admin/points-transactions',
      icon: '💰',
      status: 'active',
      stats: '🔍 Recently improved - filter by display name',
    },
    {
      id: 'checkins-data',
      title: '🍻 Check-ins Data Browser',
      description: 'Advanced check-ins analysis with pub enrichment and export',
      route: '/admin/checkins-data',
      icon: '🍻',
      status: 'active',
      stats: '📈 Enhanced viewer with bulk operations',
    },
    {
      id: 'users',
      title: '👥 User Detail Browser',
      description: 'View individual user profiles with cross-collection data',
      route: '/admin/users',
      icon: '👥',
      status: 'active',
      stats: `Investigation tool (${this.getOverallHealthStatus()})`,
    },
  ];

  // Core Management Tools
  readonly managementTools: AdminSection[] = [
    {
      id: 'missions',
      title: 'Missions',
      description: 'Create and manage game missions and challenges',
      route: '/admin/missions',
      icon: '🎯',
      status: 'active',
      stats: 'Real CRUD via MissionStore',
    },
    {
      id: 'badges',
      title: 'Badges',
      description: 'Manage achievement badges and rewards',
      route: '/admin/badges',
      icon: '🏆',
      status: 'active',
      stats: 'Real CRUD via BadgeStore',
    },
    {
      id: 'pubs',
      title: 'Pub Management',
      description: 'View and manage all pubs with check-in analytics and location data',
      route: '/admin/pubs',
      icon: '🏛️',
      status: 'active',
      stats: 'Full CRUD with check-in analytics',
    },
    {
      id: 'checkins',
      title: 'Check-ins Management',
      description: 'View and manage all user check-ins',
      route: '/admin/checkins',
      icon: '🍺',
      status: 'active',
      stats: 'Real CRUD via AdminCheckinService',
    },
    {
      id: 'feedback',
      title: 'Feedback Review',
      description: 'Review user feedback and support tickets',
      route: '/admin/feedback',
      icon: '💬',
      status: 'active',
      stats: `${this.pendingFeedback().length} pending reviews - Real CRUD available`,
    },
    {
      id: 'carpets',
      title: 'Carpet Management',
      description: 'Review and manage captured carpet photos',
      route: '/admin/carpets',
      icon: '📸',
      status: 'active',
      stats: 'Photo management system',
    },
  ];

  // System & Development Tools
  readonly systemTools: AdminSection[] = [
    {
      id: 'errors',
      title: 'Error Logs',
      description: 'System error monitoring and resolution',
      route: '/admin/errors',
      icon: '🚨',
      status: 'active',
      stats: `${this.errorStats().unresolvedErrors} unresolved, ${this.errorStats().criticalErrors} critical`,
    },
    {
      id: 'components',
      title: 'Developer Tools',
      description: 'Component showcase and development utilities',
      route: '/dev/components',
      icon: '🛠️',
      status: 'active',
      stats: 'Design system components',
    },
  ];

  // Business Intelligence Tools (replacing "coming soon")
  readonly businessIntelligence: AdminSection[] = [
    {
      id: 'retention-analysis',
      title: '🔄 User Retention Analysis',
      description: 'Track user return patterns and identify churn risks',
      route: '/admin/retention',
      icon: '🔄',
      status: 'active',
      stats: 'Critical for monetization strategy',
    },
    {
      id: 'engagement-funnel',
      title: '🎯 Engagement Funnel',
      description: 'Conversion rates from install → first check-in → regular user',
      route: '/admin/funnel',
      icon: '🎯',
      status: 'active',
      stats: 'Key monetization metric',
    },
  ];

  // Time period handling
  onTimePeriodChange(timePeriod: string): void {
    this._selectedTimePeriod.set(timePeriod as 'today' | 'week' | 'month' | 'all-time');
  }

  // Business intelligence helper methods
  getOverallHealthStatus(): 'excellent' | 'good' | 'needs-attention' | 'critical' {
    const metrics = this.comprehensiveDashboardMetrics();
    const health = this.systemHealth();

    if (health.operationalHealth.status === 'critical' || metrics.dataConsistencyScore < 50) {
      return 'critical';
    }
    if (
      metrics.dataConsistencyScore >= 90 &&
      metrics.userGrowth.total > 10 &&
      metrics.engagement.activeUsers > 5
    ) {
      return 'excellent';
    }
    if (metrics.dataConsistencyScore >= 70 && metrics.userGrowth.total > 3) {
      return 'good';
    }
    return 'needs-attention';
  }

  getBusinessInsights(): string[] {
    const metrics = this.comprehensiveDashboardMetrics();
    const insights: string[] = [];

    // Data Quality Insights
    if (metrics.dataConsistencyScore < 70) {
      insights.push('⚠️ Data inconsistencies detected - investigate check-in/points relationship');
    } else if (metrics.dataConsistencyScore >= 95) {
      insights.push('✓ Excellent data quality - all metrics are consistent');
    }

    // Business Performance Insights
    if (metrics.engagement.activeUsers === 0) {
      insights.push('📉 No active users this month - focus on user acquisition and retention');
    } else if (metrics.engagement.checkInsPerUser < 2) {
      insights.push('🎯 Low engagement - consider gamification improvements');
    } else if (metrics.engagement.checkInsPerUser >= 5) {
      insights.push('📈 High user engagement - users are actively using the platform');
    }

    // Market Penetration Insights
    if (metrics.marketPenetration.percentage < 1) {
      insights.push('🏛️ Very low market penetration - opportunity for pub expansion');
    } else if (metrics.marketPenetration.percentage >= 10) {
      insights.push('🏆 Strong market penetration - good pub coverage achieved');
    }

    // Growth Insights
    if (metrics.userGrowth.monthlyGrowth > 50) {
      insights.push('🚀 Rapid user growth - ensure infrastructure can scale');
    } else if (metrics.userGrowth.monthlyGrowth < 0) {
      insights.push('📉 User decline - investigate retention issues');
    }

    return insights;
  }
}
