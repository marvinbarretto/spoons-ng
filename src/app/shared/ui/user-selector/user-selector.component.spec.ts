// src/app/shared/ui/user-selector/user-selector.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserSelectorComponent } from './user-selector.component';
import { MockUserStore } from '../../../testing/store-mocks/mock-user.store';
import { UserStore } from '@users/data-access/user.store';

describe('UserSelectorComponent', () => {
  let component: UserSelectorComponent;
  let fixture: ComponentFixture<UserSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserSelectorComponent],
      providers: [
        { provide: UserStore, useClass: MockUserStore }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit selectionChange when user is selected', () => {
    spyOn(component.selectionChange, 'emit');
    
    const mockUser = {
      uid: 'test-user-1',
      displayName: 'Test User',
      email: 'test@example.com',
      emailVerified: true,
      isAnonymous: false,
      photoURL: null,
      joinedAt: '2024-01-01',
      streaks: {},
      joinedMissionIds: [],
      badgeCount: 0,
      badgeIds: [],
      landlordCount: 0,
      landlordPubIds: [],
      manuallyAddedPubIds: [],
      verifiedPubCount: 0,
      unverifiedPubCount: 0,
      totalPubCount: 0
    };

    component.selectUser(mockUser);

    expect(component.selectionChange.emit).toHaveBeenCalledWith('test-user-1');
  });

  it('should clear selection', () => {
    spyOn(component.selectionChange, 'emit');
    
    component.clearSelection();

    expect(component.selectionChange.emit).toHaveBeenCalledWith(null);
  });
});