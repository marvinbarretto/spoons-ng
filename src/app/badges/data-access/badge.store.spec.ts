/**
 * @fileoverview BadgeStore Unit Tests - User Experience Focused
 *
 * 🎯 FOCUSED TESTING APPROACH:
 * Tests prioritize user-facing badge functionality over administrative CRUD.
 * Covers core badge awarding workflow, duplicate prevention, and error handling.
 *
 * 🧪 TEST CATEGORIES:
 * ✅ Badge Awarding - Core user experience flow
 * ✅ Duplicate Prevention - User protection logic
 * ✅ Definition Loading - Basic badge data loading
 * ✅ Error Handling - Award failures and edge cases
 * ✅ User Reset - Data clearing on logout
 * ✅ Computed Signals - UI data combination logic
 *
 * ❌ SKIPPED (Low user impact):
 * - Administrative CRUD operations
 * - Complex cache edge cases
 * - Badge leaderboards and statistics
 * - Debug methods and utilities
 */

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { AuthStore } from '@auth/data-access/auth.store';
import { ToastService } from '@fourfold/angular-foundation';
import { CacheService } from '@shared/data-access/cache.service';
import { useTestSuite } from '@shared/testing/core/mock-registry';
import { UserStore } from '@users/data-access/user.store';
import type { User } from '@users/utils/user.model';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Badge, EarnedBadge } from '../utils/badge.model';
import { BadgeService } from './badge.service';
import { BadgeStore } from './badge.store';

