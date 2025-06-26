// src/app/home/ui/scoreboard-hero/scoreboard-hero.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ScoreboardHeroComponent } from './scoreboard-hero.component';
import { UserStore } from '@users/data-access/user.store';
import { BadgeStore } from '@badges/data-access/badge.store';
import { MissionStore } from '@missions/data-access/mission.store';
import { AuthStore } from '@auth/data-access/auth.store';
import { watchSignal } from '@shared/testing/signal-test-utils.spec';
import type { User } from '@users/utils/user.model';
import type { EarnedBadge, Badge } from '@badges/utils/badge.model';
import type { Mission } from '@missions/utils/mission.model';

describe('ScoreboardHeroComponent', () => {
  let component: ScoreboardHeroComponent;
  let fixture: ComponentFixture<ScoreboardHeroComponent>;
  let mockUserStore: jest.Mocked<UserStore>;
  let mockBadgeStore: jest.Mocked<BadgeStore>;
  let mockMissionStore: jest.Mocked<MissionStore>;
  let mockAuthStore: jest.Mocked<AuthStore>;

  const createData = (overrides = {}) => ({
    totalPoints: 0,
    pubsVisited: 0,
    totalPubs: 856,
    badgeCount: 0,
    landlordCount: 0,
    totalCheckins: 0,
    todaysPoints: 0,
    isLoading: false,
    ...overrides
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScoreboardHeroComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ScoreboardHeroComponent);
    component = fixture.componentInstance;
  });

  // ✅ Test data factories
  const createMockUser = (overrides: Partial<User> = {}): User => ({
    uid: 'test-user',
    displayName: 'Test User',
    checkedInPubIds: [],
    joinedMissionIds: [],
    badgeCount: 0,
    ...overrides
  } as User);

  const createMockBadge = (id: string, name: string): Badge => ({
    id,
    name,
    description: `${name} description`,
    iconUrl: `/assets/badges/${id}.svg`,
    criteria: {}
  });

  const createMockEarnedBadge = (badgeId: string, awardedAt = Date.now()): { earnedBadge: EarnedBadge; badge: Badge } => ({
    earnedBadge: {
      id: `earned-${badgeId}`,
      userId: 'test-user',
      badgeId,
      awardedAt,
      metadata: {}
    },
    badge: createMockBadge(badgeId, `Badge ${badgeId}`)
  });

  const createMockMission = (id: string, pubIds: string[] = []): Mission => ({
    id,
    title: `Mission ${id}`,
    description: `Description for ${id}`,
    pubIds,
    createdAt: Date.now(),
    isActive: true
  });

  beforeEach(async () => {
    // ✅ Create comprehensive mocks following your patterns
    mockUserStore = {
      user: signal(null),
      loadOnce: jest.fn().mockResolvedValue(undefined)
    } as unknown as jest.Mocked<UserStore>;

    mockBadgeStore = {
      earnedBadgesWithDefinitions: signal([]),
      loadOnce: jest.fn().mockResolvedValue(undefined)
    } as unknown as jest.Mocked<BadgeStore>;

    mockMissionStore = {
      missions: signal([]),
      loadOnce: jest.fn().mockResolvedValue(undefined)
    } as unknown as jest.Mocked<MissionStore>;

    mockAuthStore = {
      user: signal(null)
    } as unknown as jest.Mocked<AuthStore>;

    await TestBed.configureTestingModule({
      imports: [ScoreboardHeroComponent],
      providers: [
        { provide: UserStore, useValue: mockUserStore },
        { provide: BadgeStore, useValue: mockBadgeStore },
        { provide: MissionStore, useValue: mockMissionStore },
        { provide: AuthStore, useValue: mockAuthStore }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ScoreboardHeroComponent);
    component = fixture.componentInstance;
  });

  describe('ScoreboardHeroComponent', () => {
    let component: ScoreboardHeroComponent;
    let fixture: ComponentFixture<ScoreboardHeroComponent>;

    const createData = (overrides = {}) => ({
      totalPoints: 0,
      pubsVisited: 0,
      totalPubs: 856,
      badgeCount: 0,
      landlordCount: 0,
      totalCheckins: 0,
      todaysPoints: 0,
      isLoading: false,
      ...overrides
    });

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [ScoreboardHeroComponent]
      }).compileComponents();

      fixture = TestBed.createComponent(ScoreboardHeroComponent);
      component = fixture.componentInstance;
    });

    // ✅ TEST 1: Component renders with basic data
    describe('Basic Rendering', () => {
      it('should render points and stats correctly', () => {
        const data = createData({ totalPoints: 110, pubsVisited: 7, totalCheckins: 12 });
        fixture.componentRef.setInput('data', data);
        fixture.detectChanges();

        const compiled = fixture.nativeElement;
        expect(compiled.querySelector('.points-value')).toBeTruthy();
        expect(compiled.querySelector('.stats-row')).toBeTruthy();
      });
    });

    // ✅ TEST 2: Values actually appear in the DOM
    describe('Template Rendering', () => {
      it('should display total points in template', () => {
        const data = createData({ totalPoints: 150 });
        fixture.componentRef.setInput('data', data);
        fixture.detectChanges();

        const pointsElement = fixture.nativeElement.querySelector('.points-value');
        expect(pointsElement?.textContent?.trim()).toBe('150');
      });

      it('should display pubs and check-ins in stats row', () => {
        const data = createData({ pubsVisited: 7, totalCheckins: 12 });
        fixture.componentRef.setInput('data', data);
        fixture.detectChanges();

        const statsRow = fixture.nativeElement.querySelector('.stats-row');
        expect(statsRow).toBeTruthy();
        
        const statValues = fixture.nativeElement.querySelectorAll('.stat-value');
        expect(statValues[0]?.textContent?.trim()).toBe('7');
        expect(statValues[1]?.textContent?.trim()).toBe('12');
      });

      it('should display correct labels', () => {
        const data = createData();
        fixture.componentRef.setInput('data', data);
        fixture.detectChanges();

        const pointsLabel = fixture.nativeElement.querySelector('.points-label');
        expect(pointsLabel?.textContent?.trim()).toBe('POINTS');
        
        const statLabels = fixture.nativeElement.querySelectorAll('.stat-label');
        expect(statLabels[0]?.textContent?.trim()).toBe('PUBS');
        expect(statLabels[1]?.textContent?.trim()).toBe('CHECK-INS');
      });
    });

    // ✅ TEST 3: Loading states affect what's displayed
    describe('Loading States', () => {
      it('should show loading styles when isLoading is true', () => {
        const data = createData({ totalPoints: 100, isLoading: true });
        fixture.componentRef.setInput('data', data);
        fixture.detectChanges();

        const container = fixture.nativeElement.querySelector('.scoreboard-hero');
        expect(container?.classList).toContain('loading');
      });

      it('should not show loading styles when isLoading is false', () => {
        const data = createData({ totalPoints: 100, isLoading: false });
        fixture.componentRef.setInput('data', data);
        fixture.detectChanges();

        const container = fixture.nativeElement.querySelector('.scoreboard-hero');
        expect(container?.classList).not.toContain('loading');
      });
    });

    // ✅ TEST 4: Component cleanup (memory leaks)
    describe('Component Lifecycle', () => {
      it('should clean up animations on destroy', () => {
        const cancelSpy = spyOn(window, 'cancelAnimationFrame');

        const data = createData({ totalPoints: 100 });
        fixture.componentRef.setInput('data', data);
        fixture.detectChanges();

        component.ngOnDestroy();

        expect(cancelSpy).toHaveBeenCalled();
      });
    });
  });

  // ===================================
  // 🎯 WHAT MAKES THESE TESTS VALUABLE
  // ===================================

  /*
  ✅ HIGH VALUE Template Tests:

  1. "Does my computed value show up?"
     - Tests the critical path: logic → template → user

  2. "Do conditional elements work?"
     - @if (todaysPoints > 0) actually shows/hides correctly

  3. "Does loading state change what renders?"
     - CSS classes and visual states work correctly

  4. "Are the right numbers displayed?"
     - No off-by-one errors, formatting issues

  ❌ AVOID These Template Tests:

  1. "Does it have the right CSS classes?"
     - Implementation detail, changes frequently

  2. "Is the DOM structure exactly X?"
     - Brittle, breaks on minor HTML changes

  3. "Does it have specific styling?"
     - Visual concern, not logic concern

  4. "Are there exactly N elements?"
     - Implementation detail
  */

  // ===================================
  // 🚀 ALTERNATIVE: EVEN MORE FOCUSED
  // ===================================

  describe('ScoreboardHero - Ultra Focused', () => {
    // If you want REALLY minimal tests, just test these 2 things:

    it('should display the right numbers', () => {
      // ✅ Core user value: "Do I see my actual points?"
      const data = createData({
        totalPoints: 150,
        pubsVisited: 5,
        totalPubs: 100
      });

      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('150');
      expect(fixture.nativeElement.textContent).toContain('5%');
    });

    it('should handle edge cases without crashing', () => {
      // ✅ Defensive programming: "Does it break with weird data?"
      const edgeCases = [
        createData({ totalPubs: 0 }),
        createData({ totalPoints: -5 }),
        createData({ pubsVisited: 1000, totalPubs: 100 }) // > 100%
      ];

      edgeCases.forEach(data => {
        expect(() => {
          fixture.componentRef.setInput('data', data);
          fixture.detectChanges();
        }).not.toThrow();
      });
    });
  });




  // Probably delete all these

  describe('Component Creation', () => {
    it('should create successfully', () => {
      expect(component).toBeTruthy();
    });

    it('should call loadOnce on required stores during init', () => {
      // Act
      component.ngOnInit();

      // Assert
      expect(mockBadgeStore.loadOnce).toHaveBeenCalled();
      expect(mockMissionStore.loadOnce).toHaveBeenCalled();
    });
  });

  describe('New User State', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should identify new user correctly', () => {
      expect(component.isNewUser()).toBe(true);
    });

    it('should show zero values for new user', () => {
      expect(component.pubsVisited()).toBe(0);
      expect(component.totalPoints()).toBe(0);
      expect(component.overallProgress()).toBe(0);
    });

    it('should show empty arrays for new user', () => {
      expect(component.earnedBadges()).toEqual([]);
      expect(component.activeMissions()).toEqual([]);
      expect(component.displayBadges()).toEqual([]);
    });

    it('should render onboarding hint for new user', () => {
      const compiled = fixture.nativeElement;
      const hint = compiled.querySelector('.onboarding-hint');
      expect(hint).toBeTruthy();
      expect(hint.textContent).toContain('Welcome to Spooncount!');
    });
  });

  describe('Experienced User State', () => {
    beforeEach(() => {
      // ✅ Setup experienced user with data
      const experiencedUser = createMockUser({
        checkedInPubIds: ['pub1', 'pub2', 'pub3', 'pub4', 'pub5'],
        joinedMissionIds: ['mission1', 'mission2']
      });

      const earnedBadges = [
        createMockEarnedBadge('first-checkin'),
        createMockEarnedBadge('early-bird'),
        createMockEarnedBadge('local-hero')
      ];

      const missions = [
        createMockMission('mission1', ['pub1', 'pub2', 'pub3']),
        createMockMission('mission2', ['pub4', 'pub5', 'pub6', 'pub7'])
      ];

      mockUserStore.user = signal(experiencedUser);
      mockBadgeStore.earnedBadgesWithDefinitions = signal(earnedBadges);
      mockMissionStore.missions = signal(missions);

      fixture.detectChanges();
    });

    it('should not identify experienced user as new', () => {
      expect(component.isNewUser()).toBe(false);
    });

    it('should calculate correct metrics for experienced user', () => {
      expect(component.pubsVisited()).toBe(5);
      expect(component.totalPoints()).toBe(200); // (5 * 10) + (3 * 50)
      expect(component.overallProgress()).toBe(1); // 5/856 ≈ 1%
    });

    it('should show earned badges', () => {
      expect(component.earnedBadges().length).toBe(3);
      expect(component.displayBadges().length).toBe(3);
    });

    it('should calculate active missions correctly', () => {
      const missions = component.activeMissions();
      expect(missions.length).toBe(2);

      // Mission 1: user has pub1, pub2 (2/3)
      expect(missions[0].progress).toBe(2);
      expect(missions[0].total).toBe(3);

      // Mission 2: user has pub4, pub5 (2/4)
      expect(missions[1].progress).toBe(2);
      expect(missions[1].total).toBe(4);
    });

    it('should not render onboarding hint for experienced user', () => {
      const compiled = fixture.nativeElement;
      const hint = compiled.querySelector('.onboarding-hint');
      expect(hint).toBeFalsy();
    });
  });

  describe('Signal Reactivity', () => {
    it('should react to user changes', () => {
      // Arrange
      const progressWatcher = watchSignal(component.overallProgress).startWatching();
      const pointsWatcher = watchSignal(component.totalPoints).startWatching();

      // Act
      mockUserStore.user.set(createMockUser({ checkedInPubIds: ['pub1', 'pub2'] }));
      fixture.detectChanges();

      // Assert
      progressWatcher.expectCurrentValue(0); // 2/856 rounds to 0%
      pointsWatcher.expectCurrentValue(20); // 2 * 10 + 0 * 50
    });

    it('should react to badge changes', () => {
      // Arrange
      const user = createMockUser({ checkedInPubIds: ['pub1'] });
      mockUserStore.user.set(user);

      const pointsWatcher = watchSignal(component.totalPoints).startWatching();

      // Act
      mockBadgeStore.earnedBadgesWithDefinitions.set([
        createMockEarnedBadge('first-checkin')
      ]);
      fixture.detectChanges();

      // Assert
      pointsWatcher.expectCurrentValue(60); // 1 * 10 + 1 * 50
    });
  });

  describe('Badge Display Logic', () => {
    it('should limit display badges to maxDisplayBadges', () => {
      // Arrange: Create more badges than display limit
      const manyBadges = Array.from({ length: 10 }, (_, i) =>
        createMockEarnedBadge(`badge-${i}`)
      );

      mockBadgeStore.earnedBadgesWithDefinitions.set(manyBadges);
      fixture.detectChanges();

      // Assert
      expect(component.displayBadges().length).toBe(component.maxDisplayBadges);
      expect(component.earnedBadges().length).toBe(10);
    });

    it('should get correct badge icons', () => {
      expect(component.getBadgeIcon('first-checkin')).toBe('🥇');
      expect(component.getBadgeIcon('early-bird')).toBe('🌅');
      expect(component.getBadgeIcon('unknown-badge')).toBe('🏅');
    });

    it('should create short badge names', () => {
      expect(component.getBadgeShortName('First Check-in')).toBe('FIRST');
      expect(component.getBadgeShortName('Weekend Warrior')).toBe('WEEKEN');
      expect(component.getBadgeShortName('')).toBe('');
    });
  });

  describe('Mission Progress Calculation', () => {
    it('should calculate mission progress percentage correctly', () => {
      const mission = { progress: 3, total: 10 };
      expect(component.getMissionProgress(mission)).toBe(30);
    });

    it('should handle zero total gracefully', () => {
      const mission = { progress: 0, total: 0 };
      expect(component.getMissionProgress(mission)).toBe(0);
    });

    it('should handle complete missions', () => {
      const mission = { progress: 5, total: 5 };
      expect(component.getMissionProgress(mission)).toBe(100);
    });
  });

  describe('Event Emissions', () => {
    it('should emit openSettings event', () => {
      // Arrange
      spyOn(component.openSettings, 'emit');

      // Act
      component.openSettings();

      // Assert
      expect(component.openSettings.emit).toHaveBeenCalled();
    });

    it('should emit startMission event', () => {
      // Arrange
      spyOn(component.startMission, 'emit');

      // Act
      component.startMission();

      // Assert
      expect(component.startMission.emit).toHaveBeenCalled();
    });

    it('should emit viewMission event with mission id', () => {
      // Arrange
      spyOn(component.viewMission, 'emit');
      const missionId = 'test-mission';

      // Act
      component.viewMission(missionId);

      // Assert
      expect(component.viewMission.emit).toHaveBeenCalledWith(missionId);
    });

    it('should emit viewAllBadges event', () => {
      // Arrange
      spyOn(component.viewAllBadges, 'emit');

      // Act
      component.viewAllBadges();

      // Assert
      expect(component.viewAllBadges.emit).toHaveBeenCalled();
    });
  });

  describe('DOM Rendering', () => {
    beforeEach(() => {
      const user = createMockUser({
        checkedInPubIds: ['pub1', 'pub2'],
        joinedMissionIds: ['mission1']
      });

      const badges = [createMockEarnedBadge('first-checkin')];
      const missions = [createMockMission('mission1', ['pub1', 'pub2', 'pub3'])];

      mockUserStore.user.set(user);
      mockBadgeStore.earnedBadgesWithDefinitions.set(badges);
      mockMissionStore.missions.set(missions);

      fixture.detectChanges();
    });

    it('should render score numbers correctly', () => {
      const compiled = fixture.nativeElement;
      const scoreNumbers = compiled.querySelectorAll('.score-number');

      expect(scoreNumbers[0].textContent.trim()).toBe('70'); // Points
      expect(scoreNumbers[1].textContent.trim()).toBe('2'); // Pubs
    });

    it('should render progress bar with correct width', () => {
      const compiled = fixture.nativeElement;
      const progressFill = compiled.querySelector('.progress-fill');

      expect(progressFill.style.width).toBe('0%'); // 2/856 rounds to 0%
    });

    it('should render badges section when badges exist', () => {
      const compiled = fixture.nativeElement;
      const badgesSection = compiled.querySelector('.badges-showcase');
      const badgeCrests = compiled.querySelectorAll('.badge-crest:not(.view-all)');

      expect(badgesSection).toBeTruthy();
      expect(badgeCrests.length).toBe(1);
    });

    it('should render missions section when active missions exist', () => {
      const compiled = fixture.nativeElement;
      const missionsSection = compiled.querySelector('.missions-section');
      const missionCards = compiled.querySelectorAll('.mission-card');

      expect(missionsSection).toBeTruthy();
      expect(missionCards.length).toBe(1);
    });

    it('should render action cards', () => {
      const compiled = fixture.nativeElement;
      const actionCards = compiled.querySelectorAll('.action-card');

      // Should have "How to Play" and "Customize" cards (no "Start Mission" since user has active missions)
      expect(actionCards.length).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null user gracefully', () => {
      mockUserStore.user.set(null);
      fixture.detectChanges();

      expect(component.isNewUser()).toBe(true);
      expect(component.pubsVisited()).toBe(0);
      expect(component.activeMissions()).toEqual([]);
    });

    it('should handle user with undefined arrays', () => {
      const userWithUndefined = createMockUser({
        checkedInPubIds: undefined as any,
        joinedMissionIds: undefined as any
      });

      mockUserStore.user.set(userWithUndefined);
      fixture.detectChanges();

      expect(component.pubsVisited()).toBe(0);
      expect(component.activeMissions()).toEqual([]);
    });

    it('should handle missions with no matching user pubs', () => {
      const user = createMockUser({
        checkedInPubIds: ['pub1'],
        joinedMissionIds: ['mission1']
      });

      const missions = [createMockMission('mission1', ['pub2', 'pub3'])];

      mockUserStore.user.set(user);
      mockMissionStore.missions.set(missions);
      fixture.detectChanges();

      const activeMissions = component.activeMissions();
      expect(activeMissions[0].progress).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should limit active missions display', () => {
      const user = createMockUser({
        joinedMissionIds: ['m1', 'm2', 'm3', 'm4', 'm5']
      });

      const missions = Array.from({ length: 5 }, (_, i) =>
        createMockMission(`m${i + 1}`)
      );

      mockUserStore.user.set(user);
      mockMissionStore.missions.set(missions);
      fixture.detectChanges();

      // Should only show max 3 missions
      expect(component.activeMissions().length).toBe(3);
    });
  });
});
