// src/app/check-in/ui/modal-checkin-landlord/modal-checkin-landlord.component.ts
import { Component, inject, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { LandlordStore } from '../../../landlord/data-access/landlord.store';

type LandlordModalData = {
  isNewLandlord: boolean;
  landlordMessage?: string;
  pub?: any;
};

@Component({
  selector: 'app-modal-checkin-landlord',
  imports: [CommonModule, ButtonComponent],
  template: `
    <div class="modal-container" [class.new-landlord]="data().isNewLandlord">
      <div class="modal-header">
        <h2>{{ title() }}</h2>
      </div>

      <div class="modal-body">
        @if (data().isNewLandlord) {
          <div class="new-landlord-content">
            <div class="crown-icon">👑</div>

            <p><strong>Congratulations!</strong></p>
            <p>You're now the landlord of {{ data().pub?.name }}!</p>

            @if (data().landlordMessage) {
              <div class="landlord-message">
                <p>{{ data().landlordMessage }}</p>
              </div>
            }

            <!-- Dev debug info -->
            @if (isDevelopment()) {
              <details class="debug-info">
                <summary>🐛 LandlordStore State</summary>
                <pre>{{ debugLandlordState() | json }}</pre>
              </details>
            }
          </div>
        } @else {
          <div class="existing-landlord-content">
            <div class="info-icon">ℹ️</div>

            <p>{{ data().landlordMessage || 'Check-in complete!' }}</p>

            @if (currentLandlord()) {
              <div class="current-landlord">
                <p><strong>Current Landlord:</strong></p>
                <!-- <p>{{ currentLandlord()?.displayName || 'Unknown' }}</p> -->
                <p>{{ currentLandlord() | json }}</p>
              </div>
            }

            <!-- Dev debug info -->
            @if (isDevelopment()) {
              <details class="debug-info">
                <summary>🐛 LandlordStore State</summary>
                <pre>{{ debugLandlordState() | json }}</pre>
              </details>
            }
          </div>
        }
      </div>

      <div class="modal-footer">
        <div class="button-group">
          <app-button
            variant="secondary"
            (onClick)="handlePrevious()"
          >
            ← Back
          </app-button>

          <app-button
            variant="secondary"
            (onClick)="handleDismiss()"
          >
            Close
          </app-button>

          <app-button
            variant="primary"
            (onClick)="handleNavigate()"
          >
            View Pub
          </app-button>
        </div>
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

    .modal-container.new-landlord {
      border-color: #ffd700;
      background: linear-gradient(135deg, #ffd700 0%, #ffed4a 100%);
      color: #000;
    }

    .modal-header, .modal-body, .modal-footer {
      padding: 1.5rem;
    }

    .modal-header {
      border-bottom: 1px solid var(--color-subtleLighter);
      text-align: center;
    }

    .modal-container.new-landlord .modal-header {
      border-bottom-color: rgba(0, 0, 0, 0.2);
    }

    .modal-header h2 {
      margin: 0;
      color: var(--color-textPrimary);
    }

    .modal-container.new-landlord .modal-header h2 {
      color: #000;
    }

    .modal-footer {
      border-top: 1px solid var(--color-subtleLighter);
    }

    .modal-container.new-landlord .modal-footer {
      border-top-color: rgba(0, 0, 0, 0.2);
    }

    .crown-icon, .info-icon {
      font-size: 3rem;
      text-align: center;
      margin-bottom: 1rem;
    }

    .new-landlord-content, .existing-landlord-content {
      text-align: center;
    }

    .new-landlord-content p, .existing-landlord-content p {
      margin: 0.5rem 0;
    }

    .landlord-message {
      background: rgba(0, 0, 0, 0.1);
      padding: 1rem;
      border-radius: 6px;
      margin: 1rem 0;
    }

    .current-landlord {
      background: var(--color-subtleLighter);
      padding: 1rem;
      border-radius: 6px;
      margin: 1rem 0;
    }

    .modal-container.new-landlord .current-landlord {
      background: rgba(0, 0, 0, 0.1);
    }

    .button-group {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .debug-info {
      background: rgba(248, 249, 250, 0.9);
      padding: 0.5rem;
      border-radius: 4px;
      margin-top: 1rem;
      font-size: 0.75rem;
      text-align: left;
    }

    .modal-container.new-landlord .debug-info {
      background: rgba(0, 0, 0, 0.1);
      color: #000;
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
export class ModalCheckinLandlordComponent {
  // ✅ Inputs
  readonly data = input.required<LandlordModalData>();
  readonly userStage = input<string>('');

  // ✅ Outputs for orchestration
  readonly navigate = output<void>();
  readonly dismiss = output<void>();
  readonly previousModal = output<void>();

  // ✅ Store access
  private readonly landlordStore = inject(LandlordStore);

  // ✅ Computed properties
  readonly title = computed(() =>
    this.data().isNewLandlord ? 'New Landlord!' : 'Landlord Status'
  );

  readonly currentLandlord = computed(() => {
    const pubId = this.data().pub?.id;
    if (!pubId) return null;
    return this.landlordStore.get(pubId);
  });

  // ✅ Event handlers
  handleNavigate(): void {
    console.log('[ModalCheckinLandlord] Navigate requested');
    this.navigate.emit();
  }

  handleDismiss(): void {
    console.log('[ModalCheckinLandlord] Dismiss requested');
    this.dismiss.emit();
  }

  handlePrevious(): void {
    console.log('[ModalCheckinLandlord] Previous modal requested');
    this.previousModal.emit();
  }

  // ✅ Utility methods
  isDevelopment(): boolean {
    return !environment.production;
  }

  debugLandlordState(): any {
    const pubId = this.data().pub?.id;
    return {
      pubId,
      currentLandlord: this.currentLandlord(),
      loading: this.landlordStore.loading(),
      error: this.landlordStore.error(),
    };
  }
}

// ✅ Add environment import
import { environment } from '../../../../environments/environment';
