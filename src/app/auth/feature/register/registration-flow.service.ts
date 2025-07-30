import { Injectable, Injector, inject, runInInjectionContext, signal } from '@angular/core';
import { Firestore, collection, getDocs, query, where } from '@angular/fire/firestore';

export type RegistrationStep = 'auth' | 'profile' | 'location' | 'complete';

export type AuthMethod = 'google' | 'email' | 'guest';

export type RegistrationData = {
  authMethod?: AuthMethod;
  email?: string;
  password?: string;
  displayName?: string;
  avatar?: string;
  isTestUser?: boolean;
  location?: GeolocationPosition;
  localPubId?: string;
  homePubId?: string;
};

@Injectable({ providedIn: 'root' })
export class RegistrationFlowService {
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(Injector);

  // Registration flow state
  readonly currentStep = signal<RegistrationStep>('auth');
  readonly registrationData = signal<Partial<RegistrationData>>({});
  readonly isValidatingUsername = signal(false);
  readonly usernameValidationError = signal<string | null>(null);

  // Steps configuration
  readonly steps: RegistrationStep[] = ['auth', 'profile', 'location', 'complete'];
  readonly currentStepIndex = () => this.steps.indexOf(this.currentStep());
  readonly totalSteps = this.steps.length;
  readonly progressPercentage = () => ((this.currentStepIndex() + 1) / this.totalSteps) * 100;

  // Navigation helpers
  canGoBack(): boolean {
    return this.currentStepIndex() > 0;
  }

  canGoNext(): boolean {
    const currentData = this.registrationData();
    const step = this.currentStep();

    switch (step) {
      case 'auth':
        return !!currentData.authMethod;
      case 'profile':
        return !!currentData.displayName && !this.usernameValidationError();
      case 'location':
        return !!currentData.localPubId;
      case 'complete':
        return false; // No next step
      default:
        return false;
    }
  }

  nextStep(): void {
    console.log('[RegistrationFlowService] 🚀 nextStep() called');
    console.log('[RegistrationFlowService] Current step:', this.currentStep());
    console.log('[RegistrationFlowService] Can go next:', this.canGoNext());

    if (this.canGoNext()) {
      const nextIndex = this.currentStepIndex() + 1;
      console.log(
        '[RegistrationFlowService] Next index:',
        nextIndex,
        'Total steps:',
        this.steps.length
      );

      if (nextIndex < this.steps.length) {
        const nextStep = this.steps[nextIndex];
        console.log('[RegistrationFlowService] Setting next step to:', nextStep);
        this.currentStep.set(nextStep);
        console.log('[RegistrationFlowService] ✅ Step changed to:', this.currentStep());
      } else {
        console.log('[RegistrationFlowService] ⚠️ Already at last step');
      }
    } else {
      console.log('[RegistrationFlowService] ⚠️ Cannot go to next step');
    }
  }

  previousStep(): void {
    if (this.canGoBack()) {
      const prevIndex = this.currentStepIndex() - 1;
      if (prevIndex >= 0) {
        this.currentStep.set(this.steps[prevIndex]);
      }
    }
  }

  goToStep(step: RegistrationStep): void {
    this.currentStep.set(step);
  }

  // Update registration data
  updateData(data: Partial<RegistrationData>): void {
    this.registrationData.update(current => ({ ...current, ...data }));
  }

  // Reset flow
  resetFlow(): void {
    this.currentStep.set('auth');
    this.registrationData.set({});
    this.usernameValidationError.set(null);
    this.isValidatingUsername.set(false);
  }

  // Username validation
  async checkUsernameAvailability(username: string): Promise<boolean> {
    if (!username || username.trim().length < 2) {
      this.usernameValidationError.set('Username must be at least 2 characters');
      return false;
    }

    if (username.trim().length > 30) {
      this.usernameValidationError.set('Username must be 30 characters or less');
      return false;
    }

    // Check for invalid characters (allow letters, numbers, spaces, hyphens, underscores)
    const validPattern = /^[a-zA-Z0-9\s\-_]+$/;
    if (!validPattern.test(username.trim())) {
      this.usernameValidationError.set(
        'Username can only contain letters, numbers, spaces, hyphens, and underscores'
      );
      return false;
    }

    try {
      this.isValidatingUsername.set(true);
      this.usernameValidationError.set(null);

      // Check if username exists in Firestore - run in injection context
      const isAvailable = await runInInjectionContext(this.injector, async () => {
        const usersRef = collection(this.firestore, 'users');
        const q = query(usersRef, where('displayName', '==', username.trim()));
        const querySnapshot = await getDocs(q);
        return querySnapshot.empty;
      });

      if (!isAvailable) {
        this.usernameValidationError.set('This username is already taken');
        return false;
      }

      // Username is available
      this.usernameValidationError.set(null);
      return true;
    } catch (error) {
      console.error('[RegistrationFlowService] Username validation error:', error);
      this.usernameValidationError.set('Unable to check username availability. Please try again.');
      return false;
    } finally {
      this.isValidatingUsername.set(false);
    }
  }

  // Generate random username
  generateRandomUsername(): string {
    const adjectives = [
      'quick',
      'brave',
      'clever',
      'bright',
      'happy',
      'lucky',
      'swift',
      'bold',
      'wise',
      'kind',
      'cool',
      'calm',
      'sharp',
      'smart',
      'fun',
      'wild',
    ];

    const nouns = [
      'fox',
      'eagle',
      'wolf',
      'bear',
      'lion',
      'tiger',
      'hawk',
      'owl',
      'deer',
      'rabbit',
      'horse',
      'falcon',
      'dragon',
      'phoenix',
      'star',
      'moon',
    ];

    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 999) + 1;

    return `${adjective}-${noun}-${number}`;
  }

  // Get current registration summary
  getRegistrationSummary() {
    const data = this.registrationData();
    return {
      authMethod: data.authMethod,
      displayName: data.displayName,
      isTestUser: data.isTestUser,
      hasLocation: !!data.location,
      hasLocalPub: !!data.localPubId,
    };
  }

  // Check if registration is complete
  isRegistrationComplete(): boolean {
    const data = this.registrationData();
    return !!(
      data.authMethod &&
      data.displayName &&
      typeof data.isTestUser === 'boolean' &&
      data.localPubId
    );
  }
}
