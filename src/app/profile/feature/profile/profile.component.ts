// src/app/profile/feature/profile/profile.component.ts
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthStore } from '@auth/data-access/auth.store';
import { BaseComponent } from '@shared/base/base.component';
import { UserStore } from '@users/data-access/user.store';
import { AccountSettingsWidgetComponent } from '../../ui/account-settings-widget/account-settings-widget.component';
import { ProfileHeaderWidgetComponent } from '../../ui/profile-header-widget/profile-header-widget.component';
import { SharingWidgetComponent } from '../../ui/sharing-widget/sharing-widget.component';

@Component({
  selector: 'app-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProfileHeaderWidgetComponent, AccountSettingsWidgetComponent, SharingWidgetComponent],
  template: `
    <div class="profile-container">
      <!-- Profile Header Widget -->
      <app-profile-header-widget [user]="user()" [isOwnProfile]="isOwnProfile()">
      </app-profile-header-widget>

      <!-- Account Settings Widget - Only show for own profile -->
      @if (isOwnProfile()) {
        <app-account-settings-widget></app-account-settings-widget>
      }

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
  `,
})
export class ProfileComponent extends BaseComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly authStore = inject(AuthStore);
  protected readonly userStore = inject(UserStore);

  // Route parameter for viewing other users
  readonly targetUsername = signal<string | null>(null);

  // Data signals
  readonly user = computed(() => {
    const username = this.targetUsername();
    console.log('[Profile] Computing user with targetUsername:', username);

    if (!username) {
      // No username parameter - show current user's profile
      console.log('[Profile] No username parameter, showing current user profile');
      return this.userStore.user();
    }

    // Username parameter provided - find that user
    const users = this.userStore.data();
    console.log('[Profile] Available users count:', users.length);
    console.log(
      '[Profile] Available user displayNames:',
      users.map(u => u.displayName)
    );

    const foundUser = users.find(user => user.displayName === username);
    console.log(
      '[Profile] Found user:',
      foundUser ? `${foundUser.displayName} (${foundUser.uid})` : 'null'
    );

    return foundUser || null;
  });

  // Check if viewing own profile
  readonly isOwnProfile = computed(() => {
    const currentUser = this.authStore.user();
    const viewedUser = this.user();
    return currentUser?.uid === viewedUser?.uid;
  });

  constructor() {
    super();
    console.log('[Profile] ProfileComponent initialized');

    // Watch for route parameter changes
    this.route.params.subscribe(params => {
      console.log('[Profile] Route params received:', params);
      const usernameParam = params['username'];
      console.log('[Profile] Username parameter:', usernameParam);
      this.targetUsername.set(usernameParam || null);
    });
  }

  override async onInit() {
    console.log('[Profile] Initializing profile component...');
    // Ensure user data is loaded for user lookup
    await this.userStore.loadOnce();
  }

  // Widgets handle their own functionality now
}
