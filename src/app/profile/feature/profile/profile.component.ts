// src/app/profile/feature/profile/profile.component.ts
import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { BaseComponent } from '@shared/base/base.component';
import { AuthStore } from '@auth/data-access/auth.store';
import { UserStore } from '@users/data-access/user.store';
import { ProfileHeaderWidgetComponent } from '../../ui/profile-header-widget/profile-header-widget.component';
import { AccountSettingsWidgetComponent } from '../../ui/account-settings-widget/account-settings-widget.component';
import { SharingWidgetComponent } from '../../ui/sharing-widget/sharing-widget.component';

@Component({
  selector: 'app-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ProfileHeaderWidgetComponent,
    AccountSettingsWidgetComponent,
    SharingWidgetComponent
  ],
  template: `
    <div class="profile-container">
      <!-- Profile Header Widget -->
      <app-profile-header-widget></app-profile-header-widget>
      
      <!-- Account Settings Widget -->
      <app-account-settings-widget></app-account-settings-widget>
      
      <!-- Sharing Widget -->
      <app-sharing-widget></app-sharing-widget>
    </div>
  `,
  styles: `
    .profile-container {
      padding: 1rem;
      max-width: 600px;
      margin: 0 auto;
    }
    
    .profile-widget {
      background: var(--background-light);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1rem;
    }
    
    .profile-widget h2 {
      margin: 0 0 1rem 0;
      color: var(--text-primary);
      font-size: 1.25rem;
      font-weight: 600;
    }
    
    .logout-btn {
      background: var(--color-danger);
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s ease;
    }
    
    .logout-btn:hover {
      background: var(--color-danger-dark);
      transform: translateY(-1px);
    }
  `
})
export class ProfileComponent extends BaseComponent {
  protected readonly authStore = inject(AuthStore);
  protected readonly userStore = inject(UserStore);

  // Data signals
  readonly user = this.userStore.user;

  constructor() {
    super();
    console.log('[Profile] ProfileComponent initialized');
  }

  override async onInit() {
    console.log('[Profile] Initializing profile component...');
  }

  // Widgets handle their own functionality now
}