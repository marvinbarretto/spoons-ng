// src/app/home/ui/welcome/welcome.component.ts
import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { ASSETS } from '@shared/utils/assets.constants';

@Component({
  selector: 'app-welcome',
  imports: [],
  template: `
    <section class="welcome" [class.brand-new]="isBrandNew()" [class.compact]="!showWelcomeText()">

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
            <!-- ✅ Using simple asset constant -->
            <img [src]="NPC_AVATAR" alt="Default avatar" class="npc-image">
            @if (canCustomizeAvatar()) {
              <div class="avatar-edit-hint">✏️</div>
            }
          </div>
        }

        <div class="name-section">
          @if (showWelcomeText()) {
            <h1 class="welcome-title">
              Welcome,
              <button class="username-button" (click)="openSettings.emit()">
                <span class="username-text">{{ displayName() }}</span>
                <span class="edit-icon">✏️</span>
              </button>!
            </h1>
          } @else {
            <h1 class="user-name">
              <button class="username-button" (click)="openSettings.emit()">
                <span class="username-text">{{ displayName() }}</span>
                <span class="edit-icon">✏️</span>
              </button>
            </h1>
          }
        </div>
      </div>

      <!-- ✅ Simplified Action Buttons -->
      @if (shouldShowActions()) {
        <div class="user-actions">
          @if (isBrandNew()) {
            <p class="onboarding-text">Customize your pub crawling experience:</p>
          }

          <div class="action-buttons">
            <!-- Single settings button -->
            <button
              type="button"
              class="btn btn-primary"
              (click)="openSettings.emit()"
            >
              ⚙️ Customize Profile
            </button>
          </div>
        </div>
      }
    </section>
  `,
  styles: `
    .welcome {
      background: linear-gradient(135deg, var(--color-background) 0%, var(--color-lighter) 100%);
      border-radius: 12px;
      padding: 2rem 1.5rem;
      margin: 1rem auto;
      max-width: 400px;
      text-align: center;
      box-shadow: 0 4px 16px var(--color-shadow);
      border: 1px solid var(--color-border);
    }

    .welcome.compact {
      padding: 1.5rem;
      max-width: 500px;
    }

    .welcome.brand-new {
      background: linear-gradient(135deg, var(--color-accentLight) 0%, var(--color-lighter) 100%);
      border: 1px solid var(--color-accent);
    }

    /* User Section */
    .user-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .welcome.brand-new .user-section {
      flex-direction: column;
      gap: 1.5rem;
    }

    /* Avatar Styles */
    .avatar,
    .avatar-placeholder {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      position: relative;
      cursor: pointer;
      transition: transform 0.2s ease;
    }

    .avatar {
      object-fit: cover;
      border: 3px solid var(--color-primary);
      box-shadow: 0 2px 8px var(--color-shadow);
    }

    .avatar-placeholder {
      background: var(--color-surface);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid var(--color-borderSecondary);
    }

    .npc-avatar {
      background: transparent;
      border: 3px solid var(--color-secondary);
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
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      border: 2px solid var(--color-background);
      color: var(--color-primaryText);
    }

    /* Username Button Styling */
    .username-button {
      background: none;
      border: none;
      padding: 0;
      margin: 0;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      color: inherit;
      font: inherit;
      transition: all 0.2s ease;
      border-radius: 6px;
      padding: 0.25rem 0.5rem;
    }

    .username-button:hover {
      background: var(--color-lighter);
      transform: translateY(-1px);
    }

    .username-text {
      color: var(--color-textSecondary);
      font-weight: 600;
    }

    .edit-icon {
      opacity: 0.5;
      font-size: 0.75em;
      transition: opacity 0.2s ease;
      color: var(--color-textMuted);
    }

    .username-button:hover .edit-icon {
      opacity: 0.8;
    }

    /* Name Section */
    .name-section {
      flex: 1;
      min-width: 0;
      text-align: left;
    }

    .welcome.brand-new .name-section {
      text-align: center;
    }

    .welcome-title {
      margin: 0;
      color: var(--color-text);
      font-size: 1.8rem;
      font-weight: 600;
      line-height: 1.2;
    }

    .user-name {
      margin: 0;
      color: var(--color-text);
      font-size: 1.5rem;
      font-weight: 600;
      line-height: 1.2;
    }

    .welcome.compact .user-name {
      font-size: 1.3rem;
    }

    /* Actions Section */
    .user-actions {
      background: var(--color-surfaceElevated);
      border-radius: 8px;
      padding: 1rem;
      border: 1px solid var(--color-border);
    }

    .welcome.compact .user-actions {
      background: var(--color-surface);
      padding: 0.75rem;
      opacity: 0.9;
    }

    .onboarding-text {
      margin: 0 0 1rem 0;
      color: var(--color-textSecondary);
      font-size: 1rem;
      text-align: center;
    }

    .action-buttons {
      display: flex;
      gap: 0.75rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .welcome.compact .action-buttons {
      justify-content: flex-start;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.95rem;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 140px;
      justify-content: center;
    }

    .welcome.compact .btn {
      min-width: 120px;
      padding: 0.5rem 1rem;
      font-size: 0.9rem;
    }

    .btn-primary {
      background: var(--color-primary);
      color: var(--color-primaryText);
      box-shadow: 0 2px 4px var(--color-shadow);
    }

    .btn-primary:hover {
      background: var(--color-primaryHover);
      transform: translateY(-1px);
      box-shadow: 0 4px 8px var(--color-shadow);
    }

    .btn-primary:active {
      background: var(--color-primaryActive);
      transform: translateY(0);
    }

    .btn:disabled {
      background: var(--color-textMuted);
      color: var(--color-background);
      cursor: not-allowed;
      opacity: 0.6;
    }

    /* Mobile responsive */
    @media (max-width: 480px) {
      .welcome {
        padding: 1.25rem 0.75rem;
        margin: 0.5rem auto;
      }

      .welcome-title {
        font-size: 1.5rem;
      }

      .user-name {
        font-size: 1.3rem;
      }

      .welcome.compact .user-name {
        font-size: 1.2rem;
      }

      .action-buttons {
        flex-direction: column;
        align-items: center;
      }

      .welcome.compact .action-buttons {
        flex-direction: row;
        align-items: flex-start;
      }

      .btn {
        width: 100%;
        max-width: 200px;
      }

      .welcome.compact .btn {
        width: auto;
        max-width: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WelcomeComponent {
  // ✅ Simple asset reference
  readonly NPC_AVATAR = ASSETS.NPC_AVATAR;

  // ✅ Input signals
  readonly displayName = input<string>('Guest');
  readonly avatarUrl = input<string | null>(null);
  readonly isAnonymous = input<boolean>(false);
  readonly isBrandNew = input<boolean>(false);
  readonly showWelcomeText = input<boolean>(true);

  // ✅ Output events
  readonly openSettings = output<void>();

  // ✅ Computed properties
  readonly avatarInitial = computed(() => {
    const name = this.displayName();
    return name.charAt(0).toUpperCase();
  });

  readonly canCustomizeAvatar = computed(() => {
    return true;
  });

  readonly shouldShowActions = computed(() => {
    return this.isBrandNew() || this.isAnonymous();
  });

  // ✅ Event handlers
  onAvatarError(event: Event): void {
    console.warn('[Welcome] Avatar failed to load:', this.avatarUrl());
  }
}
