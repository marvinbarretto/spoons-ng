// badges/data-access/badge-award.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { BadgeAwardService } from './badge-award.service';
import { BadgeLogicService } from './badge-logic.service';
import { BadgeStore } from './badge.store';
import { BadgeTestFactories } from '../testing/badge-test-factories';
import type { CheckIn } from '../../check-in/utils/check-in.models';
import type { EarnedBadge } from '../utils/badge.model';

/**
 * Test suite for BadgeAwardService.
 *
 * Tests the orchestration service that coordinates badge evaluation and awarding.
 * This service acts as the main entry point for badge processing after check-ins.
 */
describe('BadgeAwardService', () => {
  let service: BadgeAwardService;
  let mockBadgeLogic: jest.Mocked<BadgeLogicService>;
  let mockBadgeStore: jest.Mocked<BadgeStore>;

  beforeEach(() => {
    // Create Jest mocks for dependencies
    const badgeLogicMock = {
      evaluateAllBadges: jest.fn(),
      getDebugInfo: jest.fn()
    } as jest.Mocked<Partial<BadgeLogicService>>;

    const badgeStoreMock = {
      data: jest.fn(),
      awardBadge: jest.fn()
    } as unknown as jest.Mocked<BadgeStore>;

    TestBed.configureTestingModule({
      providers: [
        BadgeAwardService,
        { provide: BadgeLogicService, useValue: badgeLogicMock },
        { provide: BadgeStore, useValue: badgeStoreMock }
      ]
    });

    service = TestBed.inject(BadgeAwardService);
    mockBadgeLogic = TestBed.inject(BadgeLogicService) as jest.Mocked<BadgeLogicService>;
    mockBadgeStore = TestBed.inject(BadgeStore) as jest.Mocked<BadgeStore>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('evaluateAndAwardBadges', () => {
    /**
     * Main happy path: User's first check-in should award first-checkin badge.
     * Tests the complete flow from evaluation to awarding.
     */
    it('should award first-checkin badge on first check-in', async () => {
      // Arrange
      const userId = 'user123';
      const newCheckIn = BadgeTestFactories.createCheckIn(userId, 'pub1');
      const allUserCheckIns = [newCheckIn];

      const expectedEarnedBadge: EarnedBadge = {
        id: 'earned-badge-123',
        userId,
        badgeId: 'first-checkin',
        awardedAt: Date.now(),
        metadata: {
          triggeredBy: 'check-in',
          checkInId: newCheckIn.id,
          pubId: newCheckIn.pubId,
          awardedAt: expect.any(Number)
        }
      };

      mockBadgeLogic.evaluateAllBadges.mockReturnValue(['first-checkin']);
      mockBadgeStore.data.mockReturnValue(signal([])());
      mockBadgeStore.awardBadge.mockResolvedValue(expectedEarnedBadge);

      // Act
      const result = await service.evaluateAndAwardBadges(userId, newCheckIn, allUserCheckIns);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expectedEarnedBadge);
      expect(mockBadgeLogic.evaluateAllBadges).toHaveBeenCalledWith({
        userId,
        checkIn: newCheckIn,
        userCheckIns: allUserCheckIns,
        userBadges: []
      });
      expect(mockBadgeStore.awardBadge).toHaveBeenCalledWith('first-checkin', {
        triggeredBy: 'check-in',
        checkInId: newCheckIn.id,
        pubId: newCheckIn.pubId,
        awardedAt: expect.any(Number)
      });
    });

    /**
     * Multiple badges scenario: 10th check-in across 5 pubs should award both regular and explorer badges.
     * Tests that multiple eligible badges are all awarded correctly.
     */
    it('should award multiple badges when eligible', async () => {
      // Arrange
      const userId = 'user123';
      const pubIds = ['pub1', 'pub2', 'pub3', 'pub4', 'pub5'];
      const allUserCheckIns = [
        ...BadgeTestFactories.createMultiPubCheckIns(userId, pubIds, 9),
        ...BadgeTestFactories.createSequentialCheckIns(userId, 5, 'pub1', 4)
      ];
      const newCheckIn = allUserCheckIns[allUserCheckIns.length - 1];

      const regularBadge: EarnedBadge = {
        id: 'earned-regular-123',
        userId,
        badgeId: 'regular',
        awardedAt: Date.now(),
        metadata: {
          triggeredBy: 'check-in',
          checkInId: newCheckIn.id,
          pubId: newCheckIn.pubId,
          awardedAt: expect.any(Number)
        }
      };

      const explorerBadge: EarnedBadge = {
        id: 'earned-explorer-123',
        userId,
        badgeId: 'explorer',
        awardedAt: Date.now(),
        metadata: {
          triggeredBy: 'check-in',
          checkInId: newCheckIn.id,
          pubId: newCheckIn.pubId,
          awardedAt: expect.any(Number)
        }
      };

      mockBadgeLogic.evaluateAllBadges.mockReturnValue(['regular', 'explorer']);
      mockBadgeStore.data.mockReturnValue(signal([])());
      mockBadgeStore.awardBadge
        .mockResolvedValueOnce(regularBadge)
        .mockResolvedValueOnce(explorerBadge);

      // Act
      const result = await service.evaluateAndAwardBadges(userId, newCheckIn, allUserCheckIns);

      // Assert
      expect(result).toHaveLength(2);
      expect(result).toContain(regularBadge);
      expect(result).toContain(explorerBadge);
      expect(mockBadgeStore.awardBadge).toHaveBeenCalledTimes(2);
      expect(mockBadgeStore.awardBadge).toHaveBeenCalledWith('regular', expect.any(Object));
      expect(mockBadgeStore.awardBadge).toHaveBeenCalledWith('explorer', expect.any(Object));
    });

    /**
     * No eligible badges scenario: Regular check-in that doesn't qualify for any badges.
     * Should complete successfully without awarding anything.
     */
    it('should return empty array when no badges are eligible', async () => {
      // Arrange
      const userId = 'user123';
      const allUserCheckIns = BadgeTestFactories.createSequentialCheckIns(userId, 3, 'pub1');
      const newCheckIn = allUserCheckIns[allUserCheckIns.length - 1];

      mockBadgeLogic.evaluateAllBadges.mockReturnValue([]); // No eligible badges
      mockBadgeStore.data.mockReturnValue(signal([])());

      // Act
      const result = await service.evaluateAndAwardBadges(userId, newCheckIn, allUserCheckIns);

      // Assert
      expect(result).toEqual([]);
      expect(mockBadgeStore.awardBadge).not.toHaveBeenCalled();
    });

    /**
     * Error handling: Badge awarding failure should not crash the entire process.
     * Tests graceful handling of individual badge award failures.
     */
    it('should handle badge award failures gracefully', async () => {
      // Arrange
      const userId = 'user123';
      const newCheckIn = BadgeTestFactories.createCheckIn(userId, 'pub1');
      const allUserCheckIns = [newCheckIn];

      const successfulBadge: EarnedBadge = {
        id: 'earned-success-123',
        userId,
        badgeId: 'first-checkin',
        awardedAt: Date.now(),
        metadata: {}
      };

      mockBadgeLogic.evaluateAllBadges.mockReturnValue(['first-checkin', 'other-badge']);
      mockBadgeStore.data.mockReturnValue(signal([])());
      mockBadgeStore.awardBadge
        .mockResolvedValueOnce(successfulBadge) // First badge succeeds
        .mockRejectedValueOnce(new Error('Award failed')); // Second badge fails

      // Act
      const result = await service.evaluateAndAwardBadges(userId, newCheckIn, allUserCheckIns);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(successfulBadge);
      expect(mockBadgeStore.awardBadge).toHaveBeenCalledTimes(2);
    });

    /**
     * Context building: Ensure the service correctly builds badge trigger context.
     * Tests that user badges are properly included in the evaluation context.
     */
    it('should include existing user badges in evaluation context', async () => {
      // Arrange
      const userId = 'user123';
      const newCheckIn = BadgeTestFactories.createCheckIn(userId, 'pub1');
      const allUserCheckIns = [newCheckIn];
      const existingBadges: EarnedBadge[] = [{
        id: 'existing-badge-123',
        userId,
        badgeId: 'some-badge',
        awardedAt: Date.now() - 86400000,
        metadata: {}
      }];

      mockBadgeLogic.evaluateAllBadges.mockReturnValue([]);
      mockBadgeStore.data.mockReturnValue(signal(existingBadges)());

      // Act
      await service.evaluateAndAwardBadges(userId, newCheckIn, allUserCheckIns);

      // Assert
      expect(mockBadgeLogic.evaluateAllBadges).toHaveBeenCalledWith({
        userId,
        checkIn: newCheckIn,
        userCheckIns: allUserCheckIns,
        userBadges: existingBadges
      });
    });

    /**
     * Metadata verification: Ensure awarded badges include proper context metadata.
     * Tests that badges are awarded with correct triggering information.
     */
    it('should award badges with correct metadata', async () => {
      // Arrange
      const userId = 'user123';
      const newCheckIn = BadgeTestFactories.createCheckIn(userId, 'pub1');
      const allUserCheckIns = [newCheckIn];
      const expectedBadge: EarnedBadge = {
        id: 'earned-badge-123',
        userId,
        badgeId: 'first-checkin',
        awardedAt: Date.now(),
        metadata: {
          triggeredBy: 'check-in',
          checkInId: newCheckIn.id,
          pubId: newCheckIn.pubId,
          awardedAt: expect.any(Number)
        }
      };

      mockBadgeLogic.evaluateAllBadges.mockReturnValue(['first-checkin']);
      mockBadgeStore.data.mockReturnValue(signal([])());
      mockBadgeStore.awardBadge.mockResolvedValue(expectedBadge);

      // Act
      await service.evaluateAndAwardBadges(userId, newCheckIn, allUserCheckIns);

      // Assert
      expect(mockBadgeStore.awardBadge).toHaveBeenCalledWith('first-checkin', {
        triggeredBy: 'check-in',
        checkInId: newCheckIn.id,
        pubId: newCheckIn.pubId,
        awardedAt: expect.any(Number)
      });
    });
  });

  describe('evaluateBadgesForUser', () => {
    /**
     * Manual evaluation: Should evaluate badges for testing/admin purposes.
     * Tests the manual badge evaluation functionality.
     */
    it('should evaluate badges for user with check-ins', async () => {
      // Arrange
      const userId = 'user123';
      const userCheckIns = BadgeTestFactories.createSequentialCheckIns(userId, 5);

      mockBadgeLogic.evaluateAllBadges.mockReturnValue(['some-badge']);
      mockBadgeStore.data.mockReturnValue(signal([])());

      // Act
      const result = await service.evaluateBadgesForUser(userId, userCheckIns);

      // Assert
      expect(result).toEqual(['some-badge']);
      expect(mockBadgeLogic.evaluateAllBadges).toHaveBeenCalledWith({
        userId,
        checkIn: userCheckIns[userCheckIns.length - 1], // Latest check-in as trigger
        userCheckIns,
        userBadges: []
      });
    });

    /**
     * Empty check-ins: Should handle users with no check-ins gracefully.
     */
    it('should return empty array for user with no check-ins', async () => {
      // Arrange
      const userId = 'user123';
      const userCheckIns: CheckIn[] = [];

      // Act
      const result = await service.evaluateBadgesForUser(userId, userCheckIns);

      // Assert
      expect(result).toEqual([]);
      expect(mockBadgeLogic.evaluateAllBadges).not.toHaveBeenCalled();
    });
  });

  describe('getDebugInfo', () => {
    /**
     * Debug information: Should provide comprehensive debug data.
     * Tests the debug functionality for troubleshooting badge issues.
     */
    it('should return debug information for user with check-ins', async () => {
      // Arrange
      const userId = 'user123';
      const userCheckIns = BadgeTestFactories.createSequentialCheckIns(userId, 3);
      const debugInfo = { userId, totalCheckIns: 3, eligibleBadges: [] };

      mockBadgeLogic.getDebugInfo.mockReturnValue(debugInfo);
      mockBadgeStore.data.mockReturnValue(signal([])());

      // Act
      const result = await service.getDebugInfo(userId, userCheckIns);

      // Assert
      expect(result).toEqual({
        context: {
          userId,
          checkIn: userCheckIns[userCheckIns.length - 1],
          userCheckIns,
          userBadges: []
        },
        debugInfo
      });
    });

    /**
     * Debug with no check-ins: Should handle empty check-ins gracefully.
     */
    it('should return error for user with no check-ins', async () => {
      // Arrange
      const userId = 'user123';
      const userCheckIns: CheckIn[] = [];

      // Act
      const result = await service.getDebugInfo(userId, userCheckIns);

      // Assert
      expect(result).toEqual({ error: 'No check-ins found for user' });
      expect(mockBadgeLogic.getDebugInfo).not.toHaveBeenCalled();
    });
  });
});
