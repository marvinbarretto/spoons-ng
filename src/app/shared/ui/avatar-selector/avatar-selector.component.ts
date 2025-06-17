// src/app/shared/ui/avatar-selector/avatar-selector.component.ts
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthStore } from '../../../auth/data-access/auth.store';
import { ButtonComponent } from '../button/button.component';
import { UserStore } from '../../../users/data-access/user.store';

type AvatarOption = {
  id: string;
  name: string;
  emoji: string;
  category: 'traditional' | 'quirky' | 'fancy';
};

@Component({
  selector: 'app-avatar-selector',
  imports: [CommonModule, ButtonComponent],
  template: `
    <div class="modal-container">
      <div class="modal-header">
        <h2>Choose Your Pub Persona</h2>
        <p class="subtitle">{{ userDisplayName() }}, pick an avatar that represents your pub-crawling spirit!</p>
      </div>

      <div class="modal-body">
        <!-- Current Selection Preview -->
        @if (selectedAvatar()) {
          <div class="selection-preview">
            <div class="preview-avatar">{{ selectedAvatar()!.emoji }}</div>
            <div class="preview-info">
              <h3>{{ selectedAvatar()!.name }}</h3>
              <small>{{ getCategoryName(selectedAvatar()!.category) }}</small>
            </div>
          </div>
        }

        <!-- Avatar Grid -->
        <div class="avatar-grid">
          @for (avatar of avatarOptions(); track avatar.id) {
            <button
              class="avatar-option"
              [class.selected]="selectedAvatarId() === avatar.id"
              (click)="selectAvatar(avatar)"
              [title]="avatar.name"
            >
              <span class="avatar-emoji">{{ avatar.emoji }}</span>
              <span class="avatar-name">{{ avatar.name }}</span>
            </button>
          }
        </div>
      </div>

      <div class="modal-footer">
        <app-button
          variant="ghost"
          (onClick)="skipSelection()"
          [disabled]="saving()"
        >
          Skip for Now
        </app-button>

        <app-button
          variant="primary"
          (onClick)="saveSelection()"
          [loading]="saving()"
          [disabled]="!selectedAvatar() || saving()"
        >
          Save Avatar
        </app-button>
      </div>
    </div>
  `,
  styles: [`
    .modal-container {
      background: var(--color-background);
      border: 1px solid var(--color-subtleDarker);
      border-radius: 12px;
      max-width: 600px;
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
    }

    .selection-preview {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: var(--color-subtleLighter);
      border-radius: 8px;
      margin-bottom: 1.5rem;

      .preview-avatar {
        font-size: 3rem;
        line-height: 1;
      }

      .preview-info h3 {
        margin: 0 0 0.25rem;
        color: var(--color-text);
      }

      .preview-info small {
        opacity: 0.7;
        color: var(--color-text);
      }
    }

    .avatar-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 1rem;
    }

    .avatar-option {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;
      background: var(--color-background);
      border: 2px solid var(--color-subtleLighter);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        border-color: var(--color-buttonPrimaryBase);
        transform: translateY(-2px);
      }

      &.selected {
        border-color: var(--color-buttonPrimaryBase);
        background: rgba(59, 130, 246, 0.1);
      }

      .avatar-emoji {
        font-size: 2.5rem;
        line-height: 1;
      }

      .avatar-name {
        font-size: 0.85rem;
        font-weight: 500;
        text-align: center;
        color: var(--color-text);
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

      .avatar-grid {
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
        gap: 0.75rem;
      }

      .avatar-option {
        padding: 0.75rem;

        .avatar-emoji {
          font-size: 2rem;
        }

        .avatar-name {
          font-size: 0.75rem;
        }
      }

      .modal-footer {
        flex-direction: column-reverse;
      }
    }
  `]
})
export class AvatarSelectorComponent {
  private readonly authStore = inject(AuthStore);
  private readonly userStore = inject(UserStore);

  // 📡 State
  readonly selectedAvatarId = signal<string | null>(null);
  readonly saving = signal(false);

  // 🎭 Computed data
  readonly user = this.authStore.user;

  readonly userDisplayName = computed(() => {
    return this.userStore.displayName();
  });

  readonly avatarOptions = computed((): AvatarOption[] => [
    // Traditional Pub Archetypes
    { id: 'landlord', name: 'The Landlord', emoji: '👨‍💼', category: 'traditional' },
    { id: 'regular', name: 'The Regular', emoji: '🍺', category: 'traditional' },
    { id: 'barkeep', name: 'The Barkeep', emoji: '👨‍🍳', category: 'traditional' },
    { id: 'patron', name: 'The Patron', emoji: '🧔', category: 'traditional' },

    // Quirky Characters
    { id: 'tipsy-scholar', name: 'Tipsy Scholar', emoji: '🤓', category: 'quirky' },
    { id: 'dart-champion', name: 'Dart Champion', emoji: '🎯', category: 'quirky' },
    { id: 'quiz-master', name: 'Quiz Master', emoji: '🧠', category: 'quirky' },
    { id: 'karaoke-king', name: 'Karaoke King', emoji: '🎤', category: 'quirky' },
    { id: 'pool-shark', name: 'Pool Shark', emoji: '🎱', category: 'quirky' },

    // Fancy/Premium
    { id: 'wine-connoisseur', name: 'Wine Connoisseur', emoji: '🍷', category: 'fancy' },
    { id: 'craft-beer-expert', name: 'Craft Expert', emoji: '🍻', category: 'fancy' },
    { id: 'whiskey-enthusiast', name: 'Whiskey Lover', emoji: '🥃', category: 'fancy' },
    { id: 'cocktail-mixer', name: 'Cocktail Mixer', emoji: '🍸', category: 'fancy' },
  ]);

  readonly selectedAvatar = computed(() => {
    const selectedId = this.selectedAvatarId();
    if (!selectedId) return null;

    return this.avatarOptions().find(avatar => avatar.id === selectedId) || null;
  });

  // 🔧 Modal control (set by overlay service)
  closeModal: () => void = () => {};

  // 🎬 Actions
  selectAvatar(avatar: AvatarOption): void {
    this.selectedAvatarId.set(avatar.id);
    console.log('[AvatarSelector] Avatar selected:', avatar.name);
  }

  async saveSelection(): Promise<void> {
    const selected = this.selectedAvatar();
    if (!selected) return;

    this.saving.set(true);

    try {
      // TODO: Implement avatar save logic
      // await this.avatarService.selectAvatar(selected);

      console.log('[AvatarSelector] ✅ Avatar saved successfully:', selected.name);

      // Close modal after successful save
      this.closeModal();

    } catch (error) {
      console.error('[AvatarSelector] ❌ Failed to save avatar:', error);
    } finally {
      this.saving.set(false);
    }
  }

  skipSelection(): void {
    console.log('[AvatarSelector] User skipped avatar selection');
    this.closeModal();
  }

  getCategoryName(category: AvatarOption['category']): string {
    switch (category) {
      case 'traditional': return 'Classic Pub Character';
      case 'quirky': return 'Unique Personality';
      case 'fancy': return 'Refined Taste';
      default: return 'Pub Crawler';
    }
  }
}
