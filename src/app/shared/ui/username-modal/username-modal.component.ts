// src/app/shared/ui/username-modal/username-modal.component.ts
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthStore } from '../../../auth/data-access/auth.store';
import { ButtonComponent } from '../button/button.component';
import { generateAnonymousName } from '../../utils/anonymous-names';

@Component({
  selector: 'app-username-modal',
  imports: [CommonModule, FormsModule, ButtonComponent],
  template: `
    <div class="modal-container">
      <div class="modal-header">
        <h2>Change Your Pub Name</h2>
        <p class="subtitle">Choose how other pub crawlers will know you!</p>
      </div>

      <div class="modal-body">
        <!-- Current Name Preview -->
        <div class="current-name">
          <h3>Current Name</h3>
          <div class="name-display">{{ currentDisplayName() }}</div>
        </div>

        <!-- Name Input -->
        <div class="name-input-section">
          <label for="newName">New Pub Name</label>
          <input
            id="newName"
            type="text"
            [(ngModel)]="newName"
            [placeholder]="suggestedName()"
            maxlength="30"
            class="name-input"
          />
          <small class="input-hint">
            {{ newName().length }}/30 characters
          </small>
        </div>

        <!-- Preview -->
        @if (previewName()) {
          <div class="preview-section">
            <h3>Preview</h3>
            <div class="name-preview">{{ previewName() }}</div>
          </div>
        }

        <!-- Quick Suggestions -->
        <div class="suggestions">
          <h3>Quick Ideas</h3>
          <div class="suggestion-buttons">
            @for (suggestion of suggestions(); track suggestion) {
              <button
                class="suggestion-btn"
                (click)="useSuggestion(suggestion)"
                [disabled]="saving()"
              >
                {{ suggestion }}
              </button>
            }
          </div>
        </div>

        <!-- Rules -->
        <div class="rules">
          <small>
            Keep it friendly! Names should be appropriate for a pub environment.
            You can change this anytime.
          </small>
        </div>
      </div>

      <div class="modal-footer">
        <app-button
          variant="ghost"
          (onClick)="cancel()"
          [disabled]="saving()"
        >
          Cancel
        </app-button>

        <app-button
          variant="primary"
          (onClick)="saveName()"
          [loading]="saving()"
          [disabled]="!isValidName() || saving()"
        >
          Save Name
        </app-button>
      </div>
    </div>
  `,
  styles: [`
    .modal-container {
      background: var(--color-background);
      border: 1px solid var(--color-subtleDarker);
      border-radius: 12px;
      max-width: 500px;
      width: 90vw;
      max-height: 80vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .modal-header {
      padding: 1.5rem;
      border-bottom: 1px solid var(--color-subtleLighter);
      text-align: center;

      h2 {
        margin: 0 0 0.5rem;
        color: var(--color-text);
      }

      .subtitle {
        margin: 0;
        opacity: 0.8;
        color: var(--color-text);
      }
    }

    .modal-body {
      flex: 1;
      padding: 1.5rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .current-name, .preview-section {
      h3 {
        margin: 0 0 0.5rem;
        font-size: 1rem;
        color: var(--color-text);
        opacity: 0.8;
      }

      .name-display, .name-preview {
        font-size: 1.25rem;
        font-weight: 600;
        padding: 0.75rem 1rem;
        background: var(--color-subtleLighter);
        border-radius: 6px;
        color: var(--color-text);
      }
    }

    .preview-section .name-preview {
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.3);
    }

    .name-input-section {
      label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
        color: var(--color-text);
      }

      .name-input {
        width: 100%;
        padding: 0.75rem 1rem;
        border: 2px solid var(--color-subtleLighter);
        border-radius: 6px;
        font-size: 1rem;
        background: var(--color-background);
        color: var(--color-text);
        transition: border-color 0.2s ease;

        &:focus {
          outline: none;
          border-color: var(--color-buttonPrimaryBase);
        }

        &::placeholder {
          opacity: 0.6;
        }
      }

      .input-hint {
        display: block;
        margin-top: 0.25rem;
        opacity: 0.7;
        text-align: right;
        color: var(--color-text);
      }
    }

    .suggestions {
      h3 {
        margin: 0 0 0.75rem;
        font-size: 1rem;
        color: var(--color-text);
        opacity: 0.8;
      }

      .suggestion-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .suggestion-btn {
        padding: 0.5rem 0.75rem;
        background: var(--color-subtleLighter);
        border: 1px solid var(--color-subtleDarker);
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.85rem;
        color: var(--color-text);
        transition: all 0.2s ease;

        &:hover:not(:disabled) {
          background: var(--color-buttonPrimaryBase);
          color: var(--color-buttonPrimaryText);
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }
    }

    .rules {
      padding: 1rem;
      background: var(--color-subtleLighter);
      border-radius: 6px;
      opacity: 0.8;

      small {
        color: var(--color-text);
        line-height: 1.4;
      }
    }

    .modal-footer {
      padding: 1.5rem;
      border-top: 1px solid var(--color-subtleLighter);
      display: flex;
      justify-content: space-between;
      gap: 1rem;
    }

    @media (max-width: 600px) {
      .modal-container {
        width: 95vw;
        max-height: 90vh;
      }

      .modal-footer {
        flex-direction: column-reverse;
      }
    }
  `]
})
export class UsernameModalComponent {
  private readonly authStore = inject(AuthStore);

  // 📡 State
  readonly newName = signal('');
  readonly saving = signal(false);

  // 🎭 Computed data
  readonly user = this.authStore.user;

  readonly currentDisplayName = computed(() => {
    return this.authStore.userDisplayName();
  });

  readonly suggestedName = computed(() => {
    const user = this.user();
    if (!user) return 'Your Pub Name';

    // Generate a fresh suggestion based on user ID
    return generateAnonymousName(user.uid + '_suggestion');
  });

  readonly previewName = computed(() => {
    const trimmed = this.newName().trim();
    return trimmed.length > 0 ? trimmed : null;
  });

  readonly isValidName = computed(() => {
    const name = this.newName().trim();
    return name.length >= 2 && name.length <= 30;
  });

  readonly suggestions = computed(() => {
    const user = this.user();
    if (!user) return [];

    // Generate multiple pub-themed suggestions
    const baseNames = [
      'Tipsy Wanderer',
      'Pub Explorer',
      'Ale Adventurer',
      'Tavern Hopper',
      'Pint Collector',
      'Beer Scholar',
      'Landlord Hunter'
    ];

    return baseNames.slice(0, 4); // Show 4 suggestions
  });

  // 🔧 Modal control
  closeModal: () => void = () => {};

  // 🎬 Actions
  useSuggestion(suggestion: string): void {
    this.newName.set(suggestion);
  }

  async saveName(): Promise<void> {
    if (!this.isValidName()) return;

    this.saving.set(true);

    try {
      const name = this.newName().trim();

      // TODO: Implement name save logic
      // await this.userService.updateDisplayName(name);

      console.log('[UsernameModal] ✅ Name saved successfully:', name);

      // Close modal after successful save
      this.closeModal();

    } catch (error) {
      console.error('[UsernameModal] ❌ Failed to save name:', error);
    } finally {
      this.saving.set(false);
    }
  }

  cancel(): void {
    console.log('[UsernameModal] User cancelled name change');
    this.closeModal();
  }
}
