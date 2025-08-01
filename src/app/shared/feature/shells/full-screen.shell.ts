import { ChangeDetectionStrategy, Component } from '@angular/core';
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
      isolation: isolate;

      /* Progressive viewport height enhancement for mobile browser toolbars */
      min-height: 100vh; /* Fallback for older browsers */
      min-height: 100svh; /* Small viewport height (when toolbar is visible) */
      min-height: 100dvh; /* Dynamic viewport height (preferred) */

      /* Safe area handling for mobile devices with notches */
      padding-top: env(safe-area-inset-top);
      padding-bottom: env(safe-area-inset-bottom);
      padding-left: env(safe-area-inset-left);
      padding-right: env(safe-area-inset-right);

      /* Flexbox layout for proper content flow */
      display: flex;
      flex-direction: column;
    }
  `,
})
export class FullScreenShell {
  constructor() {
    console.log('[FullScreenShell] 🎬 Initialized - No header/footer chrome');
  }
}
