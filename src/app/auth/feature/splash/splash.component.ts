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
  `,
  styles: `
    .splash-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;

      /* Carpet background with dark overlay for readability */
      background-image:
        linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.7)),
        url('/assets/carpets/moon-under-water-watford.jpg');
      background-size: cover;
      background-position: center;
      background-attachment: fixed;

      color: var(--text-on-dark, white);
    }

    .hero-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 2rem 1.5rem;
      max-width: 500px;
      margin: 0 auto;
    }

    .logo-container {
      margin-bottom: 2rem;
    }

    .app-logo {
      width: 120px;
      height: 120px;
      filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
    }

    .hero-title {
      font-size: clamp(2.5rem, 5vw, 3.5rem);
      font-weight: 700;
      margin-bottom: 1rem;
      background: linear-gradient(135deg, #ffffff, #e5e7eb);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .hero-subtitle {
      font-size: 1.125rem;
      line-height: 1.6;
      color: rgba(255, 255, 255, 0.9);
      margin-bottom: 0;
      max-width: 400px;
    }

    .action-section {
      padding: 2rem 1.5rem;
      background: rgba(0, 0, 0, 0.2);
      backdrop-filter: blur(10px);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .auth-buttons {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-width: 400px;
      margin: 0 auto;
    }

    .legal-links {
      margin-top: 2rem;
      text-align: center;
    }

    .legal-text {
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.7);
      margin: 0;
    }

    .legal-link {
      color: var(--primary, #10b981);
      text-decoration: underline;
      text-decoration-color: rgba(16, 185, 129, 0.5);
      transition: color 0.2s ease;
    }

    .legal-link:hover {
      color: var(--primary-hover, #059669);
      text-decoration-color: var(--primary-hover, #059669);
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .splash-container {
        background-attachment: scroll;
      }

      .hero-section {
        padding: 1.5rem 1rem;
      }

      .app-logo {
        width: 100px;
        height: 100px;
      }

      .action-section {
        padding: 1.5rem 1rem;
      }

      .auth-buttons {
        gap: 0.75rem;
      }
    }

    /* Animation for smooth entrance */
    .hero-section {
      animation: fadeInUp 0.8s ease-out;
    }

    .action-section {
      animation: fadeInUp 0.8s ease-out 0.2s both;
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
      // The AuthService already handles anonymous login automatically
      // Navigate directly to home page
      await this.router.navigate(['/home']);
    } catch (error) {
      console.error('[Splash] Guest login failed:', error);
      this.showError('Failed to continue as guest. Please try again.');
    } finally {
      this.guestLoading.set(false);
    }
  }
}
