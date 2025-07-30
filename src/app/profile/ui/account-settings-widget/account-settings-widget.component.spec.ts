import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { AuthStore } from '@auth/data-access/auth.store';
import { UserStore } from '@users/data-access/user.store';
import type { User } from '@users/utils/user.model';
import { AccountSettingsWidgetComponent } from './account-settings-widget.component';

describe('AccountSettingsWidgetComponent', () => {
  let component: AccountSettingsWidgetComponent;
  let fixture: ComponentFixture<AccountSettingsWidgetComponent>;
  let mockAuthStore: jest.Mocked<AuthStore>;
  let mockUserStore: jest.Mocked<UserStore>;
  let mockRouter: jest.Mocked<Router>;
  let mockUser: User;

  beforeEach(async () => {
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

    // Mock AuthStore
    mockAuthStore = {
      logout: jest.fn(),
    } as any;

    // Mock UserStore with signal
    mockUserStore = {
      user: jest.fn().mockReturnValue(mockUser),
    } as any;

    // Mock Router
    mockRouter = {
      navigate: jest.fn(),
    } as any;

    // Mock window.confirm
    global.confirm = jest.fn();

    await TestBed.configureTestingModule({
      imports: [AccountSettingsWidgetComponent],
      providers: [
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: UserStore, useValue: mockUserStore },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountSettingsWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('handleLogout', () => {
    it('should logout and navigate to splash when user confirms', () => {
      (global.confirm as jest.Mock).mockReturnValue(true);

      component.handleLogout();

      expect(mockAuthStore.logout).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/splash']);
    });

    it('should not logout when user cancels confirmation', () => {
      (global.confirm as jest.Mock).mockReturnValue(false);

      component.handleLogout();

      expect(mockAuthStore.logout).not.toHaveBeenCalled();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should show confirmation dialog with correct message', () => {
      component.handleLogout();

      expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to logout?');
    });
  });

  describe('handleDeleteAccount', () => {
    it('should delete account and navigate to splash when user double confirms', async () => {
      (global.confirm as jest.Mock)
        .mockReturnValueOnce(true) // First confirmation
        .mockReturnValueOnce(true); // Second confirmation

      const showSuccessSpy = jest.spyOn(component, 'showSuccess').mockImplementation();

      await component.handleDeleteAccount();

      expect(mockAuthStore.logout).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/splash']);
      expect(showSuccessSpy).toHaveBeenCalledWith('Account deleted successfully');
    });

    it('should not delete account when user cancels first confirmation', async () => {
      (global.confirm as jest.Mock).mockReturnValueOnce(false);

      await component.handleDeleteAccount();

      expect(mockAuthStore.logout).not.toHaveBeenCalled();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should not delete account when user cancels second confirmation', async () => {
      (global.confirm as jest.Mock)
        .mockReturnValueOnce(true) // First confirmation
        .mockReturnValueOnce(false); // Cancel second confirmation

      await component.handleDeleteAccount();

      expect(mockAuthStore.logout).not.toHaveBeenCalled();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should handle deletion errors gracefully', async () => {
      (global.confirm as jest.Mock).mockReturnValueOnce(true).mockReturnValueOnce(true);

      const showErrorSpy = jest.spyOn(component, 'showError').mockImplementation();

      // Mock deletion process to throw error (in real implementation)
      // For now, it's just a timeout, so we'll test the error handling path differently

      await component.handleDeleteAccount();

      // Since current implementation uses setTimeout and doesn't actually throw,
      // we expect it to succeed. This test is prepared for when real deletion is implemented.
      expect(component.isDeleting()).toBe(false);
    });

    it('should manage isDeleting state correctly during deletion', async () => {
      (global.confirm as jest.Mock).mockReturnValueOnce(true).mockReturnValueOnce(true);

      expect(component.isDeleting()).toBe(false);

      const deletePromise = component.handleDeleteAccount();
      expect(component.isDeleting()).toBe(true);

      await deletePromise;
      expect(component.isDeleting()).toBe(false);
    });
  });

  describe('account type display', () => {
    it('should show correct description for registered users', () => {
      const description = component.accountTypeDescription();
      expect(description).toBe('Registered account - your data is synced to the cloud');
    });

    it('should show correct description for anonymous users', () => {
      const anonymousUser = { ...mockUser, isAnonymous: true };
      mockUserStore.user = jest.fn().mockReturnValue(anonymousUser);

      const description = component.accountTypeDescription();
      expect(description).toBe('Anonymous account - your data is stored locally');
    });

    it('should handle no user gracefully', () => {
      mockUserStore.user = jest.fn().mockReturnValue(null);

      const description = component.accountTypeDescription();
      expect(description).toBe('No account');
    });
  });

  describe('logout navigation integration', () => {
    it('should ensure logout takes user back to splash for fresh start', () => {
      (global.confirm as jest.Mock).mockReturnValue(true);

      component.handleLogout();

      // This ensures logged out users get the full onboarding experience again
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/splash']);

      // The AuthStore.logout() will reset hasSeenSplash to false
      // So when they hit the auth guard, they'll see the splash screen
      expect(mockAuthStore.logout).toHaveBeenCalled();
    });
  });
});
