import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { AvatarSelectionWidgetComponent } from '@home/ui/profile-customisation-modal/widgets/avatar-selection-widget/avatar-selection-widget.component';
import type { User } from '@users/utils/user.model';

@Component({
  selector: 'app-customize-profile-step',
  imports: [ButtonComponent, AvatarSelectionWidgetComponent, FormsModule],
  template: `
    <div class="step customize-profile-step">
      <h2>Customize Your Profile</h2>
      <p>Make yourself at home in the pub collecting world</p>

      <!-- Avatar Selection -->
      <div class="avatar-section">
        <h3>Choose Your Avatar</h3>
        <app-avatar-selection-widget
          [user]="user()"
          [selectedAvatarId]="selectedAvatarId()"
          (avatarSelected)="avatarSelected.emit($event)"
        />
      </div>

      <!-- Display Name Section -->
      <div class="name-section">
        <h3>Your Display Name</h3>
        <div class="name-input-group">
          <input
            type="text"
            class="name-input"
            [value]="displayName()"
            (input)="onDisplayNameChange($event)"
            placeholder="Enter your name"
            maxlength="30"
          />
          <app-button
            variant="ghost"
            iconLeft="casino"
            size="md"
            (onClick)="generateRandom.emit()"
            class="randomize-btn"
          >
            Randomize
          </app-button>
        </div>
        <div class="name-help">
          <span class="character-count">{{ displayName().length }}/30</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="step-actions">
        <app-button variant="secondary" (onClick)="back.emit()">
          Back
        </app-button>
        <app-button 
          variant="primary" 
          [disabled]="!isValid()"
          (onClick)="continue.emit()"
        >
          Continue
        </app-button>
      </div>
    </div>
  `,
  styles: `
    .customize-profile-step {
      max-width: 600px;
      width: 100%;
    }

    .avatar-section {
      margin: 2rem 0;
    }

    .name-section {
      margin: 2rem 0;
    }

    .avatar-section h3,
    .name-section h3 {
      color: white;
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }

    .name-input-group {
      display: flex;
      gap: 0.75rem;
      align-items: stretch;
    }

    .name-input {
      flex: 1;
      padding: 0.75rem 1rem;
      border: 2px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.1);
      color: white;
      font-size: 1rem;
      backdrop-filter: blur(10px);
      transition: all 0.2s ease;
    }

    .name-input:focus {
      outline: none;
      border-color: rgba(255, 255, 255, 0.5);
      background: rgba(255, 255, 255, 0.15);
    }

    .name-input::placeholder {
      color: rgba(255, 255, 255, 0.6);
    }

    .randomize-btn {
      flex-shrink: 0;
      border: 2px solid rgba(255, 255, 255, 0.2);
    }

    .name-help {
      display: flex;
      justify-content: flex-end;
      margin-top: 0.5rem;
    }

    .character-count {
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.875rem;
    }

    .step-actions {
      display: flex;
      gap: 1rem;
      justify-content: space-between;
      margin-top: 3rem;
    }

    .step-actions app-button {
      flex: 1;
    }

    @media (max-width: 768px) {
      .name-input-group {
        flex-direction: column;
        gap: 1rem;
      }

      .randomize-btn {
        align-self: stretch;
      }

      .step-actions {
        flex-direction: column;
        gap: 1rem;
      }

      .step-actions app-button {
        width: 100%;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomizeProfileStepComponent {
  readonly user = input<User | null>(null);
  readonly selectedAvatarId = input<string>('');
  readonly displayName = input<string>('');
  
  readonly avatarSelected = output<string>();
  readonly nameChanged = output<string>();
  readonly generateRandom = output<void>();
  readonly back = output<void>();
  readonly continue = output<void>();

  onDisplayNameChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.nameChanged.emit(target.value);
  }

  isValid(): boolean {
    return this.selectedAvatarId().length > 0 && this.displayName().trim().length > 0;
  }
}