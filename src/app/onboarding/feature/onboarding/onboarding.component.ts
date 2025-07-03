// src/app/onboarding/feature/onboarding/onboarding.component.ts
import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BaseComponent } from '@shared/base/base.component';
import { AuthStore } from '@auth/data-access/auth.store';
import { UserStore } from '@users/data-access/user.store';
import { DataAggregatorService } from '../../../shared/data-access/data-aggregator.service';
import { AvatarService } from '../../../shared/data-access/avatar.service';
import { NotificationService } from '../../../shared/data-access/notification.service';
import { LocationService } from '../../../shared/data-access/location.service';
import { ThemeStore } from '../../../shared/data-access/theme.store';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { HomePubSelectionWidgetComponent } from '../../ui/home-pub-selection-widget/home-pub-selection-widget.component';
import { generateRandomName } from '../../../shared/utils/anonymous-names';
import type { Pub } from '../../../pubs/utils/pub.models';

// Step components
import { AskNotificationsStepComponent } from '../../ui/steps/ask-notifications-step.component';
import { AskLocationStepComponent } from '../../ui/steps/ask-location-step.component';
import { WelcomeMessageStepComponent } from '../../ui/steps/welcome-message-step.component';
import { AuthChoiceStepComponent } from '../../ui/steps/auth-choice-step.component';
import { CustomizeProfileStepComponent } from '../../ui/steps/customize-profile-step.component';
import { ReadyToStartStepComponent } from '../../ui/steps/ready-to-start-step.component';

type OnboardingStep =
  | 'ask-notifications'     // Request notification permissions (optional)
  | 'ask-location'          // Request location permissions (REQUIRED)
  | 'welcome-message'       // "You gotta catch them all" welcome
  | 'auth-choice'           // Google login OR Custom profile choice
  | 'customize-profile'     // Avatar + display name (only if custom chosen)
  | 'choose-home-pub'       // Home pub selection
  | 'ready-to-start';       // Final step with real user checkbox

@Component({
  selector: 'app-onboarding',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ButtonComponent,
    HomePubSelectionWidgetComponent,
    // Step components
    AskNotificationsStepComponent,
    AskLocationStepComponent,
    WelcomeMessageStepComponent,
    AuthChoiceStepComponent,
    CustomizeProfileStepComponent,
    ReadyToStartStepComponent,
  ],
  template: `
    <div class="onboarding-container">
      <!-- Progress bar -->
      <div class="progress-bar">
        <div class="progress-fill" [style.width.%]="progressPercentage()"></div>
      </div>

      <!-- Step content using step components -->
      <div class="step-content">
        @switch (currentStep()) {
          @case ('ask-notifications') {
            <app-ask-notifications-step
              (enableNotifications)="requestNotificationPermission()"
              (skipNotifications)="skipNotifications()"
            />
          }

          @case ('ask-location') {
            <app-ask-location-step
              [isRequesting]="locationRequired()"
              (enableLocation)="requestLocationPermission()"
            />
          }

          @case ('welcome-message') {
            <app-welcome-message-step
              (continue)="proceedToAuthChoice()"
            />
          }

          @case ('auth-choice') {
            <app-auth-choice-step
              (googleLogin)="handleGoogleLogin()"
              (customProfile)="proceedToCustomizeProfile()"
            />
          }

          @case ('customize-profile') {
            <app-customize-profile-step
              [user]="user()"
              [selectedAvatarId]="selectedAvatarId()"
              [displayName]="displayName()"
              (avatarSelected)="onAvatarSelected($event)"
              (nameChanged)="onDisplayNameChange($event)"
              (generateRandom)="generateRandomDisplayName()"
              (back)="goBackToPreviousStep()"
              (continue)="proceedToHomePubSelection()"
            />
          }

          @case ('choose-home-pub') {
            <div class="step">
              <h2>Choose Your Home Pub</h2>
              <p>Your home pub gives you bonus points when you check in!</p>
              <app-home-pub-selection-widget
                (pubSelected)="onHomePubSelected($event)"
              />
              <div class="step-actions">
                <app-button variant="secondary" (onClick)="goBackToPreviousStep()">Back</app-button>
                <app-button (onClick)="proceedToReadyToStart()">Continue</app-button>
              </div>
            </div>
          }

          @case ('ready-to-start') {
            <app-ready-to-start-step
              [displayName]="displayName()"
              [hasHomePub]="!!selectedHomePubId()"
              [notificationsEnabled]="notificationsGranted()"
              [locationEnabled]="locationGranted()"
              [isSaving]="saving()"
              (startExploring)="completeOnboardingWithRealUser($event)"
            />
          }
        }
      </div>
    </div>
  `,
  styles: `
    .onboarding-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .progress-bar {
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.2);
    }

    .progress-fill {
      height: 100%;
      background: #4ade80;
      transition: width 0.3s ease;
    }

    .step-content {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }

    .step {
      max-width: 600px;
      width: 100%;
      text-align: center;
    }

    .step-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-top: 2rem;
    }

    .step-actions app-button {
      min-width: 120px;
    }
  `
})
export class OnboardingComponent extends BaseComponent {
  private readonly authStore = inject(AuthStore);
  private readonly userStore = inject(UserStore);
  private readonly dataAggregator = inject(DataAggregatorService);
  private readonly avatarService = inject(AvatarService);
  private readonly notificationService = inject(NotificationService);
  private readonly locationService = inject(LocationService);
  private readonly themeStore = inject(ThemeStore);

