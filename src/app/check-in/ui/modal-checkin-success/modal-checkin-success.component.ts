// src/app/check-in/ui/modal-checkin-success/modal-checkin-success.component.ts
import { Component, inject, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { BadgeIconComponent } from '@badges/ui/badge-icon/badge-icon.component';
import { CheckinStore } from '../../data-access/check-in.store';
import { AuthStore } from '@auth/data-access/auth.store';
import { PubStore } from '@pubs/data-access/pub.store';
import { BADGE_DEFINITIONS } from '@badges/utils/badge.config';
import { ButtonVariant } from '@shared/ui/button/button.params';
import { environment } from '../../../../environments/environment';
import { CheckInResultData } from '../../utils/check-in.models';

@Component({
  selector: 'app-modal-checkin-success',
  imports: [CommonModule, ButtonComponent, BadgeIconComponent],
  template: `
    <div class="modal-container" [class.success]="data().success">
      <div class="modal-header">
        <h2>{{ title() }}</h2>
      </div>

      <div class="modal-body">
        @if (data().success) {
          <div class="success-content">
            <!-- Main Success Icon -->
            <div class="main-icon">✅</div>

            <!-- Basic Check-in Info -->
            <div class="basic-info">
              <p><strong>Checked into {{ data().pub?.name }}!</strong></p>
              @if (data().checkin?.timestamp) {
                <p class="timestamp">
                  {{ formatTimestamp(data().checkin!.timestamp) }}
                </p>
              }
            </div>

            <!-- Personalized Stats Section -->
            <div class="personalized-stats">
              <h3>Your Progress</h3>
              <div class="stats-grid">
                <div class="stat-item">
                  <span class="stat-number">{{ totalPubsCount() }}</span>
                  <span class="stat-label">Total Pubs Visited</span>
                </div>

                <div class="stat-item">
                  <span class="stat-number">{{ totalCheckinsCount() }}</span>
                  <span class="stat-label">Total Check-ins</span>
                </div>
              </div>

              <!-- Pub-specific info -->
              <div class="pub-specific">
                @if (isFirstTimeAtPub()) {
                  <p class="milestone">🆕 First check-in to {{ data().pub?.name }}!</p>
                } @else {
                  <p class="milestone">
                    {{ getCurrentPubCheckinsCount() }}{{ getOrdinalSuffix(getCurrentPubCheckinsCount()) }}
                    time checking in to {{ data().pub?.name }}
                  </p>
                }
              </div>

              <!-- Consecutive days (if applicable) -->
              @if (consecutiveDaysCount() > 1) {
                <div class="consecutive-days">
                  <p class="milestone">
                    🔥 {{ consecutiveDaysCount() }} consecutive days checked in!
                  </p>
                </div>
              }
            </div>

            <!-- Badges Section -->
            @if (hasNewBadges()) {
              <div class="badges-section">
                <h3>🏅 New Badges Earned!</h3>
                <div class="badges-grid">
                  @for (badgeData of displayBadges(); track badgeData.badgeId) {
                    <div class="badge-award">
                      <div class="badge-display">
                        <app-badge-icon
                          [badge]="getBadgeDefinition(badgeData.badgeId)"
                        ></app-badge-icon>
                      </div>
                      <div class="badge-info">
                        <span class="badge-name">{{ badgeData.name }}</span>
                        @if (getBadgeDefinition(badgeData.badgeId)?.description) {
                          <span class="badge-description">
                            {{ getBadgeDefinition(badgeData.badgeId)?.description }}
                          </span>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Development Debug -->
            @if (isDevelopment()) {
              <details class="debug-info">
                <summary>🐛 Debug Info</summary>
                <pre>{{ debugInfo() | json }}</pre>
              </details>
            }
          </div>
        } @else {
          <div class="error-content">
            <div class="main-icon">❌</div>
            <p><strong>{{ data().error || 'Check-in failed' }}</strong></p>
          </div>
        }
      </div>

      <div class="modal-footer">
        @if (data().success) {
          <div class="button-group">
            @if (hasLandlordInfo()) {
              <app-button
                [fullWidth]="true"
                [variant]="ButtonVariant.PRIMARY"
                (onClick)="handleNext()"
              >
                Next →
              </app-button>
            } @else {
              <app-button
                variant="primary"
                (onClick)="handleNavigate()"
              >
                View Pub
              </app-button>
            }
          </div>
        } @else {
          <app-button
            variant="primary"
            [fullWidth]="true"
            (onClick)="handleDismiss()"
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
      max-width: 420px;
      width: 100%;
    }

    .modal-container.success {
      border-color: #28a745;
    }

    .modal-header, .modal-body, .modal-footer {
      padding: 1rem;
    }

    .modal-header {
      border-bottom: 1px solid var(--color-subtleLighter);
      text-align: center;
      padding: 0.75rem 1rem;
    }

    .modal-header h2 {
      margin: 0;
      color: var(--color-textPrimary);
      font-size: 1.25rem;
    }

    .modal-footer {
      border-top: 1px solid var(--color-subtleLighter);
      padding: 0.75rem 1rem;
    }

    .main-icon {
      font-size: 2.5rem;
      text-align: center;
      margin-bottom: 0.75rem;
    }

    .success-content {
      text-align: center;
    }

    .basic-info {
      margin-bottom: 1rem;
    }

    .basic-info p {
      margin: 0.25rem 0;
    }

    .timestamp {
      font-size: 0.85rem;
      color: var(--color-textSecondary);
    }

    /* Personalized Stats Section */
    .personalized-stats {
      background: var(--color-subtleLighter);
      border-radius: 6px;
      padding: 1rem;
      margin: 1rem 0;
      text-align: left;
    }

    .personalized-stats h3 {
      margin: 0 0 0.75rem 0;
      color: var(--color-textPrimary);
      font-size: 1rem;
      text-align: center;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }

    .stat-item {
      text-align: center;
      padding: 0.75rem;
      background: var(--color-background);
      border-radius: 4px;
      border: 1px solid var(--color-subtleDarker);
    }

    .stat-number {
      display: block;
      font-size: 1.25rem;
      font-weight: bold;
      color: #28a745;
      margin-bottom: 0.125rem;
    }

    .stat-label {
      display: block;
      font-size: 0.7rem;
      color: var(--color-textSecondary);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .pub-specific, .consecutive-days {
      text-align: center;
      margin: 0.5rem 0;
    }

    .milestone {
      font-weight: 600;
      color: var(--color-textPrimary);
      margin: 0.25rem 0;
      padding: 0.5rem;
      background: rgba(40, 167, 69, 0.1);
      border-radius: 4px;
      border-left: 3px solid #28a745;
      font-size: 0.9rem;
    }

    /* Badges Section */
    .badges-section {
      background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
      border-radius: 6px;
      padding: 1rem;
      margin: 1rem 0;
      color: #333;
    }

    .badges-section h3 {
      margin: 0 0 0.75rem 0;
      text-align: center;
      font-size: 1rem;
    }

    .badges-grid {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .badge-award {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: rgba(255, 255, 255, 0.9);
      padding: 0.75rem;
      border-radius: 6px;
      text-align: left;
    }

    .badge-display {
      flex-shrink: 0;
    }

    .badge-info {
      flex: 1;
    }

    .badge-name {
      display: block;
      font-weight: bold;
      font-size: 0.9rem;
      color: #333;
      margin-bottom: 0.125rem;
    }

    .badge-description {
      display: block;
      font-size: 0.8rem;
      color: #666;
      line-height: 1.2;
    }

    .error-content {
      text-align: center;
      color: #dc3545;
    }

    .button-group {
      display: flex;
      gap: 0.75rem;
      justify-content: center;
    }

    .debug-info {
      background: #f8f9fa;
      padding: 0.75rem;
      border-radius: 4px;
      margin-top: 1rem;
      font-size: 0.7rem;
      text-align: left;
    }

    .debug-info pre {
      margin: 0.25rem 0 0 0;
      white-space: pre-wrap;
    }

    @media (max-width: 480px) {
      .modal-header, .modal-body, .modal-footer {
        padding: 0.75rem;
      }

      .modal-header {
        padding: 0.5rem 0.75rem;
      }

      .modal-footer {
        padding: 0.5rem 0.75rem;
      }

      .stats-grid {
        grid-template-columns: 1fr;
        gap: 0.5rem;
      }

      .button-group {
        flex-direction: column;
        gap: 0.5rem;
      }

      .badge-award {
        flex-direction: row;
        text-align: left;
        gap: 0.5rem;
        padding: 0.5rem;
      }

      .main-icon {
        font-size: 2rem;
        margin-bottom: 0.5rem;
      }
    }
  `]
})
export class ModalCheckinSuccessComponent {
  protected readonly ButtonVariant = ButtonVariant;

