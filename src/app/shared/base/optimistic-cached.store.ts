/**
 * @fileoverview OptimisticCachedStore - Optimistic Updates with Cache Integration
 *
 * Extends BaseStore to provide optimistic update patterns with automatic rollback
 * on failure. Integrates with CachedFirestoreService for consistent cache management.
 *
 * FEATURES:
 * - Immediate UI updates (optimistic)
 * - Automatic rollback on failure
 * - Cache invalidation on successful updates
 * - Loading state management
 * - Error handling with user-friendly messages
 *
 * USAGE:
 * ```typescript
 * export class UserProfileStore extends OptimisticCachedStore<UserProfile> {
 *   constructor() {
 *     super('user-profiles');
 *   }
 *
 *   async updateProfile(updates: Partial<UserProfile>): Promise<void> {
 *     return this.optimisticUpdate(
 *       this.currentProfile()!.id,
 *       updates,
 *       (current, updates) => ({ ...current, ...updates })
 *     );
 *   }
 * }
 * ```
 */

import { computed, inject, signal } from '@angular/core';
import { CachedFirestoreService } from '../data-access/cached-firestore.service';
import { BaseStore } from './base.store';

export interface OptimisticOperation<T> {
  id: string;
  operation: 'create' | 'update' | 'delete';
  originalData?: T;
  optimisticData?: T;
  timestamp: number;
}

export abstract class OptimisticCachedStore<T extends { id: string }> extends BaseStore<T> {
  protected readonly firestoreService = inject(CachedFirestoreService);

  // Track pending optimistic operations
  private readonly _pendingOperations = signal<OptimisticOperation<T>[]>([]);
  readonly pendingOperations = this._pendingOperations.asReadonly();

  // Track optimistic loading state
  private readonly _optimisticLoading = signal<Set<string>>(new Set());
  readonly optimisticLoading = computed(() => this._optimisticLoading().size > 0);

  constructor(protected readonly collectionPath: string) {
    super();
  }

  /**
   * Perform optimistic update with automatic rollback on failure
   *
   * @param id - Document ID to update
   * @param updates - Partial update data
   * @param mergeFunction - How to merge updates with existing data
   * @param customPath - Optional custom document path (defaults to collectionPath/id)
   */
  async optimisticUpdate<K extends Partial<T>>(
    id: string,
    updates: K,
    mergeFunction: (current: T, updates: K) => T,
    customPath?: string
  ): Promise<void> {
    const path = customPath || `${this.collectionPath}/${id}`;
    const currentItems = this._items();
    const targetItem = currentItems.find(item => item.id === id);

    if (!targetItem) {
      throw new Error(`Item with id ${id} not found`);
    }

    // Track the operation
    const operation: OptimisticOperation<T> = {
      id,
      operation: 'update',
      originalData: { ...targetItem },
      optimisticData: mergeFunction(targetItem, updates),
      timestamp: Date.now(),
    };

    this._pendingOperations.update(ops => [...ops, operation]);
    this._optimisticLoading.update(set => new Set([...set, id]));

    // Optimistic update - immediate UI feedback
    const optimisticItems = currentItems.map(item =>
      item.id === id ? operation.optimisticData! : item
    );
    this._items.set(optimisticItems);

    try {
      // Perform actual update
      await this.firestoreService.updateDoc(path, updates);

      // Success - remove from pending operations
      this._pendingOperations.update(ops =>
        ops.filter(op => op.id !== id || op.timestamp !== operation.timestamp)
      );

      this._success.set('Update saved successfully');
      console.log(`✅ [OptimisticStore] Update successful for ${id}`);
    } catch (error: any) {
      // Failure - rollback optimistic changes
      console.error(`❌ [OptimisticStore] Update failed for ${id}:`, error);

      const rolledBackItems = this._items().map(item =>
        item.id === id ? operation.originalData! : item
      );
      this._items.set(rolledBackItems);

      this._pendingOperations.update(ops =>
        ops.filter(op => op.id !== id || op.timestamp !== operation.timestamp)
      );

      this._error.set(error?.message || 'Update failed - changes have been reverted');
      throw error;
    } finally {
      this._optimisticLoading.update(set => {
        const newSet = new Set(set);
        newSet.delete(id);
        return newSet;
      });
    }
  }

