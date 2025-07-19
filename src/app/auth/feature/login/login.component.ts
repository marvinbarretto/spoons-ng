import { Component, inject, signal, ChangeDetectionStrategy, computed, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { JsonPipe } from '@angular/common';
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
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ButtonComponent, FormInputComponent, IconComponent],
  styleUrl: './login.component.scss',
  template: `
    <div class="login-container">
      <!-- Header -->
      <div class="login-header">
        <button type="button" class="back-button" (click)="navigateBack()">
          <app-icon name="arrow_back" size="lg" [interactive]="true"></app-icon>
        </button>

        <h1 class="login-title">Login</h1>
      </div>

      <!-- Content Area -->
      <div class="login-content">
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
            [errorMessage]="getFieldError('password')"
            formControlName="password"
          />

          <!-- Remember Me Checkbox -->
          <div class="remember-me-container">
            <label class="remember-me-label">
              <input
                type="checkbox"
                class="remember-me-checkbox"
                formControlName="rememberMe"
              />
              <span class="remember-me-text">Remember me</span>
            </label>
          </div>

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
        </div>
      </div>

      <!-- Actions Area - Anchored to Bottom -->
      <div class="login-actions">
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
})
export class LoginComponent extends BaseComponent implements OnInit, OnDestroy {
  protected readonly authStore = inject(AuthStore);
  protected readonly fb = inject(FormBuilder);
  private readonly themeStore = inject(ThemeStore);

  // Store original theme to restore on destroy
  private originalTheme: ThemeType | null = null;



  // Reactive form
  readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rememberMe: [false]
  });

  // UI state
  readonly googleLoading = signal(false);

  override ngOnInit(): void {
    // Store current theme and override with sunshine for better contrast on dark backgrounds
    this.originalTheme = this.themeStore.themeType();
    this.themeStore.setTheme('sunshine');

    // Load remember me preference if it exists
    const rememberMePreference = this.authStore.getRememberMePreference();
    if (rememberMePreference) {
      this.loginForm.patchValue({ rememberMe: true });
    }
  }

  ngOnDestroy(): void {
    // Restore original theme when leaving auth page
    if (this.originalTheme) {
      this.themeStore.setTheme(this.originalTheme);
    }
  }

  async handleSubmit(): Promise<void> {
    if (this.loading() || this.loginForm.invalid) return;

    this.loading.set(true);
    this.error.set(null);
    
    // Disable form controls during processing
    this.loginForm.disable();

    const { email, password, rememberMe } = this.loginForm.value;

    try {
      await this.authStore.loginWithEmail(email!.trim(), password!, rememberMe!);

      // Navigate to home or onboarding based on user state
      await this.router.navigate(['/home']);
    } catch (error: any) {
      console.error('[Login] Email login failed:', error);
      this.handleLoginError(error);
    } finally {
      this.loading.set(false);
      // Re-enable form controls
      this.loginForm.enable();
    }
  }

  async loginWithGoogle(): Promise<void> {
    if (this.googleLoading()) return;

    this.googleLoading.set(true);
    this.error.set(null);
    
    // Disable form controls during Google login processing
    this.loginForm.disable();

    try {
      await this.authStore.loginWithGoogle();

      // Navigate to home or onboarding based on user state
      await this.router.navigate(['/home']);
    } catch (error: any) {
      console.error('[Login] Google login failed:', error);
      this.handleLoginError(error);
    } finally {
      this.googleLoading.set(false);
      // Re-enable form controls
      this.loginForm.enable();
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
        case 'auth/invalid-credential':
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
          break;
        default:
          if (error.message) {
            errorMessage = error.message;
          }
      }
    }

    // Show error like registration flow
    this.error.set(errorMessage);
    this.toastService.centerError(errorMessage);
  }
}
