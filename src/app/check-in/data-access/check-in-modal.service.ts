// src/app/check-in/data-access/check-in-modal.service.ts
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { OverlayService } from '@shared/data-access/overlay.service';
import { UserProgressionService } from '@shared/data-access/user-progression.service';
import { CheckInStore } from '@check-in/data-access/check-in.store';
import { ModalCheckinSuccessComponent } from '../ui/modal-checkin-success/modal-checkin-success.component';
import { ModalCheckinLandlordComponent } from '../ui/modal-checkin-landlord/modal-checkin-landlord.component';
import { CheckInResultData } from '../utils/check-in.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CheckInModalService {
  private readonly overlayService = inject(OverlayService);
  private readonly userProgressionService = inject(UserProgressionService);
  private readonly checkinStore = inject(CheckInStore);
  private readonly router = inject(Router);

  // Callback for when modal flow is completely dismissed
  private onModalFlowDismissed?: () => void;
  
  // Track active timeouts for cleanup
  private activeTimeouts: Set<number> = new Set();

  /**
   * Show consecutive modals for check-in results
   */
  showCheckInResults(data: CheckInResultData, onDismissed?: () => void): void {
    console.log('[CheckInModalService] Starting modal flow:', data);
    this.onModalFlowDismissed = onDismissed;

    if (!data.success) {
      // Show error in first modal only
      this.showCheckinSuccess(data);
      return;
    }

    // Start success flow
    this.showCheckinSuccess(data);
  }

  /**
   * First Modal: Check-in Success/Failure
   */
  private showCheckinSuccess(data: CheckInResultData): void {
    console.log('[CheckInModalService] Opening success modal');

    const { componentRef, close, result } = this.overlayService.open(
      ModalCheckinSuccessComponent,
      {},
      {
        data,
        UserExperienceLevel: this.userProgressionService.userExperienceLevel()
      }
    );

    // Set up navigation fallback timeout
    const navigationFallbackTimeout = this.safeSetTimeout(() => {
      console.warn('[CheckInModalService] Navigation fallback timeout triggered - forcing navigation to homepage');
      this.forceNavigationToHomepage();
    }, environment.MODAL_NAVIGATION_TIMEOUT);

    // Clear timeout when modal closes properly
    const clearFallbackTimeout = () => {
      console.log('[CheckInModalService] Clearing navigation fallback timeout');
      this.clearTimeout(navigationFallbackTimeout);
    };

    // Handle modal events
    componentRef.instance.navigate.subscribe(() => {
      console.log('[CheckInModalService] Navigate requested');
      clearFallbackTimeout();
      close();
      this.navigateToPub(data.pub?.id);
    });

    componentRef.instance.dismiss.subscribe(() => {
      console.log('[CheckInModalService] Success modal dismissed via OK button - navigating to homepage');
      clearFallbackTimeout();
      close();
      this.forceNavigationToHomepage();
    });

    componentRef.instance.nextModal.subscribe(() => {
      console.log('[CheckInModalService] Next modal requested');
      clearFallbackTimeout();
      close();

      // Brief delay for smooth transition
      this.safeSetTimeout(() => {
        this.showLandlordStatus(data);
      }, 200);
    });

    // Handle backdrop/escape dismissal via overlay result promise
    result.then((value) => {
      console.log('[CheckInModalService] Modal result promise resolved with value:', value);
      clearFallbackTimeout();

      // If modal was dismissed without explicit value (backdrop/escape), navigate home
      if (value === undefined) {
        console.log('[CheckInModalService] Modal dismissed via backdrop/escape - navigating to homepage');
        this.forceNavigationToHomepage();
      }
    }).catch((error) => {
      console.error('[CheckInModalService] Modal result promise rejected:', error);
      clearFallbackTimeout();
      this.forceNavigationToHomepage();
    });
  }

  /**
   * Second Modal: Landlord Status
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
          pub: data.pub
        },
        UserExperienceLevel: this.userProgressionService.userExperienceLevel()
      }
    );

    // Set up navigation fallback timeout
    const navigationFallbackTimeout = this.safeSetTimeout(() => {
      console.warn('[CheckInModalService] Landlord modal navigation fallback timeout triggered - forcing navigation to homepage');
      this.forceNavigationToHomepage();
    }, environment.MODAL_NAVIGATION_TIMEOUT);

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
      console.log('[CheckInModalService] Landlord modal dismissed via OK button - navigating to homepage');
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
        this.showCheckinSuccess(data);
      }, 200);
    });

    // Handle backdrop/escape dismissal via overlay result promise
    result.then((value) => {
      console.log('[CheckInModalService] Landlord modal result promise resolved with value:', value);
      clearFallbackTimeout();

      // If modal was dismissed without explicit value (backdrop/escape), navigate home
      if (value === undefined) {
        console.log('[CheckInModalService] Landlord modal dismissed via backdrop/escape - navigating to homepage');
        this.forceNavigationToHomepage();
      }
    }).catch((error) => {
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

      this.router.navigate(['/'], {
        replaceUrl: true // Replace current URL to prevent back navigation to check-in page
      }).then((success) => {
        console.log('[CheckInModalService] Router navigation completed successfully:', success);
      }).catch((error) => {
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
