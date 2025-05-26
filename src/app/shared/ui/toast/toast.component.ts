import { Component, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../data-access/toast.service';


@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss'],
})
export class ToastComponent {
  private readonly toastService = inject(ToastService);
  readonly toasts$$ = this.toastService.toasts$$Readonly;

  constructor() {
    effect(() => {
      console.log('[ToastComponent] Toasts changed:', this.toasts$$());
    });
  }

  // TODO: type this
  toastClass(toast: any): string {
    return `toast toast--${toast.type}`;
  }

  dismiss(id: string): void {
    this.toastService.dismiss(id);
  }
}
