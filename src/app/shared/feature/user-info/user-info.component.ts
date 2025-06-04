// user-info.component.ts
import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthStore } from '../../../auth/data-access/auth.store';
import { ButtonComponent } from "../../ui/button/button.component";
import { generateAnonymousName, getAnonymousBaseName } from '../../utils/anonymous-names';

@Component({
  selector: 'app-user-info',
  imports: [CommonModule, ButtonComponent],
  styleUrl: './user-info.component.scss',
  templateUrl: './user-info.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserInfoComponent {
  protected authStore = inject(AuthStore);

  readonly user = this.authStore.user;
  readonly isAuthenticated = this.authStore.isAuthenticated;

  readonly isAuthenticatedWithGoogle = computed(() => {
    return this.isAuthenticated() && !this.user()?.isAnonymous;
  });

  /**
   * Get user's display name - either real name or generated pub name
   * @returns Display name for the user
   */
  readonly userDisplayName = computed(() => {
    const user = this.user();
    if (!user) return '';

    if (user.isAnonymous) {
      return generateAnonymousName(user.uid);
    }

    return user.displayName || user.email || 'Unknown User';
  });

  /**
   * Get short version of user name for compact displays
   * @returns Short display name
   */
  readonly userShortName = computed(() => {
    const user = this.user();
    if (!user) return '';

    if (user.isAnonymous) {
      return getAnonymousBaseName(user.uid);
    }

    // For real users, use first name or first part of email
    const displayName = user.displayName;
    if (displayName) {
      return displayName.split(' ')[0];
    }

    const email = user.email;
    if (email) {
      return email.split('@')[0];
    }

    return 'User';
  });

  /**
   * Handle Google login
   */
  loginWithGoogle(): void {
    this.authStore.loginWithGoogle();
  }

  /**
   * Handle logout
   */
  logout(): void {
    this.authStore.logout();
  }
}
