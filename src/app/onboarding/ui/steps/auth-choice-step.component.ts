import { Component, output, ChangeDetectionStrategy } from '@angular/core';
import { ButtonComponent } from '@shared/ui/button/button.component';

@Component({
  selector: 'app-auth-choice-step',
  imports: [ButtonComponent],
  template: `
    <div class="step auth-choice-step">
      <div class="choice-icon">🔐</div>
      <h1>How would you like to continue?</h1>
      <p class="subtitle">Choose your path to start collecting pubs</p>

      <div class="auth-options">
        <div class="auth-option social-option">
          <div class="option-header">
            <span class="icon">🚀</span>
            <h3>Quick Start with Google</h3>
          </div>
          <p>Sign in with your Google account for instant cloud sync and seamless experience across devices.</p>
          <app-button 
            variant="primary" 
            size="lg"
            iconLeft="account_circle"
            (onClick)="googleLogin.emit()"
          >
            Continue with Google
          </app-button>
        </div>

        <div class="divider">
          <span>or</span>
        </div>

        <div class="auth-option custom-option">
          <div class="option-header">
            <span class="icon">🎨</span>
            <h3>Create Custom Profile</h3>
          </div>
          <p>Customize your avatar and display name for a personalized pub hunting experience.</p>
          <app-button 
            variant="secondary" 
            size="lg"
            iconLeft="palette"
            (onClick)="customProfile.emit()"
          >
            Customize My Profile
          </app-button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .choice-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .subtitle {
      margin-bottom: 3rem;
      color: rgba(255, 255, 255, 0.9);
    }

    .auth-options {
      display: flex;
      flex-direction: column;
      gap: 2rem;
      max-width: 500px;
      margin: 0 auto;
    }

    .auth-option {
      padding: 2rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      text-align: left;
      transition: all 0.3s ease;
    }

    .auth-option:hover {
      background: rgba(255, 255, 255, 0.15);
      border-color: rgba(255, 255, 255, 0.3);
      transform: translateY(-2px);
    }

    .option-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .option-header .icon {
      font-size: 2rem;
    }

    .option-header h3 {
      margin: 0;
      color: white;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .auth-option p {
      color: rgba(255, 255, 255, 0.8);
      line-height: 1.5;
      margin-bottom: 1.5rem;
    }

    .auth-option app-button {
      width: 100%;
    }

    .divider {
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      margin: 1rem 0;
    }

    .divider::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background: rgba(255, 255, 255, 0.3);
    }

    .divider span {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 0.5rem 1rem;
      color: rgba(255, 255, 255, 0.8);
      font-size: 0.875rem;
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    @media (max-width: 768px) {
      .auth-option {
        padding: 1.5rem;
      }

      .option-header h3 {
        font-size: 1.125rem;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuthChoiceStepComponent {
  readonly googleLogin = output<void>();
  readonly customProfile = output<void>();
}