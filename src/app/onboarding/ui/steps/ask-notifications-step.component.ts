import { Component, output, ChangeDetectionStrategy } from '@angular/core';
import { ButtonComponent } from '@shared/ui/button/button.component';

@Component({
  selector: 'app-ask-notifications-step',
  imports: [ButtonComponent],
  template: `
    <div class="step notification-step">
      <div class="permission-icon">🔔</div>
      <h1>Stay in the Loop!</h1>
      <p class="subtitle">Get notified about new badges, achievements, and pub challenges</p>
      
      <div class="permission-benefits">
        <div class="benefit-item">
          <span class="icon">🏆</span>
          <div>
            <h3>Achievement Alerts</h3>
            <p>Get notified when you earn new badges</p>
          </div>
        </div>
        <div class="benefit-item">
          <span class="icon">📍</span>
          <div>
            <h3>Nearby Pub Updates</h3>
            <p>Discover new pubs and challenges near you</p>
          </div>
        </div>
        <div class="benefit-item">
          <span class="icon">👥</span>
          <div>
            <h3>Social Features</h3>
            <p>Stay connected with other pub explorers</p>
          </div>
        </div>
      </div>

      <div class="step-actions">
        <app-button
          variant="primary"
          size="large"
          (onClick)="enableNotifications.emit()"
        >
          Enable Notifications
        </app-button>
        <app-button
          variant="secondary"
          (onClick)="skipNotifications.emit()"
        >
          Skip for Now
        </app-button>
      </div>
    </div>
  `,
  styles: `
    .permission-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .permission-benefits {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      margin: 2rem 0;
      text-align: left;
    }

    .benefit-item {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.5rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      backdrop-filter: blur(10px);
    }

    .benefit-item .icon {
      font-size: 2rem;
      flex-shrink: 0;
    }

    .benefit-item h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1.2rem;
      color: white;
    }

    .benefit-item p {
      margin: 0;
      opacity: 0.9;
      color: white;
    }

    .step-actions {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      margin-top: 3rem;
    }

    @media (max-width: 768px) {
      .benefit-item {
        padding: 1rem;
      }

      .step-actions {
        gap: 0.75rem;
      }

      .step-actions app-button {
        width: 100%;
        max-width: 300px;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AskNotificationsStepComponent {
  readonly enableNotifications = output<void>();
  readonly skipNotifications = output<void>();
}