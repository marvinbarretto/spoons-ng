import { Component, inject, signal, ChangeDetectionStrategy, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { BaseComponent } from '@shared/base/base.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { FormInputComponent } from '@shared/ui/form-input/form-input.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { AuthStore } from '@auth/data-access/auth.store';
import { FormValidators } from '@shared/utils/form-validators';
import { ToastService } from '@shared/data-access/toast.service';
import { ThemeStore } from '@shared/data-access/theme.store';
import type { ThemeType } from '@shared/utils/theme.tokens';

@Component({
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, FormInputComponent, IconComponent],
  styleUrl: './register.component.scss',
  template: `
    <div class="register-container">
      <!-- Header -->
      <div class="register-header">
        <button type="button" class="back-button" (click)="navigateBack()">
          <app-icon name="arrow_back" size="lg" [interactive]="true"></app-icon>
        </button>

        <h1 class="register-title">Join Spoonscount</h1>
        <p class="register-subtitle">Choose how you'd like to get started</p>
      </div>

      <!-- Content Area -->
      <div class="register-content">
        <!-- Auth Options -->
        <div class="auth-options-section">
        <!-- Google Sign In -->
        <div class="auth-option">
          <app-button
            variant="primary"
            size="lg"
            [fullWidth]="true"
            iconLeft="login"
            [loading]="googleLoading()"
            (onClick)="registerWithGoogle()"
            class="google-button"
          >
            Sign in easy (with Google)
          </app-button>
        </div>

        <!-- Email Sign In -->
        <div class="auth-option">
          <app-button
            variant="secondary"
            size="lg"
            [fullWidth]="true"
            iconLeft="email"
            [loading]="emailLoading()"
            (onClick)="showEmailForm()"
            class="email-button"
          >
            Sign in with email
          </app-button>
        </div>

        <!-- Guest Option -->
        <div class="auth-option">
          <app-button
            variant="ghost"
            size="lg"
            [fullWidth]="true"
            iconLeft="person"
            [loading]="guestLoading()"
            (onClick)="continueAsGuest()"
            class="guest-button"
          >
            Continue as guest
          </app-button>
          <p class="guest-note">You can create an account later</p>
        </div>

        <!-- Email Form (shown when email button is clicked) -->
        @if (showEmailRegistration()) {
          <div class="email-form-container">
            <form [formGroup]="registerForm" (ngSubmit)="handleEmailSubmit()" class="email-form">
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
          </div>
        }
        </div>
      </div>

      <!-- Actions Area - Anchored to Bottom -->
      <div class="register-actions">
        <div class="register-footer">
          <p class="footer-text">
            Already have an account?
            <button type="button" class="link-button" (click)="navigateToLogin()">
              Sign in
            </button>
          </p>

          <p class="terms-text">
            By continuing, you agree to our
            <a href="/terms" class="link-button">Terms of Service</a> and
            <a href="/privacy" class="link-button">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class RegisterComponent extends BaseComponent implements OnInit, OnDestroy {
  private readonly authStore = inject(AuthStore);
  private readonly fb = inject(FormBuilder);
  private readonly themeStore = inject(ThemeStore);

  // Store original theme to restore on destroy
  private originalTheme: ThemeType | null = null;

  // Reactive form (simplified - only email and password)
  readonly registerForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  // UI state
  readonly googleLoading = signal(false);
  readonly emailLoading = signal(false);
  readonly guestLoading = signal(false);
  readonly showEmailRegistration = signal(false);

  override ngOnInit(): void {
    // Store current theme and override with sunshine for better contrast on dark backgrounds
    this.originalTheme = this.themeStore.themeType();
    this.themeStore.setTheme('sunshine');
  }

  ngOnDestroy(): void {
    // Restore original theme when leaving auth page
    if (this.originalTheme) {
      this.themeStore.setTheme(this.originalTheme);
    }
  }

  getFieldError(fieldName: string): string | undefined {
    const control = this.registerForm.get(fieldName);
    if (control?.invalid && (control.dirty || control.touched) && control.errors) {
      return FormValidators.getErrorMessage(fieldName, control.errors);
    }
    return undefined;
  }

  showEmailForm(): void {
    this.showEmailRegistration.set(true);
  }

  async handleEmailSubmit(): Promise<void> {
    if (this.loading() || this.registerForm.invalid) return;

    this.loading.set(true);
    this.error.set(null);

    const { email, password } = this.registerForm.value;

    try {
      await this.authStore.registerWithEmail(
        email!.trim(),
        password!
      );

      // Navigate to onboarding carousel after successful registration
      await this.router.navigate(['/onboarding-carousel']);
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

      // Navigate to onboarding carousel after successful Google registration
      await this.router.navigate(['/onboarding-carousel']);
    } catch (error: any) {
      console.error('[Register] Google registration failed:', error);
      this.handleRegistrationError(error);
    } finally {
      this.googleLoading.set(false);
    }
  }

  async continueAsGuest(): Promise<void> {
    if (this.guestLoading()) return;

    this.guestLoading.set(true);
    this.error.set(null);

    try {
      await this.authStore.continueAsGuest();

      // Navigate directly to home for guest users (skip onboarding)
      await this.router.navigate(['/home']);
    } catch (error: any) {
      console.error('[Register] Guest registration failed:', error);
      this.handleRegistrationError(error);
    } finally {
      this.guestLoading.set(false);
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
        case 'auth/operation-not-allowed':
          errorMessage = 'Email/password authentication is not enabled. Please contact support or use Google sign-in.';
          break;
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

    // Show both error in component and toast notification
    this.error.set(errorMessage);
    this.toastService.error(errorMessage, 8000); // 8 seconds for important errors
  }
}