  // Inputs
  readonly data = input.required<CheckInResultData>();
  readonly UserExperienceLevel = input<string>('');

  // Outputs
  readonly navigate = output<void>();
  readonly dismiss = output<void>();
  readonly nextModal = output<void>();

  // Store injections
  private readonly checkinStore = inject(CheckinStore);
  private readonly authStore = inject(AuthStore);
  private readonly pubStore = inject(PubStore);

  // Computed properties for UI logic
  readonly title = computed(() =>
    this.data().success ? 'Check-in Successful!' : 'Check-in Failed'
  );

  readonly hasLandlordInfo = computed(() =>
    this.data().success && (this.data().isNewLandlord || this.data().landlordMessage)
  );

  readonly hasNewBadges = computed(() =>
    this.data().badges && this.data().badges!.length > 0
  );

  readonly displayBadges = computed(() =>
    this.data().badges || []
  );

  // Personalized stats computations
  readonly totalCheckinsCount = computed(() => {
    const userCheckins = this.checkinStore.checkins().filter(
      c => c.userId === this.authStore.uid()
    );
    return userCheckins.length;
  });

  readonly totalPubsCount = computed(() => {
    const userCheckins = this.checkinStore.checkins().filter(
      c => c.userId === this.authStore.uid()
    );
    const uniquePubIds = new Set(userCheckins.map(c => c.pubId));
    return uniquePubIds.size;
  });

