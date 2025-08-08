/**
 * CheckInStore Unit Tests - Core Business Logic Focus
 * 
 * 🎯 TESTING STRATEGY:
 * - Focus on business-critical logic that affects user points, badges, and data consistency
 * - Test auth-reactive patterns that prevent data leaks between users
 * - Validate complex check-in orchestration flow with error handling
 * - Ensure cache coherence triggers work correctly for leaderboard updates
 * 
 * 🚫 NOT TESTING:
 * - Framework functionality (Angular signals, dependency injection)
 * - Simple getters/setters without business logic
 * - Console.log statements and debugging code
 * - Template bindings or UI concerns
 */

import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { signal, computed } from '@angular/core';
import { Timestamp } from 'firebase/firestore';

import { CheckInStore } from './check-in.store';
import { CheckInService } from './check-in.service';
import { AuthStore } from '@auth/data-access/auth.store';
import { UserStore } from '@users/data-access/user.store';
import { PointsStore } from '@points/data-access/points.store';
import { PubStore } from '@pubs/data-access/pub.store';
import { LandlordStore } from '@landlord/data-access/landlord.store';
import { BadgeAwardService } from '@badges/data-access/badge-award.service';
import { CarpetStrategyService } from '@carpets/data-access/carpet-strategy.service';
import { CacheCoherenceService } from '@shared/data-access/cache-coherence.service';
import { ErrorLoggingService } from '@shared/data-access/error-logging.service';
import { OverlayService, CameraService, TelegramNotificationService, ToastService } from '@fourfold/angular-foundation';
import { createTestUser, createTestCheckIn, createTestPub } from '@shared/testing/test-data';
import type { CheckIn } from '../utils/check-in.models';
import type { User } from '@users/utils/user.model';
import type { Pub } from '@pubs/utils/pub.models';

