import { Component, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FeedbackStore } from '../../../feedback/data-access/feedback.store';
import { LeaderboardStore } from '../../../leaderboard/data-access/leaderboard.store';
import { UserStore } from '../../../users/data-access/user.store';
import { ErrorLoggingService } from '../../../shared/data-access/error-logging.service';
import { AnalyticsService } from '../../../shared/data-access/analytics.service';

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
  imports: [RouterModule],
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
          <!-- Error Stats -->
          <div class="stat-card error-stats">
            <div class="stat-value">{{ errorStats().unresolvedErrors }}</div>
            <div class="stat-label">Unresolved Errors</div>
          </div>
          <div class="stat-card error-stats critical">
            <div class="stat-value">{{ errorStats().criticalErrors }}</div>
            <div class="stat-label">Critical Errors</div>
          </div>
        </div>
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
        <p class="section-subtitle">
          Track user behavior and identify revenue opportunities
        </p>
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
  private readonly errorLoggingService = inject(ErrorLoggingService);
  private readonly analyticsService = inject(AnalyticsService);

  // Database metrics removed - focus on core business metrics instead

  // Real business data from stores
  readonly siteStats = this.leaderboardStore.siteStats;
  readonly globalDataStats = this.leaderboardStore.globalDataStats;
  readonly pendingFeedback = this.feedbackStore.pendingFeedback;
  readonly scoreboardData = this.userStore.scoreboardData;

  // Error stats for dashboard
  readonly errorStats = computed(() => this.errorLoggingService.getErrorStats());

  // Database metrics computeds removed - focus on real business metrics instead

  readonly dashboardStats = computed((): StatData[] => {
    const siteData = this.siteStats();
    const globalData = this.globalDataStats();
    const pendingCount = this.pendingFeedback().length;
    const scoreboardData = this.scoreboardData();

    return [
      // Core Business Metrics
      {
        value: siteData.allTime.users,
        label: 'Total Users',
        sourceType: siteData.allTime.users > 0 ? 'real' : 'placeholder',
        sourceDetail: `Active user base`,
        icon: '👥',
      },
      {
        value: siteData.allTime.checkins,
        label: 'Total Check-ins',
        sourceType: siteData.allTime.checkins > 0 ? 'real' : 'placeholder',
        sourceDetail: `User engagement events`,
        icon: '🍺',
      },
      {
        value: siteData.thisMonth.activeUsers,
        label: 'Monthly Active Users',
        sourceType: siteData.thisMonth.activeUsers > 0 ? 'real' : 'placeholder',
        sourceDetail: `Users active in current month`,
        icon: '📈',
      },
      {
        value: siteData.thisMonth.checkins,
        label: 'Monthly Check-ins',
        sourceType: siteData.thisMonth.checkins > 0 ? 'real' : 'placeholder',
        sourceDetail: `Check-ins this month`,
        icon: '📊',
      },
      // Business Health Indicators
      {
        value: this.getEngagementRate(),
        label: 'Engagement Rate',
        sourceType: 'calculated',
        sourceDetail: `Check-ins per active user`,
        icon: '🎯',
      },
      {
        value: this.getGrowthRate(),
        label: 'Monthly Growth',
        sourceType: 'calculated',
        sourceDetail: `New users this month vs last month`,
        icon: '📈',
      },
      {
        value: pendingCount,
        label: 'Pending Feedback',
        sourceType: 'real',
        sourceDetail: `User feedback requiring attention`,
        icon: '💬',
      },
      {
        value: scoreboardData.totalPubs || 0,
        label: 'Total Pubs',
        sourceType: (scoreboardData.totalPubs || 0) > 0 ? 'real' : 'placeholder',
        sourceDetail: `Available pub locations`,
        icon: '🏛️',
      },
    ];
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
      stats: `${this.siteStats().allTime.users} users - detailed investigation tool`,
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

  // Real business calculations for monetization insights
  getEngagementRate(): string {
    const siteData = this.siteStats();
    const activeUsers = siteData.thisMonth.activeUsers;
    const checkIns = siteData.thisMonth.checkins;
    
    if (activeUsers === 0) return '0';
    
    const rate = (checkIns / activeUsers).toFixed(1);
    return `${rate}/user`;
  }

  getGrowthRate(): string {
    const siteData = this.siteStats();
    const newUsers = siteData.thisMonth.newUsers;
    const totalUsers = siteData.allTime.users;
    
    if (totalUsers === 0) return '0%';
    
    // Estimate previous month users (rough calculation)
    const estimatedPrevious = totalUsers - newUsers;
    if (estimatedPrevious === 0) return '100%';
    
    const growthRate = Math.round((newUsers / estimatedPrevious) * 100);
    return `${growthRate}%`;
  }
}
