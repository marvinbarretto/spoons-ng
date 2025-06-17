// src/app/home/ui/user-profile-widget/user-profile-widget.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserProfileWidgetComponent } from './user-profile-widget.component';
import type { User } from '@users/utils/user.model';

describe('UserProfileWidgetComponent', () => {
  let component: UserProfileWidgetComponent;
  let fixture: ComponentFixture<UserProfileWidgetComponent>;

  const createMockUser = (overrides: Partial<User> = {}): User => ({
    uid: 'test-user',
    displayName: 'Test User',
    photoURL: null,
    isAnonymous: false,
    checkedInPubIds: [],
    badgeCount: 0,
    ...overrides
  } as User);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserProfileWidgetComponent]
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
        isAnonymous: true
      });
      fixture.componentRef.setInput('user', user);
      fixture.detectChanges();

      expect(component.displayName()).toBe('Explorer User 123');
    });
  });

  describe('Engagement Level Detection', () => {
    it('should identify new users correctly', () => {
      const newUser = createMockUser();
      fixture.componentRef.setInput('user', newUser);
      fixture.detectChanges();

      expect(component.engagementLevel()).toBe('new');
    });

    it('should identify casual users', () => {
      const casualUser = createMockUser({
        checkedInPubIds: ['pub1'],
        badgeCount: 1
      });
      fixture.componentRef.setInput('user', casualUser);
      fixture.detectChanges();

      expect(component.engagementLevel()).toBe('casual');
    });

    it('should identify regular users', () => {
      const regularUser = createMockUser({
        checkedInPubIds: ['pub1', 'pub2', 'pub3', 'pub4', 'pub5'],
        badgeCount: 3
      });
      fixture.componentRef.setInput('user', regularUser);
      fixture.detectChanges();

      expect(component.engagementLevel()).toBe('regular');
    });

    it('should identify expert users by high activity', () => {
      const expertUser = createMockUser({
        checkedInPubIds: Array(25).fill('pub').map((_, i) => `pub${i}`),
        badgeCount: 12
      });
      fixture.componentRef.setInput('user', expertUser);
      fixture.detectChanges();

      expect(component.engagementLevel()).toBe('expert');
    });

    it('should identify expert users by leaderboard position', () => {
      const leaderboardUser = createMockUser({
        checkedInPubIds: ['pub1', 'pub2'],
        badgeCount: 2
      });
      fixture.componentRef.setInput('user', leaderboardUser);
      fixture.componentRef.setInput('leaderboardPosition', 25);
      fixture.detectChanges();

      expect(component.engagementLevel()).toBe('expert');
    });
  });

  describe('Statistics Display', () => {
    it('should calculate pubs visited correctly', () => {
      const user = createMockUser({
        checkedInPubIds: ['pub1', 'pub2', 'pub3']
      });
      fixture.componentRef.setInput('user', user);
      fixture.detectChanges();

      expect(component.pubsVisited()).toBe(3);
    });

    it('should handle undefined checkedInPubIds', () => {
      const user = createMockUser({
        checkedInPubIds: undefined as any
      });
      fixture.componentRef.setInput('user', user);
      fixture.detectChanges();

      expect(component.pubsVisited()).toBe(0);
    });

    it('should get badge count from user summary', () => {
      const user = createMockUser({ badgeCount: 7 });
      fixture.componentRef.setInput('user', user);
      fixture.detectChanges();

      expect(component.badgeCount()).toBe(7);
    });
  });

  describe('Event Emission', () => {
    it('should emit openProfile when clicked', () => {
      spyOn(component.openProfile, 'emit');

      component.handleOpenProfile();

      expect(component.openProfile.emit).toHaveBeenCalled();
    });

    it('should emit openProfile when widget is clicked', () => {
      spyOn(component.openProfile, 'emit');

      const widget = fixture.debugElement.nativeElement.querySelector('.user-profile-widget');
      widget.click();

      expect(component.openProfile.emit).toHaveBeenCalled();
    });
  });

  describe('DOM Rendering', () => {
    it('should show different content based on engagement level', () => {
      // Test new user
      const newUser = createMockUser();
      fixture.componentRef.setInput('user', newUser);
      fixture.detectChanges();

      let subtitle = fixture.debugElement.nativeElement.querySelector('.user-subtitle');
      expect(subtitle?.textContent.trim()).toBe('New Explorer');

      // Test casual user
      const casualUser = createMockUser({ checkedInPubIds: ['pub1'] });
      fixture.componentRef.setInput('user', casualUser);
      fixture.detectChanges();

      subtitle = fixture.debugElement.nativeElement.querySelector('.user-subtitle');
      expect(subtitle?.textContent.trim()).toBe('1 pubs visited');
    });

    it('should show leaderboard position for expert users', () => {
      const expertUser = createMockUser({
        checkedInPubIds: Array(25).fill('pub').map((_, i) => `pub${i}`),
        badgeCount: 12
      });
      fixture.componentRef.setInput('user', expertUser);
      fixture.componentRef.setInput('leaderboardPosition', 15);
      fixture.detectChanges();

      const subtitle = fixture.debugElement.nativeElement.querySelector('.user-subtitle');
      expect(subtitle?.textContent.trim()).toBe('#15 on leaderboard');
    });

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
  });
});
