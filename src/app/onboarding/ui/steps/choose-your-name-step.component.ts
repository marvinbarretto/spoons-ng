import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { ButtonSize } from '@shared/ui/button/button.params';

@Component({
  selector: 'app-choose-your-name-step',
  imports: [FormsModule, ButtonComponent],
  template: `
    <div class="step">
      <h2>What Should We Call You?</h2>
      <p>Choose a display name for the leaderboards</p>

      <input
        type="text"
        [value]="displayName()"
        (input)="onNameChange($event)"
        placeholder="Enter your display name"
        maxlength="20"
      />
      <small>This will be shown on leaderboards and when you check in</small>

      <div>
        <p>Need inspiration?</p>
        <app-button (onClick)="generateRandom.emit()">
          🎲 Generate Random Name
        </app-button>
      </div>

      <small>💡 You can always change this later in your profile settings</small>

      <div>
        <app-button 
          variant="secondary"
          [size]="ButtonSize.MEDIUM" 
          (onClick)="back.emit()"
        >
          Back
        </app-button>
        <app-button 
          variant="primary"
          [size]="ButtonSize.LARGE" 
          [disabled]="!displayName().trim()" 
          (onClick)="continue.emit()"
        >
          Continue
        </app-button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChooseYourNameStepComponent {
  readonly displayName = input<string>('');
  readonly nameChanged = output<string>();
  readonly generateRandom = output<void>();
  readonly back = output<void>();
  readonly continue = output<void>();
  
  // Expose ButtonSize for template
  readonly ButtonSize = ButtonSize;

  onNameChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.nameChanged.emit(input.value);
  }
}