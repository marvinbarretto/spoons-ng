import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthStore } from '@auth/data-access/auth.store';
import { BaseComponent } from '@shared/base/base.component';
import { LocationService, OverlayService } from '@fourfold/angular-foundation';
import { AvatarService } from '@shared/data-access/avatar.service';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { AvatarSelectorComponent } from '@shared/ui/avatar-selector/avatar-selector.component';
import { PubSelectorComponent } from '@shared/ui/pub-selector/pub-selector.component';
import { UserStore } from '@users/data-access/user.store';
import { PubStore } from '@pubs/data-access/pub.store';

@Component({
  selector: 'app-onboarding',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    PubSelectorComponent,
  ],
  template: `
    <div class="onboarding-container">
      <div class="onboarding-content">
        
        <!-- Header -->
        <div class="onboarding-header">
          <h1 class="welcome-title">Welcome to Spoonscount!</h1>
          <p class="welcome-subtitle">
            Let's set up your profile to get the most out of your pub journey
          </p>
        </div>

        <!-- Progress Steps -->
        <div class="progress-steps">
          <div class="step" [class.active]="currentStep() === 'location'" [class.complete]="isStepComplete('location')">
            <span class="step-number">1</span>
            <span class="step-label">Location</span>
          </div>
          <div class="step" [class.active]="currentStep() === 'profile'" [class.complete]="isStepComplete('profile')">
            <span class="step-number">2</span>
            <span class="step-label">Profile</span>
          </div>
          <div class="step" [class.active]="currentStep() === 'homePub'" [class.complete]="isStepComplete('homePub')">
            <span class="step-number">3</span>
            <span class="step-label">Home Pub</span>
          </div>
        </div>

        <!-- Step Content -->
        <div class="step-content">
          
          <!-- Step 1: Location Permission -->
          @if (currentStep() === 'location') {
            <div class="location-step">
              <div class="step-icon">📍</div>
              <h2>Find Nearby Pubs</h2>
              <p class="step-description">
                Allow location access to discover Wetherspoons near you and earn bonus points at local pubs.
              </p>
              
              <div class="location-benefits">
                <div class="benefit">
                  <span class="benefit-icon">🏆</span>
                  <span>2x points at nearby pubs</span>
                </div>
                <div class="benefit">
                  <span class="benefit-icon">🗺️</span>
                  <span>Personalized recommendations</span>
                </div>
              </div>

              <div class="location-actions">
                <app-button
                  size="lg"
                  [fullWidth]="true"
                  (onClick)="requestLocation()"
                  [loading]="requestingLocation()"
                  iconLeft="location_on"
                >
                  @if (requestingLocation()) {
                    Finding Your Location...
                  } @else {
                    Allow Location Access
                  }
                </app-button>
                
                <button 
                  type="button" 
                  class="skip-button"
                  (click)="skipLocation()"
                  [disabled]="loading()"
                >
                  I'll browse pubs manually
                </button>
              </div>

              @if (locationError()) {
                <div class="error-message">
                  <span class="error-icon">⚠️</span>
                  <span>{{ locationError() }}</span>
                </div>
              }
            </div>
          }

          <!-- Step 2: Profile Setup -->
          @if (currentStep() === 'profile') {
            <div class="profile-step">
              <div class="step-icon">👤</div>
              <h2>Choose Your Display Name</h2>
              <p class="step-description">
                How would you like other pub crawlers to see you?
              </p>

              <form [formGroup]="profileForm" class="profile-form">
                <div class="form-group">
                  <div class="name-input-wrapper">
                    <input
                      type="text"
                      class="name-input"
                      placeholder="Enter your display name"
                      formControlName="displayName"
                      maxlength="30"
                    />
                    <button
                      type="button"
                      class="dice-button"
                      (click)="generateRandomName()"
                      [disabled]="loading()"
                      title="Generate random name"
                    >
                      🎲
                    </button>
                  </div>
                  
                  @if (profileForm.get('displayName')?.errors?.['required'] && profileForm.get('displayName')?.touched) {
                    <div class="form-error">Display name is required</div>
                  }
                  @if (profileForm.get('displayName')?.errors?.['minlength']) {
                    <div class="form-error">Name must be at least 2 characters</div>
                  }
                </div>

                <!-- Avatar Selection -->
                <div class="avatar-section">
                  <h3>Choose Your Avatar</h3>
                  <div class="avatar-preview" (click)="openAvatarSelector()">
                    <div class="avatar-display">
                      <span class="avatar-emoji">{{ getSelectedAvatarEmoji() }}</span>
                      <span class="avatar-name">{{ getSelectedAvatarName() }}</span>
                    </div>
                    <button type="button" class="change-avatar-btn">
                      Change Avatar
                    </button>
                  </div>
                </div>
              </form>
            </div>
          }

          <!-- Step 3: Home Pub Selection -->
          @if (currentStep() === 'homePub') {
            <div class="pub-step">
              <div class="step-icon">🏠</div>
              <h2>Choose Your Home Pub</h2>
              <p class="step-description">
                Select your regular Wetherspoons to earn extra points when you visit.
              </p>

              <app-pub-selector
                label="Search for your home pub"
                searchPlaceholder="Search by pub name or location..."
                helperText="This helps us calculate distance bonuses and personalize your experience"
                [selectedPubIds]="selectedHomePub() ? [selectedHomePub()!] : []"
                (selectionChange)="onHomePubSelected($event)"
              />

              <button 
                type="button" 
                class="skip-button"
                (click)="skipHomePub()"
                [disabled]="loading()"
              >
                I'll set this up later
              </button>
            </div>
          }

        </div>

        <!-- Navigation -->
        <div class="navigation">
          @if (currentStep() !== 'location') {
            <app-button
              variant="ghost"
              (onClick)="goBack()"
              [disabled]="loading()"
              iconLeft="arrow_back"
            >
              Back
            </app-button>
          }

          @if (currentStep() !== 'homePub') {
            <app-button
              (onClick)="goNext()"
              [disabled]="loading() || !canProceed()"
              iconRight="arrow_forward"
            >
              Continue
            </app-button>
          } @else {
            <app-button
              (onClick)="finishOnboarding()"
              [loading]="loading()"
              [disabled]="loading()"
            >
              Complete Setup
            </app-button>
          }
        </div>

      </div>
    </div>
  `,
  styleUrl: './onboarding.component.scss'
})
export class OnboardingComponent extends BaseComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authStore = inject(AuthStore);
  private readonly userStore = inject(UserStore);
  private readonly locationService = inject(LocationService);
  private readonly avatarService = inject(AvatarService);
  private readonly pubStore = inject(PubStore);
  private readonly overlayService = inject(OverlayService);

  // Step management
  readonly currentStep = signal<'location' | 'profile' | 'homePub'>('location');
  readonly completedSteps = signal<Set<string>>(new Set());

  // Form state
  readonly profileForm = this.fb.group({
    displayName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(30)]],
  });

  // Component state
  readonly requestingLocation = signal(false);
  readonly locationError = signal<string | null>(null);
  readonly selectedAvatar = signal('npc'); // Default avatar
  readonly selectedHomePub = signal<string | null>(null);

  constructor() {
    super();

    // Pre-populate display name from authenticated user
    const user = this.authStore.user();
    if (user?.displayName) {
      this.profileForm.patchValue({ displayName: user.displayName });
    }

    // Load pubs for pub selector
    effect(() => {
      this.pubStore.loadOnce();
    });

    console.log('[Onboarding] Component initialized for user:', user?.uid?.slice(0, 8));
  }

  // Step management
  isStepComplete(step: string): boolean {
    return this.completedSteps().has(step);
  }

  canProceed(): boolean {
    switch (this.currentStep()) {
      case 'location':
        return true; // Can always proceed from location (skip is allowed)
      case 'profile':
        return this.profileForm.valid;
      case 'homePub':
        return true; // Can always proceed (home pub is optional)
      default:
        return false;
    }
  }

  // Location step
  async requestLocation(): Promise<void> {
    this.requestingLocation.set(true);
    this.locationError.set(null);

    try {
      console.log('[Onboarding] Requesting location permission...');
      // Use foundation LocationService
      this.locationService.getCurrentLocation();
      
      // Wait a moment to see if location is obtained
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const location = this.locationService.location();
      if (location) {
        console.log('[Onboarding] Location obtained:', location);
        this.showSuccess('Location access granted! You can now find nearby pubs.');
        this.markStepComplete('location');
      } else {
        this.locationError.set('Unable to access location. You can continue without it.');
      }
    } catch (error) {
      console.error('[Onboarding] Location request failed:', error);
      this.locationError.set('Location access failed. You can continue without it.');
    } finally {
      this.requestingLocation.set(false);
    }
  }

  skipLocation(): void {
    console.log('[Onboarding] User skipped location step');
    this.markStepComplete('location');
  }

  // Profile step
  generateRandomName(): void {
    const randomNames = [
      'PubCrawler', 'SpoonsMaster', 'BeerExplorer', 'WeatherspoonsFan',
      'PubHopper', 'CarpetConnoisseur', 'BreakfastChampion', 'LocalHero'
    ];
    const randomNumber = Math.floor(Math.random() * 999) + 1;
    const randomName = `${randomNames[Math.floor(Math.random() * randomNames.length)]}${randomNumber}`;
    
    this.profileForm.patchValue({ displayName: randomName });
  }

  openAvatarSelector(): void {
    console.log('[Onboarding] Opening avatar selector modal');
    const { componentRef, close } = this.overlayService.open(AvatarSelectorComponent, {
      maxWidth: '600px',
      maxHeight: '90vh',
    });

    // Set the close callback
    componentRef.instance.closeModal = close;
  }

  getSelectedAvatarEmoji(): string {
    return this.getAvatarData().emoji;
  }

  getSelectedAvatarName(): string {
    return this.getAvatarData().name;
  }

  private getAvatarData(): { emoji: string; name: string } {
    const avatarOptions = [
      { id: 'landlord', name: 'The Landlord', emoji: '👨‍💼' },
      { id: 'regular', name: 'The Regular', emoji: '🍺' },
      { id: 'npc', name: 'Pub Explorer', emoji: '🧑‍💻' },
    ];
    
    const selected = avatarOptions.find(a => a.id === this.selectedAvatar());
    return selected || { emoji: '🧑‍💻', name: 'Pub Explorer' };
  }

  // Home pub step
  onHomePubSelected(pubIds: string[]): void {
    const pubId = pubIds[0] || null;
    this.selectedHomePub.set(pubId);
    console.log('[Onboarding] Home pub selected:', pubId);
  }

  skipHomePub(): void {
    console.log('[Onboarding] User skipped home pub selection');
    this.markStepComplete('homePub');
  }

  // Navigation
  goBack(): void {
    switch (this.currentStep()) {
      case 'profile':
        this.currentStep.set('location');
        break;
      case 'homePub':
        this.currentStep.set('profile');
        break;
    }
  }

  goNext(): void {
    if (!this.canProceed()) return;

    this.markStepComplete(this.currentStep());

    switch (this.currentStep()) {
      case 'location':
        this.currentStep.set('profile');
        break;
      case 'profile':
        this.currentStep.set('homePub');
        break;
    }
  }

  markStepComplete(step: string): void {
    const completed = new Set(this.completedSteps());
    completed.add(step);
    this.completedSteps.set(completed);
  }

  // Complete onboarding
  async finishOnboarding(): Promise<void> {
    this.loading.set(true);

    try {
      const user = this.authStore.user();
      if (!user) {
        throw new Error('No authenticated user found');
      }

      const displayName = this.profileForm.get('displayName')?.value || user.displayName || 'Pub Explorer';
      const homePubId = this.selectedHomePub();

      // Get avatar URL
      const avatars = this.avatarService.generateAvatarOptions(user.uid);
      const selectedAvatarData = avatars.find(a => a.id === this.selectedAvatar());
      const avatarUrl = selectedAvatarData?.url || this.avatarService.generateSingleAvatar('npc');

      // Create complete user data
      const userData = {
        uid: user.uid,
        email: user.email,
        photoURL: avatarUrl,
        emailVerified: user.emailVerified,
        isAnonymous: user.isAnonymous,
        displayName,
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
        homePubId,
        onboardingCompleted: true,
        streaks: {},
      };

      console.log('[Onboarding] Creating user document with data:', userData);

      // Save user data - handle homePubId null conversion
      const finalUserData = {
        ...userData,
        homePubId: homePubId || undefined, // Convert null to undefined for User type
      };
      
      await this.userStore.createCompleteUserDocument(user.uid, finalUserData);

      console.log('[Onboarding] Onboarding completed successfully');
      this.showSuccess('Welcome to Spoonscount! Your account is ready.');

      // Navigate to home
      await this.router.navigate(['/home']);

    } catch (error) {
      console.error('[Onboarding] Failed to complete onboarding:', error);
      this.showError('Failed to complete setup. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }
}