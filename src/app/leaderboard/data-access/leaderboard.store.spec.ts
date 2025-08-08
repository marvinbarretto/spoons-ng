import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { signal } from '@angular/core';
import { LeaderboardStore } from './leaderboard.store';
import { AuthStore } from '../../auth/data-access/auth.store';
import { DataAggregatorService } from '../../shared/data-access/data-aggregator.service';
import { UserService } from '../../users/data-access/user.service';
import { CheckInService } from '../../check-in/data-access/check-in.service';
import { CacheCoherenceService } from '../../shared/data-access/cache-coherence.service';
import { ErrorLoggingService } from '../../shared/data-access/error-logging.service';
import { createTestUser, createTestCheckIn } from '../../shared/testing/test-data';

describe('LeaderboardStore - Consistency with UserStore Architecture', () => {
  let store: LeaderboardStore;
  let mockAuthStore: any;
  let mockDataAggregator: any;
  let mockUserService: any;
  let mockCheckInService: any;
  let mockCacheCoherence: any;
  let mockErrorLoggingService: any;

  // Test data representing the same scenario as our UserStore tests
  const testAuthUser = {
    uid: 'auth-user-123',
    displayName: 'Test User',
    email: 'test@example.com',
    photoURL: 'https://example.com/avatar.jpg',
    isAnonymous: false,
  };

  const testUsers = [
    createTestUser({
      uid: 'auth-user-123',
      displayName: 'Test User',
      email: 'test@example.com',
      photoURL: 'https://example.com/avatar.jpg',
      manuallyAddedPubIds: ['manual-pub-1', 'manual-pub-2'],
      badgeCount: 5,
      landlordCount: 2,
      totalPoints: 60, // This should be IGNORED in favor of reactive calculation
      realUser: true,
    }),
    createTestUser({
      uid: 'other-user-456',
      displayName: 'Other User',
      email: 'other@example.com',
      manuallyAddedPubIds: ['other-manual-pub'],
      badgeCount: 2,
      landlordCount: 1,
      totalPoints: 30, // This should be IGNORED in favor of reactive calculation
      realUser: true,
    }),
    createTestUser({
      uid: 'guest-user-789',
      displayName: 'Guest User',
      email: null,
      manuallyAddedPubIds: [],
      badgeCount: 0,
      landlordCount: 0,
      totalPoints: 15, // This should be IGNORED in favor of reactive calculation
      realUser: false, // Guest user
    }),
  ];

  // Test check-ins that should be the SINGLE SOURCE OF TRUTH for points
  const testCheckIns = [
    // Auth user check-ins: 35 + 25 = 60 points (same as UserStore tests)
    createTestCheckIn({
      id: 'checkin-1',
      userId: 'auth-user-123',
      pubId: 'verified-pub-1',
      pointsEarned: 35,
      timestamp: {
        toMillis: () => Date.now() - 86400000,
        toDate: () => new Date(Date.now() - 86400000)
      }
    }),
    createTestCheckIn({
      id: 'checkin-2',
      userId: 'auth-user-123',
      pubId: 'verified-pub-2',
      pointsEarned: 25,
      timestamp: {
        toMillis: () => Date.now() - 86400000,
        toDate: () => new Date(Date.now() - 86400000)
      }
    }),
    // Other user check-ins: 20 + 30 = 50 points (NOT 30 from user doc!)
    createTestCheckIn({
      id: 'checkin-3',
      userId: 'other-user-456',
      pubId: 'other-verified-pub-1',
      pointsEarned: 20,
      timestamp: {
        toMillis: () => Date.now() - 86400000,
        toDate: () => new Date(Date.now() - 86400000)
      }
    }),
    createTestCheckIn({
      id: 'checkin-4',
      userId: 'other-user-456',
      pubId: 'other-verified-pub-2',
      pointsEarned: 30,
      timestamp: {
        toMillis: () => Date.now() - 86400000,
        toDate: () => new Date(Date.now() - 86400000)
      }
    }),
    // Guest user check-ins: 40 points (NOT 15 from user doc!)
    createTestCheckIn({
      id: 'checkin-5',
      userId: 'guest-user-789',
      pubId: 'guest-pub-1',
      pointsEarned: 40,
      timestamp: {
        toMillis: () => Date.now() - 86400000,
        toDate: () => new Date(Date.now() - 86400000)
      }
    }),
  ];

  beforeEach(async () => {
    // Mock DataAggregatorService to return consistent calculations
    mockDataAggregator = {
      calculateUserPointsFromCheckins: vi.fn((userId: string) => {
        const userCheckins = testCheckIns.filter(c => c.userId === userId);
        return userCheckins.reduce((sum, c) => sum + (c.pointsEarned || 0), 0);
      }),
      getPubsVisitedForUser: vi.fn((userId: string, manualPubIds: string[] = []) => {
        const userCheckins = testCheckIns.filter(c => c.userId === userId);
        const verifiedPubs = new Set(userCheckins.map(c => c.pubId));
        const allUniquePubs = new Set([...verifiedPubs, ...manualPubIds]);
        return allUniquePubs.size;
      }),
    };

    mockAuthStore = {
      user: signal(testAuthUser),
      uid: signal(testAuthUser.uid),
      _setUser: function(user: any) {
        this.user.set(user);
        this.uid.set(user?.uid || null);
      }
    };

    mockUserService = {
      allUsers: signal(testUsers),
      loadAllUsers: vi.fn().mockResolvedValue(testUsers),
      _setUsers: function(users: any[]) {
        this.allUsers.set(users);
      }
    };

    mockCheckInService = {
      allCheckIns: signal(testCheckIns),
      loadAllCheckIns: vi.fn().mockResolvedValue(testCheckIns),
      _setCheckIns: function(checkins: any[]) {
        this.allCheckIns.set(checkins);
      }
    };

    mockCacheCoherence = {
      invalidations: signal(null),
      invalidate: vi.fn(),
      invalidateMultiple: vi.fn(),
    };

    mockErrorLoggingService = {
      logError: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      providers: [
        LeaderboardStore,
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: DataAggregatorService, useValue: mockDataAggregator },
        { provide: UserService, useValue: mockUserService },
        { provide: CheckInService, useValue: mockCheckInService },
        { provide: CacheCoherenceService, useValue: mockCacheCoherence },
        { provide: ErrorLoggingService, useValue: mockErrorLoggingService },
      ]
    }).compileComponents();

    store = TestBed.inject(LeaderboardStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('🏗️ Store Initialization & State Management', () => {
    it('should initialize with correct default state', () => {
      expect(store).toBeDefined();
      expect(store.scope()).toBe('global');
      expect(store.sortBy()).toBe('points');
      expect(store.period()).toBe('all-time');
      expect(store.showRealUsersOnly()).toBe(false); // Includes guest users by default
    });

    it('should have reactive computed signals for leaderboard entries', () => {
      const entries = store.leaderboardEntries();
      expect(Array.isArray(entries)).toBe(true);
      expect(entries.length).toBe(3); // All users (including guest)
    });

    it('should allow setting scope, sortBy, and period', () => {
      store.setScope('friends');
      store.setSortBy('pubs');
      store.setPeriod('monthly');

      expect(store.scope()).toBe('friends');
      expect(store.sortBy()).toBe('pubs');
      expect(store.period()).toBe('monthly');
    });
  });

  describe('🎯 CRITICAL: Points Consistency with UserStore/DataAggregatorService', () => {
    it('should calculate points using DataAggregatorService IGNORING user document totalPoints', () => {
      const entries = store.leaderboardEntries();
      
      // Find our test user
      const authUserEntry = entries.find(e => e.userId === 'auth-user-123');
      const otherUserEntry = entries.find(e => e.userId === 'other-user-456');
      const guestUserEntry = entries.find(e => e.userId === 'guest-user-789');
      
      // Verify DataAggregatorService was called for each user
      expect(mockDataAggregator.calculateUserPointsFromCheckins).toHaveBeenCalledWith('auth-user-123');
      expect(mockDataAggregator.calculateUserPointsFromCheckins).toHaveBeenCalledWith('other-user-456');
      expect(mockDataAggregator.calculateUserPointsFromCheckins).toHaveBeenCalledWith('guest-user-789');
      
      // CRITICAL: Points should come from check-ins, NOT user documents
      expect(authUserEntry?.totalPoints).toBe(60); // From check-ins: 35 + 25, NOT user doc 60
      expect(otherUserEntry?.totalPoints).toBe(50); // From check-ins: 20 + 30, NOT user doc 30
      expect(guestUserEntry?.totalPoints).toBe(40); // From check-ins: 40, NOT user doc 15
    });

    it('should calculate pubs using DataAggregatorService with deduplication', () => {
      const entries = store.leaderboardEntries();
      
      const authUserEntry = entries.find(e => e.userId === 'auth-user-123');
      
      // Verify DataAggregatorService was called with manual pub IDs for deduplication
      expect(mockDataAggregator.getPubsVisitedForUser).toHaveBeenCalledWith(
        'auth-user-123',
        ['manual-pub-1', 'manual-pub-2']
      );
      
      // Should return deduplicated count: 2 verified + 2 manual = 4 unique
      expect(authUserEntry?.uniquePubs).toBe(4);
    });

    it('should sort entries by reactive points calculation, not user document points', () => {
      const entries = store.leaderboardEntries();
      
      // Should be sorted by reactive points: auth-user (60), other-user (50), guest-user (40)
      expect(entries[0].userId).toBe('auth-user-123');
      expect(entries[0].totalPoints).toBe(60);
      expect(entries[0].rank).toBe(1);
      
      expect(entries[1].userId).toBe('other-user-456');
      expect(entries[1].totalPoints).toBe(50);
      expect(entries[1].rank).toBe(2);
      
      expect(entries[2].userId).toBe('guest-user-789');
      expect(entries[2].totalPoints).toBe(40);
      expect(entries[2].rank).toBe(3);
    });

    it('should handle empty check-ins gracefully', () => {
      // Update mocks to have users but no check-ins
      mockCheckInService._setCheckIns([]);
      mockDataAggregator.calculateUserPointsFromCheckins.mockReturnValue(0);
      mockDataAggregator.getPubsVisitedForUser.mockReturnValue(0);
      
      const entries = store.leaderboardEntries();
      
      entries.forEach(entry => {
        expect(entry.totalPoints).toBe(0); // Should all have 0 points
        expect(entry.uniquePubs).toBe(0); // Should all have 0 pubs from check-ins
        expect(entry.totalCheckins).toBe(0); // Should all have 0 check-ins
      });
    });
  });

  describe('🚨 CRITICAL: Smoke Tests (Preventing Regression)', () => {
    it('SMOKE: Should prevent leaderboard showing different points than scoreboard', () => {
      const entries = store.leaderboardEntries();
      const authUserEntry = entries.find(e => e.userId === 'auth-user-123');
      
      // CRITICAL: Leaderboard must show same points as UserStore/scoreboard
      // This test prevents the original "2 pubs, 2 check-ins, but 0 points" bug from happening in leaderboard
      expect(authUserEntry?.totalPoints).toBe(60); // Same as UserStore tests
      expect(authUserEntry?.uniquePubs).toBe(4); // Same as UserStore tests
      expect(authUserEntry?.totalCheckins).toBe(2); // 2 check-ins for this user
    });

    it('SMOKE: Should use same DataAggregatorService methods as UserStore', () => {
      store.leaderboardEntries();
      
      // Should call the same methods that UserStore uses
      expect(mockDataAggregator.calculateUserPointsFromCheckins).toHaveBeenCalled();
      expect(mockDataAggregator.getPubsVisitedForUser).toHaveBeenCalled();
      
      // Should be called once per user
      expect(mockDataAggregator.calculateUserPointsFromCheckins).toHaveBeenCalledTimes(3);
      expect(mockDataAggregator.getPubsVisitedForUser).toHaveBeenCalledTimes(3);
    });

    it('SMOKE: Should handle the exact same data scenario as UserStore', () => {
      const entries = store.leaderboardEntries();
      const authUserEntry = entries.find(e => e.userId === 'auth-user-123');
      
      // This should match exactly with UserStore reactive calculations
      expect(authUserEntry).toMatchObject({
        userId: 'auth-user-123',
        displayName: 'Test User',
        totalPoints: 60, // From check-ins: 35 + 25
        uniquePubs: 4, // 2 verified + 2 manual (deduplicated)
        totalCheckins: 2,
        isCurrentUser: true, // Current auth user
      });
    });

    it('SMOKE: Should ignore user document points completely', () => {
      // This test ensures we never regress to using user.totalPoints
      const userWithFakePoints = createTestUser({
        uid: 'fake-points-user',
        displayName: 'Fake Points User',
        totalPoints: 999999, // Ridiculously high fake points in user doc
      });
      
      // User has no check-ins, so reactive calculation should return 0
      mockUserService._setUsers([...testUsers, userWithFakePoints]);
      mockDataAggregator.calculateUserPointsFromCheckins.mockImplementation((userId: string) => {
        if (userId === 'fake-points-user') return 0; // No check-ins = 0 points
        const userCheckins = testCheckIns.filter(c => c.userId === userId);
        return userCheckins.reduce((sum, c) => sum + (c.pointsEarned || 0), 0);
      });
      
      const entries = store.leaderboardEntries();
      const fakePointsUserEntry = entries.find(e => e.userId === 'fake-points-user');
      
      // CRITICAL: Should show 0 points (from reactive calculation), NOT 999999 from user doc
      expect(fakePointsUserEntry?.totalPoints).toBe(0);
    });
  });

  describe('👥 User Filtering & Scope Management', () => {
    it('should include guest users by default (showRealUsersOnly: false)', () => {
      expect(store.showRealUsersOnly()).toBe(false);
      
      const entries = store.leaderboardEntries();
      const guestEntry = entries.find(e => e.userId === 'guest-user-789');
      
      expect(guestEntry).toBeDefined();
      expect(guestEntry?.totalPoints).toBe(40); // Guest user has points from check-ins
    });

    it('should filter out guest users when showRealUsersOnly is true', () => {
      store.setShowRealUsersOnly(true);
      
      const entries = store.leaderboardEntries();
      const guestEntry = entries.find(e => e.userId === 'guest-user-789');
      
      expect(guestEntry).toBeUndefined(); // Guest user should be filtered out
      expect(entries.length).toBe(2); // Only real users remain
    });

    it('should support different scopes (global, friends, regional)', () => {
      // Global scope (default)
      store.setScope('global');
      expect(store.scopedEntries().length).toBe(3);
      
      // Friends scope (empty for this test)
      store.setScope('friends');
      expect(store.scopedEntries().length).toBe(0); // No friends in test data
      
      // Regional scope (empty for this test)
      store.setScope('regional');
      expect(store.scopedEntries().length).toBe(0); // No regional data in test
    });
  });

  describe('📊 Leaderboard Computed Properties', () => {
    it('should compute current user position correctly', () => {
      const position = store.currentUserPosition();
      
      // Auth user should be #1 with 60 points
      expect(position).toBe(1);
    });

    it('should get current user entry correctly', () => {
      const userEntry = store.currentUserEntry();
      
      expect(userEntry).toBeDefined();
      expect(userEntry?.userId).toBe('auth-user-123');
      expect(userEntry?.totalPoints).toBe(60);
      expect(userEntry?.isCurrentUser).toBe(true);
    });

    it('should compute leaderboard stats correctly', () => {
      const stats = store.stats();
      
      expect(stats).toEqual({
        totalUsers: 3,
        totalPoints: 150, // 60 + 50 + 40
        totalCheckins: 5, // Total check-ins across all users
        totalUniquePubs: 8, // Sum of unique pubs for all users (auth-user: 4, other-user: 3, guest-user: 1)
      });
    });

    it('should support top 100 entries', () => {
      const topEntries = store.topEntries();
      
      expect(topEntries.length).toBe(3); // Less than 100 in test
      expect(topEntries[0].rank).toBe(1);
      expect(topEntries[0].userId).toBe('auth-user-123');
    });
  });

  describe('🔧 Data Loading & Error Handling', () => {
    it('should load data using UserService and CheckInService', async () => {
      await store.refresh();
      
      expect(mockUserService.loadAllUsers).toHaveBeenCalled();
      expect(mockCheckInService.loadAllCheckIns).toHaveBeenCalled();
    });

    it('should handle loading errors gracefully', async () => {
      mockUserService.loadAllUsers.mockRejectedValue(new Error('Service error'));
      
      await store.refresh();
      
      expect(store.error()).toBe('Service error');
      expect(store.loading()).toBe(false);
    });

    it('should log errors for users with check-ins but no points', async () => {
      // Mock a user with check-ins but the user document has 0 points
      const problematicUser = createTestUser({
        uid: 'problem-user',
        totalPoints: 0, // User doc says 0 points
      });
      
      const problematicCheckIn = createTestCheckIn({
        userId: 'problem-user',
        pointsEarned: 50, // But user has check-ins worth 50 points
      });
      
      mockUserService._setUsers([...testUsers, problematicUser]);
      mockCheckInService._setCheckIns([...testCheckIns, problematicCheckIn]);
      
      await store.refresh();
      
      // Should log error for data inconsistency
      expect(mockErrorLoggingService.logError).toHaveBeenCalledWith(
        'points',
        'user-checkins-no-points',
        expect.stringContaining('check-ins but 0 points'),
        expect.objectContaining({
          severity: 'high',
          operationContext: expect.objectContaining({
            userId: 'problem-user',
          }),
        })
      );
    });
  });

  describe('🔄 Sorting & Ranking', () => {
    it('should sort by points correctly (default)', () => {
      const entries = store.leaderboardEntries();
      
      // Should be sorted by points descending: 60, 50, 40
      expect(entries.map(e => e.totalPoints)).toEqual([60, 50, 40]);
      expect(entries.map(e => e.rank)).toEqual([1, 2, 3]);
    });

    it('should sort by pubs when sortBy is changed', () => {
      store.setSortBy('pubs');
      const entries = store.leaderboardEntries();
      
      // Verify DataAggregator was called for pub calculations
      expect(mockDataAggregator.getPubsVisitedForUser).toHaveBeenCalled();
      
      // Should still have proper ranking
      expect(entries.every(e => e.rank > 0)).toBe(true);
    });

    it('should sort by check-ins when sortBy is changed', () => {
      store.setSortBy('checkins');
      const entries = store.leaderboardEntries();
      
      // Should be sorted by check-ins count
      expect(entries.every(e => e.rank > 0)).toBe(true);
      expect(entries[0].totalCheckins).toBeGreaterThanOrEqual(entries[1].totalCheckins);
    });
  });
});