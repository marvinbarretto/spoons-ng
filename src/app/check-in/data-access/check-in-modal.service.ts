// src/app/check-in/data-access/check-in-modal.service.ts
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { RegistrationPromptService } from '@auth/data-access/registration-prompt.service';
import { CheckInStore } from '@check-in/data-access/check-in.store';
import { OverlayService } from '@fourfold/angular-foundation';
import { UserProgressionService } from '@shared/data-access/user-progression.service';
import { AnalyticsService } from '@shared/data-access/analytics.service';
import { environment } from '../../../environments/environment';
import { ModalCheckinCelebrationComponent } from '../ui/modal-checkin-celebration/modal-checkin-celebration.component';
import { ModalCheckinLandlordComponent } from '../ui/modal-checkin-landlord/modal-checkin-landlord.component';
import { ModalCheckinPointsComponent } from '../ui/modal-checkin-success/modal-checkin-success.component';
import { CheckInResultData } from '../utils/check-in.models';

@Injectable({ providedIn: 'root' })
export class CheckInModalService {
  private readonly overlayService = inject(OverlayService);
  private readonly userProgressionService = inject(UserProgressionService);
  private readonly checkinStore = inject(CheckInStore);
  private readonly router = inject(Router);
  private readonly registrationPromptService = inject(RegistrationPromptService);
  private readonly analytics = inject(AnalyticsService);

  // Callback for when modal flow is completely dismissed
  private onModalFlowDismissed?: () => void;

  // Track active timeouts for cleanup
  private activeTimeouts: Set<number> = new Set();
  
  // Track modal flow timing for analytics
  private modalFlowStartTime = Date.now();

  /**
   * Modal transition delay to ensure smooth UX
   * Prevents modal stacking, animation conflicts, and DOM cleanup issues
   */
  private readonly MODAL_TRANSITION_DELAY = 200;

  /**
   * Show consecutive modals for check-in results
   */
  showCheckInResults(data: CheckInResultData, onDismissed?: () => void): void {
    console.log('[CheckInModalService] Starting modal flow:', data);
    this.onModalFlowDismissed = onDismissed;
    this.modalFlowStartTime = Date.now();
    
    // Track modal flow start
    this.analytics.trackUserFlow('modal_flow_start', 'check_in_celebration', 0, true);
    
    // Track check-in success/failure
    if (data.success) {
      this.analytics.trackFeatureUsage('check_in_modal_success', 'check_in_flow');
    } else {
      this.analytics.trackUserFriction('check_in_modal_error', 'check_in_flow');
    }

    if (!data.success) {
      // Show error in celebration modal
      this.showCelebration(data);
      return;
    }

    // Start celebration flow
    this.showCelebration(data);
  }

  /**
   * First Modal: Check-in Celebration
   */
  private showCelebration(data: CheckInResultData): void {
    console.log('[CheckInModalService] Opening celebration modal');

    const { componentRef, close, result } = this.overlayService.open(
      ModalCheckinCelebrationComponent,
      {},
      {
        data,
        UserExperienceLevel: this.userProgressionService.userExperienceLevel(),
      }
    );

    // Set up navigation fallback timeout
    const navigationFallbackTimeout = this.safeSetTimeout(() => {
      console.warn(
        '[CheckInModalService] Navigation fallback timeout triggered - forcing navigation to homepage'
      );
      this.forceNavigationToHomepage();
    }, environment.MODAL_NAVIGATION_TIMEOUT || 10000);

    // Clear timeout when modal closes properly
    const clearFallbackTimeout = () => {
      console.log('[CheckInModalService] Clearing navigation fallback timeout');
      this.clearTimeout(navigationFallbackTimeout);
    };

    // Handle modal events
    componentRef.instance.continue.subscribe(() => {
      console.log('[CheckInModalService] Continue to points modal requested');
      clearFallbackTimeout();
      close();
      
      // Track modal progression
      const timeInModal = Date.now() - this.modalFlowStartTime;
      this.analytics.trackUserFlow('celebration_continue', 'check_in_celebration', timeInModal, true);

      // Brief delay for smooth transition
      this.safeSetTimeout(() => {
        this.showPointsDetails(data);
      }, this.MODAL_TRANSITION_DELAY);
    });

    componentRef.instance.skip.subscribe(() => {
      console.log('[CheckInModalService] Celebration skipped - going to points modal');
      clearFallbackTimeout();
      close();
      
      // Track modal skip behavior
      const timeInModal = Date.now() - this.modalFlowStartTime;
      this.analytics.trackUserFlow('celebration_skip', 'check_in_celebration', timeInModal, true);
      this.analytics.trackFeatureInterest('celebration_modal', 'low', timeInModal);

      // Brief delay for smooth transition
      this.safeSetTimeout(() => {
        this.showPointsDetails(data);
      }, this.MODAL_TRANSITION_DELAY);
    });

    // Handle backdrop/escape dismissal via overlay result promise
    result
      .then(value => {
        console.log('[CheckInModalService] Modal result promise resolved with value:', value);
        clearFallbackTimeout();

        // If modal was dismissed without explicit value (backdrop/escape), navigate home
        if (value === undefined) {
          console.log(
            '[CheckInModalService] Modal dismissed via backdrop/escape - navigating to homepage'
          );
          this.forceNavigationToHomepage();
        }
      })
      .catch(error => {
        console.error('[CheckInModalService] Modal result promise rejected:', error);
        clearFallbackTimeout();
        this.forceNavigationToHomepage();
      });
  }

