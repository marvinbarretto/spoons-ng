import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserInfoComponent } from './user-info.component';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthStore } from '../../../auth/data-access/auth.store';
import { AuthService } from '../../../auth/data-access/auth.service';
import { UserService } from '../../../users/data-access/user.service';
import { signal } from '@angular/core';
import { User } from '../../../users/utils/user.model';
import { getMockUser } from '../../../shared/testing/test-utils';
import { provideRouter } from '@angular/router';

describe('UserInfoComponent', () => {
  let component: UserInfoComponent;
  let fixture: ComponentFixture<UserInfoComponent>;

  // Mock AuthStore with basic signals
  const mockAuthStore = {
    user$$: signal<User | null>(null),
    token$$: signal<string | null>(null),
    ready$$: signal<boolean>(true),
    logout: jest.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserInfoComponent],
      providers: [
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: AuthService, useValue: {} },
        { provide: UserService, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should display login/register if user is not logged in', () => {
    mockAuthStore.user$$.set(null);
    mockAuthStore.token$$.set(null);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.authenticate')).toBeTruthy();
    expect(compiled.textContent).toContain('Login');
    expect(compiled.textContent).toContain('Register');
  });

  it('should display user info if user is logged in', () => {
    mockAuthStore.token$$.set('abc');
    mockAuthStore.user$$.set(
      getMockUser({
        username: 'jane',
        role: {
          id: 2,
          name: 'Admin',
          description: 'Administrator',
          type: 'admin',
        },
      })
    );

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.user-info')).toBeTruthy();
    expect(compiled.textContent).toContain('Username: jane');
    expect(compiled.textContent).toContain('Role: Admin');
  });
});
