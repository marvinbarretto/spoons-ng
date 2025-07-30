import { Injectable } from '@angular/core';
import { EarnedBadge } from '../../badges/utils/badge.model';

@Injectable()
export class MockEarnedBadgeService {
  // Test data storage
  private mockEarnedBadges = new Map<string, EarnedBadge>();

  constructor() {
    this.initializeTestData();
  }

  /**
   * Mock implementation of getEarnedBadgesForUser
   */
  async getEarnedBadgesForUser(userId: string): Promise<EarnedBadge[]> {
    const userBadges = Array.from(this.mockEarnedBadges.values()).filter(
      badge => badge.userId === userId
    );
    return userBadges;
  }

  /**
   * Mock implementation of userHasBadge
   */
  async userHasBadge(userId: string, badgeId: string): Promise<boolean> {
    const key = `${userId}_${badgeId}`;
    return this.mockEarnedBadges.has(key);
  }

  /**
   * Mock implementation of awardBadge
   */
  async awardBadge(
    userId: string,
    badgeId: string,
    metadata?: Record<string, any>
  ): Promise<EarnedBadge> {
    // Check for duplicates
    const hasAlready = await this.userHasBadge(userId, badgeId);
    if (hasAlready) {
      throw new Error(`User ${userId} already has badge ${badgeId}`);
    }

    // Create the earned badge data
    const earnedBadge: EarnedBadge = {
      id: `test-earned-badge-${Date.now()}`,
      userId,
      badgeId,
      awardedAt: Date.now(),
      metadata: metadata || {},
    };

    const key = `${userId}_${badgeId}`;
    this.mockEarnedBadges.set(key, earnedBadge);

    return earnedBadge;
  }

  // Test helper methods
  setMockEarnedBadge(userId: string, badgeId: string, earnedBadge: EarnedBadge): void {
    const key = `${userId}_${badgeId}`;
    this.mockEarnedBadges.set(key, earnedBadge);
  }

  clearMockData(): void {
    this.mockEarnedBadges.clear();
    this.initializeTestData();
  }

  getMockEarnedBadgeCount(): number {
    return this.mockEarnedBadges.size;
  }

  /**
   * Initialize with default test data
   */
  private initializeTestData(): void {
    const testEarnedBadge: EarnedBadge = {
      id: 'test-earned-badge-1',
      userId: 'test-user-id',
      badgeId: 'test-badge-id',
      awardedAt: Date.now(),
      metadata: {},
    };

    this.setMockEarnedBadge(testEarnedBadge.userId, testEarnedBadge.badgeId, testEarnedBadge);
  }
}
