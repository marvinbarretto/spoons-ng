import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationsComponent } from '@shared/ui/notifications/notifications.component';
import { ToastComponent } from '@shared/ui/toast/toast.component';
import { FeedbackButtonComponent } from '../../../feedback/ui/feedback-button/feedback-button.component';

@Component({
  selector: 'app-full-screen-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, NotificationsComponent, ToastComponent, FeedbackButtonComponent],
  template: `
    <div class="full-screen-shell">
      <app-notifications />
      <router-outlet></router-outlet>
      <app-toast />
      <app-feedback-button />
    </div>
  `,
  styles: `
    .full-screen-shell {
      position: relative;
      min-height: 100vh;
      isolation: isolate;
    }
  `
})
export class FullScreenShell {
  constructor() {
    console.log('[FullScreenShell] 🎬 Initialized - No header/footer chrome');
  }
}