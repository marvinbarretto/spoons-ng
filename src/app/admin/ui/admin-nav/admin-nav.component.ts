import { Component, inject, computed } from '@angular/core';

import { RouterModule, Router } from '@angular/router';
import { BaseComponent } from '../../../shared/base/base.component';
import { AuthStore } from '../../../auth/data-access/auth.store';
import { UserStore } from '../../../users/data-access/user.store';

type AdminNavItem = {
  label: string;
  route: string;
  exact?: boolean;
};

@Component({
  selector: 'app-admin-nav',
  imports: [RouterModule],
  template: `
    @if (isAdminRoute() && isCurrentUserAdmin()) {
      <nav class="admin-nav">
        <ul class="admin-nav-list">
          @for (item of adminNavItems; track item.route) {
            <li routerLinkActive="active" [routerLinkActiveOptions]="{ exact: item.exact || false }">
              <a [routerLink]="item.route">{{ item.label }}</a>
            </li>
          }
        </ul>
      </nav>
    } @else if (isAdminRoute()) {
      <!-- Debug info when on admin route but nav not showing -->
      <div class="admin-nav-debug" style="background: #ff000020; color: #ff0000; padding: 8px; margin: 4px; border-radius: 4px; font-size: 12px;">
        <strong>🔍 Admin Nav Debug:</strong>
        @if (!userStore.currentUser()) {
          No current user (loading: {{ userStore.loading() }})
        } @else if (!userStore.currentUser()?.isAdmin) {
          User not admin (isAdmin: {{ userStore.currentUser()?.isAdmin }})
        } @else {
          Unknown issue
        }
        <br>
        <small>User: {{ userStore.currentUser()?.uid?.slice(0, 8) }}, Email: {{ userStore.currentUser()?.email }}</small>
      </div>
    }
  `,
  styleUrl: './admin-nav.component.scss'
})
export class AdminNavComponent extends BaseComponent {
  protected readonly authStore = inject(AuthStore);
  protected readonly userStore = inject(UserStore);

  readonly adminNavItems: AdminNavItem[] = [
    { label: 'Dashboard', route: '/admin', exact: true },
    { label: 'Users', route: '/admin/users' },
    { label: 'Missions', route: '/admin/missions' },
    { label: 'Badges', route: '/admin/badges' },
    { label: 'Check-ins', route: '/admin/checkins' },
    { label: 'Feedback', route: '/admin/feedback' },
    { label: 'Carpets', route: '/admin/carpets' },
    { label: 'Errors', route: '/admin/errors' }
  ];

  readonly isAdminRoute = computed(() => {
    const currentRoute = this.currentRoute();
    return currentRoute.startsWith('/admin');
  });

  readonly isCurrentUserAdmin = computed(() => {
    const currentUser = this.userStore.currentUser();
    const isAdmin = currentUser?.isAdmin === true;
    
    // Debug logging for admin check
    console.log('[AdminNavComponent] 🔍 Admin check:', {
      hasCurrentUser: !!currentUser,
      uid: currentUser?.uid?.slice(0, 8),
      email: currentUser?.email,
      isAdmin: currentUser?.isAdmin,
      computedResult: isAdmin
    });
    
    return isAdmin;
  });

  // Debug computed to track nav visibility
  readonly navVisibilityDebug = computed(() => {
    const currentRoute = this.currentRoute();
    const isAdminRoute = this.isAdminRoute();
    const currentUser = this.userStore.currentUser();
    const isAdmin = currentUser?.isAdmin;
    const userStoreLoading = this.userStore.loading();
    const shouldShow = isAdminRoute && !!isAdmin;

    const debug = {
      currentRoute,
      isAdminRoute,
      hasCurrentUser: !!currentUser,
      currentUserUid: currentUser?.uid?.slice(0, 8),
      isAdmin,
      userStoreLoading,
      shouldShow,
      timestamp: new Date().toISOString()
    };

    console.log('[AdminNavComponent] 🔍 Nav visibility debug:', debug);
    return debug;
  });

  constructor() {
    super();
    // Trigger debug computation
    this.navVisibilityDebug();
  }
}
