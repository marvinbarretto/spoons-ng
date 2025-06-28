// badges/testing/badge-test-factories.ts
import { Timestamp } from 'firebase/firestore';
import type { BadgeTriggerContext, EarnedBadge, Badge } from '../utils/badge.model';
import type { CheckIn } from '@check-in/utils/check-in.models';
/**
 * Test data factories for badge-related testing.
 * Provides consistent, reusable test data creation methods.
 */
export class BadgeTestFactories {

  /**
   * Creates a mock CheckIn object for testing.
   *
   * @param userId - The user ID for the check-in
   * @param pubId - The pub ID for the check-in
   * @param daysAgo - How many days ago this check-in occurred (0 = today)
   * @param overrides - Optional partial CheckIn to override defaults
   * @returns A complete CheckIn object
   *
   * @example
   * ```typescript
   * // Today's check-in
   * const checkIn = BadgeTestFactories.createCheckIn('user123', 'pub1');
   *
   * // Check-in from 3 days ago
   * const oldCheckIn = BadgeTestFactories.createCheckIn('user123', 'pub1', 3);
   *
   * // Check-in with custom properties
   * const customCheckIn = BadgeTestFactories.createCheckIn('user123', 'pub1', 0, {
   *   madeUserLandlord: true
   * });
   * ```
   */
  static createCheckIn(
    userId: string,
    pubId: string,
    daysAgo: number = 0,
    overrides: Partial<CheckIn> = {}
  ): CheckIn {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    return {
      id: `checkin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      pubId,
      timestamp: Timestamp.fromDate(date),
      dateKey: date.toISOString().split('T')[0],
      madeUserLandlord: false,
      ...overrides
    };
  }

  /**
   * Creates a mock EarnedBadge object for testing.
   *
   * @param userId - The user who earned the badge
   * @param badgeId - The ID of the badge that was earned
   * @param overrides - Optional partial EarnedBadge to override defaults
   * @returns A complete EarnedBadge object
   *
   * @example
   * ```typescript
   * // Basic earned badge
   * const earned = BadgeTestFactories.createEarnedBadge('user123', 'first-checkin');
   *
   * // Earned badge with custom metadata
   * const earnedWithMeta = BadgeTestFactories.createEarnedBadge('user123', 'explorer', {
   *   metadata: { triggeredBy: 'test' }
   * });
   * ```
   */
  static createEarnedBadge(
    userId: string,
    badgeId: string,
    overrides: Partial<EarnedBadge> = {}
  ): EarnedBadge {
    return {
      id: `earned-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      badgeId,
      awardedAt: Date.now(),
      metadata: {},
      ...overrides
    };
  }

  /**
   * Creates a mock Badge definition for testing.
   *
   * @param id - The badge ID
   * @param overrides - Optional partial Badge to override defaults
   * @returns A complete Badge object
   *
   * @example
   * ```typescript
   * // Basic badge definition
   * const badge = BadgeTestFactories.createBadge('first-checkin');
   *
   * // Custom badge
   * const customBadge = BadgeTestFactories.createBadge('test-badge', {
   *   name: 'Test Achievement',
   *   emoji: '🧪'
   * });
   * ```
   */
  static createBadge(id: string, overrides: Partial<Badge> = {}): Badge {
    return {
      id,
      name: `Test Badge ${id}`,
      description: `Test description for ${id}`,
      category: 'test',
      emoji: '🏆',
      criteria: `Test criteria for ${id}`,
      createdAt: undefined,
      updatedAt: undefined,
      ...overrides
    };
  }

  /**
   * Creates a BadgeTriggerContext for testing badge logic.
   *
   * @param userId - The user ID
   * @param checkIns - Array of user's check-ins (latest will be used as trigger)
   * @param earnedBadges - Array of user's already earned badges
   * @returns A complete BadgeTriggerContext object
   *
   * @example
   * ```typescript
   * // Context for first check-in
   * const context = BadgeTestFactories.createContext('user123', [
   *   BadgeTestFactories.createCheckIn('user123', 'pub1')
   * ]);
   *
   * // Context with multiple check-ins and earned badges
   * const complexContext = BadgeTestFactories.createContext(
   *   'user123',
   *   [checkIn1, checkIn2, checkIn3],
   *   [earnedBadge1, earnedBadge2]
   * );
   * ```
   */
  static createContext(
    userId: string,
    checkIns: CheckIn[],
    earnedBadges: EarnedBadge[] = []
  ): BadgeTriggerContext {
    if (checkIns.length === 0) {
      throw new Error('BadgeTriggerContext requires at least one check-in as trigger');
    }

    return {
      userId,
      checkIn: checkIns[checkIns.length - 1], // Latest check-in as trigger
      userCheckIns: checkIns,
      userBadges: earnedBadges
    };
  }

  /**
   * Creates multiple check-ins for the same user across different pubs.
   * Useful for testing explorer badge logic.
   *
   * @param userId - The user ID
   * @param pubIds - Array of pub IDs to check into
   * @param startDaysAgo - How many days ago to start (spreads check-ins across days)
   * @returns Array of CheckIn objects
   *
   * @example
   * ```typescript
   * // User visits 5 different pubs over 5 days
   * const checkIns = BadgeTestFactories.createMultiPubCheckIns(
   *   'user123',
   *   ['pub1', 'pub2', 'pub3', 'pub4', 'pub5'],
   *   5
   * );
   * ```
   */
  static createMultiPubCheckIns(
    userId: string,
    pubIds: string[],
    startDaysAgo: number = 0
  ): CheckIn[] {
    return pubIds.map((pubId, index) =>
      this.createCheckIn(userId, pubId, startDaysAgo - index)
    );
  }

  /**
   * Creates multiple check-ins for testing milestone badges (e.g., 10th check-in).
   *
   * @param userId - The user ID
   * @param count - Number of check-ins to create
   * @param pubId - Pub ID (defaults to 'test-pub')
   * @param startDaysAgo - How many days ago to start
   * @returns Array of CheckIn objects
   *
   * @example
   * ```typescript
   * // 10 check-ins for regular badge testing
   * const checkIns = BadgeTestFactories.createSequentialCheckIns('user123', 10);
   *
   * // 5 check-ins at specific pub starting 5 days ago
   * const checkIns = BadgeTestFactories.createSequentialCheckIns('user123', 5, 'my-pub', 5);
   * ```
   */
  static createSequentialCheckIns(
    userId: string,
    count: number,
    pubId: string = 'test-pub',
    startDaysAgo: number = 0
  ): CheckIn[] {
    return Array.from({ length: count }, (_, index) =>
      this.createCheckIn(userId, pubId, startDaysAgo - index)
    );
  }
}
