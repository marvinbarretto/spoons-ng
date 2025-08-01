import { computed, signal } from '@angular/core';
import { vi } from 'vitest';
import type { CheckIn } from '../../check-in/utils/check-in.models';

export class MockCheckInStore {
  private _checkins = signal<CheckIn[]>([]);
  private _loading = signal(false);
  private _error = signal<string | null>(null);
  private _isProcessing = signal(false);

  // Expose as readonly to match real CheckInStore
  readonly checkins = this._checkins.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly isProcessing = this._isProcessing.asReadonly();

  readonly totalCheckins = computed(() => this._checkins().length);
  readonly totalPubsCount = computed(() => {
    const checkins = this._checkins();
    return new Set(checkins.map(c => c.pubId)).size;
  });
  readonly hasData = computed(() => this._checkins().length > 0);
  readonly isEmpty = computed(() => this._checkins().length === 0);

  // Mock service for testing
  newCheckInService = {
    getAllCheckinsForLeaderboard: vi.fn().mockResolvedValue([]),
  };

  // Test helper methods
  setCheckins(checkins: CheckIn[]): void {
    this._checkins.set(checkins);
  }

  addCheckin(checkin: CheckIn): void {
    this._checkins.update(current => [...current, checkin]);
  }

  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  setError(error: string | null): void {
    this._error.set(error);
  }

  setProcessing(processing: boolean): void {
    this._isProcessing.set(processing);
  }

  // Mock implementations
  hasCheckedIn(pubId: string): boolean {
    return this._checkins().some(c => c.pubId === pubId);
  }

  canCheckInToday(pubId: string | null): boolean {
    if (!pubId) return false;
    const today = new Date().toISOString().split('T')[0];
    return !this._checkins().some(c => c.pubId === pubId && c.dateKey === today);
  }

  async checkinToPub(pubId: string): Promise<void> {
    // Mock implementation
  }

  reset(): void {
    this._checkins.set([]);
    this._loading.set(false);
    this._error.set(null);
    this._isProcessing.set(false);
  }
}
