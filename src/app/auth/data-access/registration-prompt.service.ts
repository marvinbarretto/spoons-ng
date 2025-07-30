import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { OverlayService, SsrPlatformService } from '@fourfold/angular-foundation';
import { UserStore } from '@users/data-access/user.store';
import { AuthStore } from './auth.store';

export type PromptTrigger = 'first-checkin' | 'points-milestone' | 'badge-earned' | 'engagement';

export interface PromptData {
  trigger: PromptTrigger;
  context?: {
    pointsEarned?: number;
    totalPoints?: number;
    badgesEarned?: number;
    checkinCount?: number;
  };
}

@Injectable({ providedIn: 'root' })
export class RegistrationPromptService {
  private readonly authStore = inject(AuthStore);
  private readonly userStore = inject(UserStore);
  private readonly overlayService = inject(OverlayService);
  private readonly platform = inject(SsrPlatformService);
  private readonly router = inject(Router);

  private readonly STORAGE_KEY = 'registration-prompts';
  private readonly MAX_DISMISSALS = 3;
  private readonly COOLDOWN_HOURS = 24;

  /**
   * Check if we should show a registration prompt
   */
  shouldShow(trigger: PromptTrigger, context?: any): boolean {
    // Only show to anonymous users
    if (!this.authStore.isAnonymous()) {
      return false;
    }

    if (!this.platform.isBrowser) {
      return false;
    }

    const promptHistory = this.getPromptHistory();

    // Check if user has dismissed too many times
    if (promptHistory.dismissalCount >= this.MAX_DISMISSALS) {
      return false;
    }

    // Check cooldown period
    if (promptHistory.lastShown) {
      const hoursSinceLastShown = (Date.now() - promptHistory.lastShown) / (1000 * 60 * 60);
      if (hoursSinceLastShown < this.COOLDOWN_HOURS) {
        return false;
      }
    }

    // Trigger-specific logic
    switch (trigger) {
      case 'first-checkin':
        return !promptHistory.hasSeenFirstCheckin;

      case 'points-milestone':
        const totalPoints = this.userStore.totalPoints();
        return totalPoints >= 50 && !promptHistory.hasSeenPointsMilestone;

      case 'badge-earned':
        const badgeCount = this.userStore.badgeCount();
        return badgeCount >= 1 && !promptHistory.hasSeenBadgeMilestone;

      case 'engagement':
        return (promptHistory.showCount || 0) < 2; // Show max 2 engagement prompts

      default:
        return false;
    }
  }

  /**
   * Show registration prompt modal
   */
  async showPrompt(data: PromptData): Promise<void> {
    console.log('[RegistrationPromptService] Showing prompt:', data.trigger);

    // Mark that we've shown this prompt
    this.recordPromptShown(data.trigger);

    // Dynamic import to avoid circular dependencies
    const { RegistrationPromptModalComponent } = await import(
      '../ui/registration-prompt-modal/registration-prompt-modal.component'
    );

    const { componentRef, close } = this.overlayService.open(
      RegistrationPromptModalComponent,
      {},
      {
        promptData: data,
        message: this.getMessageForTrigger(data),
      }
    );

    // Handle user responses
    componentRef.instance.dismissed.subscribe((dontShowAgain: boolean) => {
      console.log('[RegistrationPromptService] User dismissed prompt');
      this.recordDismissal(data.trigger, dontShowAgain);
      close();
    });

    componentRef.instance.createAccount.subscribe(() => {
      console.log('[RegistrationPromptService] User chose to create account');
      this.recordAcceptance(data.trigger);
      close();
      this.router.navigate(['/register']);
    });
  }

  /**
   * Get context-aware message for the trigger
   */
  private getMessageForTrigger(data: PromptData): {
    title: string;
    message: string;
    ctaText: string;
  } {
    const { trigger, context } = data;

    switch (trigger) {
      case 'first-checkin':
        return {
          title: '🎉 Great First Check-in!',
          message:
            'You just earned your first points! Create an account to keep your progress safe and start building your pub collection.',
          ctaText: 'Save My Progress',
        };

      case 'points-milestone':
        return {
          title: "🚀 You're on Fire!",
          message: `You've earned ${context?.totalPoints || 0} points! Create an account to secure your progress and compete on the leaderboard.`,
          ctaText: 'Secure My Points',
        };

      case 'badge-earned':
        return {
          title: '🏅 Badge Earned!',
          message:
            'You just unlocked your first achievement! Create an account to collect more badges and show off your progress.',
          ctaText: 'Start My Collection',
        };

      case 'engagement':
        return {
          title: '🔐 Keep Your Progress Safe',
          message:
            "You've been tracking pubs like a pro! Create an account to ensure your data is never lost.",
          ctaText: 'Create Account',
        };

      default:
        return {
          title: '🔐 Keep Your Progress Safe',
          message: 'Create an account to ensure your pub tracking progress is never lost.',
          ctaText: 'Create Account',
        };
    }
  }

  /**
   * Record that a prompt was shown
   */
  private recordPromptShown(trigger: PromptTrigger): void {
    if (!this.platform.isBrowser) return;

    const history = this.getPromptHistory();
    history.lastShown = Date.now();
    history.showCount = (history.showCount || 0) + 1;

    // Mark specific triggers as seen
    if (trigger === 'first-checkin') {
      history.hasSeenFirstCheckin = true;
    } else if (trigger === 'points-milestone') {
      history.hasSeenPointsMilestone = true;
    } else if (trigger === 'badge-earned') {
      history.hasSeenBadgeMilestone = true;
    }

    this.savePromptHistory(history);
  }

  /**
   * Record user dismissal
   */
  private recordDismissal(trigger: PromptTrigger, permanent: boolean): void {
    if (!this.platform.isBrowser) return;

    const history = this.getPromptHistory();
    history.dismissalCount = (history.dismissalCount || 0) + 1;
    history.lastDismissed = Date.now();

    if (permanent) {
      history.dismissalCount = this.MAX_DISMISSALS; // Set to max to prevent future prompts
    }

    this.savePromptHistory(history);
  }

  /**
   * Record user acceptance (proceeded to registration)
   */
  private recordAcceptance(trigger: PromptTrigger): void {
    if (!this.platform.isBrowser) return;

    const history = this.getPromptHistory();
    history.acceptedCount = (history.acceptedCount || 0) + 1;
    history.lastAccepted = Date.now();
    history.acceptedTrigger = trigger;

    this.savePromptHistory(history);
  }

  /**
   * Get prompt history from localStorage
   */
  private getPromptHistory(): any {
    if (!this.platform.isBrowser) return {};

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  /**
   * Save prompt history to localStorage
   */
  private savePromptHistory(history: any): void {
    if (!this.platform.isBrowser) return;

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.warn('[RegistrationPromptService] Failed to save prompt history:', error);
    }
  }

  /**
   * Reset prompt history (for testing)
   */
  resetHistory(): void {
    if (!this.platform.isBrowser) return;
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
