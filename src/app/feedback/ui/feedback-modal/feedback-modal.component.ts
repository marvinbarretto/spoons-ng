import { Component, inject, signal, output, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { BaseComponent } from '../../../shared/base/base.component';
import { FeedbackStore } from '../../data-access/feedback.store';
import { FeedbackType, CreateFeedbackInput } from '../../utils/feedback.model';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-feedback-modal',
  imports: [IconComponent, ButtonComponent, FormsModule],
  template: `
    <section class="feedback-modal">
      <div class="feedback-modal__header">
        <h2 class="feedback-modal__title">Send Feedback</h2>
        <button
          class="feedback-modal__close"
          (click)="close()"
          aria-label="Close feedback modal"
          type="button"
        >
          <app-icon name="close" />
        </button>
      </div>

      <div class="feedback-modal__content">
        <div class="feedback-modal__type-selector">
          <div class="feedback-type-options">
            @for (option of typeOptions; track option.value) {
              <button
                class="feedback-type-option"
                [class.feedback-type-option--selected]="selectedType() === option.value"
                (click)="selectType(option.value)"
                type="button"
              >
                <app-icon [name]="option.icon" class="feedback-type-option__icon" />
                <span class="feedback-type-option__label">{{ option.label }}</span>
              </button>
            }
          </div>
        </div>

        <div class="feedback-modal__message">
          <label class="feedback-modal__label" for="feedback-message">
            Tell us more
          </label>
          <textarea
            #messageTextarea
            id="feedback-message"
            class="feedback-modal__textarea"
            [(ngModel)]="message"
            (input)="updateCanSubmit()"
            placeholder="Describe the issue, share an idea, or tell me why its shit..."
            rows="4"
            [disabled]="submitting()"
          ></textarea>
        </div>

        @if (error()) {
          <div class="feedback-modal__error">
            <app-icon name="error" class="feedback-modal__error-icon" />
            {{ error() }}
          </div>
        }
      </div>

      <div class="feedback-modal__actions">
        <app-button
          variant="ghost"
          (click)="close()"
          [disabled]="submitting()"
        >
          Cancel
        </app-button>
        <app-button
          variant="primary"
          (click)="submitFeedback()"
          [loading]="submitting()"
          [disabled]="!canSubmit()"
        >
          Send Feedback
        </app-button>
      </div>
    </section>
  `,
  styles: [`
    .feedback-modal {
      background: var(--color-surface);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      max-width: 400px;
      min-width: 280px;
      max-height: 85vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      position: relative;
      margin: 16px;
    }


    .feedback-modal__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--color-outline);
    }

    @media (max-width: 320px) {
      .feedback-modal__header {
        padding: 14px 16px;
      }
    }

    .feedback-modal__title {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: var(--color-on-surface);
    }

    @media (max-width: 320px) {
      .feedback-modal__title {
        font-size: 16px;
      }
    }

    .feedback-modal__close {
      background: none;
      border: none;
      padding: 8px;
      cursor: pointer;
      border-radius: 8px;
      color: var(--color-on-surface-variant);
      transition: background-color 0.2s;
    }

    .feedback-modal__close:hover {
      background: var(--color-surface-variant);
    }

    .feedback-modal__content {
      padding: 20px;
      flex: 1;
      overflow-y: auto;
    }

    @media (max-width: 320px) {
      .feedback-modal__content {
        padding: 16px;
      }
    }

    .feedback-modal__label {
      display: block;
      font-weight: 500;
      color: var(--color-on-surface);
      margin-bottom: 12px;
    }

    .feedback-modal__type-selector {
      margin-bottom: 24px;
    }

    .feedback-type-options {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    @media (max-width: 320px) {
      .feedback-type-options {
        grid-template-columns: 1fr;
        gap: 8px;
      }
    }

    .feedback-type-option {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 16px 12px;
      border: 2px solid var(--color-outline);
      border-radius: 8px;
      background: var(--color-surface);
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
      min-height: 70px;
    }

    @media (max-width: 320px) {
      .feedback-type-option {
        flex-direction: row;
        justify-content: flex-start;
        text-align: left;
        padding: 12px;
        min-height: auto;
      }
    }

    .feedback-type-option:hover {
      border-color: var(--color-primary);
      background: var(--color-surface-variant);
    }

    .feedback-type-option--selected {
      border-color: var(--color-primary);
      background: var(--color-primary);
      color: var(--color-on-primary);
      transform: scale(1.02);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .feedback-type-option--selected .feedback-type-option__icon {
      color: var(--color-on-primary);
    }

    .feedback-type-option--selected .feedback-type-option__label {
      color: var(--color-on-primary);
      font-weight: 600;
    }

    .feedback-type-option__icon {
      --icon-size: 24px;
      color: var(--color-primary);
      margin-top: 2px;
    }



    .feedback-type-option__label {
      display: block;
      font-weight: 500;
      color: var(--color-on-surface);
      margin-bottom: 4px;
    }



    .feedback-modal__textarea {
      width: 100%;
      padding: 16px;
      border: 2px solid var(--color-outline);
      border-radius: 8px;
      background: var(--color-surface-variant);
      color: var(--color-on-surface);
      font-family: inherit;
      font-size: 16px;
      resize: vertical;
      min-height: 100px;
      transition: all 0.2s;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .feedback-modal__textarea:focus {
      outline: none;
      border-color: var(--color-primary);
      background: var(--color-surface);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      transform: translateY(-1px);
    }

    .feedback-modal__textarea:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }


    .feedback-modal__error {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: var(--color-error-container);
      color: var(--color-on-error-container);
      border-radius: 8px;
      margin-top: 16px;
    }

    .feedback-modal__error-icon {
      --icon-size: 20px;
    }

    .feedback-modal__actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding: 16px 20px;
      border-top: 1px solid var(--color-outline);
    }

    @media (max-width: 320px) {
      .feedback-modal__actions {
        padding: 14px 16px;
        flex-direction: column;
        gap: 8px;
      }
    }

    @media (max-width: 640px) {
      .feedback-modal {
        max-height: 90vh;
        margin: 12px;
      }
    }
  `]
})
export class FeedbackModalComponent extends BaseComponent {
  private readonly feedbackStore = inject(FeedbackStore);

