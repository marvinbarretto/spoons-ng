import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '@shared/feature/header/header.component';
import { FooterComponent } from '@shared/feature/footer/footer.component';
import { FooterNavComponent } from '@shared/feature/footer-nav/footer-nav.component';
import { NotificationsComponent } from '@shared/ui/notifications/notifications.component';
import { ToastComponent } from '@shared/ui/toast/toast.component';

@Component({
  selector: 'app-dashboard-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, FooterNavComponent, NotificationsComponent, ToastComponent],
  template: `
    <div class="dashboard-shell">
      <div class="site-container">
        <app-header />
        <main class="main-content">
          <app-notifications />
          <router-outlet></router-outlet>
        </main>
        <app-footer-nav />
        <app-footer />
      </div>
      <app-toast />
    </div>
  `,
  styles: `
    .dashboard-shell {
      position: relative;
      min-height: 100vh;
      isolation: isolate;
    }

    .site-container {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    .main-content {
      flex: 1;
    }
  `
})
export class DashboardShell {
  constructor() {
    console.log('[DashboardShell] 🏠 Initialized - Header + FooterNav + Footer (natural scroll)');
  }
}