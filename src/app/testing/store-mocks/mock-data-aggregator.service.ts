import { computed, signal } from '@angular/core';

export class MockDataAggregatorService {
  private _loading = signal(false);
  private _error = signal<string | null>(null);
  private _lastUpdated = signal<Date | null>(null);
  private _userStats = signal<any>({
    totalPoints: 0,
    totalCheckins: 0,
    badgeCount: 0,
    landlordCount: 0,
  });
  private _leaderboardData = signal<any[]>([]);
  private _achievements = signal<any[]>([]);

  // Expose as readonly to match real DataAggregatorService
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly lastUpdated = this._lastUpdated.asReadonly();
  readonly userStats = this._userStats.asReadonly();
  readonly leaderboardData = this._leaderboardData.asReadonly();
  readonly achievements = this._achievements.asReadonly();

  readonly hasData = computed(() => !!this._userStats() || this._leaderboardData().length > 0);
  readonly isStale = computed(() => {
    const lastUpdate = this._lastUpdated();
    if (!lastUpdate) return true;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return lastUpdate < fiveMinutesAgo;
  });

  // Mock displayName signal to match real service
  readonly displayName = computed(() => 'Test User');

  // Mock user signal to match real service
  readonly user = computed(() => ({
    uid: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: null,
    isAnonymous: false,
    onboardingCompleted: true,
  }));

  // Test helper methods
  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  setError(error: string | null): void {
    this._error.set(error);
  }

  setUserStats(stats: any): void {
    this._userStats.set(stats);
  }

  setLeaderboardData(data: any[]): void {
    this._leaderboardData.set(data);
  }

  setAchievements(achievements: any[]): void {
    this._achievements.set(achievements);
  }

  setLastUpdated(date: Date | null): void {
    this._lastUpdated.set(date);
  }

  // Mock implementations
  async aggregateUserData(userId: string): Promise<any> {
    return this._userStats();
  }

  async refreshData(): Promise<void> {
    this._lastUpdated.set(new Date());
  }

  async loadLeaderboard(): Promise<any[]> {
    return this._leaderboardData();
  }

  async getUserAchievements(userId: string): Promise<any[]> {
    return this._achievements();
  }

  getAggregatedStats(): any {
    return this._userStats();
  }

  reset(): void {
    this._loading.set(false);
    this._error.set(null);
    this._lastUpdated.set(null);
    this._userStats.set({
      totalPoints: 0,
      totalCheckins: 0,
      badgeCount: 0,
      landlordCount: 0,
    });
    this._leaderboardData.set([]);
    this._achievements.set([]);
  }
}
