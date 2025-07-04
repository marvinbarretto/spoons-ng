// src/app/missions/feature/missions-admin/missions-admin.component.ts
import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { MissionStore } from '../../data-access/mission.store';
import { BaseComponent } from '../../../shared/base/base.component';
import type { Mission } from '../../utils/mission.model';

@Component({
  selector: 'app-missions-admin',
  imports: [CommonModule, RouterModule, ButtonComponent],
  template: `
    <section class="missions-admin-page">
      <header class="page-header">
        <div class="header-content">
          <h1>Mission Management</h1>
          <p class="page-subtitle">
            Create and manage missions for users to complete
          </p>
        </div>

        <div class="header-actions">
          <app-button (onClick)="handleCreate()" variant="primary">
            + Create New Mission
          </app-button>
        </div>
      </header>

      @if (missionStore.loading()) {
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading missions...</p>
        </div>
      } @else if (missionStore.error()) {
        <div class="error-state">
          <div class="error-icon">❌</div>
          <p>Failed to load missions</p>
          <p class="error-message">{{ missionStore.error() }}</p>
          <app-button (onClick)="handleRetry()" variant="secondary">
            Try Again
          </app-button>
        </div>
      } @else if (missionStore.missions().length === 0) {
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <h2>No missions yet</h2>
          <p>Create your first mission to get started</p>
          <app-button (onClick)="handleCreate()" variant="primary">
            Create First Mission
          </app-button>
        </div>
      } @else {
        <!-- Mission Statistics -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{{ missionStore.missions().length }}</div>
            <div class="stat-label">Total Missions</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ activeMissionsCount() }}</div>
            <div class="stat-label">With Rewards</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ averagePubCount() }}</div>
            <div class="stat-label">Avg Pubs/Mission</div>
          </div>
        </div>

        <!-- Missions Table -->
        <div class="missions-table-container">
          <table class="missions-table">
            <thead>
              <tr>
                <th>Mission</th>
                <th>Description</th>
                <th>Pubs</th>
                <th>Points</th>
                <th>Time Limit</th>
                <th>Reward</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (mission of missionStore.missions(); track mission.id) {
                <tr class="mission-row">
                  <td class="mission-name">
                    <div class="name-content">
                      <strong>{{ mission.name }}</strong>
                      <span class="mission-id">ID: {{ mission.id }}</span>
                    </div>
                  </td>
                  <td class="mission-description">
                    <p>{{ mission.description }}</p>
                  </td>
                  <td class="pub-count">
                    <div class="count-badge">
                      {{ mission.pubIds.length }}
                    </div>
                  </td>
                  <td class="points-reward">
                    <div class="points-badge">
                      {{ mission.pointsReward || 25 }}pts
                    </div>
                  </td>
                  <td class="time-limit">
                    @if (mission.timeLimitHours) {
                      <span class="time-badge">{{ mission.timeLimitHours }}h</span>
                    } @else {
                      <span class="no-limit">No limit</span>
                    }
                  </td>
                  <td class="reward-info">
                    @if (mission.badgeRewardId) {
                      <span class="reward-badge">🏅 {{ mission.badgeRewardId }}</span>
                    } @else {
                      <span class="no-reward">None</span>
                    }
                  </td>
                  <td class="actions">
                    <div class="action-buttons">
                      <app-button
                        (onClick)="handleEdit(mission.id)"
                        size="sm"
                      >
                        Edit
                      </app-button>
                      <app-button
                        (onClick)="handleDelete(mission)"
                        variant="danger"
                        size="sm"
                      >
                        Delete
                      </app-button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Development debug info -->
      @if (isDevelopment()) {
        <details class="debug-section">
          <summary>Admin Debug Info</summary>
          <div class="debug-content">
            <h4>Store State</h4>
            <pre>{{ debugStoreInfo() | json }}</pre>
            <h4>Mission Summary</h4>
            <pre>{{ debugMissionSummary() | json }}</pre>
          </div>
        </details>
      }
    </section>
  `,
  styles: `
    .missions-admin-page {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
      gap: 2rem;
    }

    .header-content h1 {
      font-size: 2.25rem;
      font-weight: 700;
      margin: 0 0 0.5rem;
      color: var(--text, #111827);
    }

    .page-subtitle {
      color: var(--text-secondary, #6b7280);
      margin: 0;
      font-size: 1.125rem;
    }

    .header-actions {
      flex-shrink: 0;
    }

    .loading-state,
    .error-state,
    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      background: var(--background-darkest, #ffffff);
      border: 1px solid var(--border, #e5e7eb);
      border-radius: 12px;
    }

    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--color-gray-200, #e5e7eb);
      border-top-color: var(--primary, #3b82f6);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-icon,
    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .empty-state h2 {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0 0 0.5rem;
      color: var(--text, #111827);
    }

    .empty-state p {
      color: var(--text-secondary, #6b7280);
      margin: 0 0 2rem;
    }

    .error-message {
      color: var(--color-error, #ef4444);
      font-size: 0.875rem;
      margin: 0.5rem 0 1.5rem;
      font-family: monospace;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: var(--background-darkest, #ffffff);
      border: 1px solid var(--border, #e5e7eb);
      border-radius: 8px;
      padding: 1.5rem;
      text-align: center;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--primary, #3b82f6);
      margin-bottom: 0.5rem;
    }

    .stat-label {
      color: var(--text-secondary, #6b7280);
      font-size: 0.875rem;
      font-weight: 500;
    }

    .missions-table-container {
      background: var(--background-darkest, #ffffff);
      border: 1px solid var(--border, #e5e7eb);
      border-radius: 12px;
      overflow: hidden;
      overflow-x: auto;
    }

    .missions-table {
      width: 100%;
      border-collapse: collapse;
    }

    .missions-table th {
      background: var(--color-gray-50, #f9fafb);
      padding: 1rem;
      text-align: left;
      font-weight: 600;
      color: var(--text, #111827);
      border-bottom: 1px solid var(--border, #e5e7eb);
      font-size: 0.875rem;
      white-space: nowrap;
    }

    .missions-table td {
      padding: 1.25rem 1rem;
      border-bottom: 1px solid var(--border, #e5e7eb);
      vertical-align: top;
    }

    .mission-row:hover {
      background: var(--color-gray-50, #f9fafb);
    }

    .name-content {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .name-content strong {
      color: var(--text, #111827);
      font-weight: 600;
    }

    .mission-id {
      font-size: 0.75rem;
      color: var(--text-secondary, #6b7280);
      font-family: monospace;
    }

    .mission-description p {
      margin: 0;
      color: var(--text-secondary, #6b7280);
      line-height: 1.5;
      max-width: 300px;
    }

    .count-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: var(--primary-subtle, rgba(59, 130, 246, 0.1));
      color: var(--primary, #3b82f6);
      border-radius: 50%;
      font-weight: 600;
      font-size: 0.875rem;
    }

    .points-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.25rem 0.5rem;
      background: var(--color-success-subtle, rgba(16, 185, 129, 0.1));
      color: var(--color-success, #10b981);
      border-radius: 12px;
      font-weight: 600;
      font-size: 0.75rem;
    }

    .time-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.25rem 0.5rem;
      background: var(--color-info-subtle, rgba(59, 130, 246, 0.1));
      color: var(--color-info, #3b82f6);
      border-radius: 12px;
      font-weight: 500;
      font-size: 0.75rem;
    }

    .no-limit {
      color: var(--text-secondary, #6b7280);
      font-style: italic;
      font-size: 0.875rem;
    }

    .reward-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      background: var(--warning-subtle, rgba(245, 158, 11, 0.1));
      color: var(--warning, #f59e0b);
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .no-reward {
      color: var(--text-secondary, #6b7280);
      font-style: italic;
      font-size: 0.875rem;
    }

    .action-buttons {
      display: flex;
      gap: 0.5rem;
    }

    .debug-section {
      margin-top: 3rem;
      padding: 1.5rem;
      background: var(--color-gray-50, #f9fafb);
      border: 1px solid var(--border, #e5e7eb);
      border-radius: 8px;
    }

    .debug-content {
      margin-top: 1rem;
    }

    .debug-content h4 {
      margin: 1rem 0 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .debug-content h4:first-child {
      margin-top: 0;
    }

    .debug-content pre {
      background: var(--background-darkest, #ffffff);
      padding: 1rem;
      border-radius: 6px;
      border: 1px solid var(--border, #e5e7eb);
      overflow-x: auto;
      font-size: 0.75rem;
      margin: 0;
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .missions-admin-page {
        padding: 1rem;
      }

      .page-header {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }

      .missions-table th,
      .missions-table td {
        padding: 0.75rem 0.5rem;
      }

      .mission-description p {
        max-width: 200px;
      }

      /* Hide less important columns on mobile */
      .missions-table th:nth-child(5),
      .missions-table td:nth-child(5) {
        display: none;
      }

      .action-buttons {
        flex-direction: column;
      }
    }

    @media (max-width: 640px) {
      .missions-table-container {
        font-size: 0.875rem;
      }

      .name-content strong {
        font-size: 0.875rem;
      }

      .stat-value {
        font-size: 1.5rem;
      }

      /* Stack table content vertically on very small screens */
      .missions-table th:nth-child(2),
      .missions-table td:nth-child(2),
      .missions-table th:nth-child(6),
      .missions-table td:nth-child(6) {
        display: none;
      }
    }
  `
})
export class MissionsAdminComponent extends BaseComponent {
  // ✅ Dependencies
  protected readonly missionStore = inject(MissionStore);

