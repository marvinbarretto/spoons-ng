import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FooterNavComponent } from '@shared/feature/footer-nav/footer-nav.component';
import { FooterComponent } from '@shared/feature/footer/footer.component';
import { HeaderComponent } from '@shared/feature/header/header.component';
import { NotificationsComponent } from '@shared/ui/notifications/notifications.component';
import { ToastComponent } from '@shared/ui/toast/toast.component';
import { FeedbackButtonComponent } from '../../../feedback/ui/feedback-button/feedback-button.component';

@Component({
  selector: 'app-feature-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    HeaderComponent,
    FooterComponent,
    FooterNavComponent,
    NotificationsComponent,
    ToastComponent,
    FeedbackButtonComponent,
  ],
  template: `
    <div class="feature-shell">
      <div class="site-container">
        <app-header class="sticky-header" />
        <main class="main-content">
          <app-notifications />
          <router-outlet></router-outlet>
        </main>
        <app-footer-nav />
        <app-footer />
      </div>
      <app-toast />
      <app-feedback-button />
    </div>
  `,
  styles: `
    .feature-shell {
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

    .sticky-header {
      position: sticky;
      top: 0;
      z-index: 100;
      background-color: var(--background-darkest, #ffffff);
      border-bottom: 1px solid var(--border, #e2e8f0);
    }

    .main-content {
      flex: 1;
    }
  `,
})
export class FeatureShell {
  constructor() {
    console.log('[FeatureShell] 📱 Initialized - STICKY Header + FooterNav + Footer');
  }
}
