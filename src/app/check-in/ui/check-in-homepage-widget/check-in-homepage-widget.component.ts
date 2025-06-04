// Enhanced widget that gathers more debug info
import { Component, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Pub } from '../../../pubs/utils/pub.models';
import { CheckinStore } from '../../data-access/check-in.store';
import { LandlordStore } from '../../../landlord/data-access/landlord.store';
import { AuthStore } from '../../../auth/data-access/auth.store';
import { OverlayService } from '../../../shared/data-access/overlay.service';
import { CheckInResultModalComponent, CheckInResultData } from '../check-in-result-modal/check-in-result-modal.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';

@Component({
  selector: 'app-check-in-homepage-widget',
  imports: [CommonModule, RouterModule, ButtonComponent],
  template: `
    <div class="check-in-widget">
      <h3>{{ closestPub.name }}</h3>

      <app-button
        [variant]="'primary'"
        [fullWidth]="true"
        [loading]="isCheckingIn()"
        [disabled]="isCheckingIn()"
        (onClick)="checkInToNearestPub()"
      >
        {{ isCheckingIn() ? 'Checking in...' : 'Check In' }}
      </app-button>
    </div>
  `,
  styles: [`
    .check-in-widget {
      padding: 1rem;
      background-color: #f5f5f5;
      border: 1px solid #ddd;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      align-items: center;
    }
  `]
})
export class CheckInHomepageWidgetComponent {
  @Input({ required: true }) closestPub!: Pub;

  private readonly checkinStore = inject(CheckinStore);
  private readonly landlordStore = inject(LandlordStore);
  private readonly authStore = inject(AuthStore);
  private readonly overlayService = inject(OverlayService);

  readonly isCheckingIn = signal(false);

  async checkInToNearestPub(): Promise<void> {
    if (this.isCheckingIn()) return;

    console.log('[CheckinWidget] Starting check-in for:', this.closestPub.name);
    this.isCheckingIn.set(true);

    try {
      // Capture pre-checkin state for debugging
      const preCheckinLandlord = this.landlordStore.todayLandlord()[this.closestPub.id];
      const currentUser = this.authStore.user();

      console.log('[CheckinWidget] Pre-checkin landlord state:', preCheckinLandlord);
      console.log('[CheckinWidget] Current user:', currentUser?.uid);

      await this.checkinStore.checkinToPub(this.closestPub.id);

      // Capture post-checkin state
      const latestCheckin = this.checkinStore.checkinSuccess();
      const landlordMessage = this.checkinStore.landlordMessage();
      const postCheckinLandlord = this.landlordStore.todayLandlord()[this.closestPub.id];

      console.log('[CheckinWidget] Post-checkin landlord state:', postCheckinLandlord);
      console.log('[CheckinWidget] Latest checkin:', latestCheckin);
      console.log('[CheckinWidget] Landlord message:', landlordMessage);

      if (latestCheckin) {
        // Determine if user is new landlord
        const isNewLandlord = latestCheckin.madeUserLandlord === true;

        // Gather debug info
        const debugInfo = {
          pubLandlordStatus: postCheckinLandlord ? 'Has landlord' : 'No landlord',
          checkinTime: latestCheckin.timestamp.toDate().toISOString(),
          landlordClaimedAt: postCheckinLandlord?.claimedAt
            ? (typeof postCheckinLandlord.claimedAt === 'object' && 'toDate' in postCheckinLandlord.claimedAt
               ? postCheckinLandlord.claimedAt.toDate().toISOString()
               : String(postCheckinLandlord.claimedAt))
            : undefined,
          existingLandlordUserId: postCheckinLandlord?.userId,
          preCheckinLandlord: preCheckinLandlord?.userId || 'none',
          postCheckinLandlord: postCheckinLandlord?.userId || 'none',
          userWhoCheckedIn: currentUser?.uid,
        };

        console.log('[CheckinWidget] Debug info:', debugInfo);

        this.showResultModal({
          success: true,
          checkin: latestCheckin,
          pub: this.closestPub,
          isNewLandlord,
          landlordMessage: landlordMessage || undefined,
          currentLandlord: postCheckinLandlord,
          debugInfo,
        });
      } else {
        this.showResultModal({
          success: false,
          error: 'Check-in completed but no result returned'
        });
      }

    } catch (error: any) {
      console.error('[CheckinWidget] Check-in failed:', error);
      this.showResultModal({
        success: false,
        error: error?.message || 'Check-in failed'
      });
    } finally {
      this.isCheckingIn.set(false);
    }
  }

  private showResultModal(data: CheckInResultData): void {
    console.log('[CheckinWidget] !!! showResultModal', data);

    const { componentRef, close } = this.overlayService.open(
      CheckInResultModalComponent,
      {},
      { data }
    );

    componentRef.instance.closeModal = close;
  }
}