  // ✅ Computed statistics
  protected readonly activeMissionsCount = computed(() =>
    this.missionStore.missions().filter(m => m.badgeRewardId).length
  );

  protected readonly averagePubCount = computed(() => {
    const missions = this.missionStore.missions();
    if (missions.length === 0) return 0;

    const totalPubs = missions.reduce((sum, m) => sum + m.pubIds.length, 0);
    return Math.round(totalPubs / missions.length);
  });

  // ✅ Development helper
  protected readonly isDevelopment = computed(() => true);

  // ✅ Debug information
  protected readonly debugStoreInfo = computed(() => ({
    loading: this.missionStore.loading(),
    error: this.missionStore.error(),
    missionCount: this.missionStore.missions().length,
    hasData: this.missionStore.missions().length > 0
  }));

  protected readonly debugMissionSummary = computed(() => {
    const missions = this.missionStore.missions();
    return {
      totalMissions: missions.length,
      withRewards: this.activeMissionsCount(),
      averagePubs: this.averagePubCount(),
      pubCountRange: missions.length > 0 ? {
        min: Math.min(...missions.map(m => m.pubIds.length)),
        max: Math.max(...missions.map(m => m.pubIds.length))
      } : null
    };
  });

  // ✅ Data loading
  protected override onInit(): void {
    this.missionStore.loadOnce();
  }

