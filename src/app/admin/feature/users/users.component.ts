// src/app/admin/feature/users/users.component.ts
import { Component, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../shared/base/base.component';
import { LoadingStateComponent } from '../../../shared/ui/loading-state/loading-state.component';
import { ErrorStateComponent } from '../../../shared/ui/error-state/error-state.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { DataTableComponent } from '../../../shared/ui/data-table/data-table.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { UserStore } from '../../../users/data-access/user.store';
import type { User } from '../../../users/utils/user.model';
import type { TableColumn } from '../../../shared/ui/data-table/data-table.model';

type UserWithDetails = User & {
  formattedJoinDate?: string;
  statusDisplay?: string;
  pointsDisplay?: string;
};

@Component({
  selector: 'app-admin-users',
  imports: [
    CommonModule,
    LoadingStateComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    DataTableComponent,
    ButtonComponent
  ],
  template: `
    <div class="admin-users">
      <header class="admin-header">
        <h1>👥 User Management</h1>
        <p>View and manage all users registered on the platform</p>
      </header>

      <!-- Stats Overview -->
      @if (stats(); as statsData) {
        <section class="stats-overview">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">{{ statsData.totalUsers }}</div>
              <div class="stat-label">Total Users</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ statsData.activeUsers }}</div>
              <div class="stat-label">Registered Users</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ statsData.anonymousUsers }}</div>
              <div class="stat-label">Anonymous Users</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ statsData.recentSignups }}</div>
              <div class="stat-label">This Week</div>
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
            [loading]="storeLoading()"
            (onClick)="refreshData()"
          >
            Refresh Data
          </app-button>
        </div>
      </section>

      <!-- Users Table -->
      <section class="users-table">
        @if (storeLoading()) {
          <app-loading-state text="Loading users..." />
        } @else if (storeError()) {
          <app-error-state
            [message]="storeError()!"
            [showRetry]="true"
            retryText="Try Again"
            (retry)="handleRetry()"
          />
        } @else if (enrichedUsers().length === 0) {
          <app-empty-state
            icon="👥"
            title="No users found"
            subtitle="Users will appear here when they register"
          />
        } @else {
          <app-data-table
            [data]="enrichedUsers()"
            [columns]="tableColumns"
            [loading]="storeLoading()"
            trackBy="uid"
          />
        }
      </section>
    </div>
  `,
  styles: `
    .admin-users {
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

    .users-table {
      background: var(--background-lighter);
      border-radius: 8px;
      padding: 1rem;
      border: 1px solid var(--border);
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .admin-users {
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
export class AdminUsersComponent extends BaseComponent implements OnInit {
  private readonly userStore = inject(UserStore);

  // Use reactive data from UserStore
  readonly users = this.userStore.data;
  readonly storeLoading = this.userStore.loading;
  readonly storeError = this.userStore.error;

  // Computed stats from reactive data
  readonly stats = computed(() => {
    const allUsers = this.users();
    if (allUsers.length === 0) return null;

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const activeUsers = allUsers.filter((u: User) => !u.isAnonymous);
    const anonymousUsers = allUsers.filter((u: User) => u.isAnonymous);
    const recentSignups = allUsers.filter((u: User) => {
      if (!u.joinedAt) return false;
      const joinDate = new Date(u.joinedAt);
      return joinDate >= weekAgo;
    });

    return {
      totalUsers: allUsers.length,
      activeUsers: activeUsers.length,
      anonymousUsers: anonymousUsers.length,
      recentSignups: recentSignups.length
    };
  });

  // Table configuration
  readonly tableColumns: TableColumn[] = [
    {
      key: 'displayName',
      label: 'User',
      sortable: true,
      className: 'user-cell'
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      className: 'name'
    },
    {
      key: 'formattedJoinDate',
      label: 'Join Date',
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
      key: 'statusDisplay',
      label: 'Status',
      sortable: true,
      className: 'status'
    }
  ];

  // Computed enriched users with display data
  readonly enrichedUsers = computed((): UserWithDetails[] => {
    const users = this.users();

    return users.map((user: User) => {
      return {
        ...user,
        formattedJoinDate: user.joinedAt ? this.formatDate(new Date(user.joinedAt)) : 'Unknown',
        statusDisplay: user.isAnonymous ? 'Anonymous' : 'Registered',
        pointsDisplay: (user.totalPoints || 0).toString()
      };
    });
  });

  override async ngOnInit(): Promise<void> {
    // UserStore will handle its own loading via auth-reactive pattern
    console.log('[AdminUsersComponent] Initialized - using reactive UserStore data');
  }

  async refreshData(): Promise<void> {
    await this.handleAsync(
      async () => {
        await this.userStore.refresh();
      },
      {
        successMessage: 'User data refreshed successfully',
        errorMessage: 'Failed to refresh user data'
      }
    );
  }

  async handleRetry(): Promise<void> {
    await this.refreshData();
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  }
}