// src/app/shared/base/base.store.ts
import { computed, effect, inject, signal } from '@angular/core';
import { AuthStore } from '@auth/data-access/auth.store';
import { ToastService } from '@fourfold/angular-foundation';
import type { CollectionStore } from '@shared/data-access/store.contracts';

export abstract class BaseStore<T> implements CollectionStore<T> {
  protected readonly toastService = inject(ToastService);
  protected readonly authStore = inject(AuthStore);

  // ✅ Signals (CollectionStoreSignals)
  protected readonly _data = signal<T[]>([]);
  protected readonly _loading = signal(false);
  protected readonly _error = signal<string | null>(null);
  protected readonly _userId = signal<string | null>(null);

  // ✅ Public readonly signals
  readonly data = this._data.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // ✅ Derived signals
  readonly hasData = computed(() => this._data().length > 0);
  readonly isEmpty = computed(() => this._data().length === 0);
  readonly itemCount = computed(() => this._data().length);
  readonly userId = this._userId.asReadonly();

  protected constructor() {
    effect(() => {
      const user = this.authStore.user();
      const userId = user?.uid ?? null;
      const prevUserId = this._userId();

      // ✅ Only act on actual user changes
      if (userId !== prevUserId) {
        console.log(
          `🔄 [${this.constructor.name}] Auth state change: ${prevUserId?.slice(0, 8) || 'none'} → ${userId?.slice(0, 8) || 'none'}`
        );

        // ✅ Update user ID first
        this._userId.set(userId);

        // ✅ Only reset if we're switching between different users
        // Don't reset on initial load (null → userId) or logout (userId → null)
        if (prevUserId !== null && userId !== null && prevUserId !== userId) {
          console.log(
            `🔄 [${this.constructor.name}] User switched, clearing cache and resetting data`
          );
          this.resetForUser(userId);
        } else if (prevUserId !== null && userId === null) {
          console.log(`🔄 [${this.constructor.name}] User logged out, clearing all cached data`);
          this.reset();
        }

        // ✅ Load data for authenticated user
        if (userId) {
          console.log(
            `🔍 [${this.constructor.name}] Authenticated user detected, checking cache...`
          );
          this.loadOnce();
        }
      }
    });
  }

  // ✅ Load tracking - private property
  protected hasLoaded = false;

  // ✅ Prevent concurrent loads
  private loadPromise: Promise<void> | null = null;

  /**
   * Load data only if not already loaded (recommended default)
   */
  async loadOnce(): Promise<void> {
    const userId = this._userId();

    // 🔍 Cache check logging
    console.log(
      `🔍 [${this.constructor.name}] Cache check for user: ${userId?.slice(0, 8) || 'none'}`
    );

    if (this.hasLoaded || !userId) {
      const reason = !userId ? 'no authenticated user' : 'data already loaded';
      console.log(
        `✅ [${this.constructor.name}] Cache HIT - Using cached data (${this.itemCount()} items) - Reason: ${reason}`
      );
      return;
    }

    // ✅ Return existing promise if load in progress
    if (this.loadPromise) {
      console.log(
        `⏳ [${this.constructor.name}] Load already in progress, waiting for completion...`
      );
      return this.loadPromise;
    }

    console.log(
      `📡 [${this.constructor.name}] Cache MISS - Fetching from Firebase for user: ${userId.slice(0, 8)}`
    );
    return this.load();
  }

  /**
   * Force reload data regardless of current state
   */
  async load(): Promise<void> {
    // ✅ Return existing promise if load in progress
    if (this.loadPromise) {
      console.log(`[${this.constructor.name}] ⏳ Load already in progress, waiting...`);
      return this.loadPromise;
    }

    // ✅ Create and store the load promise
    this.loadPromise = this._performLoad();

    try {
      await this.loadPromise;
    } finally {
      this.loadPromise = null;
    }
  }

  /**
   * Internal load implementation
   */
  private async _performLoad(): Promise<void> {
    const userId = this._userId();
    console.log(
      `📡 [${this.constructor.name}] Starting Firebase fetch for user: ${userId?.slice(0, 8) || 'none'}`
    );

    this._loading.set(true);
    this._error.set(null);

    try {
      const freshData = await this.fetchData();
      this._data.set(freshData);
      this.hasLoaded = true;
      console.log(
        `✅ [${this.constructor.name}] Firebase data loaded successfully: ${freshData.length} items cached`
      );
    } catch (error: any) {
      const message = error?.message || 'Failed to load data';
      this._error.set(message);
      this.toastService.error(message);
      console.error(`❌ [${this.constructor.name}] Firebase fetch failed:`, error);
    } finally {
      this._loading.set(false);
    }
  }

