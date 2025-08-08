/**
 * ScoreboardHeroWidget Tests - Reactivity & Data Flow
 * 
 * CRITICAL TEST COVERAGE:
 * This test suite focuses on the exact bug reported in user logs:
 * - Initial state: 45 points from 2 check-ins
 * - After check-in: Should show 53 points (45+8)
 * - Bug: Widget shows stale 45 points instead of updated 53
 * 
 * ARCHITECTURE UNDER TEST:
 * CheckInStore.checkinToPub() → GlobalCheckInStore.allCheckIns() → 
 * DataAggregatorService → UserStore.scoreboardData() → Widget.data()
 */

import { TestBed, ComponentFixture } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { signal, computed } from '@angular/core';
import { ScoreboardHeroWidgetComponent } from './scoreboard-hero-widget.component';
import { UserStore } from '../../users/data-access/user.store';
import { GlobalCheckInStore } from '../../check-in/data-access/global-check-in.store';
import { BadgeStore } from '../../badges/data-access/badge.store';
import { LeaderboardStore } from '../../leaderboard/data-access/leaderboard.store';
import { CheckInStore } from '../../check-in/data-access/check-in.store';
import { DebugService } from '../../shared/utils/debug.service';
import { createTestUser, createTestCheckIn } from '../../shared/testing/test-data';

