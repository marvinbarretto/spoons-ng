// src/app/home/ui/user-profile-widget/user-profile-widget.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { User } from '@users/utils/user.model';
import { UserProfileWidgetComponent } from './user-profile-widget.component';

describe('UserProfileWidgetComponent', () => {
  let component: UserProfileWidgetComponent;
  let fixture: ComponentFixture<UserProfileWidgetComponent>;

  const createMockUser = (overrides: Partial<User> = {}): User =>
    ({
      uid: 'test-user',
      displayName: 'Test User',
      photoURL: null,
      isAnonymous: false,
      ...overrides,
    }) as User;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserProfileWidgetComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UserProfileWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Display Name Logic', () => {
    it('should show "Guest" for null user', () => {
      expect(component.displayName()).toBe('Guest');
    });

    it('should show regular display name', () => {
      const user = createMockUser({ displayName: 'John Doe' });
      fixture.componentRef.setInput('user', user);
      fixture.detectChanges();

      expect(component.displayName()).toBe('John Doe');
    });

    it('should convert "Anonymous" to "Explorer" for anonymous users', () => {
      const user = createMockUser({
        displayName: 'Anonymous User 123',
        isAnonymous: true,
      });
      fixture.componentRef.setInput('user', user);
      fixture.detectChanges();

      expect(component.displayName()).toBe('Explorer User 123');
    });
  });

  describe('Event Emission', () => {
    it('should emit openProfile when clicked', () => {
      jest.spyOn(component.openProfile, 'emit');

      component.handleOpenProfile();

      expect(component.openProfile.emit).toHaveBeenCalled();
    });

    it('should emit openProfile when widget is clicked', () => {
      jest.spyOn(component.openProfile, 'emit');

      const widget = fixture.debugElement.nativeElement.querySelector('.user-profile-widget');
      widget.click();

      expect(component.openProfile.emit).toHaveBeenCalled();
    });
  });

  describe('DOM Rendering', () => {
    it('should show avatar or placeholder correctly', () => {
      // Test with no avatar
      const userNoAvatar = createMockUser();
      fixture.componentRef.setInput('user', userNoAvatar);
      fixture.detectChanges();

      let avatar = fixture.debugElement.nativeElement.querySelector('.avatar');
      expect(avatar.classList.contains('placeholder')).toBe(true);

      // Test with avatar
      const userWithAvatar = createMockUser({ photoURL: 'https://example.com/avatar.jpg' });
      fixture.componentRef.setInput('user', userWithAvatar);
      fixture.detectChanges();

      avatar = fixture.debugElement.nativeElement.querySelector('.avatar');
      expect(avatar.classList.contains('placeholder')).toBe(false);
      expect(avatar.src).toBe('https://example.com/avatar.jpg');
    });

    it('should display user name correctly', () => {
      const user = createMockUser({ displayName: 'John Doe' });
      fixture.componentRef.setInput('user', user);
      fixture.detectChanges();

      const userName = fixture.debugElement.nativeElement.querySelector('.user-name');
      expect(userName?.textContent.trim()).toBe('John Doe');
    });
  });
});
