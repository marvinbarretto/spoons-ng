import { Injectable, signal } from '@angular/core';
import { v4 as uuid } from 'uuid';
import { INotification } from '../utils/notification.model';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly messages$$ = signal<INotification[]>([]);

  readonly messages$ = this.messages$$.asReadonly();

  private push(
    type: INotification['type'],
    message: string,
    sticky = true,
    timeout?: number
  ) {
    const newMessage: INotification = {
      id: uuid(),
      type,
      message,
      sticky,
      timeout,
    };

    this.messages$$.update((messages) => [...messages, newMessage]);
  }

  error(message: string, timeout?: number, sticky = true) {
    this.push('error', message, sticky, timeout);
  }

  success(message: string, timeout?: number, sticky = true) {
    this.push('success', message, sticky, timeout);
  }

  warning(message: string, timeout?: number, sticky = true) {
    this.push('warning', message, sticky, timeout);
  }

  info(message: string, timeout?: number, sticky = true) {
    this.push('info', message, sticky, timeout);
  }

  dismiss(id: string) {
    this.messages$$.update((messages) =>
      messages.filter((message) => message.id !== id)
    );
  }

  clearAll() {
    this.messages$$.set([]);
  }
}
