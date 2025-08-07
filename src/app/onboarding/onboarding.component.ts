import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { UserAvatarComponent } from '@app/widgets/user-avatar/user-avatar.component';
import { AuthStore } from '@auth/data-access/auth.store';
import { LocationService, OverlayService } from '@fourfold/angular-foundation';
import { AvatarSelectionWidgetComponent } from '@home/ui/profile-customisation-modal/widgets/avatar-selection-widget/avatar-selection-widget.component';
import { PubStore } from '@pubs/data-access/pub.store';
import { BaseComponent } from '@shared/base/base.component';
import { AvatarService } from '@shared/data-access/avatar.service';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { PubSingleSelectorComponent } from '@shared/ui/pub-single-selector/pub-single-selector.component';
import { DebugService } from '@shared/utils/debug.service';
import { UserStore } from '@users/data-access/user.store';

@Component({
  selector: 'app-onboarding',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    UserAvatarComponent,
    AvatarSelectionWidgetComponent,
    PubSingleSelectorComponent,
  ],
  template: `
    <div class="onboarding-container">
      <div class="onboarding-content">
        <!-- Header - Only show on first step -->
        @if (currentStep() === 'location') {
          <div class="onboarding-header">
            <h1 class="welcome-title">Welcome to Spoonscount!</h1>
            <p class="welcome-subtitle">
              Let's set up your profile to get the most out of your pub journey
            </p>
          </div>
        }

        <!-- Progress Steps -->
        <div class="progress-steps">
          <div
            class="step"
            [class.active]="currentStep() === 'location'"
            [class.complete]="isStepComplete('location')"
          >
            <span class="step-number">1</span>
            <span class="step-label">Location</span>
          </div>
          <div
            class="step"
            [class.active]="currentStep() === 'profile'"
            [class.complete]="isStepComplete('profile')"
          >
            <span class="step-number">2</span>
            <span class="step-label">Profile</span>
          </div>
          <div
            class="step"
            [class.active]="currentStep() === 'homePub'"
            [class.complete]="isStepComplete('homePub')"
          >
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
                Allow location access to discover Wetherspoons near you and earn bonus points at
                local pubs.
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

              <!-- Location action button is now in the footer navigation -->

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
              <div class="step-icon-avatar">
                <app-user-avatar [user]="previewUser()" size="lg" [clickable]="false" />
              </div>
              <h2>Choose Your Display Name</h2>
              <p class="step-description">How would you like other pub crawlers to see you?</p>

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

                  @if (
                    profileForm.get('displayName')?.errors?.['required'] &&
                    profileForm.get('displayName')?.touched
                  ) {
                    <div class="form-error">Display name is required</div>
                  }
                  @if (profileForm.get('displayName')?.errors?.['minlength']) {
                    <div class="form-error">Name must be at least 2 characters</div>
                  }
                </div>

                <!-- Avatar Selection -->
                <div class="avatar-section">
                  <h3>Choose Your Avatar</h3>
                  <p class="avatar-label">Select from the options below</p>

                  <app-avatar-selection-widget
                    [showCurrentAvatar]="false"
                    [selectedAvatarId]="selectedAvatar()"
                    (avatarSelected)="onAvatarSelected($event)"
                  />
                </div>
              </form>
            </div>
          }

          <!-- Step 3: Home Pub Selection -->
          @if (currentStep() === 'homePub') {
            <div class="pub-step">
              <div class="step-icon">🏠</div>
              <h2>{{ getPersonalizedHomePubTitle() }}</h2>
              <p class="step-description">
                Select your regular Wetherspoons to earn extra points when you visit.
              </p>

              <app-pub-single-selector (pubSelected)="onHomePubSelectedFromWidget($event)" />
            </div>
          }
        </div>
      </div>

      <!-- Sticky Navigation Footer -->
      <div class="navigation-footer">
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

          @if (currentStep() === 'location') {
            <app-button
              (onClick)="requestLocation()"
              [loading]="requestingLocation()"
              [disabled]="requestingLocation()"
              iconLeft="location_on"
            >
              Allow Location Access
            </app-button>
          } @else if (currentStep() === 'profile') {
            <app-button
              (onClick)="goNext()"
              [disabled]="loading() || !canProceed()"
              iconRight="arrow_forward"
            >
              Continue
            </app-button>
          } @else if (currentStep() === 'homePub') {
            <app-button
              (onClick)="finishOnboarding()"
              [loading]="loading()"
              [disabled]="loading() || !canProceed()"
            >
              Complete Setup
            </app-button>
          }
        </div>
      </div>
    </div>
  `,
  styleUrl: './onboarding.component.scss',
})
export class OnboardingComponent extends BaseComponent {
  private readonly fb = inject(FormBuilder);
  protected readonly authStore = inject(AuthStore);
  private readonly userStore = inject(UserStore);
  private readonly locationService = inject(LocationService);
  private readonly avatarService = inject(AvatarService);
  private readonly pubStore = inject(PubStore);
  private readonly overlayService = inject(OverlayService);
  private readonly debug = inject(DebugService);

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

