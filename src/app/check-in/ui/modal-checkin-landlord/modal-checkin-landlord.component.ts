// src/app/check-in/ui/modal-checkin-landlord/modal-checkin-landlord.component.ts
import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import { AuthStore } from '@auth/data-access/auth.store';
import { LandlordStore } from '@landlord/data-access/landlord.store';
import { formatLandlordClaim } from '@landlord/utils/landlord.utils';
import { UserProgressionService } from '@shared/data-access/user-progression.service';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { ButtonVariant } from '@shared/ui/button/button.params';
import { toDate } from '@shared/utils/timestamp.utils';
import { UserExperienceLevel } from '@shared/utils/user-progression.models';
import { UserStore } from '@users/data-access/user.store';
import { environment } from '../../../../environments/environment';

type LandlordModalData = {
  isNewLandlord: boolean;
  landlordMessage?: string;
  pub?: any;
  previousLandlord?: any;
};

@Component({
  selector: 'app-modal-checkin-landlord',
  imports: [CommonModule, ButtonComponent],
  template: `
    <div class="checkin-modal-container" [class.new-landlord]="isNewLandlordToday()">
      <div class="checkin-modal-header">
        <h2>{{ title() }}</h2>
      </div>

      <div class="checkin-modal-body">
        <!-- New User Explanation Section -->
        @if (shouldExplainLandlordSystem()) {
          <div class="explanation-section">
            <details>
              <summary>
                <h3>👑 How Landlord Status Works</h3>
              </summary>
              <div class="explanation-content">
                <ul class="landlord-rules">
                  <li>First person to check in each day becomes the landlord</li>
                  <li>You keep landlord status until someone takes it from you</li>
                  <li>Landlord can only be awarded once per day</li>
                  <li>If there's no landlord yet, you automatically get it</li>
                  <li>After midday, you can steal it from the current landlord</li>
                </ul>
              </div>
            </details>
          </div>
        }

        <!-- Current Landlord Display -->
        @if (currentLandlord()) {
          <div class="current-landlord-section">
            <h3>Current Landlord</h3>
            <div class="landlord-card-compact">
              <div class="landlord-avatar-small">
                @if (currentLandlordUser()?.photoURL) {
                  <img
                    [src]="currentLandlordUser()!.photoURL"
                    [alt]="currentLandlordDisplayName()"
                  />
                } @else {
                  <div class="avatar-placeholder-small">
                    {{ getInitials(currentLandlordDisplayName()) }}
                  </div>
                }
              </div>
              <div class="landlord-details">
                <div class="landlord-name-row">
                  <span class="landlord-name-compact">{{ currentLandlordDisplayName() }}</span>
                  <span class="crown-badge-small">👑</span>
                </div>
                <div class="landlord-meta">
                  <span class="claim-date">{{ formatClaimDate() }}</span>
                  <span class="divider">•</span>
                  <span class="duration">{{ formatLandlordDuration() }}</span>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- Main Status Section -->
        <div class="status-section">
          @if (isNewLandlordToday()) {
            <!-- New Landlord Celebration -->
            <div class="status-content celebration">
              <div class="main-icon">👑</div>
              <h3>Congratulations!</h3>
              <p>
                <strong>You're the new landlord of {{ data().pub?.name }}!</strong>
              </p>
              <div class="achievement-highlight">
                <p>🎉 You were the first to check in today!</p>
              </div>
            </div>
          } @else if (isExistingLandlordRenewal()) {
            <!-- Existing Landlord Renewal -->
            <div class="status-content renewal">
              <div class="main-icon">🔄</div>
              <h3>Landlord Status Renewed!</h3>
              <p>
                <strong>You're still the landlord of {{ data().pub?.name }}</strong>
              </p>
              <div class="achievement-highlight">
                <p>👑 Another day, another reign!</p>
              </div>
            </div>
          } @else if (wasPreviouslyLandlordHere()) {
            <!-- Lost Landlord Status -->
            <div class="status-content lost-status">
              <div class="main-icon">😔</div>
              <h3>Landlord Status Lost</h3>
              <p>Someone beat you to it today at {{ data().pub?.name }}</p>
              <div class="consolation">
                <p>⏰ Try checking in earlier tomorrow to reclaim your throne!</p>
              </div>
            </div>
          } @else if (neverLandlordBefore()) {
            <!-- Never Been Landlord -->
            <div class="status-content regular-checkin">
              <div class="main-icon">🍺</div>
              <h3>Check-in Complete!</h3>
              <p>{{ currentLandlordDisplayName() }} got here first today</p>
              <div class="encouragement">
                <p>💡 <strong>Tip:</strong> Check in early tomorrow to become the landlord!</p>
              </div>
            </div>
          }
        </div>

        <!-- Previous Landlord History (if relevant) -->
        @if (wasPreviouslyLandlordHere() && previousLandlordDays() > 0) {
          <div class="history-section">
            <p class="history-note">
              📅 You were landlord here {{ previousLandlordDays() }} day{{
                previousLandlordDays() > 1 ? 's' : ''
              }}
              ago
            </p>
          </div>
        }

        <!-- Development Debug -->
        @if (isDevelopment()) {
          <details class="debug-info">
            <summary>🐛 Debug Info</summary>
            <pre>{{ debugLandlordState() | json }}</pre>
          </details>
        }
      </div>

      <div class="checkin-modal-footer">
        <div class="button-group">
          <app-button variant="secondary" (onClick)="handleDismiss()"> Back to Home </app-button>

          <app-button [variant]="ButtonVariant.PRIMARY" (onClick)="handleNavigate()">
            View {{ data().pub?.name }}
          </app-button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      @use 'styles/components/check-in-modals';
      .checkin-modal-container.new-landlord .checkin-modal-header {
        border-bottom-color: rgba(0, 0, 0, 0.2);
      }

      .checkin-modal-header h2 {
        margin: 0;
        color: var(--textPrimary);
        font-size: 1.25rem;
      }

      .checkin-modal-container.new-landlord .checkin-modal-header h2 {
        color: #000;
      }

      .checkin-modal-container.new-landlord .checkin-modal-footer {
        border-top-color: rgba(0, 0, 0, 0.2);
      }

      /* Section Headers */
      h3 {
        margin: 0 0 0.75rem 0;
        font-size: 1rem;
        color: var(--textPrimary);
      }

      .modal-container.new-landlord h3 {
        color: #000;
      }

      /* Explanation Section */
      .explanation-section {
        background: var(--background-lighter);
        border-radius: 6px;
        padding: 1rem;
        margin-bottom: 1rem;
      }

      .modal-container.new-landlord .explanation-section {
        background: rgba(0, 0, 0, 0.1);
      }

      .explanation-content ul.landlord-rules {
        margin: 0;
        padding-left: 1.2rem;
        list-style: none;
      }

      .landlord-rules li {
        margin: 0.4rem 0;
        font-size: 0.85rem;
        line-height: 1.3;
        position: relative;
      }

      .landlord-rules li::before {
        content: '•';
        color: #28a745;
        font-weight: bold;
        position: absolute;
        left: -1rem;
      }

      /* Current Landlord Section - Compact */
      .current-landlord-section {
        margin-bottom: 1rem;
      }

      .landlord-card-compact {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem;
        background: var(--background-lighter);
        border-radius: 4px;
        border: 1px solid var(--background-darker);
      }

      .modal-container.new-landlord .landlord-card-compact {
        background: rgba(0, 0, 0, 0.1);
        border-color: rgba(0, 0, 0, 0.2);
      }

      .landlord-avatar-small {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        overflow: hidden;
        flex-shrink: 0;
      }

      .landlord-avatar-small img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .avatar-placeholder-small {
        width: 100%;
        height: 100%;
        background: #28a745;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 0.75rem;
      }

      .landlord-details {
        flex: 1;
        min-width: 0;
      }

      .landlord-name-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.125rem;
      }

      .landlord-name-compact {
        font-weight: bold;
        font-size: 0.85rem;
        color: var(--textPrimary);
      }

      .modal-container.new-landlord .landlord-name-compact {
        color: #000;
      }

      .crown-badge-small {
        font-size: 1rem;
        flex-shrink: 0;
      }

      .landlord-meta {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.7rem;
        color: var(--text-secondary);
      }

      .modal-container.new-landlord .landlord-meta {
        color: rgba(0, 0, 0, 0.7);
      }

      .divider {
        opacity: 0.6;
      }

      /* Status Section */
      .status-section {
        margin: 1rem 0;
      }

      .status-content {
        text-align: center;
        padding: 1rem;
        border-radius: 6px;
      }

      .status-content.celebration {
        background: rgba(40, 167, 69, 0.1);
        border: 1px solid #28a745;
      }

      .modal-container.new-landlord .status-content.celebration {
        background: rgba(0, 0, 0, 0.1);
        border-color: rgba(0, 0, 0, 0.2);
      }

      .status-content.renewal {
        background: rgba(255, 193, 7, 0.1);
        border: 1px solid #ffc107;
      }

      .status-content.lost-status {
        background: rgba(220, 53, 69, 0.1);
        border: 1px solid #dc3545;
      }

      .status-content.regular-checkin {
        background: var(--background-lighter);
        border: 1px solid var(--background-darker);
      }

      .main-icon {
        font-size: 2.5rem;
        margin-bottom: 0.75rem;
      }

      .status-content h3 {
        margin-bottom: 0.5rem;
        font-size: 1.1rem;
      }

      .status-content p {
        margin: 0.25rem 0;
        font-size: 0.9rem;
      }

      .achievement-highlight,
      .consolation,
      .encouragement {
        background: rgba(255, 255, 255, 0.3);
        padding: 0.5rem;
        border-radius: 4px;
        margin: 0.75rem 0 0 0;
      }

      .modal-container.new-landlord .achievement-highlight,
      .modal-container.new-landlord .consolation,
      .modal-container.new-landlord .encouragement {
        background: rgba(0, 0, 0, 0.1);
      }

      .achievement-highlight p,
      .consolation p,
      .encouragement p {
        margin: 0;
        font-size: 0.85rem;
        line-height: 1.3;
      }

      /* History Section */
      .history-section {
        margin: 0.75rem 0;
        text-align: center;
      }

      .history-note {
        margin: 0;
        font-size: 0.85rem;
        color: var(--text-secondary);
        font-style: italic;
      }

      .modal-container.new-landlord .history-note {
        color: rgba(0, 0, 0, 0.7);
      }

      /* Button Group */
      .button-group {
        display: flex;
        gap: 0.75rem;
        justify-content: center;
      }

      /* Debug Info */
      .debug-info {
        background: rgba(248, 249, 250, 0.9);
        padding: 0.75rem;
        border-radius: 4px;
        margin-top: 1rem;
        font-size: 0.7rem;
        text-align: left;
      }

      .modal-container.new-landlord .debug-info {
        background: rgba(0, 0, 0, 0.1);
        color: #000;
      }

      .debug-info pre {
        margin: 0.25rem 0 0 0;
        white-space: pre-wrap;
      }

      @media (max-width: 480px) {
        .button-group {
          flex-direction: column;
          gap: 0.5rem;
        }

        .landlord-card-compact {
          flex-direction: row;
          text-align: left;
          gap: 0.5rem;
          padding: 0.5rem;
        }

        .landlord-name-row {
          flex-direction: column;
          align-items: flex-start;
          gap: 0.125rem;
        }

        .crown-badge-small {
          align-self: flex-end;
        }

        .main-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }
      }
    `,
  ],
})
export class ModalCheckinLandlordComponent {
  protected readonly ButtonVariant = ButtonVariant;

