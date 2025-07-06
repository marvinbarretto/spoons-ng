// src/app/onboarding/feature/onboarding/onboarding.component.ts
import { Component, computed, inject, signal, ChangeDetectionStrategy, effect } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BaseComponent } from '@shared/base/base.component';
import { AuthStore } from '@auth/data-access/auth.store';
import { UserStore } from '@users/data-access/user.store';
import { DataAggregatorService } from '../../../shared/data-access/data-aggregator.service';
import { AvatarService } from '../../../shared/data-access/avatar.service';
import { NotificationService } from '../../../shared/data-access/notification.service';
import { ThemeStore } from '../../../shared/data-access/theme.store';
import { LocationService } from '../../../shared/data-access/location.service';
import { generateRandomName } from '../../../shared/utils/anonymous-names';
import type { Pub } from '../../../pubs/utils/pub.models';

// Step components
import { WelcomeMessageStepComponent } from '../../ui/steps/welcome-message-step.component';
import { CustomizeProfileStepComponent } from '../../ui/steps/customize-profile-step.component';
import { ChooseLocalStepComponent } from '../../ui/steps/choose-local-step.component';

type OnboardingStep =
  | 'welcome-message'       // "You gotta catch them all" welcome
  | 'customize-profile'     // Avatar + display name + Google auth option
  | 'choose-local';         // Combined home pub selection + location permission

