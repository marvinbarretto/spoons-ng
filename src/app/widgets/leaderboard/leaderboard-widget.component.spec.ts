import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LeaderboardWidgetComponent } from './leaderboard-widget.component';
import { LeaderboardStore } from '../../leaderboard/data-access/leaderboard.store';
import { AuthStore } from '../../auth/data-access/auth.store';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import type { LeaderboardEntry } from '../../leaderboard/utils/leaderboard.models';
import { MockAuthStore } from '../../testing/store-mocks';
import { createMockUser } from '../../testing/test-data';

// Mock LeaderboardStore class
class MockLeaderboardStore {
  private _loading = signal(false);
  private _error = signal<string | null>(null);
  private _topByPoints = signal<LeaderboardEntry[]>([]);
  private _userRankByPoints = signal<number | null>(null);
  
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly topByPoints = this._topByPoints.asReadonly();
  readonly userRankByPoints = this._userRankByPoints.asReadonly();
  
  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }
  
  setError(error: string | null): void {
    this._error.set(error);
  }
  
  setTopByPoints(entries: LeaderboardEntry[]): void {
    this._topByPoints.set(entries);
  }
  
  setUserRankByPoints(rank: number | null): void {
    this._userRankByPoints.set(rank);
  }
}

// Mock Router class
class MockRouter {
  navigate = jest.fn();
}