  /**
   * Perform optimistic create with automatic rollback on failure
   */
  async optimisticCreate(newItem: Omit<T, 'id'>, customPath?: string): Promise<string> {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const optimisticItem = { ...newItem, id: tempId } as T;
    const path = customPath || this.collectionPath;

    const operation: OptimisticOperation<T> = {
      id: tempId,
      operation: 'create',
      optimisticData: optimisticItem,
      timestamp: Date.now(),
    };

    this._pendingOperations.update(ops => [...ops, operation]);
    this._optimisticLoading.update(set => new Set([...set, tempId]));

    // Optimistic add - immediate UI feedback
    this._items.update(items => [...items, optimisticItem]);

    try {
      // Create actual document
      const docPath = await this.firestoreService.addDoc(path, newItem);
      const realId = docPath.split('/').pop()!;

      // Replace temporary item with real item
      this._items.update(items =>
        items.map(item => (item.id === tempId ? { ...item, id: realId } : item))
      );

      this._pendingOperations.update(ops =>
        ops.filter(op => op.id !== tempId || op.timestamp !== operation.timestamp)
      );

      this._success.set('Item created successfully');
      console.log(`✅ [OptimisticStore] Create successful, real ID: ${realId}`);

      return realId;
    } catch (error: any) {
      // Failure - remove optimistic item
      console.error(`❌ [OptimisticStore] Create failed for ${tempId}:`, error);

      this._items.update(items => items.filter(item => item.id !== tempId));

      this._pendingOperations.update(ops =>
        ops.filter(op => op.id !== tempId || op.timestamp !== operation.timestamp)
      );

      this._error.set(error?.message || 'Create failed');
      throw error;
    } finally {
      this._optimisticLoading.update(set => {
        const newSet = new Set(set);
        newSet.delete(tempId);
        return newSet;
      });
    }
  }

  /**
   * Perform optimistic delete with automatic restore on failure
   */
  async optimisticDelete(id: string, customPath?: string): Promise<void> {
    const path = customPath || `${this.collectionPath}/${id}`;
    const currentItems = this._items();
    const targetItem = currentItems.find(item => item.id === id);

    if (!targetItem) {
      throw new Error(`Item with id ${id} not found`);
    }

    const operation: OptimisticOperation<T> = {
      id,
      operation: 'delete',
      originalData: { ...targetItem },
      timestamp: Date.now(),
    };

    this._pendingOperations.update(ops => [...ops, operation]);
    this._optimisticLoading.update(set => new Set([...set, id]));

    // Optimistic delete - immediate UI feedback
    this._items.update(items => items.filter(item => item.id !== id));

    try {
      // Perform actual delete
      await this.firestoreService.deleteDoc(path);

      this._pendingOperations.update(ops =>
        ops.filter(op => op.id !== id || op.timestamp !== operation.timestamp)
      );

      this._success.set('Item deleted successfully');
      console.log(`✅ [OptimisticStore] Delete successful for ${id}`);
    } catch (error: any) {
      // Failure - restore deleted item
      console.error(`❌ [OptimisticStore] Delete failed for ${id}:`, error);

      this._items.update(items => [...items, operation.originalData!]);

      this._pendingOperations.update(ops =>
        ops.filter(op => op.id !== id || op.timestamp !== operation.timestamp)
      );

      this._error.set(error?.message || 'Delete failed - item has been restored');
      throw error;
    } finally {
      this._optimisticLoading.update(set => {
        const newSet = new Set(set);
        newSet.delete(id);
        return newSet;
      });
    }
  }

  /**
   * Check if an item is currently being optimistically updated
   */
  isOptimisticallyUpdating(id: string): boolean {
    return this._optimisticLoading().has(id);
  }

  /**
   * Get all items with pending operations highlighted
   */
  readonly itemsWithPendingState = computed(() => {
    const items = this._items();
    const pending = this._pendingOperations();
    const loading = this._optimisticLoading();

    return items.map(item => ({
      ...item,
      isPending: pending.some(op => op.id === item.id),
      isLoading: loading.has(item.id),
      pendingOperation: pending.find(op => op.id === item.id)?.operation,
    }));
  });

  /**
   * Cancel all pending operations and revert to last known state
   *
   * USE WITH CAUTION: This will lose any optimistic changes
   */
  async cancelAllPendingOperations(): Promise<void> {
    const operations = this._pendingOperations();

    // Revert all optimistic changes
    operations.forEach(operation => {
      if (operation.operation === 'update' && operation.originalData) {
        this._items.update(items =>
          items.map(item => (item.id === operation.id ? operation.originalData! : item))
        );
      } else if (operation.operation === 'create') {
        this._items.update(items => items.filter(item => item.id !== operation.id));
      } else if (operation.operation === 'delete' && operation.originalData) {
        this._items.update(items => [...items, operation.originalData!]);
      }
    });

    this._pendingOperations.set([]);
    this._optimisticLoading.set(new Set());

    console.log('🔄 [OptimisticStore] All pending operations cancelled and reverted');
  }

  /**
   * Get summary of pending operations for debugging
   */
  getPendingOperationsSummary(): {
    total: number;
    byOperation: Record<string, number>;
    oldestOperation: Date | null;
  } {
    const operations = this._pendingOperations();

    const byOperation = operations.reduce(
      (acc, op) => {
        acc[op.operation] = (acc[op.operation] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const oldestTimestamp = Math.min(...operations.map(op => op.timestamp));
    const oldestOperation = operations.length > 0 ? new Date(oldestTimestamp) : null;

    return {
      total: operations.length,
      byOperation,
      oldestOperation,
    };
  }
}
