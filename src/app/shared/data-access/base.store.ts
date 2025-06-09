// src/app/shared/data-access/base.store.ts - UPDATED VERSION
/**
 * ✅ Updated BaseStore that implements CollectionStore contract
 * All collection stores should extend this class
 */

import { signal, computed, inject } from '@angular/core';
import { ToastService } from './toast.service';
import type { CollectionStore } from './store.contracts';

export abstract class BaseStore<T> implements CollectionStore<T> {
  protected readonly toastService = inject(ToastService);

  // ✅ REQUIRED SIGNALS (CollectionStoreSignals)
  protected readonly _data = signal<T[]>([]);
  protected readonly _loading = signal(false);
  protected readonly _error = signal<string | null>(null);

  // ✅ Public readonly signals - clean names following contracts
  readonly data = this._data.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // ✅ REQUIRED COMPUTED SIGNALS (CollectionStoreSignals)
  readonly hasData = computed(() => this._data().length > 0);
  readonly isEmpty = computed(() => this._data().length === 0);
  readonly itemCount = computed(() => this._data().length);

  // ✅ Load tracking - private property
  protected hasLoaded = false;

  // ✅ REQUIRED LOADING METHODS (LoadingMethods)

  /**
   * Load data only if not already loaded (recommended default)
   */
  async loadOnce(): Promise<void> {
    if (this.hasLoaded) {
      console.log(`[${this.constructor.name}] ✅ Already loaded — skipping`);
      return;
    }
    await this.load();
  }

  /**
   * Force reload data regardless of current state
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

  // ✅ REQUIRED CRUD METHODS (CrudMethods)

  async add(item: Omit<T, 'id'>): Promise<T> {
    // This should be overridden in child classes for actual persistence
    const newItem = { ...item, id: crypto.randomUUID() } as T;
    this.addItem(newItem);
    return newItem;
  }

  async addMany(items: Omit<T, 'id'>[]): Promise<T[]> {
    const newItems = items.map(item => ({ ...item, id: crypto.randomUUID() } as T));
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

  async updateMany(updates: Array<{id: string; changes: Partial<T>}>): Promise<void> {
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
   * Reset with user context
   */
  resetForUser(userId?: string): void {
    console.log(`[${this.constructor.name}] 🔄 Resetting for user:`, userId || 'anonymous');
    this.reset();
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

// =====================================
// 📝 USAGE INSTRUCTIONS FOR CHILD STORES
// =====================================

/**
 * ✅ HOW TO EXTEND BaseStore:
 *
 * 1. Extend BaseStore<YourType>
 * 2. Implement fetchData() method
 * 3. Add store-specific computed signals
 * 4. Add store-specific methods
 * 5. Override CRUD methods if you need persistence
 *
 * EXAMPLE:
 *
 * @Injectable({ providedIn: 'root' })
 * export class PubStore extends BaseStore<Pub> {
 *   constructor(private pubService: PubService) {
 *     super();
 *   }
 *
 *   // ✅ Required implementation
 *   protected async fetchData(): Promise<Pub[]> {
 *     return this.pubService.getAllPubs();
 *   }
 *
 *   // ✅ Store-specific computed signals
 *   readonly sortedByName = computed(() =>
 *     this.data().toSorted((a, b) => a.name.localeCompare(b.name))
 *   );
 *
 *   // ✅ Store-specific methods
 *   findByName(name: string): Pub | undefined {
 *     return this.find(pub => pub.name.toLowerCase().includes(name.toLowerCase()));
 *   }
 *
 *   // ✅ Override CRUD for persistence (optional)
 *   async add(pubData: Omit<Pub, 'id'>): Promise<Pub> {
 *     const newPub = await this.pubService.createPub(pubData);
 *     this.addItem(newPub);
 *     return newPub;
 *   }
 * }
 */
