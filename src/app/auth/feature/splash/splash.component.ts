import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';

import { AuthStore } from '@auth/data-access/auth.store';
import { BaseComponent } from '@shared/base/base.component';
import { ThemeStore } from '@shared/data-access/theme.store';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { UserStore } from '@users/data-access/user.store';
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
          <!-- Animated Pub Glass -->
          <div class="glass-container">
            <svg 
              class="pub-glass" 
              viewBox="0 0 200 300" 
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label="Animated pub glass filling with beer"
            >
              <!-- Glass outline -->
              <path 
                class="glass-outline"
                d="M50 50 Q50 45 55 45 L145 45 Q150 45 150 50 L160 280 Q160 290 150 290 L50 290 Q40 290 40 280 Z"
                fill="none"
                stroke="var(--glass-border, rgba(255,255,255,0.3))"
                stroke-width="3"
              />
              
              <!-- Beer fill -->
              <clipPath id="glassClip">
                <path d="M50 50 Q50 45 55 45 L145 45 Q150 45 150 50 L160 280 Q160 290 150 290 L50 290 Q40 290 40 280 Z"/>
              </clipPath>
              
              <rect 
                class="beer-fill"
                x="40" 
                y="290" 
                width="120" 
                height="240"
                clip-path="url(#glassClip)"
                fill="url(#beerGradient)"
              />
              
              <!-- Foam/bubbles -->
              <g class="foam-bubbles" clip-path="url(#glassClip)">
                <circle cx="80" cy="60" r="8" fill="var(--foam-color, rgba(255,248,220,0.9))" class="bubble bubble-1"/>
                <circle cx="120" cy="70" r="6" fill="var(--foam-color, rgba(255,248,220,0.8))" class="bubble bubble-2"/>
                <circle cx="95" cy="65" r="4" fill="var(--foam-color, rgba(255,248,220,0.7))" class="bubble bubble-3"/>
              </g>
              
              <!-- Glass highlight -->
              <ellipse 
                cx="80" 
                cy="120" 
                rx="15" 
                ry="40" 
                fill="url(#glassHighlight)" 
                opacity="0.6"
              />
              
              <!-- Gradient definitions -->
              <defs>
                <linearGradient id="beerGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" style="stop-color:var(--beer-dark, #D2691E);stop-opacity:1" />
                  <stop offset="100%" style="stop-color:var(--beer-light, #F4A460);stop-opacity:1" />
                </linearGradient>
                <linearGradient id="glassHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:rgba(255,255,255,0.4);stop-opacity:1" />
                  <stop offset="100%" style="stop-color:rgba(255,255,255,0.1);stop-opacity:1" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <!-- Value Proposition -->
          <div class="value-proposition">
            @if (isFirstTimeUser()) {
              <h1 class="hero-title">Welcome to Spoonscount</h1>
              <p class="hero-subtitle">
                Track your Wetherspoons pub visits, collect badges, and discover new locations in your area. 
                Join thousands of pub enthusiasts on their Spoons journey!
              </p>
            } @else {
              <h1 class="hero-title">Welcome Back</h1>
              <p class="hero-subtitle">
                Continue your pub journey where you left off
              </p>
            }
            
            <!-- Trust indicators -->
            <div class="trust-indicators">
              <span class="trust-indicator">🔒 Privacy First</span>
              <span class="trust-indicator">📍 Local Discoveries</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions Area - Anchored to Bottom -->
      <div class="splash-actions">
        <div class="auth-buttons">
          <!-- Primary CTA -->
          <app-button
            size="lg"
            [fullWidth]="true"
            [loading]="googleLoading()"
            (onClick)="signInWithGoogle()"
            iconLeft="google"
            class="google-signin-btn"
            ariaLabel="Sign in with Google account"
          >
            Continue with Google
          </app-button>

          <!-- Secondary CTA -->
          <app-button
            size="lg"
            [fullWidth]="true"
            [loading]="guestLoading()"
            (onClick)="continueAsGuest()"
            iconLeft="explore"
            class="guest-access-btn"
            ariaLabel="Explore the app without creating an account"
          >
            Explore as Guest
          </app-button>

          <!-- More options - Only show for returning users -->
          @if (!isFirstTimeUser()) {
            <div class="more-options">
              <button 
                type="button" 
                class="expand-options-btn"
                (click)="toggleMoreOptions()"
                [attr.aria-expanded]="showMoreOptions()"
                aria-controls="additional-auth-options"
                aria-label="Show more sign-in options"
              >
                More sign-in options
                <span class="expand-icon" [class.expanded]="showMoreOptions()">▼</span>
              </button>
              
              <div 
                id="additional-auth-options"
                class="additional-options"
                [class.visible]="showMoreOptions()"
                [attr.aria-hidden]="!showMoreOptions()"
              >
                <button
                  type="button"
                  class="auth-option-btn"
                  (click)="navigateToLogin()"
                  [disabled]="loading()"
                  aria-label="Sign in with email address"
                >
                  📧 Sign in with Email
                </button>
                
                <button
                  type="button"
                  class="auth-option-btn existing-user-btn"
                  (click)="navigateToLogin()"
                  [disabled]="loading()"
                  aria-label="Sign in to existing account"
                >
                  👋 I have an account
                </button>
              </div>
            </div>
          }
        </div>

      </div>
    </div>
  `,
})
export class SplashComponent extends BaseComponent implements OnInit, OnDestroy {
  private readonly authStore = inject(AuthStore);
  private readonly themeStore = inject(ThemeStore);
  private readonly userStore = inject(UserStore);

  // Store original theme to restore on destroy
  private originalTheme: ThemeType | null = null;

  readonly guestLoading = signal(false);
  readonly googleLoading = signal(false);
  readonly showMoreOptions = signal(false);
  
  // Detect if this is a first-time user (no previous session)
  readonly isFirstTimeUser = computed(() => {
    // Check if there's any stored auth data or previous usage
    const hasStoredAuthData = localStorage.getItem('firebase:authUser:' + 'your-app-key') !== null;
    const hasVisitHistory = localStorage.getItem('spoons-last-visit') !== null;
    return !hasStoredAuthData && !hasVisitHistory;
  });

  override ngOnInit(): void {
    console.log('[SplashComponent] 🎬 Component initializing...');
    console.log('[SplashComponent] 🎬 Current auth state:', {
      isAuthenticated: this.authStore.isAuthenticated(),
      userId: this.authStore.user()?.uid?.slice(0, 8),
      isAnonymous: this.authStore.user()?.isAnonymous,
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

  async signInWithGoogle(): Promise<void> {
    console.log('[SplashComponent] 🚀 signInWithGoogle() called');
    this.googleLoading.set(true);

    try {
      await this.authStore.loginWithGoogle();
      
      // Check if user already has completed onboarding
      const user = this.authStore.user();
      console.log('[SplashComponent] 🔍 Google sign-in completed, checking user status');
      
      if (user?.uid) {
        try {
          // Check if user document exists in Firestore and has completed onboarding
          const existingUserDoc = await this.userStore.checkUserExists(user.uid);
          
          if (existingUserDoc && existingUserDoc.onboardingCompleted) {
            console.log('[SplashComponent] ✅ Existing user with completed onboarding, redirecting to home');
            await this.router.navigate(['/home']);
            return;
          }
        } catch (error) {
          console.log('[SplashComponent] 🆕 New user or error checking user status, proceeding to onboarding');
        }
      }
      
      // New user or incomplete onboarding - redirect to onboarding flow
      console.log('[SplashComponent] 📝 Redirecting to onboarding for setup');
      await this.router.navigate(['/onboarding']);
    } catch (error: any) {
      console.error('[SplashComponent] ❌ Google sign-in failed:', error);
      this.showError(error.message || 'Google sign-in failed');
    } finally {
      this.googleLoading.set(false);
    }
  }

  toggleMoreOptions(): void {
    this.showMoreOptions.update(current => !current);
  }

  async continueAsGuest(): Promise<void> {
    console.log('[SplashComponent] 👻 continueAsGuest() called');
    const startTime = Date.now();
    this.guestLoading.set(true);

    try {
      console.log('[SplashComponent] 👻 Starting guest authentication flow...');
      console.log('[SplashComponent] 👻 Auth state before guest creation:', {
        hasUser: !!this.authStore.user(),
        isAuthenticated: this.authStore.isAuthenticated(),
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
        isAnonymous: this.authStore.user()?.isAnonymous,
      });

      console.log('[SplashComponent] 👻 Navigating to location permission step...');
      const success = await this.router.navigate(['/location-permission']);
      console.log('[SplashComponent] 👻 Navigation to /location-permission result:', success);

      const totalTime = Date.now() - startTime;
      console.log('[SplashComponent] ✅ Complete guest flow took', totalTime, 'ms');
    } catch (error) {
      console.error('[SplashComponent] ❌ Guest login failed:', {
        error: error,
        message: error instanceof Error ? error.message : 'Unknown error',
        timeTaken: Date.now() - startTime + 'ms',
      });
      this.showError('Failed to continue as guest. Please try again.');
    } finally {
      this.guestLoading.set(false);
    }
  }
}