describe('ScoreboardHeroWidget - Reactivity After Check-in', () => {
  let component: ScoreboardHeroWidgetComponent;
  let fixture: ComponentFixture<ScoreboardHeroWidgetComponent>;
  let mockUserStore: any;
  let mockGlobalCheckInStore: any;
  let mockBadgeStore: any;
  let mockLeaderboardStore: any;
  let mockCheckinStore: any;
  let mockDebugService: any;

  // Test scenario data matching user logs: 45 points → 53 points bug
  const testUser = createTestUser({
    uid: 'test-user-reactive',
    displayName: 'Reactive Test User',
    manuallyAddedPubIds: [],
    badgeCount: 2,
    landlordCount: 1
  });

  // Initial state: 2 check-ins totaling 45 points (from user logs)
  const initialCheckIns = [
    createTestCheckIn({
      id: 'initial-checkin-1',
      userId: testUser.uid,
      pubId: 'pub-alpha',
      pointsEarned: 35,
      pointsBreakdown: { total: 35, base: 25, distance: 10 },
      timestamp: { 
        toMillis: () => Date.now() - 3600000, // 1 hour ago
        toDate: () => new Date(Date.now() - 3600000)
      }
    }),
    createTestCheckIn({
      id: 'initial-checkin-2',
      userId: testUser.uid,
      pubId: 'pub-beta',
      pointsEarned: 10,
      pointsBreakdown: { total: 10, base: 10, distance: 0 },
      timestamp: { 
        toMillis: () => Date.now() - 1800000, // 30 minutes ago
        toDate: () => new Date(Date.now() - 1800000)
      }
    })
  ];

  // New check-in: adds 8 points for total of 53 (from user logs)
  const newCheckIn = createTestCheckIn({
    id: 'new-checkin-reactive-test',
    userId: testUser.uid,
    pubId: 'pub-gamma',
    pointsEarned: 8,
    pointsBreakdown: { total: 8, base: 5, bonus: 3 },
    timestamp: { 
      toMillis: () => Date.now() - 60000, // 1 minute ago
      toDate: () => new Date(Date.now() - 60000)
    }
  });

  beforeEach(async () => {
    console.log('[ScoreboardHeroWidget Test] Setting up test environment...');

    // Mock GlobalCheckInStore with signal-based architecture
    mockGlobalCheckInStore = {
      allCheckIns: signal([...initialCheckIns]), // Initial state: 45 points
      loading: signal(false),
      // Test helper to simulate new check-in
      _simulateNewCheckIn: function(checkIn: any) {
        console.log('[Mock GlobalCheckInStore] Simulating new check-in:', checkIn.id);
        const currentCheckIns = this.allCheckIns();
        this.allCheckIns.set([...currentCheckIns, checkIn]);
        console.log('[Mock GlobalCheckInStore] Total check-ins now:', this.allCheckIns().length);
      },
      _getCheckInsForUser: function(userId: string) {
        return this.allCheckIns().filter((c: any) => c.userId === userId);
      }
    };

    // Mock UserStore with reactive computed scoreboard data
    mockUserStore = {
      user: signal(testUser),
      currentUser: signal(testUser),
      // CRITICAL: This computed signal should reactively update when GlobalCheckInStore changes
      scoreboardData: computed(() => {
        console.log('[Mock UserStore] Computing scoreboard data...');
        
        const user = testUser;
        const authUser = testUser;
        
        if (!user || !authUser) {
          return {
            totalPoints: 0,
            todaysPoints: 0,
            pubsVisited: 0,
            totalPubs: 0,
            badgeCount: 0,
            landlordCount: 0,
            totalCheckins: 0,
            isLoading: false,
          };
        }

        // Get user's check-ins from GlobalCheckInStore for scoreboard calculation
        const allCheckIns = mockGlobalCheckInStore.allCheckIns();
        const userCheckIns = allCheckIns.filter((c: any) => c.userId === authUser.uid);
        const isLoading = mockGlobalCheckInStore.loading();
        
        console.log('[Mock UserStore] Scoreboard data computation:', {
          totalGlobalCheckIns: allCheckIns.length,
          userSpecificCheckIns: userCheckIns.length,
          userCheckInIds: userCheckIns.map((c: any) => c.id),
          computationSource: 'Mock GlobalCheckInStore reactive signal'
        });
        
        // Calculate total points from user's check-ins
        const totalPoints = userCheckIns.reduce((sum: number, checkin: any) => {
          const points = checkin.pointsEarned ?? checkin.pointsBreakdown?.total ?? 0;
          return sum + points;
        }, 0);

        // Calculate unique pubs visited
        const uniquePubIds = new Set(userCheckIns.filter((c: any) => c.pubId).map((c: any) => c.pubId));
        const pubsVisited = uniquePubIds.size + (user.manuallyAddedPubIds?.length || 0);

        const scoreboardData = {
          totalPoints,
          todaysPoints: 0, // Simplified for this test
          pubsVisited,
          totalPubs: 50, // Mock total pubs in system
          badgeCount: user.badgeCount || 0,
          landlordCount: user.landlordCount || 0,
          totalCheckins: userCheckIns.length,
          isLoading,
        };

        console.log('[Mock UserStore] Final scoreboard data:', {
          totalPoints: scoreboardData.totalPoints,
          pubsVisited: scoreboardData.pubsVisited,
          totalCheckins: scoreboardData.totalCheckins,
          userCheckInsUsed: userCheckIns.length,
          expectedPoints: userCheckIns.length === 2 ? 45 : 53, // 2 check-ins = 45, 3 check-ins = 53
        });

        return scoreboardData;
      })
    };

    // Mock other required stores (minimal for this test)
    mockBadgeStore = {
      earnedBadgesWithDefinitions: signal([])
    };

    mockLeaderboardStore = {
      data: signal([])
    };

    mockCheckinStore = {
      isProcessing: signal(false)
    };

    mockDebugService = {
      extreme: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ScoreboardHeroWidgetComponent],
      providers: [
        { provide: UserStore, useValue: mockUserStore },
        { provide: GlobalCheckInStore, useValue: mockGlobalCheckInStore },
        { provide: BadgeStore, useValue: mockBadgeStore },
        { provide: LeaderboardStore, useValue: mockLeaderboardStore },
        { provide: CheckInStore, useValue: mockCheckinStore },
        { provide: DebugService, useValue: mockDebugService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ScoreboardHeroWidgetComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('🚨 CRITICAL: Check-in Reactivity Bug', () => {
    it('should show initial state: 45 points from 2 check-ins', () => {
      console.log('[Test] === VERIFYING INITIAL STATE ===');
      
      // Trigger change detection to compute initial values
      fixture.detectChanges();
      
      const initialData = component.enhancedData();
      console.log('[Test] Initial widget data:', {
        totalPoints: initialData.totalPoints,
        totalCheckins: initialData.totalCheckins,
        expectedPoints: 45, // 35 + 10 = 45
        expectedCheckins: 2
      });

      // Verify initial state matches user logs: 45 points from 2 check-ins
      expect(initialData.totalPoints).toBe(45);
      expect(initialData.totalCheckins).toBe(2);
      expect(initialData.pubsVisited).toBe(2); // 2 unique pubs
    });

    it('🐛 BUG REPRODUCTION: should update scoreboard immediately after new check-in completion', async () => {
      console.log('[Test] === REPRODUCING REACTIVITY BUG ===');
      
      // Step 1: Verify initial state (45 points)
      fixture.detectChanges();
      const beforeData = component.enhancedData();
      console.log('[Test] BEFORE new check-in:', {
        totalPoints: beforeData.totalPoints,
        totalCheckins: beforeData.totalCheckins,
        pubsVisited: beforeData.pubsVisited
      });
      
      expect(beforeData.totalPoints).toBe(45);
      expect(beforeData.totalCheckins).toBe(2);
      
      // Step 2: Simulate new check-in completion (the critical moment)
      console.log('[Test] Simulating new check-in with 8 points...');
      mockGlobalCheckInStore._simulateNewCheckIn(newCheckIn);
      
      // Step 3: Trigger change detection (Angular lifecycle)
      fixture.detectChanges();
      
      // Step 4: THE BUG - Widget should show 53 points but currently shows 45
      const afterData = component.enhancedData();
      console.log('[Test] AFTER new check-in:', {
        totalPoints: afterData.totalPoints,
        totalCheckins: afterData.totalCheckins,
        pubsVisited: afterData.pubsVisited,
        expectedPoints: 53, // Should be 45 + 8 = 53
        actualPoints: afterData.totalPoints,
        bugReproduced: afterData.totalPoints === 45 // This would indicate the bug
      });
      
      // CRITICAL TEST: This should pass after we fix the reactivity issue
      // Currently expected to fail, showing the bug exists
      console.log('[Test] === CRITICAL ASSERTION ===');
      console.log('[Test] Expected: 53 points (45 + 8)');
      console.log('[Test] Actual:', afterData.totalPoints);
      console.log('[Test] Bug Status:', afterData.totalPoints === 45 ? '🚨 BUG EXISTS' : '✅ BUG FIXED');
      
      // The fix: Widget should reactively update to show new total
      expect(afterData.totalPoints).toBe(53); // 45 + 8 = 53
      expect(afterData.totalCheckins).toBe(3); // 2 + 1 = 3
      expect(afterData.pubsVisited).toBe(3); // 3 unique pubs now
    });

    it('should maintain animation state during reactive updates', () => {
      console.log('[Test] === TESTING ANIMATION BEHAVIOR ===');
      
      fixture.detectChanges();
      
      // Check initial animation values
      const initialPoints = component.animatedPoints();
      console.log('[Test] Initial animated points:', initialPoints);
      
      // Simulate new check-in
      mockGlobalCheckInStore._simulateNewCheckIn(newCheckIn);
      fixture.detectChanges();
      
      // Animation should eventually reflect new values
      // (In real implementation, there would be a setTimeout for animation)
      setTimeout(() => {
        const updatedPoints = component.animatedPoints();
        console.log('[Test] Updated animated points:', updatedPoints);
        expect(updatedPoints).toBe(53);
      }, 100);
    });

    it('should handle rapid successive check-ins without data inconsistency', () => {
      console.log('[Test] === TESTING RAPID CHECK-IN UPDATES ===');
      
      fixture.detectChanges();
      const initialData = component.enhancedData();
      expect(initialData.totalPoints).toBe(45);
      
      // Simulate multiple rapid check-ins (stress test for reactivity)
      const rapidCheckIns = [
        createTestCheckIn({ userId: testUser.uid, pubId: 'pub-rapid-1', pointsEarned: 5 }),
        createTestCheckIn({ userId: testUser.uid, pubId: 'pub-rapid-2', pointsEarned: 12 }),
        createTestCheckIn({ userId: testUser.uid, pubId: 'pub-rapid-3', pointsEarned: 7 })
      ];
      
      // Add all check-ins in rapid succession
      rapidCheckIns.forEach(checkIn => {
        mockGlobalCheckInStore._simulateNewCheckIn(checkIn);
        fixture.detectChanges();
      });
      
      const finalData = component.enhancedData();
      const expectedTotal = 45 + 5 + 12 + 7; // = 69
      
      console.log('[Test] Rapid check-ins result:', {
        expectedTotal,
        actualTotal: finalData.totalPoints,
        expectedCheckins: 5, // 2 initial + 3 rapid
        actualCheckins: finalData.totalCheckins
      });
      
      expect(finalData.totalPoints).toBe(expectedTotal);
      expect(finalData.totalCheckins).toBe(5);
    });
  });

  describe('🔧 Component Integration', () => {
    it('should initialize widget with proper component lifecycle', () => {
      console.log('[Test] === TESTING COMPONENT LIFECYCLE ===');
      
      expect(component).toBeDefined();
      
      // Component should have proper signal reactivity
      expect(typeof component.enhancedData).toBe('function');
      expect(typeof component.animatedPoints).toBe('function');
      
      fixture.detectChanges();
      
      // Should have initial data
      const data = component.enhancedData();
      expect(data).toBeDefined();
      expect(data.totalPoints).toBeGreaterThanOrEqual(0);
    });

    it('should clean up animations on component destroy', () => {
      console.log('[Test] === TESTING CLEANUP ===');
      
      fixture.detectChanges();
      
      // Simulate component destruction
      component.ngOnDestroy();
      
      // Should clean up any animation timeouts
      // (This tests the cleanup method exists and executes)
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('🎭 Mock Verification', () => {
    it('should verify mock store behavior matches expected patterns', () => {
      console.log('[Test] === VERIFYING MOCK BEHAVIOR ===');
      
      // Test that our mocks behave like real stores
      const checkIns = mockGlobalCheckInStore.allCheckIns();
      expect(Array.isArray(checkIns)).toBe(true);
      expect(checkIns.length).toBe(2);
      
      const userData = mockUserStore.scoreboardData();
      expect(userData.totalPoints).toBe(45);
      
      // Test reactive update
      mockGlobalCheckInStore._simulateNewCheckIn(newCheckIn);
      const updatedCheckIns = mockGlobalCheckInStore.allCheckIns();
      expect(updatedCheckIns.length).toBe(3);
      
      // The scoreboardData should reactively update
      const updatedUserData = mockUserStore.scoreboardData();
      console.log('[Test] Mock reactivity test:', {
        beforePoints: 45,
        afterPoints: updatedUserData.totalPoints,
        shouldBe: 53
      });
      
      expect(updatedUserData.totalPoints).toBe(53);
    });
  });
});