// src/app/shared/ui/username-modal/username-modal.component.ts
import { Component, inject, signal, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthStore } from '../../../auth/data-access/auth.store';
import { ButtonComponent } from '../button/button.component';
import { AvatarService } from '../../data-access/avatar.service';
import { User } from '../../../users/utils/user.model';

@Component({
  selector: 'app-username-modal',
  imports: [CommonModule, FormsModule, ButtonComponent],
  template: `
    <div class="modal-container">
      <div class="modal-header">
        <h2>Customize Your Pub Identity</h2>
      </div>

      <div class="modal-body">
        <!-- Current Display Preview -->
        <div class="current-display">
          <div class="avatar-preview">
            <img [src]="selectedAvatar()" alt="Selected Avatar">
          </div>
          <div class="name-input-container">
            <input
              type="text"
              [(ngModel)]="displayName"
              [placeholder]="currentDisplayName()"
              maxlength="30"
              class="name-input"
              (keydown.enter)="saveName()"
            />
            <small class="char-count">{{ displayName().length }}/30</small>
          </div>
        </div>

        <!-- Avatar Selection Grid -->
        <div class="avatar-section">
          <h3>Choose Your Avatar</h3>
          <div class="avatar-grid">
            @for (avatar of avatarOptions(); track avatar.id) {
              <button
                class="avatar-option"
                [class.selected]="selectedAvatarId() === avatar.id"
                (click)="selectAvatar(avatar.id)"
                [title]="avatar.name"
              >
                <img [src]="avatar.url" alt="Avatar">
              </button>
            }
          </div>
        </div>

        <!-- Quick Name Suggestions -->
        <div class="suggestions">
          <h3>Quick Ideas</h3>
          <div class="suggestion-buttons">
            @for (suggestion of nameSuggestions(); track suggestion) {
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
          [disabled]="!hasChanges() || saving()"
        >
          Save Changes
        </app-button>
      </div>
    </div>
  `,
  styles: [`
    .modal-container {
      background: var(--color-background);
      border: 1px solid var(--color-subtleDarker);
      border-radius: 12px;
      max-width: 480px;
      width: 90vw;
      max-height: 85vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .modal-header {
      padding: 1.5rem;
      border-bottom: 1px solid var(--color-subtleLighter);
      text-align: center;

      h2 {
        margin: 0;
        color: var(--color-text);
        font-size: 1.25rem;
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

    .current-display {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: var(--color-subtleLighter);
      border-radius: 8px;

      .avatar-preview {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        overflow: hidden;
        flex-shrink: 0;
      }

      .avatar-preview img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .name-input-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .name-input {
        width: 100%;
        padding: 0.75rem;
        border: 2px solid var(--color-subtleDarker);
        border-radius: 6px;
        font-size: 1.1rem;
        font-weight: 600;
        background: var(--color-background);
        color: var(--color-text);
        transition: border-color 0.2s ease;

        &:focus {
          outline: none;
          border-color: var(--color-buttonPrimaryBase);
        }

        &::placeholder {
          opacity: 0.6;
          font-weight: 400;
        }
      }

      .char-count {
        align-self: flex-end;
        opacity: 0.7;
        font-size: 0.8rem;
        color: var(--color-text);
      }
    }

    .avatar-section {
      h3 {
        margin: 0 0 0.75rem;
        font-size: 1rem;
        color: var(--color-text);
      }

      .avatar-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
        gap: 0.5rem;
      }

      .avatar-option {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 60px;
        height: 60px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          transform: scale(1.05);
        }

        &.selected {
          border: 2px solid var(--color-buttonPrimaryBase);
        }
      }

      .avatar-option img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 8px;
      }
    }

    .suggestions {
      h3 {
        margin: 0 0 0.75rem;
        font-size: 1rem;
        color: var(--color-text);
      }

      .suggestion-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .suggestion-btn {
        padding: 0.4rem 0.75rem;
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

      .current-display {
        flex-direction: column;
        text-align: center;
        gap: 1rem;
      }

      .avatar-grid {
        grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
      }

      .avatar-option {
        width: 50px;
        height: 50px;
      }

      .modal-footer {
        flex-direction: column-reverse;
      }
    }
  `]
})
export class UsernameModalComponent {
  // ✅ FIXED: Proper input binding
  readonly currentUser = input<User | null>(null);

  private readonly authStore = inject(AuthStore);
  private readonly avatarService = inject(AvatarService);

  // 📡 Component state
  readonly displayName = signal('');
  readonly selectedAvatarId = signal('');
  readonly saving = signal(false);

  // 🎭 Computed data
  readonly currentDisplayName = computed(() => {
    return this.authStore.userDisplayName();
  });

  readonly avatarOptions = computed(() => {
    const user = this.authStore.user();
    return user ? this.avatarService.generateAvatarOptions(user.uid) : [];
  });

  readonly selectedAvatar = computed(() => {
    const selected = this.avatarOptions().find(a => a.id === this.selectedAvatarId());
    return selected?.url || '';
  });

  readonly nameSuggestions = computed(() => [
    'Pub Explorer',
    'Ale Hunter',
    'Pint Collector',
    'Tavern Hopper',
    'Beer Scholar',
    'Landlord Challenger'
  ]);

  readonly hasChanges = computed(() => {
    const name = this.displayName().trim();
    return name.length >= 2 && name.length <= 30;
  });

  // 🔧 Modal control (set by overlay service)
  closeModal: () => void = () => {};

  // 🎬 Actions
  async selectAvatar(avatarId: string): Promise<void> {
    const selectedAvatar = this.avatarOptions().find(a => a.id === avatarId);
    if (!selectedAvatar) return;

    try {
      await this.avatarService.selectAvatar(selectedAvatar);
      this.selectedAvatarId.set(avatarId);
    } catch (error) {
      console.error('[UsernameModal] ❌ Failed to select avatar:', error);
    }
  }

  useSuggestion(suggestion: string): void {
    this.displayName.set(suggestion);
  }

  async saveName(): Promise<void> {
    if (!this.hasChanges()) return;

    this.saving.set(true);

    try {
      const name = this.displayName().trim();
      const selectedAvatar = this.selectedAvatar();

      // TODO: Implement actual save logic
      // await this.userService.updateDisplayName(name);
      // await this.avatarService.updateAvatar(selectedAvatar);

      console.log('[UsernameModal] ✅ Saved:', { name, avatar: selectedAvatar });

      // Close modal after successful save
      this.closeModal();

    } catch (error) {
      console.error('[UsernameModal] ❌ Failed to save:', error);
    } finally {
      this.saving.set(false);
    }
  }

  cancel(): void {
    this.closeModal();
  }
}
