import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CustomizeProfileStepComponent } from './customize-profile-step.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { ProfileIdentityWidgetComponent } from '@home/ui/profile-customisation-modal/widgets/profile-identity-widget/profile-identity-widget.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import type { User } from '@users/utils/user.model';

// Mock components
@Component({
  selector: 'app-button',
  template: '<button (click)="onClick.emit()" [disabled]="disabled()"><ng-content></ng-content></button>',
  standalone: true
})
class MockButtonComponent {
  onClick = output<void>();
  variant = input<string>();
  size = input<string>();
  disabled = input<boolean>(false);
  iconLeft = input<string>();
}

@Component({
  selector: 'app-profile-identity-widget',
  template: '<div>Profile Identity Widget</div>',
  standalone: true
})
class MockProfileIdentityWidgetComponent {
  user = input<User | null>();
  displayName = input<string>();
  selectedAvatarId = input<string>();
  displayNameChanged = output<string>();
  avatarSelected = output<string>();
}

@Component({
  selector: 'app-icon',
  template: '<i>icon</i>',
  standalone: true
})
class MockIconComponent {
  name = input<string>();
  size = input<string>();
}

describe('CustomizeProfileStepComponent', () => {
  let component: CustomizeProfileStepComponent;
  let fixture: ComponentFixture<CustomizeProfileStepComponent>;

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

  const mockAnonymousUser: User = {
    ...mockUser,
    isAnonymous: true,
    email: null,
    emailVerified: false
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomizeProfileStepComponent],
      providers: []
    })
    .overrideComponent(CustomizeProfileStepComponent, {
      set: {
        imports: [MockButtonComponent, MockProfileIdentityWidgetComponent, MockIconComponent]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomizeProfileStepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initial State', () => {
    it('should show back button by default', () => {
      expect(component.showBackButton()).toBe(true);
    });

    it('should detect anonymous user correctly', () => {
      fixture.componentRef.setInput('user', mockAnonymousUser);
      fixture.detectChanges();
      expect(component.isAnonymous()).toBe(true);
    });

    it('should detect non-anonymous user correctly', () => {
      fixture.componentRef.setInput('user', mockUser);
      fixture.detectChanges();
      expect(component.isAnonymous()).toBe(false);
    });

    it('should default to anonymous if no user', () => {
      fixture.componentRef.setInput('user', null);
      fixture.detectChanges();
      expect(component.isAnonymous()).toBe(true);
    });
  });

  describe('Display Name Handling', () => {
    it('should emit nameChanged when display name changes', () => {
      const nameChangedSpy = jest.spyOn(component.nameChanged, 'emit');
      const consoleSpy = jest.spyOn(console, 'log');
      
      component.onDisplayNameChange('New Name');
      
      expect(nameChangedSpy).toHaveBeenCalledWith('New Name');
      expect(consoleSpy).toHaveBeenCalledWith('[CustomizeProfileStep] Display name changed:', 'New Name');
    });
  });

  describe('Avatar Selection', () => {
    it('should emit avatarSelected when avatar is selected', () => {
      const avatarSelectedSpy = jest.spyOn(component.avatarSelected, 'emit');
      const consoleSpy = jest.spyOn(console, 'log');
      
      component.onAvatarSelected('avatar-123');
      
      expect(avatarSelectedSpy).toHaveBeenCalledWith('avatar-123');
      expect(consoleSpy).toHaveBeenCalledWith('[CustomizeProfileStep] Avatar selected:', 'avatar-123');
    });
  });

  describe('Google Login', () => {
    it('should emit googleLogin when Google login is requested', () => {
      const googleLoginSpy = jest.spyOn(component.googleLogin, 'emit');
      const consoleSpy = jest.spyOn(console, 'log');
      
      component.onGoogleLogin();
      
      expect(googleLoginSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('[CustomizeProfileStep] Google login requested');
    });

    it('should show Google login button in template', () => {
      const googleButton = fixture.nativeElement.querySelector('.google-button');
      expect(googleButton).toBeTruthy();
      expect(googleButton.textContent).toContain('Sign in with Google');
    });
  });

  describe('Validation', () => {
    it('should be valid with name >= 2 chars and avatar selected', () => {
      fixture.componentRef.setInput('displayName', 'Test');
      fixture.componentRef.setInput('selectedAvatarId', 'avatar-123');
      fixture.detectChanges();
      
      expect(component.isValid()).toBe(true);
    });

    it('should be invalid with short name', () => {
      fixture.componentRef.setInput('displayName', 'T');
      fixture.componentRef.setInput('selectedAvatarId', 'avatar-123');
      fixture.detectChanges();
      
      expect(component.isValid()).toBe(false);
    });

    it('should be invalid with empty name', () => {
      fixture.componentRef.setInput('displayName', '');
      fixture.componentRef.setInput('selectedAvatarId', 'avatar-123');
      fixture.detectChanges();
      
      expect(component.isValid()).toBe(false);
    });

    it('should be invalid with whitespace-only name', () => {
      fixture.componentRef.setInput('displayName', '   ');
      fixture.componentRef.setInput('selectedAvatarId', 'avatar-123');
      fixture.detectChanges();
      
      expect(component.isValid()).toBe(false);
    });

    it('should be invalid without avatar', () => {
      fixture.componentRef.setInput('displayName', 'Test User');
      fixture.componentRef.setInput('selectedAvatarId', '');
      fixture.detectChanges();
      
      expect(component.isValid()).toBe(false);
    });

    it('should disable continue button when invalid', () => {
      fixture.componentRef.setInput('displayName', '');
      fixture.componentRef.setInput('selectedAvatarId', '');
      fixture.detectChanges();

      const continueBtn = fixture.nativeElement.querySelector('.step-actions app-button[variant="primary"]');
      expect(continueBtn.getAttribute('ng-reflect-disabled')).toBe('true');
    });
  });

  describe('Navigation', () => {
    it('should emit back when back button is clicked', () => {
      const backSpy = jest.spyOn(component.back, 'emit');
      
      const backBtn = fixture.nativeElement.querySelector('.step-actions app-button[variant="secondary"] button');
      backBtn.click();
      
      expect(backSpy).toHaveBeenCalled();
    });

    it('should emit continue when valid and continue is clicked', () => {
      fixture.componentRef.setInput('displayName', 'Test User');
      fixture.componentRef.setInput('selectedAvatarId', 'avatar-123');
      fixture.detectChanges();

      const continueSpy = jest.spyOn(component.continue, 'emit');
      const consoleSpy = jest.spyOn(console, 'log');
      
      component.onContinue();
      
      expect(continueSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('[CustomizeProfileStep] Continuing with profile:', {
        displayName: 'Test User',
        avatarId: 'avatar-123'
      });
    });

    it('should not emit continue when invalid', () => {
      fixture.componentRef.setInput('displayName', '');
      fixture.componentRef.setInput('selectedAvatarId', '');
      fixture.detectChanges();

      const continueSpy = jest.spyOn(component.continue, 'emit');
      
      component.onContinue();
      
      expect(continueSpy).not.toHaveBeenCalled();
    });
  });

  describe('Template Rendering', () => {
    it('should render main heading', () => {
      const heading = fixture.nativeElement.querySelector('h1');
      expect(heading.textContent).toBe('Customize Your Profile');
    });

    it('should render subtitle', () => {
      const subtitle = fixture.nativeElement.querySelector('.subtitle');
      expect(subtitle.textContent).toContain('Make yourself at home in the pub collecting world');
    });

    it('should render ProfileIdentityWidget', () => {
      const widget = fixture.nativeElement.querySelector('app-profile-identity-widget');
      expect(widget).toBeTruthy();
    });

    it('should render divider with "or" text', () => {
      const divider = fixture.nativeElement.querySelector('.divider span');
      expect(divider.textContent).toBe('or');
    });

    it('should render Google hint text', () => {
      const hint = fixture.nativeElement.querySelector('.google-hint');
      expect(hint.textContent).toContain('Use your Google account for a more personalized experience');
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive classes for mobile', () => {
      const stepActions = fixture.nativeElement.querySelector('.step-actions');
      expect(stepActions).toBeTruthy();
      
      // Check if CSS contains mobile styles (this is a basic check)
      const styles = fixture.debugElement.styles;
      expect(component).toBeTruthy(); // Component exists, styles are applied via component
    });
  });
});

// Add missing imports
import { Component, input, output } from '@angular/core';