  // ✅ REQUIRED CRUD METHODS (CrudMethods)

  async add(item: Omit<T, 'id'>): Promise<T> {
    // This should be overridden in child classes for actual persistence
    const newItem = { ...item, id: crypto.randomUUID() } as T;
    this.addItem(newItem);
    return newItem;
  }

  async addMany(items: Omit<T, 'id'>[]): Promise<T[]> {
    const newItems = items.map(item => ({ ...item, id: crypto.randomUUID() }) as T);
    this._data.update(current => [...current, ...newItems]);
    return newItems;
  }

  get(id: string): T | undefined {
    return this.findItem(item => (item as any).id === id);
  }

  find(predicate: (item: T) => boolean): T | undefined {
    return this.findItem(predicate);
  }

  filter(predicate: (item: T) => boolean): T[] {
    return this.data().filter(predicate);
  }

  async update(id: string, updates: Partial<T>): Promise<void> {
    this.updateItem(item => (item as any).id === id, updates);
  }

  async updateMany(updates: Array<{ id: string; changes: Partial<T> }>): Promise<void> {
    for (const { id, changes } of updates) {
      await this.update(id, changes);
    }
  }

  async remove(id: string): Promise<void> {
    this.removeItem(item => (item as any).id === id);
  }

  async removeMany(ids: string[]): Promise<void> {
    this.removeItem(item => ids.includes((item as any).id));
  }

  // ✅ REQUIRED STATE METHODS (StateMethods)

  /**
   * Clear all data and reset to initial state
   */
  reset(): void {
    this._data.set([]);
    this._error.set(null);
    this._loading.set(false);
    this.hasLoaded = false;
    this.loadPromise = null; // ✅ Clear any pending loads
    this.onReset();
    console.log(`[${this.constructor.name}] 🔄 Reset complete`);
  }

  /**
   * Clear error state only
   */
  clearError(): void {
    this._error.set(null);
  }

  // ✅ REQUIRED UTILITY METHODS (UtilityMethods)

  /**
   * Get debug information about store state
   */
  getDebugInfo() {
    return {
      name: this.constructor.name,
      itemCount: this.itemCount(),
      hasLoaded: this.hasLoaded,
      loading: this.loading(),
      error: this.error(),
      hasData: this.hasData(),
      isEmpty: this.isEmpty(),
      userId: this._userId(),
      // Add sample of data for debugging
      sampleData: this.data().slice(0, 2), // First 2 items
    };
  }

  // ✅ REQUIRED ABSTRACT METHOD (CollectionStore)

  /**
   * Abstract method that child stores must implement to fetch data
   */
  protected abstract fetchData(): Promise<T[]>;

  // ===================================
  // 🔧 PROTECTED HELPER METHODS
  // ===================================

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
      current.map(item => (predicate(item) ? { ...item, ...updates } : item))
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
   * Batch operations for performance
   */
  protected batchUpdate(operations: (() => void)[]): void {
    operations.forEach(op => op());
  }

  /**
   * Optional: Store-specific cleanup - override in child stores if needed
   */
  protected onReset(): void {
    // Override in child stores if needed
  }

  // ===================================
  // 🏗️ USER-AWARE EXTENSIONS
  // ===================================

  /**
   * Load with user context (for auth-reactive stores)
   */
  async loadForUser(userId: string): Promise<void> {
    console.log(`[${this.constructor.name}] 📡 Loading data for user:`, userId);
    await this.load(); // Use existing load logic
  }

  /**
   * Reset with user context - override in child stores for cache handling
   */
  resetForUser(userId?: string): void {
    console.log(`[${this.constructor.name}] 🔄 Resetting for user:`, userId || 'anonymous');

    // ✅ Let child stores handle their own cache strategy
    this.onUserReset(userId);

    // Reset the store state
    this.reset();
  }

  /**
   * Override in child stores to handle user-specific cache clearing
   */
  protected onUserReset(userId?: string): void {
    // Default: do nothing
    // Override in stores that need user-specific cache handling
  }

  // ===================================
  // 🧪 CONVENIENCE GETTERS
  // ===================================

  /**
   * Check loading state (convenience getter)
   */
  get isLoading(): boolean {
    return this._loading();
  }

  /**
   * Check error state (convenience getter)
   */
  get hasError(): boolean {
    return !!this._error();
  }
}
