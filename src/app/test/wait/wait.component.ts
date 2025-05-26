import { Component, inject, signal } from '@angular/core';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { NotificationService } from '../../shared/data-access/notification.service';
import { ToastService } from '../../shared/data-access/toast.service';
import { WaitService } from '../wait.service';

@Component({
  selector: 'app-wait',
  imports: [ButtonComponent],
  template: `
    <h2>Wait Test</h2>
    <app-button
      [loading$$]="isWaiting$$()"
      (onClick)="handleClick()"
      [icon$$]="'hourglass_empty'"
    >
      Wait 3 seconds
    </app-button>

  `,
  styleUrl: './wait.component.scss'
})
export class WaitComponent {
  private waitService: WaitService = inject(WaitService);
  private notificationService: NotificationService = inject(NotificationService);
  private toastService: ToastService = inject(ToastService);

  readonly isWaiting$$ = signal(false);

  handleClick() {
    this.isWaiting$$.set(true);
    const delayWarning = setTimeout(() => {
      this.notificationService.info('Still waiting...');
    }, 1500);

    this.waitService.wait(3)
      .then(() => this.toastService.success('Done!'))
      .catch(() => this.toastService.error('Failed!'))
      .finally(() => {
        clearTimeout(delayWarning);
        this.isWaiting$$.set(false);
      });
  }
}