  // Inputs
  readonly data = input.required<LandlordModalData>();
  readonly UserExperienceLevel = input<UserExperienceLevel>('guest');

  // Outputs
  readonly navigate = output<void>();
  readonly dismiss = output<void>();
  readonly previousModal = output<void>();

  // Store injections
  private readonly landlordStore = inject(LandlordStore);
  private readonly authStore = inject(AuthStore);
  private readonly userStore = inject(UserStore);
  private readonly userProgressionService = inject(UserProgressionService);

  // Current landlord data
  readonly currentLandlord = computed(() => {
    const pubId = this.data().pub?.id;
    if (!pubId) return null;
    return this.landlordStore.get(pubId);
  });

  readonly currentLandlordUser = computed(() => {
    const landlord = this.currentLandlord();
    if (!landlord) return null;

    // For now, we'll need to implement user lookup by ID
    // This would typically come from a UserService.getUserById() method
    return {
      uid: landlord.userId,
      displayName: `User ${landlord.userId.substring(0, 8)}`,
      photoURL: undefined, // Would come from actual user lookup
    };
  });

  readonly currentLandlordDisplayName = computed(() => {
    const user = this.currentLandlordUser();
    const currentUser = this.authStore.user();

    if (!user) return 'Unknown User';

    // Check if it's the current user
    if (currentUser && user.uid === currentUser.uid) {
      return 'You';
    }

    return user.displayName || `User ${user.uid.substring(0, 8)}`;
  });

