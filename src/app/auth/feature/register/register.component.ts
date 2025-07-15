import { Component, inject, signal, ChangeDetectionStrategy, computed } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { BaseComponent } from '@shared/base/base.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { FormInputComponent } from '@shared/ui/form-input/form-input.component';
import { AuthStore } from '@auth/data-access/auth.store';
import { FormValidators } from '@shared/utils/form-validators';

@Component({
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, FormInputComponent],
  template: `
    <div class="register-container">
      <!-- Header -->
      <div class="register-header">
        <app-button
          variant="ghost"
          size="sm"
          iconLeft="arrow_back"
          (onClick)="navigateBack()"
          class="back-button"
        >
          Back
        </app-button>
        
        <div class="logo-container">
          <img src="/assets/logos/logo.svg" alt="Spoonscount" class="app-logo" />
        </div>
        
        <h1 class="register-title">Join Spoonscount</h1>
        <p class="register-subtitle">Create your account and start collecting</p>
      </div>

      <!-- Registration Form -->
      <div class="register-form-section">
        <form [formGroup]="registerForm" (ngSubmit)="handleSubmit()" class="register-form">
          <!-- Display Name Field -->
          <app-form-input
            label="Display Name"
            type="text"
            placeholder="Enter your display name"
            iconLeft="person"
            autocomplete="name"
            [required]="true"
            [disabled]="loading()"
            [errorMessage]="getFieldError('displayName')"
            formControlName="displayName"
          />

          <!-- Email Field -->
          <app-form-input
            label="Email"
            type="email"
            placeholder="Enter your email"
            iconLeft="email"
            autocomplete="email"
            [required]="true"
            [disabled]="loading()"
            [errorMessage]="getFieldError('email')"
            formControlName="email"
          />

          <!-- Password Field -->
          <app-form-input
            label="Password"
            type="password"
            placeholder="Create a password (6+ characters)"
            iconLeft="lock"
            autocomplete="new-password"
            [required]="true"
            [disabled]="loading()"
            [errorMessage]="getFieldError('password')"
            formControlName="password"
          />
          
          <!-- Password strength indicator -->
          @if (currentPassword().length > 0) {
            <div class="password-strength">
              <div class="strength-bar">
                <div
                  class="strength-fill"
                  [attr.data-strength]="passwordStrength()"
                  [style.width.%]="passwordStrengthPercentage()"
                ></div>
              </div>
              <span class="strength-text" [attr.data-strength]="passwordStrength()">
                {{ passwordStrengthText() }}
              </span>
            </div>
          }

          <!-- Confirm Password Field -->
          <app-form-input
            label="Confirm Password"
            type="password"
            placeholder="Confirm your password"
            iconLeft="lock"
            autocomplete="new-password"
            [required]="true"
            [disabled]="loading()"
            [errorMessage]="getFieldError('confirmPassword')"
            formControlName="confirmPassword"
          />

          <!-- Error Message -->
          @if (error()) {
            <div class="form-error form-error--global">
              {{ error() }}
            </div>
          }

          <!-- Submit Button -->
          <app-button
            type="submit"
            variant="primary"
            size="lg"
            [fullWidth]="true"
            [loading]="loading()"
            [disabled]="registerForm.invalid"
            class="submit-button"
          >
            @if (loading()) {
              Creating Account...
            } @else {
              Create Account
            }
          </app-button>
        </form>

        <!-- Alternative Registration Methods -->
        <div class="alternative-register">
          <div class="divider">
            <span class="divider-text">or</span>
          </div>

          <app-button
            variant="secondary"
            size="lg"
            [fullWidth]="true"
            iconLeft="login"
            [loading]="googleLoading()"
            (onClick)="registerWithGoogle()"
            class="google-button"
          >
            Continue with Google
          </app-button>
        </div>

        <!-- Footer Links -->
        <div class="register-footer">
          <p class="footer-text">
            Already have an account? 
            <button type="button" class="link-button" (click)="navigateToLogin()">
              Sign in
            </button>
          </p>
          
          <p class="terms-text">
            By creating an account, you agree to our 
            <a href="/terms" class="link-button">Terms of Service</a> and 
            <a href="/privacy" class="link-button">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  `,
  styles: `
    .register-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
      
      /* Carpet background with dark overlay */
      background-image:
        linear-gradient(rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0.8)),
        url('/assets/carpets/bangor.jpg');
      background-size: cover;
      background-position: center;
      background-attachment: fixed;
      
      color: var(--text-on-dark, white);
    }

    .register-header {
      text-align: center;
      padding: 2rem 1.5rem 1rem;
      position: relative;
    }

    .back-button {
      position: absolute;
      top: 1rem;
      left: 1rem;
      z-index: 10;
    }

    .logo-container {
      margin-bottom: 1.5rem;
    }

    .app-logo {
      width: 80px;
      height: 80px;
      filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
    }

    .register-title {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      background: linear-gradient(135deg, #ffffff, #e5e7eb);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .register-subtitle {
      font-size: 1rem;
      color: rgba(255, 255, 255, 0.8);
      margin: 0;
    }

    .register-form-section {
      flex: 1;
      padding: 1rem 1.5rem 2rem;
      max-width: 400px;
      margin: 0 auto;
      width: 100%;
    }

    .register-form {
      background: rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 1rem;
      padding: 2rem;
      margin-bottom: 1.5rem;
    }

    .password-strength {
      margin-top: 0.5rem;
      margin-bottom: 1rem;
    }

    .strength-bar {
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 2px;
      overflow: hidden;
    }

    .strength-fill {
      height: 100%;
      transition: all 0.3s ease;
      border-radius: 2px;
    }

    .strength-fill[data-strength="weak"] {
      background: #ef4444;
    }

    .strength-fill[data-strength="medium"] {
      background: #f59e0b;
    }

    .strength-fill[data-strength="strong"] {
      background: #10b981;
    }

    .strength-text {
      display: block;
      font-size: 0.75rem;
      margin-top: 0.25rem;
      transition: color 0.3s ease;
    }

    .strength-text[data-strength="weak"] {
      color: #ef4444;
    }

    .strength-text[data-strength="medium"] {
      color: #f59e0b;
    }

    .strength-text[data-strength="strong"] {
      color: #10b981;
    }

    .form-error--global {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 0.5rem;
      padding: 0.75rem;
      margin-bottom: 1rem;
      text-align: center;
      color: var(--error, #ef4444);
      font-size: 0.875rem;
    }

    .submit-button {
      margin-top: 0.5rem;
    }

    .alternative-register {
      margin-bottom: 1.5rem;
    }

    .divider {
      display: flex;
      align-items: center;
      margin: 1.5rem 0;
    }

    .divider::before,
    .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: rgba(255, 255, 255, 0.2);
    }

    .divider-text {
      padding: 0 1rem;
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.6);
    }

    .register-footer {
      text-align: center;
    }

    .footer-text {
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 1rem;
    }

    .terms-text {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.6);
      margin-bottom: 0;
      line-height: 1.4;
    }

    .link-button {
      background: none;
      border: none;
      color: var(--primary, #10b981);
      text-decoration: underline;
      text-decoration-color: rgba(16, 185, 129, 0.5);
      cursor: pointer;
      font-size: inherit;
      transition: color 0.2s ease;
    }

    .link-button:hover {
      color: var(--primary-hover, #059669);
      text-decoration-color: var(--primary-hover, #059669);
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .register-container {
        background-attachment: scroll;
      }

      .register-header {
        padding: 1.5rem 1rem 1rem;
      }

      .register-form-section {
        padding: 1rem;
      }

      .register-form {
        padding: 1.5rem;
      }
    }

    /* Animation for smooth entrance */
    .register-header {
      animation: fadeInUp 0.6s ease-out;
    }

    .register-form-section {
      animation: fadeInUp 0.6s ease-out 0.2s both;
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `
})
export class RegisterComponent extends BaseComponent {
  private readonly authStore = inject(AuthStore);
  private readonly fb = inject(FormBuilder);

