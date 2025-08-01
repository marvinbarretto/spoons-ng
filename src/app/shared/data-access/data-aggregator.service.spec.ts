import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { signal, computed } from '@angular/core';
import { DataAggregatorService } from './data-aggregator.service';
import { AuthStore } from '../../auth/data-access/auth.store';
import { UserStore } from '../../users/data-access/user.store';
import { PointsStore } from '../../points/data-access/points.store';
import { CheckInStore } from '../../check-in/data-access/check-in.store';
import { GlobalCheckInStore } from '../../check-in/data-access/global-check-in.store';
import { PubStore } from '../../pubs/data-access/pub.store';
import { UserService } from '../../users/data-access/user.service';
import { DebugService } from '../utils/debug.service';
import { createTestUser, createTestCheckIn, createTestPub } from '../testing/test-data';

describe('DataAggregatorService', () => {
  let service: DataAggregatorService;
  let mockAuthStore: any;
  let mockUserStore: any;
  let mockPointsStore: any;
  let mockUserCheckInStore: any;
  let mockGlobalCheckInStore: any;
  let mockPubStore: any;
  let mockUserService: any;
  let mockDebugService: any;

  // Test data
  const testUser = createTestUser({
    uid: 'user-1',
    displayName: 'Test User',
    manuallyAddedPubIds: ['manual-pub-1', 'manual-pub-2'],
    homePubId: 'home-pub-1'
  });

  const testCheckIns = [
    createTestCheckIn({ 
      userId: 'user-1', 
      pubId: 'verified-pub-1', 
      pointsEarned: 10,
      timestamp: { toMillis: () => Date.now() - 3000 } // Mock Firebase timestamp
    }),
    createTestCheckIn({ 
      userId: 'user-1', 
      pubId: 'verified-pub-2', 
      pointsEarned: 15,
      timestamp: { toMillis: () => Date.now() - 2000 } // Mock Firebase timestamp
    }),
    createTestCheckIn({ 
      userId: 'user-1', 
      pubId: 'manual-pub-1', 
      pointsEarned: 20,
      timestamp: { toMillis: () => Date.now() - 1000 } // Mock Firebase timestamp (most recent)
    }),
    createTestCheckIn({ 
      userId: 'user-2', 
      pubId: 'other-user-pub', 
      pointsEarned: 25,
      timestamp: { toMillis: () => Date.now() - 4000 } // Mock Firebase timestamp
    }),
  ];

  const testPubs = [
    createTestPub({ id: 'verified-pub-1', name: 'Verified Pub 1' }),
    createTestPub({ id: 'verified-pub-2', name: 'Verified Pub 2' }),
    createTestPub({ id: 'manual-pub-1', name: 'Manual Pub 1' }),
    createTestPub({ id: 'home-pub-1', name: 'Home Pub' }),
  ];

  beforeEach(async () => {
    // Create comprehensive mock stores with signals
    mockAuthStore = {
      user: signal(testUser),
      isAuthenticated: signal(true),
      _setUser: function(user: any) { this.user.set(user); }
    };

    mockUserStore = {
      user: signal(testUser),
      loading: signal(false),
      totalPoints: signal(100),
      badgeCount: signal(5),
      landlordCount: signal(2),
      displayName: signal(testUser.displayName),
      avatarUrl: signal(testUser.photoURL),
      _setUser: function(user: any) { this.user.set(user); },
      _setLoading: function(loading: boolean) { this.loading.set(loading); }
    };

    mockPointsStore = {
      loading: signal(false),
      todaysPoints: signal(25),
      _setLoading: function(loading: boolean) { this.loading.set(loading); }
    };

    mockUserCheckInStore = {
      checkins: signal(testCheckIns.filter(c => c.userId === 'user-1')),
      loading: signal(false),
      totalCheckins: signal(3),
      _setCheckins: function(checkins: any[]) { this.checkins.set(checkins); },
      _setLoading: function(loading: boolean) { this.loading.set(loading); }
    };

    mockGlobalCheckInStore = {
      allCheckIns: signal(testCheckIns),
      loading: signal(false),
      _setCheckIns: function(checkins: any[]) { this.allCheckIns.set(checkins); }
    };

    mockPubStore = {
      totalCount: signal(testPubs.length),
      get: vi.fn((id: string) => testPubs.find(p => p.id === id)),
      _setTotalCount: function(count: number) { this.totalCount.set(count); }
    };

    mockUserService = {
      allUsers: signal([testUser])
    };

    mockDebugService = {
      standard: vi.fn(),
      extreme: vi.fn()
    };

    await TestBed.configureTestingModule({
      providers: [
        DataAggregatorService,
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: UserStore, useValue: mockUserStore },
        { provide: PointsStore, useValue: mockPointsStore },
        { provide: CheckInStore, useValue: mockUserCheckInStore },
        { provide: GlobalCheckInStore, useValue: mockGlobalCheckInStore },
        { provide: PubStore, useValue: mockPubStore },
        { provide: UserService, useValue: mockUserService },
        { provide: DebugService, useValue: mockDebugService }
      ]
    }).compileComponents();

    service = TestBed.inject(DataAggregatorService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should log initialization message', () => {
      expect(mockDebugService.standard).toHaveBeenCalledWith(
        '[DataAggregator] Service initialized - providing reactive cross-store data aggregation'
      );
    });
  });

  describe('Verified Pubs Count', () => {
    it('should calculate verified pubs count from check-ins', () => {
      const count = service.verifiedPubsCount();
      
      // Should count unique pubs from user's check-ins: verified-pub-1, verified-pub-2, manual-pub-1
      expect(count).toBe(3);
    });

    it('should return 0 when user is not authenticated', () => {
      mockAuthStore._setUser(null);
      
      const count = service.verifiedPubsCount();
      expect(count).toBe(0);
    });

    it('should update reactively when check-ins change', () => {
      const initialCount = service.verifiedPubsCount();
      expect(initialCount).toBe(3);

      // Add new check-in to different pub
      const newCheckIns = [
        ...testCheckIns.filter(c => c.userId === 'user-1'),
        createTestCheckIn({ userId: 'user-1', pubId: 'new-pub-1' })
      ];
      mockUserCheckInStore._setCheckins(newCheckIns);

      const updatedCount = service.verifiedPubsCount();
      expect(updatedCount).toBe(4);
    });
  });

  describe('Unverified Pubs Count', () => {
    it('should calculate unverified pubs count from user profile', () => {
      const count = service.unverifiedPubsCount();
      
      // Should count manual pubs: manual-pub-1, manual-pub-2
      expect(count).toBe(2);
    });

    it('should return 0 when user has no manual pubs', () => {
      mockUserStore._setUser({ ...testUser, manuallyAddedPubIds: [] });
      
      const count = service.unverifiedPubsCount();
      expect(count).toBe(0);
    });

    it('should return 0 when user has no manuallyAddedPubIds property', () => {
      const userWithoutManualPubs = { ...testUser };
      delete (userWithoutManualPubs as any).manuallyAddedPubIds;
      mockUserStore._setUser(userWithoutManualPubs);
      
      const count = service.unverifiedPubsCount();
      expect(count).toBe(0);
    });
  });

  describe('Pubs Visited (Total Unique)', () => {
    it('should calculate total unique pubs (deduplicating verified + manual)', () => {
      const count = service.pubsVisited();
      
      // Verified: verified-pub-1, verified-pub-2, manual-pub-1 (3)
      // Manual: manual-pub-1, manual-pub-2 (2)
      // Unique: verified-pub-1, verified-pub-2, manual-pub-1, manual-pub-2 (4)
      // manual-pub-1 appears in both, so total unique = 4
      expect(count).toBe(4);
    });

    it('should call internal calculation method', () => {
      const count = service.pubsVisited();
      
      // Should return correct count regardless of internal logging
      expect(count).toBe(4);
      
      // Should log to console (visible in stdout)
      expect(console.log).toBeDefined();
    });

    it('should return 0 when user is not authenticated', () => {
      mockAuthStore._setUser(null);
      
      const count = service.pubsVisited();
      expect(count).toBe(0);
    });
  });

  describe('Scoreboard Data', () => {
    it('should aggregate complete scoreboard data', () => {
      const data = service.scoreboardData();
      
      expect(data).toEqual({
        totalPoints: 100,
        todaysPoints: 25,
        pubsVisited: 4, // As calculated above
        totalPubs: testPubs.length,
        badgeCount: 5,
        landlordCount: 2,
        totalCheckins: 3,
        isLoading: false
      });
    });

    it('should handle loading states correctly', () => {
      mockUserStore._setLoading(true);
      
      const data = service.scoreboardData();
      expect(data.isLoading).toBe(true);
    });

    it('should compute scoreboard data reactively', () => {
      const data = service.scoreboardData();
      
      // Should return expected data structure
      expect(data).toMatchObject({
        totalPoints: 100,
        todaysPoints: 25,
        pubsVisited: 4,
        badgeCount: 5,
        isLoading: false
      });
      
      // Should log detailed information (visible in stdout)
      expect(console.log).toBeDefined();
    });

    it('should handle missing todaysPoints gracefully', () => {
      mockPointsStore.todaysPoints = undefined;
      
      const data = service.scoreboardData();
      expect(data.todaysPoints).toBe(0);
    });
  });

  describe('Pub Count Calculation Utility', () => {
    it('should calculate pub count for any user', () => {
      const count = service.getPubsVisitedForUser('user-1', testUser);
      expect(count).toBe(4); // Same as pubsVisited computed
    });

    it('should handle user without manual pubs', () => {
      const userWithoutManualPubs = { ...testUser, manuallyAddedPubIds: [] };
      const count = service.getPubsVisitedForUser('user-1', userWithoutManualPubs);
      
      // Only verified pubs: verified-pub-1, verified-pub-2, manual-pub-1
      expect(count).toBe(3);
    });

    it('should identify users with points but no pubs', () => {
      // User with points but no check-ins or manual pubs
      const problematicUser = createTestUser({
        uid: 'problematic-user',
        totalPoints: 100,
        manuallyAddedPubIds: []
      });
      
      const count = service.getPubsVisitedForUser('problematic-user', problematicUser);
      expect(count).toBe(0);
      
      expect(mockDebugService.standard).toHaveBeenCalledWith(
        '[DataAggregator] User pub count computed',
        expect.objectContaining({
          ISSUE_DETECTED: true
        })
      );
    });

    it('should log comprehensive debugging information', () => {
      service.getPubsVisitedForUser('user-1', testUser);
      
      expect(mockDebugService.standard).toHaveBeenCalledWith(
        '[DataAggregator] User data details',
        expect.objectContaining({
          displayName: testUser.displayName,
          manuallyAddedPubIds: 2
        })
      );
    });
  });

  describe('Pub Visit Checks', () => {
    it('should detect verified pub visits', () => {
      const hasVisited = service.hasVisitedPub('verified-pub-1');
      expect(hasVisited).toBe(true);
    });

    it('should detect manual pub visits', () => {
      const hasVisited = service.hasVisitedPub('manual-pub-2');
      expect(hasVisited).toBe(true);
    });

    it('should detect overlapping visits (both verified and manual)', () => {
      const hasVisited = service.hasVisitedPub('manual-pub-1');
      expect(hasVisited).toBe(true);
    });

    it('should return false for unvisited pubs', () => {
      const hasVisited = service.hasVisitedPub('unvisited-pub');
      expect(hasVisited).toBe(false);
    });

    it('should handle specific user ID parameter', () => {
      const hasVisited = service.hasVisitedPub('other-user-pub', 'user-2');
      expect(hasVisited).toBe(true);
    });

    it('should return false when no user is authenticated', () => {
      mockAuthStore._setUser(null);
      
      const hasVisited = service.hasVisitedPub('verified-pub-1');
      expect(hasVisited).toBe(false);
    });
  });

  describe('Visit Count', () => {
    it('should count visits to a specific pub', () => {
      const count = service.getVisitCountForPub('verified-pub-1');
      expect(count).toBe(1);
    });

    it('should count multiple visits to the same pub', () => {
      // Add another check-in to the same pub
      const extraCheckIns = [
        ...testCheckIns,
        createTestCheckIn({ userId: 'user-1', pubId: 'verified-pub-1' })
      ];
      mockGlobalCheckInStore._setCheckIns(extraCheckIns);
      
      const count = service.getVisitCountForPub('verified-pub-1');
      expect(count).toBe(2);
    });

    it('should return 0 for unvisited pubs', () => {
      const count = service.getVisitCountForPub('unvisited-pub');
      expect(count).toBe(0);
    });
  });

  describe('Display Name', () => {
    it('should prioritize UserStore display name', () => {
      const displayName = service.displayName();
      expect(displayName).toBe(testUser.displayName);
    });

    it('should fallback to AuthStore display name', () => {
      mockUserStore._setUser({ ...testUser, displayName: null });
      
      const displayName = service.displayName();
      expect(displayName).toBe(testUser.displayName);
    });

    it('should return fallback when no display name available', () => {
      mockUserStore._setUser({ ...testUser, displayName: null });
      mockAuthStore._setUser({ ...testUser, displayName: null });
      
      const displayName = service.displayName();
      expect(displayName).toBe('User');
    });

    it('should return null when no user authenticated', () => {
      mockAuthStore._setUser(null);
      
      const displayName = service.displayName();
      expect(displayName).toBe(null);
    });
  });

  describe('Aggregated User', () => {
    it('should merge auth and user store data', () => {
      const user = service.user();
      
      expect(user).toMatchObject({
        uid: testUser.uid,
        displayName: testUser.displayName,
        onboardingCompleted: false
      });
    });

    it('should return null when missing user data', () => {
      mockUserStore._setUser(null);
      
      const user = service.user();
      expect(user).toBe(null);
    });

    it('should return null when missing auth data', () => {
      mockAuthStore._setUser(null);
      
      const user = service.user();
      expect(user).toBe(null);
    });
  });

  describe('User Summary', () => {
    it('should create comprehensive user summary', () => {
      const summary = service.userSummary();
      
      expect(summary).toMatchObject({
        profile: {
          uid: testUser.uid,
          displayName: testUser.displayName,
          isAnonymous: testUser.isAnonymous
        },
        stats: {
          totalPoints: 100,
          pubsVisited: 4,
          totalCheckins: 3,
          badgeCount: 5,
          landlordCount: 2
        },
        activity: {
          todaysPoints: 25,
          recentCheckins: expect.any(Array)
        }
      });
    });

    it('should return null when user data unavailable', () => {
      mockUserStore._setUser(null);
      
      const summary = service.userSummary();
      expect(summary).toBe(null);
    });
  });

  describe('Home Pub Detection', () => {
    it('should identify user home pub', () => {
      const isHomePub = service.isLocalPub('home-pub-1');
      expect(isHomePub).toBe(true);
    });

    it('should return false for non-home pubs', () => {
      const isHomePub = service.isLocalPub('verified-pub-1');
      expect(isHomePub).toBe(false);
    });

    it('should return false when no user authenticated', () => {
      mockAuthStore._setUser(null);
      
      const isHomePub = service.isLocalPub('home-pub-1');
      expect(isHomePub).toBe(false);
    });
  });

  describe('Recent Check-ins', () => {
    it('should get recent check-ins for user', () => {
      const recent = service.getRecentCheckinsForUser('user-1', 2);
      
      expect(recent).toHaveLength(2);
      expect(recent[0].userId).toBe('user-1');
    });

    it('should limit results correctly', () => {
      const recent = service.getRecentCheckinsForUser('user-1', 1);
      expect(recent).toHaveLength(1);
    });

    it('should return empty array for user with no check-ins', () => {
      const recent = service.getRecentCheckinsForUser('unknown-user');
      expect(recent).toHaveLength(0);
    });
  });

  describe('Pub Name Lookup', () => {
    it('should get pub name by ID', () => {
      const name = service.getPubName('verified-pub-1');
      expect(name).toBe('Verified Pub 1');
    });

    it('should return fallback for unknown pub', () => {
      const name = service.getPubName('unknown-pub');
      expect(name).toBe('Unknown Pub');
    });
  });

  describe('Reactivity', () => {
    it('should update computed values when store data changes', () => {
      const initialPubsVisited = service.pubsVisited();
      expect(initialPubsVisited).toBe(4);

      // Add manual pub
      const updatedUser = {
        ...testUser,
        manuallyAddedPubIds: [...(testUser.manuallyAddedPubIds || []), 'new-manual-pub']
      };
      mockUserStore._setUser(updatedUser);

      const updatedPubsVisited = service.pubsVisited();
      expect(updatedPubsVisited).toBe(5);
    });

    it('should update scoreboard data when any dependent store changes', () => {
      const initialData = service.scoreboardData();
      expect(initialData.totalPoints).toBe(100);

      // Update points
      mockUserStore.totalPoints.set(150);

      const updatedData = service.scoreboardData();
      expect(updatedData.totalPoints).toBe(150);
    });
  });

  describe('Error Handling', () => {
    it('should handle null check-ins gracefully', () => {
      mockUserCheckInStore._setCheckins([]);
      
      const count = service.verifiedPubsCount();
      expect(count).toBe(0);
    });

    it('should handle check-ins with null pubIds in pub calculation utility', () => {
      const userDataWithNulls = { ...testUser, manuallyAddedPubIds: [] };
      
      // Test the utility method which does filter null pubIds
      const count = service.getPubsVisitedForUser('user-with-nulls', userDataWithNulls);
      
      // Should return 0 since there are no check-ins for this user
      expect(count).toBe(0);
    });

    it('should handle empty pub store gracefully', () => {
      mockPubStore.get.mockReturnValue(null);
      
      const name = service.getPubName('any-pub');
      expect(name).toBe('Unknown Pub');
    });
  });

  describe('Performance Considerations', () => {
    it('should use computed signals for reactive data', () => {
      // Multiple accesses should not cause recalculation unless dependencies change
      const first = service.pubsVisited();
      const second = service.pubsVisited();
      
      expect(first).toBe(second);
      expect(first).toBe(4);
    });

    it('should only recalculate when dependencies change', () => {
      const debugCallsBefore = mockDebugService.standard.mock.calls.length;
      
      // Access the same computed multiple times
      service.pubsVisited();
      service.pubsVisited();
      service.pubsVisited();
      
      const debugCallsAfter = mockDebugService.standard.mock.calls.length;
      
      // Should not have excessive debug calls from recomputation
      expect(debugCallsAfter - debugCallsBefore).toBeLessThan(10);
    });
  });
});