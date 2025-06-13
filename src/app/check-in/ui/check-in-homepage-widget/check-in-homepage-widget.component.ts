// src/app/check-in/ui/check-in-homepage-widget/check-in-homepage-widget.component.ts
import { Component, input, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CheckinStore } from '../../data-access/check-in.store';
import { CheckInModalService } from '../../data-access/check-in-modal.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import type { Pub } from '../../../pubs/utils/pub.models';

type CheckInResultData = {
  success: boolean;
  checkin?: any;
  pub?: Pub;
  isNewLandlord?: boolean;
  landlordMessage?: string;
  badges?: any[];
  error?: string;
};

@Component({
  selector: 'app-check-in-homepage-widget',
  imports: [ButtonComponent],
  template: `
    <div class="check-in-widget">
      @if (canCheckIn()) {
        <div class="check-in-ready">
          <h3>Check into {{ closestPub().name }}</h3>

          <app-button
            variant="primary"
            [fullWidth]="true"
            [loading]="isCheckingIn()"
            [disabled]="isCheckingIn() || !canCheckIn()"
            (onClick)="handleCheckIn()"
          >
            {{ isCheckingIn() ? 'Checking in...' : '✅ Check In' }}
          </app-button>
        </div>
      } @else {
        <div class="check-in-unavailable">
          <h3>{{ closestPub().name }}</h3>
          <p class="distance">{{ distanceKm() }}km away</p>
          <p class="status">{{ getUnavailableReason() }}</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .check-in-widget {
      background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
      color: white;
      border-radius: 12px;
      padding: 1.5rem;
      text-align: center;
      box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
    }

    .check-in-ready h3,
    .check-in-unavailable h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1.3rem;
      font-weight: 600;
    }

    .distance {
      margin: 0 0 1.5rem 0;
      font-size: 0.95rem;
      opacity: 0.9;
    }

    .check-in-unavailable {
      background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
      color: rgba(255, 255, 255, 0.9);
    }

    .status {
      margin: 0;
      font-weight: 500;
      color: #ffc107;
      font-size: 0.95rem;
    }

    /* Button overrides for this context */
    :host ::ng-deep .btn-primary {
      background: rgba(255, 255, 255, 0.95);
      color: #28a745;
      border: 2px solid rgba(255, 255, 255, 0.3);
      font-weight: 600;
      font-size: 1.1rem;
      padding: 0.875rem 2rem;
    }

    :host ::ng-deep .btn-primary:hover:not(:disabled) {
      background: white;
      color: #1e7e34;
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }

    :host ::ng-deep .btn-primary:disabled {
      background: rgba(255, 255, 255, 0.6);
      color: rgba(40, 167, 69, 0.7);
      cursor: not-allowed;
    }

    /* Mobile responsive */
    @media (max-width: 480px) {
      .check-in-widget {
        padding: 1.25rem;
      }

      .check-in-ready h3,
      .check-in-unavailable h3 {
        font-size: 1.2rem;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckInHomepageWidgetComponent {
  // ✅ Modern input signals
  readonly closestPub = input.required<Pub>();
  readonly canCheckIn = input.required<boolean>();
  readonly distanceKm = input.required<string>();

  // ✅ Store and service injections
  private readonly checkinStore = inject(CheckinStore);
  private readonly checkInModalService = inject(CheckInModalService);

  // ✅ Local state
  private readonly _isCheckingIn = signal(false);
  readonly isCheckingIn = this._isCheckingIn.asReadonly();

  /**
   * Get human-readable reason why check-in is unavailable
   */
  getUnavailableReason(): string {
    if (!this.canCheckIn()) {
      // TODO: Add more specific reasons based on store state
      // - Too far away
      // - Already checked in today
      // - Pub is closed
      return 'Too far to check in';
    }
    return '';
  }

  /**
   * Handle check-in button click
   */
  async handleCheckIn(): Promise<void> {
    if (this._isCheckingIn() || !this.canCheckIn()) {
      return;
    }

    const pub = this.closestPub();
    console.log('[CheckinWidget] Starting check-in for:', pub.name);

    this._isCheckingIn.set(true);

    try {
      // ✅ Delegate to store
      await this.checkinStore.checkinToPub(pub.id);

      // ✅ Get results from store
      const latestCheckin = this.checkinStore.checkinSuccess();
      const landlordMessage = this.checkinStore.landlordMessage();

      if (latestCheckin) {
        const isNewLandlord = latestCheckin.madeUserLandlord === true;

        this.showResultModal({
          success: true,
          checkin: latestCheckin,
          pub: pub,
          isNewLandlord,
          landlordMessage: landlordMessage || undefined,
          badges: [], // TODO: Add badges when available
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
        error: error?.message || 'Check-in failed. Please try again.'
      });
    } finally {
      this._isCheckingIn.set(false);
    }
  }

  /**
   * ✅ Use the new modal service for orchestration
   */
  private showResultModal(data: CheckInResultData): void {
    console.log('[CheckinWidget] Showing result modal:', data);

    // ✅ Delegate to modal service for orchestration
    this.checkInModalService.showCheckInResults(data);
  }
}
