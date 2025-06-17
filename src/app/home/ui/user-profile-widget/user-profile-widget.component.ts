// src/app/home/ui/user-profile-widget/user-profile-widget.component.ts
import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ASSETS } from '@shared/utils/constants';
import type { User } from '@users/utils/user.model';

type UserEngagementLevel = 'new' | 'casual' | 'regular' | 'expert';

@Component({
  selector: 'app-user-profile-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="user-profile-widget" (click)="handleOpenProfile()">
      <!-- ✅ Avatar Section -->
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

        <!-- ✅ Online status indicator -->
        <div class="status-dot"></div>
      </div>

      <!-- ✅ User Info -->
      <div class="user-info">
        <div class="user-name">{{ displayName() }}</div>

        <!-- ✅ Progressive information based on engagement -->
        @switch (engagementLevel()) {
          @case ('new') {
            <div class="user-subtitle">New Explorer</div>
          }
          @case ('casual') {
            <div class="user-subtitle">{{ pubsVisited() }} pubs visited</div>
          }
          @case ('regular') {
            <div class="user-stats">
              <span class="stat">{{ pubsVisited() }} pubs</span>
              <span class="stat-divider">•</span>
              <span class="stat">{{ badgeCount() }} badges</span>
            </div>
          }
          @case ('expert') {
            <div class="user-stats">
              <span class="stat">{{ pubsVisited() }} pubs</span>
              <span class="stat-divider">•</span>
              <span class="stat">{{ badgeCount() }} badges</span>
            </div>
            @if (leaderboardPosition() && leaderboardPosition()! <= 100) {
              <div class="user-subtitle">#{{ leaderboardPosition() }} on leaderboard</div>
            }
          }
        }
      </div>

      <!-- ✅ Settings indicator -->
      <div class="settings-icon">
        <span class="icon">⚙️</span>
      </div>
    </div>
  `,
  styles: `
    .user-profile-widget {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: var(--color-surface-elevated, #ffffff);
      border: 1px solid var(--color-border, #e2e8f0);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      margin-bottom: 1rem;

      /* ✅ Subtle hover effect */
      &:hover {
        background: var(--color-surface-hover, #f8fafc);
        border-color: var(--color-primary, #3b82f6);
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
      }

      &:active {
        transform: translateY(0);
      }
    }

    /* ✅ Avatar Section */
    .avatar-section {
      position: relative;
      flex-shrink: 0;
    }

    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid var(--color-border, #e2e8f0);
      transition: border-color 0.2s ease;
    }

    .avatar.placeholder {
      background: var(--color-surface, #f8fafc);
    }

    .user-profile-widget:hover .avatar {
      border-color: var(--color-primary, #3b82f6);
    }

    .status-dot {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 12px;
      height: 12px;
      background: #10b981;
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    /* ✅ User Info */
    .user-info {
      flex: 1;
      min-width: 0; /* Allows text truncation */
    }

    .user-name {
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--color-text, #1f2937);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 0.25rem;
    }

    .user-subtitle {
      font-size: 0.75rem;
      color: var(--color-text-secondary, #64748b);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-stats {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.75rem;
      color: var(--color-text-secondary, #64748b);
      margin-bottom: 0.125rem;
    }

    .stat {
      font-weight: 500;
    }

    .stat-divider {
      opacity: 0.5;
    }

    /* ✅ Settings Icon */
    .settings-icon {
      flex-shrink: 0;
      opacity: 0.6;
      transition: opacity 0.2s ease;
    }

    .user-profile-widget:hover .settings-icon {
      opacity: 1;
    }

    .icon {
      font-size: 1rem;
      filter: grayscale(0.3);
    }

    /* ✅ Responsive Design */
    @media (max-width: 640px) {
      .user-profile-widget {
        padding: 0.5rem;
        gap: 0.5rem;
      }

      .avatar {
        width: 36px;
        height: 36px;
      }

      .user-name {
        font-size: 0.8rem;
      }

      .user-subtitle,
      .user-stats {
        font-size: 0.7rem;
      }
    }

    /* ✅ Theme variations */
    @media (prefers-color-scheme: dark) {
      .user-profile-widget {
        background: var(--color-surface-elevated-dark, #1f2937);
        border-color: var(--color-border-dark, #374151);
      }

      .status-dot {
        border-color: var(--color-surface-elevated-dark, #1f2937);
      }
    }
  `
})
export class UserProfileWidgetComponent {
  // ✅ Asset reference
  readonly NPC_AVATAR = ASSETS.NPC_AVATAR;

  // ✅ Inputs
  readonly user = input<User | null>(null);
  readonly leaderboardPosition = input<number | null>(null);

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

  readonly pubsVisited = computed(() => {
    const currentUser = this.user();
    return currentUser?.checkedInPubIds?.length || 0;
  });

  readonly badgeCount = computed(() => {
    const currentUser = this.user();
    return currentUser?.badgeCount || 0;
  });

  readonly engagementLevel = computed((): UserEngagementLevel => {
    const pubs = this.pubsVisited();
    const badges = this.badgeCount();
    const position = this.leaderboardPosition();

    // ✅ Expert: High activity + leaderboard presence
    if (pubs >= 20 || badges >= 10 || (position && position <= 50)) {
      return 'expert';
    }

    // ✅ Regular: Moderate activity
    if (pubs >= 5 || badges >= 3) {
      return 'regular';
    }

    // ✅ Casual: Some activity
    if (pubs >= 1 || badges >= 1) {
      return 'casual';
    }

    // ✅ New: No activity yet
    return 'new';
  });

  // ✅ Event Handler
  handleOpenProfile(): void {
    this.openProfile.emit();
  }
}
