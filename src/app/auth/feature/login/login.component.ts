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
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, FormInputComponent],
  template: `
    <div class="login-container">
      <!-- Header -->
      <div class="login-header">
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

        <h1 class="login-title">Welcome Back</h1>
        <p class="login-subtitle">Sign in to your Spoonscount account</p>
      </div>

      <!-- Login Form -->
      <div class="login-form-section">
        <form [formGroup]="loginForm" (ngSubmit)="handleSubmit()" class="login-form">
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
            placeholder="Enter your password"
            iconLeft="lock"
            autocomplete="current-password"
            [required]="true"
            [disabled]="loading()"
            [errorMessage]="getFieldError('password')"
            formControlName="password"
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
            [disabled]="loginForm.invalid"
            class="submit-button"
          >
            @if (loading()) {
              Signing In...
            } @else {
              Sign In
            }
          </app-button>
        </form>

        <!-- Alternative Login Methods -->
        <div class="alternative-login">
          <div class="divider">
            <span class="divider-text">or</span>
          </div>

          <app-button
            variant="secondary"
            size="lg"
            [fullWidth]="true"
            iconLeft="login"
            [loading]="googleLoading()"
            (onClick)="loginWithGoogle()"
            class="google-button"
          >
            Continue with Google
          </app-button>
        </div>

        <!-- Footer Links -->
        <div class="login-footer">
          <p class="footer-text">
            Don't have an account?
            <button type="button" class="link-button" (click)="navigateToRegister()">
              Sign up
            </button>
          </p>

          <button type="button" class="link-button forgot-password" (click)="handleForgotPassword()">
            Forgot your password?
          </button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .login-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;

      /* Carpet background with dark overlay */
      background-image:
        linear-gradient(rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0.8)),
        url('/assets/carpets/red-lion.jpg');
      background-size: cover;
      background-position: center;
      background-attachment: fixed;

      color: var(--text-on-dark, white);
    }

    .login-header {
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

    .login-title {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      background: linear-gradient(135deg, #ffffff, #e5e7eb);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .login-subtitle {
      font-size: 1rem;
      color: rgba(255, 255, 255, 0.8);
      margin: 0;
    }

    .login-form-section {
      flex: 1;
      padding: 1rem 1.5rem 2rem;
      max-width: 400px;
      margin: 0 auto;
      width: 100%;
    }

    .login-form {
      background: rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 1rem;
      padding: 2rem;
      margin-bottom: 1.5rem;
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

    .alternative-login {
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

    .google-button {
      margin-bottom: 0;
    }

    .login-footer {
      text-align: center;
    }

    .footer-text {
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 1rem;
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

    .forgot-password {
      font-size: 0.875rem;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .login-container {
        background-attachment: scroll;
      }

      .login-header {
        padding: 1.5rem 1rem 1rem;
      }

      .login-form-section {
        padding: 1rem;
      }

      .login-form {
        padding: 1.5rem;
      }
    }

    /* Animation for smooth entrance */
    .login-header {
      animation: fadeInUp 0.6s ease-out;
    }

    .login-form-section {
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
export class LoginComponent extends BaseComponent {
  private readonly authStore = inject(AuthStore);
  private readonly fb = inject(FormBuilder);

  // Reactive form
  readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  // UI state
  readonly googleLoading = signal(false);

  async handleSubmit(): Promise<void> {
    if (this.loading() || this.loginForm.invalid) return;

    this.loading.set(true);
    this.error.set(null);

    const { email, password } = this.loginForm.value;

    try {
      await this.authStore.loginWithEmail(email!.trim(), password!);

      // Navigate to home or onboarding based on user state
      await this.router.navigate(['/home']);
    } catch (error: any) {
      console.error('[Login] Email login failed:', error);
      this.handleLoginError(error);
    } finally {
      this.loading.set(false);
    }
  }

  async loginWithGoogle(): Promise<void> {
    if (this.googleLoading()) return;

    this.googleLoading.set(true);
    this.error.set(null);

    try {
      await this.authStore.loginWithGoogle();

      // Navigate to home or onboarding based on user state
      await this.router.navigate(['/home']);
    } catch (error: any) {
      console.error('[Login] Google login failed:', error);
      this.handleLoginError(error);
    } finally {
      this.googleLoading.set(false);
    }
  }

  getFieldError(fieldName: string): string | undefined {
    const control = this.loginForm.get(fieldName);
    if (control?.invalid && (control.dirty || control.touched) && control.errors) {
      return FormValidators.getErrorMessage(fieldName, control.errors);
    }
    return undefined;
  }

  async navigateBack(): Promise<void> {
    await this.router.navigate(['/splash']);
  }

  async navigateToRegister(): Promise<void> {
    await this.router.navigate(['/register']);
  }

  handleForgotPassword(): void {
    // TODO: Implement forgot password functionality
    this.showError('Forgot password functionality coming soon!');
  }

  private handleLoginError(error: any): void {
    let errorMessage = 'Login failed. Please try again.';

    if (error?.code) {
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password. Please try again.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later.';
          break;
        case 'auth/popup-closed-by-user':
          errorMessage = 'Sign-in was cancelled.';
          break;
        case 'auth/popup-blocked':
          errorMessage = 'Popup was blocked by your browser. Please allow popups and try again.';
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
