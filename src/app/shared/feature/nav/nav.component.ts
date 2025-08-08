import { Component, computed, inject, signal } from '@angular/core';

import { Router, RouterModule } from '@angular/router';
import { LocationService, ToastService } from '@fourfold/angular-foundation';
import { AuthStore } from '../../../auth/data-access/auth.store';
import { LeaderboardStore } from '../../../leaderboard/data-access/leaderboard.store';
import { UserStore } from '../../../users/data-access/user.store';
import { ViewportService } from '../../data-access/viewport.service';
import { ButtonComponent } from '../../ui/button/button.component';
import { ButtonSize, ButtonVariant } from '../../ui/button/button.params';
import type { UserChipData } from '../../ui/chips/chip-user/chip-user.component';
import { ChipUserComponent } from '../../ui/chips/chip-user/chip-user.component';

@Component({
  selector: 'app-nav',
  imports: [RouterModule, ChipUserComponent, ButtonComponent], // UserProfileWidgetComponent not used in template
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.scss',
})
export class NavComponent {
  private readonly router = inject(Router);
  private readonly locationService = inject(LocationService);
  protected readonly authStore = inject(AuthStore);
  protected readonly userStore = inject(UserStore);
  private readonly viewportService = inject(ViewportService);
  private readonly toastService = inject(ToastService);
  protected readonly leaderboardStore = inject(LeaderboardStore);

  // Use viewport service for responsive behavior
  readonly isMobile = this.viewportService.isMobile;

  // Reactive user data from UserStore
  readonly user = this.userStore.user;
  readonly displayName = this.userStore.displayName;
  readonly isAuthenticated = this.authStore.isAuthenticated;
  readonly isAnonymous = this.authStore.isAnonymous;

  // Simple location status indicator
  readonly hasLocation = computed(() => !!this.locationService.location());

  // Admin check using UserStore (not AuthStore)
  readonly isAdmin = computed(() => this.userStore.currentUser()?.isAdmin === true);

  // User menu state
  readonly showUserMenu = signal(false);

  // User chip data for display
  readonly userChipData = computed((): UserChipData | null => {
    const user = this.user();
    if (!user) return null;

    return {
      displayName: this.displayName() || 'User',
      photoURL: user.photoURL || undefined,
      email: user.email || undefined,
    };
  });

  // Points data for nav display from UserStore reactive computed
  readonly scoreboardData = this.userStore.scoreboardData;

  // Pub ranking computed signal - get current user's rank when sorted by pubs
  readonly currentUserPubRank = computed(() => {
    const currentUser = this.authStore.user();
    if (!currentUser) return null;

    const entries = this.leaderboardStore.leaderboardEntries();

    // Sort by pubs manually to get the rank
    const sortedByPubs = [...entries].sort((a, b) => {
      if (b.uniquePubs !== a.uniquePubs) return b.uniquePubs - a.uniquePubs;
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      return b.totalCheckins - a.totalCheckins;
    });

    const userEntry = sortedByPubs.find(e => e.userId === currentUser.uid);
    return userEntry ? sortedByPubs.indexOf(userEntry) + 1 : null;
  });

  // Button variants for template
  readonly ButtonVariant = ButtonVariant;
  readonly ButtonSize = ButtonSize;

  constructor() {
    // ViewportService handles mobile detection
  }

  toggleUserMenu() {
    this.showUserMenu.update(current => !current);
  }

  async logout() {
    console.log('[NavComponent] 🚪 logout() called by user action');
    console.log('[NavComponent] 🚪 Current auth state before logout:', {
      hasUser: !!this.authStore.user(),
      userId: this.authStore.user()?.uid?.slice(0, 8),
      isAuthenticated: this.authStore.isAuthenticated(),
    });

    // Close user menu
    this.showUserMenu.set(false);

    this.authStore.logout();
    console.log('[NavComponent] 🚪 AuthStore.logout() called');
    this.toastService.info('Successfully logged out');
    console.log('[NavComponent] 🔔 Toast notification sent');

    // Wait for auth state to clear before navigating
    console.log('[NavComponent] ⏳ Waiting for auth state to clear...');
    await this.waitForAuthStateCleared();

    console.log('[NavComponent] ✅ Auth state cleared, attempting navigation to /splash');
    try {
      const success = await this.router.navigate(['/splash']);
      console.log('[NavComponent] 🚪 Navigation to /splash result:', success);
    } catch (error) {
      console.error('[NavComponent] ❌ Navigation to /splash failed:', error);
    }
  }

  private async waitForAuthStateCleared(): Promise<void> {
    return new Promise(resolve => {
      const checkAuthState = () => {
        const user = this.authStore.user();
        if (!user) {
          console.log('[NavComponent] Auth state cleared');
          resolve();
        } else {
          console.log('[NavComponent] Still waiting for auth state to clear...');
          setTimeout(checkAuthState, 10);
        }
      };
      checkAuthState();
    });
  }

  login() {
    this.router.navigate(['/login']);
  }

  navigateToProfile() {
    this.router.navigate(['/profile']);
  }
}
