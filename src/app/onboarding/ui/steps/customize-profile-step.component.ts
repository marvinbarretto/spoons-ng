import { Component, input, output, ChangeDetectionStrategy, computed } from '@angular/core';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { ProfileIdentityWidgetComponent } from '@home/ui/profile-customisation-modal/widgets/profile-identity-widget/profile-identity-widget.component';
import type { User } from '@users/utils/user.model';

@Component({
  selector: 'app-customize-profile-step',
  imports: [ButtonComponent, ProfileIdentityWidgetComponent],
  template: `
    <div class="step customize-profile-step">
      <h1>Customize Your Profile</h1>
      <p class="subtitle">Join the stupidest competition you'll actually care about winning</p>

      <!-- Profile Identity Widget (Avatar + Name) -->
      <div class="profile-section">
        <app-profile-identity-widget
          [user]="user()"
          [displayName]="displayName()"
          [selectedAvatarId]="selectedAvatarId()"
          (displayNameChanged)="onDisplayNameChange($event)"
          (avatarSelected)="onAvatarSelected($event)"
        />
      </div>

      <!-- Google Auth Option -->
      <div class="auth-option">
        <div class="divider">
          <span>or</span>
        </div>
        <app-button
          variant="secondary"
          iconLeft="google"
          size="lg"
          (onClick)="onGoogleLogin()"
          class="google-button"
        >
          Sign in with Google
        </app-button>
        <p class="google-hint">Use your Google account for a more personalized experience</p>
      </div>

      <!-- Actions -->
      <div class="step-actions">
        @if (showBackButton()) {
          <app-button variant="secondary" (onClick)="back.emit()">
            Back
          </app-button>
        }
        <app-button
          variant="primary"
          [disabled]="!isValid()"
          (onClick)="onContinue()"
        >
          Continue
        </app-button>
      </div>
    </div>
  `,
  styles: `
    .customize-profile-step {
      max-width: 650px;
      width: 100%;
      margin: 0 auto;
    }

    h1 {
      font-size: 2.5rem;
      margin: 0 0 0.5rem 0;
      color: var(--text-on-dark, white);
      text-align: center;
    }

    .subtitle {
      font-size: 1.125rem;
      margin: 0 0 2rem 0;
      color: rgba(255, 255, 255, 0.9);
      text-align: center;
    }

    .profile-section {
      margin-bottom: 2rem;
    }

    /* Google Auth Section */
    .auth-option {
      margin: 2rem 0;
      text-align: center;
    }

    .divider {
      position: relative;
      margin: 2rem 0;
      text-align: center;
    }

    .divider::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background: rgba(255, 255, 255, 0.2);
    }

    .divider span {
      position: relative;
      background: rgba(0, 0, 0, 0.8);
      padding: 0 1rem;
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.875rem;
    }

    .google-button {
      width: 100%;
      max-width: 300px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      background: rgba(255, 255, 255, 0.95);
      color: var(--text-dark);
      border: none;
      transition: all 0.2s ease;
    }

    .google-button:hover {
      background: white;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .google-hint {
      margin: 0.75rem 0 0 0;
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.7);
    }

    /* Action Buttons */
    .step-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-top: 2rem;
    }

    .step-actions app-button {
      min-width: 120px;
    }

    @media (max-width: 768px) {
      h1 {
        font-size: 2rem;
      }

      .subtitle {
        font-size: 1rem;
      }

      .step-actions {
        flex-direction: column;
        width: 100%;
        max-width: 300px;
        margin: 2rem auto 0;
      }
      
      .step-actions app-button {
        width: 100%;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomizeProfileStepComponent {
  readonly user = input<User | null>(null);
  readonly selectedAvatarId = input<string>('');
  readonly displayName = input<string>('');

  readonly avatarSelected = output<string>();
  readonly nameChanged = output<string>();
  readonly generateRandom = output<void>();
  readonly googleLogin = output<void>();
  readonly back = output<void>();
  readonly continue = output<void>();

  // Computed properties
  readonly showBackButton = computed(() => true); // Always show back button
  readonly isAnonymous = computed(() => {
    return this.user()?.isAnonymous ?? true;
  });

  onDisplayNameChange(newName: string): void {
    console.log('[CustomizeProfileStep] Display name changed:', newName);
    this.nameChanged.emit(newName);
  }

  onAvatarSelected(avatarId: string): void {
    console.log('[CustomizeProfileStep] Avatar selected:', avatarId);
    this.avatarSelected.emit(avatarId);
  }

  onGoogleLogin(): void {
    console.log('[CustomizeProfileStep] Google login requested');
    this.googleLogin.emit();
  }

  onContinue(): void {
    if (this.isValid()) {
      console.log('[CustomizeProfileStep] Continuing with profile:', {
        displayName: this.displayName(),
        avatarId: this.selectedAvatarId()
      });
      this.continue.emit();
    }
  }

  isValid(): boolean {
    const hasName = this.displayName().trim().length >= 2;
    const hasAvatar = this.selectedAvatarId().length > 0;
    return hasName && hasAvatar;
  }
}