  // Reactive form
  readonly registerForm = this.fb.group({
    displayName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(30), FormValidators.displayName()]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  }, {
    validators: [FormValidators.passwordMatch('password', 'confirmPassword')]
  });

  // UI state
  readonly googleLoading = signal(false);

  // Computed properties for validation and password strength
  readonly currentPassword = computed(() => {
    return this.registerForm.get('password')?.value || '';
  });

  readonly passwordsMatch = computed(() => {
    const password = this.registerForm.get('password')?.value;
    const confirmPassword = this.registerForm.get('confirmPassword')?.value;
    return password === confirmPassword;
  });

  readonly passwordStrength = computed(() => {
    const strength = FormValidators.getPasswordStrength(this.currentPassword());
    return strength.label.toLowerCase();
  });

  readonly passwordStrengthPercentage = computed(() => {
    const strength = FormValidators.getPasswordStrength(this.currentPassword());
    return strength.percentage;
  });

  readonly passwordStrengthText = computed(() => {
    const strength = FormValidators.getPasswordStrength(this.currentPassword());
    return `${strength.label} password`;
  });

  getFieldError(fieldName: string): string | undefined {
    const control = this.registerForm.get(fieldName);
    if (control?.invalid && (control.dirty || control.touched) && control.errors) {
      return FormValidators.getErrorMessage(fieldName, control.errors);
    }
    return undefined;
  }

  async handleSubmit(): Promise<void> {
    if (this.loading() || this.registerForm.invalid) return;

    this.loading.set(true);
    this.error.set(null);

    const { displayName, email, password } = this.registerForm.value;

    try {
      await this.authStore.registerWithEmail(
        email!.trim(),
        password!,
        displayName!.trim()
      );
      
      // Navigate to home after successful registration
      await this.router.navigate(['/home']);
    } catch (error: any) {
      console.error('[Register] Email registration failed:', error);
      this.handleRegistrationError(error);
    } finally {
      this.loading.set(false);
    }
  }

  async registerWithGoogle(): Promise<void> {
    if (this.googleLoading()) return;

    this.googleLoading.set(true);
    this.error.set(null);

    try {
      await this.authStore.loginWithGoogle();
      
      // Navigate to home after successful registration
      await this.router.navigate(['/home']);
    } catch (error: any) {
      console.error('[Register] Google registration failed:', error);
      this.handleRegistrationError(error);
    } finally {
      this.googleLoading.set(false);
    }
  }

  async navigateBack(): Promise<void> {
    await this.router.navigate(['/splash']);
  }

  async navigateToLogin(): Promise<void> {
    await this.router.navigate(['/login']);
  }

  private handleRegistrationError(error: any): void {
    let errorMessage = 'Registration failed. Please try again.';
    
    if (error?.code) {
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'An account with this email already exists.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak. Please choose a stronger password.';
          break;
        case 'auth/popup-closed-by-user':
          errorMessage = 'Sign-up was cancelled.';
          break;
        case 'auth/popup-blocked':
          errorMessage = 'Popup was blocked by your browser. Please allow popups and try again.';
          break;
        case 'auth/account-exists-with-different-credential':
          errorMessage = 'An account with this email exists with a different sign-in method.';
          break;
        default:
          if (error.message) {
            errorMessage = error.message;
          }
      }
    }
    
    this.error.set(errorMessage);
  }
}