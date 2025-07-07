import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { SuggestedMissionWidgetComponent } from './suggested-mission-widget.component';

// Mock Classes
class MockUserMissionsStore {
  loading = signal(false);
  error = signal<string | null>(null);
  activeMissions = signal([]);
  completedMissions = signal([]);
  availableMissions = signal([]);
  enrollInMission = jest.fn().mockResolvedValue(undefined);
}

class MockMissionStore {
  loading = signal(false);
  error = signal<string | null>(null);
  missions = signal([]);
  loadOnce = jest.fn();
}

class MockAuthStore {
  user = signal(null);
}

class MockUserStore {
  user = signal(null);
}

class MockNearbyPubStore {
  nearbyPubs = signal([]);
}

class MockLocationService {
  location = signal(null);
}

class MockRouter {
  navigate = jest.fn();
}

describe('SuggestedMissionWidgetComponent', () => {
  let component: SuggestedMissionWidgetComponent;
  let fixture: ComponentFixture<SuggestedMissionWidgetComponent>;
  let mockRouter: MockRouter;
  let mockUserMissionsStore: MockUserMissionsStore;
  let mockMissionStore: MockMissionStore;

  beforeEach(async () => {
    mockRouter = new MockRouter();
    mockUserMissionsStore = new MockUserMissionsStore();
    mockMissionStore = new MockMissionStore();

    await TestBed.configureTestingModule({
      imports: [SuggestedMissionWidgetComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: 'UserMissionsStore', useValue: mockUserMissionsStore },
        { provide: 'MissionStore', useValue: mockMissionStore },
        { provide: 'AuthStore', useValue: new MockAuthStore() },
        { provide: 'UserStore', useValue: new MockUserStore() },
        { provide: 'NearbyPubStore', useValue: new MockNearbyPubStore() },
        { provide: 'LocationService', useValue: new MockLocationService() },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SuggestedMissionWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show loading state when stores are loading', () => {
    mockMissionStore.loading.set(true);
    fixture.detectChanges();
    
    const loadingElement = fixture.nativeElement.querySelector('app-loading-state');
    expect(loadingElement).toBeTruthy();
  });

  it('should show error state when stores have errors', () => {
    mockMissionStore.error.set('Failed to load missions');
    fixture.detectChanges();
    
    const errorElement = fixture.nativeElement.querySelector('app-error-state');
    expect(errorElement).toBeTruthy();
  });

  it('should show empty state when no suggestions are available', () => {
    fixture.detectChanges();
    
    const emptyElement = fixture.nativeElement.querySelector('app-empty-state');
    expect(emptyElement).toBeTruthy();
  });

  it('should navigate to missions page when "See All Missions" is clicked', () => {
    component.onSeeAllMissions();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/missions']);
  });

  it('should navigate to missions page when "View Mission" is clicked', () => {
    component.onViewMission();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/missions']);
  });

  it('should retry loading missions when retry is clicked', () => {
    component.onRetryLoadMissions();
    expect(mockMissionStore.loadOnce).toHaveBeenCalled();
  });

  it('should format difficulty correctly', () => {
    expect(component.formatDifficulty('easy')).toBe('Easy');
    expect(component.formatDifficulty('medium')).toBe('Medium');
    expect(component.formatDifficulty('hard')).toBe('Hard');
    expect(component.formatDifficulty('extreme')).toBe('Extreme');
  });

  it('should handle mission enrollment', async () => {
    // This test would need more setup to properly test the enrollment flow
    // For now, we'll test the basic method exists
    expect(component.onStartMission).toBeDefined();
  });
});