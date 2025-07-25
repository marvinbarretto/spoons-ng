import { Component, inject, signal, computed } from '@angular/core';

import { RouterModule, Router } from '@angular/router';
import { LocationService } from '../../data-access/location.service';
import { ChipUserComponent } from '../../ui/chips/chip-user/chip-user.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { AuthStore } from '../../../auth/data-access/auth.store';
import { UserStore } from '../../../users/data-access/user.store';
import { DataAggregatorService } from '../../data-access/data-aggregator.service';
import { ViewportService } from '../../data-access/viewport.service';
import { ToastService } from '../../data-access/toast.service';
import type { UserChipData } from '../../ui/chips/chip-user/chip-user.component';
import { ButtonVariant, ButtonSize } from '../../ui/button/button.params';
import { UserProfileWidgetComponent } from "@/app/home/ui/user-profile-widget/user-profile-widget.component";

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
  private readonly dataAggregator = inject(DataAggregatorService);
  private readonly viewportService = inject(ViewportService);
  private readonly toastService = inject(ToastService);

  // Use viewport service for responsive behavior
  readonly isMobile = this.viewportService.isMobile;

  // Reactive user data
  readonly user = this.dataAggregator.user;
  readonly displayName = this.dataAggregator.displayName;
  readonly isAuthenticated = this.authStore.isAuthenticated;
  readonly isAnonymous = this.authStore.isAnonymous;

  // Simple location status indicator
  readonly hasLocation = computed(() => !!this.locationService.location());

  // Admin check using UserStore (not AuthStore)
  readonly isAdmin = computed(() => this.userStore.currentUser()?.isAdmin === true);

  // User chip data for display
  readonly userChipData = computed((): UserChipData | null => {
    const user = this.user();
    if (!user) return null;

    return {
      displayName: this.displayName() || 'User',
      photoURL: user.photoURL || undefined,
      email: user.email || undefined
    };
  });

  // Button variants for template
  readonly ButtonVariant = ButtonVariant;
  readonly ButtonSize = ButtonSize;

  constructor() {
    // ViewportService handles mobile detection
  }

  async logout() {
    console.log('[NavComponent] 🚪 logout() called by user action');
    console.log('[NavComponent] 🚪 Current auth state before logout:', {
      hasUser: !!this.authStore.user(),
      userId: this.authStore.user()?.uid?.slice(0, 8),
      isAuthenticated: this.authStore.isAuthenticated(),
    });

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
    return new Promise((resolve) => {
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
}
