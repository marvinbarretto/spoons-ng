import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { AvatarSelectionWidgetComponent } from '@home/ui/profile-customisation-modal/widgets/avatar-selection-widget/avatar-selection-widget.component';
import type { User } from '@users/utils/user.model';

@Component({
  selector: 'app-choose-your-look-step',
  imports: [ButtonComponent, AvatarSelectionWidgetComponent],
  template: `
    <div class="step">
      <h2>Choose Your Look</h2>
      <p>Customize your avatar and theme</p>

      <!-- Avatar Selection -->
      <h3>Your Avatar</h3>
      <app-avatar-selection-widget
        [user]="user()"
        [selectedAvatarId]="selectedAvatarId()"
        (avatarSelected)="avatarSelected.emit($event)"
      />

      <!-- Background Color Selection - TODO: Implement properly -->
      <h3>Background Theme</h3>
      <p>TODO: Color selection grid</p>

      <div>
        <app-button (onClick)="back.emit()">Back</app-button>
        <app-button [disabled]="!selectedAvatarId()" (onClick)="continue.emit()">Continue</app-button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChooseYourLookStepComponent {
  readonly user = input<User | null>(null);
  readonly selectedAvatarId = input<string>('');
  readonly avatarSelected = output<string>();
  readonly back = output<void>();
  readonly continue = output<void>();
}