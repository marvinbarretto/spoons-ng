// badges/data-access/badge-logic.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { BadgeTestFactories } from '../testing/badge-test-factories';
import type { BadgeTriggerContext } from '../utils/badge.model';
import { BadgeLogicService } from './badge-logic.service';
import { BadgeStore } from './badge.store';

/**
 * Test suite for BadgeLogicService.
 *
 * Tests the core business logic for determining badge eligibility.
 * Covers all badge types: first-time, regular (milestone), and explorer badges.
 */
describe('BadgeLogicService', () => {
  let service: BadgeLogicService;
  let mockBadgeStore: jest.Mocked<BadgeStore>;

  beforeEach(() => {
    const badgeStoreMock = {
      hasEarnedBadge: jest.fn(),
    } as jest.Mocked<Partial<BadgeStore>>;

    TestBed.configureTestingModule({
      providers: [BadgeLogicService, { provide: BadgeStore, useValue: badgeStoreMock }],
    });

    service = TestBed.inject(BadgeLogicService);
    mockBadgeStore = TestBed.inject(BadgeStore) as jest.Mocked<BadgeStore>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkFirstTimeBadge', () => {
    /**
     * First-time badge should be awarded on the user's very first check-in.
     * This is the most fundamental badge in the system.
     */
    it('should award badge on first check-in', () => {
      // Arrange
      const userId = 'user123';
      const checkIns = [BadgeTestFactories.createCheckIn(userId, 'pub1')];
      const context = BadgeTestFactories.createContext(userId, checkIns);

      // Act
      const result = service.checkFirstTimeBadge(context);

      // Assert
      expect(result).toBe(true);
    });

    /**
     * First-time badge should only be awarded once - never on subsequent check-ins.
     */
    it('should not award badge on second check-in', () => {
      // Arrange
      const userId = 'user123';
      const checkIns = BadgeTestFactories.createSequentialCheckIns(userId, 2);
      const context = BadgeTestFactories.createContext(userId, checkIns);

      // Act
      const result = service.checkFirstTimeBadge(context);

      // Assert
      expect(result).toBe(false);
    });

    /**
     * Edge case: No check-ins should not trigger first-time badge.
     * (Though this scenario shouldn't occur in practice since context requires check-ins)
     */
    it('should not award badge when user has no check-ins', () => {
      // Arrange
      const userId = 'user123';
      const context: BadgeTriggerContext = {
        userId,
        checkIn: BadgeTestFactories.createCheckIn(userId, 'pub1'), // Required by type
        userCheckIns: [], // Empty check-ins
        userBadges: [],
      };

      // Act
      const result = service.checkFirstTimeBadge(context);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('checkRegularBadge', () => {
    /**
     * Regular badge should be awarded exactly on the 10th check-in.
     * This tests the milestone badge logic.
     */
    it('should award badge on 10th check-in', () => {
      // Arrange
      const userId = 'user123';
      const checkIns = BadgeTestFactories.createSequentialCheckIns(userId, 10);
      const context = BadgeTestFactories.createContext(userId, checkIns);

      // Act
      const result = service.checkRegularBadge(context);

      // Assert
      expect(result).toBe(true);
    });

    /**
     * Regular badge should not be awarded before reaching 10 check-ins.
     */
    it('should not award badge on 9th check-in', () => {
      // Arrange
      const userId = 'user123';
      const checkIns = BadgeTestFactories.createSequentialCheckIns(userId, 9);
      const context = BadgeTestFactories.createContext(userId, checkIns);

      // Act
      const result = service.checkRegularBadge(context);

      // Assert
      expect(result).toBe(false);
    });

    /**
     * Regular badge should only be awarded once - not on subsequent check-ins.
     */
    it('should not award badge on 11th check-in', () => {
      // Arrange
      const userId = 'user123';
      const checkIns = BadgeTestFactories.createSequentialCheckIns(userId, 11);
      const context = BadgeTestFactories.createContext(userId, checkIns);

      // Act
      const result = service.checkRegularBadge(context);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('checkExplorerBadge', () => {
    /**
     * Explorer badge should be awarded when user visits 5 different pubs.
     * This tests the unique pub counting logic.
     */
    it('should award badge when visiting 5 different pubs', () => {
      // Arrange
      const userId = 'user123';
      const pubIds = ['pub1', 'pub2', 'pub3', 'pub4', 'pub5'];
      const checkIns = BadgeTestFactories.createMultiPubCheckIns(userId, pubIds);
      const context = BadgeTestFactories.createContext(userId, checkIns);

      mockBadgeStore.hasEarnedBadge.mockReturnValue(false);

      // Act
      const result = service.checkExplorerBadge(context);

      // Assert
      expect(result).toBe(true);
      expect(mockBadgeStore.hasEarnedBadge).toHaveBeenCalledWith('explorer');
    });

    /**
     * Explorer badge should not be awarded with insufficient unique pubs.
     */
    it('should not award badge when visiting only 4 different pubs', () => {
      // Arrange
      const userId = 'user123';
      const pubIds = ['pub1', 'pub2', 'pub3', 'pub4'];
      const checkIns = BadgeTestFactories.createMultiPubCheckIns(userId, pubIds);
      const context = BadgeTestFactories.createContext(userId, checkIns);

      // Act
      const result = service.checkExplorerBadge(context);

      // Assert
      expect(result).toBe(false);
      // Should not even check if user has badge since threshold not met
      expect(mockBadgeStore.hasEarnedBadge).not.toHaveBeenCalled();
    });

    /**
     * Explorer badge should not be awarded if user already has it.
     * Tests the duplicate badge prevention logic.
     */
    it('should not award badge if user already has explorer badge', () => {
      // Arrange
      const userId = 'user123';
      const pubIds = ['pub1', 'pub2', 'pub3', 'pub4', 'pub5'];
      const checkIns = BadgeTestFactories.createMultiPubCheckIns(userId, pubIds);
      const context = BadgeTestFactories.createContext(userId, checkIns);

      mockBadgeStore.hasEarnedBadge.mockReturnValue(true); // Already has badge

      // Act
      const result = service.checkExplorerBadge(context);

      // Assert
      expect(result).toBe(false);
      expect(mockBadgeStore.hasEarnedBadge).toHaveBeenCalledWith('explorer');
    });

    /**
     * Explorer badge logic should correctly handle duplicate pub visits.
     * Multiple visits to the same pub should count as one unique pub.
     */
    it('should count multiple visits to same pub as one unique pub', () => {
      // Arrange
      const userId = 'user123';
      const checkIns = [
        BadgeTestFactories.createCheckIn(userId, 'pub1', 4),
        BadgeTestFactories.createCheckIn(userId, 'pub1', 3), // Same pub again
        BadgeTestFactories.createCheckIn(userId, 'pub2', 2),
        BadgeTestFactories.createCheckIn(userId, 'pub3', 1),
        BadgeTestFactories.createCheckIn(userId, 'pub4', 0), // Only 4 unique pubs
      ];
      const context = BadgeTestFactories.createContext(userId, checkIns);

      // Act
      const result = service.checkExplorerBadge(context);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('evaluateAllBadges', () => {
    /**
     * Integration test: First check-in should trigger first-checkin badge only.
     */
    it('should return first-checkin badge for first check-in', () => {
      // Arrange
      const userId = 'user123';
      const checkIns = [BadgeTestFactories.createCheckIn(userId, 'pub1')];
      const context = BadgeTestFactories.createContext(userId, checkIns);

      mockBadgeStore.hasEarnedBadge.mockReturnValue(false);

      // Act
      const result = service.evaluateAllBadges(context);

      // Assert
      expect(result).toEqual(['first-checkin']);
    });

    /**
     * Integration test: Complex scenario with multiple badge eligibility.
     * Tests that multiple badges can be awarded simultaneously.
     */
    it('should return multiple badges when eligible', () => {
      // Arrange: 10 check-ins across 5 different pubs (eligible for both regular and explorer)
      const userId = 'user123';
      const checkIns = [
        ...BadgeTestFactories.createMultiPubCheckIns(
          userId,
          ['pub1', 'pub2', 'pub3', 'pub4', 'pub5'],
          9
        ),
        ...BadgeTestFactories.createSequentialCheckIns(userId, 5, 'pub1', 4), // Additional check-ins at pub1
      ];
      const context = BadgeTestFactories.createContext(userId, checkIns);

      mockBadgeStore.hasEarnedBadge.mockReturnValue(false);

      // Act
      const result = service.evaluateAllBadges(context);

      // Assert
      expect(result).toContain('regular'); // 10th check-in
      expect(result).toContain('explorer'); // 5 different pubs
      expect(result).not.toContain('first-checkin'); // Not first check-in
    });

    /**
     * Integration test: No badges should be awarded when criteria aren't met.
     */
    it('should return empty array when no badges are eligible', () => {
      // Arrange: 2 check-ins at same pub (not eligible for any badges)
      const userId = 'user123';
      const checkIns = BadgeTestFactories.createSequentialCheckIns(userId, 2, 'pub1');
      const context = BadgeTestFactories.createContext(userId, checkIns);

      mockBadgeStore.hasEarnedBadge.mockReturnValue(false);

      // Act
      const result = service.evaluateAllBadges(context);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getDebugInfo', () => {
    /**
     * Debug method should return comprehensive information for troubleshooting.
     */
    it('should return comprehensive debug information', () => {
      // Arrange
      const userId = 'user123';
      const checkIns = BadgeTestFactories.createMultiPubCheckIns(userId, ['pub1', 'pub2']);
      const earnedBadges = [BadgeTestFactories.createEarnedBadge(userId, 'first-checkin')];
      const context = BadgeTestFactories.createContext(userId, checkIns, earnedBadges);

      // Act
      const result = service.getDebugInfo(context);

      // Assert
      expect(result).toEqual({
        userId: 'user123',
        totalCheckIns: 2,
        uniquePubs: 2,
        currentBadges: ['first-checkin'],
        badgeChecks: {
          firstTime: false, // Not first check-in anymore
          regular: false, // Not 10 check-ins
          explorer: false, // Not 5 pubs
        },
      });
    });
  });
});