  // User status computations
  readonly shouldExplainLandlordSystem = computed(() => {
    return (
      this.userProgressionService.isBrandNewUser() || this.userProgressionService.isFirstTimeUser()
    );
  });

  readonly isNewLandlordToday = computed(() => {
    const currentUser = this.authStore.user();
    const landlord = this.currentLandlord();

    return this.data().isNewLandlord && landlord?.userId === currentUser?.uid;
  });

  readonly isExistingLandlordRenewal = computed(() => {
    const currentUser = this.authStore.user();
    const landlord = this.currentLandlord();

    // They're still landlord but checked in again today
    return !this.data().isNewLandlord && landlord?.userId === currentUser?.uid;
  });

  readonly wasPreviouslyLandlordHere = computed(() => {
    const currentUser = this.authStore.user();
    const currentLandlord = this.currentLandlord();
    const pub = this.data().pub;

    if (!currentUser || !pub || currentLandlord?.userId === currentUser.uid) {
      return false;
    }

    // Check landlord history in pub data
    const landlordHistory = pub.landlordHistory || [];
    return landlordHistory.some((hist: any) => hist.userId === currentUser.uid);
  });

  readonly neverLandlordBefore = computed(() => {
    return (
      !this.isNewLandlordToday() &&
      !this.isExistingLandlordRenewal() &&
      !this.wasPreviouslyLandlordHere()
    );
  });