  /**
   * Second Modal: Points Details
   */
  private showPointsDetails(data: CheckInResultData): void {
    console.log('[CheckInModalService] Opening points modal');

    const { componentRef, close, result } = this.overlayService.open(
      ModalCheckinPointsComponent,
      {},
      {
        data,
        UserExperienceLevel: this.userProgressionService.userExperienceLevel(),
      }
    );

    // Set up navigation fallback timeout
    const navigationFallbackTimeout = this.safeSetTimeout(() => {
      console.warn(
        '[CheckInModalService] Points modal navigation fallback timeout triggered - forcing navigation to homepage'
      );
      this.forceNavigationToHomepage();
    }, environment.MODAL_NAVIGATION_TIMEOUT || 10000);

    // Clear timeout when modal closes properly
    const clearFallbackTimeout = () => {
      console.log('[CheckInModalService] Clearing points modal navigation fallback timeout');
      this.clearTimeout(navigationFallbackTimeout);
    };

    // Handle modal events
    componentRef.instance.continue.subscribe(() => {
      console.log('[CheckInModalService] Continue from points modal');
      clearFallbackTimeout();
      close();
      
      // Track points modal completion
      const totalFlowTime = Date.now() - this.modalFlowStartTime;
      this.analytics.trackUserFlow('points_continue', 'check_in_celebration', totalFlowTime, true);
      this.analytics.trackFeatureInterest('points_modal', 'high', totalFlowTime);

      // Check if we should show registration prompt after successful check-in
      this.safeSetTimeout(async () => {
        if (this.registrationPromptService.shouldShow('first-checkin')) {
          await this.registrationPromptService.showPrompt({
            trigger: 'first-checkin',
            context: {
              pointsEarned: data.points?.total || 0,
              totalPoints: data.points?.total || 0,
              badgesEarned: (data.badges || []).length,
            },
          });
          return;
        }

        // Check for points milestone
        if (this.registrationPromptService.shouldShow('points-milestone')) {
          await this.registrationPromptService.showPrompt({
            trigger: 'points-milestone',
            context: {
              pointsEarned: data.points?.total || 0,
              totalPoints: data.points?.total || 0,
            },
          });
          return;
        }

        // Check for badge earned
        if (
          (data.badges || []).length > 0 &&
          this.registrationPromptService.shouldShow('badge-earned')
        ) {
          await this.registrationPromptService.showPrompt({
            trigger: 'badge-earned',
            context: {
              badgesEarned: (data.badges || []).length,
            },
          });
          return;
        }

        // TODO: Landlord modal temporarily disabled until feature is complete
        // Continue to landlord modal if applicable, otherwise finish
        // if (data.isNewLandlord || data.landlordMessage) {
        //   this.safeSetTimeout(() => {
        //     this.showLandlordStatus(data);
        //   }, this.MODAL_TRANSITION_DELAY);
        // } else {
        this.forceNavigationToHomepage();
        // }
      }, this.MODAL_TRANSITION_DELAY);
    });

    componentRef.instance.dismiss.subscribe(() => {
      console.log('[CheckInModalService] Points modal dismissed - navigating to homepage');
      clearFallbackTimeout();
      close();
      
      // Track early dismissal
      const totalFlowTime = Date.now() - this.modalFlowStartTime;
      this.analytics.trackUserFlow('points_dismiss', 'check_in_celebration', totalFlowTime, false);
      this.analytics.trackFeatureInterest('points_modal', 'low', totalFlowTime);
      
      this.forceNavigationToHomepage();
    });

    // Handle backdrop/escape dismissal via overlay result promise
    result
      .then(value => {
        console.log(
          '[CheckInModalService] Points modal result promise resolved with value:',
          value
        );
        clearFallbackTimeout();

        // If modal was dismissed without explicit value (backdrop/escape), navigate home
        if (value === undefined) {
          console.log(
            '[CheckInModalService] Points modal dismissed via backdrop/escape - navigating to homepage'
          );
          this.forceNavigationToHomepage();
        }
      })
      .catch(error => {
        console.error('[CheckInModalService] Points modal result promise rejected:', error);
        clearFallbackTimeout();
        this.forceNavigationToHomepage();
      });
  }

