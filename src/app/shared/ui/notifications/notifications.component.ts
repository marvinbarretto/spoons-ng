import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { NotificationService } from '../../data-access/notification.service';
import { INotification } from '../../utils/notification.model';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss',
})
export class NotificationsComponent {
  private readonly notificationService = inject(NotificationService);
  readonly messages = this.notificationService.messages$;

  dismiss(id: string): void {
    this.notificationService.dismiss(id);
  }

  trackById(index: number, item: INotification): string {
    return item.id;
  }
}
