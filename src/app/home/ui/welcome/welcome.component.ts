// src/app/home/ui/welcome/welcome.component.ts
import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { ASSETS } from '@shared/utils/constants';
import type { User } from '@users/utils/user.model';

@Component({
  selector: 'app-welcome',
  template: `
    <div class="welcome" [class]="welcomeClass()">
      <div class="user-section">
        <!-- ✅ Avatar -->
        @if (avatarUrl()) {
          <img
            class="avatar"
            [src]="avatarUrl()!"
            [alt]="displayName() + ' avatar'"
          />
        } @else {
          <img
            class="avatar-placeholder"
            [src]="NPC_AVATAR"
            [alt]="displayName() + ' default avatar'"
          />
        }

        <!-- ✅ Name and Stats -->
        <div class="name-section">
          <h1 class="user-name">{{ welcomeMessage() }}</h1>

          @if (!isBrandNew()) {
            <div class="user-stats">
              <!-- ✅ Use badge summary from user document -->
              @if (badgeCount() > 0) {
                <span class="stat">🏅 {{ badgeCount() }} badge{{ badgeCount() === 1 ? '' : 's' }}</span>
              }

              @if (checkedInPubCount() > 0) {
                <span class="stat">🍺 {{ checkedInPubCount() }} pub{{ checkedInPubCount() === 1 ? '' : 's' }}</span>
              }

              @if (landlordCount() > 0) {
                <span class="stat">👑 {{ landlordCount() }} landlord{{ landlordCount() === 1 ? 'ship' : 'ships' }}</span>
              }
            </div>
          }
        </div>
      </div>

      <!-- ✅ Actions -->
      <div class="user-actions">
        @if (isBrandNew()) {
          <p class="welcome-hint">
            Welcome to Spoonscount! Start checking in to pubs to earn badges, score points and track your progress.
          </p>
        }

        @if (isAnonymous()) {
          <button
            type="button"
            class="btn btn-primary"
            (click)="openSettings.emit()"
          >
            {{ isBrandNew() ? 'Customize Profile' : 'Upgrade Account' }}
          </button>
        } @else {
          <button
            type="button"
            class="btn btn-secondary"
            (click)="openSettings.emit()"
          >
            Profile Settings
          </button>
        }
      </div>
    </div>
  `,
  styles: `
    .welcome {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 16px;
      padding: 2rem;
      margin-bottom: 2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 2rem;
      position: relative;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .welcome::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -20%;
      width: 200px;
      height: 200px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      pointer-events: none;
    }

    .user-section {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      flex: 1;
      z-index: 1;
    }

    .avatar,
    .avatar-placeholder {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      border: 3px solid rgba(255, 255, 255, 0.3);
      object-fit: cover;
      flex-shrink: 0;
    }

    .name-section {
      flex: 1;
    }

    .user-name {
      margin: 0 0 0.5rem 0;
      font-size: 1.8rem;
      font-weight: 700;
      line-height: 1.2;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }

    .user-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      margin-top: 0.5rem;
    }

    .stat {
      font-size: 0.9rem;
      opacity: 0.9;
      background: rgba(255, 255, 255, 0.2);
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      backdrop-filter: blur(10px);
    }

    .user-actions {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      align-items: flex-end;
      z-index: 1;
    }

    .welcome-hint {
      margin: 0 0 1rem 0;
      font-size: 0.9rem;
      opacity: 0.9;
      text-align: right;
      max-width: 300px;
      line-height: 1.4;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      white-space: nowrap;
    }

    .btn-primary {
      background: white;
      color: #667eea;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .btn-primary:hover {
      background: #f8f9fa;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      backdrop-filter: blur(10px);
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: translateY(-1px);
    }

    /* ✅ Brand new user layout */
    .welcome--brand-new {
      flex-direction: column;
      text-align: center;
      max-width: 500px;
      margin: 0 auto 2rem auto;
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
      font-size: 2rem;
    }

    .welcome--brand-new .user-actions {
      width: 100%;
      align-items: center;
    }

    .welcome--brand-new .welcome-hint {
      text-align: center;
      max-width: none;
    }

    .welcome--brand-new .btn {
      padding: 1rem 2rem;
      font-size: 1rem;
    }

    /* Mobile responsive */
    @media (max-width: 480px) {
      .welcome {
        flex-direction: column;
        gap: 1.5rem;
        padding: 1.5rem;
      }

      .user-section {
        width: 100%;
        justify-content: center;
      }

      .user-name {
        font-size: 1.4rem;
      }

      .user-stats {
        justify-content: center;
      }

      .user-actions {
        width: 100%;
        align-items: center;
      }

      .welcome-hint {
        text-align: center;
        max-width: none;
      }

      .btn {
        width: 100%;
        justify-content: center;
        padding: 0.875rem 1.5rem;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WelcomeComponent {
  // ✅ Asset reference
  readonly NPC_AVATAR = ASSETS.NPC_AVATAR;

  // ✅ Single input - the user with new summary fields
  readonly user = input<User | null>(null);

  // ✅ Output events
  readonly openSettings = output<void>();

  // ✅ Computed properties using new user structure
  readonly displayName = computed(() => {
    const currentUser = this.user();
    if (!currentUser) return 'Guest';
    return currentUser.displayName || 'User';
  });

  readonly avatarUrl = computed(() => {
    const currentUser = this.user();
    return currentUser?.photoURL || null;
  });

  readonly isAnonymous = computed(() => {
    const currentUser = this.user();
    return currentUser?.isAnonymous ?? true;
  });

  // ✅ Use badge summary from user document (not detailed badges)
  readonly badgeCount = computed(() => {
    const currentUser = this.user();
    return currentUser?.badgeCount || 0;
  });

  readonly checkedInPubCount = computed(() => {
    const currentUser = this.user();
    return currentUser?.checkedInPubIds?.length || 0;
  });

  // ✅ Use landlord summary from user document
  readonly landlordCount = computed(() => {
    const currentUser = this.user();
    return currentUser?.landlordCount || 0;
  });

  readonly isBrandNew = computed(() => {
    return this.checkedInPubCount() === 0 && this.badgeCount() === 0;
  });

  readonly welcomeClass = computed(() => {
    return this.isBrandNew() ? 'welcome--brand-new' : '';
  });

  readonly welcomeMessage = computed(() => {
    const name = this.displayName();
    const isBrandNew = this.isBrandNew();

    if (isBrandNew) {
      return `Welcome, ${name}!`;
    }

    return `Hey ${name}!`;
  });
}


