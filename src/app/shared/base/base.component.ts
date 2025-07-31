import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { SsrPlatformService, ToastService } from '@fourfold/angular-foundation';
import { filter, map } from 'rxjs/operators';
import { CapacitorPlatformService } from '@shared/data-access/capacitor-platform.service';

@Component({
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export abstract class BaseComponent implements OnInit {
  // 🔧 Universal services
  protected readonly destroyRef = inject(DestroyRef);
  protected readonly platform = inject(SsrPlatformService);
  protected readonly capacitor = inject(CapacitorPlatformService);
  protected readonly toastService = inject(ToastService);
  protected readonly router = inject(Router);

  // 📡 Universal component state - clean signal names
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  // 🧭 Universal routing signals
  private readonly currentRoute$ = this.router.events.pipe(
    filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    map(event => event.url),
    takeUntilDestroyed()
  );

  protected readonly currentRoute = toSignal(this.currentRoute$, {
    initialValue: this.router.url,
  });

  // 🚀 Unified platform information
  protected readonly platformInfo = computed(() => ({
    isServer: this.platform.isServer,
    isBrowser: this.platform.isBrowser,
    isNative: this.capacitor.isNative(),
    isIOS: this.capacitor.isIOS(),
    isAndroid: this.capacitor.isAndroid(),
    isWeb: this.capacitor.isWeb(),
    capabilities: {
      hasCamera: this.capacitor.hasCamera(),
      hasGeolocation: this.capacitor.hasGeolocation(),
      hasPushNotifications: this.capacitor.hasPushNotifications(),
      hasAppBadge: this.capacitor.hasAppBadge(),
      hasStatusBar: this.capacitor.hasStatusBar(),
      hasHaptics: this.capacitor.hasHaptics(),
    },
  }));

  // ✅ Common routing computeds
  protected readonly isHomepage = computed(() => this.currentRoute() === '/');
  protected readonly isOnRoute = (route: string) =>
    computed(() => {
      const current = this.currentRoute();
      // Special case for root route - must be exact match
      if (route === '/') {
        return current === '/';
      }
      // For other routes, use startsWith as before
      return current.startsWith(route);
    });

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
   * Native-safe execution helper
   */
  protected onlyOnNative<T>(callback: () => Promise<T>): Promise<T | null> {
    return this.capacitor.onlyOnNative(callback);
  }

  /**
   * iOS-safe execution helper
   */
  protected onlyOnIOS<T>(callback: () => Promise<T>): Promise<T | null> {
    return this.capacitor.onlyOnIOS(callback);
  }

  /**
   * Android-safe execution helper
   */
  protected onlyOnAndroid<T>(callback: () => Promise<T>): Promise<T | null> {
    return this.capacitor.onlyOnAndroid(callback);
  }

  /**
   * Platform-aware execution with native/web fallback
   */
  protected withPlatformFallback<T>(
    nativeCallback: () => Promise<T>,
    webCallback: () => T | Promise<T>
  ): Promise<T> {
    return this.capacitor.withPlatformFallback(nativeCallback, webCallback);
  }

  /**
   * Mobile-aware execution with iOS/Android/web fallbacks
   */
  protected withMobileFallback<T>(
    iosCallback: () => Promise<T>,
    androidCallback: () => Promise<T>,
    webCallback: () => T | Promise<T>
  ): Promise<T> {
    return this.capacitor.withMobileFallback(iosCallback, androidCallback, webCallback);
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
      setLoadingState = true,
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
