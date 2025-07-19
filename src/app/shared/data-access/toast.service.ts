import { Injectable, inject, signal } from '@angular/core';
import { v4 as uuid } from 'uuid';
import { SsrPlatformService } from '@fourfold/angular-foundation';

export type Toast = {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  position: 'corner' | 'center';
  sticky: boolean;
  timeout?: number;
};

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  private readonly activeTimeouts = new Map<string, number>();
  private readonly platform = inject(SsrPlatformService);

  private push(
    message: string,
    type: Toast['type'],
    position: Toast['position'] = 'corner',
    timeout?: number,
    sticky = false
  ): void {
    const toast: Toast = {
      id: uuid(),
      message,
      type,
      position,
      sticky,
      timeout,
    };

    this._toasts.update((current) => [toast, ...current]);

    if (!sticky && timeout) {
      const win = this.platform.getWindow();
      if (!win) {
        return;
      }

      const timeoutId = win.setTimeout(() => {
        this.dismiss(toast.id);
      }, timeout);

      this.activeTimeouts.set(toast.id, timeoutId);
    }
  }

  // Corner toasts (default, desktop-friendly)
  success(message: string, timeout = 3000, sticky = false): void {
    this.push(message, 'success', 'corner', timeout, sticky);
  }

  error(message: string, timeout = 5000, sticky = false): void {
    this.push(message, 'error', 'corner', timeout, sticky);
  }

  warning(message: string, timeout = 4000, sticky = false): void {
    this.push(message, 'warning', 'corner', timeout, sticky);
  }

  info(message: string, timeout = 3000, sticky = false): void {
    this.push(message, 'info', 'corner', timeout, sticky);
  }

  // Center toasts (mobile-friendly)
  centerSuccess(message: string, timeout = 3000, sticky = false): void {
    this.push(message, 'success', 'center', timeout, sticky);
  }

  centerError(message: string, timeout = 5000, sticky = false): void {
    this.push(message, 'error', 'center', timeout, sticky);
  }

  centerWarning(message: string, timeout = 4000, sticky = false): void {
    this.push(message, 'warning', 'center', timeout, sticky);
  }

  centerInfo(message: string, timeout = 3000, sticky = false): void {
    this.push(message, 'info', 'center', timeout, sticky);
  }

  dismiss(id: string): void {
    if (this.activeTimeouts.has(id)) {
      clearTimeout(this.activeTimeouts.get(id));
      this.activeTimeouts.delete(id);
    }

    this._toasts.update((toasts) => toasts.filter((t) => t.id !== id));
  }

  clearAll(): void {
    this.activeTimeouts.forEach((id) => clearTimeout(id));
    this.activeTimeouts.clear();

    this._toasts.set([]);
  }
}