describe('CheckInStore - Business Critical Tests', () => {
  let store: CheckInStore;
  let mockAuthStore: any;
  let mockUserStore: any;
  let mockPointsStore: any;
  let mockPubStore: any;
  let mockLandlordStore: any;
  let mockBadgeAwardService: any;
  let mockCheckInService: any;
  let mockCarpetStrategy: any;
  let mockCacheCoherence: any;
  let mockErrorLogging: any;
  let mockOverlayService: any;
  let mockCameraService: any;
  let mockTelegramService: any;
  let mockToastService: any;

  // Test users for auth scenarios
  const testUser1: User = createTestUser({
    uid: 'user-1',
    displayName: 'Test User 1',
    email: 'user1@test.com',
    homePubId: 'home-pub-1',
    manuallyAddedPubIds: ['manual-pub-1'],
    realUser: true
  });

  const testUser2: User = createTestUser({
    uid: 'user-2', 
    displayName: 'Test User 2',
    email: 'user2@test.com',
    homePubId: 'home-pub-2',
    realUser: false
  });

  // Test pubs
  const testPubs: Pub[] = [
    createTestPub({ id: 'pub-1', name: 'Test Pub 1', location: { latitude: 51.5074, longitude: -0.1278 } }),
    createTestPub({ id: 'pub-2', name: 'Test Pub 2', location: { latitude: 51.5075, longitude: -0.1279 } }),
    createTestPub({ id: 'home-pub-1', name: 'Home Pub', location: { latitude: 51.5076, longitude: -0.1280 } }),
    createTestPub({ id: 'manual-pub-1', name: 'Manual Pub', location: { latitude: 51.5077, longitude: -0.1281 } })
  ];

  // Test check-ins
  const testCheckIns: CheckIn[] = [
    createTestCheckIn({
      id: 'checkin-1',
      userId: 'user-1',
      pubId: 'pub-1',
      pointsEarned: 25,
      pointsBreakdown: { base: 25, distance: 0, bonus: 0, multiplier: 1, total: 25, reason: 'Basic check-in' },
      timestamp: Timestamp.fromDate(new Date('2024-01-01T12:00:00Z')),
      dateKey: '2024-01-01'
    }),
    createTestCheckIn({
      id: 'checkin-2', 
      userId: 'user-1',
      pubId: 'pub-2',
      pointsEarned: 35,
      pointsBreakdown: { base: 25, distance: 10, bonus: 0, multiplier: 1, total: 35, reason: 'Distance bonus' },
      timestamp: Timestamp.fromDate(new Date('2024-01-02T14:00:00Z')),
      dateKey: '2024-01-02'
    })
  ];

  beforeEach(async () => {
    // Create comprehensive mocks
    mockAuthStore = {
      user: signal(testUser1),
      uid: signal(testUser1.uid),
      isAuthenticated: signal(true),
      _setUser: function(user: any) {
        this.user.set(user);
        this.uid.set(user?.uid || null);
        this.isAuthenticated.set(!!user);
      }
    };

    mockUserStore = {
      user: signal(testUser1),
      currentUser: vi.fn().mockReturnValue(testUser1),
      updateProfile: vi.fn().mockResolvedValue(undefined),
      _setCurrentUser: function(user: any) { this.user.set(user); }
    };

    mockPointsStore = {
      awardCheckInPoints: vi.fn().mockResolvedValue({
        base: 25, distance: 0, bonus: 0, total: 25, reason: 'Standard check-in'
      })
    };

    mockPubStore = {
      data: signal(testPubs),
      get: vi.fn((id: string) => testPubs.find(p => p.id === id)),
      loadOnce: vi.fn().mockResolvedValue(undefined),
      _setData: function(pubs: any[]) { this.data.set(pubs); }
    };

    mockLandlordStore = {
      tryAwardLandlordForCheckin: vi.fn().mockResolvedValue({ isNewLandlord: false })
    };

    mockBadgeAwardService = {
      evaluateAndAwardBadges: vi.fn().mockResolvedValue([])
    };

    mockCheckInService = {
      canCheckIn: vi.fn().mockResolvedValue({ allowed: true }),
      createCheckin: vi.fn().mockResolvedValue('new-checkin-id'),
      loadUserCheckins: vi.fn().mockResolvedValue(testCheckIns),
      getAllCheckIns: vi.fn().mockResolvedValue([]),
      isFirstEverCheckIn: vi.fn().mockResolvedValue(false),
      getUserTotalCheckinCount: vi.fn().mockResolvedValue(1)
    };

    mockCarpetStrategy = {
      processCarpetCapture: vi.fn().mockResolvedValue({ llmConfirmed: true, localKey: 'carpet-key' })
    };

    mockCacheCoherence = {
      invalidate: vi.fn()
    };

    mockErrorLogging = {
      logCheckInError: vi.fn().mockResolvedValue(undefined)
    };

    mockOverlayService = {
      show: vi.fn()
    };

    mockCameraService = {
      releaseCamera: vi.fn()
    };

    mockTelegramService = {
      sendMessage: vi.fn().mockResolvedValue(undefined),
      escapeMarkdown: vi.fn((text: string) => text)
    };

    mockToastService = {
      error: vi.fn(),
      success: vi.fn()
    };

    await TestBed.configureTestingModule({
      providers: [
        CheckInStore,
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: UserStore, useValue: mockUserStore },
        { provide: PointsStore, useValue: mockPointsStore },
        { provide: PubStore, useValue: mockPubStore },
        { provide: LandlordStore, useValue: mockLandlordStore },
        { provide: BadgeAwardService, useValue: mockBadgeAwardService },
        { provide: CheckInService, useValue: mockCheckInService },
        { provide: CarpetStrategyService, useValue: mockCarpetStrategy },
        { provide: CacheCoherenceService, useValue: mockCacheCoherence },
        { provide: ErrorLoggingService, useValue: mockErrorLogging },
        { provide: OverlayService, useValue: mockOverlayService },
        { provide: CameraService, useValue: mockCameraService },
        { provide: TelegramNotificationService, useValue: mockTelegramService },
        { provide: ToastService, useValue: mockToastService }
      ]
    }).compileComponents();

    store = TestBed.inject(CheckInStore);
    
    // Setup initial state by directly setting data
    store['_data'].set(testCheckIns);
    store['hasLoaded'] = true;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('🏗️ Store Initialization & Architecture', () => {
    it('should initialize as BaseStore with correct signals', () => {
      expect(store).toBeDefined();
      expect(store.data).toBeDefined();
      expect(store.loading).toBeDefined();
      expect(store.error).toBeDefined();
      expect(store.checkins).toBeDefined(); // Alias for data
    });

    it('should expose computed signals for business logic', () => {
      expect(store.userCheckins).toBeDefined();
      expect(store.checkedInPubIds).toBeDefined();
      expect(store.totalPubsCount).toBeDefined();
      expect(store.totalCheckins).toBeDefined();
      expect(store.todayCheckins).toBeDefined();
    });
  });

  describe('🔐 CRITICAL: Auth-Reactive Pattern - Data Security', () => {
    // Set up a consistent, logged-in state before each auth-related test
    beforeEach(() => {
      mockAuthStore._setUser(testUser1);
      store['_data'].set(testCheckIns); // Pre-load data for user-1
      store['hasLoaded'] = true;
      mockCheckInService.loadUserCheckins.mockClear(); // Clear mocks for accurate call counting
      TestBed.flushEffects(); // Ensure initial state is stable
    });

    it('should load data automatically on first-time login', () => {
      // GIVEN: A logged-out initial state
      store['_data'].set([]);
      store['hasLoaded'] = false;
      mockAuthStore._setUser(null);
      TestBed.flushEffects();

      // WHEN: A user logs in
      mockAuthStore._setUser(testUser1);
      TestBed.flushEffects();

      // THEN: Data should be loaded for that user
      expect(mockCheckInService.loadUserCheckins).toHaveBeenCalledWith('user-1');
    });

    it('should clear data when user logs out', () => {
      // GIVEN: The store has data for the logged-in user
      expect(store.totalCheckins()).toBe(2);

      // WHEN: The user logs out
      mockAuthStore._setUser(null);
      TestBed.flushEffects();

      // THEN: The store should be reset
      expect(store.totalCheckins()).toBe(0);
      expect(store.data()).toEqual([]);
      expect(store.hasLoaded).toBe(false);
    });

    it('should reset and reload data when switching between users', async () => {
      // GIVEN: The store is loaded with user-1's data and a mock for user-2's data is prepared
      const user2Checkins = [
        createTestCheckIn({
          id: 'user2-checkin',
          userId: 'user-2',
          timestamp: Timestamp.fromDate(new Date()), // Ensure a valid Firestore Timestamp
        }),
      ];
      mockCheckInService.loadUserCheckins.mockResolvedValue(user2Checkins);
      expect(store.data()).toEqual(testCheckIns);

      // WHEN: The authenticated user switches to user-2
      mockAuthStore._setUser(testUser2);
      TestBed.flushEffects();

      // THEN: The store should have loaded user-2's data
      // The effect runs async, so we wait for microtasks to complete
      await Promise.resolve();
      await Promise.resolve(); // Second resolve to be safe

      expect(mockCheckInService.loadUserCheckins).toHaveBeenCalledWith('user-2');
      expect(store.data()).toEqual(user2Checkins);
      expect(store.hasLoaded).toBe(true);
    });

    it('should NOT reload data if user object changes but UID is the same', () => {
      // GIVEN: Data is loaded and no calls have been made yet
      expect(mockCheckInService.loadUserCheckins).not.toHaveBeenCalled();

      // WHEN: The user object is updated, but the UID remains the same
      mockAuthStore._setUser({ ...testUser1, displayName: 'A New Name' });
      TestBed.flushEffects();

      // THEN: The BaseStore effect should see the UID is unchanged and not trigger a reload
      expect(mockCheckInService.loadUserCheckins).not.toHaveBeenCalled();
    });
  });

  describe('🎯 CRITICAL: Check-in Flow - Business Logic', () => {
    beforeEach(() => {
      // Setup successful validation and service responses
      mockCheckInService.canCheckIn.mockResolvedValue({ allowed: true });
      mockCheckInService.createCheckin.mockResolvedValue('new-checkin-id');
      mockPointsStore.awardCheckInPoints.mockResolvedValue({
        base: 25,
        distance: 0,
        bonus: 0,
        total: 25,
        reason: 'Standard check-in'
      });
      mockBadgeAwardService.evaluateAndAwardBadges.mockResolvedValue([]);
      mockLandlordStore.tryAwardLandlordForCheckin.mockResolvedValue({ isNewLandlord: false });
      mockUserStore.updateProfile.mockResolvedValue(undefined);
      mockCacheCoherence.invalidate.mockReturnValue(undefined);
    });

    it('should successfully complete check-in with all integrations', async () => {
      // Given: Valid check-in scenario
      const pubId = 'pub-1';
      const initialCheckinCount = store.totalCheckins();
      
      // When: Perform check-in
      await store.checkinToPub(pubId);
      
      // Then: Should coordinate all services properly
      expect(mockCheckInService.canCheckIn).toHaveBeenCalledWith(pubId);
      expect(mockPointsStore.awardCheckInPoints).toHaveBeenCalled();
      expect(mockBadgeAwardService.evaluateAndAwardBadges).toHaveBeenCalled();
      expect(mockLandlordStore.tryAwardLandlordForCheckin).toHaveBeenCalled();
      expect(mockCheckInService.createCheckin).toHaveBeenCalled();
      
      // Should add to local store
      expect(store.totalCheckins()).toBe(initialCheckinCount + 1);
      
      // Should trigger cache invalidation for leaderboards
      expect(mockCacheCoherence.invalidate).toHaveBeenCalledWith('checkins', 'new-check-in-created');
      
      // Should update user profile
      expect(mockUserStore.updateProfile).toHaveBeenCalled();
    });

    it('should handle validation failures gracefully', async () => {
      // Given: Check-in validation will fail
      const validationError = 'Already checked in today';
      mockCheckInService.canCheckIn.mockResolvedValue({ 
        allowed: false, 
        reason: validationError 
      });
      
      // When/Then: Should throw validation error
      await expect(store.checkinToPub('pub-1')).rejects.toThrow(validationError);
      
      // Should not create check-in or trigger side effects
      expect(mockCheckInService.createCheckin).not.toHaveBeenCalled();
      expect(mockCacheCoherence.invalidate).not.toHaveBeenCalled();
    });

    it('should calculate and save complete points data', async () => {
      // Given: Points calculation returns detailed breakdown
      const expectedPoints = {
        base: 25,
        distance: 15,
        bonus: 10,
        total: 50,
        reason: 'Distance + carpet bonus'
      };
      mockPointsStore.awardCheckInPoints.mockResolvedValue(expectedPoints);
      
      // When: Perform check-in
      await store.checkinToPub('pub-1');
      
      // Then: Should save complete points data
      const createArgs = mockCheckInService.createCheckin.mock.calls[0];
      const [pubId, carpetKey, completeData] = createArgs;
      
      expect(completeData.pointsEarned).toBe(50);
      expect(completeData.pointsBreakdown).toEqual(expectedPoints);
    });

    it('should handle badge evaluation and save badge name', async () => {
      // Given: Badge evaluation returns new badge
      const mockBadge = {
        badge: { name: 'Explorer' },
        earnedBadge: { badgeId: 'explorer-badge' }
      };
      mockBadgeAwardService.evaluateAndAwardBadges.mockResolvedValue([mockBadge]);
      
      // When: Perform check-in
      await store.checkinToPub('pub-1');
      
      // Then: Should save badge name to check-in
      const createArgs = mockCheckInService.createCheckin.mock.calls[0];
      const [pubId, carpetKey, completeData] = createArgs;
      
      expect(completeData.badgeName).toBe('Explorer');
    });

    it('should handle landlord status correctly', async () => {
      // Given: User becomes new landlord
      mockLandlordStore.tryAwardLandlordForCheckin.mockResolvedValue({ 
        isNewLandlord: true 
      });
      
      // When: Perform check-in
      await store.checkinToPub('pub-1');
      
      // Then: Should save landlord status
      const createArgs = mockCheckInService.createCheckin.mock.calls[0];
      const [pubId, carpetKey, completeData] = createArgs;
      
      expect(completeData.madeUserLandlord).toBe(true);
    });

    it('should prevent concurrent check-ins', async () => {
      // Given: Check-in in progress
      const checkInPromise1 = store.checkinToPub('pub-1');
      
      // When: Try to start another check-in
      const checkInPromise2 = store.checkinToPub('pub-2');
      
      await checkInPromise1;
      await checkInPromise2;
      
      // Then: Should only process one check-in
      expect(mockCheckInService.createCheckin).toHaveBeenCalledTimes(1);
    });
  });

  describe('💥 CRITICAL: Error Handling & Recovery', () => {
    it('should handle service failures gracefully', async () => {
      // Given: Service will fail
      const serviceError = new Error('Firebase connection failed');
      mockCheckInService.createCheckin.mockRejectedValue(serviceError);
      
      // When/Then: Should propagate error and log it
      await expect(store.checkinToPub('pub-1')).rejects.toThrow('Firebase connection failed');
      
      // Should log error for admin review
      expect(mockErrorLogging.logCheckInError).toHaveBeenCalledWith(
        'check-in-process-failure',
        serviceError,
        expect.objectContaining({
          pubId: 'pub-1',
          severity: 'critical'
        })
      );
      
      // Should reset processing state
      expect(store.isProcessing()).toBe(false);
    });

    it('should continue check-in flow when badge evaluation fails', async () => {
      // Given: Badge service will fail
      const badgeError = new Error('Badge service unavailable');
      mockBadgeAwardService.evaluateAndAwardBadges.mockRejectedValue(badgeError);
      
      // When: Perform check-in (should not fail)
      await store.checkinToPub('pub-1');
      
      // Then: Should complete check-in despite badge failure
      expect(mockCheckInService.createCheckin).toHaveBeenCalled();
      expect(mockCacheCoherence.invalidate).toHaveBeenCalled();
      
      // Should log badge error with medium severity
      expect(mockErrorLogging.logCheckInError).toHaveBeenCalledWith(
        'badge-pre-calculation',
        badgeError,
        expect.objectContaining({
          severity: 'medium'
        })
      );
    });

    it('should handle points calculation failures gracefully', async () => {
      // Given: Points calculation will fail
      const pointsError = new Error('Points service error');
      mockPointsStore.awardCheckInPoints.mockRejectedValue(pointsError);
      
      // When: Perform check-in (should not fail, but should log error and continue with 0 points)
      await store.checkinToPub('pub-1');
      
      // Then: Check-in should succeed despite points calculation failure
      expect(mockCheckInService.createCheckin).toHaveBeenCalled();
      
      // Should log points error with high severity
      expect(mockErrorLogging.logCheckInError).toHaveBeenCalledWith(
        'points-calculation-failure',
        pointsError,
        expect.objectContaining({
          severity: 'high'
        })
      );
      
      // Should continue with graceful degradation (0 points)
      const createArgs = mockCheckInService.createCheckin.mock.calls[0];
      const [pubId, carpetKey, completeData] = createArgs;
      expect(completeData.pointsEarned).toBe(0);
    });

    it('should handle network failures during user profile updates', async () => {
      // Given: User profile update will fail
      mockUserStore.updateProfile.mockRejectedValue(new Error('Network error'));
      
      // When: Perform check-in (should still complete)
      await store.checkinToPub('pub-1');
      
      // Then: Check-in should succeed despite profile update failure
      expect(mockCheckInService.createCheckin).toHaveBeenCalled();
      expect(store.totalCheckins()).toBeGreaterThan(0);
    });
  });

  describe('🧮 CRITICAL: Computed Business Logic', () => {
    describe('totalPubsCount - Unique Pub Calculation', () => {
      it('should calculate unique pubs visited by current user', () => {
        // Given: User has check-ins to different pubs
        const uniquePubCount = store.totalPubsCount();
        
        // Then: Should count unique pubs only (2 different pubs in test data)
        expect(uniquePubCount).toBe(2);
      });

      it('should return 0 when no authenticated user', () => {
        // Given: No authenticated user
        mockAuthStore._setUser(null);
        
        // When: Calculate pub count
        const pubCount = store.totalPubsCount();
        
        // Then: Should return 0
        expect(pubCount).toBe(0);
      });

      it('should only count current users pubs', () => {
        // Given: Mixed check-ins from different users
        const mixedCheckIns = [
          ...testCheckIns,
          createTestCheckIn({
            id: 'other-user-checkin',
            userId: 'other-user',
            pubId: 'other-pub'
          })
        ];
        store['_data'].set(mixedCheckIns);
        
        // When: Calculate for current user
        const pubCount = store.totalPubsCount();
        
        // Then: Should only count current user's pubs
        expect(pubCount).toBe(2);
      });
    });

    describe('canCheckInToday - Duplicate Prevention', () => {
      it('should prevent duplicate check-ins on same day', () => {
        // Given: User has checked in today
        const today = new Date().toISOString().split('T')[0];
        const todayCheckin = createTestCheckIn({
          userId: 'user-1',
          pubId: 'pub-1',
          dateKey: today
        });
        store['_data'].set([todayCheckin]);
        
        // When: Check if can check in again today
        const canCheckIn = store.canCheckInToday('pub-1');
        
        // Then: Should prevent duplicate
        expect(canCheckIn).toBe(false);
      });

      it('should allow check-in to different pub same day', () => {
        // Given: User checked into pub-1 today
        const today = new Date().toISOString().split('T')[0];
        const todayCheckin = createTestCheckIn({
          userId: 'user-1', 
          pubId: 'pub-1',
          dateKey: today
        });
        store['_data'].set([todayCheckin]);
        
        // When: Check if can check into different pub
        const canCheckIn = store.canCheckInToday('pub-2');
        
        // Then: Should allow different pub
        expect(canCheckIn).toBe(true);
      });

      it('should handle null pubId gracefully', () => {
        // When: Check with null pub ID
        const canCheckIn = store.canCheckInToday(null);
        
        // Then: Should return false
        expect(canCheckIn).toBe(false);
      });
    });

    describe('todayCheckins - Date Filtering', () => {
      it('should filter check-ins for current day only', () => {
        // Given: Check-ins from different days
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const mixedCheckins = [
          createTestCheckIn({ dateKey: today }),
          createTestCheckIn({ dateKey: yesterday }),
          createTestCheckIn({ dateKey: today })
        ];
        store['_data'].set(mixedCheckins);
        
        // When: Get today's check-ins
        const todayCount = store.todayCheckins().length;
        
        // Then: Should only include today's check-ins
        expect(todayCount).toBe(2);
      });
    });
  });

  describe('🔄 CRITICAL: Cache Coherence Integration', () => {
    it('should invalidate cache after successful check-in for leaderboard updates', async () => {
      // When: Complete successful check-in
      await store.checkinToPub('pub-1');
      
      // Then: Should trigger cache invalidation
      expect(mockCacheCoherence.invalidate).toHaveBeenCalledWith(
        'checkins',
        'new-check-in-created'
      );
    });

    it('should not invalidate cache on failed check-ins', async () => {
      // Given: Check-in will fail
      mockCheckInService.canCheckIn.mockResolvedValue({ 
        allowed: false, 
        reason: 'Validation failed' 
      });
      
      // When: Attempt check-in
      await expect(store.checkinToPub('pub-1')).rejects.toThrow();
      
      // Then: Should not invalidate cache
      expect(mockCacheCoherence.invalidate).not.toHaveBeenCalled();
    });

    it('should invalidate user cache after profile updates', async () => {
      // When: Complete check-in (which updates user profile)
      await store.checkinToPub('pub-1');
      
      // Then: Should invalidate user cache for leaderboard consistency
      expect(mockCacheCoherence.invalidate).toHaveBeenCalledWith(
        'users',
        'pub-count-update-after-checkin'
      );
    });
  });

  describe('🏠 CRITICAL: Distance & Home Pub Calculations', () => {
    it('should calculate distance from home pub correctly', async () => {
      // This tests the private calculateDistanceFromHome method indirectly
      // by checking points calculation which uses it
      
      // Given: User with home pub set
      const pointsData = {
        pubId: 'pub-1',
        distanceFromHome: 10,
        isFirstVisit: true
      };
      
      // When: Award points (which calculates distance internally)
      await store.checkinToPub('pub-1');
      
      // Then: Should call points store with distance data
      expect(mockPointsStore.awardCheckInPoints).toHaveBeenCalledWith(
        expect.objectContaining({
          pubId: 'pub-1',
          isHomePub: false // pub-1 is not the home pub
        }),
        'home-pub-1' // Should pass user's home pub ID
      );
    });

    it('should handle missing home pub gracefully', async () => {
      // Given: User with no home pub
      const userNoHome = { ...testUser1, homePubId: null };
      mockUserStore._setCurrentUser(userNoHome);
      
      // When: Perform check-in
      await store.checkinToPub('pub-1');
      
      // Then: Should handle gracefully and continue
      expect(mockPointsStore.awardCheckInPoints).toHaveBeenCalled();
    });
  });

  describe('🛠️ Utility Methods - Business Logic', () => {
    describe('hasCheckedIn', () => {
      it('should correctly identify visited pubs', () => {
        expect(store.hasCheckedIn('pub-1')).toBe(true);
        expect(store.hasCheckedIn('pub-2')).toBe(true);
        expect(store.hasCheckedIn('unvisited-pub')).toBe(false);
      });
    });

    describe('getLatestCheckinForPub', () => {
      it('should return most recent check-in for pub', () => {
        // Given: Multiple check-ins for same pub at different times
        const olderCheckin = createTestCheckIn({
          pubId: 'pub-1',
          timestamp: Timestamp.fromDate(new Date('2024-01-01T10:00:00Z'))
        });
        const newerCheckin = createTestCheckIn({
          pubId: 'pub-1', 
          timestamp: Timestamp.fromDate(new Date('2024-01-01T14:00:00Z'))
        });
        store['_data'].set([olderCheckin, newerCheckin]);
        
        // When: Get latest check-in
        const latest = store.getLatestCheckinForPub('pub-1');
        
        // Then: Should return most recent
        expect(latest?.timestamp.toMillis()).toBe(newerCheckin.timestamp.toMillis());
      });

      it('should return null for unvisited pub', () => {
        const latest = store.getLatestCheckinForPub('unvisited-pub');
        expect(latest).toBe(null);
      });
    });
  });

  describe('🔧 Administrative Methods - Security & Performance', () => {
    describe('loadAllCheckins - Admin Security', () => {
      it('should require authentication for admin operations', async () => {
        // Given: No authenticated user
        mockAuthStore._setUser(null);
        
        // When/Then: Should reject admin operation
        await expect(store.loadAllCheckins()).rejects.toThrow('Authentication required');
      });

      it('should require admin privileges', async () => {
        // Given: Non-admin user
        const regularUser = { ...testUser1, isAdmin: false };
        mockUserStore._setCurrentUser(regularUser);
        
        // When/Then: Should reject non-admin
        await expect(store.loadAllCheckins()).rejects.toThrow('Admin privileges required');
      });

      it('should load all check-ins for admin users', async () => {
        // Given: Admin user
        const adminUser = { ...testUser1, isAdmin: true };
        mockUserStore.currentUser = vi.fn().mockReturnValue(adminUser);
        mockCheckInService.getAllCheckIns = vi.fn().mockResolvedValue([]);
        
        // When: Load all check-ins
        await store.loadAllCheckins();
        
        // Then: Should call admin service method
        expect(mockCheckInService.getAllCheckIns).toHaveBeenCalled();
      });
    });
  });

  describe('🧪 Edge Cases & Data Integrity', () => {
    it('should handle corrupt check-in data gracefully', () => {
      // Given: Corrupt data
      const corruptData = [
        createTestCheckIn({ pubId: null, pointsEarned: undefined }),
        createTestCheckIn({ userId: null, timestamp: null })
      ];
      store['_data'].set(corruptData);
      
      // When: Access computed properties
      const totalPubs = store.totalPubsCount();
      const totalCheckins = store.totalCheckins();
      
      // Then: Should not crash
      expect(totalPubs).toBeGreaterThanOrEqual(0);
      expect(totalCheckins).toBe(2);
    });

    it('should handle empty data sets correctly', () => {
      // Given: Empty check-ins
      store['_data'].set([]);
      
      // When: Calculate metrics
      const totalPubs = store.totalPubsCount();
      const todayCheckins = store.todayCheckins();
      
      // Then: Should return appropriate defaults
      expect(totalPubs).toBe(0);
      expect(todayCheckins).toEqual([]);
    });

    it('should handle concurrent modifications during iteration', () => {
      // This tests signal reactivity during data mutations
      // Given: Initial data
      const initialCount = store.totalCheckins();
      
      // When: Modify data during computed signal access
      store['_data'].set([...testCheckIns, createTestCheckIn({ id: 'new-checkin' })]);
      
      // Then: Should reflect changes immediately
      expect(store.totalCheckins()).toBe(initialCount + 1);
    });
  });
});