  // ✅ Navigation actions
  handleCreate(): void {
    console.log('[MissionsAdmin] Navigating to create mission');
    this.router.navigate(['/admin/missions/new']);
  }

  handleEdit(missionId: string): void {
    console.log('[MissionsAdmin] Navigating to edit mission:', missionId);
    this.router.navigate(['/admin/missions', missionId, 'edit']);
  }

  handleRetry(): void {
    console.log('[MissionsAdmin] Retrying mission load');
    this.missionStore.loadOnce();
  }

  // ✅ Delete with confirmation
  async handleDelete(mission: Mission): Promise<void> {
    const confirmed = confirm(
      `Are you sure you want to delete "${mission.name}"?\n\n` +
      `This mission has ${mission.pubIds.length} pubs and will be permanently removed.\n\n` +
      `This action cannot be undone.`
    );

    if (!confirmed) {
      console.log('[MissionsAdmin] Delete cancelled by user');
      return;
    }

    try {
      console.log('[MissionsAdmin] Deleting mission:', mission.name);
      await this.missionStore.delete(mission.id);
      console.log('[MissionsAdmin] ✅ Mission deleted successfully');
      this.showSuccess(`Mission "${mission.name}" deleted successfully`);
    } catch (error: any) {
      console.error('[MissionsAdmin] ❌ Delete failed:', error);
      this.showError(error?.message || 'Failed to delete mission');
    }
  }
}