  /**
   * Third Modal: Landlord Status
   */
  private showLandlordStatus(data: CheckInResultData): void {
    console.log('[CheckInModalService] Opening landlord modal');

    const { componentRef, close, result } = this.overlayService.open(
      ModalCheckinLandlordComponent,
      {},
      {
        data: {
          isNewLandlord: data.isNewLandlord || false,
          landlordMessage: data.landlordMessage,
          pub: data.pub,
        },
        UserExperienceLevel: this.userProgressionService.userExperienceLevel(),
      }
    );

    // Set up navigation fallback timeout
    const navigationFallbackTimeout = this.safeSetTimeout(() => {
      console.warn(
        '[CheckInModalService] Landlord modal navigation fallback timeout triggered - forcing navigation to homepage'
      );
      this.forceNavigationToHomepage();
    }, environment.MODAL_NAVIGATION_TIMEOUT || 10000);

    // Clear timeout when modal closes properly
    const clearFallbackTimeout = () => {
      console.log('[CheckInModalService] Clearing landlord modal navigation fallback timeout');
      this.clearTimeout(navigationFallbackTimeout);
    };

    // Handle modal events
    componentRef.instance.navigate.subscribe(() => {
      console.log('[CheckInModalService] Navigate from landlord modal');
      clearFallbackTimeout();
      close();
      this.navigateToPub(data.pub?.id);
    });

    componentRef.instance.dismiss.subscribe(() => {
      console.log(
        '[CheckInModalService] Landlord modal dismissed via OK button - navigating to homepage'
      );
      clearFallbackTimeout();
      close();
      this.forceNavigationToHomepage();
    });

    componentRef.instance.previousModal.subscribe(() => {
      console.log('[CheckInModalService] Previous modal requested');
      clearFallbackTimeout();
      close();

      // Brief delay for smooth transition
      this.safeSetTimeout(() => {
        this.showCelebration(data);
      }, this.MODAL_TRANSITION_DELAY);
    });

    // Handle backdrop/escape dismissal via overlay result promise
    result
      .then(value => {
        console.log(
          '[CheckInModalService] Landlord modal result promise resolved with value:',
          value
        );
        clearFallbackTimeout();

        // If modal was dismissed without explicit value (backdrop/escape), navigate home
        if (value === undefined) {
          console.log(
            '[CheckInModalService] Landlord modal dismissed via backdrop/escape - navigating to homepage'
          );
          this.forceNavigationToHomepage();
        }
      })
      .catch(error => {
        console.error('[CheckInModalService] Landlord modal result promise rejected:', error);
        clearFallbackTimeout();
        this.forceNavigationToHomepage();
      });
  }

  /**
   * Navigate to pub details
   */
  private navigateToPub(pubId?: string): void {
    if (pubId) {
      console.log('[CheckInModalService] Navigating to pub:', pubId);
      this.router.navigate(['/pubs', pubId]);
    }
  }

  /**
   * Force navigation to homepage with comprehensive logging
   */
  private forceNavigationToHomepage(): void {
    console.log('[CheckInModalService] Force navigation to homepage initiated');

    // Add small delay to ensure any pending operations complete
    this.safeSetTimeout(() => {
      console.log('[CheckInModalService] Executing router.navigate to homepage');

      this.router
        .navigate(['/'], {
          replaceUrl: true, // Replace current URL to prevent back navigation to check-in page
        })
        .then(success => {
          console.log('[CheckInModalService] Router navigation completed successfully:', success);
        })
        .catch(error => {
          console.error('[CheckInModalService] Router navigation failed:', error);

          // Fallback: try window.location as last resort
          console.log('[CheckInModalService] Attempting fallback navigation via window.location');
          try {
            window.location.href = '/';
          } catch (locationError) {
            console.error('[CheckInModalService] Fallback navigation also failed:', locationError);
          }
        });
    }, 100);
  }

  private safeSetTimeout(callback: () => void, delay: number): number {
    const timeoutId = window.setTimeout(() => {
      this.activeTimeouts.delete(timeoutId);
      callback();
    }, delay);
    this.activeTimeouts.add(timeoutId);
    return timeoutId;
  }

  private clearTimeout(timeoutId: number): void {
    clearTimeout(timeoutId);
    this.activeTimeouts.delete(timeoutId);
  }

  clearAllTimeouts(): void {
    console.log('[CheckInModalService] 🧹 Clearing all active timeouts:', this.activeTimeouts.size);
    this.activeTimeouts.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    this.activeTimeouts.clear();
  }
}