describe('BadgeStore - User Experience Tests', () => {
  let store: BadgeStore;
  let mockBadgeService: any;
  let mockCacheService: any;
  let mockUserStore: any;
  let mockAuthStore: any;

  const { mocks, cleanup } = useTestSuite('badge-store-tests');

  // Test data constants
  const testUser: User = {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    badgeCount: 0,
    badgeIds: [],
  };

  const testBadgeDefinition: Badge = {
    id: 'explorer-badge',
    name: 'Explorer',
    description: 'Visit your first pub',
    category: 'discovery',
    emoji: '🗺️',
  };

  const testEarnedBadge: EarnedBadge = {
    id: 'earned-123',
    userId: 'test-user-123',
    badgeId: 'explorer-badge',
    awardedAt: Date.now(),
    metadata: { pubId: 'pub-123' },
  };

  beforeEach(() => {
    // Create enhanced mocks for BadgeStore dependencies
    mockBadgeService = {
      getBadges: vi.fn(),
      getBadge: vi.fn(),
      awardBadge: vi.fn(),
      getEarnedBadgesForUser: vi.fn(),
      updateUserBadgeSummary: vi.fn(),
      userHasBadge: vi.fn(),
    };

    mockCacheService = {
      load: vi.fn(),
      clear: vi.fn(),
    };

    mockUserStore = {
      updateBadgeSummary: vi.fn(),
    };

    mockAuthStore = {
      user: signal(testUser),
      uid: signal(testUser.uid),
      isAuthenticated: signal(true),
      authState: signal('authenticated' as const),
    };

    // Mock Firebase dependencies
    const mockFirebaseAuth = {
      currentUser: null,
      onAuthStateChanged: vi.fn(),
      signOut: vi.fn(),
    };

    const mockFirestore = {
      doc: vi.fn(),
      collection: vi.fn(),
    };

    const mockToastService = {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        BadgeStore,
        { provide: BadgeService, useValue: mockBadgeService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: UserStore, useValue: mockUserStore },
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: Auth, useValue: mockFirebaseAuth },
        { provide: Firestore, useValue: mockFirestore },
        { provide: ToastService, useValue: mockToastService },
      ],
    });

    store = TestBed.inject(BadgeStore);

    // Mock the _userId method from BaseStore
    Object.defineProperty(store, '_userId', {
      get: () => () => testUser.uid,
      configurable: true,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // ===================================
  // 🏆 BADGE AWARDING WORKFLOW
  // ===================================

  describe('Badge Awarding Workflow', () => {
    beforeEach(() => {
      // Setup successful badge definitions loading
      mockCacheService.load.mockImplementation(async ({ key }) => {
        if (key === 'badge-definitions') {
          return [testBadgeDefinition];
        }
        if (key === 'earned-badges') {
          return [];
        }
        return [];
      });

      // Setup successful badge awarding
      mockBadgeService.awardBadge.mockResolvedValue(testEarnedBadge);
      mockBadgeService.updateUserBadgeSummary.mockResolvedValue(undefined);
    });

    it('should successfully award badge with complete user experience flow', async () => {
      // Arrange - Load definitions first
      await store.loadDefinitions();

      // Act - Award badge
      const result = await store.awardBadge('explorer-badge', { pubId: 'pub-123' });

      // Assert - Complete workflow verification
      expect(mockBadgeService.awardBadge).toHaveBeenCalledWith(testUser.uid, 'explorer-badge', {
        pubId: 'pub-123',
      });

      expect(result).toEqual(testEarnedBadge);

      // Verify user summary was updated for performance
      expect(mockBadgeService.updateUserBadgeSummary).toHaveBeenCalledWith(
        testUser.uid,
        expect.objectContaining({
          badgeCount: 1,
          badgeIds: ['explorer-badge'],
        })
      );

      // Verify cache was cleared for fresh data
      expect(mockCacheService.clear).toHaveBeenCalledWith('earned-badges', testUser.uid);
    });

    it('should update local state immediately after successful award', async () => {
      // Arrange
      await store.loadDefinitions();
      const initialCount = store.earnedBadgeCount();

      // Act
      await store.awardBadge('explorer-badge');

      // Assert - Local state reflects change
      expect(store.earnedBadgeCount()).toBe(initialCount + 1);
      expect(store.hasEarnedBadges()).toBe(true);
    });

    it('should handle badge awarding with metadata correctly', async () => {
      // Arrange
      await store.loadDefinitions();
      const metadata = { pubId: 'pub-123', reason: 'first-visit' };

      // Act
      await store.awardBadge('explorer-badge', metadata);

      // Assert
      expect(mockBadgeService.awardBadge).toHaveBeenCalledWith(
        testUser.uid,
        'explorer-badge',
        metadata
      );
    });
  });

  // ===================================
  // 🚫 DUPLICATE PREVENTION
  // ===================================

  describe('Duplicate Badge Prevention', () => {
    beforeEach(() => {
      mockCacheService.load.mockImplementation(async ({ key }) => {
        if (key === 'badge-definitions') {
          return [testBadgeDefinition];
        }
        if (key === 'earned-badges') {
          return [testEarnedBadge]; // User already has this badge
        }
        return [];
      });
    });

    it('should prevent awarding duplicate badges to same user', async () => {
      // Arrange - Load data with existing earned badge
      await store.loadDefinitions();
      await store.loadOnce();

      // Act & Assert
      await expect(store.awardBadge('explorer-badge')).rejects.toThrow(
        'User already has badge: explorer-badge'
      );

      // Verify service was never called
      expect(mockBadgeService.awardBadge).not.toHaveBeenCalled();
    });

    it('should use hasEarnedBadge() for duplicate checking', async () => {
      // Arrange
      await store.loadDefinitions();
      await store.loadOnce();

      // Act & Assert
      expect(store.hasEarnedBadge('explorer-badge')).toBe(true);
      expect(store.hasEarnedBadge('non-existent-badge')).toBe(false);
    });
  });

  // ===================================
  // 📚 DEFINITION LOADING
  // ===================================

  describe('Badge Definition Loading', () => {
    it('should load badge definitions successfully', async () => {
      // Arrange
      const definitions = [testBadgeDefinition, { ...testBadgeDefinition, id: 'badge-2' }];
      mockCacheService.load.mockResolvedValue(definitions);

      // Act
      await store.loadDefinitions();

      // Assert
      expect(store.definitions()).toEqual(definitions);
      expect(store.definitionsLoading()).toBe(false);
      expect(store.definitionsError()).toBe(null);
    });

    it('should use global cache for badge definitions', async () => {
      // Act
      await store.loadDefinitions();

      // Assert - Global cache (no userId)
      expect(mockCacheService.load).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'badge-definitions',
          ttlMs: 1000 * 60 * 60 * 24, // 24 hours
          // No userId - global cache
        })
      );
    });

    it('should not reload definitions if already loaded', async () => {
      // Arrange
      mockCacheService.load.mockResolvedValue([testBadgeDefinition]);
      await store.loadDefinitions();
      mockCacheService.load.mockClear();

      // Act - Try to load again
      await store.loadDefinitions();

      // Assert
      expect(mockCacheService.load).not.toHaveBeenCalled();
    });
  });

  // ===================================
  // ❌ ERROR HANDLING
  // ===================================

  describe('Error Handling', () => {
    beforeEach(() => {
      mockCacheService.load.mockImplementation(async ({ key }) => {
        if (key === 'badge-definitions') {
          return [testBadgeDefinition];
        }
        return [];
      });
    });

    it('should handle badge definition not found error', async () => {
      // Arrange
      await store.loadDefinitions();

      // Act & Assert
      await expect(store.awardBadge('non-existent-badge')).rejects.toThrow(
        'Badge definition not found: non-existent-badge'
      );
    });

    it('should handle unauthenticated user error', async () => {
      // Arrange - No authenticated user
      mockAuthStore.user.set(null);
      Object.defineProperty(store, '_userId', {
        get: () => () => null,
        configurable: true,
      });

      // Act & Assert
      await expect(store.awardBadge('explorer-badge')).rejects.toThrow('No authenticated user');
    });

    it('should handle badge service errors gracefully', async () => {
      // Arrange
      await store.loadDefinitions();
      const serviceError = new Error('Service unavailable');
      mockBadgeService.awardBadge.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(store.awardBadge('explorer-badge')).rejects.toThrow('Service unavailable');

      // Verify error state was set
      expect(store.error()).toBe('Service unavailable');
    });

    it('should handle definition loading errors', async () => {
      // Arrange
      const loadError = new Error('Network error');
      mockCacheService.load.mockRejectedValue(loadError);

      // Act
      await store.loadDefinitions();

      // Assert
      expect(store.definitionsError()).toBe('Network error');
      expect(store.definitionsLoading()).toBe(false);
    });
  });

  // ===================================
  // 👤 USER RESET BEHAVIOR
  // ===================================

  describe('User Reset Behavior', () => {
    it('should clear user-specific badge cache on user reset', () => {
      // Act
      store.reset();

      // Assert - Only user-specific cache cleared
      expect(mockCacheService.clear).toHaveBeenCalledWith('earned-badges', testUser.uid);

      // Global badge definitions cache should NOT be cleared
      expect(mockCacheService.clear).not.toHaveBeenCalledWith('badge-definitions');
    });

    it('should preserve global badge definitions on user logout', () => {
      // Arrange - Load definitions and earned badges
      const definitions = [testBadgeDefinition];
      mockCacheService.load.mockResolvedValue(definitions);

      // Act - Simulate user logout
      store.reset();

      // Assert - Definitions should remain available
      // (In real implementation, definitions persist across user sessions)
      expect(mockCacheService.clear).toHaveBeenCalledWith('earned-badges', testUser.uid);
      expect(mockCacheService.clear).not.toHaveBeenCalledWith('badge-definitions');
    });
  });

  // ===================================
  // 🔗 COMPUTED SIGNALS
  // ===================================

  describe('Computed Signals for UI', () => {
    beforeEach(() => {
      // Setup test data
      mockCacheService.load.mockImplementation(async ({ key }) => {
        if (key === 'badge-definitions') {
          return [testBadgeDefinition];
        }
        if (key === 'earned-badges') {
          return [testEarnedBadge];
        }
        return [];
      });
    });

    it('should combine earned badges with definitions correctly', async () => {
      // Arrange
      await store.loadDefinitions();
      await store.loadOnce();

      // Act
      const combined = store.earnedBadgesWithDefinitions();

      // Assert
      expect(combined).toHaveLength(1);
      expect(combined[0]).toEqual({
        earnedBadge: testEarnedBadge,
        badge: testBadgeDefinition,
      });
    });

    it('should filter out earned badges without valid definitions', async () => {
      // Arrange - Earned badge for non-existent definition
      const orphanedEarnedBadge = { ...testEarnedBadge, badgeId: 'non-existent' };

      mockCacheService.load.mockImplementation(async ({ key }) => {
        if (key === 'badge-definitions') {
          return [testBadgeDefinition]; // Only one definition
        }
        if (key === 'earned-badges') {
          return [testEarnedBadge, orphanedEarnedBadge]; // Two earned badges
        }
        return [];
      });

      await store.loadDefinitions();
      await store.loadOnce();

      // Act
      const combined = store.earnedBadgesWithDefinitions();

      // Assert - Only valid combinations returned
      expect(combined).toHaveLength(1);
      expect(combined[0].earnedBadge.badgeId).toBe('explorer-badge');
    });

    it('should calculate earned badge count correctly', async () => {
      // Arrange
      await store.loadOnce();

      // Act & Assert
      expect(store.earnedBadgeCount()).toBe(1);
      expect(store.hasEarnedBadges()).toBe(true);
    });

    it('should provide recent badges for display', async () => {
      // Arrange - Multiple badges with different timestamps
      const badges = [
        { ...testEarnedBadge, id: 'earned-1', awardedAt: Date.now() - 1000 },
        { ...testEarnedBadge, id: 'earned-2', awardedAt: Date.now() - 2000 },
        { ...testEarnedBadge, id: 'earned-3', awardedAt: Date.now() - 3000 },
      ];

      mockCacheService.load.mockImplementation(async ({ key }) => {
        if (key === 'badge-definitions') {
          return [testBadgeDefinition];
        }
        if (key === 'earned-badges') {
          return badges;
        }
        return [];
      });

      await store.loadDefinitions();
      await store.loadOnce();

      // Act
      const recent = store.recentBadges();

      // Assert - Sorted by most recent first
      expect(recent).toHaveLength(3);
      expect(recent[0].id).toBe('earned-1'); // Most recent
      expect(recent[2].id).toBe('earned-3'); // Oldest
    });
  });

  // ===================================
  // 🔍 QUERY METHODS
  // ===================================

  describe('Badge Query Methods', () => {
    beforeEach(async () => {
      mockCacheService.load.mockImplementation(async ({ key }) => {
        if (key === 'badge-definitions') {
          return [testBadgeDefinition];
        }
        if (key === 'earned-badges') {
          return [testEarnedBadge];
        }
        return [];
      });

      await store.loadDefinitions();
      await store.loadOnce();
    });

    it('should find earned badge by ID', () => {
      // Act & Assert
      const found = store.getEarnedBadge('explorer-badge');
      expect(found).toEqual(testEarnedBadge);

      const notFound = store.getEarnedBadge('non-existent');
      expect(notFound).toBeUndefined();
    });

    it('should get badge definition by ID', () => {
      // Act & Assert
      const found = store.getBadge('explorer-badge');
      expect(found).toEqual(testBadgeDefinition);

      const notFound = store.getBadge('non-existent');
      expect(notFound).toBeUndefined();
    });

    it('should filter badges by timestamp', () => {
      // Arrange - Badge earned 1 second ago
      const oneSecondAgo = Date.now() - 1000;

      // Act & Assert
      const recent = store.getEarnedBadgesSince(oneSecondAgo);
      expect(recent).toHaveLength(1);

      const ancient = store.getEarnedBadgesSince(Date.now() + 1000);
      expect(ancient).toHaveLength(0);
    });
  });
});
