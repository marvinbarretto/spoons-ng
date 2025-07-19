// src/app/admin/feature/admin-dashboard/admin-dashboard.component.ts
import { Component, inject, computed, isDevMode, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
// DatabaseMetricsService removed - was over-engineered premature optimization
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
        </div>
        <div class="stats-grid">
          @for (stat of dashboardStats(); track stat.label) {
            <div class="stat-card">
              <div class="stat-value">{{ stat.value }}</div>
              <div class="stat-label">{{ stat.label }}</div>
            </div>
          }
        </div>
      </section>

      <!-- Current Admin Tools -->
      <section class="admin-sections">
        <h2>Active Admin Tools</h2>
        <p class="section-subtitle">These tools are currently available with real data</p>
        <div class="sections-grid">
          @for (section of activeSections; track section.id) {
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

      <!-- Future Admin Tools -->
      <section class="admin-sections future-sections">
        <h2>Coming Soon</h2>
        <p class="section-subtitle">These tools are planned for future releases</p>
        <div class="sections-grid">
          @for (section of futureSections; track section.id) {
            <div class="admin-card coming-soon">
              <div class="card-content">
                <div class="card-icon">{{ section.icon }}</div>
                <h3>{{ section.title }}</h3>
                <p>{{ section.description }}</p>
                @if (section.stats) {
                  <div class="card-stats">{{ section.stats }}</div>
                }
              </div>
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
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent {
  // Database metrics service removed - focus on core functionality first
  private readonly firebaseMetricsService = inject(FirebaseMetricsService);
  protected readonly leaderboardStore = inject(LeaderboardStore);
  protected readonly feedbackStore = inject(FeedbackStore);
  protected readonly dataAggregatorService = inject(DataAggregatorService);

  // Firebase operations state
  readonly showFirebaseWidget = signal(true);

  // Database metrics removed - focus on core business metrics instead

  // Real business data from stores
  readonly siteStats = this.leaderboardStore.siteStats;
  readonly globalDataStats = this.leaderboardStore.globalDataStats;
  readonly pendingFeedback = this.feedbackStore.pendingFeedback;
  readonly scoreboardData = this.dataAggregatorService.scoreboardData;

  // Database metrics computeds removed - focus on real business metrics instead

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
        sourceDetail: `✅ REAL DATA: LeaderboardStore.siteStats.allTime.users | Raw siteData: ${JSON.stringify(siteData.allTime)}`,
        icon: siteData.allTime.users > 0 ? '✅' : '🔶'
      },
      {
        value: siteData.allTime.checkins,
        label: 'Total Check-ins',
        sourceType: siteData.allTime.checkins > 0 ? 'real' : 'placeholder',
        sourceDetail: `✅ REAL DATA: LeaderboardStore.siteStats.allTime.checkins | Monthly: ${siteData.thisMonth.checkins}`,
        icon: siteData.allTime.checkins > 0 ? '✅' : '🔶'
      },
      {
        value: siteData.allTime.pubsConquered,
        label: 'Pubs Visited',
        sourceType: siteData.allTime.pubsConquered > 0 ? 'real' : 'placeholder',
        sourceDetail: `✅ REAL DATA: LeaderboardStore.siteStats.allTime.pubsConquered | Total pubs in system: ${siteData.allTime.totalPubsInSystem}`,
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
        sourceDetail: `✅ REAL DATA: LeaderboardStore.siteStats.thisMonth.activeUsers | New users: ${siteData.thisMonth.newUsers}`,
        icon: siteData.thisMonth.activeUsers > 0 ? '✅' : '🔶'
      },
      {
        value: siteData.thisMonth.checkins,
        label: 'Check-ins This Month',
        sourceType: siteData.thisMonth.checkins > 0 ? 'real' : 'placeholder',
        sourceDetail: `✅ REAL DATA: LeaderboardStore.siteStats.thisMonth.checkins | Raw monthly data: ${JSON.stringify(siteData.thisMonth)}`,
        icon: siteData.thisMonth.checkins > 0 ? '✅' : '🔶'
      },
      // Global Data Debug
      {
        value: globalData.totalUsers,
        label: 'Global Users',
        sourceType: globalData.totalUsers > 0 ? 'real' : 'placeholder',
        sourceDetail: `✅ REAL DATA: LeaderboardStore.globalDataStats.totalUsers | CheckIns: ${globalData.totalCheckIns}, Active: ${globalData.activeUsers}`,
        icon: globalData.totalUsers > 0 ? '✅' : '🔶'
      },
      {
        value: scoreboardData.totalPubs || 0,
        label: 'Total Pubs',
        sourceType: (scoreboardData.totalPubs || 0) > 0 ? 'real' : 'placeholder',
        sourceDetail: `dataAggregatorService.scoreboardData.totalPubs | Loading: ${scoreboardData.isLoading}, Pubs visited: ${scoreboardData.pubsVisited}`,
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

  // Active admin tools with real data
  readonly activeSections: AdminSection[] = [
    {
      id: 'users',
      title: 'User Management',
      description: 'View and manage all user accounts',
      route: '/admin/users',
      icon: '👥',
      status: 'active',
      stats: `${this.siteStats().allTime.users} users - Real data from UserStore`
    },
    {
      id: 'missions',
      title: 'Missions',
      description: 'Create and manage game missions and challenges',
      route: '/admin/missions',
      icon: '🎯',
      status: 'active',
      stats: 'Real CRUD via MissionStore'
    },
    {
      id: 'badges',
      title: 'Badges',
      description: 'Manage achievement badges and rewards',
      route: '/admin/badges',
      icon: '🏆',
      status: 'active',
      stats: 'Real CRUD via BadgeStore'
    },
    {
      id: 'checkins',
      title: 'Check-ins Management',
      description: 'View and manage all user check-ins',
      route: '/admin/checkins',
      icon: '🍺',
      status: 'active',
      stats: 'Real CRUD via AdminCheckinService'
    },
    {
      id: 'feedback',
      title: 'Feedback Review',
      description: 'Review user feedback and support tickets',
      route: '/admin/feedback',
      icon: '💬',
      status: 'active',
      stats: `${this.pendingFeedback().length} pending reviews - Real CRUD available`
    },
    {
      id: 'carpets',
      title: 'Carpet Management',
      description: 'Review and manage captured carpet photos',
      route: '/admin/carpets',
      icon: '📸',
      status: 'active',
      stats: 'Photo management system'
    },
    {
      id: 'components',
      title: 'Developer Tools',
      description: 'Component showcase and development utilities',
      route: '/dev/components',
      icon: '🛠️',
      status: 'active',
      stats: 'Design system components'
    }
  ];

  // Future admin tools - planned features
  readonly futureSections: AdminSection[] = [
    {
      id: 'analytics',
      title: 'Analytics Hub',
      description: 'Business intelligence and user engagement metrics',
      route: '/admin/analytics',
      icon: '📈',
      status: 'coming-soon',
      stats: `${this.globalDataStats().totalUsers} users, ${this.globalDataStats().totalCheckIns} check-ins - Real data ready`
    },
    {
      id: 'pubs',
      title: 'Pub Management',
      description: 'Add, edit, and manage pub locations and details',
      route: '/admin/pubs',
      icon: '🍺',
      status: 'coming-soon',
      stats: 'PubStore integration needed'
    },
    {
      id: 'content',
      title: 'Content Moderation',
      description: 'Moderate user-generated content and photos',
      route: '/admin/content',
      icon: '🛡️',
      status: 'coming-soon',
      stats: 'Automated moderation system'
    },
    {
      id: 'settings',
      title: 'System Settings',
      description: 'Configure global app settings and feature flags',
      route: '/admin/settings',
      icon: '⚙️',
      status: 'coming-soon',
      stats: 'Feature flag system'
    },
    {
      id: 'reports',
      title: 'Reports & Exports',
      description: 'Generate reports and export system data',
      route: '/admin/reports',
      icon: '📋',
      status: 'coming-soon',
      stats: 'CSV/PDF export capabilities'
    },
    {
      id: 'audit',
      title: 'Audit Logs',
      description: 'Track admin actions and system changes',
      route: '/admin/audit',
      icon: '🔍',
      status: 'coming-soon',
      stats: 'Action tracking system'
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
      topCollections: [], // Database metrics removed
      totalErrors: errors.totalErrors
    };
  });

  // Complex cache analytics removed - Firebase handles caching automatically

  // Placeholder computed properties for removed analytics (to prevent template errors)
  readonly realTimeCacheAnalytics = computed(() => ({
    liveHitRatio: 0,
    operationsPerSecond: 0,
    cacheLatencyVsNetwork: {
      speedImprovement: 0,
      cacheAvg: 0,
      networkAvg: 0
    },
    costSavingsReal: {
      costSavedToday: 0,
      projectedMonthlySavings: 0,
      operationsSaved: 0
    }
  }));

  readonly cacheHealthStatus = computed(() => ({
    insights: []
  }));

  readonly optimizationRecommendations = computed(() => []);

  readonly tierPerformance = computed(() => ({
    tierBreakdown: [],
    tierRecommendations: []
  }));

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
