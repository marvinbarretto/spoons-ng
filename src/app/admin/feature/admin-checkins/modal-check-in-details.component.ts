// src/app/admin/feature/admin-checkins/modal-check-in-details.component.ts
import { Component, input, output, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Timestamp } from 'firebase/firestore';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { ChipUserComponent } from '../../../shared/ui/chips/chip-user/chip-user.component';
import { UserStore } from '../../../users/data-access/user.store';
import { PubStore } from '../../../pubs/data-access/pub.store';
import type { CheckIn, PointsBreakdown } from '../../../check-in/utils/check-in.models';

type CheckInWithDetails = CheckIn & {
  displayName?: string;
  photoURL?: string;
  pubName?: string;
};

@Component({
  selector: 'app-modal-check-in-details',
  imports: [
    CommonModule,
    FormsModule,
    ButtonComponent,
    ChipUserComponent
  ],
  template: `
    <div class="modal-check-in-details">
      <header class="modal-header">
        <h2>Check-in Details</h2>
        <button class="close-btn" (click)="handleClose()" aria-label="Close">×</button>
      </header>

      <div class="modal-content">
        <!-- User Information -->
        <section class="section">
          <h3>User Information</h3>
          <div class="user-info">
            @if (userData(); as user) {
              <app-chip-user
                [user]="{
                  displayName: user.displayName,
                  photoURL: user.photoURL || undefined
                }"
                [clickable]="false"
              />
            } @else {
              <span class="text-muted">User not found ({{ checkIn().userId }})</span>
            }
          </div>
        </section>

        <!-- Pub Information -->
        <section class="section">
          <h3>Pub Information</h3>
          <div class="pub-info">
            @if (pubData(); as pub) {
              <div class="info-item">
                <strong>{{ pub.name }}</strong>
                @if (pub.address) {
                  <div class="text-muted">{{ pub.address }}</div>
                }
              </div>
            } @else {
              <span class="text-muted">Pub not found ({{ checkIn().pubId }})</span>
            }
          </div>
        </section>

        <!-- Check-in Details -->
        <section class="section">
          <h3>Check-in Details</h3>
          <div class="form-grid">
            <div class="form-group">
              <label for="timestamp">Date & Time</label>
              <input
                id="timestamp"
                type="datetime-local"
                [value]="formatDateTimeForInput(checkIn().timestamp.toDate())"
                (input)="updateTimestamp($event)"
                class="form-input"
              />
            </div>


            <div class="form-group">
              <label>Points Breakdown</label>
              <div class="points-breakdown-editable">
                <div class="breakdown-input-row">
                  <label for="basePoints">Base Points:</label>
                  <input
                    id="basePoints"
                    type="number"
                    [value]="getCurrentBreakdownValue('base')"
                    (input)="updateBreakdownValue('base', $event)"
                    class="breakdown-input"
                    min="0"
                    step="1"
                  />
                </div>
                <div class="breakdown-input-row">
                  <label for="distanceBonus">Distance Bonus:</label>
                  <input
                    id="distanceBonus"
                    type="number"
                    [value]="getCurrentBreakdownValue('distance')"
                    (input)="updateBreakdownValue('distance', $event)"
                    class="breakdown-input"
                    min="0"
                    step="1"
                  />
                </div>
                <div class="breakdown-input-row">
                  <label for="otherBonus">Other Bonus:</label>
                  <input
                    id="otherBonus"
                    type="number"
                    [value]="getCurrentBreakdownValue('bonus')"
                    (input)="updateBreakdownValue('bonus', $event)"
                    class="breakdown-input"
                    min="0"
                    step="1"
                  />
                </div>
                <div class="breakdown-input-row">
                  <label for="multiplier">Multiplier:</label>
                  <input
                    id="multiplier"
                    type="number"
                    [value]="getCurrentBreakdownValue('multiplier')"
                    (input)="updateBreakdownValue('multiplier', $event)"
                    class="breakdown-input"
                    min="1"
                    step="0.1"
                  />
                </div>
                <div class="breakdown-input-row">
                  <label for="photoQuality">Photo Quality (%):</label>
                  <input
                    id="photoQuality"
                    type="number"
                    [value]="getCurrentBreakdownValue('photoQuality')"
                    (input)="updateBreakdownValue('photoQuality', $event)"
                    class="breakdown-input"
                    min="0"
                    max="100"
                    step="1"
                  />
                </div>
                <div class="breakdown-input-row">
                  <label for="reason">Reason:</label>
                  <input
                    id="reason"
                    type="text"
                    [value]="getCurrentBreakdownValue('reason')"
                    (input)="updateBreakdownValue('reason', $event)"
                    class="breakdown-input reason-input"
                    placeholder="Points calculation reason..."
                  />
                </div>
                <div class="breakdown-total">
                  <span class="total-label">Calculated Total:</span>
                  <span class="total-value">{{ calculatedTotal() }}</span>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  [checked]="editableData().madeUserLandlord || false"
                  (change)="updateLandlordStatus($event)"
                />
                <span>Made User Landlord</span>
              </label>
            </div>

            @if (checkIn().badgeName) {
              <div class="form-group">
                <label>Badge Earned</label>
                <div class="badge-info">
                  🏆 {{ checkIn().badgeName }}
                </div>
              </div>
            }

            @if (checkIn().carpetImageKey) {
              <div class="form-group">
                <label>Carpet Image</label>
                <div class="carpet-info">
                  📸 {{ checkIn().carpetImageKey }}
                </div>
              </div>
            }
          </div>
        </section>

        <!-- Metadata -->
        <section class="section">
          <h3>Metadata</h3>
          <div class="metadata-grid">
            <div class="metadata-item">
              <span class="label">Check-in ID:</span>
              <span class="value">{{ checkIn().id }}</span>
            </div>
            <div class="metadata-item">
              <span class="label">Date Key:</span>
              <span class="value">{{ checkIn().dateKey }}</span>
            </div>
            @if (checkIn().missionUpdated) {
              <div class="metadata-item">
                <span class="label">Mission Updated:</span>
                <span class="value">✅ Yes</span>
              </div>
            }
          </div>
        </section>
      </div>

      <footer class="modal-footer">
        <div class="button-group">
          <app-button
            variant="danger"
            size="sm"
            (onClick)="handleDelete()"
            [loading]="isDeleting()"
          >
            Delete Check-in
          </app-button>
        </div>
        <div class="button-group">
          <app-button
            variant="secondary"
            size="sm"
            (onClick)="handleClose()"
          >
            Cancel
          </app-button>
          <app-button
            variant="primary"
            size="sm"
            (onClick)="handleSave()"
            [loading]="isSaving()"
            [disabled]="!hasChanges()"
          >
            Save Changes
          </app-button>
        </div>
      </footer>
    </div>
  `,
  styles: `
    .modal-check-in-details {
      width: 90vw;
      max-width: 600px;
      max-height: 90vh;
      background: var(--background);
      border-radius: 12px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid var(--border);
      background: var(--background-lighter);
    }

    .modal-header h2 {
      margin: 0;
      color: var(--text);
      font-size: 1.25rem;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: var(--text-secondary);
      padding: 0.25rem;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .close-btn:hover {
      background: var(--background-darker);
      color: var(--text);
    }

    .modal-content {
      flex: 1;
      overflow-y: auto;
      padding: 0;
    }

    .section {
      padding: 1.5rem;
      border-bottom: 1px solid var(--border);
    }

    .section:last-child {
      border-bottom: none;
    }

    .section h3 {
      margin: 0 0 1rem;
      color: var(--text);
      font-size: 1rem;
      font-weight: 600;
    }

    .user-info,
    .pub-info {
      margin-top: 0.5rem;
    }

    .info-item {
      line-height: 1.4;
    }

    .text-muted {
      color: var(--text-muted);
      font-size: 0.9rem;
    }

    .form-grid {
      display: grid;
      gap: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-group label {
      font-weight: 500;
      color: var(--text);
      font-size: 0.9rem;
    }

    .form-input {
      padding: 0.75rem;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--background);
      color: var(--text);
      font-size: 0.9rem;
      transition: border-color 0.2s ease;
    }

    .form-input:focus {
      outline: none;
      border-color: var(--primary);
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      font-size: 0.9rem;
    }

    .checkbox-label input[type="checkbox"] {
      margin: 0;
    }

    .badge-info,
    .carpet-info {
      padding: 0.5rem;
      background: var(--background-lighter);
      border-radius: 4px;
      font-size: 0.9rem;
      color: var(--text-secondary);
    }

    .metadata-grid {
      display: grid;
      gap: 0.5rem;
    }

    .metadata-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--border);
      font-size: 0.9rem;
    }

    .metadata-item:last-child {
      border-bottom: none;
    }

    .metadata-item .label {
      color: var(--text-secondary);
      font-weight: 500;
    }

    .metadata-item .value {
      color: var(--text);
      font-family: monospace;
    }

    .points-breakdown {
      background: var(--background-lighter);
      border-radius: 8px;
      padding: 1rem;
      border: 1px solid var(--border);
    }

    .breakdown-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--border);
      font-size: 0.9rem;
    }

    .breakdown-item:last-child {
      border-bottom: none;
    }

    .breakdown-item.total {
      font-weight: 600;
      border-top: 2px solid var(--border);
      margin-top: 0.5rem;
      padding-top: 1rem;
      font-size: 1rem;
    }

    .breakdown-label {
      color: var(--text-secondary);
    }

    .breakdown-value {
      color: var(--text);
      font-weight: 500;
    }

    .breakdown-item.total .breakdown-value {
      color: var(--primary);
      font-weight: 700;
    }

    .breakdown-reason {
      margin-top: 0.5rem;
      padding-top: 0.5rem;
      border-top: 1px solid var(--border);
      font-size: 0.85rem;
    }

    .breakdown-reason .breakdown-label {
      font-weight: 500;
      display: block;
      margin-bottom: 0.25rem;
    }

    .breakdown-reason .breakdown-value {
      color: var(--text-secondary);
      font-style: italic;
    }

    .no-breakdown {
      padding: 1rem;
      text-align: center;
      color: var(--text-muted);
      font-style: italic;
      background: var(--background-lighter);
      border-radius: 8px;
      border: 1px solid var(--border);
    }

    .points-breakdown-editable {
      background: var(--background-lighter);
      border-radius: 8px;
      padding: 1rem;
      border: 1px solid var(--border);
      display: grid;
      gap: 0.75rem;
    }

    .breakdown-input-row {
      display: grid;
      grid-template-columns: 1fr 120px;
      align-items: center;
      gap: 1rem;
    }

    .breakdown-input-row label {
      color: var(--text-secondary);
      font-size: 0.9rem;
      font-weight: 500;
    }

    .breakdown-input {
      padding: 0.5rem;
      border: 1px solid var(--border);
      border-radius: 4px;
      background: var(--background);
      color: var(--text);
      font-size: 0.9rem;
      transition: border-color 0.2s ease;
    }

    .breakdown-input:focus {
      outline: none;
      border-color: var(--primary);
    }

    .reason-input {
      grid-column: 1 / -1;
      margin-top: 0.5rem;
    }

    .breakdown-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 0;
      border-top: 2px solid var(--border);
      margin-top: 0.5rem;
      font-weight: 600;
      font-size: 1rem;
    }

    .total-label {
      color: var(--text);
    }

    .total-value {
      color: var(--primary);
      font-weight: 700;
    }

    .modal-footer {
      padding: 1.5rem;
      border-top: 1px solid var(--border);
      background: var(--background-lighter);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }

    .button-group {
      display: flex;
      gap: 0.75rem;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .modal-check-in-details {
        width: 95vw;
        max-height: 95vh;
      }

      .modal-header,
      .section,
      .modal-footer {
        padding: 1rem;
      }

      .modal-footer {
        flex-direction: column;
        align-items: stretch;
      }

      .button-group {
        justify-content: center;
      }
    }
  `
})
export class ModalCheckInDetailsComponent {
  // Inputs
  readonly checkIn = input.required<CheckInWithDetails>();
  readonly onSave = input<(data: Partial<CheckIn>) => Promise<void>>();
  readonly onDelete = input<() => Promise<void>>();

