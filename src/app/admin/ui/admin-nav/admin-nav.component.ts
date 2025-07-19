import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { BaseComponent } from '../../../shared/base/base.component';

type AdminNavItem = {
  label: string;
  route: string;
  exact?: boolean;
};

@Component({
  selector: 'app-admin-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    @if (isAdminRoute()) {
      <nav class="admin-nav">
        <ul class="admin-nav-list">
          @for (item of adminNavItems; track item.route) {
            <li routerLinkActive="active" [routerLinkActiveOptions]="{ exact: item.exact || false }">
              <a [routerLink]="item.route">{{ item.label }}</a>
            </li>
          }
        </ul>
      </nav>
    }
  `,
  styleUrl: './admin-nav.component.scss'
})
export class AdminNavComponent extends BaseComponent {

  readonly adminNavItems: AdminNavItem[] = [
    { label: 'Dashboard', route: '/admin', exact: true },
    { label: 'Users', route: '/admin/users' },
    { label: 'Missions', route: '/admin/missions' },
    { label: 'Badges', route: '/admin/badges' },
    { label: 'Check-ins', route: '/admin/checkins' },
    { label: 'Feedback', route: '/admin/feedback' },
    { label: 'Carpets', route: '/admin/carpets' }
  ];

  readonly isAdminRoute = computed(() => {
    const currentRoute = this.currentRoute();
    return currentRoute.startsWith('/admin');
  });
}
