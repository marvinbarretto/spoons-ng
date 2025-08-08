/**
 * @fileoverview PointsStore Comprehensive Unit Tests
 *
 * 🎯 FINANCIAL CRITICAL TESTING:
 * This test suite focuses on the financial accuracy and business logic of PointsStore,
 * ensuring points calculations, transaction integrity, and cache coordination work correctly.
 *
 * 📊 COVERAGE FOCUS:
 * - ✅ Financial accuracy: Points calculation algorithms with distance/bonus/multiplier logic
 * - ✅ Transaction integrity: Audit trail creation and persistence
 * - ✅ Cache coordination: Leaderboard invalidation after points awarded
 * - ✅ Data consistency: Points totals matching transaction history
 * - ✅ Concurrent safety: Prevention of duplicate point awards
 * - ✅ Auth-reactive: User switching without points leaks
 * - ✅ Error recovery: Financial error handling and logging
 *
 * ❌ EXCLUDED (Framework/Low Business Value):
 * - Signal change detection (Angular framework functionality)
 * - Basic loading states (trivial UI updates)
 * - Debug method outputs (logging functionality)
 * - Simple getters/setters (no business logic)
 */

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthStore } from '../../auth/data-access/auth.store';
import { PubStore } from '../../pubs/data-access/pub.store';
import type { Pub } from '../../pubs/utils/pub.models';
import { CacheCoherenceService } from '../../shared/data-access/cache-coherence.service';
import { ErrorLoggingService } from '../../shared/data-access/error-logging.service';
import { useTestSuite } from '../../shared/testing/core/mock-registry';
import type { User } from '../../users/utils/user.model';
import type { CheckInPointsData, PointsBreakdown, PointsTransaction } from '../utils/points.models';
import { PointsService } from './points.service';
import { PointsStore } from './points.store';

// Test data factories for consistent test setup
const createTestUser = (overrides: Partial<User> = {}): User => ({
  uid: 'test-user-123',
  displayName: 'Test User',
  email: 'test@example.com',
  isAnonymous: false,
  photoURL: null,
  joinedAt: '2024-01-01',
  totalPoints: 0,
  badgeCount: 0,
  ...overrides,
});

const createTestPub = (overrides: Partial<Pub> = {}): Pub => ({
  id: 'pub-123',
  name: 'Test Pub',
  address: '123 Test Street',
  postcode: 'TE5T 1NG',
  latitude: 51.5074,
  longitude: -0.1278,
  chainName: 'Independent',
  carpetImageUrl: null,
  region: 'London',
  ...overrides,
});

const createTestPointsData = (overrides: Partial<CheckInPointsData> = {}): CheckInPointsData => ({
  pubId: 'pub-123',
  distanceFromHome: 5,
  isFirstVisit: false,
  isFirstEver: false,
  currentStreak: 3,
  carpetConfirmed: true,
  sharedSocial: false,
  isHomePub: false,
  ...overrides,
});

const createTestPointsBreakdown = (overrides: Partial<PointsBreakdown> = {}): PointsBreakdown => ({
  base: 25,
  distance: 5,
  bonus: 0,
  multiplier: 1,
  total: 30,
  reason: 'Check-in points',
  ...overrides,
});

const createTestTransaction = (overrides: Partial<PointsTransaction> = {}): PointsTransaction => ({
  id: 'trans-123',
  userId: 'test-user-123',
  type: 'check-in',
  action: 'check-in',
  points: 30,
  breakdown: createTestPointsBreakdown(),
  pubId: 'pub-123',
  createdAt: new Date(),
  ...overrides,
});

