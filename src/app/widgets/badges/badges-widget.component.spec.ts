import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BadgeStore } from '../../badges/data-access/badge.store';
import { Badge } from '../../badges/utils/badge.model';
import { EarnedBadge } from '../../badges/utils/earned-badge.model';
import { BadgesWidgetComponent } from './badges-widget.component';

// Mock BadgeStore class
class MockBadgeStore {
  private _definitions = signal<Badge[]>([]);
  private _earnedBadges = signal<EarnedBadge[]>([]);
  private _definitionsLoading = signal(false);
  private _loading = signal(false);
  private _definitionsError = signal<string | null>(null);
  private _error = signal<string | null>(null);

  readonly definitions = this._definitions.asReadonly();
  readonly earnedBadges = this._earnedBadges.asReadonly();
  readonly definitionsLoading = this._definitionsLoading.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly definitionsError = this._definitionsError.asReadonly();
  readonly error = this._error.asReadonly();

  readonly loadOnce = jest.fn();

  setDefinitions(definitions: Badge[]): void {
    this._definitions.set(definitions);
  }

  setEarnedBadges(earnedBadges: EarnedBadge[]): void {
    this._earnedBadges.set(earnedBadges);
  }

  setDefinitionsLoading(loading: boolean): void {
    this._definitionsLoading.set(loading);
  }

  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  setDefinitionsError(error: string | null): void {
    this._definitionsError.set(error);
  }

  setError(error: string | null): void {
    this._error.set(error);
  }
}

describe('BadgesWidgetComponent', () => {
  let component: BadgesWidgetComponent;
  let fixture: ComponentFixture<BadgesWidgetComponent>;
  let mockBadgeStore: MockBadgeStore;

  // Mock data
  const mockBadges: Badge[] = [
    {
      id: '1',
      name: 'First Check-in',
      description: 'Check into your first pub',
      iconUrl: '',
      points: 10,
    },
    {
      id: '2',
      name: 'Explorer',
      description: 'Check into 5 different pubs',
      iconUrl: '',
      points: 25,
    },
  ];

  const mockEarnedBadges: EarnedBadge[] = [
    { userId: 'user1', badgeId: '1', earnedAt: new Date(), metadata: {} },
  ];

  beforeEach(async () => {
    // Create mock BadgeStore
    mockBadgeStore = new MockBadgeStore();

    // Set up initial test data
    mockBadgeStore.setDefinitions(mockBadges);
    mockBadgeStore.setEarnedBadges(mockEarnedBadges);

    await TestBed.configureTestingModule({
      imports: [BadgesWidgetComponent],
      providers: [{ provide: BadgeStore, useValue: mockBadgeStore }],
    }).compileComponents();

    fixture = TestBed.createComponent(BadgesWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display badge collection title', () => {
    const titleElement = fixture.nativeElement.querySelector('.widget-title');
    expect(titleElement.textContent).toContain('Badge Collection');
  });

  it('should show progress summary', () => {
    const progressElement = fixture.nativeElement.querySelector('.progress-summary');
    expect(progressElement.textContent).toContain('1 of 2 badges earned');
  });

  it('should compute badges with earned status correctly', () => {
    const badgesWithStatus = component.allBadgesWithStatus();

    expect(badgesWithStatus).toHaveLength(2);
    expect(badgesWithStatus[0].badge.id).toBe('1');
    expect(badgesWithStatus[0].isEarned).toBe(true);
    expect(badgesWithStatus[1].badge.id).toBe('2');
    expect(badgesWithStatus[1].isEarned).toBe(false);
  });

  it('should compute earned count correctly', () => {
    expect(component.earnedCount()).toBe(1);
  });

  it('should compute total badges correctly', () => {
    expect(component.totalBadges()).toBe(2);
  });

  it('should load badges on init', () => {
    component.ngOnInit();
    expect(mockBadgeStore.loadOnce).toHaveBeenCalled();
  });

  it('should compute loading state correctly', () => {
    mockBadgeStore.setDefinitionsLoading(true);
    expect(component.isLoading()).toBe(true);

    mockBadgeStore.setDefinitionsLoading(false);
    mockBadgeStore.setLoading(true);
    expect(component.isLoading()).toBe(true);

    mockBadgeStore.setDefinitionsLoading(false);
    mockBadgeStore.setLoading(false);
    expect(component.isLoading()).toBe(false);
  });

  it('should compute error state correctly', () => {
    mockBadgeStore.setDefinitionsError('Failed to load badges');
    expect(component.hasError()).toBe('Failed to load badges');

    mockBadgeStore.setDefinitionsError(null);
    mockBadgeStore.setError('Another error');
    expect(component.hasError()).toBe('Another error');

    mockBadgeStore.setDefinitionsError(null);
    mockBadgeStore.setError(null);
    expect(component.hasError()).toBe(null);
  });

  it('should show loading state', () => {
    mockBadgeStore.setDefinitionsLoading(true);
    fixture.detectChanges();

    const loadingElement = fixture.nativeElement.querySelector('app-loading-state');
    expect(loadingElement).toBeTruthy();
  });

  it('should show error state', () => {
    mockBadgeStore.setDefinitionsError('Failed to load badges');
    fixture.detectChanges();

    const errorElement = fixture.nativeElement.querySelector('app-error-state');
    expect(errorElement).toBeTruthy();
  });

  it('should show empty state when no badges', () => {
    mockBadgeStore.setDefinitions([]);
    fixture.detectChanges();

    const emptyElement = fixture.nativeElement.querySelector('app-empty-state');
    expect(emptyElement).toBeTruthy();
  });

  it('should handle retry correctly', () => {
    component.handleRetry();
    expect(mockBadgeStore.loadOnce).toHaveBeenCalled();
  });

  it('should display badge crests in grid', () => {
    fixture.detectChanges();

    const badgeCrests = fixture.nativeElement.querySelectorAll('app-badge-crest');
    expect(badgeCrests.length).toBe(2);
  });

  it('should handle empty earned badges list', () => {
    mockBadgeStore.setEarnedBadges([]);
    fixture.detectChanges();

    expect(component.earnedCount()).toBe(0);

    const progressElement = fixture.nativeElement.querySelector('.progress-summary');
    expect(progressElement.textContent).toContain('0 of 2 badges earned');
  });

  it('should handle all badges earned', () => {
    const allEarnedBadges: EarnedBadge[] = [
      { userId: 'user1', badgeId: '1', earnedAt: new Date(), metadata: {} },
      { userId: 'user1', badgeId: '2', earnedAt: new Date(), metadata: {} },
    ];
    mockBadgeStore.setEarnedBadges(allEarnedBadges);
    fixture.detectChanges();

    expect(component.earnedCount()).toBe(2);

    const progressElement = fixture.nativeElement.querySelector('.progress-summary');
    expect(progressElement.textContent).toContain('2 of 2 badges earned');
  });
});
