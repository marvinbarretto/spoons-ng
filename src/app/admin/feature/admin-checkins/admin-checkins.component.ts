// src/app/admin/feature/admin-checkins/admin-checkins.component.ts
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../shared/base/base.component';
import { LoadingStateComponent } from '../../../shared/ui/loading-state/loading-state.component';
import { ErrorStateComponent } from '../../../shared/ui/error-state/error-state.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { DataTableComponent } from '../../../shared/ui/data-table/data-table.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { OverlayService } from '../../../shared/data-access/overlay.service';
import { AdminCheckinService } from './admin-checkin.service';
import { CheckInStore } from '../../../check-in/data-access/check-in.store';
import { UserStore } from '../../../users/data-access/user.store';
import { PubStore } from '../../../pubs/data-access/pub.store';
import type { CheckIn } from '../../../check-in/utils/check-in.models';
import type { TableColumn } from '../../../shared/ui/data-table/data-table.model';

type CheckInWithDetails = CheckIn & {
  displayName?: string;
  photoURL?: string;
  pubName?: string;
  formattedDate?: string;
  pointsDisplay?: string;
  landlordBadge?: string;
  hasCarpet?: string;
};

@Component({
  selector: 'app-admin-checkins',
  imports: [
    CommonModule,
    LoadingStateComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    DataTableComponent,
    ButtonComponent
  ],
  template: `
    <div class="admin-checkins">
      <header class="admin-header">
        <h1>🍺 Check-ins Management</h1>
        <p>View and manage all user check-ins across the platform</p>
      </header>

      <!-- Stats Overview -->
      @if (stats(); as statsData) {
        <section class="stats-overview">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">{{ statsData.totalCheckIns }}</div>
              <div class="stat-label">Total Check-ins</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ statsData.todayCheckIns }}</div>
              <div class="stat-label">Today</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ statsData.weeklyCheckIns }}</div>
              <div class="stat-label">This Week</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ statsData.uniqueUsers }}</div>
              <div class="stat-label">Active Users</div>
            </div>
          </div>
        </section>
      }

      <!-- Controls -->
      <section class="controls">
        <div class="control-group">
          <app-button
            variant="secondary"
            size="sm"
            [loading]="loading()"
            (onClick)="refreshData()"
          >
            Refresh Data
          </app-button>
        </div>
      </section>

      <!-- Check-ins Table -->
      <section class="checkins-table">
        @if (loading()) {
          <app-loading-state text="Loading check-ins..." />
        } @else if (error()) {
          <app-error-state
            [message]="error()!"
            [showRetry]="true"
            retryText="Try Again"
            (retry)="handleRetry()"
          />
        } @else if (enrichedCheckIns().length === 0) {
          <app-empty-state
            icon="🍺"
            title="No check-ins found"
            subtitle="Check-ins will appear here when users check into pubs"
          />
        } @else {
          <app-data-table
            [data]="enrichedCheckIns()"
            [columns]="tableColumns"
            [loading]="loading()"
            [onRowClick]="handleRowClick"
            trackBy="id"
          />
        }
      </section>
    </div>
  `,
  styles: `
    .admin-checkins {
      max-width: 1400px;
      margin: 0 auto;
      padding: 1rem;
    }

    .admin-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .admin-header h1 {
      margin: 0 0 0.5rem;
      color: var(--text);
      font-size: clamp(1.5rem, 4vw, 2.5rem);
    }

    .admin-header p {
      margin: 0;
      color: var(--text-secondary);
      font-size: 1rem;
    }

    .stats-overview {
      margin-bottom: 2rem;
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

    .controls {
      margin-bottom: 2rem;
      padding: 1rem;
      background: var(--background-lighter);
      border-radius: 8px;
      border: 1px solid var(--border);
    }

    .control-group {
      display: flex;
      gap: 1rem;
      align-items: center;
    }

    .checkins-table {
      background: var(--background-lighter);
      border-radius: 8px;
      padding: 1rem;
      border: 1px solid var(--border);
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .admin-checkins {
        padding: 0.5rem;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 0.5rem;
      }

      .stat-card {
        padding: 1rem;
      }

      .stat-value {
        font-size: 1.5rem;
      }

      .control-group {
        flex-direction: column;
        align-items: stretch;
      }
    }
  `
})
export class AdminCheckinsComponent extends BaseComponent implements OnInit {
  private readonly adminCheckinService = inject(AdminCheckinService);
  private readonly overlayService = inject(OverlayService);
  private readonly checkInStore = inject(CheckInStore);
  private readonly userStore = inject(UserStore);
  private readonly pubStore = inject(PubStore);

