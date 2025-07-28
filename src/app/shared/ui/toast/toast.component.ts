import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject } from '@angular/core';
import { Toast, ToastService } from '@fourfold/angular-foundation';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-toast',
  imports: [CommonModule, IconComponent],
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss'],
})
export class ToastComponent {
  private readonly toastService = inject(ToastService);
  readonly toasts = this.toastService.toasts;

  // Separate toasts by position
  readonly cornerToasts = computed(() =>
    this.toasts().filter(toast => toast.position === 'corner')
  );

  readonly centerToasts = computed(() =>
    this.toasts().filter(toast => toast.position === 'center')
  );

  constructor() {
    console.log('[ToastComponent] Constructed');
    effect(() => {
      const currentToasts = this.toasts();
      console.log('[ToastComponent] Toasts updated:', currentToasts);
    });
  }

  toastClass(toast: Toast): string {
    return `toast toast--${toast.type}`;
  }

  getIconName(type: Toast['type']): string {
    const iconMap: Record<Toast['type'], string> = {
      success: 'check_circle',
      error: 'error',
      warning: 'warning',
      info: 'info',
    };
    return iconMap[type];
  }

  dismiss(id: string): void {
    this.toastService.dismiss(id);
  }
}