  // Outputs
  readonly result = output<'save' | 'delete' | 'cancel'>();

  // Dependencies
  private readonly userStore = inject(UserStore);
  private readonly pubStore = inject(PubStore);

  // State
  private readonly _editableData = signal<Partial<CheckIn>>({});
  private readonly _isSaving = signal(false);
  private readonly _isDeleting = signal(false);

  // Public readonly signals
  readonly editableData = this._editableData.asReadonly();
  readonly isSaving = this._isSaving.asReadonly();
  readonly isDeleting = this._isDeleting.asReadonly();

  // Computed user and pub data
  readonly userData = computed(() => {
    const users = this.userStore.data();
    return users.find(u => u.uid === this.checkIn().userId);
  });

  readonly pubData = computed(() => {
    const pubs = this.pubStore.data();
    return pubs.find(p => p.id === this.checkIn().pubId);
  });

  // Check if there are unsaved changes
  readonly hasChanges = computed(() => {
    const editableData = this.editableData();
    return Object.keys(editableData).length > 0;
  });

  // Auto-calculate total points from breakdown components
  readonly calculatedTotal = computed(() => {
    const breakdown = this.getCurrentBreakdown();
    const baseCalc = (breakdown.base || 0) + (breakdown.distance || 0) + (breakdown.bonus || 0);
    return Math.round(baseCalc * (breakdown.multiplier || 1));
  });

