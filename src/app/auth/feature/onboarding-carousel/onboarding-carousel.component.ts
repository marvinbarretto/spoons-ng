import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { BaseComponent } from '@shared/base/base.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { FormInputComponent } from '@shared/ui/form-input/form-input.component';
import { AuthStore } from '@auth/data-access/auth.store';
import { UserStore } from '@users/data-access/user.store';
import { AvatarService } from '@shared/data-access/avatar.service';
import { DataAggregatorService } from '@shared/data-access/data-aggregator.service';
import { PubStore } from '@pubs/data-access/pub.store';
import { PubSelectorComponent } from '@shared/ui/pub-selector/pub-selector.component';
import { generateRandomName } from '@shared/utils/anonymous-names';
import type { Pub } from '@pubs/utils/pub.models';

type OnboardingStep = 'username' | 'avatar' | 'local-pub';

@Component({
  selector: 'app-onboarding-carousel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonComponent,
    FormInputComponent,
    PubSelectorComponent
  ],
  template: `
    <div class="onboarding-carousel-container">
      <!-- Progress indicator -->
      <div class="progress-container">
        <div class="progress-dots">
          @for (step of steps; track step; let i = $index) {
            <div 
              class="progress-dot" 
              [class.active]="i === currentStepIndex()"
              [class.completed]="i < currentStepIndex()"
            ></div>
          }
        </div>
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            [style.width.%]="progressPercentage()"
          ></div>
        </div>
      </div>

      <!-- Step content -->
      <div class="carousel-container">
        <div 
          class="carousel-track" 
          [style.transform]="'translateX(-' + currentStepIndex() * 33.333 + '%)'"
        >
          <!-- Step 1: Username Input -->
          <div class="carousel-step">
            <div class="step-content">
              <div class="step-header">
                <h1 class="step-title">Choose Your Username</h1>
                <p class="step-subtitle">This is how other players will see you</p>
              </div>

              <form [formGroup]="usernameForm" class="username-form">
                <app-form-input
                  label="Display Name"
                  type="text"
                  placeholder="Enter your username"
                  iconLeft="person"
                  [required]="true"
                  [disabled]="loading()"
                  [errorMessage]="getUsernameError()"
                  formControlName="username"
                />

                <app-button
                  variant="ghost"
                  size="md"
                  iconLeft="shuffle"
                  (onClick)="generateRandomUsername()"
                  [disabled]="loading()"
                  class="random-button"
                >
                  Generate Random Name
                </app-button>
              </form>
            </div>
          </div>

          <!-- Step 2: Avatar Selection -->
          <div class="carousel-step">
            <div class="step-content">
              <div class="step-header">
                <h1 class="step-title">Choose Your Avatar</h1>
                <p class="step-subtitle">Pick a profile picture that represents you</p>
              </div>

              @if (avatarOptions().length > 0) {
                <div class="avatar-grid">
                  @for (avatar of avatarOptions(); track avatar.id) {
                    <button
                      type="button"
                      class="avatar-option"
                      [class.selected]="selectedAvatarId() === avatar.id"
                      (click)="selectAvatar(avatar.id)"
                    >
                      <img [src]="avatar.url" [alt]="avatar.name" class="avatar-image" />
                    </button>
                  }
                </div>
              } @else {
                <div class="loading-avatars">
                  <p>Loading avatar options...</p>
                  <p class="debug-info">User loaded: {{ !!user() }}</p>
                  @if (user()) {
                    <p class="debug-info">User ID: {{ user()?.uid?.slice(0, 8) }}...</p>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Step 3: Local Pub Selection -->
          <div class="carousel-step">
            <div class="step-content">
              <div class="step-header">
                <h1 class="step-title">Choose Your Local Pub</h1>
                <p class="step-subtitle">Select your home pub to get started</p>
              </div>

              <div class="pub-selector-container">
                <app-pub-selector
                  label="Choose Your Local Pub"
                  [selectedPubIds]="selectedPubIds()"
                  (selectionChange)="onPubSelectionChange($event)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation controls -->
      <div class="navigation-controls">
        <app-button
          variant="ghost"
          size="md"
          iconLeft="arrow_back"
          (onClick)="goBack()"
          [disabled]="currentStepIndex() === 0 || loading()"
        >
          Back
        </app-button>

        <app-button
          variant="primary"
          size="md"
          iconRight="arrow_forward"
          (onClick)="goNext()"
          [disabled]="!canProceed() || loading()"
          [loading]="loading()"
        >
          @if (isLastStep()) {
            Complete Setup
          } @else {
            Continue
          }
        </app-button>
      </div>

      <!-- Error message -->
      @if (error()) {
        <div class="error-message">
          {{ error() }}
        </div>
      }
    </div>
  `,
  styles: `
    .onboarding-carousel-container {
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
      
      /* Safe area support */
      padding-top: env(safe-area-inset-top, 0);
      padding-left: env(safe-area-inset-left, 0);
      padding-right: env(safe-area-inset-right, 0);
      
      /* Carpet background */
      background-image:
        linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.8)),
        url('/assets/carpets/bangor.jpg');
      background-size: cover;
      background-position: center;
      background-attachment: fixed;
      
      color: var(--text-on-dark, white);
    }

    .progress-container {
      padding: 2rem 1.5rem 1rem;
      text-align: center;
    }

    .progress-dots {
      display: flex;
      justify-content: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .progress-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
      transition: all 0.3s ease;
    }

    .progress-dot.active {
      background: var(--primary, #10b981);
      transform: scale(1.2);
    }

    .progress-dot.completed {
      background: var(--primary, #10b981);
    }

    .progress-bar {
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 2px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #10b981 0%, #059669 100%);
      transition: width 0.3s ease;
    }

    .carousel-container {
      flex: 1;
      overflow: hidden;
      position: relative;
      display: flex;
      flex-direction: column;
      min-height: 0; /* Ensures flex child can shrink */
    }

    .carousel-track {
      display: flex;
      width: 300%;
      height: 100%;
      transition: transform 0.3s ease;
      flex-shrink: 0;
    }

    .carousel-step {
      width: 33.333%;
      padding: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      overflow-y: auto;
    }

    .step-content {
      width: 100%;
      max-width: 500px;
      text-align: center;
    }

    .step-header {
      margin-bottom: 2rem;
    }

    .step-title {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      background: linear-gradient(135deg, #ffffff, #e5e7eb);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .step-subtitle {
      font-size: 1rem;
      color: rgba(255, 255, 255, 0.8);
      margin: 0;
    }

    .avatar-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .avatar-option {
      background: rgba(0, 0, 0, 0.3);
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-radius: 1rem;
      padding: 1rem;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }

    .avatar-option:hover {
      border-color: rgba(255, 255, 255, 0.3);
      transform: translateY(-2px);
    }

    .avatar-option.selected {
      border-color: var(--primary, #10b981);
      background: rgba(16, 185, 129, 0.1);
    }

    .avatar-image {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      object-fit: cover;
    }

    .avatar-name {
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.9);
    }

    .loading-avatars {
      text-align: center;
      padding: 2rem;
    }

    .debug-info {
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.7);
      margin: 0.5rem 0;
    }

    .username-form {
      background: rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 1rem;
      padding: 2rem;
      margin-bottom: 2rem;
    }

    .random-button {
      margin-top: 1rem;
    }

    .pub-selector-container {
      background: rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 1rem;
      padding: 2rem;
    }

    .navigation-controls {
      display: flex;
      justify-content: space-between;
      padding: 1.5rem;
      padding-bottom: max(1.5rem, env(safe-area-inset-bottom, 0));
      margin-top: auto;
      position: sticky;
      bottom: 0;
      background: linear-gradient(to top, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.7) 70%, transparent 100%);
      backdrop-filter: blur(10px);
    }

    .error-message {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 0.5rem;
      padding: 1rem;
      margin: 1rem 1.5rem;
      text-align: center;
      color: var(--error, #ef4444);
      font-size: 0.875rem;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .onboarding-carousel-container {
        background-attachment: scroll;
      }

      .carousel-step {
        padding: 1rem;
      }

      .avatar-grid {
        grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
        gap: 0.75rem;
      }

      .navigation-controls {
        flex-direction: column;
        gap: 1rem;
      }

      .step-content {
        max-width: 100%;
      }
    }

    /* Support for landscape orientation on mobile */
    @media (max-height: 600px) and (orientation: landscape) {
      .carousel-step {
        align-items: flex-start;
        padding-top: 1rem;
      }

      .step-header {
        margin-bottom: 1rem;
      }

      .avatar-grid {
        grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
        gap: 0.5rem;
      }

      .navigation-controls {
        padding: 1rem;
        padding-bottom: max(1rem, env(safe-area-inset-bottom, 0));
      }
    }
  `
})
export class OnboardingCarouselComponent extends BaseComponent {
  private readonly authStore = inject(AuthStore);
  private readonly userStore = inject(UserStore);
  private readonly dataAggregatorService = inject(DataAggregatorService);
  private readonly avatarService = inject(AvatarService);
  private readonly pubStore = inject(PubStore);
  private readonly fb = inject(FormBuilder);

