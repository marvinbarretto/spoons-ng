import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationsComponent } from '@shared/ui/notifications/notifications.component';
import { ToastComponent } from '@shared/ui/toast/toast.component';

@Component({
  selector: 'app-full-screen-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, NotificationsComponent, ToastComponent],
  template: `
    <div class="full-screen-shell">
      <app-notifications />
      <router-outlet></router-outlet>
      <app-toast />
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