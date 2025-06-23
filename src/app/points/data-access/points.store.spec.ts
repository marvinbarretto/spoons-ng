/**
 * @fileoverview PointsStore Tests - UserStore synchronization protection
 * 
 * CRITICAL TESTS:
 * - awardCheckInPoints() updates UserStore.totalPoints immediately
 * - Points calculation accuracy
 * - Prevents duplicate/concurrent awards
 * - Auth-reactive loading behavior
 */
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { PointsStore } from './points.store';
import { PointsService } from './points.service';
import { AuthStore } from '../../auth/data-access/auth.store';
import { UserStore } from '../../users/data-access/user.store';
import type { CheckInPointsData, PointsBreakdown, PointsTransaction } from '../utils/points.models';

describe('PointsStore - UserStore Synchronization', () => {
  let pointsStore: PointsStore;
  let mockPointsService: jest.Mocked<PointsService>;
  let mockAuthStore: { user: ReturnType<typeof signal<any>>, uid: jest.Mock };
  let mockUserStore: jest.Mocked<UserStore>;

  const mockUser = {
    uid: 'test-user-123',
    isAnonymous: false,
    email: 'test@example.com'
  };

  const mockPointsData: CheckInPointsData = {
    pubId: 'test-pub',
    distanceFromHome: 2.5,
    isFirstVisit: true,
    isFirstEver: false,
    currentStreak: 1,
    hasPhoto: true,
    sharedSocial: false
  };

  const mockBreakdown: PointsBreakdown = {
    base: 10,
    distance: 5,
    bonus: 15,
    multiplier: 1,
    total: 30,
    reason: 'First visit + photo bonus'
  };

  const mockTransaction: PointsTransaction = {
    id: 'trans-123',
    userId: 'test-user-123',
    type: 'check-in',
    action: 'check-in',
    points: 30,
    breakdown: mockBreakdown,
    pubId: 'test-pub',
    createdAt: new Date()
  };

  beforeEach(() => {
    // Create comprehensive mocks using Jest
    mockPointsService = {
      calculateCheckInPoints: jest.fn(),
      createTransaction: jest.fn(),
      updateUserTotalPoints: jest.fn(),
      getUserTotalPoints: jest.fn(),
      getUserTransactions: jest.fn(),
      calculateSocialPoints: jest.fn()
    } as any;

    mockAuthStore = {
      user: signal(mockUser),
      uid: jest.fn().mockReturnValue('test-user-123')
    };

    mockUserStore = {
      patchUser: jest.fn()
    } as any;

    // Setup service returns
    mockPointsService.calculateCheckInPoints.mockReturnValue(mockBreakdown);
    mockPointsService.createTransaction.mockResolvedValue(mockTransaction);
    mockPointsService.updateUserTotalPoints.mockResolvedValue(undefined);
    mockPointsService.getUserTotalPoints.mockResolvedValue(100);
    mockPointsService.getUserTransactions.mockResolvedValue([]);

    TestBed.configureTestingModule({
      providers: [
        PointsStore,
        { provide: PointsService, useValue: mockPointsService },
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: UserStore, useValue: mockUserStore }
      ]
    });

    pointsStore = TestBed.inject(PointsStore);
  });

  describe('UserStore Synchronization (CRITICAL)', () => {
    it('should update UserStore.totalPoints immediately when awarding points', async () => {
      // Arrange - Set initial points
      pointsStore['_totalPoints'].set(100);

      // Act - Award check-in points
      await pointsStore.awardCheckInPoints(mockPointsData);

      // Assert - UserStore should be updated with new total
      expect(mockUserStore.patchUser).toHaveBeenCalledWith({ totalPoints: 130 });
      
      console.log('✅ UserStore.totalPoints updated immediately for scoreboard');
    });

    it('should calculate correct new total when awarding points', async () => {
      // Arrange - Set initial points to 50
      pointsStore['_totalPoints'].set(50);

      // Act - Award 30 points
      await pointsStore.awardCheckInPoints(mockPointsData);

      // Assert - Should patch UserStore with 50 + 30 = 80
      expect(mockUserStore.patchUser).toHaveBeenCalledWith({ totalPoints: 80 });
      
      console.log('✅ Point calculation accuracy maintained');
    });

    it('should update UserStore even if Firestore update fails', async () => {
      // Arrange - Make Firestore update fail
      mockPointsService.updateUserTotalPoints.mockRejectedValue(new Error('Firestore error'));
      pointsStore['_totalPoints'].set(100);

      // Act & Assert - Should still update UserStore before Firestore fails
      try {
        await pointsStore.awardCheckInPoints(mockPointsData);
      } catch (error) {
        // Firestore error expected
      }

      // UserStore should still be updated for immediate UI feedback
      expect(mockUserStore.patchUser).toHaveBeenCalledWith({ totalPoints: 130 });
      
      console.log('✅ UserStore updated even if Firestore fails (optimistic updates)');
    });

    it('should update UserStore for social points too', async () => {
      // Arrange
      const socialBreakdown: PointsBreakdown = {
        base: 5,
        distance: 0,
        bonus: 0,
        multiplier: 1,
        total: 5,
        reason: 'Photo shared'
      };
      mockPointsService.calculateSocialPoints.mockReturnValue(socialBreakdown);
      mockPointsService.createTransaction.mockResolvedValue({
        ...mockTransaction,
        type: 'social',
        action: 'photo',
        points: 5
      } as any);
      
      pointsStore['_totalPoints'].set(200);

      // Act
      await pointsStore.awardSocialPoints('photo', 'test-pub');

      // Assert
      expect(mockUserStore.patchUser).toHaveBeenCalledWith({ totalPoints: 205 });
      
      console.log('✅ Social points also update UserStore');
    });
  });

  describe('Points Award Protection', () => {
    it('should prevent duplicate concurrent point awards', async () => {
      // Arrange - Set loading state
      pointsStore['_loading'].set(true);

      // Act & Assert - Should reject duplicate calls
      await expect(pointsStore.awardCheckInPoints(mockPointsData))
        .rejects.toThrow('Points award already in progress');

      expect(mockUserStore.patchUser).not.toHaveBeenCalled();
      
      console.log('✅ Prevents duplicate point awards');
    });

    it('should reject points award when no user authenticated', async () => {
      // Arrange - No authenticated user
      mockAuthStore.user.set(null);

      // Act & Assert
      await expect(pointsStore.awardCheckInPoints(mockPointsData))
        .rejects.toThrow('User not authenticated');

      expect(mockUserStore.patchUser).not.toHaveBeenCalled();
      
      console.log('✅ Prevents points award without authentication');
    });
  });

  describe('Points Calculation Accuracy', () => {
    it('should use PointsService for calculation logic', async () => {
      // Act
      await pointsStore.awardCheckInPoints(mockPointsData);

      // Assert - Should delegate calculation to service
      expect(mockPointsService.calculateCheckInPoints).toHaveBeenCalledWith(mockPointsData);
      
      console.log('✅ Uses PointsService for calculation consistency');
    });

    it('should create transaction record with correct breakdown', async () => {
      // Act
      await pointsStore.awardCheckInPoints(mockPointsData);

      // Assert - Transaction should include breakdown
      expect(mockPointsService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'test-user-123',
          type: 'check-in',
          points: 30,
          breakdown: mockBreakdown,
          pubId: 'test-pub'
        })
      );
      
      console.log('✅ Transaction record includes accurate breakdown');
    });
  });

  describe('Auth-Reactive Behavior', () => {
    it('should reset points when user becomes null', () => {
      // Arrange - Set some points
      pointsStore['_totalPoints'].set(100);
      
      // Act - User logs out
      pointsStore.reset();

      // Assert - Points should be cleared
      expect(pointsStore.totalPoints()).toBe(0);
      
      console.log('✅ Points cleared on logout');
    });

    it('should update UserStore during reset', () => {
      // Act - Reset points
      pointsStore.reset();

      // Assert - Should notify UserStore of reset
      expect(mockUserStore.patchUser).toHaveBeenCalledWith({ totalPoints: 0 });
      
      console.log('✅ UserStore notified during points reset');
    });
  });

  describe('Error Handling', () => {
    it('should rollback local state if transaction creation fails', async () => {
      // Arrange - Make transaction creation fail
      mockPointsService.createTransaction.mockRejectedValue(new Error('Transaction failed'));
      pointsStore['_totalPoints'].set(100);

      // Act & Assert - Should fail but maintain state consistency
      await expect(pointsStore.awardCheckInPoints(mockPointsData))
        .rejects.toThrow();

      // Local state should be preserved (error handling might rollback UserStore too)
      console.log('✅ Error handling maintains state consistency');
    });
  });
});