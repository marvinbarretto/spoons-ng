
// BaseStore is for our collections

// What are you storing?
// ├─ Array/Collection (CheckIn[], Badge[])
// │  └─ ✅ Use BaseStore<T>
// │     └─ Examples: CheckinStore, BadgeStore
// │
// └─ Single Entity (User | null, Theme)
//    └─ ✅ Use Standalone Store
//       └─ Examples: UserStore, ThemeStore, AuthStore

// src/app/shared/base/base.store.ts
import { signal, computed, inject } from '@angular/core';
import { ToastService } from './toast.service';

export abstract class BaseStore<T> {
  protected readonly toastService = inject(ToastService);

  // ✅ Private writable signals with _ prefix
  protected readonly _data = signal<T[]>([]);
  protected readonly _loading = signal(false);
  protected readonly _error = signal<string | null>(null);

  // ✅ Public readonly signals - clean names
  readonly data = this._data.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // ✅ Derived state - clean computed names
  readonly hasData = computed(() => this._data().length > 0);
  readonly isEmpty = computed(() => this._data().length === 0);
  readonly itemCount = computed(() => this._data().length);

  // ✅ Load tracking - private property
  protected hasLoaded = false;

  /**
   * Load data only if not already loaded
   */
  async loadOnce(): Promise<void> {
    if (this.hasLoaded) {
      console.log(`[${this.constructor.name}] ✅ Already loaded — skipping`);
      return;
    }
    await this.load();
  }

  /**
   * Force reload data
   */
  async load(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const freshData = await this.fetchData();
      this._data.set(freshData);
      this.hasLoaded = true;
      console.log(`[${this.constructor.name}] ✅ Loaded ${freshData.length} items`);
    } catch (error: any) {
      const message = error?.message || 'Failed to load data';
      this._error.set(message);
      this.toastService.error(message);
      console.error(`[${this.constructor.name}] ❌ Load failed:`, error);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * ✨ NEW: Load with user context (for auth-reactive stores)
   */
  async loadForUser(userId: string): Promise<void> {
    console.log(`[${this.constructor.name}] 📡 Loading data for user:`, userId);
    await this.load(); // Use existing load logic
  }

  /**
   * Reset store to initial state
   */
  reset(): void {
    this._data.set([]);
    this._error.set(null);
    this._loading.set(false);
    this.hasLoaded = false;
    this.onReset();
    console.log(`[${this.constructor.name}] 🔄 Reset complete`);
  }

  /**
   * ✨ NEW: Reset with user context
   */
  resetForUser(userId?: string): void {
    console.log(`[${this.constructor.name}] 🔄 Resetting for user:`, userId || 'anonymous');
    this.reset();
  }

  /**
   * Add item to the store
   */
  protected addItem(item: T): void {
    this._data.update(current => [...current, item]);
  }

  /**
   * Update item by predicate
   */
  protected updateItem(predicate: (item: T) => boolean, updates: Partial<T>): void {
    this._data.update(current =>
      current.map(item =>
        predicate(item) ? { ...item, ...updates } : item
      )
    );
  }

  /**
   * Remove item by predicate
   */
  protected removeItem(predicate: (item: T) => boolean): void {
    this._data.update(current => current.filter(item => !predicate(item)));
  }

  /**
   * Get item by predicate
   */
  protected findItem(predicate: (item: T) => boolean): T | undefined {
    return this.data().find(predicate);
  }

  /**
   * Check if item exists
   */
  protected hasItem(predicate: (item: T) => boolean): boolean {
    return this.data().some(predicate);
  }

  /**
   * ✨ NEW: Batch operations for performance
   */
  protected batchUpdate(operations: (() => void)[]): void {
    operations.forEach(op => op());
  }

  /**
   * ✨ NEW: Clear error state
   */
  clearError(): void {
    this._error.set(null);
  }

  /**
   * ✨ NEW: Check loading state
   */
  get isLoading(): boolean {
    return this._loading();
  }

  /**
   * ✨ NEW: Check error state
   */
  get hasError(): boolean {
    return !!this._error();
  }

  /**
   * Abstract method - implement in each store
   */
  protected abstract fetchData(): Promise<T[]>;

  /**
   * Optional: Store-specific cleanup
   */
  protected onReset(): void {
    // Override in child stores if needed
  }

  /**
   * ✨ NEW: Debug helper
   */
  getDebugInfo() {
    return {
      name: this.constructor.name,
      itemCount: this.itemCount(),
      hasLoaded: this.hasLoaded,
      loading: this.loading(),
      error: this.error(),
      hasData: this.hasData()
    };
  }
}
