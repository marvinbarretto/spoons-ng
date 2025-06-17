// src/app/home/ui/profile-customization-modal/widgets/account-upgrade-widget/account-upgrade-widget.component.ts
import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { User } from '@users/utils/user.model';

@Component({
  selector: 'app-account-upgrade-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    @if (shouldShowUpgrade()) {
      <div class="account-upgrade-widget">
        <div class="upgrade-header">
          <h3 class="widget-title">🚀 Upgrade Your Account</h3>
          <span class="current-status">{{ getAccountStatus() }}</span>
        </div>

        <!-- ✅ Benefits list -->
        <div class="benefits-section">
          <p class="benefits-intro">Sign up with Google to unlock:</p>
          <ul class="benefits-list">
            <li class="benefit-item">
              <span class="benefit-icon">💾</span>
              <span class="benefit-text">Save your progress permanently</span>
            </li>
            <li class="benefit-item">
              <span class="benefit-icon">🏆</span>
              <span class="benefit-text">Appear on global leaderboards</span>
            </li>
            <li class="benefit-item">
              <span class="benefit-icon">🎨</span>
              <span class="benefit-text">Access premium avatars</span>
            </li>
            <li class="benefit-item">
              <span class="benefit-icon">🔄</span>
              <span class="benefit-text">Sync across all your devices</span>
            </li>
            <li class="benefit-item">
              <span class="benefit-icon">🎯</span>
              <span class="benefit-text">Join community missions</span>
            </li>
          </ul>
        </div>

        <!-- ✅ Current progress summary -->
        @if (hasProgress()) {
          <div class="progress-summary">
            <p class="progress-intro">Your current progress:</p>
            <div class="progress-stats">
              <div class="stat">
                <span class="stat-number">{{ pubsVisited() }}</span>
                <span class="stat-label">Pubs visited</span>
              </div>
              <div class="stat">
                <span class="stat-number">{{ badgeCount() }}</span>
                <span class="stat-label">Badges earned</span>
              </div>
            </div>
            <p class="progress-note">✨ All of this will be saved when you sign up!</p>
          </div>
        }

        <!-- ✅ Action buttons -->
        <div class="action-buttons">
          <button
            type="button"
            class="upgrade-btn primary"
            (click)="upgradeToGoogle()"
          >
            <span class="btn-icon">🔗</span>
            <span>Sign up with Google</span>
          </button>

          <button
            type="button"
            class="upgrade-btn secondary"
            (click)="continueAnonymous()"
          >
            <span>Continue as guest</span>
          </button>
        </div>

        <!-- ✅ Privacy note -->
        <div class="privacy-note">
          <span class="privacy-icon">🔒</span>
          <span class="privacy-text">We only use your Google account for sign-in. Your pub data stays private.</span>
        </div>
      </div>
    }
  `,
  styles: `
    .account-upgrade-widget {
      padding: 1.5rem;
      background: linear-gradient(135deg, var(--color-accent-light) 0%, var(--color-lighter) 100%);
      border: 1px solid var(--color-accent);
      border-radius: 8px;
    }

    /* ✅ Header */
    .upgrade-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .widget-title {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text);
    }

    .current-status {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      background: rgba(0, 0, 0, 0.1);
      border-radius: 12px;
      color: var(--color-text-secondary);
      font-weight: 500;
    }

    /* ✅ Benefits */
    .benefits-section {
      margin-bottom: 1.5rem;
    }

    .benefits-intro {
      margin: 0 0 0.75rem 0;
      font-weight: 500;
      color: var(--color-text);
    }

    .benefits-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .benefit-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 6px;
    }

    .benefit-icon {
      font-size: 1rem;
      flex-shrink: 0;
    }

    .benefit-text {
      font-size: 0.875rem;
      color: var(--color-text);
      line-height: 1.3;
    }

    /* ✅ Progress Summary */
    .progress-summary {
      margin-bottom: 1.5rem;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.4);
      border-radius: 6px;
    }

    .progress-intro {
      margin: 0 0 0.75rem 0;
      font-weight: 500;
      color: var(--color-text);
      font-size: 0.875rem;
    }

    .progress-stats {
      display: flex;
      gap: 1rem;
      margin-bottom: 0.75rem;
    }

    .stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0.5rem;
      background: rgba(255, 255, 255, 0.5);
      border-radius: 4px;
      min-width: 80px;
    }

    .stat-number {
      font-size: 1.25rem;
      font-weight: bold;
      color: var(--color-primary);
      line-height: 1;
    }

    .stat-label {
      font-size: 0.7rem;
      color: var(--color-text-secondary);
      text-align: center;
      margin-top: 0.25rem;
    }

    .progress-note {
      margin: 0;
      font-size: 0.75rem;
      color: var(--color-text);
      text-align: center;
      font-style: italic;
    }

    /* ✅ Action Buttons */
    .action-buttons {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .upgrade-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.875rem;
      transition: all 0.2s ease;
    }

    .upgrade-btn.primary {
      background: var(--color-primary);
      color: var(--color-primary-text);
    }

    .upgrade-btn.primary:hover {
      background: var(--color-primary-hover);
      transform: translateY(-1px);
    }

    .upgrade-btn.secondary {
      background: rgba(255, 255, 255, 0.5);
      color: var(--color-text);
      border: 1px solid var(--color-border);
    }

    .upgrade-btn.secondary:hover {
      background: rgba(255, 255, 255, 0.7);
    }

    .btn-icon {
      font-size: 1rem;
    }

    /* ✅ Privacy Note */
    .privacy-note {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      font-size: 0.75rem;
      color: var(--color-text-secondary);
      line-height: 1.4;
    }

    .privacy-icon {
      flex-shrink: 0;
      margin-top: 0.1rem;
    }

    .privacy-text {
      flex: 1;
    }

    /* ✅ Responsive */
    @media (max-width: 640px) {
      .account-upgrade-widget {
        padding: 1rem;
      }

      .upgrade-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }

      .progress-stats {
        justify-content: center;
      }
    }
  `
})
export class AccountUpgradeWidgetComponent {
  // ✅ Inputs
  readonly user = input<User | null>(null);

  // ✅ Outputs
  readonly upgradeRequested = output<void>();
  readonly continueAnonymousRequested = output<void>();

  // ✅ Computed values
  readonly shouldShowUpgrade = computed(() => {
    return this.user()?.isAnonymous ?? true;
  });

  readonly hasProgress = computed(() => {
    const pubs = this.pubsVisited();
    const badges = this.badgeCount();
    return pubs > 0 || badges > 0;
  });

  readonly pubsVisited = computed(() => {
    const user = this.user();
    return user?.checkedInPubIds?.length || 0;
  });

  readonly badgeCount = computed(() => {
    const user = this.user();
    return user?.badgeCount || 0;
  });

  // ✅ Methods
  getAccountStatus(): string {
    return this.user()?.isAnonymous ? 'Guest Account' : 'Signed In';
  }

  upgradeToGoogle(): void {
    this.upgradeRequested.emit();
  }

  continueAnonymous(): void {
    this.continueAnonymousRequested.emit();
  }
}
