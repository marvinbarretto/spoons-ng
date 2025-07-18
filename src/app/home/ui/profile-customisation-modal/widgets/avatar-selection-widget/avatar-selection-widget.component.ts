import { Component, input, output, computed, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvatarService } from '@shared/data-access/avatar.service';
import { UserStore } from '@users/data-access/user.store';
import { AuthStore } from '@auth/data-access/auth.store';
import type { AvatarOption } from '@shared/data-access/avatar.service';

@Component({
  selector: 'app-avatar-selection-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="avatar-selection-widget">
      <!-- ✅ Current avatar display (conditionally shown) -->
      @if (showCurrentAvatar()) {
        <div class="current-avatar">
          <div class="avatar-container">
            <img
              class="avatar-large"
              [src]="displayAvatarUrl()"
              [alt]="currentUser()?.displayName + ' avatar'"
            />
            <!-- ✅ Status indicator -->
            @if (saving()) {
              <div class="status-circle saving">⏳</div>
            }
          </div>
        </div>
      }

      <!-- ✅ Avatar grid -->
      <div class="avatar-grid">
        @for (avatar of availableAvatars(); track avatar.id) {
          <button
            type="button"
            class="avatar-option"
            [class.selected]="isSelected(avatar)"
            [class.current]="isCurrent(avatar)"
            [class.default]="avatar.isDefault"
            [disabled]="saving()"
            (click)="selectAvatar(avatar.id)"
            [title]="avatar.name"
          >
            <img [src]="avatar.url" [alt]="avatar.name" />
            @if (isSelected(avatar)) {
              <div class="selected-badge">✓</div>
            }
          </button>
        }
      </div>
    </div>
  `,
  styles: `
    .avatar-selection-widget {
      padding: 0.75rem;
      background: var(--background-darkest);
      border: 1px solid var(--border);
      border-radius: 8px;
    }


    .current-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.75rem;
      background: var(--background-darkest);
      border: 1px solid var(--border);
      border-radius: 6px;
      margin-bottom: 0.75rem;
    }

    .avatar-container {
      position: relative;
    }

    .avatar-large {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid var(--border);
    }

    .status-circle {
      position: absolute;
      bottom: -2px;
      right: -2px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
      color: white;
      border: 2px solid var(--background-darkest);
    }

    .status-circle.saving {
      background: #f59e0b;
    }

    .status-circle.saved {
      background: #10b981;
    }


    .avatar-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 0.375rem;
      margin-bottom: 1rem;
    }

    .avatar-option {
      position: relative;
      width: 100%;
      aspect-ratio: 1;
      max-width: 60px;
      border: 2px solid var(--border);
      border-radius: 50%;
      cursor: pointer;
      transition: all 0.2s ease;
      background: none;
      padding: 0;
      overflow: hidden;
      justify-self: center;
    }

    .avatar-option:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .avatar-option img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-option:hover:not(:disabled) {
      border-color: var(--primary);
      transform: scale(1.05);
    }

    .avatar-option.selected {
      border-color: var(--primary);
      box-shadow: 0 0 0 2px var(--primary-light);
    }

    .avatar-option.current {
      border-color: var(--color-success);
    }

    .default-badge,
    .selected-badge {
      position: absolute;
      bottom: -2px;
      right: -2px;
      background: var(--primary);
      color: white;
      font-size: 0.625rem;
      font-weight: 600;
      padding: 0.125rem 0.25rem;
      border-radius: 4px;
      min-width: 20px;
      text-align: center;
    }

    .default-badge {
      background: var(--text-secondary);
    }

    .error-message {
      padding: 0.75rem;
      background: var(--color-error-light);
      border: 1px solid var(--color-error);
      border-radius: 4px;
      color: var(--color-error-text);
      font-size: 0.875rem;
      margin-top: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .retry-btn {
      background: var(--color-error);
      color: white;
      border: none;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      cursor: pointer;
    }

    .retry-btn:hover {
      background: var(--color-error-dark);
    }

    @media (max-width: 640px) {

      .avatar-option {
        width: 50px;
        height: 50px;
      }

    }
  `
})
export class AvatarSelectionWidgetComponent {
  private readonly _avatarService = inject(AvatarService);
  private readonly _userStore = inject(UserStore); // ✅ Use UserStore
  private readonly _authStore = inject(AuthStore); // ✅ For fallback UID during onboarding

  readonly selectedAvatarId = input(''); // ✅ For backwards compatibility
  readonly showCurrentAvatar = input(true); // ✅ Control current avatar display
  readonly avatarSelected = output<string>();

  // ✅ Local widget state
  private readonly _selectedAvatarId = signal<string>('');

  // ✅ Use UserStore for current user data
  readonly currentUser = this._userStore.user;
  readonly saving = computed(() => this._userStore.loading());

  readonly isAnonymous = computed(() => this.currentUser()?.isAnonymous ?? true);

  readonly availableAvatars = computed((): AvatarOption[] => {
    const user = this.currentUser();
    // For onboarding, we need to get the UID from AuthStore since UserStore might not have loaded yet
    const uid = user?.uid || this.getAuthUid();
    if (!uid) return [];
    return this._avatarService.generateAvatarOptions(uid);
  });

  readonly currentAvatarUrl = computed(() => {
    const user = this.currentUser();
    return this._avatarService.getAvatarUrl(user);
  });

  readonly displayAvatarUrl = computed(() => {
    const selectedId = this._selectedAvatarId();
    if (selectedId) {
      const selectedAvatar = this.availableAvatars().find(a => a.id === selectedId);
      if (selectedAvatar) return selectedAvatar.url;
    }
    return this.currentAvatarUrl();
  });



  isSelected(avatar: AvatarOption): boolean {
    return this._selectedAvatarId() === avatar.id;
  }

  isCurrent(avatar: AvatarOption): boolean {
    return avatar.url === this.currentAvatarUrl() && !this._selectedAvatarId();
  }

  selectAvatar(avatarId: string): void {
    const avatar = this.availableAvatars().find(a => a.id === avatarId);
    if (!avatar) return;

    this._selectedAvatarId.set(avatarId);
    this.avatarSelected.emit(avatarId);

    console.log('[AvatarSelectionWidget] Avatar selected:', avatar.name);
  }

  private getAuthUid(): string | null {
    return this._authStore.user()?.uid || null;
  }

}
