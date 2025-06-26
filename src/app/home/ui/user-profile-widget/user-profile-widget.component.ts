// src/app/home/ui/user-profile-widget/user-profile-widget.component.ts
import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ASSETS } from '@shared/utils/constants';
import type { User } from '@users/utils/user.model';


@Component({
  selector: 'app-user-profile-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="user-profile-widget" (click)="handleOpenProfile()">
      <!-- Avatar Section -->
      <div class="avatar-section">
        @if (avatarUrl()) {
          <img
            class="avatar"
            [src]="avatarUrl()!"
            [alt]="displayName() + ' avatar'"
          />
        } @else {
          <img
            class="avatar placeholder"
            [src]="NPC_AVATAR"
            [alt]="displayName() + ' default avatar'"
          />
        }
      </div>

      <!-- User Info -->
      <div class="user-info">
        <div class="user-name">{{ displayName() }}</div>
      </div>
    </div>
  `,
  styles: `
    .user-profile-widget {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px var(--color-shadow);

      &:hover {
        background: var(--color-surfaceElevated);
        border-color: var(--color-primary);
        transform: translateY(-1px);
        box-shadow: 0 4px 8px var(--color-shadow);
      }

      &:active {
        transform: translateY(0);
      }
    }

    .avatar-section {
      flex-shrink: 0;
    }

    .avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid var(--color-border);
      transition: border-color 0.2s ease;
    }

    .avatar.placeholder {
      background: var(--color-surfaceElevated);
    }

    .user-profile-widget:hover .avatar {
      border-color: var(--color-primary);
    }

    .user-info {
      flex: 1;
      min-width: 0;
    }

    .user-name {
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--color-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Responsive Design */
    @media (max-width: 640px) {
      .user-profile-widget {
        padding: 0.375rem;
        gap: 0.375rem;
      }

      .avatar {
        width: 32px;
        height: 32px;
      }

      .user-name {
        font-size: 0.8rem;
      }
    }
  `
})
export class UserProfileWidgetComponent {
  // ✅ Asset reference
  readonly NPC_AVATAR = ASSETS.NPC_AVATAR;

  // ✅ Inputs
  readonly user = input<User | null>(null);

  // ✅ Outputs
  readonly openProfile = output<void>();

  // ✅ Computed Values
  readonly displayName = computed(() => {
    const currentUser = this.user();
    if (!currentUser) return 'Guest';

    // ✅ Handle anonymous users with better names
    if (currentUser.isAnonymous && currentUser.displayName?.startsWith('Anonymous')) {
      return currentUser.displayName.replace('Anonymous', 'Explorer');
    }

    return currentUser.displayName || 'User';
  });

  readonly avatarUrl = computed(() => {
    const currentUser = this.user();
    return currentUser?.photoURL || null;
  });


  // ✅ Event Handler
  handleOpenProfile(): void {
    this.openProfile.emit();
  }
}
