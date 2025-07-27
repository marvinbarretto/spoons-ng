import { Component, inject, signal, ChangeDetectionStrategy, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';

import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { BaseComponent } from '@shared/base/base.component';
import { StepperComponent, type StepConfig } from '@shared/ui/stepper/stepper.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { FormInputComponent } from '@shared/ui/form-input/form-input.component';
import { ToastService } from '@shared/data-access/toast.service';
import { AvatarSelectionWidgetComponent } from '@home/ui/profile-customisation-modal/widgets/avatar-selection-widget/avatar-selection-widget.component';
import { PubSelectionWidgetComponent } from '../../../widgets/pub-selection/pub-selection-widget.component';
import { RegistrationFlowService, RegistrationData, RegistrationStep } from './registration-flow.service';
import { LocationService } from './location.service';
import { AuthStore } from '@auth/data-access/auth.store';
import { UserStore } from '@users/data-access/user.store';
import { ThemeStore } from '@shared/data-access/theme.store';
import { AvatarService } from '@shared/data-access/avatar.service';
import type { ThemeType } from '@shared/utils/theme.tokens';

@Component({
  selector: 'app-registration-flow',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, StepperComponent, ButtonComponent, FormInputComponent, AvatarSelectionWidgetComponent, PubSelectionWidgetComponent],
  template: `
    <div class="registration-flow-container">
      <!-- Progress Indicator -->
      <app-stepper
        [steps]="stepperSteps"
        [currentStepIndex]="flowService.currentStepIndex()"
        [showProgressBar]="true"
        [showStepText]="true"
        size="md"
      />

      <!-- Step Content -->
      <div class="step-content-container">
        <!-- Debug: Current step -->
        <div style="position: fixed; top: 100px; right: 10px; background: rgba(0,0,0,0.8); color: white; padding: 10px; border-radius: 5px; z-index: 1000;">
          Current Step: {{ flowService.currentStep() }}
        </div>

        @switch (flowService.currentStep()) {
          @case ('auth') {
            <div class="step-content">
              <div class="step-header">
                <h1 class="step-title">Choose Sign-in Method</h1>
                <p class="step-subtitle">How would you like to get started?</p>
              </div>

              <div class="auth-methods">
                @if (!showEmailForm()) {
                  <app-button
                    variant="secondary"
                    size="lg"
                    [fullWidth]="true"
                    iconLeft="login"
                    [loading]="googleLoading()"
                    (onClick)="handleGoogleAuth()"
                  >
                    Continue with Google
                  </app-button>

                  <app-button
                    variant="secondary"
                    size="lg"
                    [fullWidth]="true"
                    iconLeft="email"
                    [loading]="emailLoading()"
                    (onClick)="handleEmailAuth()"
                  >
                    Continue with Email
                  </app-button>
                } @else {
                  <app-button
                    variant="secondary"
                    size="md"
                    [fullWidth]="true"
                    iconLeft="login"
                    [loading]="googleLoading()"
                    (onClick)="handleGoogleAuth()"
                    class="alternate-auth-button"
                  >
                    Continue with Google
                  </app-button>
                }
              </div>

              <!-- Inline Email Form -->
              @if (showEmailForm()) {
                <div class="email-form-container">
                  <form [formGroup]="emailForm" (ngSubmit)="handleEmailSubmit()" class="email-form">
                    <div class="form-group">
                      <label for="email">Email Address</label>
                      <input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        autocomplete="email"
                        formControlName="email"
                        class="form-input"
                        [class.has-error]="emailForm.controls.email.invalid && (emailForm.controls.email.dirty || emailForm.controls.email.touched)"
                      />
                      @if (emailForm.controls.email.invalid && (emailForm.controls.email.dirty || emailForm.controls.email.touched)) {
                        <div class="form-error">
                          @if (emailForm.controls.email.errors?.['required']) {
                            Email Address is required
                          }
                          @if (emailForm.controls.email.errors?.['email']) {
                            Please enter a valid email address
                          }
                        </div>
                      }
                    </div>

                    <div class="form-group">
                      <label for="password">Password</label>
                      <input
                        id="password"
                        type="password"
                        placeholder="Create a password"
                        autocomplete="new-password"
                        formControlName="password"
                        minlength="6"
                        class="form-input"
                        [class.has-error]="emailForm.controls.password.invalid && (emailForm.controls.password.dirty || emailForm.controls.password.touched)"
                      />
                      <div class="form-hint">Minimum 6 characters</div>
                      @if (emailForm.controls.password.invalid && (emailForm.controls.password.dirty || emailForm.controls.password.touched)) {
                        <div class="form-error">
                          @if (emailForm.controls.password.errors?.['required']) {
                            Password is required
                          }
                          @if (emailForm.controls.password.errors?.['minlength']) {
                            Minimum 6 characters required
                          }
                        </div>
                      }
                    </div>

                    <app-button
                      type="submit"
                      variant="primary"
                      size="lg"
                      [fullWidth]="true"
                      [loading]="emailSubmitLoading()"
                      class="email-submit-button"
                    >
                      Create Account
                    </app-button>
                  </form>
                </div>
              }
            </div>
          }

          @case ('profile') {
            <div class="step-content">
              <div class="step-header">
                <h1 class="step-title">Set Up Your Profile</h1>
              </div>

              <div class="profile-form">
                <!-- Avatar Preview -->
                <div class="avatar-preview">
                  <img
                    [src]="getSelectedAvatarUrl()"
                    [alt]="'Selected avatar'"
                    class="preview-avatar"
                  />
                </div>

                <div class="form-group">
                  <div class="username-input-wrapper">
                    <app-form-input
                      label="Display Name"
                      type="text"
                      placeholder="Enter your display name"
                      [formControl]="profileForm.controls.displayName"
                      [maxlength]="30"
                      [errorMessage]="flowService.usernameValidationError() || undefined"
                      class="username-input"
                    />
                    <button
                      type="button"
                      class="dice-button"
                      (click)="generateRandomUsername()"
                      [disabled]="loading()"
                      title="Generate random username"
                    >
                      🎲
                    </button>
                  </div>

                  <div class="form-message-container">
                    @if (flowService.isValidatingUsername()) {
                      <div class="form-message form-message--loading">
                        Checking availability...
                      </div>
                    }
                  </div>
                </div>


                <!-- Avatar Selection -->
                <div class="form-group">
                  <app-avatar-selection-widget
                    [selectedAvatarId]="selectedAvatarId()"
                    [showCurrentAvatar]="false"
                    (avatarSelected)="onAvatarSelected($event)"
                  />
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

                @if (nearestPub() && !showPubBrowser()) {
                  <div class="nearest-pub">
                    <div class="pub-icon">🍺</div>
                    <div class="pub-info">
                      <h3 class="pub-name">{{ nearestPub()?.name }}</h3>
                    </div>
                    <div class="pub-actions">
                      <app-button
                        variant="primary"
                        size="md"
                        (onClick)="confirmLocalPub()"
                        [disabled]="loading()"
                      >
                        Confirm
                      </app-button>
                      <app-button
                        variant="secondary"
                        size="md"
                        (onClick)="showPubBrowser.set(true)"
                        [disabled]="loading()"
                      >
                        This isn't my local
                      </app-button>
                    </div>
                  </div>
                }

                @if (showPubBrowser()) {
                  <div class="pub-browser">
                    <app-pub-selection-widget (pubSelected)="onPubSelected($event)" />
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

      <!-- Navigation (hidden on auth step) -->
      @if (flowService.currentStep() !== 'auth') {
        <div class="step-navigation">
          @if (flowService.canGoBack()) {
            <app-button
              variant="ghost"
              size="md"
              iconLeft="arrow_back"
              (onClick)="flowService.previousStep()"
              [disabled]="loading()"
            >
              Back
            </app-button>
          }

          @if (flowService.currentStep() !== 'complete') {
            <app-button
              variant="primary"
              size="md"
              iconRight="arrow_forward"
              (onClick)="flowService.nextStep()"
              [disabled]="loading() || !flowService.canGoNext()"
              class="next-button"
            >
              Next
            </app-button>
          }
        </div>
      }

    </div>
  `,
  styleUrl: './registration-flow.component.scss'
})
export class RegistrationFlowComponent extends BaseComponent implements OnInit, OnDestroy {
  readonly flowService = inject(RegistrationFlowService);
  readonly locationService = inject(LocationService);
  readonly authStore = inject(AuthStore);
  readonly userStore = inject(UserStore);
  readonly themeStore = inject(ThemeStore);
  readonly avatarService = inject(AvatarService);
  private readonly fb = inject(FormBuilder);

