import { Component, inject, signal, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '@shared/base/base.component';
import { RegistrationFlowService, RegistrationData, RegistrationStep } from './registration-flow.service';
import { LocationService } from './location.service';
import { AuthStore } from '@auth/data-access/auth.store';
import { UserStore } from '@users/data-access/user.store';

@Component({
  selector: 'app-registration-flow',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="registration-flow-container">
      <!-- Progress Indicator -->
      <div class="progress-section">
        <div class="progress-dots">
          @for (step of flowService.steps; track step; let i = $index) {
            <div 
              class="progress-dot" 
              [class.active]="i === flowService.currentStepIndex()"
              [class.completed]="i < flowService.currentStepIndex()"
            ></div>
          }
        </div>
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            [style.width.%]="flowService.progressPercentage()"
          ></div>
        </div>
        <div class="progress-text">
          Step {{ flowService.currentStepIndex() + 1 }} of {{ flowService.totalSteps }}
        </div>
      </div>

      <!-- Step Content -->
      <div class="step-content-container">
        @switch (flowService.currentStep()) {
          @case ('auth') {
            <div class="step-content">
              <div class="step-header">
                <h1 class="step-title">Choose Sign-in Method</h1>
                <p class="step-subtitle">How would you like to get started?</p>
              </div>

              <div class="auth-methods">
                <button 
                  type="button"
                  class="auth-method-button google-button"
                  [disabled]="loading()"
                  (click)="handleGoogleAuth()"
                >
                  <span class="button-icon">🔗</span>
                  <span class="button-text">Continue with Google</span>
                  <span class="button-description">Quick & secure</span>
                </button>

                <button 
                  type="button"
                  class="auth-method-button email-button"
                  [disabled]="loading()"
                  (click)="handleEmailAuth()"
                >
                  <span class="button-icon">✉️</span>
                  <span class="button-text">Continue with Email</span>
                  <span class="button-description">Create your own account</span>
                </button>

                <button 
                  type="button"
                  class="auth-method-button guest-button"
                  [disabled]="loading()"
                  (click)="handleGuestAuth()"
                >
                  <span class="button-icon">👤</span>
                  <span class="button-text">Continue as Guest</span>
                  <span class="button-description">No account needed</span>
                </button>
              </div>
            </div>
          }

          @case ('profile') {
            <div class="step-content">
              <div class="step-header">
                <h1 class="step-title">Set Up Your Profile</h1>
                <p class="step-subtitle">Tell us a bit about yourself</p>
              </div>

              <div class="profile-form">
                <div class="form-group">
                  <label for="username" class="form-label">Display Name</label>
                  <div class="username-input-group">
                    <input
                      id="username"
                      type="text"
                      class="form-input"
                      placeholder="Enter your display name"
                      [value]="flowService.registrationData().displayName || ''"
                      (input)="handleUsernameChange($event)"
                      [disabled]="loading() || flowService.isValidatingUsername()"
                      maxlength="30"
                    />
                    <button
                      type="button"
                      class="random-username-button"
                      (click)="generateRandomUsername()"
                      [disabled]="loading()"
                      title="Generate random username"
                    >
                      🎲
                    </button>
                  </div>
                  
                  @if (flowService.isValidatingUsername()) {
                    <div class="form-message form-message--loading">
                      Checking availability...
                    </div>
                  }
                  
                  @if (flowService.usernameValidationError()) {
                    <div class="form-message form-message--error">
                      {{ flowService.usernameValidationError() }}
                    </div>
                  }
                </div>

                <div class="form-group">
                  <label class="checkbox-label">
                    <input
                      type="checkbox"
                      class="checkbox-input"
                      [checked]="flowService.registrationData().isTestUser || false"
                      (change)="handleTestUserChange($event)"
                      [disabled]="loading()"
                    />
                    <span class="checkbox-text">
                      <strong>This is a test account</strong>
                      <small>Test accounts can be safely deleted during development</small>
                    </span>
                  </label>
                </div>

                <!-- Avatar selection placeholder -->
                <div class="form-group">
                  <label class="form-label">Avatar</label>
                  <div class="avatar-selection">
                    <div class="current-avatar">
                      {{ getAvatarEmoji() }}
                    </div>
                    <button
                      type="button"
                      class="change-avatar-button"
                      (click)="selectRandomAvatar()"
                      [disabled]="loading()"
                    >
                      Change Avatar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          }

          @case ('location') {
            <div class="step-content">
              <div class="step-header">
                <h1 class="step-title">Find Your Local Pub</h1>
                <p class="step-subtitle">We'll help you earn bonus points at your nearest pub</p>
              </div>

              <div class="location-content">
                @if (locationService.permissionStatus() === 'pending') {
                  <div class="location-prompt">
                    <div class="location-icon">📍</div>
                    <p class="location-description">
                      {{ locationService.getPermissionStatusMessage() }}
                    </p>
                    <button
                      type="button"
                      class="location-button"
                      (click)="requestLocation()"
                      [disabled]="loading() || locationService.isRequestingLocation()"
                    >
                      @if (locationService.isRequestingLocation()) {
                        Getting Location...
                      } @else {
                        Allow Location Access
                      }
                    </button>
                  </div>
                }

                @if (locationService.locationError()) {
                  <div class="location-error">
                    <div class="error-icon">⚠️</div>
                    <p class="error-message">{{ locationService.locationError()?.userFriendlyMessage }}</p>
                    <button
                      type="button"
                      class="retry-button"
                      (click)="requestLocation()"
                      [disabled]="loading()"
                    >
                      Try Again
                    </button>
                    <button
                      type="button"
                      class="skip-button"
                      (click)="skipLocationStep()"
                      [disabled]="loading()"
                    >
                      Skip for Now
                    </button>
                  </div>
                }

                @if (nearestPub()) {
                  <div class="nearest-pub">
                    <div class="pub-icon">🍺</div>
                    <div class="pub-info">
                      <h3 class="pub-name">{{ nearestPub()?.name }}</h3>
                      <p class="pub-description">This will be your home pub for bonus points</p>
                    </div>
                    <button
                      type="button"
                      class="confirm-pub-button"
                      (click)="confirmLocalPub()"
                      [disabled]="loading()"
                    >
                      Confirm
                    </button>
                  </div>
                }
              </div>
            </div>
          }

          @case ('complete') {
            <div class="step-content">
              <div class="step-header">
                <h1 class="step-title">Welcome to Spoonscount!</h1>
                <p class="step-subtitle">Your account is ready to go</p>
              </div>

              <div class="completion-content">
                <div class="completion-icon">🎉</div>
                
                <div class="completion-summary">
                  <h3>Account Summary</h3>
                  <div class="summary-item">
                    <span class="summary-label">Display Name:</span>
                    <span class="summary-value">{{ flowService.registrationData().displayName }}</span>
                  </div>
                  @if (flowService.registrationData().isTestUser) {
                    <div class="summary-item">
                      <span class="summary-label">Account Type:</span>
                      <span class="summary-value test-account">Test Account</span>
                    </div>
                  }
                  @if (nearestPub()) {
                    <div class="summary-item">
                      <span class="summary-label">Home Pub:</span>
                      <span class="summary-value">{{ nearestPub()?.name }}</span>
                    </div>
                  }
                </div>

                <button
                  type="button"
                  class="start-exploring-button"
                  (click)="finishRegistration()"
                  [disabled]="loading()"
                >
                  Start Exploring
                </button>
              </div>
            </div>
          }
        }
      </div>

      <!-- Navigation -->
      <div class="step-navigation">
        @if (flowService.canGoBack()) {
          <button
            type="button"
            class="nav-button nav-button--back"
            (click)="flowService.previousStep()"
            [disabled]="loading()"
          >
            ← Back
          </button>
        }

        @if (flowService.canGoNext() && flowService.currentStep() !== 'complete') {
          <button
            type="button"
            class="nav-button nav-button--next"
            (click)="flowService.nextStep()"
            [disabled]="loading() || !flowService.canGoNext()"
          >
            Next →
          </button>
        }
      </div>

      <!-- Error Display -->
      @if (error()) {
        <div class="error-banner">
          {{ error() }}
        </div>
      }
    </div>
  `,
  styleUrl: './registration-flow.component.scss'
})
export class RegistrationFlowComponent extends BaseComponent implements OnDestroy {
  readonly flowService = inject(RegistrationFlowService);
  readonly locationService = inject(LocationService);
  readonly authStore = inject(AuthStore);
  readonly userStore = inject(UserStore);

  readonly nearestPub = signal<any>(null);
  readonly availableAvatars = ['🐺', '🦊', '🐻', '🦁', '🐯', '🦅', '🦉', '🐺', '🐴', '🐰'];

  private usernameValidationTimeout: any;

  ngOnDestroy(): void {
    if (this.usernameValidationTimeout) {
      clearTimeout(this.usernameValidationTimeout);
    }
  }

  // Auth method handlers
  async handleGoogleAuth(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      this.flowService.updateData({ authMethod: 'google' });
      await this.authStore.loginWithGoogle();
      
      // Pre-populate display name from Google account
      const user = this.authStore.user();
      if (user?.displayName) {
        this.flowService.updateData({ displayName: user.displayName });
      }
      
      this.flowService.nextStep();
    } catch (error: any) {
      console.error('[RegistrationFlow] Google auth failed:', error);
      this.error.set(error.message || 'Google sign-in failed');
    } finally {
      this.loading.set(false);
    }
  }

  async handleEmailAuth(): Promise<void> {
    // For now, just mark as email method and move to profile step
    // We'll handle email/password collection in the profile step
    this.flowService.updateData({ authMethod: 'email' });
    this.flowService.nextStep();
  }

  async handleGuestAuth(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      this.flowService.updateData({ authMethod: 'guest' });
      await this.authStore.continueAsGuest();
      
      // Pre-populate with random name for guests
      const randomName = this.flowService.generateRandomUsername();
      this.flowService.updateData({ displayName: randomName });
      
      this.flowService.nextStep();
    } catch (error: any) {
      console.error('[RegistrationFlow] Guest auth failed:', error);
      this.error.set(error.message || 'Guest sign-in failed');
    } finally {
      this.loading.set(false);
    }
  }

  // Profile step handlers
  handleUsernameChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const username = target.value;
    
    this.flowService.updateData({ displayName: username });

    // Clear previous timeout
    if (this.usernameValidationTimeout) {
      clearTimeout(this.usernameValidationTimeout);
    }

    // Validate after user stops typing (500ms delay)
    if (username.trim()) {
      this.usernameValidationTimeout = setTimeout(() => {
        this.flowService.checkUsernameAvailability(username.trim());
      }, 500);
    }
  }

  generateRandomUsername(): void {
    const randomName = this.flowService.generateRandomUsername();
    this.flowService.updateData({ displayName: randomName });
    
    // Validate the random name
    this.flowService.checkUsernameAvailability(randomName);
  }

  handleTestUserChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.flowService.updateData({ isTestUser: target.checked });
  }

  getAvatarEmoji(): string {
    const currentAvatar = this.flowService.registrationData().avatar;
    return currentAvatar || this.availableAvatars[0];
  }

  selectRandomAvatar(): void {
    const randomAvatar = this.availableAvatars[Math.floor(Math.random() * this.availableAvatars.length)];
    this.flowService.updateData({ avatar: randomAvatar });
  }

  // Location step handlers
  async requestLocation(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const position = await this.locationService.requestLocationPermission();
      this.flowService.updateData({ location: position });
      
      // Find nearest pub
      const nearest = await this.locationService.findNearestPub(position);
      if (nearest) {
        this.nearestPub.set(nearest);
      } else {
        this.error.set('No nearby pubs found. You can still continue and choose a pub later.');
      }
    } catch (error: any) {
      console.error('[RegistrationFlow] Location request failed:', error);
      // Error is handled by LocationService, just log here
    } finally {
      this.loading.set(false);
    }
  }

  confirmLocalPub(): void {
    const pub = this.nearestPub();
    if (pub) {
      this.flowService.updateData({ 
        localPubId: pub.id,
        homePubId: pub.id 
      });
      this.flowService.nextStep();
    }
  }

  skipLocationStep(): void {
    // Allow user to skip location and continue without local pub
    this.flowService.updateData({ 
      localPubId: 'skip', // Special value to indicate user skipped
    });
    this.flowService.nextStep();
  }

  // Complete registration
  async finishRegistration(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const registrationData = this.flowService.registrationData();
      
      // Update user profile with registration data
      if (registrationData.displayName) {
        await this.userStore.updateProfile({
          displayName: registrationData.displayName,
          realUser: !registrationData.isTestUser, // Invert isTestUser to get realUser
          homePubId: registrationData.homePubId === 'skip' ? undefined : registrationData.homePubId,
          onboardingCompleted: true
        });
      }

      // Navigate to home
      await this.router.navigate(['/home']);
    } catch (error: any) {
      console.error('[RegistrationFlow] Failed to complete registration:', error);
      this.error.set('Failed to complete registration. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }
}