// badges/data-access/earned-badge.store.spec.ts
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { EarnedBadgeStore } from './earned-badge.store';
import { EarnedBadgeService } from './earned-badge.service';
import { AuthStore } from '../../auth/data-access/auth.store';
import { BadgeTestFactories } from '../testing/badge-test-factories';
import type { EarnedBadge } from '../utils/badge.model';
import type { AuthUser } from '../../auth/utils/auth.model';

/**
 * Test suite for EarnedBadgeStore.
 *
 * Tests the reactive state management for user's earned badges.
 * Covers data loading, badge awarding, computed signals, and user-specific operations.
 */
describe('EarnedBadgeStore', () => {
  let store: EarnedBadgeStore;
  let mockService: jest.Mocked<EarnedBadgeService>;
  let mockAuthStore: jest.Mocked<AuthStore>;

  // Complete test user data matching AuthUser interface
  const testUser: AuthUser = {
    uid: 'user123',
    displayName: 'Test User',
    isAnonymous: false,
    email: 'test@example.com',
    emailVerified: true,
    photoURL: 'https://example.com/avatar.jpg',
    landlordOf: [],
    claimedPubIds: [],
    checkedInPubIds: [],
    badges: [],
    streaks: {},
    joinedMissionIds: [],
    joinedAt: '2023-01-01T00:00:00.000Z'
  };

  beforeEach(() => {
    // Create Jest mocks for dependencies
    const serviceMock = {
      getEarnedBadgesForUser: jest.fn(),
      awardBadge: jest.fn()
    } as jest.Mocked<Partial<EarnedBadgeService>>;

    // Create a proper mock for AuthStore that matches the class structure
    const authStoreMock = {
      user: jest.fn(),
      token: jest.fn(),
      ready: jest.fn(),
      userChangeSignal: jest.fn(),
      isAuthenticated: jest.fn(),
      isAnonymous: jest.fn(),
      uid: jest.fn(),
      displayName: jest.fn()
    } as unknown as jest.Mocked<AuthStore>;

    TestBed.configureTestingModule({
      providers: [
        EarnedBadgeStore,
        { provide: EarnedBadgeService, useValue: serviceMock },
        { provide: AuthStore, useValue: authStoreMock }
      ]
    });

    store = TestBed.inject(EarnedBadgeStore);
    mockService = TestBed.inject(EarnedBadgeService) as jest.Mocked<EarnedBadgeService>;
    mockAuthStore = TestBed.inject(AuthStore) as jest.Mocked<AuthStore>;

    // Default setup: authenticated user - mock returns the signal result, not the signal itself
    mockAuthStore.user.mockReturnValue(signal(testUser)());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchData', () => {
    /**
     * Data loading: Should fetch badges for authenticated user.
     * Tests the core data loading functionality.
     */
    it('should fetch earned badges for authenticated user', async () => {
      // Arrange
      const earnedBadges = [
        BadgeTestFactories.createEarnedBadge(testUser.uid, 'first-checkin'),
        BadgeTestFactories.createEarnedBadge(testUser.uid, 'regular')
      ];

      mockService.getEarnedBadgesForUser.mockResolvedValue(earnedBadges);

      // Act
      const result = await (store as any).fetchData();

      // Assert
      expect(result).toEqual(earnedBadges);
      expect(mockService.getEarnedBadgesForUser).toHaveBeenCalledWith(testUser.uid);
    });

    /**
     * No user scenario: Should return empty array when no user is authenticated.
     */
    it('should return empty array when no user is authenticated', async () => {
      // Arrange
      mockAuthStore.user.mockReturnValue(signal(null)());

      // Act
      const result = await (store as any).fetchData();

      // Assert
      expect(result).toEqual([]);
      expect(mockService.getEarnedBadgesForUser).not.toHaveBeenCalled();
    });

    /**
     * User without UID: Should return empty array when user has no UID.
     */
    it('should return empty array when user has no uid', async () => {
      // Arrange
      const userWithoutUid = { ...testUser, uid: '' };
      mockAuthStore.user.mockReturnValue(signal(userWithoutUid)());

      // Act
      const result = await (store as any).fetchData();

      // Assert
      expect(result).toEqual([]);
      expect(mockService.getEarnedBadgesForUser).not.toHaveBeenCalled();
    });
  });

  describe('computed signals', () => {
    beforeEach(() => {
      // Setup store with test data
      const earnedBadges = [
        BadgeTestFactories.createEarnedBadge(testUser.uid, 'first-checkin', { awardedAt: Date.now() - 86400000 }), // 1 day ago
        BadgeTestFactories.createEarnedBadge(testUser.uid, 'regular', { awardedAt: Date.now() - 3600000 }), // 1 hour ago
        BadgeTestFactories.createEarnedBadge(testUser.uid, 'explorer', { awardedAt: Date.now() - 1800000 }) // 30 min ago
      ];

      // Manually set store data for testing computed signals
      (store as any)._data.set(earnedBadges);
    });

    /**
     * Badge count: Should correctly count earned badges.
     */
    it('should calculate earnedBadgeCount correctly', () => {
      expect(store.earnedBadgeCount()).toBe(3);
    });

    /**
     * Badges by date: Should sort badges by award date (newest first).
     */
    it('should sort badges by date correctly', () => {
      const sorted = store.badgesByDate();

      expect(sorted).toHaveLength(3);
      expect(sorted[0].badgeId).toBe('explorer'); // Most recent
      expect(sorted[1].badgeId).toBe('regular');
      expect(sorted[2].badgeId).toBe('first-checkin'); // Oldest
    });

    /**
     * Recent badges: Should return the 3 most recent badges.
     */
    it('should return recent badges correctly', () => {
      const recent = store.recentBadges();

      expect(recent).toHaveLength(3);
      expect(recent[0].badgeId).toBe('explorer');
      expect(recent[1].badgeId).toBe('regular');
      expect(recent[2].badgeId).toBe('first-checkin');
    });

    /**
     * Badge IDs: Should extract all badge IDs.
     */
    it('should return badge IDs correctly', () => {
      const badgeIds = store.badgeIds();

      expect(badgeIds).toEqual(['first-checkin', 'regular', 'explorer']);
    });
  });

  describe('query methods', () => {
    beforeEach(() => {
      const earnedBadges = [
        BadgeTestFactories.createEarnedBadge(testUser.uid, 'first-checkin'),
        BadgeTestFactories.createEarnedBadge(testUser.uid, 'regular')
      ];

      (store as any)._data.set(earnedBadges);
    });

    /**
     * Get earned badge: Should find badge by badge ID.
     */
    it('should get earned badge by badge ID', () => {
      const result = store.getEarnedBadge('first-checkin');

      expect(result).toBeDefined();
      expect(result?.badgeId).toBe('first-checkin');
      expect(result?.userId).toBe(testUser.uid);
    });

    /**
     * Badge not found: Should return undefined for non-existent badge.
     */
    it('should return undefined for non-existent badge', () => {
      const result = store.getEarnedBadge('non-existent');

      expect(result).toBeUndefined();
    });

    /**
     * Has earned badge: Should correctly identify earned badges.
     */
    it('should correctly identify if user has earned a badge', () => {
      expect(store.hasEarnedBadge('first-checkin')).toBe(true);
      expect(store.hasEarnedBadge('regular')).toBe(true);
      expect(store.hasEarnedBadge('explorer')).toBe(false);
    });

    /**
     * Badges since timestamp: Should filter badges by time period.
     */
    it('should get badges earned since timestamp', () => {
      const timestamp = Date.now() - 86400000; // 1 day ago
      const recent = store.getEarnedBadgesSince(timestamp);

      // Both badges should be more recent than 1 day ago
      expect(recent).toHaveLength(2);
    });
  });

  describe('awardBadge', () => {
    /**
     * Award badge success: Should award badge and update store state.
     */
    it('should award badge successfully', async () => {
      // Arrange
      const newBadge = BadgeTestFactories.createEarnedBadge(testUser.uid, 'explorer');

      mockService.awardBadge.mockResolvedValue(newBadge);

      // Start with empty store
      (store as any)._data.set([]);

      // Act
      const result = await store.awardBadge('explorer', { testMode: true });

      // Assert
      expect(result).toEqual(newBadge);
      expect(mockService.awardBadge).toHaveBeenCalledWith(testUser.uid, 'explorer', { testMode: true });
      expect(store.data()).toContain(newBadge);
    });

    /**
     * No authenticated user: Should throw error when no user is authenticated.
     */
    it('should throw error when no user is authenticated', async () => {
      // Arrange
      mockAuthStore.user.mockReturnValue(signal(null)());

      // Act & Assert
      await expect(store.awardBadge('explorer')).rejects.toThrow('No authenticated user');
      expect(mockService.awardBadge).not.toHaveBeenCalled();
    });

    /**
     * Service error handling: Should handle service errors and update error state.
     */
    it('should handle service errors and update error state', async () => {
      // Arrange
      const serviceError = new Error('Service error');

      mockService.awardBadge.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(store.awardBadge('explorer')).rejects.toThrow('Service error');
      expect(store.error()).toBe('Service error');
    });
  });

  describe('loadForUser', () => {
    /**
     * Load for specific user: Should load badges for any user (admin functionality).
     */
    it('should load badges for specific user', async () => {
      // Arrange
      const otherUserId = 'other-user';
      const otherUserBadges = [
        BadgeTestFactories.createEarnedBadge(otherUserId, 'first-checkin'),
        BadgeTestFactories.createEarnedBadge(otherUserId, 'regular')
      ];

      mockService.getEarnedBadgesForUser.mockResolvedValue(otherUserBadges);

      // Act
      await store.loadForUser(otherUserId);

      // Assert
      expect(mockService.getEarnedBadgesForUser).toHaveBeenCalledWith(otherUserId);
      expect(store.data()).toEqual(otherUserBadges);
      expect(store.loading()).toBe(false);
      expect(store.error()).toBeNull();
    });

    /**
     * Load error handling: Should handle loading errors gracefully.
     */
    it('should handle loading errors', async () => {
      // Arrange
      const loadError = new Error('Load failed');
      mockService.getEarnedBadgesForUser.mockRejectedValue(loadError);

      // Act
      await store.loadForUser('user123');

      // Assert
      expect(store.error()).toBe('Load failed');
      expect(store.loading()).toBe(false);
    });
  });

  describe('getDebugInfo', () => {
    /**
     * Debug information: Should provide comprehensive debug data.
     */
    it('should return comprehensive debug information', () => {
      // Arrange
      const earnedBadges = [
        BadgeTestFactories.createEarnedBadge(testUser.uid, 'first-checkin', { awardedAt: Date.now() - 86400000 }),
        BadgeTestFactories.createEarnedBadge(testUser.uid, 'regular', { awardedAt: Date.now() - 3600000 })
      ];

      (store as any)._data.set(earnedBadges);
      (store as any)._loading.set(false);
      (store as any)._error.set(null);

      // Act
      const debugInfo = store.getDebugInfo();

      // Assert
      expect(debugInfo).toMatchObject({
        name: 'EarnedBadgeStore',
        itemCount: 2,
        hasLoaded: true,
        loading: false,
        error: null,
        hasData: true,
        isEmpty: false,
        earnedBadgeCount: 2,
        recentBadgeIds: ['regular', 'first-checkin'] // Sorted by date
      });
      expect(debugInfo.sampleData).toHaveLength(2);
    });
  });
});