  constructor() {
    super();
    console.log('[RegistrationFlow] 🏗️ Component constructor called');

    // Track any navigation events safely
    this.platform.onlyOnBrowser(() => {
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;

      history.pushState = function(...args) {
        console.log('[RegistrationFlow] 🌐 History pushState detected:', args[2]);
        return originalPushState.apply(history, args);
      };

      history.replaceState = function(...args) {
        console.log('[RegistrationFlow] 🌐 History replaceState detected:', args[2]);
        return originalReplaceState.apply(history, args);
      };
    });
  }

  readonly nearestPub = signal<any>(null);
  readonly showPubBrowser = signal(false);

  // Avatar selection state
  readonly selectedAvatarId = signal('npc'); // Pre-select NPC avatar

  // Store original theme to restore on destroy
  private originalTheme: ThemeType | null = null;
  private usernameValidationTimeout: any;

  // Separate loading states for auth buttons
  readonly googleLoading = signal(false);
  readonly emailLoading = signal(false);
  readonly emailSubmitLoading = signal(false);

  // Email form visibility
  readonly showEmailForm = signal(true);

  // Reactive forms
  readonly profileForm = this.fb.group({
    displayName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(30)]]
  });

  readonly emailForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  // Stepper configuration
  readonly stepperSteps: StepConfig[] = [
    { id: 'auth', label: 'Authentication' },
    { id: 'profile', label: 'Profile Setup' },
    { id: 'location', label: 'Local Pub' },
    { id: 'complete', label: 'Complete' }
  ];

  override ngOnInit(): void {
    console.log('[RegistrationFlow] 🚀 ngOnInit called');

    // Store current theme and override with forest for better contrast on dark backgrounds
    this.originalTheme = this.themeStore.themeType();
    this.themeStore.setTheme('forest');
    console.log('[RegistrationFlow] 🎨 Theme set to forest');

    // Initialize form with existing data
    const registrationData = this.flowService.registrationData();
    if (registrationData.displayName) {
      this.profileForm.patchValue({
        displayName: registrationData.displayName
      });
    }

    // Subscribe to form changes
    this.profileForm.get('displayName')?.valueChanges.subscribe(displayName => {
      if (displayName) {
        this.handleUsernameChange(displayName);
      }
    });
  }

  ngOnDestroy(): void {
    console.log('[RegistrationFlow] 🏁 ngOnDestroy called');

    if (this.usernameValidationTimeout) {
      clearTimeout(this.usernameValidationTimeout);
    }
    // Restore original theme when leaving registration flow
    if (this.originalTheme) {
      console.log('[RegistrationFlow] 🎨 Restoring original theme:', this.originalTheme);
      this.themeStore.setTheme(this.originalTheme);
    }
  }

  // Auth method handlers
  async handleGoogleAuth(): Promise<void> {
    console.log('[RegistrationFlow] 🚀 handleGoogleAuth STARTED');
    this.googleLoading.set(true);

    try {
      console.log('[RegistrationFlow] 📝 Updating data with authMethod: google');
      this.flowService.updateData({ authMethod: 'google' });

      console.log('[RegistrationFlow] 🔐 Calling authStore.loginWithGoogle()...');
      await this.authStore.loginWithGoogle();
      console.log('[RegistrationFlow] ✅ authStore.loginWithGoogle() completed');

      // Check if user already exists and has completed onboarding
      const user = this.authStore.user();
      console.log('[RegistrationFlow] 👤 Got user after Google auth:', {
        hasUser: !!user,
        displayName: user?.displayName,
        uid: user?.uid?.slice(0, 8)
      });

      if (user?.uid) {
        console.log('[RegistrationFlow] 🔍 Checking if user already exists in Firestore...');
        try {
          // Check if user document exists in Firestore
          const existingUserDoc = await this.userStore.checkUserExists(user.uid);
          
          if (existingUserDoc && existingUserDoc.onboardingCompleted) {
            console.log('[RegistrationFlow] ✅ Existing user detected with completed onboarding');
            this.toastService.centerInfo('Welcome back! Redirecting to your dashboard...');
            
            // Wait a moment for the message to be seen, then redirect
            setTimeout(() => {
              this.router.navigate(['/home']);
            }, 1500);
            return;
          } else if (existingUserDoc && !existingUserDoc.onboardingCompleted) {
            console.log('[RegistrationFlow] 📝 Existing user detected but onboarding incomplete, continuing flow');
          } else {
            console.log('[RegistrationFlow] 🆕 New user detected, proceeding with registration');
          }
        } catch (docError) {
          console.log('[RegistrationFlow] 🆕 User document not found, proceeding with new user registration');
        }
      }

      // Pre-populate display name from Google account
      if (user?.displayName) {
        console.log('[RegistrationFlow] 📝 Updating data with displayName:', user.displayName);
        this.flowService.updateData({ displayName: user.displayName });
      }

      console.log('[RegistrationFlow] ➡️ Calling flowService.nextStep()...');
      console.log('[RegistrationFlow] Current step before nextStep:', this.flowService.currentStep());
      this.flowService.nextStep();
      console.log('[RegistrationFlow] Current step after nextStep:', this.flowService.currentStep());
      console.log('[RegistrationFlow] ✅ handleGoogleAuth COMPLETED');
    } catch (error: any) {
      console.error('[RegistrationFlow] ❌ Google auth failed:', error);
      this.toastService.centerError(error.message || 'Google sign-in failed');
    } finally {
      console.log('[RegistrationFlow] 🏁 Setting googleLoading to false');
      this.googleLoading.set(false);
    }
  }

  async handleEmailAuth(): Promise<void> {
    this.emailLoading.set(true);

    try {
      // Set email as the auth method (form is already visible)
      this.flowService.updateData({ authMethod: 'email' });
      // Focus on the email input for better UX
      // The form is already visible, so no need to toggle
    } finally {
      this.emailLoading.set(false);
    }
  }

  async handleEmailSubmit(): Promise<void> {
    console.log('[RegistrationFlow] handleEmailSubmit called');
    console.log('[RegistrationFlow] Email form value:', this.emailForm.value);
    console.log('[RegistrationFlow] Email form valid:', this.emailForm.valid);
    console.log('[RegistrationFlow] Email form errors:', this.emailForm.errors);

    this.emailSubmitLoading.set(true);

    // Disable form during submission
    this.emailForm.disable();

    // Trigger form validation by marking all fields as touched
    this.emailForm.markAllAsTouched();

    if (this.emailForm.invalid) {
      console.log('[RegistrationFlow] Form is invalid, stopping submission');
      console.log('[RegistrationFlow] Email control errors:', this.emailForm.controls.email.errors);
      console.log('[RegistrationFlow] Password control errors:', this.emailForm.controls.password.errors);
      this.emailSubmitLoading.set(false);
      this.emailForm.enable(); // Re-enable form on validation failure
      return;
    }

    const { email, password } = this.emailForm.value;
    console.log('[RegistrationFlow] Proceeding with registration:', { email, password: '***' });

    try {
      // Set email as auth method before registration
      this.flowService.updateData({ authMethod: 'email' });

      await this.authStore.registerWithEmail(email!.trim(), password!);

      // Pre-populate display name with email username
      const emailUsername = email!.split('@')[0];
      this.flowService.updateData({ displayName: emailUsername });

      console.log('[RegistrationFlow] Registration successful, proceeding to next step');
      console.log('[RegistrationFlow] Current step before:', this.flowService.currentStep());
      console.log('[RegistrationFlow] canGoNext:', this.flowService.canGoNext());
      this.flowService.nextStep();
      console.log('[RegistrationFlow] Current step after:', this.flowService.currentStep());
    } catch (error: any) {
      console.error('[RegistrationFlow] Email registration failed:', error);
      this.toastService.centerError(error.message || 'Email registration failed');
    } finally {
      this.emailSubmitLoading.set(false);
      this.emailForm.enable(); // Always re-enable form
    }
  }


  // Profile step handlers
  handleUsernameChange(username: string): void {
    this.flowService.updateData({ displayName: username });

    // Clear previous timeout
    if (this.usernameValidationTimeout) {
      clearTimeout(this.usernameValidationTimeout);
    }

    // Clear any existing validation error when user starts typing
    this.flowService.usernameValidationError.set(null);

    // Validate after user stops typing (500ms delay)
    if (username.trim()) {
      this.usernameValidationTimeout = setTimeout(() => {
        this.flowService.checkUsernameAvailability(username.trim());
      }, 500);
    }
  }

  generateRandomUsername(): void {
    const randomName = this.flowService.generateRandomUsername();

    // Update form without triggering valueChanges
    this.profileForm.patchValue({ displayName: randomName }, { emitEvent: false });
    this.flowService.updateData({ displayName: randomName });

    // Validate the random name
    this.flowService.checkUsernameAvailability(randomName);
  }

  // Avatar selection handler
  onAvatarSelected(avatarId: string): void {
    this.selectedAvatarId.set(avatarId);
    this.flowService.updateData({ avatar: avatarId });
  }

  // Get selected avatar URL for preview
  getSelectedAvatarUrl(): string {
    const user = this.authStore.user();
    const avatars = this.avatarService.generateAvatarOptions(user?.uid || 'default');
    const selectedAvatar = avatars.find(a => a.id === this.selectedAvatarId());
    return selectedAvatar?.url || this.avatarService.generateSingleAvatar('npc');
  }

  // Location step handlers
  async requestLocation(): Promise<void> {
    this.loading.set(true);

    try {
      const position = await this.locationService.requestLocationPermission();
      this.flowService.updateData({ location: position });

      // Find nearest pub
      const nearest = await this.locationService.findNearestPub(position);
      if (nearest) {
        this.nearestPub.set(nearest);
      } else {
        // No nearest pub found - show browser immediately
        this.showPubBrowser.set(true);
        this.toastService.centerInfo('Browse nearby pubs to choose your local');
      }
    } catch (error: any) {
      console.error('[RegistrationFlow] Location request failed:', error);
      // Show pub browser as fallback when location fails
      this.showPubBrowser.set(true);
      this.toastService.centerInfo('Browse pubs to choose your local, or skip this step');
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

  onPubSelected(pub: any): void {
    this.nearestPub.set(pub);
    this.flowService.updateData({
      localPubId: pub.id,
      homePubId: pub.id
    });
    this.showPubBrowser.set(false);
    console.log('[RegistrationFlow] Pub selected from widget:', pub.name);
  }

  // Navigation helpers
  handleNextStep(): void {
    const currentStep = this.flowService.currentStep();

    if (currentStep === 'auth' && this.showEmailForm()) {
      // Handle email form submission
      this.handleEmailSubmit();
    } else {
      // Normal step advancement
      this.flowService.nextStep();
    }
  }

  canProceed(): boolean {
    const currentStep = this.flowService.currentStep();

    if (currentStep === 'auth' && this.showEmailForm()) {
      // For auth step with email form, check if form is valid
      return this.emailForm.valid;
    }

    // For other steps, use the service's canGoNext logic
    return this.flowService.canGoNext();
  }

  // Complete registration
  async finishRegistration(): Promise<void> {
    this.loading.set(true);

    try {
      const registrationData = this.flowService.registrationData();
      const user = this.authStore.user();

      if (!user) {
        throw new Error('No authenticated user found');
      }

      // Get avatar URL from selected avatar
      const avatars = this.avatarService.generateAvatarOptions(user.uid);
      const selectedAvatar = avatars.find(a => a.id === this.selectedAvatarId());
      const avatarUrl = selectedAvatar?.url || this.avatarService.generateSingleAvatar('npc');

      // Create complete user document with all registration data
      const completeUserData = {
        uid: user.uid,
        email: user.email,
        photoURL: avatarUrl,
        emailVerified: user.emailVerified,
        isAnonymous: user.isAnonymous,
        streaks: {},
        displayName: registrationData.displayName || user.displayName || (user.email?.split('@')[0]) || 'User',
        joinedAt: new Date().toISOString(),
        badgeCount: 0,
        badgeIds: [],
        landlordCount: 0,
        landlordPubIds: [],
        joinedMissionIds: [],
        manuallyAddedPubIds: [],
        verifiedPubCount: 0,
        unverifiedPubCount: 0,
        totalPubCount: 0,
        homePubId: registrationData.homePubId === 'skip' ? undefined : registrationData.homePubId,
        onboardingCompleted: true
      };

      // Create user document using userService (which extends FirestoreService)
      await this.userStore.createCompleteUserDocument(user.uid, completeUserData);

      // Navigate to home
      await this.router.navigate(['/home']);
    } catch (error: any) {
      console.error('[RegistrationFlow] Failed to complete registration:', error);
      this.toastService.centerError('Failed to complete registration. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
