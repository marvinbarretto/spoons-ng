import { Component, inject, signal, computed, input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthStore } from '@auth/data-access/auth.store';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { AvatarService } from '@shared/data-access/avatar.service';
import { User } from '@users/utils/user.model';

@Component({
  selector: 'app-profile-customization-modal',
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
              (keydown.enter)="saveChanges()"
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

        <!-- Username Suggestions -->
        <div class="suggestions">
          <h3>Name Suggestions</h3>
          <div class="suggestion-buttons">
            @for (suggestion of nameSuggestions(); track suggestion) {
              <button
                class="suggestion-btn"
                (click)="useSuggestion(suggestion)"
                [disabled]="displayName() === suggestion"
              >
                {{ suggestion }}
              </button>
            }
          </div>
        </div>

        <!-- Google Account Upgrade for Anonymous Users -->
        @if (isAnonymous()) {
          <div class="upgrade-section">
            <h3>🚀 Upgrade Your Account</h3>
            <p class="upgrade-description">
              Sign up with Google to sync your progress across devices and never lose your pub-crawling achievements!
            </p>
            <app-button
              variant="primary"
              [fullWidth]="true"
              (onClick)="upgradeToGoogle()"
              [disabled]="saving()"
            >
              🚀 Sign up with Google
            </app-button>
          </div>
        }
      </div>

      <div class="modal-footer">
        <app-button
          (onClick)="cancel()"
          [disabled]="saving()"
        >
          Cancel
        </app-button>

        <app-button
          variant="primary"
          (onClick)="saveChanges()"
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
      border: 1px solid var(--color-border);
      border-radius: 12px;
      max-width: 480px;
      width: 90vw;
      max-height: 85vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 32px var(--color-shadow);
    }

    .modal-header {
      padding: 1.5rem;
      border-bottom: 1px solid var(--color-border);
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
      background: var(--color-surfaceElevated);
      border-radius: 8px;
      border: 1px solid var(--color-border);

      .avatar-preview {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        overflow: hidden;
        flex-shrink: 0;
        border: 2px solid var(--color-borderSecondary);
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
        border: 2px solid var(--color-border);
        border-radius: 6px;
        font-size: 1.1rem;
        font-weight: 600;
        background: var(--color-background);
        color: var(--color-text);
        transition: border-color 0.2s ease;

        &:focus {
          outline: none;
          border-color: var(--color-primary);
        }

        &::placeholder {
          opacity: 0.6;
          font-weight: 400;
          color: var(--color-textMuted);
        }
      }

      .char-count {
        align-self: flex-end;
        opacity: 0.7;
        font-size: 0.8rem;
        color: var(--color-textMuted);
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
        border: 2px solid var(--color-border);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        background: var(--color-surface);

        &:hover {
          transform: scale(1.05);
          border-color: var(--color-secondary);
        }

        &.selected {
          border-color: var(--color-primary);
          background: var(--color-accentLight);
        }
      }

      .avatar-option img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 6px;
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
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.85rem;
        color: var(--color-text);
        transition: all 0.2s ease;

        &:hover:not(:disabled) {
          background: var(--color-primary);
          color: var(--color-primaryText);
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: var(--color-accent);
          color: var(--color-text);
        }
      }
    }

    .upgrade-section {
      background: linear-gradient(135deg, var(--color-accentLight) 0%, var(--color-lighter) 100%);
      border: 1px solid var(--color-accent);
      border-radius: 8px;
      padding: 1.5rem;
      text-align: center;

      h3 {
        margin: 0 0 0.75rem;
        font-size: 1.1rem;
        color: var(--color-text);
      }

      .upgrade-description {
        margin: 0 0 1rem;
        color: var(--color-textSecondary);
        font-size: 0.9rem;
        line-height: 1.4;
      }
    }

    .modal-footer {
      padding: 1.5rem;
      border-top: 1px solid var(--color-border);
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      background: var(--color-surface);
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

      .upgrade-section {
        padding: 1rem;
      }
    }
  `]
})
export class ProfileCustomizationModalComponent implements OnInit {
  // ✅ Input binding
  readonly currentUser = input<User | null>(null);

  private readonly authStore = inject(AuthStore);
  private readonly avatarService = inject(AvatarService);

  // 📡 Component state
  readonly displayName = signal('');
  readonly selectedAvatarId = signal('');
  readonly saving = signal(false);

  ngOnInit(): void {
    // Initialize with current user's data
    const user = this.authStore.user();
    if (user?.displayName) {
      this.displayName.set(user.displayName);
    }

    // Set default avatar or fallback to npc-wojack
    const currentPhotoURL = user?.photoURL;
    const currentAvatarId = this.findAvatarIdByUrl(currentPhotoURL) || 'npc-wojack';
    this.selectedAvatarId.set(currentAvatarId);
  }

  private findAvatarIdByUrl(url: string | undefined): string | null {
    if (!url) return null;
    const avatar = this.avatarOptions().find(a => a.url === url);
    return avatar?.id || null;
  }

  // 🎭 Computed data
  readonly currentDisplayName = computed(() => {
    return this.authStore.displayName();
  });

  readonly isAnonymous = computed(() => {
    return this.authStore.isAnonymous();
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
    const currentName = this.currentDisplayName();
    const currentPhotoURL = this.authStore.user()?.photoURL;
    const currentAvatarId = this.findAvatarIdByUrl(currentPhotoURL) || 'npc-wojack';

    const nameChanged = name !== currentName && name.length >= 2 && name.length <= 30;
    const avatarChanged = this.selectedAvatarId() !== currentAvatarId;

    return nameChanged || avatarChanged;
  });

  // 🔧 Modal control (set by overlay service)
  closeModal: () => void = () => {};

  // 🎬 Actions
  selectAvatar(avatarId: string): void {
    this.selectedAvatarId.set(avatarId);
  }

  useSuggestion(suggestion: string): void {
    this.displayName.set(suggestion);
  }

  async saveChanges(): Promise<void> {
    if (!this.hasChanges()) return;

    this.saving.set(true);

    try {
      const name = this.displayName().trim();
      const selectedAvatar = this.selectedAvatar();

      // Update user profile with both name and avatar
      await this.authStore.updateUserProfile({
        displayName: name,
        photoURL: selectedAvatar,
      });

      // Persist avatar selection in service
      const avatarOption = this.avatarOptions().find(a => a.id === this.selectedAvatarId());
      if (avatarOption) {
        await this.avatarService.selectAvatar(avatarOption);
      }

      console.log('[ProfileCustomization] ✅ Saved:', { name, avatar: selectedAvatar });
      this.closeModal();

    } catch (error) {
      console.error('[ProfileCustomization] ❌ Failed to save:', error);
    } finally {
      this.saving.set(false);
    }
  }

  async upgradeToGoogle(): Promise<void> {
    try {
      this.saving.set(true);
      await this.authStore.loginWithGoogle();
      this.closeModal();
    } catch (error) {
      console.error('[ProfileCustomization] ❌ Google signup failed:', error);
    } finally {
      this.saving.set(false);
    }
  }

  cancel(): void {
    this.closeModal();
  }
}
