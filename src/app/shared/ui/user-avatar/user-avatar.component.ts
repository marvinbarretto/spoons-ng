import { Component, input, computed } from '@angular/core';

import { User } from '../../../users/utils/user.model';

export type UserAvatarData = {
  displayName: string;
  photoURL?: string;
  email?: string;
  realDisplayName?: string;
};

@Component({
  selector: 'app-user-avatar',
  imports: [],
  template: `
    <div class="user-avatar">
      <img
        [src]="avatarUrl()"
        [alt]="displayName()"
        class="avatar"
        onerror="this.src='assets/avatars/npc.webp'"
      />
      @if (showName()) {
        <span class="user-name">{{ displayName() }}</span>
      }
    </div>
  `,
  styles: `
    .user-avatar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
      border: 2px solid var(--background-lighter);
    }

    .user-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Size variants */
    .user-avatar.small .avatar {
      width: 24px;
      height: 24px;
    }

    .user-avatar.large .avatar {
      width: 48px;
      height: 48px;
    }

    @media (max-width: 600px) {
      .user-avatar {
        gap: 0.5rem;
      }

      .avatar {
        width: 28px;
        height: 28px;
      }
    }
  `
})
export class UserAvatarComponent {
  readonly user = input.required<User>();
  readonly showName = input(true);
  readonly size = input<'small' | 'medium' | 'large'>('medium');

  readonly displayName = computed(() => this.user().displayName || 'Unknown User');

  readonly avatarUrl = computed(() => {
    const user = this.user();

    // Check if this user has a profile photo (Google users)
    if (user.photoURL) {
      return user.photoURL;
    }

    // Check if it's a real user (has email/displayName) vs anonymous
    const isAnonymousUser = !user.email && !user.displayName &&
                           (user.displayName?.includes('-') || user.displayName?.includes('(You)'));

    if (isAnonymousUser) {
      // Use NPC image for anonymous users
      return 'assets/avatars/npc.webp';
    } else {
      // Fallback avatar for Google users without profile photos
      return 'assets/images/default-user-avatar.png';
    }
  });
}
