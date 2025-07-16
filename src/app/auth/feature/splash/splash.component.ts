import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '@shared/base/base.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { AuthStore } from '@auth/data-access/auth.store';

@Component({
  selector: 'app-splash',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ButtonComponent],
  styleUrl: './splash.component.scss',
  template: `
    <div class="splash-container">
      <!-- Hero Section -->
      <div class="hero-section">
        <div class="logo-container">
          <img src="/assets/logos/logo.svg" alt="Spoonscount" class="app-logo" />
        </div>

        <h1 class="hero-title">Welcome to Spoonscount</h1>
        <p class="hero-subtitle">
          The ultimate pub checker-in app. Photograph carpets, earn points, and climb the leaderboards!
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="action-section">
        <div class="auth-buttons">
          <app-button
            variant="primary"
            size="lg"
            [fullWidth]="true"
            [loading]="loading()"
            (onClick)="navigateToLogin()"
          >
            Login
          </app-button>

          <app-button
            variant="secondary"
            size="lg"
            [fullWidth]="true"
            [loading]="loading()"
            (onClick)="navigateToRegister()"
          >
            Create Account
          </app-button>

          <app-button
            variant="ghost"
            size="md"
            [fullWidth]="true"
            [loading]="guestLoading()"
            (onClick)="continueAsGuest()"
          >
            Continue as Guest
          </app-button>
        </div>

        <!-- Terms and Privacy -->
        <div class="legal-links">
          <p class="legal-text">
            By continuing, you agree to our
            <a href="/terms" class="legal-link">Terms of Service</a> and
            <a href="/privacy" class="legal-link">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  `
})
export class SplashComponent extends BaseComponent {
  private readonly authStore = inject(AuthStore);

  readonly guestLoading = signal(false);

  async navigateToLogin(): Promise<void> {
    this.loading.set(true);
    try {
      await this.router.navigate(['/login']);
    } finally {
      this.loading.set(false);
    }
  }

  async navigateToRegister(): Promise<void> {
    this.loading.set(true);
    try {
      await this.router.navigate(['/register']);
    } finally {
      this.loading.set(false);
    }
  }

  async continueAsGuest(): Promise<void> {
    this.guestLoading.set(true);
    try {
      // Create anonymous user when user chooses guest
      await this.authStore.continueAsGuest();
      // Navigate directly to home after successful guest authentication
      await this.router.navigate(['/home']);
    } catch (error) {
      console.error('[Splash] Guest login failed:', error);
      this.showError('Failed to continue as guest. Please try again.');
    } finally {
      this.guestLoading.set(false);
    }
  }
}
