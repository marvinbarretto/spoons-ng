import { Component, output, ChangeDetectionStrategy } from '@angular/core';
import { ButtonComponent } from '@shared/ui/button/button.component';

@Component({
  selector: 'app-welcome-message-step',
  imports: [ButtonComponent],
  template: `
    <div class="step">
      <h1>🍺 You Gotta Catch Them All!</h1>
      <p>Welcome to the ultimate pub collecting adventure</p>
      
      <!-- TODO: Add game concept explanation -->
      <ul>
        <li>📸 Photograph Carpets</li>
        <li>🏆 Collect Badges</li>
        <li>👑 Become a Landlord</li>
        <li>🗺️ Explore Everywhere</li>
      </ul>

      <app-button (onClick)="continue.emit()">
        Let's Start Customizing!
      </app-button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WelcomeMessageStepComponent {
  readonly continue = output<void>();
}