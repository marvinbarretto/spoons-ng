// badges/ui/earned-badge-list.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EarnedBadgeListComponent } from './earned-badge-list.component';
import { BadgeComponent } from '../badge/badge.component';
import { EarnedBadgeStore } from '../../data-access/earned-badge.store';
import { BadgeStore } from '../../data-access/badge.store';
import { BadgeTestFactories } from '../../testing/badge-test-factories';

/**
 * Test suite for EarnedBadgeListComponent.
 *
 * Tests the UI component that displays a user's earned badges.
 * Covers loading states, badge display, error handling, and different display configurations.
 */
describe('EarnedBadgeListComponent', () => {
  let component: EarnedBadgeListComponent;
  let fixture: ComponentFixture<EarnedBadgeListComponent>;
  let mockEarnedBadgeStore: jest.Mocked<EarnedBadgeStore>;
  let mockBadgeStore: jest.Mocked<BadgeStore>;

  // Create a simple mock badge component since we're testing integration
  @Component({
    selector: 'app-badge',
    template: '<div class="mock-badge">{{ badge().name }}</div>'
  })
  class MockBadgeComponent {
    badge = signal(BadgeTestFactories.createBadge('test'));
    size = signal<'small' | 'medium' | 'large'>('medium');
    showName = signal(true);
    showDescription = signal(true);
    showCategory = signal(false);
  }

  beforeEach(async () => {
    // Create Jest mocks for stores
    const earnedBadgeStoreMock = {
      loadOnce: jest.fn(),
      loading: jest.fn(),
      error: jest.fn(),
      hasData: jest.fn(),
      isEmpty: jest.fn(),
      earnedBadgeCount: jest.fn(),
      badgesByDate: jest.fn(),
      getEarnedBadgesSince: jest.fn(),
      data: jest.fn()
    } as jest.Mocked<Partial<EarnedBadgeStore>>;

    const badgeStoreMock = {
      loadOnce: jest.fn(),
      get: jest.fn(),
      data: jest.fn()
    } as jest.Mocked<Partial<BadgeStore>>;

    await TestBed.configureTestingModule({
      imports: [CommonModule, EarnedBadgeListComponent],
      providers: [
        { provide: EarnedBadgeStore, useValue: earnedBadgeStoreMock },
        { provide: BadgeStore, useValue: badgeStoreMock }
      ]
    })
    .overrideComponent(EarnedBadgeListComponent, {
      remove: { imports: [BadgeComponent] },
      add: { imports: [MockBadgeComponent] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(EarnedBadgeListComponent);
    component = fixture.componentInstance;

    mockEarnedBadgeStore = TestBed.inject(EarnedBadgeStore) as jest.Mocked<EarnedBadgeStore>;
    mockBadgeStore = TestBed.inject(BadgeStore) as jest.Mocked<BadgeStore>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('component initialization', () => {
    /**
     * Store loading: Should load both stores on component init.
     */
    it('should load both stores on init', () => {
      // Act
      component.ngOnInit();

      // Assert
      expect(mockEarnedBadgeStore.loadOnce).toHaveBeenCalled();
      expect(mockBadgeStore.loadOnce).toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    /**
     * Loading display: Should show loading state when stores are loading.
     */
    it('should display loading state', () => {
      // Arrange
      mockEarnedBadgeStore.loading.mockReturnValue(signal(true)());
      mockEarnedBadgeStore.error.mockReturnValue(signal(null)());

      // Act
      fixture.detectChanges();

      // Assert
      const loadingElement = fixture.nativeElement.querySelector('.loading-state');
      expect(loadingElement).toBeTruthy();
      expect(loadingElement.textContent).toContain('Loading your badges');
    });

    /**
     * Loading spinner: Should show spinner during loading.
     */
    it('should show loading spinner', () => {
      // Arrange
      mockEarnedBadgeStore.loading.mockReturnValue(signal(true)());
      mockEarnedBadgeStore.error.mockReturnValue(signal(null)());

      // Act
      fixture.detectChanges();

      // Assert
      const spinner = fixture.nativeElement.querySelector('.loading-spinner');
      expect(spinner).toBeTruthy();
    });
  });

  describe('error state', () => {
    /**
     * Error display: Should show error message when loading fails.
     */
    it('should display error state', () => {
      // Arrange
      const errorMessage = 'Failed to load badges';
      mockEarnedBadgeStore.loading.mockReturnValue(signal(false)());
      mockEarnedBadgeStore.error.mockReturnValue(signal(errorMessage)());

      // Act
      fixture.detectChanges();

      // Assert
      const errorElement = fixture.nativeElement.querySelector('.error-state');
      expect(errorElement).toBeTruthy();
      expect(errorElement.textContent).toContain(errorMessage);
    });

    /**
     * Retry button: Should show retry button in error state.
     */
    it('should show retry button in error state', () => {
      // Arrange
      mockEarnedBadgeStore.loading.mockReturnValue(signal(false)());
      mockEarnedBadgeStore.error.mockReturnValue(signal('Error')());

      // Act
      fixture.detectChanges();

      // Assert
      const retryButton = fixture.nativeElement.querySelector('.retry-button');
      expect(retryButton).toBeTruthy();
      expect(retryButton.textContent).toContain('Try Again');
    });
  });

  describe('empty state', () => {
    /**
     * Empty badge list: Should show empty state when user has no badges.
     */
    it('should display empty state when no badges', () => {
      // Arrange
      mockEarnedBadgeStore.loading.mockReturnValue(signal(false)());
      mockEarnedBadgeStore.error.mockReturnValue(signal(null)());
      mockEarnedBadgeStore.isEmpty.mockReturnValue(signal(true)());

      // Act
      fixture.detectChanges();

      // Assert
      const emptyElement = fixture.nativeElement.querySelector('.empty-state');
      expect(emptyElement).toBeTruthy();
      expect(emptyElement.textContent).toContain('No badges yet');
      expect(emptyElement.textContent).toContain('Start checking in to pubs');
    });

    /**
     * Empty state icon: Should show appropriate icon for empty state.
     */
    it('should show trophy icon in empty state', () => {
      // Arrange
      mockEarnedBadgeStore.loading.mockReturnValue(signal(false)());
      mockEarnedBadgeStore.error.mockReturnValue(signal(null)());
      mockEarnedBadgeStore.isEmpty.mockReturnValue(signal(true)());

      // Act
      fixture.detectChanges();

      // Assert
      const emptyIcon = fixture.nativeElement.querySelector('.empty-icon');
      expect(emptyIcon).toBeTruthy();
      expect(emptyIcon.textContent).toContain('🏆');
    });
  });

  describe('badge display', () => {
    /**
     * Badge rendering: Should display badges when data is available.
     */
    it('should display badges when available', () => {
      // Arrange
      const earnedBadges = [
        BadgeTestFactories.createEarnedBadge('user123', 'first-checkin'),
        BadgeTestFactories.createEarnedBadge('user123', 'regular')
      ];
      const badges = [
        BadgeTestFactories.createBadge('first-checkin', { name: 'First Timer' }),
        BadgeTestFactories.createBadge('regular', { name: 'Regular' })
      ];

      mockEarnedBadgeStore.loading.mockReturnValue(signal(false)());
      mockEarnedBadgeStore.error.mockReturnValue(signal(null)());
      mockEarnedBadgeStore.isEmpty.mockReturnValue(signal(false)());
      mockEarnedBadgeStore.badgesByDate.mockReturnValue(signal(earnedBadges)());
      mockBadgeStore.get
        .mockReturnValueOnce(badges[0])
        .mockReturnValueOnce(badges[1]);

      // Mock displayBadges computed signal
      jest.spyOn(component as any, 'displayBadges').mockReturnValue(signal(earnedBadges)());

      // Act
      fixture.detectChanges();

      // Assert
      const badgeElements = fixture.nativeElement.querySelectorAll('.badge-item');
      expect(badgeElements).toHaveLength(2);
    });

    /**
     * Missing badge definition: Should show fallback for missing badge definitions.
     */
    it('should show fallback for missing badge definitions', () => {
      // Arrange
      const earnedBadges = [
        BadgeTestFactories.createEarnedBadge('user123', 'unknown-badge')
      ];

      mockEarnedBadgeStore.loading.mockReturnValue(signal(false)());
      mockEarnedBadgeStore.error.mockReturnValue(signal(null)());
      mockEarnedBadgeStore.isEmpty.mockReturnValue(signal(false)());
      mockBadgeStore.get.mockReturnValue(undefined); // Badge not found

      jest.spyOn(component as any, 'displayBadges').mockReturnValue(signal(earnedBadges)());

      // Act
      fixture.detectChanges();

      // Assert
      const missingBadge = fixture.nativeElement.querySelector('.badge-item--missing');
      expect(missingBadge).toBeTruthy();
      expect(missingBadge.textContent).toContain('Badge not found');
    });
  });

  describe('header and stats', () => {
    /**
     * Component title: Should display component title with badge count.
     */
    it('should display title with badge count', () => {
      // Arrange
      mockEarnedBadgeStore.hasData.mockReturnValue(signal(true)());
      mockEarnedBadgeStore.earnedBadgeCount.mockReturnValue(signal(3)());

      // Set component title
      fixture.componentRef.setInput('title', 'My Achievements');

      // Act
      fixture.detectChanges();

      // Assert
      const titleElement = fixture.nativeElement.querySelector('.earned-badges-title');
      expect(titleElement.textContent).toContain('My Achievements');
      expect(titleElement.textContent).toContain('(3)');
    });

    /**
     * Statistics display: Should show badge statistics when enabled.
     */
    it('should display stats when showStats is true', () => {
      // Arrange
      mockEarnedBadgeStore.earnedBadgeCount.mockReturnValue(signal(5)());
      mockEarnedBadgeStore.getEarnedBadgesSince.mockReturnValue(signal([
        BadgeTestFactories.createEarnedBadge('user123', 'recent-badge')
      ])());

      fixture.componentRef.setInput('showStats', true);

      // Act
      fixture.detectChanges();

      // Assert
      const statsElement = fixture.nativeElement.querySelector('.earned-badges-stats');
      expect(statsElement).toBeTruthy();
      expect(statsElement.textContent).toContain('5 earned');
      expect(statsElement.textContent).toContain('1 this week');
    });
  });

  describe('component inputs', () => {
    /**
     * Badge size configuration: Should pass badge size to child components.
     */
    it('should use configured badge size', () => {
      // Arrange
      fixture.componentRef.setInput('badgeSize', 'large');

      // Act
      fixture.detectChanges();

      // Assert
      expect(component.badgeSize()).toBe('large');
    });

    /**
     * Maximum items configuration: Should limit displayed badges when maxItems is set.
     */
    it('should limit badges when maxItems is set', () => {
      // Arrange
      const earnedBadges = [
        BadgeTestFactories.createEarnedBadge('user123', 'badge1'),
        BadgeTestFactories.createEarnedBadge('user123', 'badge2'),
        BadgeTestFactories.createEarnedBadge('user123', 'badge3')
      ];

      mockEarnedBadgeStore.badgesByDate.mockReturnValue(signal(earnedBadges)());
      fixture.componentRef.setInput('maxItems', 2);

      // Act
      const displayBadges = component['displayBadges']();

      // Assert
      expect(displayBadges).toHaveLength(2);
    });

    /**
     * Layout configuration: Should apply correct CSS classes for different layouts.
     */
    it('should apply correct grid class for layout', () => {
      // Arrange
      fixture.componentRef.setInput('layout', 'list');
      fixture.componentRef.setInput('badgeSize', 'small');

      // Act
      const gridClass = component['gridClass']();

      // Assert
      expect(gridClass).toBe('badge-grid--list');
    });
  });

  describe('utility methods', () => {
    /**
     * Date formatting: Should format earned dates correctly.
     */
    it('should format dates correctly', () => {
      const today = Date.now();
      const yesterday = today - 86400000;
      const threeDaysAgo = today - (3 * 86400000);
      const twoWeeksAgo = today - (14 * 86400000);

      expect(component['formatDate'](today)).toBe('today');
      expect(component['formatDate'](yesterday)).toBe('yesterday');
      expect(component['formatDate'](threeDaysAgo)).toBe('3 days ago');
      expect(component['formatDate'](twoWeeksAgo)).toBe('2 weeks ago');
    });

    /**
     * Recent badge calculation: Should calculate recent badges correctly.
     */
    it('should calculate recent badge count correctly', () => {
      // Arrange
      const recentBadges = [
        BadgeTestFactories.createEarnedBadge('user123', 'recent1'),
        BadgeTestFactories.createEarnedBadge('user123', 'recent2')
      ];

      mockEarnedBadgeStore.getEarnedBadgesSince.mockReturnValue(signal(recentBadges)());

      // Act
      const count = component['recentBadgeCount']();

      // Assert
      expect(count).toBe(2);
    });
  });

  describe('actions', () => {
    /**
     * Retry functionality: Should reload store when retry is clicked.
     */
    it('should reload store when retry is called', () => {
      // Arrange
      mockEarnedBadgeStore.load = jest.fn();

      // Act
      component['retry']();

      // Assert
      expect(mockEarnedBadgeStore.load).toHaveBeenCalled();
    });
  });
});
