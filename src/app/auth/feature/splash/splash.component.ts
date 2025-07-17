import { Component, inject, signal, ChangeDetectionStrategy, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '@shared/base/base.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { AuthStore } from '@auth/data-access/auth.store';
import { ThemeStore } from '@shared/data-access/theme.store';
import type { ThemeType } from '@shared/utils/theme.tokens';

@Component({
  selector: 'app-splash',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ButtonComponent],
  styleUrl: './splash.component.scss',
  template: `
    <div class="splash-container">
      <!-- Content Area -->
      <div class="splash-content">
        <div class="hero-section">
          <h1 class="hero-title">🍺<br>Think you love Spoons?<br>Prove it.</h1>
          <p class="hero-subtitle">
          Keep track of your pub count.<br>
          Accumulate points with every visit.<br> Complete missions.
          </p>
        </div>
      </div>

      <!-- Actions Area - Anchored to Bottom -->
      <div class="splash-actions">
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
        <!-- TODO: Move these ? -->
        <!--div class="legal-links">
          <p class="legal-text">
            By continuing, you agree to our
            <a href="/terms" class="legal-link">Terms of Service</a> and
            <a href="/privacy" class="legal-link">Privacy Policy</a>
          </p>
        </div-->
      </div>
    </div>
  `
})
export class SplashComponent extends BaseComponent implements OnInit, OnDestroy {
  private readonly authStore = inject(AuthStore);
  private readonly themeStore = inject(ThemeStore);

  // Store original theme to restore on destroy
  private originalTheme: ThemeType | null = null;

  readonly guestLoading = signal(false);

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

  async navigateToLogin(): Promise<void> {
    this.loading.set(true);
    try {
      // Mark splash as seen since user is taking action from splash
      this.authStore.markSplashAsSeen();
      await this.router.navigate(['/login']);
    } finally {
      this.loading.set(false);
    }
  }

  async navigateToRegister(): Promise<void> {
    this.loading.set(true);
    try {
      // Mark splash as seen since user is taking action from splash
      this.authStore.markSplashAsSeen();
      await this.router.navigate(['/register']);
    } finally {
      this.loading.set(false);
    }
  }

  async continueAsGuest(): Promise<void> {
    this.guestLoading.set(true);
    try {
      console.log('[Splash] Starting guest authentication...');

      // Create anonymous user when user chooses guest
      await this.authStore.continueAsGuest();

      // Wait for user to be authenticated
      await this.authStore.waitForUserAuthenticated();

      console.log('[Splash] Guest authenticated, navigating to home...');
      await this.router.navigate(['/home']);
    } catch (error) {
      console.error('[Splash] Guest login failed:', error);
      this.showError('Failed to continue as guest. Please try again.');
    } finally {
      this.guestLoading.set(false);
    }
  }
}
