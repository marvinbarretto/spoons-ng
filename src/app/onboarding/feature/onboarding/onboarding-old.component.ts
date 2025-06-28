// src/app/onboarding/feature/onboarding/onboarding.component.ts
import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BaseComponent } from '@shared/base/base.component';
import { AuthStore } from '@auth/data-access/auth.store';
import { UserStore } from '@users/data-access/user.store';
import { AvatarService } from '../../../shared/data-access/avatar.service';
import { NotificationService } from '../../../shared/data-access/notification.service';
import { LocationService } from '../../../shared/data-access/location.service';
import { ThemeStore } from '../../../shared/data-access/theme.store';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { AvatarSelectionWidgetComponent } from '@home/ui/profile-customisation-modal/widgets/avatar-selection-widget/avatar-selection-widget.component';
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
    AvatarSelectionWidgetComponent,
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
      <!-- Progress indicator -->
      <div class="progress-bar">
        <div class="progress-fill" [style.width.%]="progressPercentage()"></div>
      </div>

      <!-- Step content -->
      <div class="step-content">
        @switch (currentStep()) {
          @case ('welcome') {
            <div class="step welcome-step">
              <h1>🍺 Welcome to Spooncount!</h1>
              <p class="subtitle">The gamified pub check-in experience</p>

              <div class="welcome-content">
                <div class="feature-list">
                  <div class="feature-item">
                    <span class="icon">📸</span>
                    <div>
                      <h3>Photograph Carpets</h3>
                      <p>Capture unique pub carpets to prove your visit</p>
                    </div>
                  </div>
                  <div class="feature-item">
                    <span class="icon">🏆</span>
                    <div>
                      <h3>Earn Points & Badges</h3>
                      <p>Score points and unlock achievements</p>
                    </div>
                  </div>
                  <div class="feature-item">
                    <span class="icon">👑</span>
                    <div>
                      <h3>Become a Landlord</h3>
                      <p>Rule your favorite pubs on the leaderboard</p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="step-actions">
                <app-button
                  variant="primary"
                  (onClick)="nextStep()"
                >
                  Let's Get Started!
                </app-button>
              </div>
            </div>
          }

          @case ('display-name') {
            <div class="step display-name-step">
              <h2>What should we call you?</h2>
              <p class="step-description">Choose a display name for the leaderboards</p>

              <div class="input-group">
                <input
                  type="text"
                  class="display-name-input"
                  [value]="displayName()"
                  (input)="onDisplayNameChange($event)"
                  placeholder="Enter your display name"
                  maxlength="20"
                />
                <div class="input-hint">
                  This will be shown on leaderboards and when you check in
                </div>
              </div>

              <div class="step-actions">
                <app-button
                  variant="secondary"
                  (onClick)="previousStep()"
                >
                  Back
                </app-button>
                <app-button
                  variant="primary"
                  [disabled]="!displayName().trim()"
                  (onClick)="nextStep()"
                >
                  Continue
                </app-button>
              </div>
            </div>
          }

          @case ('avatar') {
            <div class="step avatar-step">
              <h2>Choose Your Avatar</h2>
              <p class="step-description">Pick an avatar to represent you</p>

              <app-avatar-selection-widget
                [user]="user()"
                [selectedAvatarId]="selectedAvatarId()"
                (avatarSelected)="onAvatarSelected($event)"
              />

              <div class="step-actions">
                <app-button
                  variant="secondary"
                  (onClick)="previousStep()"
                >
                  Back
                </app-button>
                <app-button
                  variant="primary"
                  [disabled]="!selectedAvatarId()"
                  (onClick)="nextStep()"
                >
                  Continue
                </app-button>
              </div>
            </div>
          }

          @case ('home-pub') {
            <div class="step home-pub-step">
              <h2>Choose Your Home Pub</h2>
              <p class="step-description">Your home pub gives you bonus points when you check in!</p>

              <div class="home-pub-content">
                <div class="home-pub-info">
                  <div class="info-item">
                    <span class="icon">🏠</span>
                    <div>
                      <strong>Home Pub Bonus</strong>
                      <p>Earn extra points when checking into your home pub</p>
                    </div>
                  </div>
                  <div class="info-item">
                    <span class="icon">📍</span>
                    <div>
                      <strong>Local Recognition</strong>
                      <p>Show your loyalty to your favorite local</p>
                    </div>
                  </div>
                </div>

                <!-- Home Pub Selection Widget -->
                <app-home-pub-selection-widget
                  (pubSelected)="onHomePubSelected($event)"
                />
              </div>

              <div class="step-actions">
                <app-button
                  variant="secondary"
                  (onClick)="previousStep()"
                >
                  Back
                </app-button>
                <app-button
                  variant="primary"
                  (onClick)="nextStep()"
                >
                  {{ selectedHomePubId() ? 'Continue' : 'Skip for Now' }}
                </app-button>
              </div>
            </div>
          }

          @case ('complete') {
            <div class="step complete-step">
              <div class="completion-content">
                <div class="success-icon">🎉</div>
                <h2>You're All Set!</h2>
                <p class="subtitle">Welcome to the Spooncount community, {{ displayName() }}!</p>

                <div class="next-steps">
                  <h3>What's next?</h3>
                  <ul>
                    <li>Find nearby pubs to start your journey</li>
                    <li>Take your first carpet photo</li>
                    <li>Earn your first badge</li>
                    <li>Climb the leaderboards</li>
                  </ul>
                </div>
              </div>

              <div class="step-actions">
                <app-button
                  variant="primary"
                  [loading]="saving()"
                  (onClick)="completeOnboarding()"
                >
                  Start Exploring Pubs!
                </app-button>
              </div>
            </div>
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
      position: relative;
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

    h1, h2 {
      margin-bottom: 0.5rem;
      font-weight: 700;
    }

    h1 {
      font-size: 2.5rem;
    }

    h2 {
      font-size: 2rem;
    }

    .subtitle {
      font-size: 1.2rem;
      opacity: 0.9;
      margin-bottom: 2rem;
    }

    .step-description {
      font-size: 1.1rem;
      opacity: 0.9;
      margin-bottom: 2rem;
    }

    /* Welcome Step */
    .welcome-content {
      margin: 3rem 0;
    }

    .feature-list {
      display: flex;
      flex-direction: column;
      gap: 2rem;
      text-align: left;
    }

    .feature-item {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.5rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      backdrop-filter: blur(10px);
    }

    .feature-item .icon {
      font-size: 2rem;
      flex-shrink: 0;
    }

    .feature-item h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1.2rem;
    }

    .feature-item p {
      margin: 0;
      opacity: 0.9;
    }

    /* Display Name Step */
    .input-group {
      margin: 2rem 0;
    }

    .display-name-input {
      width: 100%;
      padding: 1rem;
      font-size: 1.1rem;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.1);
      color: white;
      text-align: center;
      backdrop-filter: blur(10px);
    }

    .display-name-input::placeholder {
      color: rgba(255, 255, 255, 0.7);
    }

    .display-name-input:focus {
      outline: none;
      border-color: #4ade80;
      background: rgba(255, 255, 255, 0.2);
    }

    .input-hint {
      margin-top: 0.5rem;
      font-size: 0.9rem;
      opacity: 0.7;
    }

    /* Home Pub Step */
    .home-pub-content {
      margin: 2rem 0;
    }

    .home-pub-info {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .info-item {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      text-align: left;
    }

    .info-item .icon {
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .pub-selection-placeholder {
      padding: 2rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      border: 2px dashed rgba(255, 255, 255, 0.3);
    }

    /* Complete Step */
    .completion-content {
      margin: 2rem 0;
    }

    .success-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .next-steps {
      margin: 2rem 0;
      padding: 1.5rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      text-align: left;
    }

    .next-steps h3 {
      margin-top: 0;
      margin-bottom: 1rem;
      text-align: center;
    }

    .next-steps ul {
      margin: 0;
      padding-left: 1.5rem;
    }

    .next-steps li {
      margin-bottom: 0.5rem;
      opacity: 0.9;
    }

    /* Step Actions */
    .step-actions {
      display: flex;
      justify-content: center;
      gap: 1rem;
      margin-top: 3rem;
    }

    /* Mobile Responsive */
    @media (max-width: 768px) {
      .step-content {
        padding: 1rem;
      }

      h1 {
        font-size: 2rem;
      }

      h2 {
        font-size: 1.6rem;
      }

      .feature-list {
        gap: 1.5rem;
      }

      .feature-item {
        padding: 1rem;
      }

      .step-actions {
        flex-direction: column;
        align-items: center;
      }

      .step-actions app-button {
        width: 100%;
        max-width: 300px;
      }
    }
  `
})
export class OnboardingComponent extends BaseComponent {
  private readonly authStore = inject(AuthStore);
  private readonly userStore = inject(UserStore);
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
  
  // Background color selection
  readonly selectedBackgroundColor = signal<string>('#667eea');

  // Background color options
  readonly backgroundColors = [
    { name: 'Purple', value: '#667eea' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#10b981' },
    { name: 'Orange', value: '#f59e0b' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Indigo', value: '#6366f1' }
  ];

  // Reactive data
  readonly user = this.authStore.user;

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
    const randomName = generateRandomName();
    this.displayName.set(randomName);
  }

  // Background color selection
  selectBackgroundColor(color: string): void {
    this.selectedBackgroundColor.set(color);
  }

  // Event handlers
  onDisplayNameChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.displayName.set(input.value);
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

      console.log('[Onboarding] Completing onboarding with data:', {
        displayName: this.displayName(),
        avatarId: this.selectedAvatarId(),
        homePubId: this.selectedHomePubId(),
        userId: user.uid
      });

      // Save all onboarding data to user profile
      await this.userStore.updateProfile({
        displayName: this.displayName(),
        photoURL: this.getAvatarUrlById(this.selectedAvatarId()),
        homePubId: this.selectedHomePubId(),
        onboardingCompleted: true
      });

      console.log('[Onboarding] ✅ Onboarding completed successfully');

      // Navigate to home
      this.router.navigate(['/']);

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
