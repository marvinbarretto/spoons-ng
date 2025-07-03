import { Component, input, output, ChangeDetectionStrategy, signal } from '@angular/core';
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

      <div style="margin: 1rem 0; padding: 1rem; border: 1px solid var(--border-color); border-radius: 8px;">
        <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
          <input 
            type="checkbox" 
            [checked]="realUser()"
            (change)="onRealUserChange($event)"
            style="margin: 0;"
          />
          <span style="font-size: 0.9rem; color: var(--text-secondary);">
            I'm a real alpha user - please don't delete me during dev updates
          </span>
        </label>
      </div>

      <app-button 
        [loading]="isSaving()" 
        (onClick)="onStartExploring()"
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
  readonly startExploring = output<{ realUser: boolean }>();

  readonly realUser = signal<boolean>(true); // Default to true for alpha users

  onRealUserChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.realUser.set(target.checked);
  }

  onStartExploring() {
    this.startExploring.emit({ realUser: this.realUser() });
  }
}