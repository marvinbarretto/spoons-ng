import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonComponent } from '@shared/ui/button/button.component';
import type { PromptData } from '../../data-access/registration-prompt.service';

@Component({
  selector: 'app-registration-prompt-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent],
  template: `
    <div class="registration-prompt-overlay" (click)="onBackdropClick()">
      <div class="registration-prompt-modal" (click)="$event.stopPropagation()">
        <!-- Close button -->
        <button type="button" class="close-button" (click)="onDismiss()" aria-label="Close">
          ✕
        </button>

        <!-- Content -->
        <div class="modal-content">
          <div class="icon-container">
            <span class="prompt-icon">{{ getIcon() }}</span>
          </div>

          <h2 class="prompt-title">{{ message.title }}</h2>
          <p class="prompt-message">{{ message.message }}</p>

          <!-- Action buttons -->
          <div class="action-buttons">
            <app-button
              variant="primary"
              size="lg"
              [fullWidth]="true"
              (onClick)="onCreateAccount()"
            >
              {{ message.ctaText }}
            </app-button>

            <app-button
              variant="secondary"
              size="md"
              [fullWidth]="true"
              (onClick)="onContinueAsGuest()"
            >
              Continue as Guest
            </app-button>
          </div>

          <!-- Don't show again option -->
          <div class="dont-show-again">
            <label class="checkbox-label">
              <input type="checkbox" #dontShowAgainCheckbox class="checkbox-input" />
              <span class="checkbox-text">Don't show this again</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './registration-prompt-modal.component.scss',
})
export class RegistrationPromptModalComponent {
  @Input({ required: true }) promptData!: PromptData;
  @Input({ required: true }) message!: { title: string; message: string; ctaText: string };

  @Output() dismissed = new EventEmitter<boolean>(); // boolean indicates "don't show again"
  @Output() createAccount = new EventEmitter<void>();

  getIcon(): string {
    switch (this.promptData.trigger) {
      case 'first-checkin':
        return '🎉';
      case 'points-milestone':
        return '🚀';
      case 'badge-earned':
        return '🏅';
      case 'engagement':
        return '🔐';
      default:
        return '🔐';
    }
  }

  onBackdropClick(): void {
    this.onDismiss();
  }

  onDismiss(dontShowAgain = false): void {
    this.dismissed.emit(dontShowAgain);
  }

  onContinueAsGuest(): void {
    // Check if "don't show again" is checked
    const checkbox = document.querySelector('.checkbox-input') as HTMLInputElement;
    const dontShowAgain = checkbox?.checked || false;
    this.onDismiss(dontShowAgain);
  }

  onCreateAccount(): void {
    this.createAccount.emit();
  }
}
