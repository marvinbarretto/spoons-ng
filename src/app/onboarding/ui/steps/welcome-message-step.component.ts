import { Component, output, ChangeDetectionStrategy } from '@angular/core';
import { ButtonComponent } from '@shared/ui/button/button.component';

@Component({
  selector: 'app-welcome-message-step',
  imports: [ButtonComponent],
  template: `
    <div class="step">
      <h1>🍺 You Gotta Catch Them All!</h1>
      <p>Welcome to the world's quirkiest collecting game</p>
      
      <div class="game-benefits">
        <div class="benefit">
          <span class="icon">📸</span>
          <div>
            <strong>Carpet Photography</strong>
            <span>The world's quirkiest collecting game</span>
          </div>
        </div>
        <div class="benefit">
          <span class="icon">🏆</span>
          <div>
            <strong>Real Achievement System</strong>
            <span>Earn badges that actually mean something</span>
          </div>
        </div>
        <div class="benefit">
          <span class="icon">👑</span>
          <div>
            <strong>Become a Landlord</strong>
            <span>Claim ownership of your favorite pubs</span>
          </div>
        </div>
        <div class="benefit">
          <span class="icon">🗺️</span>
          <div>
            <strong>Explore Like Never Before</strong>
            <span>Turn every pub visit into an adventure</span>
          </div>
        </div>
        <div class="benefit">
          <span class="icon">🎮</span>
          <div>
            <strong>Social Competition</strong>
            <span>Battle friends for pub supremacy</span>
          </div>
        </div>
        <div class="benefit">
          <span class="icon">💯</span>
          <div>
            <strong>100% Real World</strong>
            <span>No virtual coins, just real pub experiences</span>
          </div>
        </div>
        <div class="benefit">
          <span class="icon">🎯</span>
          <div>
            <strong>Strategic Gameplay</strong>
            <span>Choose home pubs, plan routes, maximize points</span>
          </div>
        </div>
      </div>

      <app-button variant="primary" (onClick)="continue.emit()">
        Let's Start Customizing!
      </app-button>
    </div>
  `,
  styles: `
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
}