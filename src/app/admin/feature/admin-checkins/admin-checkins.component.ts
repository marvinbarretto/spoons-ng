// src/app/admin/feature/admin-checkins/admin-checkins.component.ts
import { Component, inject, signal, computed, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { BaseComponent } from '../../../shared/base/base.component';
import { LoadingStateComponent } from '../../../shared/ui/loading-state/loading-state.component';
import { ErrorStateComponent } from '../../../shared/ui/error-state/error-state.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { DataTableComponent } from '../../../shared/ui/data-table/data-table.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { UserSelectorComponent } from '../../../shared/ui/user-selector/user-selector.component';
import { PubSelectorComponent } from '../../../shared/ui/pub-selector/pub-selector.component';
import { ChipUserComponent } from '../../../shared/ui/chips/chip-user/chip-user.component';
import { OverlayService } from '../../../shared/data-access/overlay.service';
import { AdminCheckinService } from './admin-checkin.service';
import { CheckInStore } from '../../../check-in/data-access/check-in.store';
import { UserStore } from '../../../users/data-access/user.store';
import { PubStore } from '../../../pubs/data-access/pub.store';
import type { CheckIn } from '../../../check-in/utils/check-in.models';
import type { TableColumn } from '../../../shared/ui/data-table/data-table.model';
import type { UserChipData } from '../../../shared/ui/chips/chip-user/chip-user.component';

type CheckInWithDetails = CheckIn & {
  displayName?: string;
  photoURL?: string;
  email?: string;
  realDisplayName?: string;
  pubName?: string;
  formattedDate?: string;
  pointsDisplay?: string;
};

@Component({
  selector: 'app-admin-checkins',
  imports: [
    FormsModule,
    LoadingStateComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    DataTableComponent,
    ButtonComponent,
    UserSelectorComponent,
    PubSelectorComponent,
    ChipUserComponent
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
          
          <app-button
            variant="primary"
            size="sm"
            (onClick)="toggleManualCheckinForm()"
          >
            {{ showManualForm() ? 'Cancel' : 'Add Manual Check-in' }}
          </app-button>
        </div>
      </section>

      <!-- Manual Check-in Form -->
      @if (showManualForm()) {
        <section class="manual-checkin-form">
          <div class="form-header">
            <h3>📝 Add Manual Check-in</h3>
            <p>Create a check-in record for a user at a specific pub</p>
          </div>
          
          <form class="checkin-form" (ngSubmit)="submitManualCheckin()">
            <div class="form-row">
              <div class="form-field">
                <app-user-selector
                  label="User"
                  [required]="true"
                  searchPlaceholder="Search users by name or email..."
                  [selectedUserId]="manualForm().userId"
                  (selectionChange)="updateFormField('userId', $event)"
                  [showError]="formErrors().userId.length > 0"
                  [errorMessage]="formErrors().userId"
                />
              </div>
              
              <div class="form-field">
                <app-pub-selector
                  label="Pub"
                  [required]="true"
                  searchPlaceholder="Search pubs by name or location..."
                  [selectedPubIds]="manualForm().pubId ? [manualForm().pubId!] : []"
                  (selectionChange)="updateFormField('pubId', $event[0] || null)"
                  [showError]="formErrors().pubId.length > 0"
                  [errorMessage]="formErrors().pubId"
                  [maxDisplayResults]="10"
                />
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-field">
                <label for="checkin-datetime">Check-in Date & Time *</label>
                <input
                  id="checkin-datetime"
                  type="datetime-local"
                  class="form-input"
                  [value]="manualForm().datetime"
                  (input)="updateDatetime($event)"
                  [class.error]="formErrors().datetime.length > 0"
                  required
                />
                @if (formErrors().datetime) {
                  <div class="field-error">{{ formErrors().datetime }}</div>
                }
              </div>
              
              <div class="form-field">
                <label for="points-earned">Points Earned</label>
                <input
                  id="points-earned"
                  type="number"
                  class="form-input"
                  [value]="manualForm().pointsEarned"
                  (input)="updatePointsEarned($event)"
                  placeholder="Leave empty for default calculation"
                  min="0"
                  max="1000"
                />
                <div class="field-helper">Leave empty to use default point calculation</div>
              </div>
            </div>
            
            <div class="form-actions">
              <app-button
                type="button"
                variant="secondary"
                size="md"
                (onClick)="resetManualForm()"
              >
                Reset Form
              </app-button>
              
              <app-button
                type="submit"
                variant="primary"
                size="md"
                [loading]="submittingManualCheckin()"
                [disabled]="!isManualFormValid()"
              >
                Create Check-in
              </app-button>
            </div>
          </form>
        </section>
      }

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
      flex-wrap: wrap;
    }

    .manual-checkin-form {
      margin-bottom: 2rem;
      background: var(--background-lighter);
      border-radius: 8px;
      padding: 1.5rem;
      border: 1px solid var(--border);
    }

    .form-header {
      margin-bottom: 1.5rem;
      text-align: center;
    }

    .form-header h3 {
      margin: 0 0 0.5rem;
      color: var(--text);
      font-size: 1.25rem;
    }

    .form-header p {
      margin: 0;
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    .checkin-form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-field label {
      font-weight: 500;
      color: var(--text);
      font-size: 0.875rem;
    }

    .form-input {
      padding: 0.75rem 1rem;
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 0.875rem;
      background: var(--background);
      color: var(--text);
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .form-input:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(var(--accent), 0.1);
    }

    .form-input.error {
      border-color: var(--error);
    }

    .field-error {
      font-size: 0.75rem;
      color: var(--error);
    }

    .field-helper {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .form-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
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

      .form-row {
        grid-template-columns: 1fr;
        gap: 1rem;
      }

      .form-actions {
        flex-direction: column;
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

  // Manual checkin form state
  private readonly _showManualForm = signal<boolean>(false);
  private readonly _submittingManualCheckin = signal<boolean>(false);
  private readonly _manualForm = signal({
    userId: null as string | null,
    pubId: null as string | null,
    datetime: new Date().toISOString().slice(0, 16), // Default to current time
    pointsEarned: null as number | null
  });

  readonly showManualForm = this._showManualForm.asReadonly();
  readonly submittingManualCheckin = this._submittingManualCheckin.asReadonly();
  readonly manualForm = this._manualForm.asReadonly();

  // Form validation
  readonly formErrors = computed(() => {
    const form = this.manualForm();
    return {
      userId: !form.userId ? 'Please select a user' : '',
      pubId: !form.pubId ? 'Please select a pub' : '',
      datetime: !form.datetime ? 'Please select a date and time' : ''
    };
  });

  readonly isManualFormValid = computed(() => {
    const errors = this.formErrors();
    return !errors.userId && !errors.pubId && !errors.datetime;
  });

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
      renderer: () => null, // Triggers user chip rendering
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
    }
  ];

  // Computed enriched check-ins with user and pub data
  readonly enrichedCheckIns = computed((): CheckInWithDetails[] => {
    const checkIns = this.checkIns();
    const users = this.userStore.data();
    const pubs = this.pubStore.data();

    console.log('[AdminCheckins] 🔍 === ENRICHED CHECKINS DEBUG ===');
    console.log('[AdminCheckins] 🔍 Total checkins:', checkIns.length);
    console.log('[AdminCheckins] 🔍 Users loaded:', users.length);
    console.log('[AdminCheckins] 🔍 Pubs loaded:', pubs.length);

    const enriched = checkIns.map((checkIn: CheckIn, index: number) => {
      const user = users.find(u => u.uid === checkIn.userId);
      const pub = pubs.find(p => p.id === checkIn.pubId);

      // Calculate points display with fallback hierarchy
      const pointsEarned = checkIn.pointsEarned;
      const pointsFromBreakdown = checkIn.pointsBreakdown?.total;
      const finalPoints = pointsEarned ?? pointsFromBreakdown ?? 0;
      
      // Debug logging for each checkin
      console.log(`[AdminCheckins] 🔍 Checkin ${index + 1}:`, {
        id: checkIn.id,
        userId: checkIn.userId,
        pubId: checkIn.pubId,
        pointsEarned: pointsEarned,
        hasPointsBreakdown: !!checkIn.pointsBreakdown,
        pointsFromBreakdown: pointsFromBreakdown,
        finalPoints: finalPoints,
        pointsBreakdownStructure: checkIn.pointsBreakdown ? {
          base: checkIn.pointsBreakdown.base,
          distance: checkIn.pointsBreakdown.distance,
          bonus: checkIn.pointsBreakdown.bonus,
          total: checkIn.pointsBreakdown.total
        } : null,
        userName: user?.displayName,
        pubName: pub?.name
      });
      
      return {
        ...checkIn,
        displayName: user?.displayName || 'Unknown User',
        photoURL: user?.photoURL || undefined,
        email: user?.email || undefined,
        realDisplayName: user?.displayName || undefined,
        pubName: pub?.name || 'Unknown Pub',
        formattedDate: this.formatDate(checkIn.timestamp.toDate()),
        pointsDisplay: finalPoints.toString()
      };
    });

    console.log('[AdminCheckins] 🔍 Enriched checkins result:', enriched.map(c => ({
      id: c.id,
      displayName: c.displayName,
      pubName: c.pubName,
      pointsDisplay: c.pointsDisplay
    })));
    console.log('[AdminCheckins] 🔍 === END ENRICHED CHECKINS DEBUG ===');

    // Sort by timestamp descending (most recent first)
    return enriched.sort((a, b) => b.timestamp.toDate().getTime() - a.timestamp.toDate().getTime());
  });

  // Row click handler
  readonly handleRowClick = (row: CheckInWithDetails) => {
    this.openCheckInDetails(row);
  };

  override async ngOnInit(): Promise<void> {
    console.log('[AdminCheckinsComponent] Initializing - loading all check-ins...');
    
    // Load ALL check-ins from all users (with built-in admin auth check)
    await this.checkInStore.loadAllCheckins();
    
    console.log('[AdminCheckinsComponent] ✅ All check-ins loaded for admin view');
  }

  async refreshData(): Promise<void> {
    await this.handleAsync(
      async () => {
        // Refresh all stores with explicit methods
        await Promise.all([
          this.checkInStore.loadAllCheckins(), // Explicit admin method
          this.userStore.refresh(),
          this.pubStore.loadOnce() // Use loadOnce for global pub data
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

  // Manual checkin form methods
  toggleManualCheckinForm(): void {
    this._showManualForm.update(show => !show);
    if (!this._showManualForm()) {
      this.resetManualForm();
    }
  }

  resetManualForm(): void {
    this._manualForm.set({
      userId: null,
      pubId: null,
      datetime: new Date().toISOString().slice(0, 16),
      pointsEarned: null
    });
  }

  updateFormField(field: string, value: any): void {
    this._manualForm.update(form => ({
      ...form,
      [field]: value
    }));
  }

  updateDatetime(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.updateFormField('datetime', input.value);
  }

  updatePointsEarned(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value ? Number(input.value) : null;
    this.updateFormField('pointsEarned', value);
  }

  async submitManualCheckin(): Promise<void> {
    if (!this.isManualFormValid()) {
      return;
    }

    this._submittingManualCheckin.set(true);

    try {
      const form = this.manualForm();
      const datetime = new Date(form.datetime!);

      await this.handleAsync(
        () => this.adminCheckinService.createManualCheckIn({
          userId: form.userId!,
          pubId: form.pubId!,
          timestamp: datetime,
          pointsEarned: form.pointsEarned
        }),
        {
          successMessage: 'Manual check-in created successfully',
          errorMessage: 'Failed to create manual check-in'
        }
      );

      // Reset form and hide it on success
      this.resetManualForm();
      this._showManualForm.set(false);

      // Refresh data to show the new check-in
      await this.refreshData();

    } catch (error) {
      console.error('[AdminCheckinsComponent] Failed to create manual check-in:', error);
    } finally {
      this._submittingManualCheckin.set(false);
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
