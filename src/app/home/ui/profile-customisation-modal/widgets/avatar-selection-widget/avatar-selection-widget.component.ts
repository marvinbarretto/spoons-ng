// src/app/home/ui/profile-customization-modal/widgets/avatar-selection-widget/avatar-selection-widget.component.ts
import { Component, input, output, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ASSETS } from '@shared/utils/constants';
import type { User } from '@users/utils/user.model';

type AvatarOption = {
  id: string;
  url: string;
  name: string;
  isPremium?: boolean;
};

@Component({
  selector: 'app-avatar-selection-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="avatar-selection-widget">
      <h3 class="widget-title">🖼️ Profile Picture</h3>

      <!-- ✅ Current avatar display -->
      <div class="current-avatar">
        <img
          class="avatar-large"
          [src]="currentAvatarUrl()"
          [alt]="user()?.displayName + ' current avatar'"
        />
        <div class="avatar-info">
          <span class="avatar-name">{{ getCurrentAvatarName() }}</span>
          <span class="avatar-type">{{ isAnonymous() ? 'Anonymous User' : 'Signed In' }}</span>
        </div>
      </div>

      <!-- ✅ Avatar grid -->
      <div class="avatar-grid">
        @for (avatar of availableAvatars(); track avatar.id) {
          <button
            type="button"
            class="avatar-option"
            [class.selected]="selectedAvatarId() === avatar.id"
            [class.premium]="avatar.isPremium && isAnonymous()"
            [disabled]="avatar.isPremium && isAnonymous()"
            (click)="selectAvatar(avatar.id)"
            [title]="getAvatarTooltip(avatar)"
          >
            <img [src]="avatar.url" [alt]="avatar.name" />
            @if (avatar.isPremium && isAnonymous()) {
              <div class="premium-badge">🔒</div>
            }
            @if (selectedAvatarId() === avatar.id) {
              <div class="selected-badge">✓</div>
            }
          </button>
        }
      </div>

      <!-- ✅ Premium upgrade prompt -->
      @if (isAnonymous() && hasPremiumAvatars()) {
        <div class="premium-prompt">
          <span class="prompt-icon">⭐</span>
          <span class="prompt-text">Sign up to unlock premium avatars</span>
        </div>
      }
    </div>
  `,
  styles: `
    .avatar-selection-widget {
      padding: 1rem;
      background: var(--color-surface-elevated);
      border: 1px solid var(--color-border);
      border-radius: 8px;
    }

    .widget-title {
      margin: 0 0 1rem 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text);
    }

    /* ✅ Current Avatar Display */
    .current-avatar {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 6px;
      margin-bottom: 1rem;
    }

    .avatar-large {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid var(--color-border);
    }

    .avatar-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .avatar-name {
      font-weight: 600;
      color: var(--color-text);
      font-size: 0.875rem;
    }

    .avatar-type {
      font-size: 0.75rem;
      color: var(--color-text-secondary);
    }

    /* ✅ Avatar Grid */
    .avatar-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .avatar-option {
      position: relative;
      width: 60px;
      height: 60px;
      border: 2px solid var(--color-border);
      border-radius: 50%;
      cursor: pointer;
      transition: all 0.2s ease;
      background: none;
      padding: 0;
      overflow: hidden;
    }

    .avatar-option img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
    }

    .avatar-option:hover:not(:disabled) {
      border-color: var(--color-primary);
      transform: scale(1.05);
    }

    .avatar-option.selected {
      border-color: var(--color-primary);
      border-width: 3px;
    }

    .avatar-option.premium {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .avatar-option:disabled {
      cursor: not-allowed;
    }

    /* ✅ Badges */
    .premium-badge,
    .selected-badge {
      position: absolute;
      top: -2px;
      right: -2px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.6rem;
      font-weight: bold;
    }

    .premium-badge {
      background: var(--color-warning);
      color: var(--color-warning-text);
    }

    .selected-badge {
      background: var(--color-success);
      color: var(--color-success-text);
    }

    /* ✅ Premium Prompt */
    .premium-prompt {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      background: linear-gradient(135deg, var(--color-accent-light), var(--color-lighter));
      border: 1px solid var(--color-accent);
      border-radius: 6px;
      font-size: 0.875rem;
      color: var(--color-text);
    }

    .prompt-icon {
      font-size: 1rem;
    }

    .prompt-text {
      font-weight: 500;
    }

    /* ✅ Responsive */
    @media (max-width: 640px) {
      .avatar-grid {
        grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
      }

      .avatar-option {
        width: 50px;
        height: 50px;
      }

      .current-avatar {
        flex-direction: column;
        text-align: center;
      }
    }
  `
})
export class AvatarSelectionWidgetComponent {
  readonly NPC_AVATAR = ASSETS.NPC_AVATAR;

  // ✅ Inputs
  readonly user = input<User | null>(null);
  readonly selectedAvatarId = input('');

  // ✅ Outputs
  readonly avatarSelected = output<string>();

  // ✅ Computed values
  readonly isAnonymous = computed(() => {
    return this.user()?.isAnonymous ?? true;
  });

  readonly currentAvatarUrl = computed(() => {
    const user = this.user();
    return user?.photoURL || this.NPC_AVATAR;
  });

  readonly availableAvatars = computed((): AvatarOption[] => {
    // TODO: Get from AvatarService when available
    return [
      { id: 'npc-default', url: this.NPC_AVATAR, name: 'Default' },
      { id: 'avatar-1', url: '/assets/avatars/avatar-1.webp', name: 'Casual' },
      { id: 'avatar-2', url: '/assets/avatars/avatar-2.webp', name: 'Formal' },
      { id: 'avatar-3', url: '/assets/avatars/avatar-3.webp', name: 'Sporty', isPremium: true },
      { id: 'avatar-4', url: '/assets/avatars/avatar-4.webp', name: 'Artistic', isPremium: true },
      { id: 'avatar-5', url: '/assets/avatars/avatar-5.webp', name: 'Professional', isPremium: true },
      { id: 'avatar-6', url: '/assets/avatars/avatar-6.webp', name: 'Cool', isPremium: true }
    ];
  });

  readonly hasPremiumAvatars = computed(() => {
    return this.availableAvatars().some(avatar => avatar.isPremium);
  });

  // ✅ Methods
  getCurrentAvatarName(): string {
    const current = this.availableAvatars().find(avatar =>
      avatar.url === this.currentAvatarUrl()
    );
    return current?.name || 'Custom';
  }

  getAvatarTooltip(avatar: AvatarOption): string {
    if (avatar.isPremium && this.isAnonymous()) {
      return `${avatar.name} (Premium - Sign up to unlock)`;
    }
    return avatar.name;
  }

  selectAvatar(avatarId: string): void {
    const avatar = this.availableAvatars().find(a => a.id === avatarId);
    if (!avatar) return;

    // Don't allow premium avatars for anonymous users
    if (avatar.isPremium && this.isAnonymous()) return;

    this.avatarSelected.emit(avatarId);
  }
}
