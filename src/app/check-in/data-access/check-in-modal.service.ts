
import { Injectable, inject } from '@angular/core';
import { OverlayService } from '@shared/data-access/overlay.service';
import { UserProgressionService } from '@shared/data-access/user-progression.service';
import { CheckInStatusModalComponent } from '@check-in/ui/check-in-status-modal/check-in-status-modal.component';
import { LandlordStatusModalComponent } from '@landlord/ui/landlord-status-modal/landlord-status-modal.component';
import type { CheckInResultData } from '@check-in/utils/check-in.models';

@Injectable({ providedIn: 'root' })
export class CheckInModalService {
  private readonly overlayService = inject(OverlayService);
  private readonly userProgression = inject(UserProgressionService);

  /**
   * Show consecutive modals for check-in results
   */
  showCheckInResults(data: CheckInResultData): void {
    // Start with check-in status modal
    this.showCheckInStatus(data);
  }

  private showCheckInStatus(data: CheckInResultData): void {
    const checkinData = {
      success: data.success,
      pub: data.pub,
      error: data.error,
      badges: data.badges || [],
      checkinTime: data.checkin?.timestamp
    };

    const { componentRef, close } = this.overlayService.open(
      CheckInStatusModalComponent,
      {},
      {
        data: checkinData,
        userStage: this.userProgression.userStage(),
        autoNavigateProgress: null // Will be managed internally
      }
    );

    // Handle modal events
    componentRef.instance.navigate.subscribe(() => {
      close();
      this.navigateToPub(data.pub?.id);
    });

    componentRef.instance.dismiss.subscribe(() => {
      close();
    });

    componentRef.instance.nextModal.subscribe(() => {
      close(); // Close current modal
      setTimeout(() => {
        this.showLandlordStatus(data); // Open next modal after brief delay
      }, 200);
    });
  }

  private showLandlordStatus(data: CheckInResultData): void {
    const landlordData = {
      isNewLandlord: data.isNewLandlord || false,
      landlordMessage: data.landlordMessage,
      pub: data.pub
    };

    const { componentRef, close } = this.overlayService.open(
      LandlordStatusModalComponent,
      {},
      {
        data: landlordData,
        userStage: this.userProgression.userStage()
      }
    );

    // Handle modal events
    componentRef.instance.navigate.subscribe(() => {
      close();
      this.navigateToPub(data.pub?.id);
    });

    componentRef.instance.dismiss.subscribe(() => {
      close();
    });

    componentRef.instance.previousModal.subscribe(() => {
      close(); // Close current modal
      setTimeout(() => {
        this.showCheckInStatus(data); // Re-open previous modal
      }, 200);
    });
  }

  private navigateToPub(pubId?: string): void {
    if (pubId) {
      // Inject Router here or emit event to parent
      console.log('[CheckInModalService] Navigate to pub:', pubId);
    }
  }
}