  // Component state
  readonly currentStep = signal<OnboardingStep>('ask-notifications');
  readonly displayName = signal('');
  readonly selectedAvatarId = signal('');
  readonly selectedHomePubId = signal<string | null>(null);
  readonly saving = signal(false);

  // Permission states
  readonly notificationsGranted = signal(false);
  readonly locationGranted = signal(false);
  readonly locationRequired = signal(false);

  // Reactive data - Use DataAggregator for complete user state
  // CRITICAL: DataAggregator.user() includes onboardingCompleted from UserStore
  // AuthStore.user() alone lacks this field, causing infinite redirect loops
  readonly user = this.dataAggregator.user;

  // Computed properties
  readonly progressPercentage = computed(() => {
    const steps: OnboardingStep[] = [
      'ask-notifications', 'ask-location', 'welcome-message',
      'auth-choice', 'customize-profile', 'choose-home-pub', 'ready-to-start'
    ];
    const currentIndex = steps.indexOf(this.currentStep());
    return Math.max(0, (currentIndex / (steps.length - 1)) * 100);
  });

  override async onInit() {
    console.log('[Onboarding] Component initialized');

    // Pre-populate display name if user already has one
    const user = this.user();
    if (user?.displayName) {
      this.displayName.set(user.displayName);
    }
  }

  // Step navigation with readable method names
  private readonly stepOrder: OnboardingStep[] = [
    'ask-notifications', 'ask-location', 'welcome-message',
    'auth-choice', 'customize-profile', 'choose-home-pub', 'ready-to-start'
  ];

  proceedToNextStep(): void {
    const current = this.currentStep();
    const currentIndex = this.stepOrder.indexOf(current);

    if (currentIndex < this.stepOrder.length - 1) {
      this.currentStep.set(this.stepOrder[currentIndex + 1]);
    }
  }

  goBackToPreviousStep(): void {
    const current = this.currentStep();
    const currentIndex = this.stepOrder.indexOf(current);

    if (currentIndex > 0) {
      this.currentStep.set(this.stepOrder[currentIndex - 1]);
    }
  }

  // Specific navigation methods for clarity
  proceedToLocationRequest(): void { this.currentStep.set('ask-location'); }
  proceedToWelcome(): void { this.currentStep.set('welcome-message'); }
  proceedToAuthChoice(): void { this.currentStep.set('auth-choice'); }
  proceedToCustomizeProfile(): void { this.currentStep.set('customize-profile'); }
  proceedToHomePubSelection(): void { this.currentStep.set('choose-home-pub'); }
  proceedToReadyToStart(): void { this.currentStep.set('ready-to-start'); }