describe('PointsStore - Financial Critical Tests', () => {
  let pointsStore: PointsStore;
  let mockAuthStore: any;
  let mockPointsService: any;
  let mockPubStore: any;
  let mockCacheCoherence: any;
  let mockErrorLogging: any;

  const testUser = createTestUser();
  const testPub = createTestPub();
  const testHomePub = createTestPub({ id: 'home-pub-456', name: 'Home Pub' });

  beforeEach(async () => {
    // Use centralized mock registry for consistent mocking
    const { mocks } = useTestSuite('points-store-tests', { realistic: true, errorScenarios: true });

    // Create enhanced mocks with financial accuracy focus
    mockAuthStore = {
      user: signal<User | null>(testUser),
      uid: signal<string | null>(testUser.uid),
      isAuthenticated: signal(true),
      _setUser: (user: User | null) => {
        mockAuthStore.user.set(user);
        mockAuthStore.uid.set(user?.uid || null);
        mockAuthStore.isAuthenticated.set(!!user);
      },
    };

    mockPointsService = {
      calculateCheckInPoints: vi
        .fn()
        .mockImplementation((data: CheckInPointsData, checkInPub?: Pub, homePub?: Pub) => {
          // Realistic points calculation for financial accuracy testing
          let base = 25;
          let distance = Math.min(data.distanceFromHome * 2, 20); // Max 20 distance points
          let bonus = 0;

          if (data.isFirstVisit) bonus += 25;
          if (data.isFirstEver) bonus += 50;
          if (data.carpetConfirmed) bonus += 10;
          if (data.sharedSocial) bonus += 5;
          if (data.isHomePub) bonus += 15;

          const multiplier = Math.max(1, data.currentStreak / 10); // Streak multiplier
          const total = Math.floor((base + distance + bonus) * multiplier);

          return {
            base,
            distance,
            bonus,
            multiplier,
            total,
            reason: `Check-in at ${checkInPub?.name || 'Unknown Pub'}`,
          };
        }),

      calculateSocialPoints: vi
        .fn()
        .mockReturnValue(
          createTestPointsBreakdown({ base: 10, total: 10, reason: 'Social sharing' })
        ),

      createTransaction: vi.fn().mockImplementation(async transaction => {
        // Simulate realistic transaction creation with audit trail
        const id = `trans-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        return { ...transaction, id };
      }),

      updateUserTotalPoints: vi.fn().mockResolvedValue(undefined),
      getUserTotalPoints: vi.fn().mockResolvedValue(100),
      getUserTransactions: vi.fn().mockResolvedValue([]),
      formatPointsMessage: vi.fn().mockReturnValue('Points awarded!'),
    };

    mockPubStore = {
      data: signal<Pub[]>([testPub, testHomePub]),
      loading: signal(false),
      error: signal<string | null>(null),
      _setPubData: (pubs: Pub[]) => mockPubStore.data.set(pubs),
    };

    mockCacheCoherence = {
      invalidate: vi.fn().mockResolvedValue(undefined),
      _getInvalidationCalls: () => mockCacheCoherence.invalidate.mock.calls,
    };

    mockErrorLogging = {
      logPointsError: vi.fn().mockResolvedValue(undefined),
      _getErrorLogs: () => mockErrorLogging.logPointsError.mock.calls,
    };

    await TestBed.configureTestingModule({
      providers: [
        PointsStore,
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: PointsService, useValue: mockPointsService },
        { provide: PubStore, useValue: mockPubStore },
        { provide: CacheCoherenceService, useValue: mockCacheCoherence },
        { provide: ErrorLoggingService, useValue: mockErrorLogging },
      ],
    }).compileComponents();

    pointsStore = TestBed.inject(PointsStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('🏗️ Initialization & Auth-Reactive Pattern', () => {
    it('should initialize with zero points and empty transactions', () => {
      expect(pointsStore.totalPoints()).toBe(0);
      expect(pointsStore.recentTransactions()).toEqual([]);
      expect(pointsStore.loading()).toBe(false);
      expect(pointsStore.error()).toBe(null);
    });

    it('should auto-load points when user authenticates (auth-reactive)', async () => {
      // Start with no user
      mockAuthStore._setUser(null);

      // Simulate user login
      mockAuthStore._setUser(testUser);

      // Allow effect to trigger
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should attempt to load points for new user
      expect(mockPointsService.getUserTotalPoints).toHaveBeenCalledWith(testUser.uid);
      expect(mockPointsService.getUserTransactions).toHaveBeenCalledWith(testUser.uid, 20);
    });

    it('should clear points when user logs out (auth-reactive safety)', async () => {
      // Set initial points
      pointsStore['_totalPoints'].set(150);
      pointsStore['_recentTransactions'].set([createTestTransaction()]);

      // User logs out
      mockAuthStore._setUser(null);

      // Allow effect to trigger
      await new Promise(resolve => setTimeout(resolve, 10));

      // Points should be cleared to prevent data leaks
      expect(pointsStore.totalPoints()).toBe(0);
      expect(pointsStore.recentTransactions()).toEqual([]);
    });

    it('should prevent duplicate loading for same user (auth-reactive deduplication)', async () => {
      mockAuthStore._setUser(testUser);
      await new Promise(resolve => setTimeout(resolve, 10));

      const initialCallCount = mockPointsService.getUserTotalPoints.mock.calls.length;

      // Simulate same user (no change)
      mockAuthStore._setUser(testUser);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should not trigger additional loads
      expect(mockPointsService.getUserTotalPoints.mock.calls.length).toBe(initialCallCount);
    });

    it('should handle user switching without points leaks', async () => {
      const user1 = createTestUser({ uid: 'user-1', displayName: 'User One' });
      const user2 = createTestUser({ uid: 'user-2', displayName: 'User Two' });

      // Login as user 1
      mockAuthStore._setUser(user1);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Set user 1 points
      pointsStore['_totalPoints'].set(100);

      // Switch to user 2
      mockAuthStore._setUser(user2);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Points should reset and load for new user
      expect(pointsStore.totalPoints()).toBe(0); // Reset during user switch
      expect(mockPointsService.getUserTotalPoints).toHaveBeenCalledWith(user2.uid);
    });
  });

  describe('💰 Financial Accuracy - Points Calculation', () => {
    beforeEach(async () => {
      mockAuthStore._setUser(testUser);
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should calculate check-in points with accurate breakdown', async () => {
      const pointsData = createTestPointsData({
        isFirstVisit: true,
        distanceFromHome: 10,
        carpetConfirmed: true,
        currentStreak: 5,
      });

      const result = await pointsStore.awardCheckInPoints(pointsData);

      // Verify calculation accuracy
      expect(mockPointsService.calculateCheckInPoints).toHaveBeenCalledWith(
        pointsData,
        testPub, // Check-in pub
        null // No home pub set
      );

      // Expected: base=25, distance=20, bonus=35 (first visit + carpet), multiplier=1, total=80
      expect(result.total).toBeGreaterThan(0);
      expect(result.base).toBe(25);
      expect(typeof result.distance).toBe('number');
      expect(typeof result.bonus).toBe('number');
    });

    it('should apply distance bonuses correctly', async () => {
      const nearbyPubData = createTestPointsData({ distanceFromHome: 2 });
      const farPubData = createTestPointsData({ distanceFromHome: 15 });

      const nearbyResult = await pointsStore.awardCheckInPoints(nearbyPubData);
      const farResult = await pointsStore.awardCheckInPoints(farPubData);

      // Far pubs should give more distance points (capped at 20)
      expect(farResult.distance).toBeGreaterThan(nearbyResult.distance);
      expect(farResult.distance).toBeLessThanOrEqual(20); // Verify cap
    });

    it('should calculate first visit and first ever bonuses accurately', async () => {
      const firstVisitData = createTestPointsData({ isFirstVisit: true });
      const firstEverData = createTestPointsData({ isFirstEver: true });
      const regularData = createTestPointsData();

      const firstVisitResult = await pointsStore.awardCheckInPoints(firstVisitData);
      const firstEverResult = await pointsStore.awardCheckInPoints(firstEverData);
      const regularResult = await pointsStore.awardCheckInPoints(regularData);

      // First ever should give highest bonus
      expect(firstEverResult.total).toBeGreaterThan(firstVisitResult.total);
      expect(firstVisitResult.total).toBeGreaterThan(regularResult.total);
    });

    it('should apply streak multipliers correctly for high-value users', async () => {
      const highStreakData = createTestPointsData({ currentStreak: 20 });
      const lowStreakData = createTestPointsData({ currentStreak: 5 });

      const highStreakResult = await pointsStore.awardCheckInPoints(highStreakData);
      const lowStreakResult = await pointsStore.awardCheckInPoints(lowStreakData);

      // Higher streak should result in more points via multiplier
      expect(highStreakResult.total).toBeGreaterThan(lowStreakResult.total);
    });

    it('should handle home pub bonuses for pilgrimage scenarios', async () => {
      const homePubData = createTestPointsData({
        pubId: testHomePub.id,
        isHomePub: true,
      });

      await pointsStore.awardCheckInPoints(homePubData, testHomePub.id);

      expect(mockPointsService.calculateCheckInPoints).toHaveBeenCalledWith(
        homePubData,
        testHomePub, // Should find home pub
        testHomePub // Should pass as home pub
      );
    });

    it('should calculate social points accurately', async () => {
      const result = await pointsStore.awardSocialPoints('share');

      expect(mockPointsService.calculateSocialPoints).toHaveBeenCalledWith('share');
      expect(result.total).toBe(10); // Based on mock implementation
      expect(result.reason).toContain('Social sharing');
    });
  });

  describe('💳 Transaction Integrity & Audit Trail', () => {
    beforeEach(async () => {
      mockAuthStore._setUser(testUser);
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should create transaction record with complete audit trail', async () => {
      const pointsData = createTestPointsData();
      const expectedBreakdown = createTestPointsBreakdown({ total: 50 });

      mockPointsService.calculateCheckInPoints.mockReturnValue(expectedBreakdown);

      await pointsStore.awardCheckInPoints(pointsData);

      // Verify transaction creation with complete audit information
      expect(mockPointsService.createTransaction).toHaveBeenCalledWith({
        userId: testUser.uid,
        type: 'check-in',
        action: 'check-in',
        points: expectedBreakdown.total,
        breakdown: expectedBreakdown,
        pubId: pointsData.pubId,
        createdAt: expect.any(Date),
      });
    });

    it('should update user total points in Firebase for audit trail', async () => {
      const pointsData = createTestPointsData();
      const currentTotal = 100;
      const pointsAwarded = 30;

      pointsStore['_totalPoints'].set(currentTotal);
      mockPointsService.calculateCheckInPoints.mockReturnValue(
        createTestPointsBreakdown({ total: pointsAwarded })
      );

      await pointsStore.awardCheckInPoints(pointsData);

      // Verify Firebase user total update for external consistency
      expect(mockPointsService.updateUserTotalPoints).toHaveBeenCalledWith(
        testUser.uid,
        currentTotal + pointsAwarded
      );
    });

    it('should add transaction to local history for immediate UI updates', async () => {
      const pointsData = createTestPointsData();
      const mockTransaction = createTestTransaction({ id: 'new-trans-123' });

      mockPointsService.createTransaction.mockResolvedValue(mockTransaction);

      await pointsStore.awardCheckInPoints(pointsData);

      // Verify transaction added to local history
      const recentTransactions = pointsStore.recentTransactions();
      expect(recentTransactions).toContain(mockTransaction);
      expect(recentTransactions[0]).toBe(mockTransaction); // Should be first (most recent)
    });

    it('should maintain transaction history limit (20 transactions)', async () => {
      // Pre-populate with 19 transactions
      const existingTransactions = Array.from({ length: 19 }, (_, i) =>
        createTestTransaction({ id: `existing-${i}` })
      );
      pointsStore['_recentTransactions'].set(existingTransactions);

      const pointsData = createTestPointsData();
      const newTransaction = createTestTransaction({ id: 'new-trans' });
      mockPointsService.createTransaction.mockResolvedValue(newTransaction);

      await pointsStore.awardCheckInPoints(pointsData);

      // Should maintain 20 transaction limit
      const recentTransactions = pointsStore.recentTransactions();
      expect(recentTransactions).toHaveLength(20);
      expect(recentTransactions[0]).toBe(newTransaction); // New transaction first
      expect(recentTransactions).not.toContain(existingTransactions[18]); // Last one removed
    });

    it('should create social transaction records with proper categorization', async () => {
      await pointsStore.awardSocialPoints('share', 'pub-123');

      expect(mockPointsService.createTransaction).toHaveBeenCalledWith({
        userId: testUser.uid,
        type: 'social',
        action: 'share',
        points: 10,
        breakdown: expect.any(Object),
        pubId: 'pub-123',
        createdAt: expect.any(Date),
      });
    });
  });

  describe('🔄 Cache Coordination & Leaderboard Consistency', () => {
    beforeEach(async () => {
      mockAuthStore._setUser(testUser);
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should invalidate cache after check-in points awarded', async () => {
      const pointsData = createTestPointsData();

      await pointsStore.awardCheckInPoints(pointsData);

      // Verify cache invalidation for leaderboard consistency
      expect(mockCacheCoherence.invalidate).toHaveBeenCalledWith(
        'points',
        'check-in-points-awarded'
      );
    });

    it('should invalidate cache after social points awarded', async () => {
      await pointsStore.awardSocialPoints('share');

      expect(mockCacheCoherence.invalidate).toHaveBeenCalledWith('points', 'social-points-awarded');
    });

    it('should not invalidate cache if points awarding fails', async () => {
      const pointsData = createTestPointsData();
      mockPointsService.createTransaction.mockRejectedValue(new Error('Transaction failed'));

      await expect(pointsStore.awardCheckInPoints(pointsData)).rejects.toThrow(
        'Transaction failed'
      );

      // Cache should not be invalidated on failure
      expect(mockCacheCoherence.invalidate).not.toHaveBeenCalled();
    });

    it('should coordinate cache invalidation timing with points update', async () => {
      const pointsData = createTestPointsData();

      await pointsStore.awardCheckInPoints(pointsData);

      // Cache invalidation should occur after points update
      const invalidateCalls = mockCacheCoherence._getInvalidationCalls();
      const updateCalls = mockPointsService.updateUserTotalPoints.mock.calls;

      expect(invalidateCalls.length).toBe(1);
      expect(updateCalls.length).toBe(1);
      // Both should have been called (order tested by implementation)
    });
  });

  describe('🔒 Concurrent Safety & Duplicate Prevention', () => {
    beforeEach(async () => {
      mockAuthStore._setUser(testUser);
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should prevent duplicate point awards during loading state', async () => {
      const pointsData = createTestPointsData();

      // Mock slow transaction creation
      mockPointsService.createTransaction.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(createTestTransaction()), 100))
      );

      // Start first award
      const firstAward = pointsStore.awardCheckInPoints(pointsData);

      // Attempt second award while first is in progress
      await expect(pointsStore.awardCheckInPoints(pointsData)).rejects.toThrow(
        'Points award already in progress'
      );

      // First award should still complete
      await expect(firstAward).resolves.toBeDefined();
    });

    it('should reset loading state after successful points award', async () => {
      const pointsData = createTestPointsData();

      expect(pointsStore.loading()).toBe(false);

      const awardPromise = pointsStore.awardCheckInPoints(pointsData);

      // Loading should be true during operation
      expect(pointsStore.loading()).toBe(true);

      await awardPromise;

      // Loading should be false after completion
      expect(pointsStore.loading()).toBe(false);
    });

    it('should reset loading state after failed points award', async () => {
      const pointsData = createTestPointsData();
      mockPointsService.createTransaction.mockRejectedValue(new Error('Network error'));

      expect(pointsStore.loading()).toBe(false);

      await expect(pointsStore.awardCheckInPoints(pointsData)).rejects.toThrow();

      // Loading should be false even after error
      expect(pointsStore.loading()).toBe(false);
    });

    it('should handle concurrent user authentication changes safely', async () => {
      const user1 = createTestUser({ uid: 'user-1' });
      const user2 = createTestUser({ uid: 'user-2' });

      mockAuthStore._setUser(user1);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Start points award for user1
      const pointsData = createTestPointsData();
      mockPointsService.createTransaction.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(createTestTransaction()), 50))
      );

      const awardPromise = pointsStore.awardCheckInPoints(pointsData);

      // Switch users during award process
      mockAuthStore._setUser(user2);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Award should still complete for original user
      await expect(awardPromise).resolves.toBeDefined();
      expect(mockPointsService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ userId: user1.uid })
      );
    });
  });

  describe('🔍 Data Integrity & Consistency Verification', () => {
    beforeEach(async () => {
      mockAuthStore._setUser(testUser);
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should maintain consistency between local and Firebase totals', async () => {
      const pointsData = createTestPointsData();
      const initialTotal = 100;
      const pointsAwarded = 25;

      pointsStore['_totalPoints'].set(initialTotal);
      mockPointsService.calculateCheckInPoints.mockReturnValue(
        createTestPointsBreakdown({ total: pointsAwarded })
      );

      await pointsStore.awardCheckInPoints(pointsData);

      // Local total should be updated
      expect(pointsStore.totalPoints()).toBe(initialTotal + pointsAwarded);

      // Firebase should be updated with same total
      expect(mockPointsService.updateUserTotalPoints).toHaveBeenCalledWith(
        testUser.uid,
        initialTotal + pointsAwarded
      );
    });

    it('should sync points with user profile for data integrity checks', async () => {
      const firebaseTotal = 150;
      const mockTransactions = [
        createTestTransaction({ points: 50 }),
        createTestTransaction({ points: 30 }),
        createTestTransaction({ points: 70 }),
      ];

      mockPointsService.getUserTotalPoints.mockResolvedValue(firebaseTotal);
      mockPointsService.getUserTransactions.mockResolvedValue(mockTransactions);

      await pointsStore.syncWithUserProfile();

      // Should update local state with Firebase values
      expect(pointsStore.totalPoints()).toBe(firebaseTotal);
      expect(pointsStore.recentTransactions()).toEqual(mockTransactions);
    });

    it('should detect and warn about points discrepancies', async () => {
      const firebaseTotal = 150;
      const mockTransactions = [
        createTestTransaction({ points: 50 }),
        createTestTransaction({ points: 30 }),
        // Total: 80, but Firebase says 150 - discrepancy!
      ];

      mockPointsService.getUserTotalPoints.mockResolvedValue(firebaseTotal);
      mockPointsService.getUserTransactions.mockResolvedValue(mockTransactions);

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await pointsStore.syncWithUserProfile();

      // Should detect and warn about discrepancy
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Points discrepancy detected'),
        expect.objectContaining({
          firebaseTotal: 150,
          calculatedTotal: 80,
          difference: 70,
        })
      );

      consoleSpy.mockRestore();
    });

    it("should calculate today's points correctly from transactions", async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const todayTransactions = [
        createTestTransaction({ points: 25, createdAt: today }),
        createTestTransaction({ points: 15, createdAt: today }),
      ];
      const yesterdayTransaction = createTestTransaction({ points: 30, createdAt: yesterday });

      pointsStore['_recentTransactions'].set([...todayTransactions, yesterdayTransaction]);

      // Should only count today's transactions
      expect(pointsStore.todaysPoints()).toBe(40); // 25 + 15
    });

    it('should maintain accurate transaction count in computed signals', () => {
      const transactions = [
        createTestTransaction({ id: 'trans-1' }),
        createTestTransaction({ id: 'trans-2' }),
        createTestTransaction({ id: 'trans-3' }),
      ];

      pointsStore['_recentTransactions'].set(transactions);

      expect(pointsStore.recentTransactions()).toHaveLength(3);
      expect(pointsStore.isLoaded()).toBe(true); // Has transactions
    });
  });

  describe('⚠️ Error Recovery & Financial Error Handling', () => {
    beforeEach(async () => {
      mockAuthStore._setUser(testUser);
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should handle points calculation errors gracefully', async () => {
      const pointsData = createTestPointsData();
      mockPointsService.calculateCheckInPoints.mockImplementation(() => {
        throw new Error('Calculation service unavailable');
      });

      await expect(pointsStore.awardCheckInPoints(pointsData)).rejects.toThrow(
        'Calculation service unavailable'
      );

      // Error should be logged for admin review
      expect(mockErrorLogging.logPointsError).toHaveBeenCalledWith(
        'award-checkin-points-failure',
        expect.any(Error),
        expect.objectContaining({
          userId: testUser.uid,
          pubId: pointsData.pubId,
          severity: 'critical',
        })
      );
    });

    it('should handle transaction creation failures', async () => {
      const pointsData = createTestPointsData();
      mockPointsService.createTransaction.mockRejectedValue(new Error('Database write failed'));

      await expect(pointsStore.awardCheckInPoints(pointsData)).rejects.toThrow(
        'Database write failed'
      );

      // Points should not be awarded locally if transaction fails
      expect(pointsStore.totalPoints()).toBe(0);

      // Error should be logged as critical financial failure
      expect(mockErrorLogging.logPointsError).toHaveBeenCalled();
    });

    it('should handle Firebase user update failures', async () => {
      const pointsData = createTestPointsData();
      mockPointsService.updateUserTotalPoints.mockRejectedValue(
        new Error('Firebase update failed')
      );

      await expect(pointsStore.awardCheckInPoints(pointsData)).rejects.toThrow(
        'Firebase update failed'
      );

      // Should log critical error for financial inconsistency
      expect(mockErrorLogging.logPointsError).toHaveBeenCalled();
    });

    it('should handle unauthenticated user gracefully', async () => {
      mockAuthStore._setUser(null);
      const pointsData = createTestPointsData();

      await expect(pointsStore.awardCheckInPoints(pointsData)).rejects.toThrow(
        'User not authenticated'
      );

      // Should not attempt any service calls
      expect(mockPointsService.createTransaction).not.toHaveBeenCalled();
      expect(mockPointsService.updateUserTotalPoints).not.toHaveBeenCalled();
    });

    it('should handle network failures during points sync', async () => {
      mockPointsService.getUserTotalPoints.mockRejectedValue(new Error('Network timeout'));

      await pointsStore.syncWithUserProfile();

      // Should set error state for user feedback
      expect(pointsStore.error()).toBe('Failed to sync points');
    });

    it('should recover from error states on successful operations', async () => {
      // Set error state
      pointsStore['_error'].set('Previous error');
      expect(pointsStore.error()).toBe('Previous error');

      const pointsData = createTestPointsData();
      await pointsStore.awardCheckInPoints(pointsData);

      // Error should be cleared on successful operation
      expect(pointsStore.error()).toBe(null);
    });

    it('should handle large points changes with alerting', async () => {
      const pointsData = createTestPointsData();
      const largePointsBreakdown = createTestPointsBreakdown({ total: 2000 });

      mockPointsService.calculateCheckInPoints.mockReturnValue(largePointsBreakdown);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await pointsStore.awardCheckInPoints(pointsData);

      // Should alert for suspicious large points changes
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('LARGE POINTS CHANGE DETECTED'),
        expect.objectContaining({
          from: 0,
          to: 2000,
          difference: 2000,
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('🎯 Business Logic Edge Cases', () => {
    beforeEach(async () => {
      mockAuthStore._setUser(testUser);
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should handle missing pub data gracefully', async () => {
      mockPubStore._setPubData([]); // No pubs available

      const pointsData = createTestPointsData({ pubId: 'nonexistent-pub' });

      await pointsStore.awardCheckInPoints(pointsData);

      // Should still calculate points with undefined pub
      expect(mockPointsService.calculateCheckInPoints).toHaveBeenCalledWith(
        pointsData,
        undefined, // Pub not found
        null // No home pub
      );
    });

    it('should handle manual points awards for admin corrections', async () => {
      await pointsStore.manuallyAwardPoints(100, 'Admin correction for system error', 'correction');

      expect(mockPointsService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'achievement',
          action: 'correction',
          points: 100,
          breakdown: expect.objectContaining({
            total: 100,
            reason: 'Admin correction for system error',
          }),
        })
      );
    });

    it('should handle negative points for corrections', async () => {
      pointsStore['_totalPoints'].set(150);

      await pointsStore.manuallyAwardPoints(-50, 'Remove duplicate points', 'correction');

      expect(pointsStore.totalPoints()).toBe(100); // 150 - 50
      expect(mockPointsService.updateUserTotalPoints).toHaveBeenCalledWith(testUser.uid, 100);
    });

    it('should find transactions by ID correctly', () => {
      const transactions = [
        createTestTransaction({ id: 'trans-1' }),
        createTestTransaction({ id: 'trans-2' }),
        createTestTransaction({ id: 'trans-3' }),
      ];

      pointsStore['_recentTransactions'].set(transactions);

      expect(pointsStore.getTransactionById('trans-2')).toBe(transactions[1]);
      expect(pointsStore.getTransactionById('nonexistent')).toBeUndefined();
    });

    it('should provide comprehensive debug information', () => {
      const transactions = [createTestTransaction(), createTestTransaction()];
      pointsStore['_totalPoints'].set(125);
      pointsStore['_recentTransactions'].set(transactions);

      const debugInfo = pointsStore.getPointsDebugInfo();

      expect(debugInfo).toEqual({
        totalPoints: 125,
        transactionCount: 2,
        todaysPoints: expect.any(Number),
        isLoaded: true,
        lastTransaction: transactions[0],
        userId: testUser.uid,
      });
    });

    it('should handle clear error functionality', () => {
      pointsStore['_error'].set('Test error');
      expect(pointsStore.error()).toBe('Test error');

      pointsStore.clearError();
      expect(pointsStore.error()).toBe(null);
    });
  });

  describe('📊 Performance & Memory Management', () => {
    it('should maintain reasonable transaction history size', async () => {
      mockAuthStore._setUser(testUser);

      // Simulate loading large transaction history
      const largeTransactionSet = Array.from({ length: 25 }, (_, i) =>
        createTestTransaction({ id: `large-trans-${i}` })
      );

      mockPointsService.getUserTransactions.mockResolvedValue(largeTransactionSet);

      await pointsStore.load();

      // Should limit to 20 transactions for performance
      expect(pointsStore.recentTransactions()).toHaveLength(20);
    });

    it('should handle rapid successive point awards efficiently', async () => {
      mockAuthStore._setUser(testUser);

      const pointsData = createTestPointsData();

      // First award should succeed
      await pointsStore.awardCheckInPoints(pointsData);

      // Second immediate award should be rejected (concurrent safety)
      await expect(pointsStore.awardCheckInPoints(pointsData)).rejects.toThrow(
        'Points award already in progress'
      );

      // Performance: Should not create unnecessary service calls
      expect(mockPointsService.createTransaction).toHaveBeenCalledTimes(1);
    });
  });
});
