import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { signal } from '@angular/core';

import { LocalLeaderboardWidgetComponent } from './local-leaderboard-widget.component';
import { LeaderboardStore } from '../../leaderboard/data-access/leaderboard.store';
import { PubGroupingService } from '../../shared/data-access/pub-grouping.service';
import { AuthStore } from '../../auth/data-access/auth.store';

describe('LocalLeaderboardWidgetComponent', () => {
  let component: LocalLeaderboardWidgetComponent;
  let fixture: ComponentFixture<LocalLeaderboardWidgetComponent>;
  let mockLeaderboardStore: jasmine.SpyObj<LeaderboardStore>;
  let mockPubGroupingService: jasmine.SpyObj<PubGroupingService>;
  let mockAuthStore: jasmine.SpyObj<AuthStore>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    mockLeaderboardStore = jasmine.createSpyObj('LeaderboardStore', ['loadOnce'], {
      loading: signal(false),
      error: signal(null),
      topByPoints: signal([])
    });

    mockPubGroupingService = jasmine.createSpyObj('PubGroupingService', [], {
      userPubVisits: signal([]),
      hasGeographicData: signal(false)
    });

    mockAuthStore = jasmine.createSpyObj('AuthStore', [], {
      user: signal(null)
    });

    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [LocalLeaderboardWidgetComponent],
      providers: [
        { provide: LeaderboardStore, useValue: mockLeaderboardStore },
        { provide: PubGroupingService, useValue: mockPubGroupingService },
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LocalLeaderboardWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show loading state when leaderboard is loading', () => {
    mockLeaderboardStore.loading = signal(true);
    fixture.detectChanges();

    const loadingElement = fixture.nativeElement.querySelector('.widget-loading');
    expect(loadingElement).toBeTruthy();
    expect(loadingElement.textContent).toContain('Loading local rankings');
  });

  it('should show empty state when no local data available', () => {
    mockPubGroupingService.hasGeographicData = signal(false);
    fixture.detectChanges();

    const emptyElement = fixture.nativeElement.querySelector('.widget-empty');
    expect(emptyElement).toBeTruthy();
    expect(emptyElement.textContent).toContain('No Local Data Yet');
  });

  it('should navigate to local leaderboard when button clicked', () => {
    spyOn(component as any, 'currentUserCity').and.returnValue('TestCity');
    
    component['navigateToLocalLeaderboard']();
    
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/leaderboard/city', 'TestCity']);
  });
});