  // Permission handling methods
  async requestNotificationPermission(): Promise<void> {
    try {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        this.notificationsGranted.set(permission === 'granted');
      }
      this.proceedToLocationRequest();
    } catch (error) {
      console.error('[Onboarding] Notification permission error:', error);
      this.proceedToLocationRequest(); // Continue anyway
    }
  }

  async requestLocationPermission(): Promise<void> {
    console.log('[Onboarding] 📍 Starting location permission request...');
    this.locationRequired.set(true);

    try {
      // Check if geolocation is supported
      if (!('geolocation' in navigator)) {
        throw new Error('Geolocation not supported by this browser');
      }

      // Request location with proper options and timeout
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('[Onboarding] ✅ Location permission granted and position acquired');
            resolve(position);
          },
          (error) => {
            console.error('[Onboarding] ❌ Location error:', {
              code: error.code,
              message: error.message
            });
            reject(error);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,  // 10 second timeout
            maximumAge: 30000  // Accept cached position up to 30 seconds old
          }
        );
      });

      // Success: store the location and proceed
      this.locationGranted.set(true);
      this.locationRequired.set(false);

      // Optional: Store the actual coordinates for later use
      console.log('[Onboarding] 📍 Position acquired:', {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
      });

      this.proceedToWelcome();

    } catch (error: any) {
      this.locationRequired.set(false);
      console.error('[Onboarding] ❌ Location permission failed:', error);

      // Provide specific error messages and recovery options
      this.handleLocationError(error);
    }
  }

  private handleLocationError(error: GeolocationPositionError): void {
    let errorMessage = '';
    let showRetryOption = false;

    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location access was denied. To use this app, please:\n\n' +
                      '1. Enable location permissions in your browser\n' +
                      '2. Refresh the page and try again\n\n' +
                      'Or tap "Continue Without Location" to proceed with limited functionality.';
        showRetryOption = false;
        break;

      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location information is unavailable. Please check your device settings and try again.';
        showRetryOption = true;
        break;

      case error.TIMEOUT:
        errorMessage = 'Location request timed out. Please try again.';
        showRetryOption = true;
        break;

      default:
        errorMessage = 'Failed to get your location. Please try again.';
        showRetryOption = true;
        break;
    }

    this.showError(errorMessage);

    // Optional: Add retry functionality or skip option
    if (showRetryOption) {
      // You could add a retry button or auto-retry logic here
      console.log('[Onboarding] 🔄 Location error allows retry');
    }
  }

  // Optional: Add a method to skip location if needed
  skipLocationPermission(): void {
    console.log('[Onboarding] ⏭️ Skipping location permission');
    this.locationGranted.set(false);
    this.locationRequired.set(false);
    this.proceedToWelcome();
  }

  skipNotifications(): void {
    this.notificationsGranted.set(false);
    this.proceedToLocationRequest();
  }

  // Random name generation
  generateRandomDisplayName(): void {
    const user = this.user();
    if (user?.uid) {
      const randomName = generateRandomName(user.uid);
      this.displayName.set(randomName);
    }
  }

  // Event handlers
  onDisplayNameChange(newName: string): void {
    this.displayName.set(newName);
  }

  onAvatarSelected(avatarId: string): void {
    this.selectedAvatarId.set(avatarId);
  }

  onHomePubSelected(pub: Pub | null): void {
    this.selectedHomePubId.set(pub?.id || null);
    console.log('[Onboarding] Home pub selected:', pub);
  }

  // New methods for updated flow
  async handleGoogleLogin(): Promise<void> {
    console.log('[Onboarding] 🚀 Google login requested');
    // TODO: Implement Google Firebase auth
    console.log('[Onboarding] TODO: Implement Google login with Firebase Auth');
    
    // For now, just proceed to home pub selection (skip profile customization)
    this.proceedToHomePubSelection();
  }

  // New method to handle completion with realUser flag
  async completeOnboardingWithRealUser(data: { realUser: boolean }): Promise<void> {
    if (this.saving()) return;

    this.saving.set(true);

    try {
      const user = this.user();
      if (!user) {
        throw new Error('No user found');
      }

      console.log('[Onboarding] 🚀 Completing onboarding with data:', {
        displayName: this.displayName(),
        avatarId: this.selectedAvatarId(),
        homePubId: this.selectedHomePubId(),
        realUser: data.realUser,
        userId: user.uid
      });

      // Save all onboarding data to user profile including realUser flag
      const updateData = {
        displayName: this.displayName(),
        photoURL: this.getAvatarUrlById(this.selectedAvatarId()),
        homePubId: this.selectedHomePubId() || undefined,
        onboardingCompleted: true,
        realUser: data.realUser
      };

      console.log('[Onboarding] 📝 Updating user profile with:', updateData);
      await this.userStore.updateProfile(updateData);

      console.log('[Onboarding] ✅ User profile updated successfully');

      // Verify the update took effect
      const updatedUser = this.user();
      console.log('[Onboarding] 🔍 User after update:', {
        userId: updatedUser?.uid?.slice(0, 8),
        onboardingCompleted: updatedUser?.onboardingCompleted,
        displayName: updatedUser?.displayName,
        realUser: updatedUser?.realUser
      });

      console.log('[Onboarding] 🧭 Navigating to home page...');
      
      // Navigate to home
      await this.router.navigate(['/']);
      console.log('[Onboarding] ✅ Navigation to home completed');

    } catch (error: any) {
      console.error('[Onboarding] ❌ Failed to complete onboarding:', error);
      this.showError('Failed to save your preferences. Please try again.');
    } finally {
      this.saving.set(false);
    }
  }

  // Complete onboarding
  async completeOnboarding(): Promise<void> {
    if (this.saving()) return;

    this.saving.set(true);

    try {
      const user = this.user();
      if (!user) {
        throw new Error('No user found');
      }

      console.log('[Onboarding] 🚀 Completing onboarding with data:', {
        displayName: this.displayName(),
        avatarId: this.selectedAvatarId(),
        homePubId: this.selectedHomePubId(),
        userId: user.uid
      });

      // Save all onboarding data to user profile
      const updateData = {
        displayName: this.displayName(),
        photoURL: this.getAvatarUrlById(this.selectedAvatarId()),
        homePubId: this.selectedHomePubId() || undefined,
        onboardingCompleted: true
      };

      console.log('[Onboarding] 📝 Updating user profile with:', updateData);
      await this.userStore.updateProfile(updateData);

      console.log('[Onboarding] ✅ User profile updated successfully');

      // Verify the update took effect
      const updatedUser = this.user();
      console.log('[Onboarding] 🔍 User after update:', {
        userId: updatedUser?.uid?.slice(0, 8),
        onboardingCompleted: updatedUser?.onboardingCompleted,
        displayName: updatedUser?.displayName
      });

      console.log('[Onboarding] 🧭 Navigating to home page...');
      
      // TODO: Show success overlay instead of redirect
      console.log('[Onboarding] TODO: Show success overlay instead of redirect');
      
      // Navigate to home
      await this.router.navigate(['/']);
      console.log('[Onboarding] ✅ Navigation to home completed');

    } catch (error: any) {
      console.error('[Onboarding] ❌ Failed to complete onboarding:', error);
      this.showError('Failed to save your preferences. Please try again.');
    } finally {
      this.saving.set(false);
    }
  }

  // Utility methods
  private getAvatarUrlById(avatarId: string): string {
    if (!avatarId) return '/assets/avatars/npc.webp';

    const user = this.user();
    if (!user) return '/assets/avatars/npc.webp';

    // Generate avatar options for this user and find the selected one
    const avatarOptions = this.avatarService.generateAvatarOptions(user.uid);
    const selectedOption = avatarOptions.find(option => option.id === avatarId);

    return selectedOption?.url || '/assets/avatars/npc.webp';
  }
}