  readonly result = output<boolean>();

  @ViewChild('messageTextarea') messageTextarea!: ElementRef<HTMLTextAreaElement>;

  readonly selectedType = signal<FeedbackType>('bug');
  readonly submitting = signal(false);

  message = '';

  readonly typeOptions = [
    {
      value: 'bug' as FeedbackType,
      label: 'Bug',
      icon: 'bug_report'
    },
    {
      value: 'suggestion' as FeedbackType,
      label: 'Suggestion',
      icon: 'lightbulb'
    }
  ];

  readonly canSubmit = signal(false);

  constructor() {
    super();
    console.log('[FeedbackModal] Component constructed');
  }

  selectType(type: FeedbackType): void {
    console.log('[FeedbackModal] Feedback type selected:', type);
    this.selectedType.set(type);
    console.log('[FeedbackModal] Selected type now:', this.selectedType());
  }

  updateCanSubmit(): void {
    this.canSubmit.set(this.message.trim().length > 0);
    console.log('[FeedbackModal] Can submit updated:', this.canSubmit());
  }


  async submitFeedback(): Promise<void> {
    console.log('[FeedbackModal] Submit feedback clicked');
    this.updateCanSubmit();

    if (!this.canSubmit()) {
      console.warn('[FeedbackModal] Cannot submit - validation failed');
      return;
    }

    console.log('[FeedbackModal] Starting feedback submission...', {
      type: this.selectedType(),
      messageLength: this.message.trim().length
    });

    await this.handleAsync(async () => {
      this.submitting.set(true);
      try {
        const input: CreateFeedbackInput = {
          type: this.selectedType(),
          message: this.message.trim()
        };

        const result = await this.feedbackStore.submitFeedback(input);

        if (result.success) {
          console.log('[FeedbackModal] Feedback submitted successfully!');
          console.log('[FeedbackModal] Emitting result(true) to close modal');
          this.result.emit(true); // Let OverlayService handle the close
          console.log('[FeedbackModal] Modal should close automatically via OverlayService');
        } else {
          console.error('[FeedbackModal] Feedback submission failed:', result.error);
          this.error.set(result.error || 'Failed to submit feedback');
        }
      } finally {
        this.submitting.set(false);
      }
    }, {
      setLoadingState: false
    });
  }

  close(): void {
    console.log('[FeedbackModal] close() method called');
    console.log('[FeedbackModal] About to emit result(false)');
    this.result.emit(false);
    console.log('[FeedbackModal] After emitting result(false)');
  }
}
