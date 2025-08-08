import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { signal } from '@angular/core';
import { of } from 'rxjs';

// Services under test
import { DataAggregatorService } from '../../data-access/data-aggregator.service';
import { UserStore } from '../../../users/data-access/user.store';
import { LeaderboardStore } from '../../../leaderboard/data-access/leaderboard.store';

// Dependencies
import { AuthStore } from '../../../auth/data-access/auth.store';
import { GlobalCheckInStore } from '../../../check-in/data-access/global-check-in.store';
import { PubStore } from '../../../pubs/data-access/pub.store';
import { UserService } from '../../../users/data-access/user.service';
import { CheckInService } from '../../../check-in/data-access/check-in.service';
import { CacheCoherenceService } from '../../data-access/cache-coherence.service';
import { ErrorLoggingService } from '../../data-access/error-logging.service';
import { DebugService } from '../../utils/debug.service';

// Test utilities
import { createTestUser, createTestCheckIn, createTestPub } from '../test-data';

describe('🔄 Data Consistency Integration Tests - End-to-End Architecture Validation', () => {
  let dataAggregator: DataAggregatorService;
  let userStore: UserStore;
  let leaderboardStore: LeaderboardStore;

  // Mock dependencies
  let mockAuthStore: any;
  let mockGlobalCheckInStore: any;
  let mockPubStore: any;
  let mockUserService: any;
  let mockCheckInService: any;
  let mockCacheCoherence: any;
  let mockErrorLoggingService: any;
  let mockDebugService: any;

  // Test data representing real-world scenario that previously failed
  const testAuthUser = {
    uid: 'integration-user-123',
    displayName: 'Integration Test User',
    email: 'integration@test.com',
    photoURL: 'https://test.com/avatar.jpg',
    isAnonymous: false,
  };

  const testUser = createTestUser({
    uid: 'integration-user-123',
    displayName: 'Integration Test User',
    email: 'integration@test.com',
    photoURL: 'https://test.com/avatar.jpg',
    manuallyAddedPubIds: ['manual-pub-a', 'manual-pub-b'],
    badgeCount: 3,
    landlordCount: 1,
    totalPoints: 999, // SHOULD BE IGNORED - this is the old broken way
    realUser: true,
  });

  const testUsers = [
    testUser,
    createTestUser({
      uid: 'other-integration-user',
      displayName: 'Other Integration User',
      manuallyAddedPubIds: ['other-manual-pub'],
      totalPoints: 888, // SHOULD BE IGNORED
      realUser: true,
    })
  ];

  // The REAL source of truth - check-ins data
  const testCheckIns = [
    // Integration user: 45 + 20 = 65 points (NOT 999 from user doc)
    createTestCheckIn({
      id: 'integration-checkin-1',
      userId: 'integration-user-123',
      pubId: 'verified-pub-x',
      pointsEarned: 45,
      timestamp: {
        toMillis: () => Date.now() - 86400000,
        toDate: () => new Date(Date.now() - 86400000)
      }
    }),
    createTestCheckIn({
      id: 'integration-checkin-2',
      userId: 'integration-user-123',
      pubId: 'verified-pub-y',
      pointsEarned: 20,
      timestamp: {
        toMillis: () => Date.now() - 86400000,
        toDate: () => new Date(Date.now() - 86400000)
      }
    }),
    // Other user: 30 points (NOT 888 from user doc)
    createTestCheckIn({
      id: 'other-integration-checkin',
      userId: 'other-integration-user',
      pubId: 'other-verified-pub',
      pointsEarned: 30,
      timestamp: {
        toMillis: () => Date.now() - 86400000,
        toDate: () => new Date(Date.now() - 86400000)
      }
    }),
  ];

  const testPubs = [
    createTestPub({ id: 'verified-pub-x', name: 'Verified Pub X' }),
    createTestPub({ id: 'verified-pub-y', name: 'Verified Pub Y' }),
    createTestPub({ id: 'manual-pub-a', name: 'Manual Pub A' }),
    createTestPub({ id: 'manual-pub-b', name: 'Manual Pub B' }),
    createTestPub({ id: 'other-verified-pub', name: 'Other Verified Pub' }),
    createTestPub({ id: 'other-manual-pub', name: 'Other Manual Pub' }),
  ];

  beforeEach(async () => {
    // Create comprehensive mocks for integration testing
    mockAuthStore = {
      user: signal(testAuthUser),
      uid: signal(testAuthUser.uid),
      refreshCurrentUser: vi.fn(),
      _setUser: function(user: any) {
        this.user.set(user);
        this.uid.set(user?.uid || null);
      }
    };

    mockGlobalCheckInStore = {
      allCheckIns: signal(testCheckIns),
      loading: signal(false),
      _setCheckIns: function(checkins: any[]) { 
        this.allCheckIns.set(checkins); 
      }
    };

    mockPubStore = {
      totalCount: signal(testPubs.length),
      loading: signal(false),
      get: vi.fn((id: string) => testPubs.find(p => p.id === id)),
      data: signal(testPubs),
    };

    mockUserService = {
      allUsers: signal(testUsers),
      getUser: vi.fn(() => of(testUser)),
      updateUser: vi.fn().mockResolvedValue(testUser),
      loadAllUsers: vi.fn().mockResolvedValue(testUsers),
      getAllUsers: vi.fn().mockResolvedValue(testUsers),
      createUser: vi.fn().mockResolvedValue(testUser),
      getDocByPath: vi.fn().mockResolvedValue(testUser),
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

    mockDebugService = {
      standard: vi.fn(),
      extreme: vi.fn()
    };

    await TestBed.configureTestingModule({
      providers: [
        DataAggregatorService,
        UserStore,
        LeaderboardStore,
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: GlobalCheckInStore, useValue: mockGlobalCheckInStore },
        { provide: PubStore, useValue: mockPubStore },
        { provide: UserService, useValue: mockUserService },
        { provide: CheckInService, useValue: mockCheckInService },
        { provide: CacheCoherenceService, useValue: mockCacheCoherence },
        { provide: ErrorLoggingService, useValue: mockErrorLoggingService },
        { provide: DebugService, useValue: mockDebugService },
      ]
    }).compileComponents();

    // Inject all services
    dataAggregator = TestBed.inject(DataAggregatorService);
    userStore = TestBed.inject(UserStore);
    leaderboardStore = TestBed.inject(LeaderboardStore);

    // Set up initial state
    userStore._data.set(testUsers);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('🎯 CRITICAL: End-to-End Data Consistency', () => {
    it('INTEGRATION: DataAggregatorService, UserStore, and LeaderboardStore must show IDENTICAL points', () => {
      // Calculate points using DataAggregatorService directly
      const directPoints = dataAggregator.calculateUserPointsFromCheckins('integration-user-123');
      
      // Get points from UserStore reactive calculation
      const userStorePoints = userStore.totalPoints();
      
      // Get points from LeaderboardStore
      const leaderboardEntries = leaderboardStore.leaderboardEntries();
      const leaderboardUserEntry = leaderboardEntries.find(e => e.userId === 'integration-user-123');
      const leaderboardPoints = leaderboardUserEntry?.totalPoints || 0;
      
      // Get points from UserStore scoreboard data
      const scoreboardData = userStore.scoreboardData();
      const scoreboardPoints = scoreboardData.totalPoints;
      
      // CRITICAL: All must show 65 points from check-ins (45 + 20), NOT 999 from user document
      expect(directPoints).toBe(65);
      expect(userStorePoints).toBe(65);
      expect(leaderboardPoints).toBe(65);
      expect(scoreboardPoints).toBe(65);
      
      // All calculations must be identical
      expect(userStorePoints).toBe(directPoints);
      expect(leaderboardPoints).toBe(directPoints);
      expect(scoreboardPoints).toBe(directPoints);
      
      console.log('✅ INTEGRATION SUCCESS: All services show identical points:', {
        dataAggregator: directPoints,
        userStore: userStorePoints,
        leaderboard: leaderboardPoints,
        scoreboard: scoreboardPoints,
        allIdentical: directPoints === userStorePoints && userStorePoints === leaderboardPoints && leaderboardPoints === scoreboardPoints
      });
    });

    it('INTEGRATION: All services must show IDENTICAL pub counts with deduplication', () => {
      const userId = 'integration-user-123';
      const manualPubIds = ['manual-pub-a', 'manual-pub-b'];
      
      // Calculate pubs using DataAggregatorService directly
      const directPubs = dataAggregator.getPubsVisitedForUser(userId, manualPubIds);
      
      // Get pubs from UserStore reactive calculation
      const userStorePubs = userStore.pubsVisited();
      
      // Get pubs from LeaderboardStore
      const leaderboardEntries = leaderboardStore.leaderboardEntries();
      const leaderboardUserEntry = leaderboardEntries.find(e => e.userId === userId);
      const leaderboardPubs = leaderboardUserEntry?.uniquePubs || 0;
      
      // Get pubs from UserStore scoreboard data
      const scoreboardData = userStore.scoreboardData();
      const scoreboardPubs = scoreboardData.pubsVisited;
      
      // CRITICAL: All must show same deduplicated count
      // verified pubs (2) + manual pubs (2) = 4 unique pubs
      expect(directPubs).toBe(4);
      expect(userStorePubs).toBe(4);
      expect(leaderboardPubs).toBe(4);
      expect(scoreboardPubs).toBe(4);
      
      // All calculations must be identical
      expect(userStorePubs).toBe(directPubs);
      expect(leaderboardPubs).toBe(directPubs);
      expect(scoreboardPubs).toBe(directPubs);
      
      console.log('✅ INTEGRATION SUCCESS: All services show identical pub counts:', {
        dataAggregator: directPubs,
        userStore: userStorePubs,
        leaderboard: leaderboardPubs,
        scoreboard: scoreboardPubs,
        allIdentical: directPubs === userStorePubs && userStorePubs === leaderboardPubs && leaderboardPubs === scoreboardPubs
      });
    });

    it('INTEGRATION: Scoreboard and leaderboard must show IDENTICAL complete data sets', () => {
      // Get complete data from UserStore scoreboard
      const scoreboardData = userStore.scoreboardData();
      
      // Get complete data from LeaderboardStore
      const leaderboardEntries = leaderboardStore.leaderboardEntries();
      const userEntry = leaderboardEntries.find(e => e.userId === 'integration-user-123');
      
      // CRITICAL: All key metrics must match exactly
      expect(scoreboardData.totalPoints).toBe(userEntry?.totalPoints); // 65 points from check-ins
      expect(scoreboardData.pubsVisited).toBe(userEntry?.uniquePubs); // 4 deduplicated pubs
      expect(scoreboardData.totalCheckins).toBe(userEntry?.totalCheckins); // 2 check-ins
      expect(scoreboardData.badgeCount).toBe(userEntry ? (testUser.badgeCount || 0) : 0); // 3 badges
      expect(scoreboardData.landlordCount).toBe(userEntry ? (testUser.landlordCount || 0) : 0); // 1 landlord
      
      console.log('✅ INTEGRATION SUCCESS: Scoreboard and leaderboard show identical complete data:', {
        scoreboard: {
          points: scoreboardData.totalPoints,
          pubs: scoreboardData.pubsVisited,
          checkins: scoreboardData.totalCheckins,
          badges: scoreboardData.badgeCount,
          landlord: scoreboardData.landlordCount,
        },
        leaderboard: {
          points: userEntry?.totalPoints,
          pubs: userEntry?.uniquePubs,
          checkins: userEntry?.totalCheckins,
          badges: testUser.badgeCount,
          landlord: testUser.landlordCount,
        }
      });
    });
  });

  describe('🚨 CRITICAL: Regression Prevention Integration Tests', () => {
    it('SMOKE: Should prevent "2 pubs, 2 check-ins, but 0 points" regression across ALL services', () => {
      // This is the exact scenario that was failing before our architecture fix
      const testScenarioCheckIns = [
        createTestCheckIn({
          userId: 'integration-user-123',
          pubId: 'smoke-pub-1',
          pointsEarned: 35,
          timestamp: {
            toMillis: () => Date.now() - 86400000,
            toDate: () => new Date(Date.now() - 86400000)
          }
        }),
        createTestCheckIn({
          userId: 'integration-user-123',
          pubId: 'smoke-pub-2',
          pointsEarned: 25,
          timestamp: {
            toMillis: () => Date.now() - 86400000,
            toDate: () => new Date(Date.now() - 86400000)
          }
        }),
      ];
      
      // Create user with NO manual pubs for this specific smoke test
      const smokeTestUser = { ...testUser, manuallyAddedPubIds: [] };
      
      // Update all data sources with clean test data
      mockGlobalCheckInStore._setCheckIns(testScenarioCheckIns);
      mockCheckInService._setCheckIns(testScenarioCheckIns);
      userStore._data.set([smokeTestUser, testUsers[1]]);
      mockUserService._setUsers([smokeTestUser, testUsers[1]]);
      
      // Calculate across all services (with no manual pubs for clean test)
      const directPoints = dataAggregator.calculateUserPointsFromCheckins('integration-user-123');
      const directPubs = dataAggregator.getPubsVisitedForUser('integration-user-123', []); // No manual pubs
      
      const userStorePoints = userStore.totalPoints();
      const userStorePubs = userStore.pubsVisited();
      const scoreboardData = userStore.scoreboardData();
      const leaderboardEntries = leaderboardStore.leaderboardEntries();
      const leaderboardEntry = leaderboardEntries.find(e => e.userId === 'integration-user-123');
      
      // CRITICAL: Must not be "2 pubs, 2 check-ins, but 0 points" across ANY service
      [directPoints, userStorePoints, scoreboardData.totalPoints, leaderboardEntry?.totalPoints].forEach((points, index) => {
        const serviceNames = ['DataAggregator', 'UserStore', 'Scoreboard', 'Leaderboard'];
        console.log(`🔍 ${serviceNames[index]} points:`, points);
        expect(points).toBe(60); // 35 + 25, NOT 0!
      });
      
      [directPubs, userStorePubs, scoreboardData.pubsVisited, leaderboardEntry?.uniquePubs].forEach((pubs, index) => {
        const serviceNames = ['DataAggregator', 'UserStore', 'Scoreboard', 'Leaderboard'];
        console.log(`🔍 ${serviceNames[index]} pubs:`, pubs);
        expect(pubs).toBe(2); // 2 unique pubs from check-ins only
      });
      
      [scoreboardData.totalCheckins, leaderboardEntry?.totalCheckins].forEach((checkins, index) => {
        const serviceNames = ['Scoreboard', 'Leaderboard'];
        console.log(`🔍 ${serviceNames[index]} checkins:`, checkins);
        expect(checkins).toBe(2); // 2 check-ins
      });
      
      console.log('✅ REGRESSION PREVENTION SUCCESS: No service shows "0 points" bug');
    });

    it('SMOKE: Should ignore user document totalPoints across ALL services', () => {
      // Create a user with ridiculously high fake points in the user document
      const fakePointsUser = createTestUser({
        uid: 'fake-points-integration-user',
        displayName: 'Fake Points User',
        totalPoints: 5000000, // Ridiculous fake points
      });
      
      // Add user with NO check-ins (so reactive calculation should return 0)
      mockUserService._setUsers([...testUsers, fakePointsUser]);
      userStore._data.set([...testUsers, fakePointsUser]);
      
      // Test across all services
      const directPoints = dataAggregator.calculateUserPointsFromCheckins('fake-points-integration-user');
      
      // UserStore can't be tested directly since it requires auth user change
      // But leaderboard should show this user
      const leaderboardEntries = leaderboardStore.leaderboardEntries();
      const fakePointsEntry = leaderboardEntries.find(e => e.userId === 'fake-points-integration-user');
      
      // CRITICAL: Must show 0 points (from reactive calculation), NOT 5000000 from user doc
      expect(directPoints).toBe(0);
      expect(fakePointsEntry?.totalPoints).toBe(0);
      
      console.log('✅ USER DOCUMENT IGNORED SUCCESS: Reactive calculation overrides user document');
    });

    it('SMOKE: Should maintain consistency when check-ins are updated', () => {
      // Initial state
      const initialDirectPoints = dataAggregator.calculateUserPointsFromCheckins('integration-user-123');
      const initialUserStorePoints = userStore.totalPoints();
      
      console.log('Initial points:', { direct: initialDirectPoints, userStore: initialUserStorePoints });
      
      // Add new check-in
      const updatedCheckIns = [
        ...testCheckIns,
        createTestCheckIn({
          userId: 'integration-user-123',
          pubId: 'new-integration-pub',
          pointsEarned: 15,
          timestamp: {
            toMillis: () => Date.now() - 86400000,
            toDate: () => new Date(Date.now() - 86400000)
          }
        }),
      ];
      
      // Update data sources
      mockGlobalCheckInStore._setCheckIns(updatedCheckIns);
      mockCheckInService._setCheckIns(updatedCheckIns);
      
      // All services should reflect the change
      const updatedDirectPoints = dataAggregator.calculateUserPointsFromCheckins('integration-user-123');
      const updatedUserStorePoints = userStore.totalPoints();
      const updatedScoreboardData = userStore.scoreboardData();
      const updatedLeaderboardEntries = leaderboardStore.leaderboardEntries();
      const updatedLeaderboardEntry = updatedLeaderboardEntries.find(e => e.userId === 'integration-user-123');
      
      // Should now show 80 points (65 + 15)
      expect(updatedDirectPoints).toBe(80);
      expect(updatedUserStorePoints).toBe(80);
      expect(updatedScoreboardData.totalPoints).toBe(80);
      expect(updatedLeaderboardEntry?.totalPoints).toBe(80);
      
      console.log('✅ CONSISTENCY UPDATE SUCCESS: All services reflect check-in updates');
    });
  });

  describe('⚡ Performance & Scale Integration Tests', () => {
    it('INTEGRATION: Should handle multiple users efficiently across all services', () => {
      // Create 10 users with varying check-ins
      const manyUsers = Array.from({ length: 10 }, (_, i) => 
        createTestUser({
          uid: `perf-user-${i}`,
          displayName: `Perf User ${i}`,
          manuallyAddedPubIds: [`manual-${i}-a`, `manual-${i}-b`],
          totalPoints: 1000 + i, // Should be ignored
          realUser: true,
        })
      );
      
      const manyCheckIns = Array.from({ length: 50 }, (_, i) => 
        createTestCheckIn({
          userId: `perf-user-${i % 10}`, // Distribute across 10 users
          pubId: `perf-pub-${i}`,
          pointsEarned: 10 + (i % 20), // Varying points
          timestamp: {
            toMillis: () => Date.now() - 86400000 - (i * 60000),
            toDate: () => new Date(Date.now() - 86400000 - (i * 60000))
          }
        })
      );
      
      // Update data sources
      mockUserService._setUsers(manyUsers);
      userStore._data.set(manyUsers);
      mockGlobalCheckInStore._setCheckIns(manyCheckIns);
      mockCheckInService._setCheckIns(manyCheckIns);
      
      const startTime = Date.now();
      
      // Test DataAggregatorService performance
      const allUserPoints = manyUsers.map(user => 
        dataAggregator.calculateUserPointsFromCheckins(user.uid)
      );
      
      // Test LeaderboardStore performance
      const leaderboardEntries = leaderboardStore.leaderboardEntries();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Verify correctness
      expect(allUserPoints.length).toBe(10);
      expect(leaderboardEntries.length).toBe(10);
      expect(allUserPoints.every(points => points > 0)).toBe(true); // All users should have points from check-ins
      
      // Verify performance (should be fast)
      expect(duration).toBeLessThan(100); // Should complete in under 100ms
      
      console.log(`✅ PERFORMANCE SUCCESS: Handled ${manyUsers.length} users and ${manyCheckIns.length} check-ins in ${duration}ms`);
    });
    
    it('INTEGRATION: Should maintain accuracy with complex deduplication scenarios', () => {
      // User with overlapping manual and verified pubs
      const complexUser = createTestUser({
        uid: 'complex-dedup-user',
        displayName: 'Complex Dedup User',
        manuallyAddedPubIds: ['verified-pub-x', 'verified-pub-y', 'unique-manual-pub'], // 2 overlap with verified, 1 unique
      });
      
      const complexCheckIns = [
        createTestCheckIn({
          userId: 'complex-dedup-user',
          pubId: 'verified-pub-x', // Will overlap with manual
          pointsEarned: 25,
          timestamp: {
            toMillis: () => Date.now() - 86400000,
            toDate: () => new Date(Date.now() - 86400000)
          }
        }),
        createTestCheckIn({
          userId: 'complex-dedup-user',
          pubId: 'verified-pub-y', // Will overlap with manual  
          pointsEarned: 30,
          timestamp: {
            toMillis: () => Date.now() - 86400000,
            toDate: () => new Date(Date.now() - 86400000)
          }
        }),
        createTestCheckIn({
          userId: 'complex-dedup-user',
          pubId: 'unique-verified-pub', // Unique verified pub
          pointsEarned: 15,
          timestamp: {
            toMillis: () => Date.now() - 86400000,
            toDate: () => new Date(Date.now() - 86400000)
          }
        }),
      ];
      
      // Update data sources
      mockUserService._setUsers([...testUsers, complexUser]);
      userStore._data.set([...testUsers, complexUser]);
      mockGlobalCheckInStore._setCheckIns([...testCheckIns, ...complexCheckIns]);
      mockCheckInService._setCheckIns([...testCheckIns, ...complexCheckIns]);
      
      // Test deduplication across all services
      const directPubs = dataAggregator.getPubsVisitedForUser('complex-dedup-user', complexUser.manuallyAddedPubIds || []);
      const leaderboardEntries = leaderboardStore.leaderboardEntries();
      const complexEntry = leaderboardEntries.find(e => e.userId === 'complex-dedup-user');
      
      // Should deduplicate correctly:
      // Verified: verified-pub-x, verified-pub-y, unique-verified-pub (3)
      // Manual: verified-pub-x, verified-pub-y, unique-manual-pub (3, but 2 overlap)
      // Unique total: verified-pub-x, verified-pub-y, unique-verified-pub, unique-manual-pub (4)
      expect(directPubs).toBe(4);
      expect(complexEntry?.uniquePubs).toBe(4);
      
      // Points should be 70 (25 + 30 + 15)
      const directPoints = dataAggregator.calculateUserPointsFromCheckins('complex-dedup-user');
      expect(directPoints).toBe(70);
      expect(complexEntry?.totalPoints).toBe(70);
      
      console.log('✅ COMPLEX DEDUPLICATION SUCCESS: All services handle overlapping pubs correctly');
    });
  });

  describe('🔧 Error Handling Integration Tests', () => {
    it('INTEGRATION: Should handle malformed data gracefully across all services', () => {
      const malformedCheckIns = [
        createTestCheckIn({
          userId: 'integration-user-123',
          pubId: null, // Malformed pub ID
          pointsEarned: 25,
          timestamp: {
            toMillis: () => Date.now() - 86400000,
            toDate: () => new Date(Date.now() - 86400000)
          }
        }),
        createTestCheckIn({
          userId: 'integration-user-123',
          pubId: 'valid-pub',
          pointsEarned: undefined, // Malformed points
          pointsBreakdown: { total: 30 }, // Should fallback to this
          timestamp: {
            toMillis: () => Date.now() - 86400000,
            toDate: () => new Date(Date.now() - 86400000)
          }
        }),
        createTestCheckIn({
          userId: 'integration-user-123',
          pubId: 'another-valid-pub',
          pointsEarned: null, // Another malformed points
          pointsBreakdown: null, // No fallback
          timestamp: {
            toMillis: () => Date.now() - 86400000,
            toDate: () => new Date(Date.now() - 86400000)
          }
        }),
      ];
      
      // Update data sources with malformed data
      mockGlobalCheckInStore._setCheckIns(malformedCheckIns);
      mockCheckInService._setCheckIns(malformedCheckIns);
      
      // Should not crash and should handle gracefully
      expect(() => {
        const directPoints = dataAggregator.calculateUserPointsFromCheckins('integration-user-123');
        const directPubs = dataAggregator.getPubsVisitedForUser('integration-user-123', ['manual-pub-a', 'manual-pub-b']); // Include manual pubs
        const userStorePoints = userStore.totalPoints();
        const userStorePubs = userStore.pubsVisited();
        const leaderboardEntries = leaderboardStore.leaderboardEntries();
        
        // Should be 55 points: 25 (pointsEarned) + 30 (from breakdown) + 0 (null/null fallback)
        expect(directPoints).toBe(55);
        expect(userStorePoints).toBe(55);
        
        // Should count valid pub IDs + manual pubs: 'valid-pub' and 'another-valid-pub' (2) + manual pubs (2) = 4
        expect(directPubs).toBe(4);
        expect(userStorePubs).toBe(4);
        
        // Should not crash leaderboard
        expect(leaderboardEntries.length).toBeGreaterThanOrEqual(0);
      }).not.toThrow();
      
      console.log('✅ ERROR HANDLING SUCCESS: All services handle malformed data gracefully');
    });
  });
});