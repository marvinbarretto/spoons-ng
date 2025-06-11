// src/app/features/home/ui/welcome/welcome.component.ts
import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';

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
          <div class="avatar-placeholder" (click)="chooseAvatar.emit()">
            <span class="avatar-icon">{{ avatarInitial() }}</span>
            @if (canCustomizeAvatar()) {
              <div class="avatar-edit-hint">📷</div>
            }
          </div>
        }

        <div class="name-section">
          @if (showWelcomeText()) {
            <h1 class="welcome-title">Welcome, {{ displayName() }}!</h1>
          } @else {
            <h1 class="user-name">{{ displayName() }}</h1>
          }
        </div>
      </div>

      <!-- ✅ Progressive Action Buttons -->
      @if (shouldShowActions()) {
        <div class="user-actions">
          @if (isBrandNew()) {
            <p class="onboarding-text">Customize your pub crawling experience:</p>
          }

          <div class="action-buttons">
            @if (canCustomizeAvatar()) {
              <button
                type="button"
                class="btn btn-secondary"
                (click)="chooseAvatar.emit()"
              >
                📷 {{ avatarUrl() ? 'Change Avatar' : 'Add Avatar' }}
              </button>
            }

            <button
              type="button"
              class="btn btn-secondary"
              (click)="changeUsername.emit()"
            >
              ✏️ Change Name
            </button>

            @if (isAnonymous()) {
              <button
                type="button"
                class="btn btn-primary"
                (click)="upgradeAccount.emit()"
              >
                🚀 Sign up with Google
              </button>
            }
          </div>
        </div>
      }
    </section>
  `,
  styles: `
    .welcome {
      padding: 1.5rem 1rem;
      border-radius: 12px;
      margin-bottom: 1rem;
      transition: all 0.3s ease;
    }

    /* Brand new user styling */
    .welcome.brand-new {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      text-align: center;
    }

    /* Compact styling for returning users */
    .welcome.compact {
      background: transparent;
      padding: 1rem;
      text-align: left;
    }

    .user-section {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .welcome.brand-new .user-section {
      flex-direction: column;
      gap: 1rem;
    }

    .welcome.compact .user-section {
      margin-bottom: 0;
    }

    /* Avatar Styles */
    .avatar,
    .avatar-placeholder {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      flex-shrink: 0;
      position: relative;
    }

    .welcome.brand-new .avatar,
    .welcome.brand-new .avatar-placeholder {
      width: 80px;
      height: 80px;
    }

    .avatar {
      object-fit: cover;
      border: 3px solid #007bff;
      box-shadow: 0 2px 8px rgba(0, 123, 255, 0.2);
    }

    .avatar-placeholder {
      background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 0.2s ease;
      border: 3px solid #007bff;
    }

    .avatar-placeholder:hover {
      transform: scale(1.05);
    }

    .avatar-icon {
      color: white;
      font-size: 1.5rem;
      font-weight: 600;
    }

    .welcome.brand-new .avatar-icon {
      font-size: 2rem;
    }

    .avatar-edit-hint {
      position: absolute;
      bottom: -2px;
      right: -2px;
      background: #28a745;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      border: 2px solid white;
    }

    /* Name Section */
    .name-section {
      flex: 1;
      min-width: 0;
    }

    .welcome-title {
      margin: 0;
      color: #333;
      font-size: 1.8rem;
      font-weight: 600;
      line-height: 1.2;
    }

    .user-name {
      margin: 0;
      color: #333;
      font-size: 1.5rem;
      font-weight: 600;
      line-height: 1.2;
    }

    .welcome.compact .user-name {
      font-size: 1.3rem;
    }

    /* Actions Section */
    .user-actions {
      background: rgba(255, 255, 255, 0.8);
      border-radius: 8px;
      padding: 1rem;
      border: 1px solid rgba(0, 0, 0, 0.1);
    }

    .welcome.compact .user-actions {
      background: transparent;
      border: none;
      padding: 0;
      margin-top: 1rem;
    }

    .onboarding-text {
      margin: 0 0 1rem 0;
      color: #666;
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
      background: #007bff;
      color: white;
      box-shadow: 0 2px 4px rgba(0, 123, 255, 0.2);
    }

    .btn-primary:hover {
      background: #0056b3;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0, 123, 255, 0.3);
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
      box-shadow: 0 2px 4px rgba(108, 117, 125, 0.2);
    }

    .btn-secondary:hover {
      background: #545b62;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(108, 117, 125, 0.3);
    }

    .btn:active {
      transform: translateY(0);
    }

    /* Mobile responsive */
    @media (max-width: 480px) {
      .welcome {
        padding: 1.25rem 0.75rem;
      }

      .welcome-title {
        font-size: 1.5rem;
      }

      .user-name {
        font-size: 1.3rem;
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
  // ✅ Input signals
  readonly displayName = input<string>('Guest');
  readonly avatarUrl = input<string | null>(null);
  readonly isAnonymous = input<boolean>(false);
  readonly isBrandNew = input<boolean>(false);
  readonly showWelcomeText = input<boolean>(true);

  // ✅ Output events
  readonly changeUsername = output<void>();
  readonly chooseAvatar = output<void>();
  readonly upgradeAccount = output<void>();

  // ✅ Computed properties
  readonly avatarInitial = computed(() => {
    const name = this.displayName();
    return name.charAt(0).toUpperCase();
  });

  readonly canCustomizeAvatar = computed(() => {
    // Always allow avatar customization for now
    // Could be restricted based on user type later
    return true;
  });

  readonly shouldShowActions = computed(() => {
    // Show actions for brand new users or anonymous users
    return this.isBrandNew() || this.isAnonymous();
  });

  // ✅ Event handlers
  onAvatarError(event: Event): void {
    console.warn('[Welcome] Avatar failed to load:', this.avatarUrl());
    // Could emit an event to handle this in the parent component
  }
}