  // Preview user for displaying the selected avatar
  readonly previewUser = computed(() => {
    const user = this.authStore.user();
    if (!user) return null;

    // Create a preview user with the selected avatar
    const avatars = this.avatarService.generateAvatarOptions(user.uid);
    const selectedAvatarData = avatars.find(a => a.id === this.selectedAvatar());
    const avatarUrl =
      selectedAvatarData?.url ||
      avatars.find(a => a.id === 'npc')?.url ||
      'assets/avatars/npc.webp';

    return {
      ...user,
      photoURL: avatarUrl,
      displayName:
        this.profileForm.get('displayName')?.value || user.displayName || 'Anonymous NPC',
    };
  });

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

    this.debug.standard('[Onboarding] Component initialized for user', {
      uid: user?.uid?.slice(0, 8),
    });
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
        return !!this.selectedHomePub(); // Require pub selection for completion
      default:
        return false;
    }
  }

  // Location step
  async requestLocation(): Promise<void> {
    this.requestingLocation.set(true);
    this.locationError.set(null);

    try {
      this.debug.standard('[Onboarding] Requesting location permission');
      // Use foundation LocationService
      this.locationService.getCurrentLocation();

      // Wait a moment to see if location is obtained
      await new Promise(resolve => setTimeout(resolve, 2000));

      const location = this.locationService.location();
      if (location) {
        this.debug.success('[Onboarding] Location obtained', { location });
        this.markStepComplete('location');
        // Auto-advance to next step
        this.currentStep.set('profile');
      } else {
        this.locationError.set(
          'Unable to access location. Please check your browser settings and try again.'
        );
      }
    } catch (error) {
      this.debug.error('[Onboarding] Location request failed', error);
      this.locationError.set(
        'Location access failed. Please check your browser settings and try again.'
      );
    } finally {
      this.requestingLocation.set(false);
    }
  }

  skipLocation(): void {
    this.debug.standard('[Onboarding] User skipped location step');
    this.markStepComplete('location');
  }

  // Profile step
  generateRandomName(): void {
    const randomNames = [
      'PubCrawler',
      'SpoonsMaster',
      'BeerExplorer',
      'WeatherspoonsFan',
      'PubHopper',
      'CarpetConnoisseur',
      'BreakfastChampion',
      'LocalHero',
    ];
    const randomNumber = Math.floor(Math.random() * 999) + 1;
    const randomName = `${randomNames[Math.floor(Math.random() * randomNames.length)]}${randomNumber}`;

    this.profileForm.patchValue({ displayName: randomName });
  }

  onAvatarSelected(avatarId: string): void {
    this.debug.standard('[Onboarding] Avatar selected for preview', { avatarId });
    // Just update the preview - don't save to database until onboarding completes
    this.selectedAvatar.set(avatarId);
  }

  // Home pub step
  onHomePubSelectedFromWidget(pub: any): void {
    this.debug.standard('[Onboarding] Home pub selected from widget', {
      pubName: pub.name,
      pubId: pub.id,
    });
    this.selectedHomePub.set(pub.id);
  }

  getPersonalizedHomePubTitle(): string {
    const displayName = this.profileForm.get('displayName')?.value;
    if (displayName) {
      return `${displayName}, Choose Your Home Pub`;
    }
    return 'Choose Your Home Pub';
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
    this.debug.group('[Onboarding] Starting onboarding completion process', 'STANDARD');
    this.loading.set(true);

    try {
      // Step 1: Validate all required data
      this.debug.standard('[Onboarding] Step 1: Validating required data');

      const user = this.authStore.user();
      if (!user) {
        this.debug.error('[Onboarding] No authenticated user found');
        throw new Error('No authenticated user found');
      }

      const displayName =
        this.profileForm.get('displayName')?.value || user.displayName || 'Pub Explorer';
      const homePubId = this.selectedHomePub();

      // Validate that a home pub has been selected
      if (!homePubId) {
        this.debug.error('[Onboarding] No home pub selected - blocking completion');
        throw new Error('Please select a home pub before completing setup');
      }

      this.debug.success('[Onboarding] Validation passed', {
        userUid: user.uid.slice(0, 8),
        displayName,
        homePubId: homePubId.slice(0, 8),
        avatarId: this.selectedAvatar(),
      });

      // Step 2: Prepare user data with onboardingCompleted = true
      this.debug.standard('[Onboarding] Step 2: Preparing user data');

      // Get selected avatar URL for final save
      const avatars = this.avatarService.generateAvatarOptions(user.uid);
      const selectedAvatarData = avatars.find(a => a.id === this.selectedAvatar());
      const avatarUrl =
        selectedAvatarData?.url ||
        avatars.find(a => a.id === 'npc')?.url ||
        'assets/avatars/npc.webp';

      // Create complete user data with onboardingCompleted = true
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
        homePubId, // Keep as string, not undefined
        onboardingCompleted: true, // CRITICAL: Mark onboarding as completed
        streaks: {},
      };

      this.debug.standard('[Onboarding] User data prepared', {
        uid: userData.uid.slice(0, 8),
        displayName: userData.displayName,
        homePubId: userData.homePubId?.slice(0, 8),
        onboardingCompleted: userData.onboardingCompleted,
      });

      // Step 3: Save to database
      this.debug.standard('[Onboarding] Step 3: Saving user document to database');

      await this.userStore.createCompleteUserDocument(user.uid, userData);

      this.debug.success('[Onboarding] User document saved to database');

      // Step 4: Verify the save was successful
      this.debug.standard('[Onboarding] Step 4: Verifying user document was saved correctly');

      // Give the UserStore a moment to update its cache
      await new Promise(resolve => setTimeout(resolve, 250));

      const verificationUser = this.userStore.currentUser();
      if (verificationUser?.onboardingCompleted) {
        this.debug.success(
          '[Onboarding] Verification passed - user shows onboardingCompleted = true',
          {
            uid: verificationUser.uid.slice(0, 8),
            onboardingCompleted: verificationUser.onboardingCompleted,
          }
        );
      } else {
        this.debug.warn('[Onboarding] Verification warning - user may not have updated yet', {
          userExists: !!verificationUser,
          onboardingCompleted: verificationUser?.onboardingCompleted,
        });
      }

      // Step 5: Navigate to home
      this.debug.standard('[Onboarding] Step 5: Navigating to home page');
      await this.router.navigate(['/home']);

      this.debug.success('[Onboarding] Onboarding completion process finished successfully');
    } catch (error) {
      this.debug.error('[Onboarding] Failed to complete onboarding', error);
      // Don't show toast, let user try again
    } finally {
      this.loading.set(false);
      this.debug.groupEnd('STANDARD');
    }
  }
}
