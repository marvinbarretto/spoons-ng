import { Component, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { ButtonComponent } from '@shared/ui/button/button.component';

@Component({
  selector: 'app-welcome-message-step',
  imports: [ButtonComponent],
  template: `
    <div class="step">
      <div class="hero-section">
        <h1>🍺 Think you love Spoons?<br>Prove it.</h1>
        <p>Accumulate points with every visit. Complete missions. 
        Become the Spoons champion you were born to be.</p>
      </div>
      
      <div class="game-benefits">
        <div class="benefit">
          <span class="icon">🎯</span>
          <span>Complete Missions</span>
        </div>
        <div class="benefit">
          <span class="icon">🗺️</span>
          <span>Travel = More Points</span>
        </div>
        <div class="benefit">
          <span class="icon">🏆</span>
          <span>Win Prizes</span>
        </div>
        <div class="benefit">
          <span class="icon">😈</span>
          <span>Automatic Sex Appeal</span>
        </div>
      </div>

      <div class="cta-section">
        <app-button variant="primary" (onClick)="continue.emit()">
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

    .game-benefits {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin: 0;
    }

    .benefit {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      padding: 1.5rem 1rem;
      background: var(--surface-secondary, rgba(255, 255, 255, 0.1));
      border-radius: 12px;
      backdrop-filter: blur(10px);
      text-align: center;
      transition: transform 0.2s ease, background-color 0.2s ease;
    }

    .benefit:hover {
      transform: translateY(-2px);
      background: var(--surface-secondary, rgba(255, 255, 255, 0.15));
    }

    .benefit .icon {
      font-size: 2rem;
      flex-shrink: 0;
    }

    .benefit span:last-child {
      color: var(--text-primary, white);
      font-weight: 600;
      font-size: 0.9rem;
      line-height: 1.3;
    }

    .cta-section {
      text-align: center;
      margin-top: 1rem;
    }

    .cta-section app-button {
      transform: scale(1.1);
      min-width: 200px;
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
        font-size: 2rem;
      }

      .hero-section p {
        font-size: 1rem;
      }

      .game-benefits {
        gap: 0.75rem;
      }
      
      .benefit {
        padding: 1rem 0.75rem;
      }

      .benefit .icon {
        font-size: 1.75rem;
      }

      .cta-section app-button {
        transform: scale(1.05);
        min-width: 180px;
      }
    }

    @media (max-width: 480px) {
      .game-benefits {
        grid-template-columns: 1fr;
        gap: 1rem;
      }

      .benefit {
        flex-direction: row;
        text-align: left;
        padding: 1rem;
      }

      .benefit .icon {
        font-size: 1.5rem;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WelcomeMessageStepComponent {
  readonly continue = output<void>();

  // Real user state (default: true)
  readonly isRealUser = signal(true);

  toggleRealUser(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.isRealUser.set(target.checked);
    console.log('[WelcomeStep] Real user toggled:', target.checked);
  }
}