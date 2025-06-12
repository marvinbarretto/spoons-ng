
import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { UserStage } from '@shared/utils/user-progression.models';

type CheckInStatusData = {
  success: boolean;
  pub?: { id: string; name: string; };
  error?: string;
  badges?: Array<{ badgeId: string; name: string; }>;
  checkinTime?: any;
};

@Component({
  selector: 'app-check-in-status-modal',
  imports: [CommonModule, ButtonComponent],
  template: `
    <div class="modal-container">
      <!-- Subtle Progress Bar for Auto-Navigation -->
      @if (autoNavigateProgress()) {
        <div class="auto-nav-progress">
          <div
            class="progress-bar"
            [style.width.%]="autoNavigateProgress()"
          ></div>
        </div>
      }

      <div class="modal-header">
        <h2>{{ headerTitle() }}</h2>
      </div>

      <div class="modal-body">
        @if (data().success) {
          <div class="success-content">
            <!-- ✅ Subtle Success Indicator -->
            <div class="status-icon success">✓</div>

            <div class="check-in-details">
              <h3>{{ data().pub?.name }}</h3>
              <p class="timestamp">{{ formatTimestamp() }}</p>
            </div>

            <!-- User Stage Specific Content -->
            @switch (userStage()) {
              @case ('brandNew') {
                <div class="onboarding-message">
                  <p><strong>Welcome to the pub game!</strong></p>
                  <p>You've just checked into your first pub. Keep exploring to discover more features and earn your landlord status.</p>
                </div>
              }
              @case ('firstTime') {
                <div class="learning-message">
                  <p>Great check-in! You're getting the hang of this.</p>
                  <p>Visit regularly to compete for landlord status and unlock new features.</p>
                </div>
              }
              @default {
                <div class="standard-message">
                  <p>Successfully checked in!</p>
                </div>
              }
            }

            <!-- Badge Awards (if any) -->
            @if (data().badges && data().badges!.length > 0) {
              <div class="badge-section">
                <h4>🏅 Badge{{ data().badges!.length > 1 ? 's' : '' }} Earned</h4>
                @for (badge of data().badges; track badge.badgeId) {
                  <div class="badge-item">{{ badge.name }}</div>
                }
              </div>
            }

            <!-- Auto-navigation indicator -->
            @if (autoNavigateProgress()) {
              <div class="auto-nav-notice">
                <p>Taking you to {{ data().pub?.name }} in...</p>
                <button
                  type="button"
                  class="cancel-auto-nav"
                  (click)="cancelAutoNav.emit()"
                >
                  Stay here
                </button>
              </div>
            }
          </div>
        } @else {
          <div class="error-content">
            <div class="status-icon error">✕</div>
            <p><strong>{{ data().error }}</strong></p>
          </div>
        }
      </div>

      <div class="modal-footer">
        @if (data().success) {
          <app-button
            variant="secondary"
            (onClick)="nextModal.emit()"
          >
            Landlord Status
          </app-button>

          <app-button
            variant="primary"
            (onClick)="navigate.emit()"
          >
            View {{ data().pub?.name }}
          </app-button>
        } @else {
          <app-button
            variant="primary"
            (onClick)="dismiss.emit()"
          >
            Try Again
          </app-button>
        }
      </div>
    </div>
  `,
  styles: `
    .modal-container {
      background: var(--color-background);
      border: 1px solid var(--color-subtleDarker);
      border-radius: 8px;
      max-width: 480px;
      width: 90vw;
      position: relative;
      overflow: hidden;
    }

    /* Subtle Auto-Navigation Progress */
    .auto-nav-progress {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: rgba(0, 0, 0, 0.1);
      z-index: 10;
    }

    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #28a745, #20c997);
      transition: width 0.1s linear;
    }

    /* Clean Status Icons */
    .status-icon {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: bold;
      margin: 0 auto 1rem auto;
    }

    .status-icon.success {
      background: #d4edda;
      color: #155724;
    }

    .status-icon.error {
      background: #f8d7da;
      color: #721c24;
    }

    /* Content Sections */
    .check-in-details {
      text-align: center;
      margin-bottom: 1.5rem;
    }

    .check-in-details h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1.25rem;
    }

    .timestamp {
      color: var(--color-textSecondary);
      font-size: 0.9rem;
      margin: 0;
    }

    .onboarding-message,
    .learning-message,
    .standard-message {
      background: var(--color-subtleLighter);
      padding: 1rem;
      border-radius: 6px;
      margin-bottom: 1rem;
    }

    .badge-section {
      background: rgba(255, 215, 0, 0.1);
      border: 1px solid #ffd700;
      border-radius: 6px;
      padding: 1rem;
      margin-bottom: 1rem;
    }

    .badge-item {
      background: rgba(255, 215, 0, 0.2);
      padding: 0.5rem;
      border-radius: 4px;
      margin: 0.5rem 0;
      text-align: center;
      font-weight: 500;
    }

    .auto-nav-notice {
      background: var(--color-primary);
      color: white;
      padding: 1rem;
      border-radius: 6px;
      text-align: center;
    }

    .cancel-auto-nav {
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      margin-top: 0.5rem;
    }

    /* Standard Modal Layout */
    .modal-header,
    .modal-body,
    .modal-footer {
      padding: 1rem;
    }

    .modal-footer {
      border-top: 1px solid var(--color-subtleLighter);
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
    }

    @media (max-width: 600px) {
      .modal-footer {
        flex-direction: column;
      }
    }
  `
})
export class CheckInStatusModalComponent {
  readonly data = input.required<CheckInStatusData>();
  readonly userStage = input.required<UserStage>();
  readonly autoNavigateProgress = input<number | null>(null);

  // Events
  readonly navigate = output<void>();
  readonly dismiss = output<void>();
  readonly cancelAutoNav = output<void>();
  readonly nextModal = output<void>();

  readonly headerTitle = computed(() =>
    this.data().success ? 'Check-in Complete' : 'Check-in Failed'
  );

  formatTimestamp(): string {
    if (!this.data().checkinTime) return '';
    return this.data().checkinTime.toDate?.()?.toLocaleString() || 'Just now';
  }
}
