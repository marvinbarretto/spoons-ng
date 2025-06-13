// src/app/check-in/ui/modal-checkin-success/modal-checkin-success.component.ts
import { Component, inject, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { CheckinStore } from '../../data-access/check-in.store';

type CheckInResultData = {
  success: boolean;
  checkin?: any;
  pub?: any;
  isNewLandlord?: boolean;
  landlordMessage?: string;
  badges?: any[];
  error?: string;
};

@Component({
  selector: 'app-modal-checkin-success',
  imports: [CommonModule, ButtonComponent],
  template: `
    <div class="modal-container" [class.success]="data().success">
      <div class="modal-header">
        <h2>{{ title() }}</h2>
      </div>

      <div class="modal-body">
        @if (data().success) {
          <div class="success-content">
            <div class="main-icon">✅</div>

            <p><strong>Checked into {{ data().pub?.name }}!</strong></p>

            @if (data().checkin?.timestamp) {
              <p class="timestamp">
                {{ formatTimestamp(data().checkin!.timestamp) }}
              </p>
            }

            @if (data().badges && data().badges!.length > 0) {
              <div class="badge-awards">
                <p>🏅 New Badge{{ data().badges!.length > 1 ? 's' : '' }} Earned!</p>
                @for (badge of data().badges!; track badge.id) {
                  <div class="badge-item">{{ badge.name }}</div>
                }
              </div>
            }

            <!-- Dev debug info -->
            @if (isDevelopment()) {
              <details class="debug-info">
                <summary>🐛 CheckinStore State</summary>
                <pre>{{ debugCheckinState() | json }}</pre>
              </details>
            }
          </div>
        } @else {
          <div class="error-content">
            <div class="main-icon">❌</div>
            <p><strong>{{ data().error || 'Check-in failed' }}</strong></p>
          </div>
        }
      </div>

      <div class="modal-footer">
        @if (data().success) {
          <div class="button-group">
            <app-button
              variant="secondary"
              (onClick)="handleDismiss()"
            >
              Close
            </app-button>

            @if (hasLandlordInfo()) {
              <app-button
                variant="primary"
                (onClick)="handleNext()"
              >
                Next →
              </app-button>
            } @else {
              <app-button
                variant="primary"
                (onClick)="handleNavigate()"
              >
                View Pub
              </app-button>
            }
          </div>
        } @else {
          <app-button
            variant="primary"
            [fullWidth]="true"
            (onClick)="handleDismiss()"
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
      max-width: 400px;
      width: 90vw;
    }

    .modal-container.success {
      border-color: #28a745;
    }

    .modal-header, .modal-body, .modal-footer {
      padding: 1.5rem;
    }

    .modal-header {
      border-bottom: 1px solid var(--color-subtleLighter);
      text-align: center;
    }

    .modal-header h2 {
      margin: 0;
      color: var(--color-textPrimary);
    }

    .modal-footer {
      border-top: 1px solid var(--color-subtleLighter);
    }

    .main-icon {
      font-size: 3rem;
      text-align: center;
      margin-bottom: 1rem;
    }

    .success-content {
      text-align: center;
    }

    .success-content p {
      margin: 0.5rem 0;
    }

    .timestamp {
      font-size: 0.9rem;
      color: var(--color-textSecondary);
    }

    .badge-awards {
      background: var(--color-subtleLighter);
      padding: 1rem;
      border-radius: 6px;
      margin: 1rem 0;
    }

    .badge-item {
      background: #28a745;
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      margin: 0.25rem;
      display: inline-block;
      font-size: 0.9rem;
    }

    .error-content {
      text-align: center;
      color: #dc3545;
    }

    .button-group {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }

    .debug-info {
      background: #f8f9fa;
      padding: 0.5rem;
      border-radius: 4px;
      margin-top: 1rem;
      font-size: 0.75rem;
      text-align: left;
    }

    .debug-info pre {
      margin: 0.5rem 0 0 0;
      white-space: pre-wrap;
    }

    @media (max-width: 480px) {
      .button-group {
        flex-direction: column;
      }
    }
  `]
})
export class ModalCheckinSuccessComponent {
  // ✅ Inputs
  readonly data = input.required<CheckInResultData>();
  readonly userStage = input<string>('');

  // ✅ Outputs for orchestration
  readonly navigate = output<void>();
  readonly dismiss = output<void>();
  readonly nextModal = output<void>();

  // ✅ Store access for debugging
  private readonly checkinStore = inject(CheckinStore);

  // ✅ Computed properties
  readonly title = computed(() =>
    this.data().success ? 'Check-in Successful!' : 'Check-in Failed'
  );

  readonly hasLandlordInfo = computed(() =>
    this.data().success && (this.data().isNewLandlord || this.data().landlordMessage)
  );

  // ✅ Event handlers
  handleNavigate(): void {
    console.log('[ModalCheckinSuccess] Navigate requested');
    this.navigate.emit();
  }

  handleDismiss(): void {
    console.log('[ModalCheckinSuccess] Dismiss requested');
    this.dismiss.emit();
  }

  handleNext(): void {
    console.log('[ModalCheckinSuccess] Next modal requested');
    this.nextModal.emit();
  }

  // ✅ Utility methods
  formatTimestamp(timestamp: any): string {
    if (!timestamp) return '';

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString();
    } catch {
      return 'Just now';
    }
  }

  isDevelopment(): boolean {
    return !environment.production;
  }

  debugCheckinState(): any {
    return {
      loading: this.checkinStore.loading(),
      error: this.checkinStore.error(),
      checkinSuccess: this.checkinStore.checkinSuccess(),
      landlordMessage: this.checkinStore.landlordMessage(),
      dataCount: this.checkinStore.data().length
    };
  }
}

// ✅ Add environment import
import { environment } from '../../../../environments/environment';
