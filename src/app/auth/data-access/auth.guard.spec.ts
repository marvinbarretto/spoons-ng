import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Router } from '@angular/router';
import { signal } from '@angular/core';

import { authGuard } from './auth.guard';
import { AuthStore } from './auth.store';
import type { User } from '@users/utils/user.model';

describe('authGuard', () => {
  let mockAuthStore: jest.Mocked<AuthStore>;
  let mockRouter: jest.Mocked<Router>;
  let mockUser: User;

  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => authGuard(...guardParameters));

  beforeEach(() => {
    // Mock user object
    mockUser = {
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Test User',
      photoURL: null,
      isAnonymous: false,
      emailVerified: true,
      streaks: {},
      joinedAt: new Date().toISOString(),
      badgeCount: 0,
    };

    // Mock AuthStore with signals
    mockAuthStore = {
      hasSeenSplash: jest.fn(),
      isAuthenticated: jest.fn(),
      user: jest.fn(),
      isExplicitGuest: jest.fn(),
    } as any;

    // Mock Router
    mockRouter = {
      navigate: jest.fn(),
    } as any;

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: Router, useValue: mockRouter },
      ],
    });
  });

  describe('splash screen check', () => {
    it('should redirect to splash if user has not seen splash', () => {
      mockAuthStore.hasSeenSplash.mockReturnValue(false);

      const result = executeGuard({} as any, {} as any);

      expect(result).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/splash']);
    });

    it('should proceed with auth checks if user has seen splash', () => {
      mockAuthStore.hasSeenSplash.mockReturnValue(true);
      mockAuthStore.isAuthenticated.mockReturnValue(false);

      const result = executeGuard({} as any, {} as any);

      expect(result).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('authenticated user checks', () => {
    beforeEach(() => {
      mockAuthStore.hasSeenSplash.mockReturnValue(true);
      mockAuthStore.isAuthenticated.mockReturnValue(true);
    });

    it('should allow access for real (non-anonymous) users', () => {
      mockAuthStore.user.mockReturnValue(mockUser);

      const result = executeGuard({} as any, {} as any);

      expect(result).toBe(true);
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should allow access for explicit guest users', () => {
      const anonymousUser = { ...mockUser, isAnonymous: true };
      mockAuthStore.user.mockReturnValue(anonymousUser);
      mockAuthStore.isExplicitGuest.mockReturnValue(true);

      const result = executeGuard({} as any, {} as any);

      expect(result).toBe(true);
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should redirect anonymous users who are not explicit guests to login', () => {
      const anonymousUser = { ...mockUser, isAnonymous: true };
      mockAuthStore.user.mockReturnValue(anonymousUser);
      mockAuthStore.isExplicitGuest.mockReturnValue(false);

      const result = executeGuard({} as any, {} as any);

      expect(result).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('unauthenticated user checks', () => {
    beforeEach(() => {
      mockAuthStore.hasSeenSplash.mockReturnValue(true);
      mockAuthStore.isAuthenticated.mockReturnValue(false);
    });

    it('should redirect unauthenticated users to login if they have seen splash', () => {
      const result = executeGuard({} as any, {} as any);

      expect(result).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('integration scenarios', () => {
    it('should handle first-time visitor correctly', () => {
      mockAuthStore.hasSeenSplash.mockReturnValue(false);
      mockAuthStore.isAuthenticated.mockReturnValue(false);

      const result = executeGuard({} as any, {} as any);

      expect(result).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/splash']);
    });

    it('should handle returning guest user correctly', () => {
      mockAuthStore.hasSeenSplash.mockReturnValue(true);
      mockAuthStore.isAuthenticated.mockReturnValue(true);
      const anonymousUser = { ...mockUser, isAnonymous: true };
      mockAuthStore.user.mockReturnValue(anonymousUser);
      mockAuthStore.isExplicitGuest.mockReturnValue(true);

      const result = executeGuard({} as any, {} as any);

      expect(result).toBe(true);
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should handle returning registered user correctly', () => {
      mockAuthStore.hasSeenSplash.mockReturnValue(true);
      mockAuthStore.isAuthenticated.mockReturnValue(true);
      mockAuthStore.user.mockReturnValue(mockUser);

      const result = executeGuard({} as any, {} as any);

      expect(result).toBe(true);
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });
});
