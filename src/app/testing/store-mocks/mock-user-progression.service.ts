import { computed, signal } from '@angular/core';

export class MockUserProgressionService {
  private _totalPoints = signal(0);
  private _totalCheckins = signal(0);
  private _badgeCount = signal(0);
  private _landlordCount = signal(0);
  private _loading = signal(false);
  private _error = signal<string | null>(null);

  // Expose as readonly to match real UserProgressionService
  readonly totalPoints = this._totalPoints.asReadonly();
  readonly totalCheckins = this._totalCheckins.asReadonly();
  readonly badgeCount = this._badgeCount.asReadonly();
  readonly landlordCount = this._landlordCount.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly hasProgress = computed(() => this._totalPoints() > 0 || this._totalCheckins() > 0);
  readonly progressLevel = computed(() => Math.floor(this._totalPoints() / 100));

  // Test helper methods
  setTotalPoints(points: number): void {
    this._totalPoints.set(points);
  }

  setTotalCheckins(checkins: number): void {
    this._totalCheckins.set(checkins);
  }

  setBadgeCount(badges: number): void {
    this._badgeCount.set(badges);
  }

  setLandlordCount(landlords: number): void {
    this._landlordCount.set(landlords);
  }

  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  setError(error: string | null): void {
    this._error.set(error);
  }

  // Mock implementations
  async loadUserProgression(): Promise<void> {
    // Mock implementation
  }

  async refreshProgression(): Promise<void> {
    // Mock implementation
  }

  getProgressForUser(userId: string): any {
    return {
      totalPoints: this._totalPoints(),
      totalCheckins: this._totalCheckins(),
      badgeCount: this._badgeCount(),
      landlordCount: this._landlordCount(),
    };
  }

  reset(): void {
    this._totalPoints.set(0);
    this._totalCheckins.set(0);
    this._badgeCount.set(0);
    this._landlordCount.set(0);
    this._loading.set(false);
    this._error.set(null);
  }
}
