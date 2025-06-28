import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { ButtonComponent } from '@shared/ui/button/button.component';

@Component({
  selector: 'app-ready-to-start-step',
  imports: [ButtonComponent],
  template: `
    <div class="step">
      <div>🎉</div>
      <h2>You're All Set, {{ displayName() }}!</h2>
      <p>Ready to start your pub collecting adventure?</p>

      <div>
        <h3>Your Setup:</h3>
        <div>Display Name: {{ displayName() }}</div>
        <div>Home Pub: {{ hasHomePub() ? 'Selected ✓' : 'Not selected' }}</div>
        <div>Notifications: {{ notificationsEnabled() ? 'Enabled' : 'Disabled' }}</div>
        <div>Location: {{ locationEnabled() ? 'Enabled' : 'Disabled' }}</div>
      </div>

      <div>
        <h3>What's Next?</h3>
        <ul>
          <li>🗺️ Explore nearby pubs</li>
          <li>📸 Take your first carpet photo</li>
          <li>🏆 Earn your first badge</li>
          <li>👑 Claim landlord status</li>
        </ul>
      </div>

      <app-button 
        [loading]="isSaving()" 
        (onClick)="startExploring.emit()"
      >
        Start Exploring Pubs!
      </app-button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReadyToStartStepComponent {
  readonly displayName = input<string>('');
  readonly hasHomePub = input<boolean>(false);
  readonly notificationsEnabled = input<boolean>(false);
  readonly locationEnabled = input<boolean>(false);
  readonly isSaving = input<boolean>(false);
  readonly startExploring = output<void>();
}