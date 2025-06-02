// src/app/shared/base/base.component.ts
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SsrPlatformService } from '../utils/ssr/ssr-platform.service';
import { ToastService } from './toast.service';

@Component({
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export abstract class BaseComponent implements OnInit {
  // 🔧 Universal services
  protected readonly destroyRef = inject(DestroyRef);
  protected readonly platform = inject(SsrPlatformService);
  protected readonly toastService = inject(ToastService);

  // 📡 Universal component state - clean signal names
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.onInit();
  }

  /**
   * Override this instead of ngOnInit for cleaner inheritance
   */
  protected onInit(): void {
    // Override in child components
  }

  /**
   * Browser-safe execution helper
   */
  protected onlyOnBrowser<T>(callback: () => T): T | undefined {
    return this.platform.onlyOnBrowser(callback);
  }

  /**
   * Show success toast
   */
  protected showSuccess(message: string): void {
    this.toastService.success(message);
  }

  /**
   * Show error toast and optionally set component error state
   */
  protected showError(message: string, setComponentError = false): void {
    this.toastService.error(message);
    if (setComponentError) {
      this.error.set(message);
    }
  }

  /**
   * Show info toast
   */
  protected showInfo(message: string): void {
    this.toastService.info(message);
  }

  /**
   * Show warning toast
   */
  protected showWarning(message: string): void {
    this.toastService.warning(message);
  }

  /**
   * Clear component error state
   */
  protected clearError(): void {
    this.error.set(null);
  }

  /**
   * Handle async operations with loading state and error handling
   */
  protected async handleAsync<T>(
    operation: () => Promise<T>,
    options?: {
      successMessage?: string;
      errorMessage?: string;
      setLoadingState?: boolean;
    }
  ): Promise<T | null> {
    const {
      successMessage,
      errorMessage = 'Operation failed',
      setLoadingState = true
    } = options || {};

    try {
      if (setLoadingState) this.loading.set(true);
      this.clearError();

      const result = await operation();

      if (successMessage) {
        this.showSuccess(successMessage);
      }

      return result;
    } catch (error: any) {
      const message = error?.message || errorMessage;
      this.showError(message, true);
      console.error('[BaseComponent] Operation failed:', error);
      return null;
    } finally {
      if (setLoadingState) this.loading.set(false);
    }
  }

  /**
   * Utility for RxJS operations that should complete on destroy
   */
  protected get untilDestroyed() {
    return takeUntilDestroyed(this.destroyRef);
  }
}
