import { Injectable, computed, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class BackendHealthService {
  /**
   * Internal signal for backend availability state.
   * `true` by default, flipped on network failure.
   */
  private readonly isAvailable$$ = signal(true);

  /**
   * Public read-only signal (e.g. for components or toast service).
   */
  readonly isBackendAvailable = computed(() => this.isAvailable$$());

  /**
   * Call this when a backend error like 503 or timeout occurs.
   */
  setBackendUnavailable(): void {
    if (!this.isAvailable$$()) {
      return; // Already unavailable, no need to re-trigger effects
    }

    this.isAvailable$$.set(false);
    console.warn('🚨 Backend marked as unavailable');

    // TODO: Show user-facing toast/banner
    // this.toastService.show('The backend is temporarily unreachable.');
  }

  /**
   * Optional: Reset status (e.g. after retry or successful ping).
   */
  reset(): void {
    this.isAvailable$$.set(true);
    console.log('✅ Backend marked as available');
  }
}
