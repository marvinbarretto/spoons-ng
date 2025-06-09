import { Component, Input, computed, inject, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Timestamp } from 'firebase/firestore';
import type { Badge } from '../../utils/badge.model';
import { OverlayService } from '../../../shared/data-access/overlay.service';

@Component({
  selector: 'app-badge-form',
  imports: [ReactiveFormsModule],
  template: `
    <div class="modal-container">
      <div class="modal-header">
        <h2>{{ isEditing() ? 'Edit Badge' : 'Create Badge' }}</h2>
        <button (click)="cancel()" type="button" class="close-btn">×</button>
      </div>

      <form (ngSubmit)="save()" [formGroup]="form" class="badge-form">
        <div class="modal-body">
          <div class="form-group">
            <label for="name">Name *</label>
            <input
              id="name"
              formControlName="name"
              type="text"
              placeholder="Enter badge name"
            />
          </div>

          <div class="form-group">
            <label for="description">Description</label>
            <textarea
              id="description"
              formControlName="description"
              placeholder="What does this badge represent?"
              rows="3"
            ></textarea>
          </div>

          <div class="form-group">
            <label for="criteria">Criteria *</label>
            <input
              id="criteria"
              formControlName="criteria"
              type="text"
              placeholder="e.g. first-checkin, early-riser"
            />
            <small>Machine-readable key for badge logic</small>
          </div>

          <div class="form-group">
            <label>Choose Emoji *</label>
            <div class="emoji-grid">
              @for (option of emojiOptions; track option.emoji) {
                <button
                  type="button"
                  class="emoji-option"
                  [class.selected]="form.controls.emoji.value === option.emoji"
                  (click)="selectEmoji(option.emoji)"
                  [title]="option.name"
                >
                  {{ option.emoji }}
                </button>
              }
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" (click)="cancel()" class="btn-secondary">
            Cancel
          </button>
          <button type="submit" [disabled]="form.invalid" class="btn-primary">
            {{ isEditing() ? 'Update Badge' : 'Create Badge' }}
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

    .badge-form {
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

    .emoji-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 8px;
      margin-top: 8px;
    }

    .emoji-option {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      background: white;
      font-size: 24px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .emoji-option:hover {
      border-color: #3b82f6;
      background-color: #f8fafc;
    }

    .emoji-option.selected {
      border-color: #3b82f6;
      background-color: #eff6ff;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
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
export class BadgeFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly overlayService = inject(OverlayService);

  @Input() badge?: Badge;
  closeCallback?: (badge: Badge | null) => void;

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
    criteria: ['', Validators.required],
    emoji: ['🏅', Validators.required]
  });

  readonly isEditing = computed(() => !!this.badge);

  // ✅ Fixed: unique tracking and better emoji selection
  readonly emojiOptions = [
    { emoji: '🏆', name: 'Trophy' },
    { emoji: '🥇', name: 'Gold Medal' },
    { emoji: '🥈', name: 'Silver Medal' },
    { emoji: '🥉', name: 'Bronze Medal' },
    { emoji: '🏅', name: 'Medal' },
    { emoji: '🎖️', name: 'Military Medal' },
    { emoji: '🎯', name: 'Direct Hit' },
    { emoji: '⭐', name: 'Star' },
    { emoji: '🌟', name: 'Glowing Star' },
    { emoji: '✨', name: 'Sparkles' },
    { emoji: '🔥', name: 'Fire' },
    { emoji: '💎', name: 'Diamond' },
    { emoji: '🎊', name: 'Confetti Ball' },
    { emoji: '🎉', name: 'Party Popper' },
    { emoji: '🚀', name: 'Rocket' },
    { emoji: '⚡', name: 'Lightning' },
    { emoji: '🌅', name: 'Sunrise' },
    { emoji: '🍻', name: 'Clinking Beer Mugs' }
  ];

  ngOnInit(): void {
    if (this.badge) {
      this.form.patchValue({
        name: this.badge.name,
        description: this.badge.description,
        criteria: this.badge.criteria,
        emoji: this.badge.emoji
      });
    }
  }

  selectEmoji(emoji: string): void {
    this.form.patchValue({ emoji });
  }

  save(): void {
    if (this.form.invalid) return;

    const formValue = this.form.getRawValue();
    const badge: Badge = this.isEditing()
      ? {
          ...this.badge!,
          ...formValue
        }
      : {
          id: crypto.randomUUID(),
          ...formValue,
          createdAt: Timestamp.now()
        };

    this.closeCallback?.(badge);
    this.overlayService.closeFromComponent();
  }

  cancel(): void {
    this.closeCallback?.(null);
    this.overlayService.closeFromComponent();
  }
}
