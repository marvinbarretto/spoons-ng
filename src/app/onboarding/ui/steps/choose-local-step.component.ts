import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { HomePubSelectionWidgetComponent } from '../home-pub-selection-widget/home-pub-selection-widget.component';
import type { Pub } from '../../../pubs/utils/pub.models';
import { ButtonSize } from '@shared/ui/button/button.params';


@Component({
  selector: 'app-choose-local-step',
  imports: [ButtonComponent, HomePubSelectionWidgetComponent],
  template: `
    <div class="step choose-local-step">
      <h1>Choose Your Local,
        <span class="username">
          @if (displayName()) { {{ displayName() }}!}
        </span>
      </h1>
      <p class="subtitle">Pick your regular spot for bonus points!</p>

      @if (!locationGranted() && !locationRequired() && !hasExistingLocationPermission()) {
        <!-- Initial state - no location permission -->
        <div class="no-location-state">
          <div class="location-prompt">
            <div class="prompt-icon">📍</div>
            <p class="prompt-text">Enable location to see nearby pubs</p>
            <app-button
              variant="primary"
              [size]="ButtonSize.LARGE"
              (onClick)="requestLocation()"
            >
              Enable Location
            </app-button>
          </div>
        </div>
      }

      @if (locationRequired()) {
        <!-- Requesting location -->
        <div class="location-loading">
          <div class="loading-spinner"></div>
          <p>Getting your location...</p>
        </div>
      }

      <!-- Show pub selection when location available or being requested -->
      @if (locationGranted() || hasExistingLocationPermission() || locationRequired()) {
        <div class="pub-selection-container" [class.disabled]="locationRequired()">
          <app-home-pub-selection-widget
            [hasLocationPermission]="locationGranted() || hasExistingLocationPermission()"
            (pubSelected)="onPubSelected($event)"
          />
        </div>
      }

      <div class="step-actions">
        <app-button
          variant="secondary"
          [size]="ButtonSize.MEDIUM"
          (onClick)="onBack()"
          [disabled]="locationRequired()"
        >
          Back
        </app-button>

        @if (selectedPub()) {
          <app-button
            variant="primary"
            [size]="ButtonSize.LARGE"
            (onClick)="onContinue()"
            [disabled]="locationRequired() || loading()"
            [loading]="loading()"
            loadingText="Completing setup..."
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
    }

    .username {
      color: gold;
    }

    .subtitle {
      font-size: 1.125rem;
      margin: 0 0 2rem 0;
    }

    .no-location-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 2rem 0;
    }

    .location-prompt {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 2rem;
      background: var(--background-lighter);
      border-radius: 12px;
      border: 1px solid var(--border);
      text-align: center;
      max-width: 400px;
    }

    .prompt-icon {
      font-size: 3rem;
    }

    .prompt-text {
      margin: 0;
      font-size: 1.125rem;
      color: var(--text);
      font-weight: 500;
    }

    .location-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      margin: 2rem 0;
      color: var(--text);
    }

    .loading-spinner {
      width: 2rem;
      height: 2rem;
      border: 3px solid var(--border);
      border-top-color: var(--accent);
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
  readonly hasExistingLocationPermission = input<boolean>(false);
  readonly loading = input<boolean>(false);
  readonly displayName = input<string>('');

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

  onBack(): void {
    console.log('[ChooseLocalStep] Going back to profile step');
    this.back.emit();
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
