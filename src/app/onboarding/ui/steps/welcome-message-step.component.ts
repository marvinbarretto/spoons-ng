import { Component, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { ButtonSize } from '@shared/ui/button/button.params';

@Component({
  selector: 'app-welcome-message-step',
  imports: [ButtonComponent],
  template: `
    <div class="step">
      <div class="hero-section">
        <h1>🍺<br>Think you love Spoons?<br>Prove it.</h1>
        <p>Accumulate points with every visit. Complete missions.
        Become the Spoons champion you were born to be.</p>
      </div>



      <div class="cta-section">
        <app-button
          variant="primary"
          [size]="ButtonSize.LARGE"
          [loading]="loading()"
          loadingText="Getting started..."
          (onClick)="onContinue()"
        >
          Continue
        </app-button>
      </div>

      <!-- Alpha testing checkbox -->
      <div class="alpha-testing-check">
        <label class="real-user-check">
          <input type="checkbox" [checked]="isRealUser()" (change)="toggleRealUser($event)">
          Alpha testing - I'm real, don't delete my data
        </label>
      </div>
    </div>
  `,
  styles: `
    .step {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 2rem;
      max-width: 500px;
      margin: 0 auto;
    }

    .hero-section {
      text-align: center;
      margin-bottom: 1rem;
    }

    .hero-section h1 {
      font-size: 2.5rem;
      line-height: 1.2;
      margin-bottom: 1rem;
      font-weight: 700;
    }

    .hero-section p {
      font-size: 1.125rem;
      line-height: 1.6;
      color: var(--text-primary, white);
      margin: 0;
    }

    .cta-section {
      text-align: center;
      margin-top: 1rem;
    }


    .alpha-testing-check {
      margin-top: 2rem;
      text-align: center;
    }

    .real-user-check {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      color: var(--text-primary, white);
      cursor: pointer;
    }

    .real-user-check input[type="checkbox"] {
      width: 16px;
      height: 16px;
      accent-color: var(--primary, #4ade80);
    }

    @media (max-width: 768px) {
      .step {
        gap: 1.5rem;
      }

      .hero-section h1 {
        font-size: 3rem;
      }

      .hero-section p {
        font-size: 1rem;
      }

    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WelcomeMessageStepComponent {
  // Inputs
  readonly loading = input<boolean>(false);
  readonly realUser = input<boolean>(true);

  // Outputs
  readonly continue = output<void>();
  readonly realUserChanged = output<boolean>();

  // Real user state - initialize from input
  readonly isRealUser = signal(this.realUser());

  // Expose ButtonSize for template
  readonly ButtonSize = ButtonSize;

  toggleRealUser(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.isRealUser.set(target.checked);
    this.realUserChanged.emit(target.checked);
    console.log('[WelcomeStep] Real user toggled:', target.checked);
  }

  onContinue(): void {
    console.log('[WelcomeStep] Continuing to next step');
    this.continue.emit();
  }
}
