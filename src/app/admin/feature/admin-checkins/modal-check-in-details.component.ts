// src/app/admin/feature/admin-checkins/modal-check-in-details.component.ts
import { Component, input, output, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Timestamp } from 'firebase/firestore';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { ChipUserComponent } from '../../../shared/ui/chips/chip-user/chip-user.component';
import { UserStore } from '../../../users/data-access/user.store';
import { PubStore } from '../../../pubs/data-access/pub.store';
import type { CheckIn } from '../../../check-in/utils/check-in.models';

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
              <label for="points">Points Earned</label>
              <input
                id="points"
                type="number"
                [value]="editableData().pointsEarned || 0"
                (input)="updatePoints($event)"
                class="form-input"
                min="0"
                step="1"
              />
            </div>

            <div class="form-group">
              <label for="pointsBreakdown">Points Breakdown</label>
              <textarea
                id="pointsBreakdown"
                [value]="editableData().pointsBreakdown || ''"
                (input)="updatePointsBreakdown($event)"
                class="form-input"
                rows="3"
                placeholder="Points calculation breakdown..."
              ></textarea>
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

  updatePoints(event: Event): void {
    const input = event.target as HTMLInputElement;
    const points = parseInt(input.value, 10);
    this._editableData.update(data => ({
      ...data,
      pointsEarned: isNaN(points) ? 0 : points
    }));
  }

  updatePointsBreakdown(event: Event): void {
    const input = event.target as HTMLTextAreaElement;
    this._editableData.update(data => ({
      ...data,
      pointsBreakdown: input.value
    }));
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
