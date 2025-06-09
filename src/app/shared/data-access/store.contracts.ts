// src/app/shared/data-access/store.contracts.ts
/**
 * 🏪 SPOONS STORE ARCHITECTURE CONTRACTS
 *
 * These interfaces define the standard patterns that all stores must follow.
 * They ensure consistency across the entire application and make stores predictable.
 *
 * USAGE: Import these interfaces and ensure your stores implement them
 */

import type { Signal } from '@angular/core';

// =====================================
// 📡 CORE SIGNAL INTERFACES
// =====================================

/**
 * Base signals that all stores with loading states should have
 */
export interface BaseSignals {
  readonly loading: Signal<boolean>;
  readonly error: Signal<string | null>;
}

/**
 * Collection-based stores (arrays of data)
 * Used by: PubStore, CheckinStore, BadgeStore, etc.
 *
 * Note: These stores should have:
 * - readonly data: Signal<T[]>
 * - readonly hasData: Signal<boolean>
 * - readonly isEmpty: Signal<boolean>
 * - readonly itemCount: Signal<number>
 */
export interface CollectionStoreSignals<T> extends BaseSignals {
  readonly data: Signal<T[]>;
  readonly hasData: Signal<boolean>;
  readonly isEmpty: Signal<boolean>;
  readonly itemCount: Signal<number>;
}

// Note: Entity, Computed, and Map store signals are store-specific
// and should be implemented with meaningful names in each store

// =====================================
// 🎬 METHOD INTERFACES
// =====================================

/**
 * Standard loading methods for stores that fetch data
 */
export interface LoadingMethods {
  /**
   * Load data only if not already loaded (recommended default)
   */
  loadOnce(): Promise<void>;

  /**
   * Force reload data regardless of current state
   */
  load(): Promise<void>;
}

/**
 * Context-aware loading for stores that need parameters
 */
export interface ContextualLoadingMethods {
  /**
   * Load data for a specific context (e.g., user, pub, etc.)
   */
  loadOnce(context: string): Promise<void>;

  /**
   * Force reload for specific context
   */
  load(context: string): Promise<void>;
}

/**
 * Standard CRUD operations for collection stores
 */
export interface CrudMethods<T> {
  // Create
  add(item: Omit<T, 'id'>): Promise<T>;
  addMany(items: Omit<T, 'id'>[]): Promise<T[]>;

  // Read
  get(id: string): T | undefined;
  find(predicate: (item: T) => boolean): T | undefined;
  filter(predicate: (item: T) => boolean): T[];

  // Update
  update(id: string, updates: Partial<T>): Promise<void>;
  updateMany(updates: Array<{id: string; changes: Partial<T>}>): Promise<void>;

  // Delete
  remove(id: string): Promise<void>;
  removeMany(ids: string[]): Promise<void>;
}

/**
 * Key-value operations for map-based stores
 */
export interface KeyValueMethods<T> {
  get(key: string): T | null;
  set(key: string, value: T | null): void;
  clear(key: string): void;
  has(key: string): boolean;
}

/**
 * Standard state management methods
 */
export interface StateMethods {
  /**
   * Clear all data and reset to initial state
   */
  reset(): void;

  /**
   * Clear error state only
   */
  clearError(): void;
}

/**
 * User-context aware state management
 */
export interface UserAwareStateMethods extends StateMethods {
  /**
   * Reset for a specific user context
   */
  resetForUser(userId: string): void;

  /**
   * Load data for a specific user
   */
  loadForUser(userId: string): Promise<void>;
}

/**
 * Debug and utility methods
 */
export interface UtilityMethods {
  /**
   * Get debug information about store state
   */
  getDebugInfo(): {
    name: string;
    hasLoaded?: boolean;
    loading: boolean;
    error: string | null;
    [key: string]: unknown;
  };
}

// =====================================
// 🏪 COMPLETE STORE CONTRACTS
// =====================================

/**
 * Full contract for collection-based stores (BaseStore pattern)
 * Stores arrays of data like Pub[], CheckIn[], Badge[]
 */
export interface CollectionStore<T>
  extends CollectionStoreSignals<T>,
          LoadingMethods,
          CrudMethods<T>,
          StateMethods,
          UtilityMethods {

  // Note: fetchData() is a protected abstract method that child classes implement
  // It's not part of the public API, so we don't include it in the interface
}

/**
 * Full contract for single entity stores
 * Stores single pieces of data like User, Theme, Settings
 */
export interface EntityStore<T>
  extends BaseSignals,
          LoadingMethods,
          StateMethods,
          UtilityMethods {

  /**
   * Computed signal indicating if entity is loaded
   */
  readonly isLoaded: Signal<boolean>;

  /**
   * Set the entity value
   */
  set(entity: T | null): void;

  /**
   * Partially update the entity
   */
  patch(updates: Partial<T>): void;
}

/**
 * Full contract for computed/derived stores
 * Transform data from other stores, no loading or persistence
 */
export interface ComputedStore<T> {
  // Note: Computed stores have specific computed signals like:
  // readonly nearbyPubs: Signal<Pub[]>;
  // readonly closestPub: Signal<Pub | null>;
  // These are store-specific and can't be generically defined

