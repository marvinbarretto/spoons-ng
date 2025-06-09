// src/app/shared/ui/user-display/user-display.component.ts
import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { User } from '../../../users/utils/user.model';

@Component({
  selector: 'app-user-display',
  template: `
    <div class="user-display">
      @if (user()) {
        <div class="user-display__header">
          <div class="user-display__avatar">
            @if (user()?.photoURL) {
              <img
                [src]="user()!.photoURL"
                [alt]="user()!.displayName || 'User avatar'"
                class="avatar-image"
              >
            } @else {
              <div class="avatar-placeholder">
                {{ avatarInitials() }}
              </div>
            }
          </div>

          <div class="user-display__info">
            <h3 class="user-name">{{ displayName() }}</h3>
            <p class="user-status">
              {{ user()!.isAnonymous ? 'Anonymous User' : 'Registered User' }}
              @if (user()!.emailVerified && !user()!.isAnonymous) {
                <span class="verified-badge">✓ Verified</span>
              }
            </p>
          </div>
        </div>

        <div class="user-display__stats">
          <div class="stat-item">
            <span class="stat-label">Pubs Visited</span>
            <span class="stat-value">{{ user()!.checkedInPubIds.length }}</span>
          </div>

          <div class="stat-item">
            <span class="stat-label">Pubs Claimed</span>
            <span class="stat-value">{{ user()!.claimedPubIds.length }}</span>
          </div>

          <div class="stat-item">
            <span class="stat-label">Landlord Of</span>
            <span class="stat-value">{{ user()!.landlordOf.length }}</span>
          </div>

          <div class="stat-item">
            <span class="stat-label">Badges</span>
            <span class="stat-value">{{ user()!.badges.length }}</span>
          </div>
        </div>

        @if (user()!.email && !user()!.isAnonymous) {
          <div class="user-display__details">
            <p class="user-email">{{ user()!.email }}</p>
            @if (user()!.joinedAt) {
              <p class="user-joined">Joined {{ formatDate(user()!.joinedAt!) }}</p>
            }
          </div>
        }

        @if (showStreaks()) {
          <div class="user-display__streaks">
            <h4>Current Streaks</h4>
            @if (hasStreaks()) {
              <div class="streaks-list">
                @for (streak of streakEntries(); track streak.key) {
                  <div class="streak-item">
                    <span class="streak-type">{{ streak.key }}</span>
                    <span class="streak-count">{{ streak.value }} days</span>
                  </div>
                }
              </div>
            } @else {
              <p class="no-streaks">No active streaks</p>
            }
          </div>
        }
      } @else {
        <div class="user-display--empty">
          <p>No user data available</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .user-display {
      background: white;
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      max-width: 400px;
    }

    .user-display__header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .user-display__avatar {
      flex-shrink: 0;
    }

    .avatar-image {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      object-fit: cover;
    }

    .avatar-placeholder {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 1.2rem;
      color: #666;
    }

    .user-display__info {
      flex: 1;
      min-width: 0;
    }

    .user-name {
      margin: 0 0 0.25rem 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #333;
    }

    .user-status {
      margin: 0;
      color: #666;
      font-size: 0.875rem;
    }

    .verified-badge {
      color: #28a745;
      font-weight: 500;
      margin-left: 0.5rem;
    }

    .user-display__stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .stat-item {
      text-align: center;
      padding: 0.75rem;
      background: #f8f9fa;
      border-radius: 6px;
    }

    .stat-label {
      display: block;
      font-size: 0.75rem;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.25rem;
    }

    .stat-value {
      display: block;
      font-size: 1.25rem;
      font-weight: 600;
      color: #333;
    }

    .user-display__details {
      margin-bottom: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid #e0e0e0;
    }

    .user-email {
      margin: 0 0 0.5rem 0;
      color: #666;
      font-size: 0.875rem;
    }

    .user-joined {
      margin: 0;
      color: #888;
      font-size: 0.8rem;
    }

    .user-display__streaks h4 {
      margin: 0 0 0.75rem 0;
      font-size: 1rem;
      color: #333;
    }

    .streaks-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .streak-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem;
      background: #fff3cd;
      border-radius: 4px;
    }

    .streak-type {
      font-weight: 500;
      color: #856404;
    }

    .streak-count {
      font-weight: 600;
      color: #856404;
    }

    .no-streaks {
      margin: 0;
      color: #888;
      font-style: italic;
    }

    .user-display--empty {
      text-align: center;
      padding: 2rem;
      color: #888;
    }

    @media (max-width: 480px) {
      .user-display {
        padding: 1rem;
      }

      .user-display__stats {
        grid-template-columns: 1fr;
      }
    }
  `],
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserDisplayComponent {
  // ✅ Simple inputs following your conventions
  readonly user = input<User | null>(null);
  readonly showStreaks = input<boolean>(true);

  // ✅ Computed display values
  readonly displayName = computed(() => {
    const currentUser = this.user();
    if (!currentUser) return 'Unknown User';

    if (currentUser.isAnonymous) {
      return `Anonymous User ${currentUser.uid.slice(-6)}`;
    }

    return currentUser.displayName || currentUser.email || 'User';
  });

  readonly avatarInitials = computed(() => {
    const name = this.displayName();
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  });

  readonly hasStreaks = computed(() => {
    const currentUser = this.user();
    return currentUser && Object.keys(currentUser.streaks).length > 0;
  });

  readonly streakEntries = computed(() => {
    const currentUser = this.user();
    if (!currentUser) return [];

    return Object.entries(currentUser.streaks).map(([key, value]) => ({
      key,
      value
    }));
  });

  // ✅ Helper method for date formatting
  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Unknown';
    }
  }
}
