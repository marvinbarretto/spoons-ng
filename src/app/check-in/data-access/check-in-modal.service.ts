// src/app/check-in/data-access/check-in-modal.service.ts
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { OverlayService } from '@shared/data-access/overlay.service';
import { UserProgressionService } from '@shared/data-access/user-progression.service';
import { ModalCheckinSuccessComponent } from '../ui/modal-checkin-success/modal-checkin-success.component';
import { ModalCheckinLandlordComponent } from '../ui/modal-checkin-landlord/modal-checkin-landlord.component';

type CheckInResultData = {
  success: boolean;
  checkin?: any;
  pub?: any;
  isNewLandlord?: boolean;
  landlordMessage?: string;
  badges?: any[];
  error?: string;
};

@Injectable({ providedIn: 'root' })
export class CheckInModalService {
  private readonly overlayService = inject(OverlayService);
  private readonly userProgressionService = inject(UserProgressionService);
  private readonly router = inject(Router);

  /**
   * Show consecutive modals for check-in results
   */
  showCheckInResults(data: CheckInResultData): void {
    console.log('[CheckInModalService] Starting modal flow:', data);

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

    const { componentRef, close } = this.overlayService.open(
      ModalCheckinSuccessComponent,
      {},
      {
        data,
        userStage: this.userProgressionService.userStage()
      }
    );

    // Handle modal events
    componentRef.instance.navigate.subscribe(() => {
      console.log('[CheckInModalService] Navigate requested');
      close();
      this.navigateToPub(data.pub?.id);
    });

    componentRef.instance.dismiss.subscribe(() => {
      console.log('[CheckInModalService] Success modal dismissed');
      close();
    });

    componentRef.instance.nextModal.subscribe(() => {
      console.log('[CheckInModalService] Next modal requested');
      close();

      // Brief delay for smooth transition
      setTimeout(() => {
        this.showLandlordStatus(data);
      }, 200);
    });
  }

  /**
   * Second Modal: Landlord Status
   */
  private showLandlordStatus(data: CheckInResultData): void {
    console.log('[CheckInModalService] Opening landlord modal');

    const { componentRef, close } = this.overlayService.open(
      ModalCheckinLandlordComponent,
      {},
      {
        data: {
          isNewLandlord: data.isNewLandlord || false,
          landlordMessage: data.landlordMessage,
          pub: data.pub
        },
        userStage: this.userProgressionService.userStage()
      }
    );

    // Handle modal events
    componentRef.instance.navigate.subscribe(() => {
      console.log('[CheckInModalService] Navigate from landlord modal');
      close();
      this.navigateToPub(data.pub?.id);
    });

    componentRef.instance.dismiss.subscribe(() => {
      console.log('[CheckInModalService] Landlord modal dismissed');
      close();
    });

    componentRef.instance.previousModal.subscribe(() => {
      console.log('[CheckInModalService] Previous modal requested');
      close();

      // Brief delay for smooth transition
      setTimeout(() => {
        this.showCheckinSuccess(data);
      }, 200);
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
}
