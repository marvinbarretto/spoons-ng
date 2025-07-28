// src/app/admin/feature/admin-carpet/admin-carpet.component.ts
import { Component, computed, inject, signal } from '@angular/core';

import {
  EmptyStateComponent,
  ErrorStateComponent,
  LoadingStateComponent,
} from '@fourfold/angular-foundation';
import { PubService } from '../../../pubs/data-access/pub.service';
import type { Pub } from '../../../pubs/utils/pub.models';

type CarpetPubData = {
  pub: Pub;
  carpetStatus: 'has-carpet' | 'no-carpet' | 'unknown';
  hasLocalImage?: boolean;
  hasCloudImage?: boolean;
  lastUpdated?: Date;
};

@Component({
  selector: 'app-admin-carpet',
  standalone: true,
  imports: [LoadingStateComponent, ErrorStateComponent, EmptyStateComponent],
  template: `
    <div class="admin-carpet">
      <header class="carpet-header">
        <div class="header-content">
          <h1>Carpet Management</h1>
          <p class="header-subtitle">View and manage captured carpet photos across all pubs</p>
        </div>
      </header>

      <!-- Stats Overview -->
      <section class="carpet-stats">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{{ totalPubsWithCarpets() }}</div>
            <div class="stat-label">Pubs with Carpets</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ pubsWithCloudImages() }}</div>
            <div class="stat-label">Cloud Storage Photos</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ recentCarpetUploads() }}</div>
            <div class="stat-label">Recent Uploads (7d)</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ carpetCoveragePercentage() }}%</div>
            <div class="stat-label">Coverage Rate</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ averagePhotosPerDay() }}</div>
            <div class="stat-label">Avg Photos/Day</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ totalStorageUsed() }}</div>
            <div class="stat-label">Estimated Storage</div>
          </div>
        </div>

        <!-- Advanced Analytics Section -->
        <div class="analytics-section">
          <h3>Upload Analytics</h3>
          <div class="analytics-grid">
            <div class="analytics-card">
              <h4>Upload Trends</h4>
              <div class="trend-data">
                <div class="trend-item">
                  <span class="trend-label">This Week:</span>
                  <span class="trend-value">{{ weeklyUploads() }} photos</span>
                </div>
                <div class="trend-item">
                  <span class="trend-label">This Month:</span>
                  <span class="trend-value">{{ monthlyUploads() }} photos</span>
                </div>
                <div class="trend-item">
                  <span class="trend-label">Peak Day:</span>
                  <span class="trend-value">{{ peakUploadDay() }}</span>
                </div>
              </div>
            </div>

            <div class="analytics-card">
              <h4>Quality Metrics</h4>
              <div class="quality-data">
                <div class="quality-item">
                  <span class="quality-label">Photos with Storage URLs:</span>
                  <span class="quality-value">{{ storageSuccessRate() }}%</span>
                </div>
                <div class="quality-item">
                  <span class="quality-label">Recently Updated:</span>
                  <span class="quality-value">{{ recentlyUpdatedCount() }} pubs</span>
                </div>
                <div class="quality-item">
                  <span class="quality-label">Missing Photos:</span>
                  <span class="quality-value">{{ missingPhotosCount() }} pubs</span>
                </div>
              </div>
            </div>

            <div class="analytics-card">
              <h4>Regional Coverage</h4>
              <div class="region-data">
                <div class="region-item">
                  <span class="region-label">Most Covered City:</span>
                  <span class="region-value">{{ topCoveredCity() }}</span>
                </div>
                <div class="region-item">
                  <span class="region-label">Least Covered City:</span>
                  <span class="region-value">{{ leastCoveredCity() }}</span>
                </div>
                <div class="region-item">
                  <span class="region-label">Cities with Coverage:</span>
                  <span class="region-value">{{ citiesWithCarpets() }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Loading State -->
      @if (loading()) {
        <ff-loading-state text="Loading carpet data..." />
      } @else if (error()) {
        <ff-error-state
          [message]="error()!"
          [showRetry]="true"
          retryText="Try Again"
          (retry)="refreshData()"
        />
      } @else if (pubsWithCarpets().length === 0) {
        <ff-empty-state
          icon="📸"
          title="No carpet data found"
          subtitle="No pubs have carpet photos stored yet"
          [showAction]="true"
          actionText="Refresh Data"
          (action)="refreshData()"
        />
      }

      <!-- Carpet Data Display -->
      <section class="carpet-data">
        <div class="carpet-grid">
          @for (carpetPub of pubsWithCarpets(); track carpetPub.pub.id) {
            <div class="carpet-card" [attr.data-status]="carpetPub.carpetStatus">
              <div class="card-header">
                <h3 class="pub-name">{{ carpetPub.pub.name }}</h3>
                <div class="carpet-status" [attr.data-status]="carpetPub.carpetStatus">
                  @switch (carpetPub.carpetStatus) {
                    @case ('has-carpet') {
                      <span class="status-icon">✅</span>
                      <span class="status-text">Has Carpet</span>
                    }
                    @case ('no-carpet') {
                      <span class="status-icon">❌</span>
                      <span class="status-text">No Carpet</span>
                    }
                    @default {
                      <span class="status-icon">❓</span>
                      <span class="status-text">Unknown</span>
                    }
                  }
                </div>
              </div>

              <div class="card-content">
                <div class="pub-address">{{ carpetPub.pub.address }}</div>

                @if (carpetPub.pub.carpetUrl) {
                  <div class="carpet-image">
                    <img
                      [src]="carpetPub.pub.carpetUrl"
                      [alt]="'Carpet at ' + carpetPub.pub.name"
                      (error)="onImageError($event)"
                    />
                  </div>
                } @else {
                  <div class="no-image-placeholder">
                    <span class="placeholder-icon">📸</span>
                    <span class="placeholder-text">No photo available</span>
                  </div>
                }

                <div class="card-metadata">
                  @if (carpetPub.lastUpdated) {
                    <div class="metadata-item">
                      <span class="metadata-label">Last Updated:</span>
                      <span class="metadata-value">{{ formatDate(carpetPub.lastUpdated) }}</span>
                    </div>
                  }

                  <div class="metadata-item">
                    <span class="metadata-label">Storage:</span>
                    <span class="metadata-value">
                      @if (carpetPub.hasCloudImage) {
                        ☁️ Cloud
                      } @else {
                        💾 Local Only
                      }
                    </span>
                  </div>
                </div>
              </div>

              <div class="card-actions">
                @if (carpetPub.pub.carpetUrl) {
                  <button
                    class="action-btn view-btn"
                    (click)="viewFullImage(carpetPub.pub.carpetUrl!)"
                    title="View full image"
                  >
                    🔍 View
                  </button>
                  <button
                    class="action-btn moderate-btn warning"
                    (click)="flagPhoto(carpetPub.pub.id)"
                    title="Flag photo for review"
                  >
                    🚩 Flag
                  </button>
                }
                <button
                  class="action-btn details-btn"
                  (click)="viewPubDetails(carpetPub.pub.id)"
                  title="View pub details"
                >
                  📋 Details
                </button>
              </div>
            </div>
          }
        </div>

        <div class="carpet-list">
          <table class="carpet-table">
            <thead>
              <tr>
                <th>Pub Name</th>
                <th>Location</th>
                <th>Carpet Status</th>
                <th>Storage</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (carpetPub of pubsWithCarpets(); track carpetPub.pub.id) {
                <tr [attr.data-status]="carpetPub.carpetStatus">
                  <td class="pub-name-cell">
                    <strong>{{ carpetPub.pub.name }}</strong>
                  </td>
                  <td class="location-cell">{{ carpetPub.pub.address }}</td>
                  <td class="status-cell">
                    <div class="status-badge" [attr.data-status]="carpetPub.carpetStatus">
                      @switch (carpetPub.carpetStatus) {
                        @case ('has-carpet') {
                          ✅ Has Carpet
                        }
                        @case ('no-carpet') {
                          ❌ No Carpet
                        }
                        @default {
                          ❓ Unknown
                        }
                      }
                    </div>
                  </td>
                  <td class="storage-cell">
                    @if (carpetPub.hasCloudImage) {
                      <span class="storage-badge cloud">☁️ Cloud</span>
                    } @else {
                      <span class="storage-badge local">💾 Local</span>
                    }
                  </td>
                  <td class="date-cell">
                    @if (carpetPub.lastUpdated) {
                      {{ formatDate(carpetPub.lastUpdated) }}
                    } @else {
                      -
                    }
                  </td>
                  <td class="actions-cell">
                    @if (carpetPub.pub.carpetUrl) {
                      <button
                        class="action-btn view-btn"
                        (click)="viewFullImage(carpetPub.pub.carpetUrl!)"
                        title="View full image"
                      >
                        🔍
                      </button>
                      <button
                        class="action-btn moderate-btn warning"
                        (click)="flagPhoto(carpetPub.pub.id)"
                        title="Flag photo for review"
                      >
                        🚩
                      </button>
                    }
                    <button
                      class="action-btn details-btn"
                      (click)="viewPubDetails(carpetPub.pub.id)"
                      title="View pub details"
                    >
                      📋
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .admin-carpet {
        padding: 1rem;
        max-width: 1200px;
        margin: 0 auto;
      }

      .carpet-header {
        margin-bottom: 2rem;
      }

      .header-content h1 {
        margin: 0 0 0.5rem 0;
        color: var(--text);
      }

      .header-subtitle {
        margin: 0;
        color: var(--text-muted);
      }

      .carpet-stats {
        margin-bottom: 2rem;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
      }

      .stat-card {
        padding: 1.5rem;
        background: var(--background-lighter);
        border: 1px solid var(--border);
        border-radius: 0.5rem;
        text-align: center;
      }

      .stat-value {
        font-size: 2rem;
        font-weight: bold;
        color: var(--primary);
        margin-bottom: 0.5rem;
      }

      .stat-label {
        color: var(--text-muted);
        font-size: 0.875rem;
      }

      .analytics-section {
        margin-top: 2rem;
        padding-top: 2rem;
        border-top: 1px solid var(--border);
      }

      .analytics-section h3 {
        margin: 0 0 1rem 0;
        color: var(--text);
      }

      .analytics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1rem;
      }

      .analytics-card {
        background: var(--background-lightest);
        border: 1px solid var(--border);
        border-radius: 0.5rem;
        padding: 1rem;
      }

      .analytics-card h4 {
        margin: 0 0 1rem 0;
        color: var(--text);
        font-size: 1rem;
      }

      .trend-item,
      .quality-item,
      .region-item {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5rem;
        font-size: 0.875rem;
      }

      .trend-label,
      .quality-label,
      .region-label {
        color: var(--text-muted);
      }

      .trend-value,
      .quality-value,
      .region-value {
        color: var(--text);
        font-weight: 500;
      }

      .carpet-filters {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        padding: 1rem;
        background: var(--background-lighter);
        border-radius: 0.5rem;
        border: 1px solid var(--border);
      }

      .filter-group {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .filter-label {
        font-weight: 500;
        color: var(--text);
      }

      .filter-select {
        padding: 0.5rem;
        border: 1px solid var(--border);
        border-radius: 0.25rem;
        background: var(--background);
        color: var(--text);
      }

      .filter-results {
        color: var(--text-muted);
        font-size: 0.875rem;
      }

      /* Grid View */
      .carpet-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 1.5rem;
      }

      .carpet-card {
        background: var(--background-lighter);
        border: 1px solid var(--border);
        border-radius: 0.5rem;
        overflow: hidden;
        transition:
          transform 0.2s,
          box-shadow 0.2s;
      }

      .carpet-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px var(--shadow);
      }

      .card-header {
        padding: 1rem;
        border-bottom: 1px solid var(--border);
      }

      .pub-name {
        margin: 0 0 0.5rem 0;
        color: var(--text);
        font-size: 1.125rem;
      }

      .carpet-status {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
      }

      .status-icon {
        font-size: 1rem;
      }

      .card-content {
        padding: 1rem;
      }

      .pub-address {
        color: var(--text-muted);
        margin-bottom: 1rem;
        font-size: 0.875rem;
      }

      .carpet-image {
        margin-bottom: 1rem;
        border-radius: 0.25rem;
        overflow: hidden;
      }

      .carpet-image img {
        width: 100%;
        height: 200px;
        object-fit: cover;
        display: block;
      }

      .no-image-placeholder {
        height: 200px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: var(--background-darker);
        border-radius: 0.25rem;
        margin-bottom: 1rem;
      }

      .placeholder-icon {
        font-size: 2rem;
        margin-bottom: 0.5rem;
      }

      .placeholder-text {
        color: var(--text-muted);
        font-size: 0.875rem;
      }

      .card-metadata {
        margin-bottom: 1rem;
      }

      .metadata-item {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.25rem;
        font-size: 0.875rem;
      }

      .metadata-label {
        color: var(--text-muted);
      }

      .metadata-value {
        color: var(--text);
      }

      .card-actions {
        display: flex;
        gap: 0.5rem;
      }

      .action-btn {
        flex: 1;
        padding: 0.5rem;
        border: 1px solid var(--border);
        border-radius: 0.25rem;
        background: var(--background);
        color: var(--text);
        cursor: pointer;
        font-size: 0.875rem;
        transition: all 0.2s;
      }

      .action-btn:hover {
        background: var(--background-lightest);
      }

      .view-btn {
        background: var(--primary);
        color: var(--on-primary);
        border-color: var(--primary);
      }

      .view-btn:hover {
        background: var(--primary-hover);
      }

      .moderate-btn.warning {
        background: var(--warning);
        color: var(--background);
        border-color: var(--warning);
      }

      .moderate-btn.warning:hover {
        opacity: 0.8;
      }

      /* List View */
      .carpet-table {
        width: 100%;
        border-collapse: collapse;
        background: var(--background-lighter);
        border-radius: 0.5rem;
        overflow: hidden;
        border: 1px solid var(--border);
      }

      .carpet-table th {
        background: var(--background-darker);
        padding: 1rem;
        text-align: left;
        font-weight: 600;
        color: var(--text);
        border-bottom: 1px solid var(--border);
      }

      .carpet-table td {
        padding: 1rem;
        border-bottom: 1px solid var(--border);
        color: var(--text);
      }

      .carpet-table tr:last-child td {
        border-bottom: none;
      }

      .status-badge {
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.875rem;
        font-weight: 500;
      }

      .status-badge[data-status='has-carpet'] {
        background: var(--success);
        color: var(--background);
      }

      .status-badge[data-status='no-carpet'] {
        background: var(--error);
        color: var(--background);
      }

      .status-badge[data-status='unknown'] {
        background: var(--warning);
        color: var(--background);
      }

      .storage-badge {
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.875rem;
      }

      .storage-badge.cloud {
        background: var(--info);
        color: var(--background);
      }

      .storage-badge.local {
        background: var(--warning);
        color: var(--background);
      }

      .actions-cell {
        white-space: nowrap;
      }

      .actions-cell .action-btn {
        margin-right: 0.5rem;
        padding: 0.25rem 0.5rem;
        flex: none;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .carpet-filters {
          flex-direction: column;
          gap: 1rem;
          align-items: stretch;
        }

        .filter-results {
          text-align: center;
        }

        .carpet-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AdminCarpetComponent {
  private readonly pubService = inject(PubService);

  // Component state
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // Data
  readonly allPubs = signal<Pub[]>([]);

  // Computed data
  readonly carpetPubs = computed((): CarpetPubData[] => {
    return this.allPubs().map(pub => ({
      pub,
      carpetStatus: pub.hasCarpet ? 'has-carpet' : 'no-carpet',
      hasCloudImage: !!pub.carpetUrl,
      hasLocalImage: false, // TODO: Check local storage
      lastUpdated: pub.carpetUpdatedAt?.toDate(),
    }));
  });

  readonly pubsWithCarpets = computed((): CarpetPubData[] => {
    return this.carpetPubs().filter(p => p.carpetStatus === 'has-carpet');
  });

  // Stats
  readonly totalPubsWithCarpets = computed(
    () => this.carpetPubs().filter(p => p.carpetStatus === 'has-carpet').length
  );

  readonly pubsWithCloudImages = computed(
    () => this.carpetPubs().filter(p => p.hasCloudImage).length
  );

  readonly recentCarpetUploads = computed(() => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return this.carpetPubs().filter(p => p.lastUpdated && p.lastUpdated > sevenDaysAgo).length;
  });

  readonly carpetCoveragePercentage = computed(() => {
    const total = this.carpetPubs().length;
    const withCarpets = this.totalPubsWithCarpets();
    return total > 0 ? Math.round((withCarpets / total) * 100) : 0;
  });

  // Additional analytics computed properties
  readonly averagePhotosPerDay = computed(() => {
    const carpets = this.carpetPubs().filter(p => p.lastUpdated);
    if (carpets.length === 0) return '0';

    const now = new Date();
    const daysSinceFirst = carpets.reduce((oldest, carpet) => {
      const date = carpet.lastUpdated!;
      return date < oldest ? date : oldest;
    }, now);

    const daysDiff = Math.max(
      1,
      Math.ceil((now.getTime() - daysSinceFirst.getTime()) / (1000 * 60 * 60 * 24))
    );
    return (carpets.length / daysDiff).toFixed(1);
  });

  readonly totalStorageUsed = computed(() => {
    // Estimate: avg 50KB per photo
    const photoCount = this.pubsWithCloudImages();
    const estimatedMB = (photoCount * 50) / 1024;
    return estimatedMB > 1000
      ? `${(estimatedMB / 1024).toFixed(1)}GB`
      : `${estimatedMB.toFixed(0)}MB`;
  });

  readonly weeklyUploads = computed(() => {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return this.carpetPubs().filter(p => p.lastUpdated && p.lastUpdated > oneWeekAgo).length;
  });

  readonly monthlyUploads = computed(() => {
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return this.carpetPubs().filter(p => p.lastUpdated && p.lastUpdated > oneMonthAgo).length;
  });

  readonly peakUploadDay = computed(() => {
    const uploads = this.carpetPubs().filter(p => p.lastUpdated);
    if (uploads.length === 0) return 'No data';

    // Group by day and find the day with most uploads
    const uploadsByDay = uploads.reduce(
      (acc, carpet) => {
        const day = carpet.lastUpdated!.toLocaleDateString();
        acc[day] = (acc[day] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const [peakDay, count] = Object.entries(uploadsByDay).reduce(
      (max, [day, count]) => (count > max[1] ? [day, count] : max),
      ['', 0]
    );

    return count > 0 ? `${peakDay} (${count} photos)` : 'No data';
  });

  readonly storageSuccessRate = computed(() => {
    const withCarpets = this.totalPubsWithCarpets();
    const withUrls = this.pubsWithCloudImages();
    return withCarpets > 0 ? Math.round((withUrls / withCarpets) * 100) : 0;
  });

  readonly recentlyUpdatedCount = computed(() => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    return this.carpetPubs().filter(p => p.lastUpdated && p.lastUpdated > threeDaysAgo).length;
  });

  readonly missingPhotosCount = computed(() => {
    return this.carpetPubs().filter(p => p.carpetStatus === 'has-carpet' && !p.hasCloudImage)
      .length;
  });

  readonly topCoveredCity = computed(() => {
    const cityStats = this.getCityStats();
    const topCity = Object.entries(cityStats).sort(([, a], [, b]) => b.coverage - a.coverage)[0];

    return topCity ? `${topCity[0]} (${(topCity[1].coverage * 100).toFixed(0)}%)` : 'No data';
  });

  readonly leastCoveredCity = computed(() => {
    const cityStats = this.getCityStats();
    const leastCity = Object.entries(cityStats)
      .filter(([, stats]) => stats.total > 0)
      .sort(([, a], [, b]) => a.coverage - b.coverage)[0];

    return leastCity ? `${leastCity[0]} (${(leastCity[1].coverage * 100).toFixed(0)}%)` : 'No data';
  });

  readonly citiesWithCarpets = computed(() => {
    const cityStats = this.getCityStats();
    const citiesWithCoverage = Object.values(cityStats).filter(
      stats => stats.withCarpets > 0
    ).length;
    const totalCities = Object.keys(cityStats).length;

    return `${citiesWithCoverage}/${totalCities}`;
  });

  // Helper method for city statistics
  private getCityStats() {
    return this.carpetPubs().reduce(
      (acc, carpetPub) => {
        const city = carpetPub.pub.city || 'Unknown';
        if (!acc[city]) {
          acc[city] = { total: 0, withCarpets: 0, coverage: 0 };
        }
        acc[city].total++;
        if (carpetPub.carpetStatus === 'has-carpet') {
          acc[city].withCarpets++;
        }
        acc[city].coverage = acc[city].withCarpets / acc[city].total;
        return acc;
      },
      {} as Record<string, { total: number; withCarpets: number; coverage: number }>
    );
  }

  constructor() {
    this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const pubs = await this.pubService.getAllPubs();
      this.allPubs.set(pubs);
      console.log('[AdminCarpet] Loaded pubs:', pubs.length);
    } catch (error) {
      console.error('[AdminCarpet] Failed to load pubs:', error);
      this.error.set('Failed to load pub data. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  refreshData(): void {
    this.loadData();
  }

  viewFullImage(url: string): void {
    window.open(url, '_blank');
  }

  viewPubDetails(pubId: string): void {
    // TODO: Implement pub details modal or navigate to pub page
    console.log('[AdminCarpet] View pub details:', pubId);
  }

  flagPhoto(pubId: string): void {
    const confirmed = confirm(
      'Are you sure you want to flag this photo for review? This will mark it for moderation.'
    );
    if (confirmed) {
      // TODO: Implement photo flagging functionality
      console.log('[AdminCarpet] Flagging photo for pub:', pubId);

      // For now, just show an alert
      alert(
        'Photo has been flagged for review. In a full implementation, this would:\n\n' +
          '• Mark the photo as requiring moderation\n' +
          '• Send notification to moderators\n' +
          '• Add entry to moderation queue\n' +
          '• Potentially hide photo from public view'
      );
    }
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src =
      'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23f0f0f0"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999">No Image</text></svg>';
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
