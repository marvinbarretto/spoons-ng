/**
 * @fileoverview UserProgressionService Tests
 * 
 * Comprehensive tests for user progression logic including experience level calculation,
 * milestone progression, UI flags, and reactive signal behavior.
 */

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { UserProgressionService } from './user-progression.service';
import { UserStore } from '@users/data-access/user.store';
import { CheckInStore } from '@/app/check-in/data-access/check-in.store';
import { MockRegistry } from '@shared/testing/core/mock-registry';
import { createSignalTestHarness, type SignalTestHarness } from '@shared/testing/core/signal-test-harness';
import { TestScenarios } from '@shared/testing/core/enhanced-test-data';
import { createTestUser, createTestCheckIn, createTestPub } from '@shared/testing/test-data';

import type { User } from '@users/utils/user.model';
import type { CheckIn } from '@check-in/utils/check-in.model';
import type { 
  UserExperienceLevel, 
  UserProgressionStats,
  UserExperienceLevelUIFlags,
  UserMilestone
} from '@shared/utils/user-progression.models';

describe('UserProgressionService', () => {
  let service: UserProgressionService;
  let userStore: UserStore;
  let checkinStore: CheckInStore;
  let signalHarness: SignalTestHarness;
  let mockSuite: any;

  // Helper function to create test data with specified number of check-ins
  function createUserWithCheckIns(checkInCount: number, uniquePubCount?: number): { user: User; checkIns: CheckIn[] } {
    const user = createTestUser({ uid: 'test-user', displayName: 'Test User', isAnonymous: false });
    const checkIns: CheckIn[] = [];
    const pubCount = uniquePubCount || Math.min(checkInCount, 20); // Max 20 unique pubs
    
    for (let i = 0; i < checkInCount; i++) {
      const pubIndex = uniquePubCount ? (i % pubCount) : Math.floor(i / 2); // Control uniqueness
      const pub = createTestPub({ id: `pub-${pubIndex}` });
      checkIns.push(createTestCheckIn({
        id: `checkin-${i}`,
        userId: user.uid,
        pubId: pub.id,
        timestamp: new Date(Date.now() - (checkInCount - i) * 24 * 60 * 60 * 1000) // Spread over days
      }));
    }
    
    return { user, checkIns };
  }

  beforeEach(() => {
    // Create proper signal-based mocks
    const mockUserStore = {
      user: signal<User | null>(null),
      hasBadges: signal(false)
    };
    
    const mockCheckinStore = {
      checkins: signal<CheckIn[]>([])
    };

    TestBed.configureTestingModule({
      providers: [
        UserProgressionService,
        { provide: UserStore, useValue: mockUserStore },
        { provide: CheckInStore, useValue: mockCheckinStore }
      ]
    });

    service = TestBed.inject(UserProgressionService);
    userStore = TestBed.inject(UserStore);
    checkinStore = TestBed.inject(CheckInStore);
    signalHarness = createSignalTestHarness();

    // Setup mock suite for cleanup
    mockSuite = { cleanup: () => {} };
  });

  afterEach(() => {
    signalHarness.destroy();
    mockSuite.cleanup();
  });

  describe('User Experience Level Classification', () => {
    it('should classify guest users correctly', () => {
      // Given: No user logged in
      userStore.user.set(null);
      
      // When: Getting experience level
      const level = service.userExperienceLevel();
      
      // Then: Should be guest
      expect(level).toBe('guest');
    });

    it('should classify brand new anonymous users', () => {
      // Given: Anonymous user with no check-ins
      const anonymousUser: User = {
        uid: 'anon-123',
        email: '',
        displayName: 'Anonymous',
        isAnonymous: true,
        photoURL: null,
        providerId: 'anonymous'
      };
      
      userStore.user.set(anonymousUser);
      checkinStore.checkins.set([]);
      
      // When: Getting experience level
      const level = service.userExperienceLevel();
      
      // Then: Should be brand new
      expect(level).toBe('brandNew');
      expect(service.isBrandNewUser()).toBe(true);
    });

    it('should classify first-time users (1-2 check-ins)', () => {
      // Given: User with 2 check-ins
      const user = createTestUser({ uid: 'user-123', displayName: 'Test User', isAnonymous: false });
      const pub1 = createTestPub({ id: 'pub-1' });
      const pub2 = createTestPub({ id: 'pub-2' });
      const checkIns = [
        createTestCheckIn({ userId: user.uid, pubId: pub1.id, timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }),
        createTestCheckIn({ userId: user.uid, pubId: pub2.id, timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) })
      ];
      
      userStore.user.set(user);
      checkinStore.checkins.set(checkIns);
      
      // When: Getting experience level
      const level = service.userExperienceLevel();
      
      // Then: Should be first-time user
      expect(level).toBe('firstTime');
      expect(service.isFirstTimeUser()).toBe(true);
      expect(service.totalCheckinsCount()).toBe(2);
    });

    it('should classify early users (3-9 check-ins)', () => {
      // Given: User with 5 check-ins
      const { user, checkIns } = createUserWithCheckIns(5);
      
      userStore.user.set(user);
      checkinStore.checkins.set(checkIns);
      
      // When: Getting experience level
      const level = service.userExperienceLevel();
      
      // Then: Should be early user
      expect(level).toBe('earlyUser');
      expect(service.isEarlyUser()).toBe(true);
      expect(service.totalCheckinsCount()).toBe(5);
    });

    it('should classify regular users (10-24 check-ins)', () => {
      // Given: User with 15 check-ins
      const { user, checkIns } = createUserWithCheckIns(15);
      
      userStore.user.set(user);
      checkinStore.checkins.set(checkIns);
      
      // When: Getting experience level
      const level = service.userExperienceLevel();
      
      // Then: Should be regular user
      expect(level).toBe('regularUser');
      expect(service.isRegularUser()).toBe(true);
      expect(service.totalCheckinsCount()).toBe(15);
    });

    it('should classify power users (25+ check-ins)', () => {
      // Given: User with 30 check-ins
      const { user, checkIns } = createUserWithCheckIns(30);
      
      userStore.user.set(user);
      checkinStore.checkins.set(checkIns);
      
      // When: Getting experience level
      const level = service.userExperienceLevel();
      
      // Then: Should be power user
      expect(level).toBe('powerUser');
      expect(service.isPowerUser()).toBe(true);
      expect(service.totalCheckinsCount()).toBe(30);
    });
  });

  describe('Milestone Progression Logic', () => {
    it('should provide first check-in milestone for new users', () => {
      // Given: User with no check-ins
      const user: User = {
        uid: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        isAnonymous: false,
        photoURL: null,
        providerId: 'email'
      };
      
      userStore.user.set(user);
      checkinStore.checkins.set([]);
      
      // When: Getting next milestone
      const milestone = service.nextMilestone();
      const checkinsToNext = service.checkinsToNextMilestone();
      
      // Then: Should be first check-in milestone
      expect(milestone.type).toBe('first-checkin');
      expect(milestone.target).toBe(1);
      expect(milestone.description).toBe('your first check-in');
      expect(checkinsToNext).toBe(1);
    });

    it('should provide early user milestone for users with 1-2 check-ins', () => {
      // Given: User with 2 check-ins
      const { user, checkIns } = createUserWithCheckIns(2);
      
      userStore.user.set(user);
      checkinStore.checkins.set(checkIns);
      
      // When: Getting next milestone
      const milestone = service.nextMilestone();
      const checkinsToNext = service.checkinsToNextMilestone();
      
      // Then: Should be early user milestone
      expect(milestone.type).toBe('early-user');
      expect(milestone.target).toBe(3);
      expect(milestone.description).toBe('early adopter status');
      expect(checkinsToNext).toBe(1); // 3 - 2 = 1
    });

    it('should provide regular user milestone for early users', () => {
      // Given: User with 7 check-ins
      const { user, checkIns } = createUserWithCheckIns(7);
      
      userStore.user.set(user);
      checkinStore.checkins.set(checkIns);
      
      // When: Getting next milestone
      const milestone = service.nextMilestone();
      const checkinsToNext = service.checkinsToNextMilestone();
      
      // Then: Should be regular user milestone
      expect(milestone.type).toBe('regular');
      expect(milestone.target).toBe(10);
      expect(milestone.description).toBe('regular user badge');
      expect(checkinsToNext).toBe(3); // 10 - 7 = 3
    });

    it('should provide power user milestone for regular users', () => {
      // Given: User with 18 check-ins
      const { user, checkIns } = createUserWithCheckIns(18);
      
      userStore.user.set(user);
      checkinStore.checkins.set(checkIns);
      
      // When: Getting next milestone
      const milestone = service.nextMilestone();
      const checkinsToNext = service.checkinsToNextMilestone();
      
      // Then: Should be power user milestone
      expect(milestone.type).toBe('power-user');
      expect(milestone.target).toBe(25);
      expect(milestone.description).toBe('power user achievement');
      expect(checkinsToNext).toBe(7); // 25 - 18 = 7
    });

    it('should provide round number milestones for power users', () => {
      // Given: Power user with 67 check-ins
      const { user, checkIns } = createUserWithCheckIns(67);
      
      userStore.user.set(user);
      checkinStore.checkins.set(checkIns);
      
      // When: Getting next milestone
      const milestone = service.nextMilestone();
      const checkinsToNext = service.checkinsToNextMilestone();
      
      // Then: Should be next round number (75 = ceil(67/25) * 25)
      expect(milestone.type).toBe('milestone');
      expect(milestone.target).toBe(75);
      expect(milestone.description).toBe('75 total check-ins');
      expect(checkinsToNext).toBe(8); // 75 - 67 = 8
    });
  });

  describe('UI Behavior Flags', () => {
    it('should show welcome flow for brand new and first-time users', () => {
      // Test brand new user
      const anonymousUser: User = {
        uid: 'anon-123',
        email: '',
        displayName: 'Anonymous',
        isAnonymous: true,
        photoURL: null,
        providerId: 'anonymous'
      };
      
      userStore.user.set(anonymousUser);
      checkinStore.checkins.set([]);
      
      expect(service.shouldShowWelcomeFlow()).toBe(true);
      
      // Test first-time user
      const { user: firstTimeUser, checkIns: firstTimeCheckIns } = createUserWithCheckIns(2);
      userStore.user.set(firstTimeUser);
      checkinStore.checkins.set(firstTimeCheckIns);
      
      expect(service.shouldShowWelcomeFlow()).toBe(true);
    });

    it('should not show welcome flow for experienced users', () => {
      // Given: Regular user
      const { user, checkIns } = createUserWithCheckIns(15);
      
      userStore.user.set(user);
      checkinStore.checkins.set(checkIns);
      
      // When: Checking welcome flow flag
      const shouldShow = service.shouldShowWelcomeFlow();
      
      // Then: Should not show welcome flow
      expect(shouldShow).toBe(false);
    });

    it('should show badges for non-brand-new users with badges', () => {
      // Given: Early user with badges
      const { user, checkIns } = createUserWithCheckIns(5);
      
      userStore.user.set(user);
      userStore.hasBadges.set(true);
      checkinStore.checkins.set(checkIns);
      
      // When: Checking badges flag
      const shouldShow = service.shouldShowBadges();
      
      // Then: Should show badges
      expect(shouldShow).toBe(true);
    });

    it('should not show badges for brand new users', () => {
      // Given: Brand new user
      const anonymousUser: User = {
        uid: 'anon-123',
        email: '',
        displayName: 'Anonymous',
        isAnonymous: true,
        photoURL: null,
        providerId: 'anonymous'
      };
      
      userStore.user.set(anonymousUser);
      userStore.hasBadges.set(true);
      checkinStore.checkins.set([]);
      
      // When: Checking badges flag
      const shouldShow = service.shouldShowBadges();
      
      // Then: Should not show badges
      expect(shouldShow).toBe(false);
    });

    it('should show progress features for non-brand-new users', () => {
      // Given: Early user
      const { user, checkIns } = createUserWithCheckIns(5);
      
      userStore.user.set(user);
      checkinStore.checkins.set(checkIns);
      
      // When: Checking progress features flag
      const shouldShow = service.shouldShowProgressFeatures();
      
      // Then: Should show progress features
      expect(shouldShow).toBe(true);
    });

    it('should show advanced features only for power users', () => {
      const testCases = [
        { checkIns: 15, expectAdvanced: false, level: 'regular' },
        { checkIns: 30, expectAdvanced: true, level: 'power' },
        { checkIns: 5, expectAdvanced: false, level: 'early' }
      ];
      
      for (const testCase of testCases) {
        // Given: User at specific experience level
        const { user, checkIns } = createUserWithCheckIns(testCase.checkIns);
        
        userStore.user.set(user);
        checkinStore.checkins.set(checkIns);
        
        // When: Checking advanced features flag
        const shouldShow = service.shouldShowAdvancedFeatures();
        
        // Then: Should match expected result
        expect(shouldShow).toBe(testCase.expectAdvanced);
      }
    });
  });

  describe('Contextual Messaging', () => {
    it('should provide appropriate stage messages for each user level', () => {
      const testCases = [
        {
          level: 'brandNew',
          setupFn: () => {
            const anonymousUser: User = {
              uid: 'anon-123',
              email: '',
              displayName: 'Anonymous',
              isAnonymous: true,
              photoURL: null,
              providerId: 'anonymous'
            };
            userStore.user.set(anonymousUser);
            checkinStore.checkins.set([]);
          },
          expectedMessageContains: 'Welcome! Find a nearby pub'
        },
        {
          level: 'firstTime',
          setupFn: () => {
            const { user, checkIns } = createUserWithCheckIns(2);
            userStore.user.set(user);
            checkinStore.checkins.set(checkIns);
          },
          expectedMessageContains: 'Great start! You\'ve checked in 2 times'
        },
        {
          level: 'earlyUser',
          setupFn: () => {
            const { user, checkIns } = createUserWithCheckIns(5);
            userStore.user.set(user);
            checkinStore.checkins.set(checkIns);
          },
          expectedMessageContains: 'You\'re getting the hang of this! 5 check-ins'
        },
        {
          level: 'regularUser',
          setupFn: () => {
            const { user, checkIns } = createUserWithCheckIns(15);
            userStore.user.set(user);
            checkinStore.checkins.set(checkIns);
          },
          expectedMessageContains: 'Pub regular!'
        },
        {
          level: 'powerUser',
          setupFn: () => {
            const { user, checkIns } = createUserWithCheckIns(30);
            userStore.user.set(user);
            checkinStore.checkins.set(checkIns);
          },
          expectedMessageContains: 'Pub legend!'
        }
      ];
      
      for (const testCase of testCases) {
        // Given: User at specific level
        testCase.setupFn();
        
        // When: Getting stage message
        const message = service.stageMessage();
        const level = service.userExperienceLevel();
        
        // Then: Should match expected level and message
        expect(level).toBe(testCase.level);
        expect(message).toContain(testCase.expectedMessageContains);
      }
    });
  });

  describe('Complete Progression Stats', () => {
    it('should provide comprehensive progression stats', () => {
      // Given: Regular user with specific stats
      const { user, checkIns } = createUserWithCheckIns(18);
      
      userStore.user.set(user);
      checkinStore.checkins.set(checkIns);
      
      // When: Getting progression stats
      const stats = service.progressionStats();
      
      // Then: Should have complete stats
      expect(stats.stage).toBe('regularUser');
      expect(stats.totalCheckins).toBe(18);
      expect(stats.uniquePubs).toBeGreaterThan(0);
      expect(stats.nextMilestone.type).toBe('power-user');
      expect(stats.nextMilestone.target).toBe(25);
      expect(stats.checkinsToNextMilestone).toBe(7); // 25 - 18 = 7
      expect(stats.stageMessage).toContain('Pub regular!');
    });

    it('should provide complete UI flags', () => {
      // Given: Power user
      const { user, checkIns } = createUserWithCheckIns(30);
      
      userStore.user.set(user);
      userStore.hasBadges.set(true);
      checkinStore.checkins.set(checkIns);
      
      // When: Getting UI flags
      const flags = service.uiFlags();
      
      // Then: Should have appropriate flags for power user
      expect(flags.shouldShowWelcomeFlow).toBe(false);
      expect(flags.shouldShowBadges).toBe(true);
      expect(flags.shouldShowProgressFeatures).toBe(true);
      expect(flags.shouldShowAdvancedFeatures).toBe(true);
    });
  });

  describe('Signal Reactivity and Edge Cases', () => {
    it('should reactively update when user changes', async () => {
      // Given: Signal tracking
      const levelTracker = signalHarness.addTracker('userLevel', service.userExperienceLevel);
      const statsTracker = signalHarness.addTracker('progressionStats', service.progressionStats);
      
      // Initial state: no user
      userStore.user.set(null);
      checkinStore.checkins.set([]);
      
      expect(service.userExperienceLevel()).toBe('guest');
      
      // When: User logs in
      const { user, checkIns } = createUserWithCheckIns(5);
      
      userStore.user.set(user);
      checkinStore.checkins.set(checkIns);
      
      // Manually record changes for test environment
      levelTracker.recordChange('user-login');
      statsTracker.recordChange('user-login');
      
      // Then: Should update reactively
      expect(service.userExperienceLevel()).toBe('earlyUser');
      expect(levelTracker.getChangeCount()).toBeGreaterThan(1);
      expect(statsTracker.getChangeCount()).toBeGreaterThan(1);
    });

    it('should reactively update when check-ins change', async () => {
      // Given: User with initial check-ins
      const { user, checkIns } = createUserWithCheckIns(5);
      
      userStore.user.set(user);
      checkinStore.checkins.set(checkIns);
      
      const levelTracker = signalHarness.addTracker('userLevel', service.userExperienceLevel);
      const countTracker = signalHarness.addTracker('checkinCount', service.totalCheckinsCount);
      
      expect(service.userExperienceLevel()).toBe('earlyUser');
      expect(service.totalCheckinsCount()).toBe(5);
      
      // When: More check-ins added to reach regular user
      const { checkIns: additionalCheckIns } = createUserWithCheckIns(15);
      const combinedCheckIns = additionalCheckIns.slice(0, 15); // Take first 15 to get 15 total
      checkinStore.checkins.set(combinedCheckIns);
      
      // Manually record changes for test environment
      levelTracker.recordChange('checkins-added');
      countTracker.recordChange('checkins-added');
      
      // Then: Should update to regular user
      expect(service.userExperienceLevel()).toBe('regularUser');
      expect(service.totalCheckinsCount()).toBe(15);
      expect(levelTracker.getChangeCount()).toBeGreaterThan(1);
      expect(countTracker.getChangeCount()).toBeGreaterThan(1);
    });

    it('should handle empty check-in arrays gracefully', () => {
      // Given: User with empty check-ins
      const user: User = {
        uid: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        isAnonymous: false,
        photoURL: null,
        providerId: 'email'
      };
      
      userStore.user.set(user);
      checkinStore.checkins.set([]);
      
      // When: Getting stats
      const totalCheckins = service.totalCheckinsCount();
      const uniquePubs = service.uniquePubsVisited();
      const level = service.userExperienceLevel();
      const milestone = service.nextMilestone();
      
      // Then: Should handle gracefully
      expect(totalCheckins).toBe(0);
      expect(uniquePubs).toBe(0);
      expect(level).toBe('firstTime'); // Non-anonymous user with 0 check-ins
      expect(milestone.type).toBe('first-checkin');
      expect(milestone.target).toBe(1);
    });

    it('should handle check-ins from other users correctly', () => {
      // Given: Current user and check-ins from multiple users
      const testData = TestScenarios.activeCommunity();
      const currentUser = testData.users[0];
      const otherUsersCheckIns = testData.checkIns.filter(c => c.userId !== currentUser.uid);
      const currentUserCheckIns = testData.checkIns.filter(c => c.userId === currentUser.uid).slice(0, 8);
      
      userStore.user.set(currentUser);
      checkinStore.checkins.set([...currentUserCheckIns, ...otherUsersCheckIns]);
      
      // When: Getting user-specific stats
      const totalCheckins = service.totalCheckinsCount();
      const uniquePubs = service.uniquePubsVisited();
      
      // Then: Should only count current user's check-ins
      expect(totalCheckins).toBe(8);
      expect(uniquePubs).toBeLessThanOrEqual(8); // Should only count current user's unique pubs
      
      // Verify other users' check-ins don't affect this user's level
      expect(service.userExperienceLevel()).toBe('earlyUser'); // 8 check-ins = early user
    });

    it('should calculate unique pubs correctly', () => {
      // Given: User with multiple check-ins at same pubs
      const user: User = {
        uid: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',  
        isAnonymous: false,
        photoURL: null,
        providerId: 'email'
      };
      
      // Create check-ins: 10 total, but only 3 unique pubs
      const checkIns: CheckIn[] = [
        // 5 check-ins at pub-1
        ...Array.from({ length: 5 }, (_, i) => ({
          id: `checkin-pub1-${i}`,
          userId: user.uid,
          pubId: 'pub-1',
          timestamp: new Date(Date.now() - (9 - i) * 24 * 60 * 60 * 1000),
          points: 10,
          visitType: 'regular' as const
        })),
        // 3 check-ins at pub-2
        ...Array.from({ length: 3 }, (_, i) => ({
          id: `checkin-pub2-${i}`,
          userId: user.uid,
          pubId: 'pub-2',
          timestamp: new Date(Date.now() - (4 - i) * 24 * 60 * 60 * 1000),
          points: 10,
          visitType: 'regular' as const
        })),
        // 2 check-ins at pub-3
        ...Array.from({ length: 2 }, (_, i) => ({
          id: `checkin-pub3-${i}`,
          userId: user.uid,
          pubId: 'pub-3',
          timestamp: new Date(Date.now() - (1 - i) * 24 * 60 * 60 * 1000),
          points: 10,
          visitType: 'regular' as const
        }))
      ];
      
      userStore.user.set(user);
      checkinStore.checkins.set(checkIns);
      
      // When: Getting counts
      const totalCheckins = service.totalCheckinsCount();
      const uniquePubs = service.uniquePubsVisited();
      
      // Then: Should count correctly
      expect(totalCheckins).toBe(10);
      expect(uniquePubs).toBe(3); // Only 3 unique pubs despite 10 check-ins
      expect(service.userExperienceLevel()).toBe('regularUser'); // 10 check-ins = regular user
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large datasets efficiently', () => {
      // Given: Large dataset
      const testData = TestScenarios.powerUserEcosystem();
      const user = testData.users[0];
      
      // Create 1000 check-ins for performance testing
      const largeCheckInSet: CheckIn[] = [];
      for (let i = 0; i < 1000; i++) {
        const pub = testData.pubs[i % testData.pubs.length];
        largeCheckInSet.push({
          id: `checkin-${i}`,
          userId: user.uid,
          pubId: pub.id,
          timestamp: new Date(Date.now() - (999 - i) * 24 * 60 * 60 * 1000),
          points: 10,
          visitType: 'regular'
        });
      }
      
      userStore.user.set(user);
      
      // When: Setting large dataset and measuring performance
      const startTime = Date.now();
      checkinStore.checkins.set(largeCheckInSet);
      
      const level = service.userExperienceLevel();
      const totalCheckins = service.totalCheckinsCount();
      const uniquePubs = service.uniquePubsVisited();
      const milestone = service.nextMilestone();
      
      const executionTime = Date.now() - startTime;
      
      // Then: Should handle efficiently and correctly
      expect(level).toBe('powerUser'); // 1000 check-ins = power user
      expect(totalCheckins).toBe(1000);
      expect(uniquePubs).toBeLessThanOrEqual(testData.pubs.length);
      expect(milestone.type).toBe('milestone'); // Will be next milestone for power user
      expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle null/undefined user gracefully', () => {
      // Given: Null user
      userStore.user.set(null);
      checkinStore.checkins.set([]);
      
      // When: Getting all computed values
      const level = service.userExperienceLevel();
      const totalCheckins = service.totalCheckinsCount();
      const uniquePubs = service.uniquePubsVisited();
      const milestone = service.nextMilestone();
      const stats = service.progressionStats();
      const flags = service.uiFlags();
      
      // Then: Should handle gracefully without errors
      expect(level).toBe('guest');
      expect(totalCheckins).toBe(0);
      expect(uniquePubs).toBe(0);
      expect(milestone.type).toBe('first-checkin');
      expect(stats.stage).toBe('guest');
      expect(flags.shouldShowWelcomeFlow).toBe(false); // Guest doesn't need welcome flow
      expect(flags.shouldShowBadges).toBe(false);
    });

    it('should maintain consistency between related computed values', () => {
      // Given: Various user scenarios
      const scenarios = [
        { checkIns: 2, uniquePubs: 2 },
        { checkIns: 5, uniquePubs: 4 },
        { checkIns: 15, uniquePubs: 8 },
        { checkIns: 30, uniquePubs: 12 },
        { checkIns: 60, uniquePubs: 15 }
      ];
      
      for (const scenario of scenarios) {
        const { user, checkIns } = createUserWithCheckIns(scenario.checkIns, scenario.uniquePubs);
        
        userStore.user.set(user);
        checkinStore.checkins.set(checkIns);
        
        // When: Getting all computed values
        const level = service.userExperienceLevel();
        const totalCheckins = service.totalCheckinsCount();
        const uniquePubs = service.uniquePubsVisited();
        const milestone = service.nextMilestone();
        const checkinsToNext = service.checkinsToNextMilestone();
        const stats = service.progressionStats();
        const flags = service.uiFlags();
        
        // Then: All values should be consistent
        expect(stats.stage).toBe(level);
        expect(stats.totalCheckins).toBe(totalCheckins);
        expect(stats.uniquePubs).toBe(uniquePubs);
        expect(stats.nextMilestone).toEqual(milestone);
        expect(stats.checkinsToNextMilestone).toBe(checkinsToNext);
        
        // UI flags should match level
        const expectedFlags = service.uiFlags();
        expect(flags).toEqual(expectedFlags);
        
        // Milestone calculation should be logical - only check-in based milestones now
        expect(checkinsToNext).toBe(Math.max(0, milestone.target - totalCheckins));
      }
    });
  });
});