import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { AuthStore } from '@auth/data-access/auth.store';
import { SplashComponent } from './splash.component';

describe('SplashComponent', () => {
  let component: SplashComponent;
  let fixture: ComponentFixture<SplashComponent>;
  let mockAuthStore: jest.Mocked<AuthStore>;
  let mockRouter: jest.Mocked<Router>;

  beforeEach(async () => {
    // Mock AuthStore
    mockAuthStore = {
      markSplashAsSeen: jest.fn(),
      continueAsGuest: jest.fn(),
    } as any;

    // Mock Router
    mockRouter = {
      navigate: jest.fn(),
    } as any;

    await TestBed.configureTestingModule({
      imports: [SplashComponent],
      providers: [
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SplashComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('navigateToLogin', () => {
    it('should mark splash as seen and navigate to login', async () => {
      mockRouter.navigate.mockResolvedValue(true);

      await component.navigateToLogin();

      expect(mockAuthStore.markSplashAsSeen).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should handle navigation errors gracefully', async () => {
      mockRouter.navigate.mockRejectedValue(new Error('Navigation failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await component.navigateToLogin();

      expect(mockAuthStore.markSplashAsSeen).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);

      consoleSpy.mockRestore();
    });

    it('should manage loading state correctly', async () => {
      mockRouter.navigate.mockResolvedValue(true);

      expect(component.loading()).toBe(false);

      const navigationPromise = component.navigateToLogin();
      expect(component.loading()).toBe(true);

      await navigationPromise;
      expect(component.loading()).toBe(false);
    });
  });

  describe('navigateToRegister', () => {
    it('should mark splash as seen and navigate to register', async () => {
      mockRouter.navigate.mockResolvedValue(true);

      await component.navigateToRegister();

      expect(mockAuthStore.markSplashAsSeen).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/register']);
    });

    it('should handle navigation errors gracefully', async () => {
      mockRouter.navigate.mockRejectedValue(new Error('Navigation failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await component.navigateToRegister();

      expect(mockAuthStore.markSplashAsSeen).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/register']);

      consoleSpy.mockRestore();
    });

    it('should manage loading state correctly', async () => {
      mockRouter.navigate.mockResolvedValue(true);

      expect(component.loading()).toBe(false);

      const navigationPromise = component.navigateToRegister();
      expect(component.loading()).toBe(true);

      await navigationPromise;
      expect(component.loading()).toBe(false);
    });
  });

  describe('continueAsGuest', () => {
    it('should call authStore.continueAsGuest and navigate to home', async () => {
      mockAuthStore.continueAsGuest.mockResolvedValue();
      mockRouter.navigate.mockResolvedValue(true);

      await component.continueAsGuest();

      expect(mockAuthStore.continueAsGuest).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
    });

    it('should handle guest authentication errors', async () => {
      mockAuthStore.continueAsGuest.mockRejectedValue(new Error('Auth failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await component.continueAsGuest();

      expect(mockAuthStore.continueAsGuest).toHaveBeenCalled();
      expect(mockRouter.navigate).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should manage guest loading state correctly', async () => {
      mockAuthStore.continueAsGuest.mockResolvedValue();
      mockRouter.navigate.mockResolvedValue(true);

      expect(component.guestLoading()).toBe(false);

      const guestPromise = component.continueAsGuest();
      expect(component.guestLoading()).toBe(true);

      await guestPromise;
      expect(component.guestLoading()).toBe(false);
    });

    it('should reset guest loading state on error', async () => {
      mockAuthStore.continueAsGuest.mockRejectedValue(new Error('Auth failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(component.guestLoading()).toBe(false);

      await component.continueAsGuest();

      expect(component.guestLoading()).toBe(false);
      consoleSpy.mockRestore();
    });
  });

  describe('splash seen tracking', () => {
    it('should mark splash as seen for all user actions', async () => {
      mockRouter.navigate.mockResolvedValue(true);
      mockAuthStore.continueAsGuest.mockResolvedValue();

      await component.navigateToLogin();
      await component.navigateToRegister();
      await component.continueAsGuest();

      expect(mockAuthStore.markSplashAsSeen).toHaveBeenCalledTimes(2);
      // continueAsGuest calls markSplashAsSeen internally in AuthStore
      expect(mockAuthStore.continueAsGuest).toHaveBeenCalledTimes(1);
    });
  });
});
