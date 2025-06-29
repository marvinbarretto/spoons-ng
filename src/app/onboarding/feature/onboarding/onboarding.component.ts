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
import { ChooseYourLookStepComponent } from '../../ui/steps/choose-your-look-step.component';
import { ChooseYourNameStepComponent } from '../../ui/steps/choose-your-name-step.component';
import { ReadyToStartStepComponent } from '../../ui/steps/ready-to-start-step.component';

type OnboardingStep = 
  | 'ask-notifications'     // Request notification permissions
  | 'ask-location'          // Request location permissions (REQUIRED)
  | 'welcome-message'       // "You gotta catch them all" welcome
  | 'choose-your-look'      // Avatar + background color selection
  | 'choose-your-name'      // Display name with random generator option
  | 'choose-home-pub'       // Home pub selection
  | 'ready-to-start';       // Final confirmation screen

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
    ChooseYourLookStepComponent,
    ChooseYourNameStepComponent,
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
              (continue)="proceedToLookCustomization()"
            />
          }
          
          @case ('choose-your-look') {
            <app-choose-your-look-step
              [user]="user()"
              [selectedAvatarId]="selectedAvatarId()"
              (avatarSelected)="onAvatarSelected($event)"
              (back)="goBackToPreviousStep()"
              (continue)="proceedToNameSelection()"
            />
          }
          
          @case ('choose-your-name') {
            <app-choose-your-name-step
              [displayName]="displayName()"
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
              <!-- TODO: Extract this to a step component -->
              <app-home-pub-selection-widget
                (pubSelected)="onHomePubSelected($event)"
              />
              <div>
                <app-button (onClick)="goBackToPreviousStep()">Back</app-button>
                <app-button (onClick)="proceedToFinalConfirmation()">
                  {{ selectedHomePubId() ? 'Continue' : 'Skip for Now' }}
                </app-button>
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
              (startExploring)="completeOnboarding()"
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
      'choose-your-look', 'choose-your-name', 'choose-home-pub', 'ready-to-start'
    ];
    const currentIndex = steps.indexOf(this.currentStep());
    return (currentIndex / (steps.length - 1)) * 100;
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
    'choose-your-look', 'choose-your-name', 'choose-home-pub', 'ready-to-start'
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
  proceedToLookCustomization(): void { this.currentStep.set('choose-your-look'); }
  proceedToNameSelection(): void { this.currentStep.set('choose-your-name'); }
  proceedToHomePubSelection(): void { this.currentStep.set('choose-home-pub'); }
  proceedToFinalConfirmation(): void { this.currentStep.set('ready-to-start'); }

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
    this.locationRequired.set(true);
    try {
      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          () => {
            this.locationGranted.set(true);
            this.locationRequired.set(false);
            resolve();
          },
          (error) => {
            this.locationRequired.set(false);
            reject(error);
          }
        );
      });
      this.proceedToWelcome();
    } catch (error) {
      console.error('[Onboarding] Location permission error:', error);
      this.showError('Location access is required to find nearby pubs. Please enable location permissions.');
    }
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