  // Use reactive data from stores instead of local signals
  readonly checkIns = this.checkInStore.checkins;
  readonly storeLoading = computed(() =>
    this.checkInStore.loading() || this.userStore.loading() || this.pubStore.loading()
  );
  readonly storeError = computed(() =>
    this.checkInStore.error() || this.userStore.error() || this.pubStore.error()
  );

  // Computed stats from reactive data
  readonly stats = computed(() => {
    const allCheckIns = this.checkIns();
    if (allCheckIns.length === 0) return null;

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const todayCheckIns = allCheckIns.filter((c: CheckIn) => c.dateKey === today);
    const weeklyCheckIns = allCheckIns.filter((c: CheckIn) => {
      const checkInDate = new Date(c.timestamp.toDate());
      return checkInDate >= weekAgo;
    });
    const uniqueUsers = new Set(allCheckIns.map((c: CheckIn) => c.userId)).size;

    return {
      totalCheckIns: allCheckIns.length,
      todayCheckIns: todayCheckIns.length,
      weeklyCheckIns: weeklyCheckIns.length,
      uniqueUsers
    };
  });

  // Table configuration
  readonly tableColumns: TableColumn[] = [
    {
      key: 'displayName',
      label: 'User',
      // renderer: 'user-chip', // TODO: Implement proper renderer function
      sortable: true,
      className: 'user-cell'
    },
    {
      key: 'pubName',
      label: 'Pub',
      sortable: true,
      className: 'name'
    },
    {
      key: 'formattedDate',
      label: 'Date',
      sortable: true,
      className: 'date'
    },
    {
      key: 'pointsDisplay',
      label: 'Points',
      sortable: true,
      className: 'number points-primary'
    },
    {
      key: 'landlordBadge',
      label: 'Landlord',
      hideOnMobile: true
    },
    {
      key: 'hasCarpet',
      label: 'Carpet',
      hideOnMobile: true
    }
  ];

  // Computed enriched check-ins with user and pub data
  readonly enrichedCheckIns = computed((): CheckInWithDetails[] => {
    const checkIns = this.checkIns();
    const users = this.userStore.data();
    const pubs = this.pubStore.data();

    return checkIns.map((checkIn: CheckIn) => {
      const user = users.find(u => u.uid === checkIn.userId);
      const pub = pubs.find(p => p.id === checkIn.pubId);

      return {
        ...checkIn,
        displayName: user?.displayName || 'Unknown User',
        photoURL: user?.photoURL || undefined,
        pubName: pub?.name || 'Unknown Pub',
        formattedDate: this.formatDate(checkIn.timestamp.toDate()),
        pointsDisplay: checkIn.pointsEarned?.toString() || '0',
        landlordBadge: checkIn.madeUserLandlord ? '👑 Landlord' : '',
        hasCarpet: checkIn.carpetImageKey ? '📸 Yes' : ''
      };
    });
  });

  // Row click handler
  readonly handleRowClick = (row: CheckInWithDetails) => {
    this.openCheckInDetails(row);
  };

  override async ngOnInit(): Promise<void> {
    // Trigger data loading from stores if they haven't loaded yet
    // The stores will handle their own loading logic and reactivity
    console.log('[AdminCheckinsComponent] Initialized - using reactive store data');
  }

  async refreshData(): Promise<void> {
    await this.handleAsync(
      async () => {
        // Refresh all stores
        await Promise.all([
          (this.checkInStore as any).refresh?.() || Promise.resolve(),
          this.userStore.refresh(),
          (this.pubStore as any).refresh?.() || Promise.resolve()
        ]);
      },
      {
        successMessage: 'Data refreshed successfully',
        errorMessage: 'Failed to refresh data'
      }
    );
  }

  async handleRetry(): Promise<void> {
    await this.refreshData();
  }

  private async openCheckInDetails(checkIn: CheckInWithDetails): Promise<void> {
    // Import the modal component dynamically to avoid circular dependencies
    const { ModalCheckInDetailsComponent } = await import('./modal-check-in-details.component');

    const { result } = this.overlayService.open(ModalCheckInDetailsComponent, {}, {
      checkIn,
      onSave: async (updatedCheckIn: Partial<CheckIn>) => {
        await this.handleAsync(
          () => this.adminCheckinService.updateCheckIn(checkIn.id, updatedCheckIn),
          {
            successMessage: 'Check-in updated successfully',
            errorMessage: 'Failed to update check-in'
          }
        );
        // Data will automatically update via reactive stores
      },
      onDelete: async () => {
        await this.handleAsync(
          () => this.adminCheckinService.deleteCheckIn(checkIn.id),
          {
            successMessage: 'Check-in deleted successfully',
            errorMessage: 'Failed to delete check-in'
          }
        );
        // Data will automatically update via reactive stores
      }
    });

    try {
      await result;
    } catch (error) {
      // Modal was cancelled or closed
    }
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
}
