import { Component, output, input, ChangeDetectionStrategy } from '@angular/core';

import { IconComponent } from '@shared/ui/icon/icon.component';
import { ButtonComponent } from '@shared/ui/button/button.component';

export type CheckinError =
  | 'no-location'
  | 'poor-accuracy'
  | 'no-nearby-pubs'
  | 'out-of-range'
  | 'not-authenticated';

export interface CheckinErrorDetails {
  type: CheckinError;
  message: string;
  pubName?: string;
  distance?: number;
  accuracy?: number;
}

@Component({
  selector: 'app-modal-checkin-attempt',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, ButtonComponent],
  template: `
    <div class="modal-content">
      <!-- Header -->
      <div class="modal-header">
        <app-icon
          [name]="getIconName()"
          size="xl"
          [customClass]="'error-icon'"
          weight="medium" />
        <h2 class="modal-title">{{ getTitle() }}</h2>
      </div>

      <!-- Message -->
      <div class="modal-body">
        <p class="error-message">{{ errorDetails().message }}</p>

        @if (errorDetails().type === 'out-of-range' && errorDetails().pubName) {
          <div class="pub-info">
            <app-icon name="local_bar" size="sm" />
            <span>{{ errorDetails().pubName }}</span>
            @if (errorDetails().distance) {
              <span class="distance">({{ (errorDetails().distance! / 1000).toFixed(1) }}km away)</span>
            }
          </div>
        }

        @if (errorDetails().type === 'poor-accuracy' && errorDetails().accuracy) {
          <div class="accuracy-info">
            <app-icon name="gps_not_fixed" size="sm" />
            <span>Current accuracy: ±{{ errorDetails().accuracy }}m</span>
            <span class="accuracy-note">(Need ±100m or better)</span>
          </div>
        }
      </div>

      <!-- Actions -->
      <div class="modal-actions">
        <app-button
          [variant]="'primary'"
          [size]="'md'"
          (click)="handleRetry()"
          class="retry-button">
          {{ getRetryText() }}
        </app-button>

        <app-button
          [variant]="'secondary'"
          [size]="'md'"
          (click)="handleClose()"
          class="close-button">
          Cancel
        </app-button>
      </div>

      <!-- Help text -->
      <div class="modal-footer">
        <p class="help-text">{{ getHelpText() }}</p>
      </div>
    </div>
  `,
  styles: `
    .modal-content {
      background: var(--background);
      border-radius: 16px;
      padding: 1.5rem;
      max-width: min(450px, 80vw);
      width: auto;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .modal-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      text-align: center;
    }

    .error-icon {
      color: var(--warning);
      opacity: 0.8;
    }

    .modal-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--text);
      margin: 0;
    }

    .modal-body {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      text-align: center;
    }

    .error-message {
      font-size: 1rem;
      color: var(--text-secondary);
      line-height: 1.5;
      margin: 0;
    }

    .pub-info, .accuracy-info {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem;
      background: var(--background-lighter);
      border-radius: 8px;
      font-size: 0.875rem;
      color: var(--text-muted);
    }

    .distance, .accuracy-note {
      color: var(--text-muted);
      font-size: 0.8rem;
    }

    .modal-actions {
      display: flex;
      gap: 1rem;
      flex-direction: column;
    }

    @media (min-width: 400px) {
      .modal-actions {
        align-items: center;
      }
    }

    .retry-button, .close-button {
      flex: 1;
    }

    .modal-footer {
      text-align: center;
      padding-top: 0.5rem;
      border-top: 1px solid var(--border);
    }

    .help-text {
      font-size: 0.8rem;
      color: var(--text-muted);
      line-height: 1.4;
      margin: 0;
    }
  `
})
export class ModalCheckinAttemptComponent {
  readonly errorDetails = input.required<CheckinErrorDetails>();
  readonly result = output<'retry' | 'close'>();

  getIconName(): string {
    switch (this.errorDetails().type) {
      case 'no-location':
        return 'location_off';
      case 'poor-accuracy':
        return 'gps_not_fixed';
      case 'no-nearby-pubs':
        return 'search_off';
      case 'out-of-range':
        return 'near_me_disabled';
      case 'not-authenticated':
        return 'login';
      default:
        return 'warning';
    }
  }

  getTitle(): string {
    switch (this.errorDetails().type) {
      case 'no-location':
        return 'Location Access Needed';
      case 'poor-accuracy':
        return 'GPS Accuracy Too Low';
      case 'no-nearby-pubs':
        return 'No Pubs Found Nearby';
      case 'out-of-range':
        return 'Too Far from Pub';
      case 'not-authenticated':
        return 'Sign In Required';
      default:
        return 'Check-in Not Available';
    }
  }

  getRetryText(): string {
    switch (this.errorDetails().type) {
      case 'no-location':
        return 'Enable Location';
      case 'poor-accuracy':
        return 'Try Again';
      case 'no-nearby-pubs':
        return 'Refresh Location';
      case 'out-of-range':
        return 'Retry';
      case 'not-authenticated':
        return 'Sign In';
      default:
        return 'Retry';
    }
  }

  getHelpText(): string {
    switch (this.errorDetails().type) {
      case 'no-location':
        return 'Check your browser settings to allow location access for this site.';
      case 'poor-accuracy':
        return 'Try moving near a window or outside for better GPS signal.';
      case 'no-nearby-pubs':
        return 'Make sure you\'re within 50km of a Wetherspoons pub.';
      case 'out-of-range':
        return 'Get within 200 meters of the pub to check in.';
      case 'not-authenticated':
        return 'You need to be signed in to check in to pubs.';
      default:
        return 'Please try again or contact support if the problem persists.';
    }
  }

  handleRetry(): void {
    this.result.emit('retry');
  }

  handleClose(): void {
    this.result.emit('close');
  }
}
