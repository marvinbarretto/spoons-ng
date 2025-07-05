import { Component, input, output, inject, ChangeDetectionStrategy } from '@angular/core';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { HomePubSelectionWidgetComponent } from '../home-pub-selection-widget/home-pub-selection-widget.component';
import type { Pub } from '../../../pubs/utils/pub.models';
import { ButtonSize } from '@shared/ui/button/button.params';


@Component({
  selector: 'app-choose-local-step',
  imports: [ButtonComponent, HomePubSelectionWidgetComponent],
  template: `
    <div class="step choose-local-step">
      <h1>Choose Your Local</h1>
      <p class="subtitle">Pick your regular spot for bonus points!</p>

      @if (!locationGranted() && !locationRequired()) {
        <!-- Initial state - show pub selector with location request -->
        <div class="location-notice">
          <div class="notice-icon">📍</div>
          <p class="notice-text">We need location access to verify check-ins</p>
          <app-button
            variant="secondary"
            [size]="ButtonSize.SM"
            (onClick)="requestLocation()"
          >
            Enable Location
          </app-button>
        </div>
      }

      @if (locationRequired()) {
        <!-- Requesting location -->
        <div class="location-loading">
          <div class="loading-spinner"></div>
          <p>Getting your location...</p>
        </div>
      }

      <!-- Always show pub selection -->
      <div class="pub-selection-container" [class.disabled]="locationRequired()">
        <app-home-pub-selection-widget
          (pubSelected)="onPubSelected($event)"
        />
      </div>

      <div class="step-actions">
        <app-button
          variant="secondary"
          [size]="ButtonSize.MD"
          (onClick)="back.emit()"
          [disabled]="locationRequired()"
        >
          Back
        </app-button>

        @if (selectedPub()) {
          <app-button
            variant="primary"
            [size]="ButtonSize.LG"
            (onClick)="onContinue()"
            [disabled]="locationRequired()"
          >
            Continue
          </app-button>
        }
      </div>
    </div>
  `,
  styles: `
    .choose-local-step {
      max-width: 700px;
      width: 100%;
      margin: 0 auto;
    }

    h1 {
      font-size: 2.5rem;
      margin: 0 0 0.5rem 0;
      color: var(--text-on-dark, white);
    }

    .subtitle {
      font-size: 1.125rem;
      margin: 0 0 2rem 0;
      color: rgba(255, 255, 255, 0.9);
    }

    .location-notice {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      text-align: center;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .notice-icon {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }

    .notice-text {
      margin: 0 0 1rem 0;
      font-size: 1rem;
      color: var(--text-on-dark, white);
    }

    .location-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      margin: 2rem 0;
      color: var(--text-on-dark, white);
    }

    .loading-spinner {
      width: 2rem;
      height: 2rem;
      border: 3px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .pub-selection-container {
      margin: 2rem 0;
      transition: opacity 0.3s ease;
    }

    .pub-selection-container.disabled {
      opacity: 0.5;
      pointer-events: none;
    }

    .step-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-top: 2rem;
    }

    .step-actions app-button {
      min-width: 120px;
    }

    @media (max-width: 768px) {
      h1 {
        font-size: 2rem;
      }

      .subtitle {
        font-size: 1rem;
      }

      .step-actions {
        flex-direction: column;
        width: 100%;
        max-width: 300px;
        margin: 2rem auto 0;
      }

      .step-actions app-button {
        width: 100%;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChooseLocalStepComponent {
  // Inputs
  readonly selectedPub = input<Pub | null>(null);
  readonly locationGranted = input<boolean>(false);
  readonly locationRequired = input<boolean>(false);

  // Outputs
  readonly pubSelected = output<Pub | null>();
  readonly locationRequested = output<void>();
  readonly back = output<void>();
  readonly complete = output<void>();

  readonly ButtonSize = ButtonSize;

  onPubSelected(pub: Pub | null): void {
    console.log('[ChooseLocalStep] Pub selected:', pub?.name || 'none');
    this.pubSelected.emit(pub);
  }

  requestLocation(): void {
    console.log('[ChooseLocalStep] Location permission requested');
    this.locationRequested.emit();
  }

  onContinue(): void {
    const pub = this.selectedPub();
    if (pub) {
      console.log('[ChooseLocalStep] Continuing with selected pub:', pub.name);
      this.complete.emit();
    } else {
      console.log('[ChooseLocalStep] Cannot continue without pub selection');
    }
  }
}
