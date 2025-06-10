// src/app/check-in/ui/check-in-result-modal/check-in-result-modal.component.ts
import { Component, inject, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import type { CheckIn } from '../../utils/check-in.model';
import type { Pub } from '../../../pubs/utils/pub.models';
import { environment } from '../../../../environments/environment';


// Enhanced modal with full debugging info
export type CheckInResultData = {
  success: boolean;
  checkin?: CheckIn;
  pub?: Pub;
  isNewLandlord?: boolean;
  landlordMessage?: string;
  error?: string;
  // Add debugging fields
  currentLandlord?: any;
  todayLandlord?: any;
  userWhoCheckedIn?: string;
  debugInfo?: {
    pubLandlordStatus: string;
    checkinTime: string;
    landlordClaimedAt?: string;
    existingLandlordUserId?: string;
  };
};

@Component({
  selector: 'app-check-in-result-modal',
  imports: [CommonModule, ButtonComponent],
  template: `
    <div class="modal-container">
      <div class="modal-header">
        <h2>{{ title() }}</h2>
      </div>

      <div class="modal-body">
        @if (data().success) {
          <div class="success-content">
            <p><strong>✅ Checked in to {{ data().pub?.name }}</strong></p>
            <p>{{ formatTimestamp() }}</p>

            <!-- Landlord Status -->
            @if (data().isNewLandlord) {
              <div class="landlord-new">
                <p><strong>👑 You're the new landlord!</strong></p>
              </div>
            } @else {
              <div class="landlord-existing">
                <p><strong>{{ data().landlordMessage }}</strong></p>
                @if (data().debugInfo?.existingLandlordUserId) {
                  <p><small>Current landlord: {{ data().debugInfo?.existingLandlordUserId }}</small></p>
                }
              </div>
            }

            <!-- Development Debug Info -->
            @if (isDevelopment()) {
              <details class="debug-info">
                <summary>🐛 Debug Info</summary>
                <pre>{{ debugText() }}</pre>
              </details>
            }

            @if (data().checkin?.badgeName) {
              <p>🏅 New badge: {{ data().checkin?.badgeName }}</p>
            }
          </div>
        } @else {
          <div class="error-content">
            <p><strong>❌ {{ data().error }}</strong></p>
          </div>
        }
      </div>

      <div class="modal-footer">
        @if (data().success) {
          <app-button
            [variant]="'primary'"
            [fullWidth]="true"
            (onClick)="viewPubDetails()"
          >
            View {{ data().pub?.name }}
          </app-button>
        } @else {
          <app-button
            [variant]="'primary'"
            (onClick)="closeModal()"
          >
            Try Again
          </app-button>
        }
      </div>
    </div>
  `,
  styles: [`
    .modal-container {
      background: var(--color-background);
      border: 1px solid var(--color-subtleDarker);
      border-radius: 8px;
      max-width: 500px;
      width: 90vw;
    }

    .modal-header, .modal-body, .modal-footer {
      padding: 1rem;
    }

    .modal-header {
      border-bottom: 1px solid var(--color-subtleLighter);
    }

    .modal-footer {
      border-top: 1px solid var(--color-subtleLighter);
    }

    .landlord-new {
      background: #ffd700;
      padding: 1rem;
      border-radius: 4px;
      margin: 1rem 0;
    }

    .landlord-existing {
      background: var(--color-subtleLighter);
      padding: 1rem;
      border-radius: 4px;
      margin: 1rem 0;
    }

    .debug-info {
      background: #f0f0f0;
      padding: 1rem;
      border-radius: 4px;
      margin: 1rem 0;
      font-size: 0.8rem;
    }

    .debug-info pre {
      margin: 0;
      white-space: pre-wrap;
    }

    .success-content p,
    .error-content p {
      margin: 0.5rem 0;
    }
  `]
})
export class CheckInResultModalComponent {
  readonly data = input.required<CheckInResultData>();

  private readonly router = inject(Router);

  readonly title = computed(() =>
    this.data().success ? 'Check-in Complete' : 'Check-in Failed'
  );

  closeModal: () => void = () => {};

  isDevelopment(): boolean {
    return !environment.production;
  }

  debugText(): string {
    const data = this.data();
    return JSON.stringify({
      checkin: data.checkin,
      isNewLandlord: data.isNewLandlord,
      currentLandlord: data.currentLandlord,
      todayLandlord: data.todayLandlord,
      debugInfo: data.debugInfo,
      landlordMessage: data.landlordMessage,
    }, null, 2);
  }

  formatTimestamp(): string {
    if (!this.data().checkin?.timestamp) return '';
    return this.data().checkin!.timestamp.toDate().toLocaleString();
  }

  viewPubDetails(): void {
    const pubId = this.data().pub?.id;
    if (pubId) {
      this.closeModal();
      this.router.navigate(['/pubs', pubId]);
    }
  }
}
