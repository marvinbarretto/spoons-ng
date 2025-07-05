import { Component, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { ButtonComponent } from '@shared/ui/button/button.component';

@Component({
  selector: 'app-welcome-message-step',
  imports: [ButtonComponent],
  template: `
    <div class="step">
      <!-- Corner controls for real user check -->
      <div class="corner-controls">
        <label class="real-user-check">
          <input type="checkbox" [checked]="isRealUser()" (change)="toggleRealUser($event)">
          I'm real
        </label>
      </div>

      <h1>🍺 It's the stupidest competition you'll actually care about winning</h1>
      <p>Track every Wetherspoons you've actually been to - because someone has to, and it might as well be you.</p>
      
      <div class="game-benefits">
        <div class="benefit">
          <span class="icon">📸</span>
          <div>
            <strong>Photograph Pub Carpets</strong>
            <span>"I photograph pub carpets" - instant conversation starter</span>
          </div>
        </div>
        <div class="benefit">
          <span class="icon">✈️</span>
          <div>
            <strong>Perfect for Travelers</strong>
            <span>Stuck in Birmingham for 3 days? At least you can tick off The Moon & Sixpence</span>
          </div>
        </div>
        <div class="benefit">
          <span class="icon">🤝</span>
          <div>
            <strong>Authentically British</strong>
            <span>Nobody expects carpets to be unique - genuine surprise and delight</span>
          </div>
        </div>
        <div class="benefit">
          <span class="icon">🎉</span>
          <div>
            <strong>Brilliantly Absurd</strong>
            <span>You can brag about it precisely because it's ridiculous</span>
          </div>
        </div>
      </div>

      <app-button variant="primary" (onClick)="continue.emit()">
        Let's Start Customizing!
      </app-button>
    </div>
  `,
  styles: `
    .step {
      position: relative;
    }

    .corner-controls {
      position: absolute;
      top: 0;
      right: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      align-items: flex-end;
    }

    .real-user-check {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.9);
      cursor: pointer;
    }

    .real-user-check input[type="checkbox"] {
      width: 16px;
      height: 16px;
      accent-color: var(--primary, #4ade80);
    }

    .game-benefits {
      display: grid;
      gap: 1rem;
      margin: 2rem 0;
      text-align: left;
    }

    .benefit {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      backdrop-filter: blur(10px);
    }

    .benefit .icon {
      font-size: 1.5rem;
      flex-shrink: 0;
      margin-top: 0.25rem;
    }

    .benefit div {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .benefit strong {
      color: white;
      font-weight: 600;
      font-size: 1rem;
    }

    .benefit span:last-child {
      color: rgba(255, 255, 255, 0.8);
      font-size: 0.875rem;
      line-height: 1.4;
    }

    app-button {
      margin-top: 1rem;
    }

    @media (max-width: 768px) {
      .corner-controls {
        position: static;
        margin-bottom: 1rem;
        align-items: center;
      }

      .game-benefits {
        gap: 0.75rem;
      }
      
      .benefit {
        padding: 0.75rem;
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