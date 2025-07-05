import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { OnboardingComponent } from './onboarding.component';
import { AuthStore } from '@auth/data-access/auth.store';
import { UserStore } from '@users/data-access/user.store';
import { DataAggregatorService } from '../../../shared/data-access/data-aggregator.service';
import { AvatarService } from '../../../shared/data-access/avatar.service';
import { Router } from '@angular/router';
import type { User } from '@users/utils/user.model';
import type { Pub } from '../../../pubs/utils/pub.models';

// Simple mock implementation focused on testing core functionality
const createMockComponent = (selector: string) => ({
  selector,
  template: `<div>Mock ${selector}</div>`,
  standalone: true
});

describe('OnboardingComponent', () => {
  let component: OnboardingComponent;
  let fixture: ComponentFixture<OnboardingComponent>;

  const mockUser: User = {
    uid: 'user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: '/avatar.jpg',
    isAnonymous: false,
    emailVerified: true,
    onboardingCompleted: false,
    realUser: true,
    createdAt: new Date(),
    lastLoginAt: new Date(),
    homePubId: null
  };

  const mockPub: Pub = {
    id: 'pub-1',
    name: 'The Test Pub',
    city: 'Test City',
    region: 'Test Region',
    address: '123 Test St',
    lat: 51.5074,
    lng: -0.1278,
    managementCompany: null,
    checkinCount: 10,
    createdAt: new Date(),
    lastModified: new Date()
  };

  beforeEach(async () => {
    const mockAuthStore = {
      user: signal(null),
      loginWithGoogle: jest.fn().mockResolvedValue(undefined)
    };

    const mockUserStore = {
      user: signal(null),
      updateProfile: jest.fn().mockResolvedValue(undefined)
    };

    const mockDataAggregator = {
      user: signal(mockUser)
    };

    const mockAvatarService = {
      generateAvatarOptions: jest.fn().mockReturnValue([
        { id: 'avatar-1', name: 'Avatar 1', url: '/avatar1.jpg' }
      ])
    };

    const mockRouter = {
      navigate: jest.fn().mockResolvedValue(true)
    };

    // Create simple test module without complex dependencies
    await TestBed.configureTestingModule({
      imports: [OnboardingComponent],
      providers: [
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: UserStore, useValue: mockUserStore },
        { provide: DataAggregatorService, useValue: mockDataAggregator },
        { provide: AvatarService, useValue: mockAvatarService },
        { provide: Router, useValue: mockRouter },
        // Mock all other services to avoid dependency issues
        { provide: 'NotificationService', useValue: {} },
        { provide: 'LocationService', useValue: {} },
        { provide: 'ThemeStore', useValue: {} }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OnboardingComponent);
    component = fixture.componentInstance;

    // Mock DOM methods that the component uses
    Object.defineProperty(document, 'querySelector', {
      value: jest.fn().mockReturnValue({ style: {} }),
      writable: true
    });
  });

  describe('Core Functionality', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should start with welcome-message step', () => {
      expect(component.currentStep()).toBe('welcome-message');
    });

    it('should calculate progress percentage correctly', () => {
      component.currentStep.set('welcome-message');
      expect(component.progressPercentage()).toBe(0);

      component.currentStep.set('customize-profile');
      expect(component.progressPercentage()).toBe(50);

      component.currentStep.set('choose-local');
      expect(component.progressPercentage()).toBe(100);
    });

    it('should navigate between steps correctly', () => {
      const consoleSpy = jest.spyOn(console, 'log');

      component.proceedToCustomizeProfile();
      expect(component.currentStep()).toBe('customize-profile');
      expect(consoleSpy).toHaveBeenCalledWith('[Onboarding] Proceeding to customize profile');

      component.proceedToChooseLocal();
      expect(component.currentStep()).toBe('choose-local');
      expect(consoleSpy).toHaveBeenCalledWith('[Onboarding] Proceeding to choose local pub');
    });

    it('should go back to previous step', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      component.currentStep.set('choose-local');

      component.goBackToPreviousStep();

      expect(component.currentStep()).toBe('customize-profile');
      expect(consoleSpy).toHaveBeenCalledWith('[Onboarding] Navigating back from choose-local to customize-profile');
    });

    it('should handle display name changes', () => {
      component.onDisplayNameChange('New Name');
      expect(component.displayName()).toBe('New Name');
    });

    it('should handle avatar selection', () => {
      component.onAvatarSelected('avatar-123');
      expect(component.selectedAvatarId()).toBe('avatar-123');
    });

    it('should handle pub selection', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      component.onHomePubSelected(mockPub);

      expect(component.selectedHomePubId()).toBe('pub-1');
      expect(component.selectedHomePub()).toBe(mockPub);
      expect(consoleSpy).toHaveBeenCalledWith('[Onboarding] Home pub selected:', 'The Test Pub');
    });

    it('should handle null pub selection', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      component.onHomePubSelected(null);

      expect(component.selectedHomePubId()).toBeNull();
      expect(component.selectedHomePub()).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('[Onboarding] Home pub selected:', 'none');
    });

    it('should generate random display name', () => {
      component.generateRandomDisplayName();
      expect(component.displayName()).toBeTruthy();
      expect(component.displayName().length).toBeGreaterThan(0);
    });
  });

  describe('Location Permission', () => {
    beforeEach(() => {
      Object.defineProperty(global.navigator, 'geolocation', {
        value: { getCurrentPosition: jest.fn() },
        writable: true
      });
    });

    it('should handle successful location permission', async () => {
      const mockPosition = {
        coords: { latitude: 51.5074, longitude: -0.1278, accuracy: 100 }
      };

      (navigator.geolocation.getCurrentPosition as jest.Mock).mockImplementation((success) => {
        success(mockPosition);
      });

      const consoleSpy = jest.spyOn(console, 'log');
      await component.requestLocationPermission();

      expect(component.locationGranted()).toBe(true);
      expect(component.locationRequired()).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('[Onboarding] ✅ Location permission granted and position acquired');
    });

    it('should handle location permission failure', async () => {
      const mockError = { code: 1, message: 'Permission denied' };

      (navigator.geolocation.getCurrentPosition as jest.Mock).mockImplementation((success, error) => {
        error(mockError);
      });

      const consoleSpy = jest.spyOn(console, 'error');
      await component.requestLocationPermission();

      expect(component.locationGranted()).toBe(false);
      expect(component.locationRequired()).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('[Onboarding] ❌ Location permission failed:', mockError);
    });
  });

  describe('Onboarding Completion', () => {
    it('should complete onboarding successfully', async () => {
      component.displayName.set('Test User');
      component.selectedAvatarId.set('avatar-123');
      component.selectedHomePubId.set('pub-1');

      const userStore = TestBed.inject(UserStore) as any;
      const router = TestBed.inject(Router) as any;
      const consoleSpy = jest.spyOn(console, 'log');

      await component.completeOnboarding();

      expect(userStore.updateProfile).toHaveBeenCalledWith({
        displayName: 'Test User',
        photoURL: expect.any(String),
        homePubId: 'pub-1',
        onboardingCompleted: true,
        realUser: true
      });
      expect(router.navigate).toHaveBeenCalledWith(['/']);
      expect(consoleSpy).toHaveBeenCalledWith('[Onboarding] ✅ Navigation to home completed');
    });

    it('should not complete if already saving', async () => {
      component.saving.set(true);
      const userStore = TestBed.inject(UserStore) as any;

      await component.completeOnboarding();

      expect(userStore.updateProfile).not.toHaveBeenCalled();
    });
  });
});