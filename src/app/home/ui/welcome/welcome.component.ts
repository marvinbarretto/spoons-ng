// src/app/home/ui/welcome/welcome.component.ts
import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { JsonPipe } from '@angular/common';
import type { User } from '@users/utils/user.model';
import { ASSETS } from '@shared/utils/constants';

@Component({
  selector: 'app-welcome',
  imports: [JsonPipe],
  template: `
    <section class="welcome" [class]="welcomeClasses()">
      <!-- ✅ User Avatar & Name Section -->
      <div class="user-section">
        @if (avatarUrl()) {
          <img
            class="avatar"
            [src]="avatarUrl()!"
            [alt]="displayName() + ' avatar'"
            (error)="onAvatarError($event)"
          />
        } @else {
          <div class="avatar-placeholder npc-avatar" (click)="openSettings.emit()">
            <img [src]="NPC_AVATAR" alt="Default avatar" class="npc-image">
            @if (canCustomizeAvatar()) {
              <div class="avatar-edit-hint">✏️</div>
            }
          </div>
        }

        <div class="name-section">
          <h1 class="user-name">
            <button class="username-button" (click)="openSettings.emit()">
              <span class="username-text">{{ displayName() }}</span>
              <span class="edit-icon">✏️</span>
            </button>
          </h1>

          <!-- ✅ Show user stage underneath displayName -->
          @if (user()) {
            <p class="user-stage">{{ user()!.userStage }}</p>
          }
        </div>
      </div>

      <!-- ✅ Simplified Action Buttons -->
      @if (shouldShowActions()) {
        <div class="user-actions">
          <button
            type="button"
            class="btn btn-primary"
            (click)="openSettings.emit()"
          >
            ⚙️ Customize Profile
          </button>
        </div>
      }
    </section>
  `,
  styles: `
    .welcome {
      background: var(--color-surface);
      border-radius: 8px;
      padding: 1rem;
      margin: 0.5rem auto;
      max-width: 100%;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 2px 8px var(--color-shadow);
      border: 1px solid var(--color-border);
    }

    /* ✅ CSS Hooks for different user states */
    .welcome--brand-new {
      background: linear-gradient(135deg, var(--color-accentLight) 0%, var(--color-lighter) 100%);
      border: 1px solid var(--color-accent);
      padding: 1.5rem;
    }

    .welcome--new-user {
      background: var(--color-surfaceElevated);
      border: 1px solid var(--color-primary);
    }

    .welcome--compact {
      padding: 0.75rem;
      margin: 0.25rem auto;
    }

    /* User Section - More compact */
    .user-section {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex: 1;
    }

    /* Avatar Styles - Smaller */
    .avatar,
    .avatar-placeholder {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      position: relative;
      cursor: pointer;
      transition: transform 0.2s ease;
      flex-shrink: 0;
    }

    .avatar {
      object-fit: cover;
      border: 2px solid var(--color-primary);
      box-shadow: 0 1px 4px var(--color-shadow);
    }

    .avatar-placeholder {
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid var(--color-secondary);
    }

    .npc-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
    }

    .avatar-placeholder:hover,
    .avatar:hover {
      transform: scale(1.05);
    }

    .avatar-edit-hint {
      position: absolute;
      bottom: -2px;
      right: -2px;
      background: var(--color-primary);
      border-radius: 50%;
      width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      border: 2px solid var(--color-background);
      color: var(--color-primaryText);
    }

    /* Username Button Styling - More compact */
    .username-button {
      background: none;
      border: none;
      padding: 0;
      margin: 0;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      color: inherit;
      font: inherit;
      transition: all 0.2s ease;
      border-radius: 4px;
      padding: 0.2rem 0.4rem;
    }

    .username-button:hover {
      background: var(--color-lighter);
      transform: translateY(-1px);
    }

    .username-text {
      color: var(--color-text);
      font-weight: 600;
    }

    .edit-icon {
      opacity: 0.4;
      font-size: 0.7em;
      transition: opacity 0.2s ease;
      color: var(--color-textMuted);
    }

    .username-button:hover .edit-icon {
      opacity: 0.7;
    }

    /* Name Section - Tighter */
    .name-section {
      flex: 1;
      min-width: 0;
    }

    .user-name {
      margin: 0 0 0.25rem 0;
      color: var(--color-text);
      font-size: 1.2rem;
      font-weight: 600;
      line-height: 1.2;
    }

    /* ✅ User Stage Display */
    .user-stage {
      margin: 0;
      font-size: 0.85rem;
      color: var(--color-textSecondary);
      font-weight: 500;
      text-transform: capitalize;
    }

    /* Actions Section - More compact */
    .user-actions {
      flex-shrink: 0;
    }

    .btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.85rem;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      white-space: nowrap;
    }

    .btn-primary {
      background: var(--color-primary);
      color: var(--color-primaryText);
      box-shadow: 0 1px 3px var(--color-shadow);
    }

    .btn-primary:hover {
      background: var(--color-primaryHover);
      transform: translateY(-1px);
      box-shadow: 0 2px 6px var(--color-shadow);
    }

    .btn-primary:active {
      background: var(--color-primaryActive);
      transform: translateY(0);
    }

    /* ✅ Brand new user layout - Stack vertically */
    .welcome--brand-new {
      flex-direction: column;
      text-align: center;
      max-width: 400px;
    }

    .welcome--brand-new .user-section {
      flex-direction: column;
      gap: 1.5rem;
    }

    .welcome--brand-new .name-section {
      text-align: center;
    }

    .welcome--brand-new .avatar,
    .welcome--brand-new .avatar-placeholder {
      width: 80px;
      height: 80px;
    }

    .welcome--brand-new .user-name {
      font-size: 1.5rem;
    }

    .welcome--brand-new .user-actions {
      width: 100%;
    }

    .welcome--brand-new .btn {
      padding: 0.75rem 1.5rem;
      font-size: 0.95rem;
    }

    /* Mobile responsive */
    @media (max-width: 480px) {
      .welcome {
        flex-direction: column;
        gap: 1rem;
        padding: 1rem;
      }

      .user-section {
        width: 100%;
        justify-content: center;
      }

      .user-name {
        font-size: 1.1rem;
      }

      .user-actions {
        width: 100%;
      }

      .btn {
        width: 100%;
        justify-content: center;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WelcomeComponent {
  // ✅ Asset reference
  readonly NPC_AVATAR = ASSETS.NPC_AVATAR;

  // ✅ Single input - just the user!
  readonly user = input<User | null>(null);

  // ✅ Output events
  readonly openSettings = output<void>();

  // ✅ All computed properties derived from user
  readonly displayName = computed(() => {
    const currentUser = this.user();
    if (!currentUser) return 'Guest';

    // ✅ Always show the actual displayName, never "Anon" or "Guest"
    return currentUser.displayName || 'User';
  });

  readonly avatarUrl = computed(() => {
    const currentUser = this.user();
    return currentUser?.photoURL || null;
  });

  readonly isAnonymous = computed(() => {
    const currentUser = this.user();
    return currentUser?.isAnonymous ?? false;
  });

  readonly isBrandNew = computed(() => {
    const currentUser = this.user();
    return currentUser?.userStage === 'brandNew';
  });

  readonly isNewUser = computed(() => {
    const currentUser = this.user();
    const stage = currentUser?.userStage;
    return stage === 'brandNew' || stage === 'firstTime';
  });

  readonly canCustomizeAvatar = computed(() => {
    // Always allow avatar customization
    return true;
  });

  readonly shouldShowActions = computed(() => {
    // Show actions for brand new users or anonymous users
    return this.isBrandNew() || this.isAnonymous();
  });

  // ✅ CSS class generation with hooks
  readonly welcomeClasses = computed(() => {
    const classes = ['welcome'];

    if (this.isBrandNew()) {
      classes.push('welcome--brand-new');
    } else if (this.isNewUser()) {
      classes.push('welcome--new-user');
    } else {
      classes.push('welcome--compact');
    }

    return classes.join(' ');
  });

  // ✅ Event handlers
  onAvatarError(event: Event): void {
    console.warn('[Welcome] Avatar failed to load:', this.avatarUrl());
  }
}
