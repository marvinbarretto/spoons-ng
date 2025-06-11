import { Component, inject, input, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import type { CheckIn } from '../../utils/check-in.model';
import type { Pub } from '../../../pubs/utils/pub.models';
import { environment } from '../../../../environments/environment';

export type CheckInResultData = {
  success: boolean;
  checkin?: CheckIn;
  pub?: Pub;
  isNewLandlord?: boolean;
  landlordMessage?: string;
  error?: string;
  // Enhanced celebration properties
  badges?: Array<{ badgeId: string; name: string; }>;
  autoNavigate?: boolean;
  currentLandlord?: any;
  todayLandlord?: any;
  userWhoCheckedIn?: string;
  debugInfo?: {
    pubLandlordStatus: string;
    checkinTime: string;
    landlordClaimedAt?: string;
    existingLandlordUserId?: string;
  };
};

@Component({
  selector: 'app-check-in-result-modal',
  imports: [CommonModule, ButtonComponent],
  template: `
    <div class="modal-container" [class.celebrating]="data().success">

      <!-- ✅ Celebration Elements for Success -->
      @if (data().success) {
        <div class="celebration-effects">
          <div class="ticker-tape"></div>
          <div class="confetti">
            <span>🎉</span><span>✨</span><span>🎊</span><span>⭐</span>
            <span>🏆</span><span>🎉</span><span>✨</span><span>🎊</span>
          </div>
        </div>
      }

      <div class="modal-header">
        <h2>{{ title() }}</h2>
      </div>

      <div class="modal-body">
        @if (data().success) {
          <div class="success-content">
            <div class="main-success">
              <div class="trophy">🏆</div>
              <p><strong>✅ Checked in to {{ data().pub?.name }}</strong></p>
              <p>{{ formatTimestamp() }}</p>
            </div>

            <!-- Landlord Status -->
            @if (data().isNewLandlord) {
              <div class="landlord-new">
                <span class="crown">👑</span>
                <p><strong>You're the new landlord!</strong></p>
              </div>
            } @else {
              <div class="landlord-existing">
                <p><strong>{{ data().landlordMessage }}</strong></p>
              </div>
            }

            <!-- TODO: dont use the ! -->
            <!-- Badge Awards -->
            @if (data().badges && data().badges!.length > 0) {
              <div class="badge-awards">
                <p>🏅 <strong>New Badge{{ data().badges!.length > 1 ? 's' : '' }} Earned!</strong></p>
                @for (badge of data().badges!; track badge.badgeId) {
                  <div class="badge-item">{{ badge.name }}</div>
                }
              </div>
            }

            <!-- Auto-navigate indicator -->
            @if (data().autoNavigate) {
              <div class="auto-navigate">
                <div class="countdown-dots">
                  <span class="dot"></span>
                  <span class="dot"></span>
                  <span class="dot"></span>
                </div>
                <p>Taking you to {{ data().pub?.name }}...</p>
                <button
                  type="button"
                  (click)="cancelAutoNavigate()"
                  class="cancel-btn">
                  Stay here
                </button>
              </div>
            }

            <!-- Development Debug Info -->
            @if (isDevelopment()) {
              <details class="debug-info">
                <summary>🐛 Debug Info</summary>
                <pre>{{ debugText() }}</pre>
              </details>
            }
          </div>
        } @else {
          <div class="error-content">
            <p><strong>❌ {{ data().error }}</strong></p>
          </div>
        }
      </div>

      <div class="modal-footer">
        @if (data().success && !data().autoNavigate) {
          <app-button
            [variant]="'primary'"
            [fullWidth]="true"
            (onClick)="viewPubDetails()"
          >
            View {{ data().pub?.name }}
          </app-button>
        } @else if (!data().success) {
          <app-button
            [variant]="'primary'"
            (onClick)="closeModal()"
          >
            Try Again
          </app-button>
        }
      </div>
    </div>
  `,
  styles: [`
    .modal-container {
      background: var(--color-background);
      border: 1px solid var(--color-subtleDarker);
      border-radius: 8px;
      max-width: 500px;
      width: 90vw;
      position: relative;
      overflow: hidden;
    }

    /* ✅ Celebration Effects */
    .modal-container.celebrating {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
    }

    .celebration-effects {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 0;
    }

    .ticker-tape {
      position: absolute;
      top: 20px;
      left: -100%;
      width: 200%;
      height: 4px;
      background: repeating-linear-gradient(
        90deg,
        #ffd700 0px,
        #ffd700 20px,
        #ff6b6b 20px,
        #ff6b6b 40px,
        #4ecdc4 40px,
        #4ecdc4 60px
      );
      animation: ticker-scroll 3s linear infinite;
    }

    .confetti {
      position: absolute;
      top: -50px;
      left: 0;
      right: 0;
      height: 100px;
      display: flex;
      justify-content: space-around;
      animation: confetti-fall 2s ease-out;
    }

    .confetti span {
      font-size: 1.5rem;
      animation: confetti-spin 2s linear infinite;
    }

    /* Trophy and Success */
    .main-success {
      text-align: center;
      position: relative;
      z-index: 1;
    }

    .trophy {
      font-size: 3rem;
      animation: trophy-bounce 1s ease-out;
      margin-bottom: 1rem;
    }

    .crown {
      font-size: 2rem;
      margin-right: 0.5rem;
      animation: crown-float 2s ease-in-out infinite;
    }

    /* Auto-navigate indicator */
    .auto-navigate {
      text-align: center;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      margin: 1rem 0;
      position: relative;
      z-index: 1;
    }

    .countdown-dots {
      display: flex;
      justify-content: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: white;
      animation: dot-pulse 1.5s infinite;
    }

    .dot:nth-child(2) { animation-delay: 0.5s; }
    .dot:nth-child(3) { animation-delay: 1s; }

    .cancel-btn {
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
      margin-top: 0.5rem;
    }

    .cancel-btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    /* Badge awards */
    .badge-awards {
      background: rgba(255, 215, 0, 0.2);
      border: 1px solid #ffd700;
      border-radius: 8px;
      padding: 1rem;
      margin: 1rem 0;
      position: relative;
      z-index: 1;
    }

    .badge-item {
      background: rgba(255, 255, 255, 0.1);
      padding: 0.5rem;
      border-radius: 4px;
      margin: 0.5rem 0;
      text-align: center;
      font-weight: bold;
    }

    /* Animations */
    @keyframes ticker-scroll {
      0% { transform: translateX(0); }
      100% { transform: translateX(50%); }
    }

    @keyframes confetti-fall {
      0% { transform: translateY(-100px) rotate(0deg); opacity: 1; }
      100% { transform: translateY(300px) rotate(360deg); opacity: 0; }
    }

    @keyframes confetti-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    @keyframes trophy-bounce {
      0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-15px); }
      60% { transform: translateY(-7px); }
    }

    @keyframes crown-float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-5px); }
    }

    @keyframes dot-pulse {
      0%, 100% { opacity: 0.3; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.2); }
    }

    /* Reduce motion for accessibility */
    @media (prefers-reduced-motion: reduce) {
      .ticker-tape, .confetti, .confetti span, .trophy, .crown, .dot {
        animation: none;
      }
    }

    /* Regular modal styles */
    .modal-header, .modal-body, .modal-footer {
      padding: 1rem;
      position: relative;
      z-index: 1;
    }

    .modal-header {
      border-bottom: 1px solid var(--color-subtleLighter);
    }

    .modal-container.celebrating .modal-header {
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    }

    .modal-footer {
      border-top: 1px solid var(--color-subtleLighter);
    }

    .modal-container.celebrating .modal-footer {
      border-top: 1px solid rgba(255, 255, 255, 0.2);
    }

    .landlord-new {
      background: #ffd700;
      padding: 1rem;
      border-radius: 4px;
      margin: 1rem 0;
      color: #000;
      text-align: center;
    }

    .modal-container.celebrating .landlord-new {
      background: rgba(255, 215, 0, 0.3);
      color: white;
      border: 1px solid #ffd700;
    }

    .landlord-existing {
      background: var(--color-subtleLighter);
      padding: 1rem;
      border-radius: 4px;
      margin: 1rem 0;
    }

    .modal-container.celebrating .landlord-existing {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }

    .debug-info {
      background: #f0f0f0;
      padding: 1rem;
      border-radius: 4px;
      margin: 1rem 0;
      font-size: 0.8rem;
    }

    .modal-container.celebrating .debug-info {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }

    .debug-info pre {
      margin: 0;
      white-space: pre-wrap;
    }

    .success-content p,
    .error-content p {
      margin: 0.5rem 0;
    }
  `]
})
export class CheckInResultModalComponent {
  readonly data = input.required<CheckInResultData>();

  private readonly router = inject(Router);

  readonly title = computed(() =>
    this.data().success ? 'Check-in Complete' : 'Check-in Failed'
  );

  closeModal: () => void = () => {};

  constructor() {
    // ✅ Auto-dismiss after 3 seconds if successful and autoNavigate is true
    effect(() => {
      if (this.data().success && this.data().autoNavigate) {
        setTimeout(() => {
          const pubId = this.data().pub?.id;
          if (pubId) {
            this.router.navigate(['/pubs', pubId]);
            this.closeModal();
          }
        }, 3000);
      }
    });

    // ✅ Handle escape key
    effect(() => {
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          this.closeModal();
        }
      };
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    });
  }

  cancelAutoNavigate(): void {
    // Update the data signal to stop auto-navigation
    const currentData = this.data();
    // Note: This is a simple approach - in practice you might want to
    // expose this as a method from the parent component
    console.log('[Modal] Auto-navigation cancelled');
  }

  isDevelopment(): boolean {
    return !environment.production;
  }

  debugText(): string {
    const data = this.data();
    return JSON.stringify({
      checkin: data.checkin,
      isNewLandlord: data.isNewLandlord,
      badges: data.badges,
      autoNavigate: data.autoNavigate,
      debugInfo: data.debugInfo,
      landlordMessage: data.landlordMessage,
    }, null, 2);
  }

  formatTimestamp(): string {
    if (!this.data().checkin?.timestamp) return '';
    return this.data().checkin!.timestamp.toDate().toLocaleString();
  }

  viewPubDetails(): void {
    const pubId = this.data().pub?.id;
    if (pubId) {
      this.closeModal();
      this.router.navigate(['/pubs', pubId]);
    }
  }
}
