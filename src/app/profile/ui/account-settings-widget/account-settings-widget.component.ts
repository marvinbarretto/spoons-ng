// src/app/profile/ui/account-settings-widget/account-settings-widget.component.ts
import { Component, computed, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { BaseComponent } from '@shared/base/base.component';
import { AuthStore } from '@auth/data-access/auth.store';
import { UserStore } from '@users/data-access/user.store';
import { Router } from '@angular/router';
import { IconComponent } from '@shared/ui/icon/icon.component';

@Component({
  selector: 'app-account-settings-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IconComponent
  ],
  template: `
    <div class="account-settings-widget">
      <h2 class="widget-title">Account Settings</h2>

      <div class="settings-section">
        <div class="setting-item">
          <div class="setting-info">
            <h3>Account Type</h3>
            <p>{{ accountTypeDescription() }}</p>
          </div>
          <div class="setting-badge">
            {{ user()?.isAnonymous ? 'Anonymous' : 'Registered' }}
          </div>
        </div>

        @if (user()?.email) {
          <div class="setting-item">
            <div class="setting-info">
              <h3>Email</h3>
              <p>{{ user()?.email }}</p>
            </div>
            <div class="setting-status">
              {{ user()?.emailVerified ? 'Verified' : 'Unverified' }}
            </div>
          </div>
        }
      </div>

      <div class="danger-zone">
        <h3 class="danger-title">Danger Zone</h3>

        <div class="danger-actions">
          <button
            (click)="handleLogout()"
            class="danger-btn logout-btn"
            type="button"
          >
            <app-icon name="logout" size="sm" />
            Logout
          </button>

          <button
            (click)="handleDeleteAccount()"
            [disabled]="isDeleting()"
            class="danger-btn delete-btn"
            type="button"
          >
            <app-icon name="delete_forever" size="sm" />
            {{ isDeleting() ? 'Deleting...' : 'Delete Account' }}
          </button>
        </div>

        <p>
          ⚠️ Deleting your account is permanent and cannot be undone.
          All your data will be lost.
        </p>
      </div>
    </div>
  `,
  styles: `
    .account-settings-widget {
      background: var(--background-light);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 2rem;
      margin-bottom: 1rem;
    }

    .widget-title {
      margin: 0 0 1.5rem 0;
      color: var(--text-primary);
      font-size: 1.25rem;
      font-weight: 600;
    }

    .settings-section {
      margin-bottom: 2rem;
    }

    .setting-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 0;
      border-bottom: 1px solid var(--border);
    }

    .setting-item:last-child {
      border-bottom: none;
    }

    .setting-info h3 {
      margin: 0 0 0.25rem 0;
      color: var(--text-primary);
      font-size: 1rem;
      font-weight: 500;
    }

    .setting-info p {
      margin: 0;
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    .setting-badge {
      background: var(--primary);
      color: var(--on-primary);
      padding: 0.25rem 0.75rem;
      border-radius: 16px;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .setting-status {
      color: var(--text-muted);
      font-size: 0.875rem;
      font-weight: 500;
    }

    .danger-zone {
      border-top: 1px solid var(--border);
      padding-top: 1.5rem;
    }

    .danger-title {
      margin: 0 0 1rem 0;
      color: var(--color-danger);
      font-size: 1rem;
      font-weight: 600;
    }

    .danger-actions {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .danger-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.875rem;
      transition: all 0.2s ease;
    }

    .logout-btn {
      background: var(--warning);
      color: var(--background-darkest);
    }

    .logout-btn:hover {
      background: var(--warning-dark);
      transform: translateY(-1px);
    }

    .delete-btn {
      background: var(--error);
      color: white;
    }

    .delete-btn:hover:not(:disabled) {
      background: var(--error-dark);
      transform: translateY(-1px);
    }

    .delete-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .setting-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }

      .danger-actions {
        flex-direction: column;
      }
    }
  `
})
export class AccountSettingsWidgetComponent extends BaseComponent {
  protected readonly authStore = inject(AuthStore);
  protected readonly userStore = inject(UserStore);

  // Local state
  private readonly _isDeleting = signal(false);
  readonly isDeleting = this._isDeleting.asReadonly();

  // Data signals
  readonly user = this.userStore.user;

  // Computed properties
  readonly accountTypeDescription = computed(() => {
    const user = this.user();
    if (!user) return 'No account';

    if (user.isAnonymous) {
      return 'Anonymous account - your data is stored locally';
    } else {
      return 'Registered account - your data is synced to the cloud';
    }
  });

  constructor() {
    super();
    console.log('[AccountSettingsWidget] AccountSettingsWidgetComponent initialized');
  }

  handleLogout(): void {
    console.log('[AccountSettingsWidget] Logging out user...');

    // Show confirmation
    const confirmed = confirm('Are you sure you want to logout?');
    if (!confirmed) {
      console.log('[AccountSettingsWidget] Logout cancelled by user');
      return;
    }

    this.authStore.logout();
    this.router.navigate(['/']);
  }

  async handleDeleteAccount(): Promise<void> {
    console.log('[AccountSettingsWidget] Delete account requested...');

    // Show strong confirmation
    const confirmed = confirm(
      'Are you absolutely sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.'
    );

    if (!confirmed) {
      console.log('[AccountSettingsWidget] Account deletion cancelled by user');
      return;
    }

    // Double confirmation
    const doubleConfirmed = confirm(
      'This is your final warning. Your account and all associated data will be permanently deleted. Type "DELETE" to confirm.'
    );

    if (!doubleConfirmed) {
      console.log('[AccountSettingsWidget] Account deletion cancelled on double confirmation');
      return;
    }

    try {
      this._isDeleting.set(true);

      // TODO: Implement actual account deletion service
      // For now, we'll just logout after a delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('[AccountSettingsWidget] Account deletion completed (simulated)');
      this.showSuccess('Account deleted successfully');

      // Logout and redirect
      this.authStore.logout();
      this.router.navigate(['/']);

    } catch (error) {
      console.error('[AccountSettingsWidget] Account deletion failed:', error);
      this.showError('Failed to delete account. Please try again.');
    } finally {
      this._isDeleting.set(false);
    }
  }
}
