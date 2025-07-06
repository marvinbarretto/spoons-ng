import { Component, input, output, ChangeDetectionStrategy, computed } from '@angular/core';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { ButtonSize } from '@shared/ui/button/button.params';
import { ProfileIdentityWidgetComponent } from '@home/ui/profile-customisation-modal/widgets/profile-identity-widget/profile-identity-widget.component';
import type { User } from '@users/utils/user.model';

@Component({
  selector: 'app-customize-profile-step',
  imports: [ButtonComponent, ProfileIdentityWidgetComponent],
  template: `
    <div class="step customize-profile-step">
      <div class="hero-section">
        <h1>Right then, let's get you set up</h1>
        <p class="subtitle">Choose a username and pick an avatar</p>
      </div>

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
          size="lg"
          (onClick)="onGoogleLogin()"
          class="google-button"
        >
          Sign in with Google
        </app-button>
        <p class="google-hint">Use your Google account for a more personalized experience</p>
      </div>

      <!-- Actions -->
      <div class="cta-section">
        <div class="step-actions">
          @if (showBackButton()) {
            <app-button 
              variant="secondary" 
              [size]="ButtonSize.MEDIUM"
              (onClick)="back.emit()"
            >
              Back
            </app-button>
          }
          <app-button
            variant="primary"
            [size]="ButtonSize.LARGE"
            [disabled]="!isValid()"
            [loading]="loading()"
            loadingText="Saving profile..."
            (onClick)="onContinue()"
          >
            Continue
          </app-button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .customize-profile-step {
      display: flex;
      flex-direction: column;
      gap: 2rem;
      max-width: 500px;
      margin: 0 auto;
    }

    .hero-section {
      text-align: center;
      margin-bottom: 1rem;
    }

    .hero-section h1 {
      font-size: 2.5rem;
      line-height: 1.2;
      margin-bottom: 1rem;
      font-weight: 700;
      color: var(--text-primary, white);
    }

    .hero-section .subtitle {
      font-size: 1.125rem;
      line-height: 1.6;
      color: var(--text-primary, white);
      margin: 0;
    }

    .profile-section {
      margin: 0;
    }

    /* Google Auth Section */
    .auth-option {
      margin: 0;
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
      background: var(--border-secondary, rgba(255, 255, 255, 0.2));
    }

    .divider span {
      position: relative;
      background: var(--surface-primary, rgba(0, 0, 0, 0.8));
      padding: 0 1rem;
      color: var(--text-primary, white);
      font-size: 0.875rem;
    }


    .google-hint {
      margin: 0.75rem 0 0 0;
      font-size: 0.875rem;
      color: var(--text-primary, white);
    }

    /* Action Buttons */
    .cta-section {
      text-align: center;
      margin-top: 1rem;
    }

    .step-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin: 0;
    }

    .step-actions app-button {
      min-width: 120px;
    }

    @media (max-width: 768px) {
      .customize-profile-step {
        gap: 1.5rem;
      }

      .hero-section h1 {
        font-size: 2rem;
      }

      .hero-section .subtitle {
        font-size: 1rem;
      }

      .step-actions {
        flex-direction: column;
        width: 100%;
        max-width: 300px;
        margin: 0 auto;
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
  readonly loading = input<boolean>(false);

  readonly avatarSelected = output<string>();
  readonly nameChanged = output<string>();
  readonly generateRandom = output<void>();
  readonly googleLogin = output<void>();
  readonly back = output<void>();
  readonly continue = output<void>();
  
  // Expose ButtonSize for template
  readonly ButtonSize = ButtonSize;

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
