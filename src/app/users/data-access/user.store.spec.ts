/**
 * @fileoverview UserStore Tests - Protecting scoreboard data accuracy
 * 
 * CRITICAL TESTS:
 * - pubsVisited computed signal accuracy
 * - totalPoints computed signal accuracy  
 * - patchUser() real-time updates for scoreboard
 * - Auth-reactive loading/clearing behavior
 */
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { UserStore } from './user.store';
import { UserService } from './user.service';
import { AuthStore } from '../../auth/data-access/auth.store';
import type { User } from '../utils/user.model';

describe('UserStore - Scoreboard Data Protection', () => {
  let userStore: UserStore;
  let mockUserService: jest.Mocked<UserService>;
  let mockAuthStore: { user: ReturnType<typeof signal<any>> };

  // Test user data
  const mockUser: User = {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    isAnonymous: false,
    emailVerified: true,
    checkedInPubIds: ['pub1', 'pub2', 'pub3'],
    totalPoints: 250,
    badgeCount: 5,
    badgeIds: ['badge1', 'badge2'],
    landlordCount: 2,
    landlordPubIds: ['pub1', 'pub2'],
    streaks: {},
    joinedMissionIds: [],
    joinedAt: new Date().toISOString()
  };

  beforeEach(() => {
    // Create mock services using Jest
    mockUserService = {
      getUser: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn()
    } as any;
    
    // Create mock AuthStore with signal
    mockAuthStore = {
      user: signal(null)
    };

    TestBed.configureTestingModule({
      providers: [
        UserStore,
        { provide: UserService, useValue: mockUserService },
        { provide: AuthStore, useValue: mockAuthStore }
      ]
    });

    userStore = TestBed.inject(UserStore);
  });

  describe('Scoreboard Data Computed Signals', () => {
    it('should calculate pubsVisited from checkedInPubIds', () => {
      // Arrange - Set user with 3 checked-in pubs
      userStore.setUser(mockUser);

      // Act & Assert
      expect(userStore.pubsVisited()).toBe(3);
      
      console.log('✅ pubsVisited computed correctly:', userStore.pubsVisited());
    });

    it('should return 0 pubsVisited for user with no check-ins', () => {
      // Arrange - User with empty checkedInPubIds
      const newUser: User = { ...mockUser, checkedInPubIds: [] };
      userStore.setUser(newUser);

      // Act & Assert
      expect(userStore.pubsVisited()).toBe(0);
    });

    it('should return 0 pubsVisited when no user loaded', () => {
      // Arrange - No user
      userStore.setUser(null);

      // Act & Assert
      expect(userStore.pubsVisited()).toBe(0);
    });

    it('should calculate totalPoints from user data', () => {
      // Arrange
      userStore.setUser(mockUser);

      // Act & Assert
      expect(userStore.totalPoints()).toBe(250);
      
      console.log('✅ totalPoints computed correctly:', userStore.totalPoints());
    });

    it('should return 0 totalPoints when no user loaded', () => {
      // Arrange
      userStore.setUser(null);

      // Act & Assert
      expect(userStore.totalPoints()).toBe(0);
    });
  });

  describe('Real-time Updates for Scoreboard', () => {
    beforeEach(() => {
      // Set initial user
      userStore.setUser(mockUser);
    });

    it('should update pubsVisited immediately when checkedInPubIds changes', () => {
      // Arrange - Initial state: 3 pubs
      expect(userStore.pubsVisited()).toBe(3);

      // Act - Add new pub via patchUser (simulating check-in)
      userStore.patchUser({ 
        checkedInPubIds: [...mockUser.checkedInPubIds, 'pub4'] 
      });

      // Assert - Should immediately reflect new count
      expect(userStore.pubsVisited()).toBe(4);
      
      console.log('✅ pubsVisited updated immediately after check-in');
    });

    it('should update totalPoints immediately when points change', () => {
      // Arrange - Initial state: 250 points
      expect(userStore.totalPoints()).toBe(250);

      // Act - Award points via patchUser (simulating PointsStore update)
      userStore.patchUser({ totalPoints: 275 });

      // Assert - Should immediately reflect new total
      expect(userStore.totalPoints()).toBe(275);
      
      console.log('✅ totalPoints updated immediately after points award');
    });

    it('should handle multiple simultaneous updates', () => {
      // Act - Simulate complete check-in with points and new pub
      userStore.patchUser({
        totalPoints: 285,
        checkedInPubIds: [...mockUser.checkedInPubIds, 'pub4', 'pub5'],
        badgeCount: 6
      });

      // Assert - All values should update immediately
      expect(userStore.totalPoints()).toBe(285);
      expect(userStore.pubsVisited()).toBe(5);
      expect(userStore.badgeCount()).toBe(6);
      
      console.log('✅ Multiple scoreboard values updated simultaneously');
    });
  });

  describe('Auth-Reactive Behavior', () => {
    it('should clear scoreboard data when user logs out', () => {
      // Arrange - User logged in with data
      userStore.setUser(mockUser);
      expect(userStore.pubsVisited()).toBe(3);
      expect(userStore.totalPoints()).toBe(250);

      // Act - Simulate logout
      userStore.reset();

      // Assert - All scoreboard data should be cleared
      expect(userStore.pubsVisited()).toBe(0);
      expect(userStore.totalPoints()).toBe(0);
      expect(userStore.user()).toBeNull();
      
      console.log('✅ Scoreboard data cleared on logout');
    });

    it('should maintain data consistency during user switches', () => {
      // Arrange - User 1 logged in
      userStore.setUser(mockUser);
      
      // Act - Switch to different user
      const user2: User = {
        ...mockUser,
        uid: 'user-2',
        checkedInPubIds: ['pub10'],
        totalPoints: 50
      };
      userStore.setUser(user2);

      // Assert - Should show new user's data immediately
      expect(userStore.pubsVisited()).toBe(1);
      expect(userStore.totalPoints()).toBe(50);
      
      console.log('✅ Clean user switch without stale data');
    });
  });

  describe('Error Handling', () => {
    it('should handle gracefully when user has undefined fields', () => {
      // Arrange - User with missing optional fields
      const incompleteUser: User = {
        ...mockUser,
        checkedInPubIds: undefined as any,
        totalPoints: undefined as any
      };
      
      // Act
      userStore.setUser(incompleteUser);

      // Assert - Should default to safe values
      expect(userStore.pubsVisited()).toBe(0);
      expect(userStore.totalPoints()).toBe(0);
      
      console.log('✅ Handles undefined fields gracefully');
    });

    it('should prevent patchUser when no user is loaded', () => {
      // Arrange - No user loaded
      userStore.setUser(null);
      
      // Act - Try to patch user
      userStore.patchUser({ totalPoints: 100 });

      // Assert - Should remain at default values
      expect(userStore.totalPoints()).toBe(0);
      expect(userStore.user()).toBeNull();
      
      console.log('✅ Prevents invalid updates when no user');
    });
  });
});