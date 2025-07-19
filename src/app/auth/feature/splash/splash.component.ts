import { Component, inject, signal, ChangeDetectionStrategy, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';

import { BaseComponent } from '@shared/base/base.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { AuthStore } from '@auth/data-access/auth.store';
import { ThemeStore } from '@shared/data-access/theme.store';
import type { ThemeType } from '@shared/utils/theme.tokens';

@Component({
  selector: 'app-splash',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent],
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
    console.log('[SplashComponent] 🎬 Component initializing...');
    console.log('[SplashComponent] 🎬 Current auth state:', {
      isAuthenticated: this.authStore.isAuthenticated(),
      userId: this.authStore.user()?.uid?.slice(0, 8),
      isAnonymous: this.authStore.user()?.isAnonymous
    });
    
    // Store current theme and override with sunshine for better contrast on dark backgrounds
    this.originalTheme = this.themeStore.themeType();
    console.log('[SplashComponent] 🎨 Switching theme from', this.originalTheme, 'to sunshine');
    this.themeStore.setTheme('sunshine');
  }

  ngOnDestroy(): void {
    console.log('[SplashComponent] 🎬 Component destroying...');
    // Restore original theme when leaving auth page
    if (this.originalTheme) {
      console.log('[SplashComponent] 🎨 Restoring theme to:', this.originalTheme);
      this.themeStore.setTheme(this.originalTheme);
    }
  }

  async navigateToLogin(): Promise<void> {
    console.log('[SplashComponent] 🔐 navigateToLogin() called');
    this.loading.set(true);
    try {
      console.log('[SplashComponent] 🔐 Navigating to /login');
      const success = await this.router.navigate(['/login']);
      console.log('[SplashComponent] 🔐 Navigation to /login result:', success);
    } catch (error) {
      console.error('[SplashComponent] ❌ Navigation to /login failed:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async navigateToRegister(): Promise<void> {
    console.log('[SplashComponent] 📝 navigateToRegister() called');
    this.loading.set(true);
    try {
      console.log('[SplashComponent] 📝 Navigating to /register');
      const success = await this.router.navigate(['/register']);
      console.log('[SplashComponent] 📝 Navigation to /register result:', success);
    } catch (error) {
      console.error('[SplashComponent] ❌ Navigation to /register failed:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async continueAsGuest(): Promise<void> {
    console.log('[SplashComponent] 👻 continueAsGuest() called');
    const startTime = Date.now();
    this.guestLoading.set(true);
    
    try {
      console.log('[SplashComponent] 👻 Starting guest authentication flow...');
      console.log('[SplashComponent] 👻 Auth state before guest creation:', {
        hasUser: !!this.authStore.user(),
        isAuthenticated: this.authStore.isAuthenticated()
      });

      // Create anonymous user when user chooses guest
      console.log('[SplashComponent] 👻 Calling authStore.continueAsGuest()...');
      await this.authStore.continueAsGuest();
      console.log('[SplashComponent] 👻 authStore.continueAsGuest() completed');

      // Wait for user to be authenticated
      console.log('[SplashComponent] 👻 Waiting for user authentication...');
      await this.authStore.waitForUserAuthenticated();
      console.log('[SplashComponent] 👻 User authentication completed');
      
      const authTime = Date.now() - startTime;
      console.log('[SplashComponent] 👻 Guest auth took', authTime, 'ms');
      
      console.log('[SplashComponent] 👻 Final auth state:', {
        hasUser: !!this.authStore.user(),
        userId: this.authStore.user()?.uid?.slice(0, 8),
        isAuthenticated: this.authStore.isAuthenticated(),
        isAnonymous: this.authStore.user()?.isAnonymous
      });

      console.log('[SplashComponent] 👻 Navigating to /home...');
      const success = await this.router.navigate(['/home']);
      console.log('[SplashComponent] 👻 Navigation to /home result:', success);
      
      const totalTime = Date.now() - startTime;
      console.log('[SplashComponent] ✅ Complete guest flow took', totalTime, 'ms');
    } catch (error) {
      console.error('[SplashComponent] ❌ Guest login failed:', {
        error: error,
        message: error instanceof Error ? error.message : 'Unknown error',
        timeTaken: Date.now() - startTime + 'ms'
      });
      this.showError('Failed to continue as guest. Please try again.');
    } finally {
      this.guestLoading.set(false);
    }
  }
}