  // Only utility methods, no loading or state management
  // These stores are pure transformations
}

/**
 * Full contract for map-based stores
 * Store key-value pairs like landlord mappings, caches
 */
export interface MapStore<T>
  extends BaseSignals,
          ContextualLoadingMethods,
          KeyValueMethods<T>,
          StateMethods,
          UtilityMethods {

  /**
   * Check if a key has been loaded
   */
  hasLoaded(key: string): boolean;
}

// =====================================
// 🎯 SPOONS SPECIFIC CONTRACTS
// =====================================

/**
 * Contract for stores that work with authenticated users
 */
export interface AuthAwareStore extends UserAwareStateMethods {
  /**
   * Initialize store when user authentication state is known
   */
  initialize(userId: string): Promise<void>;
}

/**
 * Contract for stores that handle geolocation
 */
export interface LocationAwareStore {
  /**
   * Update data when user location changes
   */
  updateLocation(location: { lat: number; lng: number }): void;
}

/**
 * Contract for stores that cache data
 */
export interface CacheableStore {
  /**
   * Clear cache and force fresh data
   */
  clearCache(): void;

  /**
   * Check if data is stale and needs refresh
   */
  isStale(): boolean;
}

// =====================================
// 🚫 ANTI-PATTERN DOCUMENTATION
// =====================================

/**
 * ❌ DON'T USE THESE PATTERNS
 *
 * These are common mistakes that break our conventions:
 */
export interface AntiPatterns {
  // ❌ Inconsistent signal names
  // items: Signal<T[]>;           // Use 'data'
  // isLoading: Signal<boolean>;   // Use 'loading'
  // errorMessage: Signal<string>; // Use 'error'

  // ❌ Inconsistent method names
  // refresh(): Promise<void>;     // Use 'load()'
  // fetch(): Promise<void>;       // Use 'load()'
  // destroy(): void;              // Use 'reset()'

  // ❌ Wrong store type usage
  // computed stores with loading states
  // collection stores for single entities
  // map stores for simple arrays
}

// =====================================
// 🏗️ IMPLEMENTATION HELPERS
// =====================================

/**
 * Type guard to check if a store is a collection store
 */
export function isCollectionStore<T>(store: any): store is CollectionStore<T> {
  return store &&
         'data' in store &&
         'loadOnce' in store &&
         'add' in store &&
         typeof store.data === 'function' &&
         typeof store.loadOnce === 'function' &&
         typeof store.add === 'function';
}

/**
 * Type guard to check if a store is an entity store
 */
export function isEntityStore<T>(store: any): store is EntityStore<T> {
  return store &&
         'loading' in store &&
         'set' in store &&
         'patch' in store &&
         !('data' in store) &&
         typeof store.loading === 'function' &&
         typeof store.set === 'function' &&
         typeof store.patch === 'function';
}

/**
 * Type guard to check if a store is computed
 */
export function isComputedStore<T>(store: any): store is ComputedStore<T> {
  return store &&
         !('loading' in store) &&
         !('error' in store) &&
         !('loadOnce' in store);
}

/**
 * Type guard to check if a store is map-based
 */
export function isMapStore<T>(store: any): store is MapStore<T> {
  return store &&
         'loading' in store &&
         'get' in store &&
         'set' in store &&
         'clear' in store &&
         'hasLoaded' in store &&
         typeof store.get === 'function' &&
         typeof store.set === 'function' &&
         typeof store.hasLoaded === 'function';
}

/**
 * Validate that a store implements the expected contract
 */
export function validateStoreContract(store: any, expectedType: 'collection' | 'entity' | 'computed' | 'map'): boolean {
  if (!store) return false;

  switch (expectedType) {
    case 'collection':
      return isCollectionStore(store);
    case 'entity':
      return isEntityStore(store);
    case 'computed':
      return isComputedStore(store);
    case 'map':
      return isMapStore(store);
    default:
      return false;
  }
}

/**
 * Get a human-readable description of what store type this is
 */
export function getStoreType(store: any): string {
  if (isCollectionStore(store)) return 'Collection Store';
  if (isEntityStore(store)) return 'Entity Store';
  if (isMapStore(store)) return 'Map Store';
  if (isComputedStore(store)) return 'Computed Store';
  return 'Unknown Store Type';
}

/**
 * Simple utility to create debug info for any store
 */
export function createStoreDebugInfo(
  storeName: string,
  additionalInfo: Record<string, unknown> = {}
): { name: string; [key: string]: unknown } {
  return {
    name: storeName,
    timestamp: new Date().toISOString(),
    ...additionalInfo
  };
}

/**
 * Helper to add getDebugInfo() to existing stores that don't have it
 */
export function addDebugInfoToStore(store: any, customInfo: Record<string, unknown> = {}): void {
  if (!store.getDebugInfo) {
    store.getDebugInfo = function() {
      return createStoreDebugInfo(
        this.constructor?.name || 'Unknown Store',
        {
          ...customInfo,
          hasLoadingState: 'loading' in this && typeof this.loading === 'function',
          hasErrorState: 'error' in this && typeof this.error === 'function',
          hasDataState: 'data' in this && typeof this.data === 'function',
        }
      );
    };
  }
}
