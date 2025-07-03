// src/app/admin/feature/admin-dashboard/admin-dashboard.component.ts
import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DatabaseMetricsService } from '../../../shared/data-access/database-metrics.service';

type AdminSection = {
  id: string;
  title: string;
  description: string;
  route: string;
  icon: string;
  status: 'active' | 'coming-soon';
  stats?: string;
};

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="admin-dashboard">
      <header class="dashboard-header">
        <h1>Admin Dashboard</h1>
        <p class="dashboard-subtitle">Monitor and manage your Spooncount application</p>
      </header>

      <!-- Quick Stats Overview -->
      <section class="stats-overview">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{{ totalOperations() }}</div>
            <div class="stat-label">Total DB Operations</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ operationsToday() }}</div>
            <div class="stat-label">Operations Today</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ cacheHitRatio() }}%</div>
            <div class="stat-label">Cache Hit Ratio</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">$ {{ monthlyCost() }}</div>
            <div class="stat-label">Est. Monthly Cost</div>
          </div>
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
          <div class="status-item">
            <div class="status-indicator active"></div>
            <div class="status-info">
              <div class="status-title">Cache</div>
              <div class="status-detail">{{ cacheHitRatio() }}% hit rate</div>
            </div>
          </div>
          <div class="status-item">
            <div class="status-indicator warning"></div>
            <div class="status-info">
              <div class="status-title">Monitoring</div>
              <div class="status-detail">Tracking {{ totalOperations() }} operations</div>
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

  // Computed stats from metrics service
  readonly performanceMetrics = this.metricsService.performanceMetrics;
  readonly costEstimate = this.metricsService.costEstimate;

  readonly totalOperations = computed(() => this.performanceMetrics().totalOperations);
  readonly operationsToday = computed(() => this.performanceMetrics().operationsToday);
  readonly cacheHitRatio = computed(() => Math.round(this.performanceMetrics().cacheHitRatio * 100));
  readonly monthlyCost = computed(() => this.costEstimate().firestore.monthlyCost.toFixed(2));

  readonly adminSections: AdminSection[] = [
    // Active sections
    {
      id: 'missions',
      title: 'Missions',
      description: 'Create and manage game missions and challenges',
      route: '/admin/missions',
      icon: '🎯',
      status: 'active',
      stats: 'CRUD operations available'
    },
    {
      id: 'badges',
      title: 'Badges',
      description: 'Manage achievement badges and rewards',
      route: '/admin/badges',
      icon: '🏆',
      status: 'active',
      stats: 'Badge definitions & criteria'
    },
    {
      id: 'metrics',
      title: 'Database Metrics',
      description: 'Monitor database performance and costs',
      route: '/admin/metrics',
      icon: '📊',
      status: 'active',
      stats: `${this.totalOperations()} operations tracked`
    },

    // Future sections
    {
      id: 'users',
      title: 'User Management',
      description: 'Manage user accounts, roles, and permissions',
      route: '/admin/users',
      icon: '👥',
      status: 'coming-soon'
    },
    {
      id: 'pubs',
      title: 'Pub Management',
      description: 'Add, edit, and manage pub locations and details',
      route: '/admin/pubs',
      icon: '🍺',
      status: 'coming-soon'
    },
    {
      id: 'feedback',
      title: 'Feedback & Support',
      description: 'Review user feedback and support tickets',
      route: '/admin/feedback',
      icon: '💬',
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
      id: 'analytics',
      title: 'Analytics Hub',
      description: 'Business intelligence and user engagement metrics',
      route: '/admin/analytics',
      icon: '📈',
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
}
