// src/app/home/ui/profile-customisation-modal/widgets/avatar-selection-widget/avatar-selection-widget.component.ts
import { Component, input, output, computed, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvatarService } from '@shared/data-access/avatar.service';
import type { User } from '@users/utils/user.model';

// ✅ Use the service's AvatarOption type instead of defining our own
import type { AvatarOption } from '@shared/data-access/avatar.service';

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
            [class.selected]="isSelected(avatar)"
            [class.default]="avatar.isDefault"
            (click)="selectAvatar(avatar.id)"
            [title]="avatar.name"
          >
            <img [src]="avatar.url" [alt]="avatar.name" />
            @if (avatar.isDefault) {
              <div class="default-badge">NPC</div>
            }
            @if (isSelected(avatar)) {
              <div class="selected-badge">✓</div>
            }
          </button>
        }
      </div>

      <!-- ✅ Save/Reset actions -->
      <div class="widget-actions">
        <button
          type="button"
          class="btn-save"
          [disabled]="saving() || !hasSelection()"
          (click)="saveAvatar()"
        >
          @if (saving()) {
            Saving...
          } @else {
            Save Avatar
          }
        </button>

        @if (hasCustomAvatar()) {
          <button
            type="button"
            class="btn-reset"
            [disabled]="saving()"
            (click)="resetToDefault()"
          >
            Reset to Default
          </button>
        }
      </div>

      <!-- ✅ Error display -->
      @if (error()) {
        <div class="error-message">{{ error() }}</div>
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

    .avatar-option.default {
      border-color: var(--color-accent);
    }

    /* ✅ Badges */
    .default-badge,
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

    .default-badge {
      background: var(--color-accent);
      color: var(--color-accent-text);
      font-size: 0.5rem;
    }

    .selected-badge {
      background: var(--color-success);
      color: var(--color-success-text);
    }

    /* ✅ Actions */
    .widget-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .btn-save,
    .btn-reset {
      padding: 0.5rem 1rem;
      border: 1px solid var(--color-border);
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.2s ease;
    }

    .btn-save {
      background: var(--color-primary);
      color: var(--color-primary-text);
      border-color: var(--color-primary);
    }

    .btn-save:hover:not(:disabled) {
      background: var(--color-primary-hover);
    }

    .btn-save:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-reset {
      background: var(--color-surface);
      color: var(--color-text);
    }

    .btn-reset:hover:not(:disabled) {
      background: var(--color-surface-hover);
    }

    /* ✅ Error Message */
    .error-message {
      padding: 0.75rem;
      background: var(--color-error-light);
      border: 1px solid var(--color-error);
      border-radius: 4px;
      color: var(--color-error-text);
      font-size: 0.875rem;
      margin-top: 1rem;
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

      .widget-actions {
        flex-direction: column;
      }
    }
  `
})
export class AvatarSelectionWidgetComponent {
  // ✅ Inject services
  private readonly _avatarService = inject(AvatarService);

  // ✅ Inputs
  readonly user = input<User | null>(null);
  readonly selectedAvatarId = input('');

  // ✅ Outputs
  readonly avatarSelected = output<string>();

  // ✅ Internal state
  private readonly _selectedAvatarId = signal<string>('');
  private readonly _saving = signal(false);
  private readonly _error = signal<string | null>(null);

  // ✅ Readonly accessors
  readonly saving = this._saving.asReadonly();
  readonly error = this._error.asReadonly();

  // ✅ Computed values
  readonly isAnonymous = computed(() => {
    return this.user()?.isAnonymous ?? true;
  });

  readonly currentAvatarUrl = computed(() => {
    const user = this.user();
    return this._avatarService.getAvatarUrl(user);
  });

  readonly availableAvatars = computed((): AvatarOption[] => {
    const user = this.user();
    if (!user) return [];

    // ✅ Use AvatarService to generate options
    return this._avatarService.generateAvatarOptions(user.uid);
  });

  readonly hasCustomAvatar = computed(() => {
    return this._avatarService.hasCustomAvatar();
  });

  readonly hasSelection = computed(() => {
    return this._selectedAvatarId() !== '';
  });

  // ✅ Methods
  getCurrentAvatarName(): string {
    const current = this.availableAvatars().find(avatar =>
      avatar.url === this.currentAvatarUrl()
    );
    return current?.name || 'Custom';
  }

  isSelected(avatar: AvatarOption): boolean {
    const currentUrl = this.currentAvatarUrl();
    const selectedId = this._selectedAvatarId();

    // Check if this avatar is currently selected for saving
    if (selectedId) {
      const selectedAvatar = this.availableAvatars().find(a => a.id === selectedId);
      return selectedAvatar?.url === avatar.url;
    }

    // Otherwise check if it's the current avatar
    return avatar.url === currentUrl;
  }

  selectAvatar(avatarId: string): void {
    const avatar = this.availableAvatars().find(a => a.id === avatarId);
    if (!avatar) return;

    this._selectedAvatarId.set(avatarId);
    this._error.set(null);

    // ✅ Also emit for parent component compatibility
    this.avatarSelected.emit(avatarId);

    console.log('[AvatarSelectionWidget] Avatar selected:', avatar.name);
  }

  async saveAvatar(): Promise<void> {
    const selectedId = this._selectedAvatarId();
    const avatar = this.availableAvatars().find(a => a.id === selectedId);

    if (!avatar) {
      this._error.set('No avatar selected');
      return;
    }

    this._saving.set(true);
    this._error.set(null);

    try {
      await this._avatarService.selectAvatar(avatar);

      // Clear selection after successful save
      this._selectedAvatarId.set('');

      console.log('[AvatarSelectionWidget] ✅ Avatar saved:', avatar.name);

    } catch (error: any) {
      this._error.set(error?.message || 'Failed to save avatar');
      console.error('[AvatarSelectionWidget] ❌ Save failed:', error);
    } finally {
      this._saving.set(false);
    }
  }

  async resetToDefault(): Promise<void> {
    const npcAvatar = this.availableAvatars().find(a => a.isDefault);
    if (!npcAvatar) return;

    this._saving.set(true);
    this._error.set(null);

    try {
      await this._avatarService.selectAvatar(npcAvatar);
      this._selectedAvatarId.set('');

      console.log('[AvatarSelectionWidget] ✅ Reset to default avatar');

    } catch (error: any) {
      this._error.set(error?.message || 'Failed to reset avatar');
      console.error('[AvatarSelectionWidget] ❌ Reset failed:', error);
    } finally {
      this._saving.set(false);
    }
  }
}