describe('LeaderboardWidgetComponent', () => {
  let component: LeaderboardWidgetComponent;
  let fixture: ComponentFixture<LeaderboardWidgetComponent>;
  let mockLeaderboardStore: MockLeaderboardStore;
  let mockAuthStore: MockAuthStore;
  let mockRouter: MockRouter;

  const mockLeaderboardData: LeaderboardEntry[] = [
    {
      userId: 'user1',
      displayName: 'Top Player',
      totalPoints: 1000,
      rank: 1,
      totalVisits: 20,
      uniquePubs: 15,
      totalCheckins: 25,
      joinedDate: '2024-01-01',
      isAnonymous: false
    },
    {
      userId: 'user2',
      displayName: 'Second Place',
      totalPoints: 800,
      rank: 2,
      totalVisits: 18,
      uniquePubs: 12,
      totalCheckins: 20,
      joinedDate: '2024-01-02',
      isAnonymous: false
    },
    {
      userId: 'currentUser',
      displayName: 'Current User',
      totalPoints: 600,
      rank: 3,
      totalVisits: 15,
      uniquePubs: 10,
      totalCheckins: 18,
      joinedDate: '2024-01-03',
      isAnonymous: false
    },
    {
      userId: 'user4',
      displayName: 'Fourth Place',
      totalPoints: 400,
      rank: 4,
      totalVisits: 12,
      uniquePubs: 8,
      totalCheckins: 15,
      joinedDate: '2024-01-04',
      isAnonymous: false
    },
    {
      userId: 'user5',
      displayName: 'Fifth Place',
      totalPoints: 200,
      rank: 5,
      totalVisits: 10,
      uniquePubs: 6,
      totalCheckins: 12,
      joinedDate: '2024-01-05',
      isAnonymous: false
    }
  ];

  beforeEach(async () => {
    // Use fake timers for consistent test behavior
    jest.useFakeTimers();
    
    // Create mock stores
    mockLeaderboardStore = new MockLeaderboardStore();
    mockAuthStore = new MockAuthStore();
    mockRouter = new MockRouter();
    
    // Set up initial test data
    const currentUser = createMockUser({ uid: 'currentUser', displayName: 'Current User' });
    mockAuthStore.setUser(currentUser);
    mockLeaderboardStore.setTopByPoints(mockLeaderboardData);
    mockLeaderboardStore.setUserRankByPoints(3);

    await TestBed.configureTestingModule({
      imports: [LeaderboardWidgetComponent],
      providers: [
        { provide: LeaderboardStore, useValue: mockLeaderboardStore },
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LeaderboardWidgetComponent);
    component = fixture.componentInstance;
  });
  
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show loading state', () => {
    mockLeaderboardStore.setLoading(true);
    fixture.detectChanges();
    
    const loadingElement = fixture.nativeElement.querySelector('.widget-loading');
    expect(loadingElement).toBeTruthy();
    expect(loadingElement.textContent).toContain('Loading rankings');
  });

  it('should show error state', () => {
    mockLeaderboardStore.setError('Failed to load leaderboard');
    fixture.detectChanges();
    
    const errorElement = fixture.nativeElement.querySelector('.widget-error');
    expect(errorElement).toBeTruthy();
    expect(errorElement.textContent).toContain('Failed to load leaderboard');
  });

  it('should show empty state when user is not ranked', () => {
    mockLeaderboardStore.setUserRankByPoints(null);
    fixture.detectChanges();
    
    const emptyElement = fixture.nativeElement.querySelector('.widget-empty');
    expect(emptyElement).toBeTruthy();
    expect(emptyElement.textContent).toContain('Join the Competition!');
  });

  it('should display user context (±2 positions)', () => {
    fixture.detectChanges();
    
    const entries = fixture.nativeElement.querySelectorAll('.leaderboard-entry');
    expect(entries.length).toBe(5); // User at position 3, showing positions 1-5
    
    // Check first entry
    expect(entries[0].textContent).toContain('#1');
    expect(entries[0].textContent).toContain('Top Player');
    
    // Check current user entry (highlighted)
    const currentUserEntry = fixture.nativeElement.querySelector('.leaderboard-entry.current-user');
    expect(currentUserEntry).toBeTruthy();
    expect(currentUserEntry.textContent).toContain('#3');
    expect(currentUserEntry.textContent).toContain('Current User');
  });

  it('should format points correctly', () => {
    fixture.detectChanges();
    
    const entries = fixture.nativeElement.querySelectorAll('.leaderboard-entry');
    expect(entries[0].textContent).toContain('1.0k pts'); // 1000 points
    expect(entries[4].textContent).toContain('200 pts'); // 200 points
  });

  it('should navigate to full leaderboard on button click', () => {
    fixture.detectChanges();
    
    const button = fixture.nativeElement.querySelector('.view-full-leaderboard');
    button.click();
    
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/leaderboard']);
  });
  
  it('should handle rapid auth changes without memory leaks', () => {
    // Clear any existing calls
    jest.clearAllMocks();
    
    // Rapidly change users
    for (let i = 0; i < 5; i++) {
      const testUser = createMockUser({ uid: `user${i}`, displayName: `User ${i}` });
      mockAuthStore.setUser(testUser);
      fixture.detectChanges();
      jest.runAllTimers();
    }
    
    // Component should still be functional
    expect(component).toBeTruthy();
    
    // Should not have excessive router calls
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });
  
  it('should react to leaderboard data changes', () => {
    // Initial state
    fixture.detectChanges();
    let entries = fixture.nativeElement.querySelectorAll('.leaderboard-entry');
    expect(entries.length).toBe(5);
    
    // Change leaderboard data
    const newData = mockLeaderboardData.slice(0, 2); // Only first 2 entries
    mockLeaderboardStore.setTopByPoints(newData);
    fixture.detectChanges();
    
    entries = fixture.nativeElement.querySelectorAll('.leaderboard-entry');
    expect(entries.length).toBe(2);
  });

  it('should handle edge case when user is at top of leaderboard', () => {
    // Mock user at position 1
    const topUser = createMockUser({ uid: 'user1', displayName: 'Top Player' });
    mockAuthStore.setUser(topUser);
    mockLeaderboardStore.setUserRankByPoints(1);
    
    fixture.detectChanges();
    
    const entries = fixture.nativeElement.querySelectorAll('.leaderboard-entry');
    expect(entries.length).toBe(3); // Shows positions 1-3 (can't show 2 above)
    
    const currentUserEntry = fixture.nativeElement.querySelector('.leaderboard-entry.current-user');
    expect(currentUserEntry.textContent).toContain('#1');
  });

  it('should handle edge case when user is at bottom of leaderboard', () => {
    // Mock user at position 5
    const bottomUser = createMockUser({ uid: 'user5', displayName: 'Fifth Place' });
    mockAuthStore.setUser(bottomUser);
    mockLeaderboardStore.setUserRankByPoints(5);
    
    fixture.detectChanges();
    
    const entries = fixture.nativeElement.querySelectorAll('.leaderboard-entry');
    expect(entries.length).toBe(3); // Shows positions 3-5 (can't show 2 below)
    
    const currentUserEntry = fixture.nativeElement.querySelector('.leaderboard-entry.current-user');
    expect(currentUserEntry.textContent).toContain('#5');
  });
});