  // Get current breakdown (editable data or original data)
  getCurrentBreakdown() {
    const editableBreakdown = this.editableData().pointsBreakdown;
    const originalBreakdown = this.checkIn().pointsBreakdown;
    
    // Merge original with any editable changes
    return {
      base: editableBreakdown?.base ?? originalBreakdown?.base ?? 0,
      distance: editableBreakdown?.distance ?? originalBreakdown?.distance ?? 0,
      bonus: editableBreakdown?.bonus ?? originalBreakdown?.bonus ?? 0,
      multiplier: editableBreakdown?.multiplier ?? originalBreakdown?.multiplier ?? 1,
      total: editableBreakdown?.total ?? originalBreakdown?.total ?? 0,
      reason: editableBreakdown?.reason ?? originalBreakdown?.reason ?? '',
      photoQuality: editableBreakdown?.photoQuality ?? originalBreakdown?.photoQuality
    };
  }

  // Get current value for a specific breakdown field
  getCurrentBreakdownValue(field: keyof PointsBreakdown): any {
    const breakdown = this.getCurrentBreakdown();
    const value = breakdown[field];
    
    // Provide sensible defaults
    if (value === undefined || value === null) {
      switch (field) {
        case 'multiplier': return 1;
        case 'reason': return '';
        case 'photoQuality': return '';
        default: return 0;
      }
    }
    
    return value;
  }

