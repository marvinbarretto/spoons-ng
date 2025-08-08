import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthStore } from '../../auth/data-access/auth.store';
import { GlobalCheckInService } from '../../check-in/data-access/global-check-in.service';
import { UserService } from '../../users/data-access/user.service';
import { createTestCheckIn, createTestUser } from '../testing/test-data';
import { DebugService } from '../utils/debug.service';
import { SessionService } from './session.service';

describe('SessionService', () => {
  let service: SessionService;
  let mockAuthStore: any;
  let mockUserService: any;
  let mockGlobalCheckInService: any;
  let mockDebugService: any;

  // Test data
  const testUsers = [
    createTestUser({ uid: 'user-1', displayName: 'User One', totalPoints: 100 }),
    createTestUser({ uid: 'user-2', displayName: 'User Two', totalPoints: 50, isAnonymous: true }),
    createTestUser({ uid: 'user-3', displayName: 'User Three', totalPoints: 0 }),
  ];

  const testCheckIns = [
    createTestCheckIn({ userId: 'user-1', pubId: 'pub-1', pointsEarned: 10 }),
    createTestCheckIn({ userId: 'user-1', pubId: 'pub-2', pointsEarned: 15 }),
    createTestCheckIn({ userId: 'user-2', pubId: 'pub-1', pointsEarned: 20 }),
  ];

  beforeEach(async () => {
    // Create comprehensive mocks with signals
    mockAuthStore = {
      user: signal(null),
      isAuthenticated: signal(false),
      _setUser: function (user: any) {
        this.user.set(user);
      },
      _setAuthenticated: function (auth: boolean) {
        this.isAuthenticated.set(auth);
      },
    };

    mockUserService = {
      allUsers: signal(testUsers),
      loadAllUsers: vi.fn().mockImplementation(async () => {
        // Simulate async loading
        await new Promise(resolve => setTimeout(resolve, 10));
        mockUserService.allUsers.set(testUsers);
      }),
    };

    mockGlobalCheckInService = {
      allCheckIns: signal(testCheckIns),
      loadAllCheckIns: vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        mockGlobalCheckInService.allCheckIns.set(testCheckIns);
      }),
    };

    mockDebugService = {
      standard: vi.fn(),
    };

    await TestBed.configureTestingModule({
      providers: [
        SessionService,
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: UserService, useValue: mockUserService },
        { provide: GlobalCheckInService, useValue: mockGlobalCheckInService },
        { provide: DebugService, useValue: mockDebugService },
      ],
    }).compileComponents();

    service = TestBed.inject(SessionService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should log initialization message', () => {
      expect(mockDebugService.standard).toHaveBeenCalledWith(
        '[SessionService] Service initialized - monitoring auth state for session management'
      );
    });

    it('should set up auth state monitoring', () => {
      // The constructor sets up an effect to monitor auth state
      expect(service.isSessionDataLoading()).toBe(false);
    });
  });

  describe('Auth State Monitoring', () => {
    it('should initialize session data when user becomes authenticated', async () => {
      const testUser = createTestUser();

      // Mock the services to track calls
      const loadAllUsersSpy = vi.spyOn(mockUserService, 'loadAllUsers');
      const loadAllCheckInsSpy = vi.spyOn(mockGlobalCheckInService, 'loadAllCheckIns');

      // Simulate user authentication
      mockAuthStore._setUser(testUser);
      mockAuthStore._setAuthenticated(true);

      // Give time for the effect to trigger
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(loadAllUsersSpy).toHaveBeenCalled();
      expect(loadAllCheckInsSpy).toHaveBeenCalled();
    });

    it('should not initialize session data when user is not authenticated', async () => {
      mockAuthStore._setUser(createTestUser());
      mockAuthStore._setAuthenticated(false);

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockUserService.loadAllUsers).not.toHaveBeenCalled();
      expect(mockGlobalCheckInService.loadAllCheckIns).not.toHaveBeenCalled();
    });

    it('should log session cleared when user signs out', async () => {
      // First authenticate
      mockAuthStore._setUser(createTestUser());
      mockAuthStore._setAuthenticated(true);

      await new Promise(resolve => setTimeout(resolve, 50));

      // Then sign out
      mockAuthStore._setUser(null);
      mockAuthStore._setAuthenticated(false);

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockDebugService.standard).toHaveBeenCalledWith(
        '[SessionService] User signed out, session data cleared'
      );
    });
  });

  describe('Session Data Initialization', () => {
    it('should load users and check-ins in correct order', async () => {
      const loadUsersSpy = vi.spyOn(mockUserService, 'loadAllUsers');
      const loadCheckInsSpy = vi.spyOn(mockGlobalCheckInService, 'loadAllCheckIns');

      await service.initializeSessionData();

      expect(loadUsersSpy).toHaveBeenCalled();
      expect(loadCheckInsSpy).toHaveBeenCalled();

      // Verify order of calls (users first, then check-ins)
      const callOrder = vi.mocked(mockDebugService.standard).mock.calls.map(call => call[0]);
      const usersIndex = callOrder.findIndex(msg => msg.includes('Loading users from server'));
      const checkinsIndex = callOrder.findIndex(msg =>
        msg.includes('Loading check-ins from server')
      );

      expect(usersIndex).toBeLessThan(checkinsIndex);
    });

    it('should prevent duplicate loading when already in progress', async () => {
      // Start first load
      const firstLoad = service.initializeSessionData();

      // Try to start second load immediately
      const secondLoad = service.initializeSessionData();

      await Promise.all([firstLoad, secondLoad]);

      // Should only load once
      expect(mockUserService.loadAllUsers).toHaveBeenCalledTimes(1);
      expect(mockGlobalCheckInService.loadAllCheckIns).toHaveBeenCalledTimes(1);
    });

    it('should reset loading flag after completion', async () => {
      expect(service.isSessionDataLoading()).toBe(false);

      const loadPromise = service.initializeSessionData();
      expect(service.isSessionDataLoading()).toBe(true);

      await loadPromise;
      expect(service.isSessionDataLoading()).toBe(false);
    });

    it('should reset loading flag after error', async () => {
      mockUserService.loadAllUsers.mockRejectedValueOnce(new Error('Load failed'));

      await service.initializeSessionData();

      expect(service.isSessionDataLoading()).toBe(false);
    });

    it('should log detailed user statistics', async () => {
      await service.initializeSessionData();

      expect(mockDebugService.standard).toHaveBeenCalledWith(
        '[SessionService] ✅ Users loaded from server',
        expect.objectContaining({
          totalUsers: testUsers.length,
          realUsers: testUsers.filter(u => !u.isAnonymous).length,
          usersWithPoints: testUsers.filter(u => u.totalPoints && u.totalPoints > 0).length,
          userSample: expect.any(Array),
        })
      );
    });

    it('should log detailed check-in statistics', async () => {
      await service.initializeSessionData();

      expect(mockDebugService.standard).toHaveBeenCalledWith(
        '[SessionService] ✅ Check-ins loaded from server',
        expect.objectContaining({
          totalCheckIns: testCheckIns.length,
          uniqueUsers: expect.any(Number),
          checkinsWithPubs: testCheckIns.filter(c => c.pubId).length,
          checkinSample: expect.any(Array),
        })
      );
    });

    it('should analyze data consistency between users and check-ins', async () => {
      await service.initializeSessionData();

      expect(mockDebugService.standard).toHaveBeenCalledWith(
        '[SessionService] 🔍 Analyzing users with points vs check-ins...',
        expect.objectContaining({
          usersWithPoints: expect.any(Number),
          analysis: expect.arrayContaining([
            expect.objectContaining({
              uid: expect.any(String),
              displayName: expect.any(String),
              totalPoints: expect.any(Number),
              checkinCount: expect.any(Number),
              uniquePubsFromCheckins: expect.any(Number),
            }),
          ]),
        })
      );
    });

    it('should identify potential data issues', async () => {
      // Add a user with points but no check-ins to test data
      const problematicUser = createTestUser({
        uid: 'problematic-user',
        totalPoints: 100,
        unverifiedPubCount: 0,
      });
      mockUserService.allUsers.set([...testUsers, problematicUser]);

      await service.initializeSessionData();

      const finalLogCall = vi
        .mocked(mockDebugService.standard)
        .mock.calls.find(call => call[0].includes('Session data initialization completed'));

      expect(finalLogCall).toBeTruthy();
      expect(finalLogCall[1]).toMatchObject({
        potentialDataIssues: expect.any(Number),
      });
    });

    it('should log completion statistics', async () => {
      await service.initializeSessionData();

      expect(mockDebugService.standard).toHaveBeenCalledWith(
        '[SessionService] ✅ Session data initialization completed',
        expect.objectContaining({
          durationMs: expect.any(Number),
          usersLoaded: testUsers.length,
          checkinsLoaded: testCheckIns.length,
          potentialDataIssues: expect.any(Number),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle user service loading errors gracefully', async () => {
      const error = new Error('Failed to load users');
      mockUserService.loadAllUsers.mockRejectedValueOnce(error);

      await service.initializeSessionData();

      expect(mockDebugService.standard).toHaveBeenCalledWith(
        '[SessionService] ❌ Session data initialization failed',
        { error }
      );
    });

    it('should handle check-in service loading errors gracefully', async () => {
      const error = new Error('Failed to load check-ins');
      mockGlobalCheckInService.loadAllCheckIns.mockRejectedValueOnce(error);

      await service.initializeSessionData();

      expect(mockDebugService.standard).toHaveBeenCalledWith(
        '[SessionService] ❌ Session data initialization failed',
        { error }
      );
    });

    it('should continue with partial data if one service fails', async () => {
      mockUserService.loadAllUsers.mockResolvedValueOnce(undefined);
      mockGlobalCheckInService.loadAllCheckIns.mockRejectedValueOnce(new Error('Check-ins failed'));

      await service.initializeSessionData();

      // Should have attempted both loads
      expect(mockUserService.loadAllUsers).toHaveBeenCalled();
      expect(mockGlobalCheckInService.loadAllCheckIns).toHaveBeenCalled();
    });
  });

  describe('Manual Refresh', () => {
    it('should allow manual refresh of session data', async () => {
      await service.refreshAllSessionData();

      expect(mockUserService.loadAllUsers).toHaveBeenCalled();
      expect(mockGlobalCheckInService.loadAllCheckIns).toHaveBeenCalled();
      expect(mockDebugService.standard).toHaveBeenCalledWith(
        '[SessionService] 🔄 Manual session data refresh requested'
      );
    });

    it('should reset loading flag before manual refresh', async () => {
      // Set service to loading state
      service.initializeSessionData(); // Don't await to keep it loading
      expect(service.isSessionDataLoading()).toBe(true);

      // Manual refresh should reset flag and proceed
      await service.refreshAllSessionData();

      expect(mockUserService.loadAllUsers).toHaveBeenCalledTimes(2); // Once for init, once for refresh
    });
  });

  describe('Loading State Management', () => {
    it('should report loading state correctly', async () => {
      expect(service.isSessionDataLoading()).toBe(false);

      const loadPromise = service.initializeSessionData();
      expect(service.isSessionDataLoading()).toBe(true);

      await loadPromise;
      expect(service.isSessionDataLoading()).toBe(false);
    });

    it('should prevent concurrent loading operations', async () => {
      const load1 = service.initializeSessionData();
      const load2 = service.initializeSessionData();
      const load3 = service.initializeSessionData();

      await Promise.all([load1, load2, load3]);

      // Should only load once despite multiple calls
      expect(mockUserService.loadAllUsers).toHaveBeenCalledTimes(1);
      expect(mockGlobalCheckInService.loadAllCheckIns).toHaveBeenCalledTimes(1);
    });
  });

  describe('Service Integration', () => {
    it('should verify service data after loading', async () => {
      await service.initializeSessionData();

      expect(mockDebugService.standard).toHaveBeenCalledWith(
        '[SessionService] 🔍 Verifying service data after loading...',
        expect.objectContaining({
          userServiceUsers: expect.any(Number),
          globalCheckInServiceData: expect.any(Number),
        })
      );
    });

    it('should confirm data consistency message', async () => {
      await service.initializeSessionData();

      expect(mockDebugService.standard).toHaveBeenCalledWith(
        '[SessionService] 📊 All stores now have fresh data - pub counts should be consistent'
      );
    });
  });

  describe('Performance Considerations', () => {
    it('should complete data loading within reasonable time', async () => {
      const startTime = Date.now();
      await service.initializeSessionData();
      const duration = Date.now() - startTime;

      // Should complete within 1 second (generous for async operations)
      expect(duration).toBeLessThan(1000);
    });

    it('should log performance metrics', async () => {
      await service.initializeSessionData();

      const completionCall = vi
        .mocked(mockDebugService.standard)
        .mock.calls.find(call => call[0].includes('Session data initialization completed'));

      expect(completionCall[1].durationMs).toBeGreaterThan(0);
    });
  });
});
