import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthStore } from '../../auth/data-access/auth.store';
import { GlobalCheckInStore } from '../../check-in/data-access/global-check-in.store';
import { PubStore } from '../../pubs/data-access/pub.store';
import { UserService } from '../../users/data-access/user.service';
import { createTestCheckIn, createTestPub, createTestUser } from '../testing/test-data';
import { DebugService } from '../utils/debug.service';
import { DataAggregatorService } from './data-aggregator.service';

describe('DataAggregatorService - Pure Computation Layer', () => {
  let service: DataAggregatorService;
  let mockAuthStore: any;
  let mockGlobalCheckInStore: any;
  let mockPubStore: any;
  let mockUserService: any;
  let mockDebugService: any;

  // Test data - Real-world scenario that caused the bug
  const testUser = createTestUser({
    uid: 'user-1',
    displayName: 'Test User',
    manuallyAddedPubIds: ['manual-pub-1', 'manual-pub-2'],
    homePubId: 'home-pub-1',
  });

  // Test scenario: 2 check-ins with 35+10=45 points (the bug scenario)
  const testCheckIns = [
    createTestCheckIn({
      id: 'checkin-1',
      userId: 'user-1',
      pubId: 'verified-pub-1',
      pointsEarned: 35,
      pointsBreakdown: { total: 35, base: 25, distance: 10 },
      timestamp: {
        toMillis: () => Date.now() - 86400000, // 1 day ago
        toDate: () => new Date(Date.now() - 86400000),
      },
    }),
    createTestCheckIn({
      id: 'checkin-2',
      userId: 'user-1',
      pubId: 'verified-pub-2',
      pointsEarned: 10,
      pointsBreakdown: { total: 10, base: 10, distance: 0 },
      timestamp: {
        toMillis: () => Date.now() - 86400000 - 1800000, // 1 day + 30 min ago
        toDate: () => new Date(Date.now() - 86400000 - 1800000),
      },
    }),
    // Check-in to manual pub (creates overlap for deduplication test)
    createTestCheckIn({
      id: 'checkin-3',
      userId: 'user-1',
      pubId: 'manual-pub-1',
      pointsEarned: 15,
      pointsBreakdown: { total: 15, base: 15, distance: 0 },
      timestamp: {
        toMillis: () => Date.now() - 86400000 - 900000, // 1 day + 15 min ago
        toDate: () => new Date(Date.now() - 86400000 - 900000),
      },
    }),
    // Different user's check-in (should not affect user-1's calculations)
    createTestCheckIn({
      id: 'checkin-4',
      userId: 'user-2',
      pubId: 'other-user-pub',
      pointsEarned: 25,
      timestamp: {
        toMillis: () => Date.now() - 86400000 - 7200000, // 1 day + 2 hours ago
        toDate: () => new Date(Date.now() - 86400000 - 7200000),
      },
    }),
  ];

  const testPubs = [
    createTestPub({ id: 'verified-pub-1', name: 'Verified Pub 1' }),
    createTestPub({ id: 'verified-pub-2', name: 'Verified Pub 2' }),
    createTestPub({ id: 'manual-pub-1', name: 'Manual Pub 1' }),
    createTestPub({ id: 'manual-pub-2', name: 'Manual Pub 2' }),
    createTestPub({ id: 'home-pub-1', name: 'Home Pub' }),
    createTestPub({ id: 'other-user-pub', name: 'Other User Pub' }),
  ];

  beforeEach(async () => {
    // Simplified mocks for pure computation architecture
    mockAuthStore = {
      user: signal(testUser),
      uid: signal(testUser.uid),
      _setUser: function (user: any) {
        this.user.set(user);
        this.uid.set(user?.uid || null);
      },
    };

    mockGlobalCheckInStore = {
      allCheckIns: signal(testCheckIns),
      loading: signal(false),
      _setCheckIns: function (checkins: any[]) {
        this.allCheckIns.set(checkins);
      },
    };

    mockPubStore = {
      totalCount: signal(testPubs.length),
      loading: signal(false),
      get: vi.fn((id: string) => testPubs.find(p => p.id === id)),
      data: signal(testPubs),
      _setTotalCount: function (count: number) {
        this.totalCount.set(count);
      },
      _setLoading: function (loading: boolean) {
        this.loading.set(loading);
      },
    };

    mockUserService = {
      allUsers: signal([testUser]),
    };

    mockDebugService = {
      standard: vi.fn(),
      extreme: vi.fn(),
    };

    await TestBed.configureTestingModule({
      providers: [
        DataAggregatorService,
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: GlobalCheckInStore, useValue: mockGlobalCheckInStore },
        { provide: PubStore, useValue: mockPubStore },
        { provide: UserService, useValue: mockUserService },
        { provide: DebugService, useValue: mockDebugService },
      ],
    }).compileComponents();

    service = TestBed.inject(DataAggregatorService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('🏗️ Service Initialization', () => {
    it('should initialize pure computation service', () => {
      expect(service).toBeDefined();
      expect(mockDebugService.standard).toHaveBeenCalledWith(
        '[DataAggregator] Service initialized - providing reactive cross-store data aggregation'
      );
    });
  });

  describe('🎯 CRITICAL: Points Calculation (The Bug Fix)', () => {
    it('should calculate correct total points from check-ins: 35+10+15=60 points', () => {
      const totalPoints = service.calculateUserPointsFromCheckins('user-1');

      // User has 3 check-ins: 35 + 10 + 15 = 60 points
      expect(totalPoints).toBe(60);
    });

    it('should handle check-ins with pointsBreakdown fallback', () => {
      // Test check-in with missing pointsEarned but has pointsBreakdown
      const testCheckInsWithBreakdown = [
        createTestCheckIn({
          userId: 'user-1',
          pubId: 'test-pub',
          pointsEarned: undefined,
          pointsBreakdown: { total: 25, base: 20, bonus: 5 },
        }),
      ];

      mockGlobalCheckInStore._setCheckIns(testCheckInsWithBreakdown);

      const totalPoints = service.calculateUserPointsFromCheckins('user-1');
      expect(totalPoints).toBe(25);
    });

    it('should return 0 for user with no check-ins', () => {
      const totalPoints = service.calculateUserPointsFromCheckins('user-with-no-checkins');
      expect(totalPoints).toBe(0);
    });

    it('should return 0 when no user ID provided and no auth user', () => {
      mockAuthStore._setUser(null);

      const totalPoints = service.calculateUserPointsFromCheckins();
      expect(totalPoints).toBe(0);
    });

    it('should fallback to current user when no user ID provided', () => {
      // When no userId provided, should use current auth user
      const totalPoints = service.calculateUserPointsFromCheckins();
      expect(totalPoints).toBe(60); // Same as user-1's points
    });

    it('should filter check-ins by userId correctly', () => {
      // user-2 has only 1 check-in worth 25 points
      const user2Points = service.calculateUserPointsFromCheckins('user-2');
      expect(user2Points).toBe(25);

      // user-1 should still have 60 points
      const user1Points = service.calculateUserPointsFromCheckins('user-1');
      expect(user1Points).toBe(60);
    });
  });

  describe('🏛️ CRITICAL: Pub Count Calculation (Deduplication)', () => {
    it('should calculate total unique pubs (verified + manual with deduplication)', () => {
      const count = service.getPubsVisitedForUser('user-1', testUser.manuallyAddedPubIds || []);

      // Verified from check-ins: verified-pub-1, verified-pub-2, manual-pub-1 (3)
      // Manual from user: manual-pub-1, manual-pub-2 (2)
      // Unique total: verified-pub-1, verified-pub-2, manual-pub-1, manual-pub-2 (4)
      // Note: manual-pub-1 appears in both but is deduplicated
      expect(count).toBe(4);
    });

    it('should handle user with only verified pubs (no manual additions)', () => {
      const count = service.getPubsVisitedForUser('user-1', []);

      // Only verified from check-ins: 3 unique pubs
      expect(count).toBe(3);
    });

    it('should handle user with only manual pubs (no check-ins)', () => {
      const userWithNoCheckIns = 'user-with-no-checkins';
      const manualPubIds = ['manual-only-1', 'manual-only-2'];

      const count = service.getPubsVisitedForUser(userWithNoCheckIns, manualPubIds);

      // Only manual pubs: 2
      expect(count).toBe(2);
    });

    it('should return 0 for user with no pubs at all', () => {
      const count = service.getPubsVisitedForUser('user-with-nothing', []);
      expect(count).toBe(0);
    });

    it('should deduplicate correctly when all manual pubs are also verified', () => {
      // User who manually added pubs they've also checked into
      const overlappingManualPubs = ['verified-pub-1', 'verified-pub-2'];
      const count = service.getPubsVisitedForUser('user-1', overlappingManualPubs);

      // Should not double-count: still 3 unique pubs from check-ins
      expect(count).toBe(3);
    });
  });

  describe('📊 CRITICAL: Scoreboard Data (Pure Computation)', () => {
    it('should aggregate complete scoreboard data with reactive calculations', () => {
      const userData = {
        manuallyAddedPubIds: testUser.manuallyAddedPubIds || [],
        badgeCount: 5,
        landlordCount: 2,
      };
      const userCheckIns = testCheckIns.filter(c => c.userId === 'user-1');

      const data = service.getScoreboardDataForUser('user-1', userData, userCheckIns, false);

      expect(data).toEqual({
        totalPoints: 60, // Calculated from check-ins: 35+10+15
        todaysPoints: 0, // No check-ins today in test data
        pubsVisited: 4, // Deduplicated: verified-pub-1, verified-pub-2, manual-pub-1, manual-pub-2
        totalPubs: testPubs.length, // 6 pubs in test data
        badgeCount: 5,
        landlordCount: 2,
        totalCheckins: 3, // 3 check-ins for user-1
        isLoading: false,
      });
    });

    it('should calculate todays points when check-ins are from today', () => {
      const todayCheckIns = [
        createTestCheckIn({
          userId: 'user-1',
          pubId: 'today-pub',
          pointsEarned: 20,
          timestamp: {
            toDate: () => new Date(), // Today
          },
        }),
      ];

      const data = service.getScoreboardDataForUser('user-1', {}, todayCheckIns, false);
      expect(data.todaysPoints).toBe(20);
    });

    it('should handle loading state correctly', () => {
      const data = service.getScoreboardDataForUser('user-1', {}, [], true);
      expect(data.isLoading).toBe(true);
    });

    it('should return empty data for invalid user ID', () => {
      const data = service.getScoreboardDataForUser('', {}, [], false);

      expect(data).toEqual({
        totalPoints: 0,
        todaysPoints: 0,
        pubsVisited: 0,
        totalPubs: testPubs.length,
        badgeCount: 0,
        landlordCount: 0,
        totalCheckins: 0,
        isLoading: false,
      });
    });
  });

  describe('🛠️ Utility Methods', () => {
    it('should get unverified pub count from manual additions', () => {
      const count = service.getUnverifiedPubsCount(['manual-1', 'manual-2', 'manual-3']);
      expect(count).toBe(3);
    });

    it('should return 0 for empty manual pub list', () => {
      const count = service.getUnverifiedPubsCount([]);
      expect(count).toBe(0);
    });

    it('should check if user has visited a specific pub', () => {
      const hasVerified = service.hasVisitedPub('verified-pub-1', 'user-1', []);
      expect(hasVerified).toBe(true);

      const hasManual = service.hasVisitedPub('manual-pub-2', 'user-1', ['manual-pub-2']);
      expect(hasManual).toBe(true);

      const hasNot = service.hasVisitedPub('unvisited-pub', 'user-1', []);
      expect(hasNot).toBe(false);
    });

    it('should count visits to a specific pub', () => {
      const count = service.getVisitCountForPub('verified-pub-1', 'user-1');
      expect(count).toBe(1);

      const noVisits = service.getVisitCountForPub('unvisited-pub', 'user-1');
      expect(noVisits).toBe(0);
    });

    it('should get pub name by ID', () => {
      const name = service.getPubName('verified-pub-1');
      expect(name).toBe('Verified Pub 1');

      const unknown = service.getPubName('unknown-pub-id');
      expect(unknown).toBe('Unknown Pub');
    });
  });

  describe('🚨 CRITICAL: Smoke Tests (Bug Prevention)', () => {
    it('SMOKE: Should prevent "2 pubs, 2 check-ins, but 0 points" bug', () => {
      // Real-world scenario: user with 2 check-ins should have correct points
      const twoCheckInUser = [
        createTestCheckIn({ userId: 'smoke-user', pubId: 'pub-a', pointsEarned: 35 }),
        createTestCheckIn({ userId: 'smoke-user', pubId: 'pub-b', pointsEarned: 10 }),
      ];

      mockGlobalCheckInStore._setCheckIns(twoCheckInUser);

      const points = service.calculateUserPointsFromCheckins('smoke-user');
      const pubCount = service.getPubsVisitedForUser('smoke-user', []);

      // CRITICAL: Must not be "2 pubs, 2 check-ins, but 0 points"
      expect(points).toBe(45); // 35 + 10 = 45, not 0!
      expect(pubCount).toBe(2); // 2 unique pubs visited
    });

    it('SMOKE: Scoreboard and leaderboard should show same points', () => {
      // This tests the core architecture fix
      const userData = { manuallyAddedPubIds: [], badgeCount: 0, landlordCount: 0 };
      const userCheckIns = testCheckIns.filter(c => c.userId === 'user-1');

      // Scoreboard calculation
      const scoreboardData = service.getScoreboardDataForUser(
        'user-1',
        userData,
        userCheckIns,
        false
      );

      // Leaderboard calculation (same method)
      const leaderboardPoints = service.calculateUserPointsFromCheckins('user-1');

      // CRITICAL: Both must show same points (45 in our test case)
      expect(scoreboardData.totalPoints).toBe(leaderboardPoints);
      expect(scoreboardData.totalPoints).toBe(60); // 35+10+15 from our test data
    });

    it('SMOKE: Pub deduplication works correctly', () => {
      // User with overlapping manual and verified pubs
      const manualPubIds = ['verified-pub-1', 'extra-manual-pub'];
      const count = service.getPubsVisitedForUser('user-1', manualPubIds);

      // Should deduplicate: verified-pub-1 (overlap), verified-pub-2, manual-pub-1, extra-manual-pub = 4
      expect(count).toBe(4);
    });

    it('SMOKE: Points calculation handles missing data gracefully', () => {
      const problematicCheckIn = createTestCheckIn({
        userId: 'user-1',
        pubId: 'test-pub',
        pointsEarned: undefined,
        pointsBreakdown: undefined,
      });

      mockGlobalCheckInStore._setCheckIns([problematicCheckIn]);

      const points = service.calculateUserPointsFromCheckins('user-1');
      expect(points).toBe(0); // Should not crash, should handle gracefully
    });
  });

  describe('🧪 Edge Cases', () => {
    it('should handle user with no data at all', () => {
      const points = service.calculateUserPointsFromCheckins('empty-user');
      const pubs = service.getPubsVisitedForUser('empty-user', []);
      const scoreboard = service.getScoreboardDataForUser('empty-user', {}, [], false);

      expect(points).toBe(0);
      expect(pubs).toBe(0);
      expect(scoreboard.totalPoints).toBe(0);
    });

    it('should handle check-ins with null/undefined pubId', () => {
      const badCheckIns = [
        createTestCheckIn({ userId: 'user-1', pubId: null, pointsEarned: 10 }),
        createTestCheckIn({ userId: 'user-1', pubId: undefined, pointsEarned: 15 }),
        createTestCheckIn({ userId: 'user-1', pubId: 'valid-pub', pointsEarned: 20 }),
      ];

      mockGlobalCheckInStore._setCheckIns(badCheckIns);

      const points = service.calculateUserPointsFromCheckins('user-1');
      const pubs = service.getPubsVisitedForUser('user-1', []);

      expect(points).toBe(45); // All points counted (10+15+20)
      expect(pubs).toBe(1); // Only valid pub counted
    });

    it('should handle extremely large datasets', () => {
      // Generate 1000 check-ins for performance test
      const manyCheckIns = Array.from({ length: 1000 }, (_, i) =>
        createTestCheckIn({
          userId: 'heavy-user',
          pubId: `pub-${i}`,
          pointsEarned: 10,
        })
      );

      mockGlobalCheckInStore._setCheckIns(manyCheckIns);

      const startTime = Date.now();
      const points = service.calculateUserPointsFromCheckins('heavy-user');
      const duration = Date.now() - startTime;

      expect(points).toBe(10000); // 1000 * 10
      expect(duration).toBeLessThan(100); // Should be fast
    });
  });
});