  // Event handlers
  updateTimestamp(event: Event): void {
    const input = event.target as HTMLInputElement;
    const date = new Date(input.value);
    if (!isNaN(date.getTime())) {
      this._editableData.update(data => ({
        ...data,
        timestamp: Timestamp.fromDate(date),
        dateKey: date.toISOString().split('T')[0]
      }));
    }
  }

  updateBreakdownValue(field: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    let value: any = input.value;
    
    // Parse numeric fields
    if (['base', 'distance', 'bonus', 'multiplier', 'photoQuality'].includes(field)) {
      const parsed = field === 'multiplier' ? parseFloat(value) : parseInt(value, 10);
      value = isNaN(parsed) ? (field === 'multiplier' ? 1 : 0) : parsed;
    }
    
    // Update the breakdown in editable data
    this._editableData.update(data => {
      const currentBreakdown = data.pointsBreakdown || this.checkIn().pointsBreakdown || {
        base: 0,
        distance: 0,
        bonus: 0,
        multiplier: 1,
        total: 0,
        reason: ''
      };
      const updatedBreakdown: PointsBreakdown = {
        ...currentBreakdown,
        [field]: value
      };
      
      // Auto-calculate total and update pointsEarned
      const baseCalc = (updatedBreakdown.base || 0) + (updatedBreakdown.distance || 0) + (updatedBreakdown.bonus || 0);
      const calculatedTotal = Math.round(baseCalc * (updatedBreakdown.multiplier || 1));
      updatedBreakdown.total = calculatedTotal;
      
      return {
        ...data,
        pointsBreakdown: updatedBreakdown,
        pointsEarned: calculatedTotal // Keep pointsEarned in sync
      };
    });
  }


  updateLandlordStatus(event: Event): void {
    const input = event.target as HTMLInputElement;
    this._editableData.update(data => ({
      ...data,
      madeUserLandlord: input.checked
    }));
  }

  async handleSave(): Promise<void> {
    if (!this.hasChanges()) return;

    const onSave = this.onSave();
    if (!onSave) return;

    this._isSaving.set(true);
    try {
      await onSave(this.editableData());
      this.result.emit('save');
    } catch (error) {
      console.error('Failed to save check-in:', error);
    } finally {
      this._isSaving.set(false);
    }
  }

  async handleDelete(): Promise<void> {
    if (!confirm('Are you sure you want to delete this check-in? This action cannot be undone.')) {
      return;
    }

    const onDelete = this.onDelete();
    if (!onDelete) return;

    this._isDeleting.set(true);
    try {
      await onDelete();
      this.result.emit('delete');
    } catch (error) {
      console.error('Failed to delete check-in:', error);
    } finally {
      this._isDeleting.set(false);
    }
  }

  handleClose(): void {
    this.result.emit('cancel');
  }

  formatDateTimeForInput(date: Date): string {
    // Format date for datetime-local input (YYYY-MM-DDTHH:MM)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
}
