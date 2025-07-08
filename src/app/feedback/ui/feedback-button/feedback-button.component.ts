import { Component, inject } from '@angular/core';
import { BaseComponent } from '../../../shared/base/base.component';
import { OverlayService } from '../../../shared/data-access/overlay.service';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { FeedbackModalComponent } from '../feedback-modal/feedback-modal.component';

@Component({
  selector: 'app-feedback-button',
  imports: [IconComponent],
  template: `
    <button
      class="feedback-btn"
      (click)="openFeedbackModal()"
      [disabled]="loading()"
      aria-label="Send feedback"
      title="Send feedback"
    >
      @if (loading()) {
        <app-icon name="sync" class="feedback-btn__icon feedback-btn__icon--spinning" />
      } @else {
        <app-icon name="feedback" class="feedback-btn__icon" />
      }
      <span class="feedback-btn__text">Feedback</span>
    </button>
  `,
  styles: [`
    .feedback-btn {
      position: fixed;
      top: 12px;
      right: 12px;
      z-index: 1000;

      display: flex;
      align-items: center;
      gap: 8px;

      padding: 12px;
      border: none;
      border-radius: 24px;

      background: var(--accent);
      color: var(--on-accent);
      font-size: 14px;
      font-weight: 600;

      cursor: pointer;
      transition: all 0.2s ease;

      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    }

    .feedback-btn:hover:not(:disabled) {
      background: var(--accent);
      filter: brightness(1.15);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
      border-color: var(--primary);
    }

    .feedback-btn:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .feedback-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .feedback-btn__icon {
      --icon-size: 20px;
    }

    .feedback-btn__icon--spinning {
      animation: spin 1s linear infinite;
    }

    .feedback-btn__text {
      font-size: 14px;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @media (max-width: 640px) {
      .feedback-btn {
        right: 12px;
        padding: 10px 14px;
      }

      .feedback-btn__text {
        display: none;
      }

      .feedback-btn {
        border-radius: 50%;
        width: 36px;
        height: 36px;
        padding: 0;
        justify-content: center;
      }
    }
  `]
})
export class FeedbackButtonComponent extends BaseComponent {
  private readonly overlayService = inject(OverlayService);

  async openFeedbackModal(): Promise<void> {
    console.log('[FeedbackButton] Opening feedback modal...');

    const overlayResult = this.overlayService.open(
      FeedbackModalComponent,
      {
        hasBackdrop: true,
        backdropClass: 'overlay-backdrop',
        panelClass: 'feedback-modal-panel',
        maxWidth: '95vw',
        width: 'auto'
      }
    );

    console.log('[FeedbackButton] Overlay created, waiting for result...');
    const result = await overlayResult.result;
    console.log('[FeedbackButton] Modal closed with result:', result);
    // Toast will be shown by the modal itself when feedback is submitted
  }
}