  readonly previousLandlordDays = computed(() => {
    const currentUser = this.authStore.user();
    const pub = this.data().pub;

    if (!currentUser || !pub) return 0;

    const landlordHistory = pub.landlordHistory || [];
    const userHistory = landlordHistory.filter((hist: any) => hist.userId === currentUser.uid);

    if (userHistory.length === 0) return 0;

    // Find most recent previous landlord entry
    const today = new Date().toISOString().split('T')[0];
    const previousEntries = userHistory.filter((hist: any) => hist.dateKey !== today);

    if (previousEntries.length === 0) return 0;

    // Calculate days since most recent
    const mostRecent = previousEntries.sort(
      (a: any, b: any) => new Date(b.dateKey).getTime() - new Date(a.dateKey).getTime()
    )[0];

    const daysDiff = Math.floor(
      (new Date().getTime() - new Date(mostRecent.dateKey).getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysDiff;
  });

  // UI computed properties
  readonly title = computed(() => {
    if (this.isNewLandlordToday()) return 'New Landlord!';
    if (this.isExistingLandlordRenewal()) return 'Landlord Renewed!';
    if (this.wasPreviouslyLandlordHere()) return 'Landlord Status Lost';
    return 'Check-in Complete';
  });

  // Event handlers
  handleNavigate(): void {
    console.log('[ModalCheckinLandlord] Navigate requested');
    this.navigate.emit();
  }

  handleDismiss(): void {
    console.log('[ModalCheckinLandlord] Dismiss requested');
    this.dismiss.emit();
  }

  handlePrevious(): void {
    console.log('[ModalCheckinLandlord] Previous modal requested');
    this.previousModal.emit();
  }

  // Utility methods
  formatClaimTime(): string {
    const landlord = this.currentLandlord();
    if (!landlord) return '';

    try {
      return formatLandlordClaim(landlord);
    } catch {
      return 'Earlier today';
    }
  }

  formatClaimDate(): string {
    const landlord = this.currentLandlord();
    if (!landlord) return '';

    try {
      const date = landlord.claimedAt;
      const claimDate =
        date && typeof date === 'object' && 'toDate' in date ? date.toDate() : toDate(date);

      if (!claimDate) return '';

      const today = new Date();
      const isToday = claimDate.toDateString() === today.toDateString();

      if (isToday) {
        return claimDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }

      return claimDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return 'Today';
    }
  }

  formatLandlordDuration(): string {
    const landlord = this.currentLandlord();
    const pub = this.data().pub;
    if (!landlord || !pub) return '';

    try {
      // Calculate consecutive days from landlord history
      const landlordHistory = pub.landlordHistory || [];
      const consecutiveDays = this.calculateConsecutiveLandlordDays(
        landlord.userId,
        landlordHistory
      );

      // If multiple days, show that primarily
      if (consecutiveDays > 1) {
        // Add today's time for extra dynamism
        const claimTime = landlord.claimedAt;
        const claimDate =
          claimTime && typeof claimTime === 'object' && 'toDate' in claimTime
            ? claimTime.toDate()
            : toDate(claimTime);

        if (!claimDate) return '';

        const now = new Date();
        const diffMs = now.getTime() - claimDate.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        let timeToday = '';
        if (diffHours > 0) {
          timeToday = ` +${diffHours}h`;
        } else if (diffMinutes > 5) {
          timeToday = ` +${diffMinutes}m`;
        }

        return `${consecutiveDays} days${timeToday}`;
      }

      // Single day - show dynamic time
      const claimTime = landlord.claimedAt;
      const claimDate =
        claimTime && typeof claimTime === 'object' && 'toDate' in claimTime
          ? claimTime.toDate()
          : toDate(claimTime);

      if (!claimDate) return '';

      const now = new Date();
      const diffMs = now.getTime() - claimDate.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      if (diffHours > 0) {
        return `${diffHours}h ${diffMinutes}m`;
      } else if (diffMinutes > 0) {
        return `${diffMinutes}m`;
      } else {
        return 'Just now';
      }
    } catch {
      return 'Today';
    }
  }

  private calculateConsecutiveLandlordDays(userId: string, landlordHistory: any[]): number {
    if (!landlordHistory || landlordHistory.length === 0) return 1;

    // Filter to this user's entries and sort by date descending
    const userEntries = landlordHistory
      .filter(entry => entry.userId === userId)
      .sort((a, b) => new Date(b.dateKey).getTime() - new Date(a.dateKey).getTime());

    if (userEntries.length === 0) return 1;

    // Start counting from today
    let consecutiveDays = 1;
    const today = new Date();
    let currentDate = new Date(today);

    // Check each previous day
    for (let i = 0; i < userEntries.length; i++) {
      currentDate.setDate(currentDate.getDate() - 1);
      const expectedDateKey = currentDate.toISOString().split('T')[0];

      // Find entry for this expected date
      const entryForDate = userEntries.find(entry => entry.dateKey === expectedDateKey);

      if (entryForDate) {
        consecutiveDays++;
      } else {
        break; // Streak broken
      }
    }

    return consecutiveDays;
  }

  getInitials(name: string): string {
    if (!name || name === 'You') return 'Y';

    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }

  isDevelopment(): boolean {
    return !environment.production;
  }

  debugLandlordState(): any {
    const pubId = this.data().pub?.id;
    return {
      pubId,
      currentLandlord: this.currentLandlord(),
      isNewLandlordToday: this.isNewLandlordToday(),
      isExistingLandlordRenewal: this.isExistingLandlordRenewal(),
      wasPreviouslyLandlordHere: this.wasPreviouslyLandlordHere(),
      neverLandlordBefore: this.neverLandlordBefore(),
      shouldExplainSystem: this.shouldExplainLandlordSystem(),
      UserExperienceLevel: this.userProgressionService.userExperienceLevel(),
      landlordStoreState: {
        loading: this.landlordStore.loading(),
        error: this.landlordStore.error(),
      },
    };
  }
}
