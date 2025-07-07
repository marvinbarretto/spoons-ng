/**
 * @deprecated This component has been deprecated and removed from the app flow.
 * 
 * REASON FOR REMOVAL:
 * - The welcome modal provided no value to users (only placeholder content)
 * - Better UX to let users go directly to home page after onboarding
 * - Home page already provides personalized content and prominent check-in button
 * - Removing modal interruption improves onboarding flow
 * 
 * This file is kept for reference but should not be used.
 * Consider deleting this file entirely in a future cleanup.
 */

import { Component, inject, ChangeDetectionStrategy, output } from '@angular/core';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { ButtonSize } from '@shared/ui/button/button.params';
import { OverlayService } from '../../../shared/data-access/overlay.service';

@Component({
  selector: 'app-welcome-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent],
  template: `
    <div class="welcome-modal">
      <div class="modal-content">
        <div class="confetti-wrapper">
          <span class="confetti">🎉</span>
          <span class="confetti">🍺</span>
          <span class="confetti">🎊</span>
        </div>

        <!-- TODO: Fix this copy.... -->
        <h1 class="welcome-title">Welcome, ...</h1>

        <div class="tips-section">
          ...
        </div>

        <div class="cta-section">
          <app-button
            variant="primary"
            [size]="ButtonSize.LARGE"
            (onClick)="onClose()"
          >
            Begin
          </app-button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .welcome-modal {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      z-index: 2000;
      padding: 1rem;
    }

    .modal-content {
      background: var(--background);
      border-radius: 1rem;
      padding: 2.5rem;
      max-width: 500px;
      width: 100%;
      position: relative;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      text-align: center;
    }

    .confetti-wrapper {
      position: absolute;
      top: -1.5rem;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 1rem;
    }

    .confetti {
      font-size: 2rem;
      animation: bounce 1s ease-in-out infinite;
    }

    .confetti:nth-child(2) {
      animation-delay: 0.2s;
    }

    .confetti:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }

    .welcome-title {
      margin: 0 0 0.5rem 0;
      font-size: 2rem;
      font-weight: 700;
      color: var(--text);
    }

    .welcome-subtitle {
      margin: 0 0 2rem 0;
      font-size: 1.125rem;
      color: var(--text-secondary);
    }

    .tips-section {
      background: var(--background-lighter);
      border-radius: 0.75rem;
      padding: 1.5rem;
      margin-bottom: 2rem;
      text-align: left;
    }

    .tips-section h3 {
      margin: 0 0 1rem 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--text);
    }

    .tips-list {
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .tips-list li {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: var(--text-secondary);
      line-height: 1.4;
    }

    .cta-section {
      text-align: center;
    }

    .cta-text {
      margin: 0 0 1rem 0;
      font-size: 1rem;
      color: var(--text);
    }

    @media (max-width: 600px) {
      .modal-content {
        padding: 2rem 1.5rem;
      }

      .welcome-title {
        font-size: 1.5rem;
      }

      .welcome-subtitle {
        font-size: 1rem;
      }

      .tips-section {
        padding: 1rem;
      }
    }
  `
})
export class WelcomeModalComponent {
  private readonly overlayService = inject(OverlayService);
  readonly ButtonSize = ButtonSize;

  // Output that will trigger the overlay to close and return a result
  readonly result = output<'closed'>();

  onClose(): void {
    console.log('[WelcomeModal] User clicked Let\'s Go button');
    this.result.emit('closed');
  }
}