  readonly isFirstTimeAtPub = computed(() => {
    const currentPubId = this.data().pub?.id;
    if (!currentPubId) return false;

    const userCheckins = this.checkinStore.checkins().filter(
      c => c.userId === this.authStore.uid() && c.pubId === currentPubId
    );
    return userCheckins.length === 1;
  });

  readonly getCurrentPubCheckinsCount = computed(() => {
    const currentPubId = this.data().pub?.id;
    if (!currentPubId) return 0;

    const userCheckins = this.checkinStore.checkins().filter(
      c => c.userId === this.authStore.uid() && c.pubId === currentPubId
    );
    return userCheckins.length;
  });

  readonly consecutiveDaysCount = computed(() => {
    const userCheckins = this.checkinStore.checkins()
      .filter(c => c.userId === this.authStore.uid())
      .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());

    if (userCheckins.length === 0) return 0;

    let consecutiveDays = 1;
    const today = new Date().toISOString().split('T')[0];
    let currentDate = today;

    for (let i = 1; i < userCheckins.length; i++) {
      const prevDate = new Date(currentDate);
      prevDate.setDate(prevDate.getDate() - 1);
      const expectedPrevDate = prevDate.toISOString().split('T')[0];

      const checkInDate = userCheckins[i].dateKey;

      if (checkInDate === expectedPrevDate) {
        consecutiveDays++;
        currentDate = checkInDate;
      } else {
        break;
      }
    }

    return consecutiveDays;
  });

  // Event handlers
  handleNavigate(): void {
    console.log('[ModalCheckinSuccess] Navigate requested');
    this.navigate.emit();
  }

  handleDismiss(): void {
    console.log('[ModalCheckinSuccess] Dismiss requested');
    this.dismiss.emit();
  }

  handleNext(): void {
    console.log('[ModalCheckinSuccess] Next modal requested');
    this.nextModal.emit();
  }

  // Utility methods
  formatTimestamp(timestamp: any): string {
    if (!timestamp) return '';

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString();
    } catch {
      return 'Just now';
    }
  }

  getOrdinalSuffix(num: number): string {
    const lastDigit = num % 10;
    const lastTwoDigits = num % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
      return 'th';
    }

    switch (lastDigit) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  getBadgeDefinition(badgeId: string) {
    return BADGE_DEFINITIONS.find(b => b.id === badgeId);
  }

  isDevelopment(): boolean {
    return !environment.production;
  }

  debugInfo(): any {
    return {
      loading: this.checkinStore.loading(),
      error: this.checkinStore.error(),
      checkinSuccess: this.checkinStore.checkinSuccess(),
      landlordMessage: this.checkinStore.landlordMessage(),
      dataCount: this.checkinStore.data().length,
      totalCheckins: this.totalCheckinsCount(),
      totalPubs: this.totalPubsCount(),
      isFirstTime: this.isFirstTimeAtPub(),
      pubCheckins: this.getCurrentPubCheckinsCount(),
      consecutiveDays: this.consecutiveDaysCount()
    };
  }
}