  // Steps configuration
  readonly steps: OnboardingStep[] = ['username', 'avatar', 'local-pub'];
  readonly currentStep = signal<OnboardingStep>('username');

  // Form for username step
  readonly usernameForm = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(30)]]
  });

  // Component state
  readonly selectedAvatarId = signal('npc');
  readonly selectedPub = signal<Pub | null>(null);
  readonly selectedPubIds = signal<string[]>([]);

  // Computed properties
  readonly currentStepIndex = computed(() => 
    this.steps.indexOf(this.currentStep())
  );

  readonly progressPercentage = computed(() => 
    (this.currentStepIndex() / (this.steps.length - 1)) * 100
  );

  readonly isLastStep = computed(() => 
    this.currentStepIndex() === this.steps.length - 1
  );

  readonly user = this.dataAggregatorService.user;

  readonly avatarOptions = computed(() => {
    const user = this.user();
    if (!user) {
      console.warn('[OnboardingCarousel] No user found for avatar options');
      return [];
    }
    console.log('[OnboardingCarousel] Generating avatar options for user:', user.uid.slice(0, 8));
    return this.avatarService.generateAvatarOptions(user.uid);
  });

  readonly canProceed = computed(() => {
    const step = this.currentStep();
    switch (step) {
      case 'username':
        return this.usernameForm.valid;
      case 'avatar':
        return !!this.selectedAvatarId();
      case 'local-pub':
        return true; // Local pub is optional
      default:
        return false;
    }
  });

  override async onInit() {
    console.log('[OnboardingCarousel] Component initialized, starting with step:', this.currentStep());
    
    // Pre-select NPC avatar
    this.selectedAvatarId.set('npc');
    
    // Pre-populate username if user has one
    const user = this.user();
    if (user?.displayName) {
      this.usernameForm.patchValue({ username: user.displayName });
      console.log('[OnboardingCarousel] Pre-populated username:', user.displayName);
    }
  }

  selectAvatar(avatarId: string): void {
    console.log('[OnboardingCarousel] Avatar selected:', avatarId);
    this.selectedAvatarId.set(avatarId);
  }

  generateRandomUsername(): void {
    const user = this.user();
    if (user?.uid) {
      const randomName = generateRandomName(user.uid);
      this.usernameForm.patchValue({ username: randomName });
    }
  }

  onPubSelectionChange(pubIds: string[]): void {
    this.selectedPubIds.set(pubIds);
    // Update selectedPub for easy access
    if (pubIds.length > 0) {
      const allPubs = this.pubStore.data();
      const selectedPub = allPubs.find(pub => pub.id === pubIds[0]);
      this.selectedPub.set(selectedPub || null);
    } else {
      this.selectedPub.set(null);
    }
  }

  getUsernameError(): string | undefined {
    const control = this.usernameForm.get('username');
    if (control?.invalid && (control.dirty || control.touched) && control.errors) {
      if (control.errors['required']) return 'Username is required';
      if (control.errors['minlength']) return 'Username must be at least 2 characters';
      if (control.errors['maxlength']) return 'Username must be less than 30 characters';
    }
    return undefined;
  }

  goBack(): void {
    const currentIndex = this.currentStepIndex();
    const currentStep = this.currentStep();
    
    console.log('[OnboardingCarousel] Going back from step:', currentStep, 'at index:', currentIndex);
    
    if (currentIndex > 0) {
      const previousStep = this.steps[currentIndex - 1];
      console.log('[OnboardingCarousel] Moving to previous step:', previousStep);
      this.currentStep.set(previousStep);
    }
  }

  async goNext(): Promise<void> {
    if (!this.canProceed() || this.loading()) {
      console.log('[OnboardingCarousel] Cannot proceed - canProceed:', this.canProceed(), 'loading:', this.loading());
      return;
    }

    const currentIndex = this.currentStepIndex();
    const currentStep = this.currentStep();
    
    console.log('[OnboardingCarousel] Going next from step:', currentStep, 'at index:', currentIndex);
    
    if (this.isLastStep()) {
      console.log('[OnboardingCarousel] Last step reached, completing onboarding');
      await this.completeOnboarding();
    } else {
      const nextStep = this.steps[currentIndex + 1];
      console.log('[OnboardingCarousel] Moving to next step:', nextStep);
      this.currentStep.set(nextStep);
    }
  }

  private async completeOnboarding(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const user = this.user();
      if (!user) {
        throw new Error('No user found');
      }

      const updateData = {
        displayName: this.usernameForm.value.username!,
        photoURL: this.getAvatarUrl(this.selectedAvatarId()),
        homePubId: this.selectedPub()?.id || undefined,
        onboardingCompleted: true
      };

      await this.userStore.updateProfile(updateData);
      await this.router.navigate(['/']);
    } catch (error: any) {
      console.error('[OnboardingCarousel] Failed to complete onboarding:', error);
      this.error.set('Failed to save your preferences. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  private getAvatarUrl(avatarId: string): string {
    const avatarOptions = this.avatarOptions();
    const selectedOption = avatarOptions.find(option => option.id === avatarId);
    return selectedOption?.url || '/assets/avatars/npc.webp';
  }
}