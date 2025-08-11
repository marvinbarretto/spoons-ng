import { TestBed } from '@angular/core/testing';
import { BadgeStore } from './badge.store';
import { BadgeService } from './badge.service';
import { UserStore } from '@users/data-access/user.store';
import { CacheService } from '@shared/data-access/cache.service';
import { AuthStore } from '@auth/data-access/auth.store';
import { signal, computed } from '@angular/core';
import { Badge, EarnedBadge } from '../utils/badge.model';
import { vi } from 'vitest';
import { createFirebaseAuthMock, waitForEffects, createMockUser } from '@shared/testing';

const MOCK_DEFINITIONS: Badge[] = [
  { id: 'def1', name: 'Test Badge 1', description: '', icon: '' },
  { id: 'def2', name: 'Test Badge 2', description: '', icon: '' },
];

const MOCK_EARNED_BADGES: EarnedBadge[] = [
  { id: 'earned1', badgeId: 'def1', awardedAt: Date.now(), metadata: {} },
];

const MOCK_USER = createMockUser();

describe('BadgeStore', () => {
  let store: BadgeStore;
  let badgeService: vi.Mocked<BadgeService>;
  let userStore: vi.Mocked<UserStore>;
  let cacheService: vi.Mocked<CacheService>;
  let mockAuth: ReturnType<typeof createFirebaseAuthMock>;

  beforeEach(() => {
    // Create fresh mock for each test
    mockAuth = createFirebaseAuthMock();
    
    TestBed.configureTestingModule({
      providers: [
        BadgeStore,
        {
          provide: BadgeService,
          useValue: {
            getBadges: vi.fn(),
            getEarnedBadgesForUser: vi.fn(),
            createBadge: vi.fn(),
            updateBadge: vi.fn(),
            deleteBadge: vi.fn(),
            awardBadge: vi.fn(),
            revokeBadge: vi.fn(),
            updateUserBadgeSummary: vi.fn(),
            getBadgeByName: vi.fn(),
            getUsersWithBadge: vi.fn(),
            getBadgeLeaderboard: vi.fn(),
            getBadgeAwardCounts: vi.fn(),
          },
        },
        {
          provide: UserStore,
          useValue: {
            updateBadgeSummary: vi.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            load: vi.fn().mockImplementation(({ loadFresh }) => loadFresh()),
            clear: vi.fn(),
          },
        },
        {
          provide: AuthStore,
          useValue: {
            user: mockAuth.currentUser,
            uid: computed(() => mockAuth.currentUser()?.uid || null),
            isLoggedIn: computed(() => !!mockAuth.currentUser()),
            isAdmin: signal(false),
          },
        },
      ],
    });

    store = TestBed.inject(BadgeStore);
    badgeService = TestBed.inject(BadgeService) as vi.Mocked<BadgeService>;
    userStore = TestBed.inject(UserStore) as vi.Mocked<UserStore>;
    cacheService = TestBed.inject(CacheService) as vi.Mocked<CacheService>;
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
    expect(store.definitions()).toEqual([]);
    expect(store.earnedBadges()).toEqual([]);
    expect(store.loading()).toBe(false);
  });

  describe('loadDefinitions', () => {
    it('should load badge definitions and update state', async () => {
      badgeService.getBadges.mockResolvedValue(MOCK_DEFINITIONS);
      await store.loadDefinitions();
      expect(store.definitions()).toEqual(MOCK_DEFINITIONS);
    });

    it('should not reload definitions if already loaded', async () => {
      badgeService.getBadges.mockResolvedValue(MOCK_DEFINITIONS);
      await store.loadDefinitions();
      await store.loadDefinitions(); // Second call
      expect(badgeService.getBadges).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchData (for earned badges)', () => {
    it('should load earned badges for authenticated user', async () => {
      // Arrange: Set up service to return mock badge data
      badgeService.getEarnedBadgesForUser.mockResolvedValue(MOCK_EARNED_BADGES);
      
      // Act: Simulate user authentication and wait for auth effects to process
      mockAuth._setCurrentUser(MOCK_USER);
      await waitForEffects(); // Let BaseStore auth effect detect the user change
      
      // Act: Trigger data loading
      await store.load();
      
      // Assert: Verify earned badges were loaded correctly
      expect(store.earnedBadges()).toEqual(MOCK_EARNED_BADGES);
      expect(badgeService.getEarnedBadgesForUser).toHaveBeenCalledWith(MOCK_USER.uid);
    });

    it('should return empty array when no user authenticated', async () => {
      // Arrange: Set no authenticated user
      mockAuth._setCurrentUser(null);
      await waitForEffects(); // Let auth effects process the logout
      
      // Act: Attempt to load data
      await store.load();
      
      // Assert: Should return empty data and not call service
      expect(store.earnedBadges()).toEqual([]);
      expect(badgeService.getEarnedBadgesForUser).not.toHaveBeenCalled();
    });
  });

  describe('auth-reactive behavior', () => {
    it('should load data when user becomes authenticated', async () => {
      // Arrange: Set up service mocks to return test data
      badgeService.getEarnedBadgesForUser.mockResolvedValue(MOCK_EARNED_BADGES);
      badgeService.getBadges.mockResolvedValue(MOCK_DEFINITIONS);
      
      // Arrange: Start with no authenticated user
      mockAuth._setCurrentUser(null);
      await waitForEffects(); // Process logout state
      
      // Act: Simulate user login - this should trigger automatic loading via BaseStore auth effect
      mockAuth._setCurrentUser(MOCK_USER);
      await waitForEffects(); // Let auth effect detect user change
      await waitForEffects(); // Let automatic store loading complete
      
      // Assert: Verify that auth-reactive loading was triggered
      expect(badgeService.getEarnedBadgesForUser).toHaveBeenCalledWith(MOCK_USER.uid);
    });

    it('should clear data when user logs out', async () => {
      // Arrange: Start with authenticated user and load data
      mockAuth._setCurrentUser(MOCK_USER);
      badgeService.getEarnedBadgesForUser.mockResolvedValue(MOCK_EARNED_BADGES);
      await waitForEffects(); // Process login state
      
      // Act: Load data to establish baseline
      await store.load();
      expect(store.earnedBadges()).toEqual(MOCK_EARNED_BADGES);
      
      // Act: Simulate user logout - this should trigger automatic data clearing
      mockAuth._setCurrentUser(null);
      await waitForEffects(); // Let auth effect detect logout and trigger reset
      
      // Assert: Data should be cleared by BaseStore auth-reactive reset
      expect(store.earnedBadges()).toEqual([]);
    });
  });
});
