import { Component, inject, Input, computed, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Mission } from '../../utils/mission.model';
import { OverlayService } from '../../../shared/data-access/overlay.service';

@Component({
  selector: 'app-mission-form',
  imports: [ReactiveFormsModule],
  template: `
    <div class="modal-container">
      <div class="modal-header">
        <h2>{{ isEditing() ? 'Edit Mission' : 'Create Mission' }}</h2>
        <button (click)="cancel()" type="button" class="close-btn">×</button>
      </div>

      <form (ngSubmit)="save()" [formGroup]="form" class="mission-form">
        <div class="modal-body">
          <div class="form-group">
            <label for="name">Name *</label>
            <input
              id="name"
              formControlName="name"
              type="text"
              placeholder="Enter mission name"
            />
          </div>

          <div class="form-group">
            <label for="description">Description *</label>
            <textarea
              id="description"
              formControlName="description"
              placeholder="What does this mission involve?"
              rows="3"
            ></textarea>
          </div>

          <div class="form-group">
            <label for="pubIds">Pub IDs *</label>
            <textarea
              id="pubIds"
              formControlName="pubIds"
              placeholder="Enter pub IDs, one per line or comma-separated"
              rows="4"
            ></textarea>
            <small>List the pub IDs that are part of this mission</small>
          </div>

          <div class="form-group">
            <label for="badgeRewardId">Badge Reward ID</label>
            <input
              id="badgeRewardId"
              formControlName="badgeRewardId"
              type="text"
              placeholder="Optional badge ID to award on completion"
            />
            <small>Badge to award when mission is completed (optional)</small>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" (click)="cancel()" class="btn-secondary">
            Cancel
          </button>
          <button type="submit" [disabled]="form.invalid" class="btn-primary">
            {{ isEditing() ? 'Update Mission' : 'Create Mission' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: `
    .modal-container {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      width: 100%;
      max-width: 500px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 24px 0;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
      color: #111827;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #6b7280;
      padding: 4px;
      border-radius: 4px;
    }

    .close-btn:hover {
      background-color: #f3f4f6;
      color: #374151;
    }

    .mission-form {
      padding: 24px;
    }

    .modal-body {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    label {
      font-weight: 500;
      color: #374151;
      font-size: 14px;
    }

    input, textarea {
      padding: 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 14px;
      transition: border-color 0.2s;
    }

    input:focus, textarea:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    small {
      color: #6b7280;
      font-size: 12px;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      margin-top: 24px;
    }

    .btn-secondary {
      padding: 10px 20px;
      border: 1px solid #d1d5db;
      background: white;
      color: #374151;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn-secondary:hover {
      background-color: #f9fafb;
      border-color: #9ca3af;
    }

    .btn-primary {
      padding: 10px 20px;
      border: none;
      background: #3b82f6;
      color: white;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn-primary:hover:not(:disabled) {
      background: #2563eb;
    }

    .btn-primary:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }
  `
})
export class MissionFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly overlayService = inject(OverlayService);

  @Input() mission?: Mission;
  closeCallback?: (mission: Mission | null) => void;

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: ['', Validators.required],
    pubIds: ['', Validators.required],
    badgeRewardId: ['']
  });

  readonly isEditing = computed(() => !!this.mission);

  ngOnInit(): void {
    if (this.mission) {
      this.form.patchValue({
        name: this.mission.name,
        description: this.mission.description,
        pubIds: this.mission.pubIds.join('\n'),
        badgeRewardId: this.mission.badgeRewardId || ''
      });
    }
  }

  save(): void {
    if (this.form.invalid) return;

    const formValue = this.form.getRawValue();

    // Parse pub IDs from textarea (support both newlines and commas)
    const pubIds = formValue.pubIds
      .split(/[,\n]/)
      .map(id => id.trim())
      .filter(Boolean);

    const mission: Mission = this.isEditing()
      ? {
          ...this.mission!,
          name: formValue.name,
          description: formValue.description,
          pubIds,
          badgeRewardId: formValue.badgeRewardId || undefined
        }
      : {
          id: crypto.randomUUID(),
          name: formValue.name,
          description: formValue.description,
          pubIds,
          badgeRewardId: formValue.badgeRewardId || undefined
        };

    this.closeCallback?.(mission);
    this.overlayService.closeFromComponent();
  }

  cancel(): void {
    this.closeCallback?.(null);
    this.overlayService.closeFromComponent();
  }
}
