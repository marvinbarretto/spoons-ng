import { Injectable, signal } from '@angular/core';

export type CacheInvalidation = {
  collection: string;
  reason?: string;
  timestamp: number;
  requestId: string;
};

@Injectable()
export class MockCacheCoherenceService {
  // Mock invalidation signal - always returns null for tests
  private readonly _currentInvalidation = signal<CacheInvalidation | null>(null);
  private readonly _invalidationHistory = signal<CacheInvalidation[]>([]);

  // Public reactive signals (matches real service interface)
  readonly invalidations = this._currentInvalidation.asReadonly();
  readonly history = this._invalidationHistory.asReadonly();

  // Mock stats
  readonly stats = signal({
    totalInvalidations: 0,
    recentInvalidations: [],
    collectionsInvalidated: new Set(),
  }).asReadonly();

  // Mock computed values
  readonly recentCollections = signal<string[]>([]).asReadonly();

  constructor() {
    // Mock service - no real cache invalidation logic needed for tests
  }

  /**
   * Mock implementation of invalidate method
   * For tests, we just log and don't actually invalidate anything
   */
  invalidate(collection: string, reason?: string): void {
    console.log(`[MockCacheCoherence] Mock invalidation: ${collection} (${reason})`);

    // Optional: Set a temporary invalidation signal for testing reactive behavior
    const invalidation: CacheInvalidation = {
      collection,
      reason,
      timestamp: Date.now(),
      requestId: `mock-${Date.now()}`,
    };

    this._currentInvalidation.set(invalidation);

    // Clear after a brief moment to simulate real behavior
    setTimeout(() => {
      this._currentInvalidation.set(null);
    }, 10);
  }

  /**
   * Test helper to manually trigger invalidation signal
   */
  triggerTestInvalidation(collection: string, reason: string = 'test'): void {
    this.invalidate(collection, reason);
  }

  /**
   * Test helper to clear all mock data
   */
  clearMockData(): void {
    this._currentInvalidation.set(null);
    this._invalidationHistory.set([]);
  }
}
