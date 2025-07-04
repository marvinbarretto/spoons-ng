// src/app/home/ui/profile-customisation-modal/widgets/profile-identity-widget/profile-identity-widget.component.ts
import { Component, input, output, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { generateRandomName } from '../../../../../shared/utils/anonymous-names';
import { AvatarService } from '@shared/data-access/avatar.service';
import { UserStore } from '@users/data-access/user.store';
import type { User } from '@users/utils/user.model';
import type { AvatarOption } from '@shared/data-access/avatar.service';

@Component({
  selector: 'app-profile-identity-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="profile-identity-widget">
      <!-- ✅ Main Profile Section -->
      <div class="profile-header">
        <!-- Avatar Display -->
        <div class="avatar-section">
          <div class="avatar-container">
            <img
              class="avatar-large"
              [src]="displayAvatarUrl()"
              [alt]="displayName() + ' avatar'"
            />
            @if (saving()) {
              <div class="status-circle saving">⏳</div>
            }
          </div>
        </div>

        <!-- Display Name Input -->
        <div class="name-section">
          <input
            id="displayName"
            type="text"
            class="name-input"
            [class.error]="hasError()"
            [value]="displayName()"
            (input)="updateDisplayName($event)"
            placeholder="currentUsername"
            [attr.maxlength]="maxLength"
            autocomplete="nickname"
          />
          <div class="input-meta">
            <span class="char-count" [class.warning]="isNearLimit()">
              {{ displayName().length }}/{{ maxLength }}
            </span>
            @if (hasError()) {
              <span class="error-message">{{ errorMessage() }}</span>
            }
          </div>

          <!-- Shuffle button for anonymous users -->
          @if (isAnonymous()) {
            <button
              type="button"
              class="shuffle-btn"
              (click)="shuffleRandomName()"
              title="Generate a random pub-themed name"
            >
              🎲
            </button>
          }
        </div>
      </div>

      <!-- ✅ Avatar Selection Grid -->
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
    .profile-identity-widget {
      padding: 1.5rem;
      background: var(--background-darkest);
      border: 1px solid var(--border);
      border-radius: 12px;
    }

    /* ✅ Main Profile Header */
    .profile-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    /* ✅ Avatar Section */
    .avatar-section {
      flex-shrink: 0;
    }

    .avatar-container {
      position: relative;
    }

    .avatar-large {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid var(--border);
    }

    .status-circle {
      position: absolute;
      bottom: -2px;
      right: -2px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: bold;
      color: white;
      border: 2px solid var(--background-darkest);
      background: #f59e0b;
    }

    /* ✅ Name Section */
    .name-section {
      flex: 1;
      position: relative;
    }

    .name-input {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 2px solid var(--border);
      border-radius: 8px;
      font-size: 1rem;
      background: var(--background-darkest);
      color: var(--text);
      transition: all 0.2s ease;
    }

    .name-input:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .name-input.error {
      border-color: var(--color-error);
    }

    .input-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 0.5rem;
      font-size: 0.75rem;
    }

    .char-count {
      color: var(--text-secondary);
    }

    .char-count.warning {
      color: var(--warning);
      font-weight: 600;
    }

    .error-message {
      color: var(--color-error);
      font-weight: 500;
    }

    .shuffle-btn {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      font-size: 1.25rem;
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .shuffle-btn:hover {
      background: var(--background-darkest);
    }

    /* ✅ Avatar Grid */
    .avatar-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
      gap: 0.75rem;
    }

    .avatar-option {
      position: relative;
      width: 60px;
      height: 60px;
      border: 2px solid var(--border);
      border-radius: 50%;
      cursor: pointer;
      transition: all 0.2s ease;
      background: none;
      padding: 0;
      overflow: hidden;
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
      bottom: 2px;
      right: 2px;
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

    /* ✅ Responsive */
    @media (max-width: 640px) {
      .profile-header {
        flex-direction: column;
        text-align: center;
        gap: 1rem;
      }

      .name-section {
        width: 100%;
      }

      .avatar-grid {
        grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
      }

      .avatar-option {
        width: 50px;
        height: 50px;
      }
    }
  `
})
export class ProfileIdentityWidgetComponent {
  // Services
  private readonly avatarService = inject(AvatarService);
  private readonly userStore = inject(UserStore);

  readonly maxLength = 30;

  // ✅ Inputs
  readonly user = input<User | null>(null);
  readonly displayName = input('');
  readonly selectedAvatarId = input('');

  // ✅ Outputs
  readonly displayNameChanged = output<string>();
  readonly avatarSelected = output<string>();

  // ✅ Internal state
  readonly errorMessage = signal<string | null>(null);
  private readonly _selectedAvatarId = signal<string>('');

  // ✅ Computed values
  readonly isAnonymous = computed(() => {
    return this.user()?.isAnonymous ?? true;
  });

  readonly hasError = computed(() => {
    return !!this.errorMessage();
  });

  readonly isNearLimit = computed(() => {
    return this.displayName().length >= this.maxLength - 5;
  });

  readonly saving = computed(() => this.userStore.loading());

  readonly availableAvatars = computed((): AvatarOption[] => {
    const user = this.user();
    if (!user) return [];
    return this.avatarService.generateAvatarOptions(user.uid);
  });

  readonly currentAvatarUrl = computed(() => {
    const user = this.user();
    return this.avatarService.getAvatarUrl(user);
  });

  readonly displayAvatarUrl = computed(() => {
    const selectedId = this._selectedAvatarId();
    if (selectedId) {
      const selectedAvatar = this.availableAvatars().find(a => a.id === selectedId);
      if (selectedAvatar) return selectedAvatar.url;
    }
    return this.currentAvatarUrl();
  });

  // ✅ Display Name Methods
  updateDisplayName(event: Event): void {
    const target = event.target as HTMLInputElement;
    const newName = target.value;

    // Clear previous errors
    this.errorMessage.set(null);

    // Validate
    if (newName.length > this.maxLength) {
      this.errorMessage.set(`Name too long (max ${this.maxLength} characters)`);
      return;
    }

    if (newName.trim().length < 2 && newName.trim().length > 0) {
      this.errorMessage.set('Name must be at least 2 characters');
      return;
    }

    // Check for inappropriate content (basic)
    if (this.containsInappropriateContent(newName)) {
      this.errorMessage.set('Please choose an appropriate name');
      return;
    }

    this.displayNameChanged.emit(newName);
  }

  shuffleRandomName(): void {
    // Generate a random UID-like string to get different results each time
    const randomSeed = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const randomName = generateRandomName(randomSeed);

    // Keep kebab-case format with first-last-123 pattern
    const baseName = randomName.split('-').slice(0, 2).join('-');

    // Append random 3-digit number for uniqueness
    const randomNumber = Math.floor(Math.random() * 900) + 100; // 100-999
    const displayName = `${baseName}-${randomNumber}`;

    this.errorMessage.set(null);
    this.displayNameChanged.emit(displayName);
  }

  private containsInappropriateContent(name: string): boolean {
    // Basic inappropriate content filter
    const inappropriate = ['admin', 'moderator', 'system', 'null', 'undefined'];
    const lowerName = name.toLowerCase();
    return inappropriate.some(word => lowerName.includes(word));
  }

  // ✅ Avatar Methods
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

    console.log('[ProfileIdentityWidget] Avatar selected:', avatar.name);
  }
}