@Component({
  selector: 'app-onboarding',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    // Step components
    WelcomeMessageStepComponent,
    CustomizeProfileStepComponent,
    ChooseLocalStepComponent,
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
          @case ('welcome-message') {
            <app-welcome-message-step
              [loading]="saving()"
              (continue)="proceedToCustomizeProfile()"
            />
          }

          @case ('customize-profile') {
            <app-customize-profile-step
              [user]="user()"
              [selectedAvatarId]="selectedAvatarId()"
              [displayName]="displayName()"
              [loading]="saving()"
              (avatarSelected)="onAvatarSelected($event)"
              (nameChanged)="onDisplayNameChange($event)"
              (generateRandom)="generateRandomDisplayName()"
              (googleLogin)="handleGoogleLogin()"
              (back)="goBackToPreviousStep()"
              (continue)="proceedToChooseLocal()"
            />
          }

          @case ('choose-local') {
            <app-choose-local-step
              [selectedPub]="selectedHomePub()"
              [locationGranted]="locationGranted()"
              [locationRequired]="locationRequired()"
              [hasExistingLocationPermission]="hasExistingLocationPermission()"
              [loading]="saving()"
              (pubSelected)="onHomePubSelected($event)"
              (locationRequested)="requestLocationPermission()"
              (back)="goBackToPreviousStep()"
              (complete)="completeOnboarding()"
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
      position: relative;
      overflow: hidden;
      
      /* TODO: Look at carpet pattern designs more closely - using actual carpet images for now */
      /* Carpet background with dark overlay */
      background-image: 
        linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.8)),
        url('/assets/carpets/moon-under-water-watford.jpg');
      background-size: cover;
      background-position: center;
      background-attachment: fixed;
      
      color: var(--text-on-dark, white);
    }

    .progress-bar {
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.2);
      position: relative;
      z-index: 10;
    }

    .progress-fill {
      height: 100%;
      background: var(--success, #4ade80);
      transition: width 0.3s ease;
    }

    .step-content {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      position: relative;
      overflow: hidden;
    }

    /* Step transition animations */
    .step-content > * {
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
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
      margin-top: 1.5rem;
    }

    .step-actions app-button {
      min-width: 120px;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .step-content {
        padding: 1rem;
      }
      
      .step-actions {
        flex-direction: column;
        width: 100%;
        max-width: 300px;
        margin: 1.5rem auto 0;
      }
      
      .step-actions app-button {
        width: 100%;
      }
    }
  `
})
export class OnboardingComponent extends BaseComponent {
  private readonly authStore = inject(AuthStore);
  private readonly userStore = inject(UserStore);
  private readonly dataAggregator = inject(DataAggregatorService);
  private readonly avatarService = inject(AvatarService);
  private readonly notificationService = inject(NotificationService);
  private readonly themeStore = inject(ThemeStore);
  private readonly locationService = inject(LocationService);

  // Component state
  readonly currentStep = signal<OnboardingStep>('welcome-message');
  readonly displayName = signal('');
  readonly selectedAvatarId = signal('');
  readonly selectedHomePubId = signal<string | null>(null);
  readonly selectedHomePub = signal<Pub | null>(null);
  readonly saving = signal(false);
  readonly realUser = signal(true);

  // Permission states
  readonly locationGranted = signal(false);
  readonly locationRequired = signal(false);
  
  // Check if we already have location permission
  readonly hasExistingLocationPermission = computed(() => {
    return this.locationService.location() !== null;
  });

  // Reactive data - Use DataAggregator for complete user state
  // CRITICAL: DataAggregator.user() includes onboardingCompleted from UserStore
  // AuthStore.user() alone lacks this field, causing infinite redirect loops
  readonly user = this.dataAggregator.user;

  // Carpet backgrounds - cycling through different images per step
  private readonly carpetImages = [
    'bangor.jpg',
    'john-jaques.jpg',
    'moon-under-water-watford.jpg',
    'red-lion.jpg'
  ];
  
  // Track current carpet background
  readonly currentCarpetBackground = signal<string>('');

  // Computed properties
  readonly progressPercentage = computed(() => {
    const steps: OnboardingStep[] = ['welcome-message', 'customize-profile', 'choose-local'];
    const currentIndex = steps.indexOf(this.currentStep());
    return Math.max(0, (currentIndex / (steps.length - 1)) * 100);
  });

  // Effect to update carpet background when step changes
  private readonly stepBackgroundEffect = effect(() => {
    const currentStep = this.currentStep();
    this.updateCarpetBackground(currentStep);
  });

  override async onInit() {
    console.log('[Onboarding] Component initialized with step:', this.currentStep());

    // Initial carpet background will be set by the effect
    
    // Pre-populate display name if user already has one, otherwise generate random name
    const user = this.user();
    if (user?.displayName) {
      this.displayName.set(user.displayName);
      console.log('[Onboarding] Pre-populated display name:', user.displayName);
    } else if (user?.uid) {
      // Generate random name for new users
      const randomName = generateRandomName(user.uid);
      this.displayName.set(randomName);
      console.log('[Onboarding] Generated random display name:', randomName);
    }

    // Auto-preselect NPC avatar
    this.selectedAvatarId.set('npc');
    console.log('[Onboarding] Pre-selected NPC avatar');
  }

  private updateCarpetBackground(step: OnboardingStep): void {
    const stepIndex = this.stepOrder.indexOf(step);
    if (stepIndex === -1) return;

    // Use different carpet for each step, cycling through available images
    const carpetIndex = stepIndex % this.carpetImages.length;
    const selectedCarpet = this.carpetImages[carpetIndex];
    
    // Skip if already using this carpet
    if (this.currentCarpetBackground() === selectedCarpet) return;

    const container = document.querySelector('.onboarding-container') as HTMLElement;
    if (container) {
      container.style.backgroundImage = `
        linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.8)),
        url('/assets/carpets/${selectedCarpet}')
      `;
      this.currentCarpetBackground.set(selectedCarpet);
      console.log('[Onboarding] Updated carpet background for step', step, ':', selectedCarpet);
    }
  }

  // Step navigation with readable method names
  private readonly stepOrder: OnboardingStep[] = ['welcome-message', 'customize-profile', 'choose-local'];

  proceedToNextStep(): void {
    const current = this.currentStep();
    const currentIndex = this.stepOrder.indexOf(current);

    if (currentIndex < this.stepOrder.length - 1) {
      const nextStep = this.stepOrder[currentIndex + 1];
      console.log('[Onboarding] Navigating from', current, 'to', nextStep);
      this.currentStep.set(nextStep);
    }
  }

  goBackToPreviousStep(): void {
    const current = this.currentStep();
    const currentIndex = this.stepOrder.indexOf(current);

    if (currentIndex > 0) {
      const prevStep = this.stepOrder[currentIndex - 1];
      console.log('[Onboarding] Navigating back from', current, 'to', prevStep);
      this.currentStep.set(prevStep);
    }
  }

  // Specific navigation methods for clarity
  async proceedToCustomizeProfile(): Promise<void> { 
    console.log('[Onboarding] Proceeding to customize profile');
    this.saving.set(true);
    
    try {
      // Brief delay for user feedback
      await new Promise(resolve => setTimeout(resolve, 300));
      this.currentStep.set('customize-profile'); 
    } finally {
      this.saving.set(false);
    }
  }
  
  async proceedToChooseLocal(): Promise<void> { 
    console.log('[Onboarding] Proceeding to choose local pub');
    this.saving.set(true);
    
    try {
      // Brief delay for user feedback
      await new Promise(resolve => setTimeout(resolve, 300));
      this.currentStep.set('choose-local'); 
    } finally {
      this.saving.set(false);
    }
  }

  // Permission handling methods

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

      // Don't navigate automatically - let the choose-local step handle it

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
    this.selectedHomePub.set(pub);
    console.log('[Onboarding] Home pub selected:', pub?.name || 'none');
  }

  // New methods for updated flow
  async handleGoogleLogin(): Promise<void> {
    console.log('[Onboarding] 🚀 Google login requested');
    try {
      await this.authStore.loginWithGoogle();
      console.log('[Onboarding] Google login successful');
      // The auth state change will handle navigation
    } catch (error) {
      console.error('[Onboarding] Google login failed:', error);
      this.showError('Google login failed. Please try again.');
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
        onboardingCompleted: true,
        realUser: this.realUser()
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
