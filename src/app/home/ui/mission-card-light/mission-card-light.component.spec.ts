import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MissionCardLightComponent } from './mission-card-light.component';
import { Mission } from '../../../missions/utils/mission.model';

describe('MissionCardLightComponent', () => {
  let component: MissionCardLightComponent;
  let fixture: ComponentFixture<MissionCardLightComponent>;

  const mockMission: Mission = {
    id: 'test-mission',
    name: 'Test Mission',
    description: 'Test description',
    pubIds: ['pub1', 'pub2', 'pub3'],
    pointsReward: 100,
    emoji: '🎯',
    category: 'Adventure',
    difficulty: 'easy',
    requiredPubs: 3,
    totalPubs: 3,
    featured: false,
    country: 'UK',
    region: 'London',
    badgeRewardId: null,
    subcategory: null,
    timeLimitHours: null
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MissionCardLightComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(MissionCardLightComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('mission', mockMission);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display mission name and emoji', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('.mission-name').textContent).toBe('Test Mission');
    expect(compiled.querySelector('.mission-emoji').textContent).toBe('🎯');
  });

  it('should display points reward', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('.points-value').textContent).toBe('100');
  });

  it('should display pub count when not joined', () => {
    fixture.componentRef.setInput('isJoined', false);
    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('.pub-count').textContent).toBe('3 pubs');
  });

  it('should display progress when joined', () => {
    fixture.componentRef.setInput('isJoined', true);
    fixture.componentRef.setInput('progress', 2);
    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('.progress-text').textContent).toBe('2/3');
    expect(compiled.querySelector('.progress-percentage').textContent).toBe('67%');
  });

  it('should emit missionClick when clicked', () => {
    const emitSpy = jest.spyOn(component.missionClick, 'emit');
    fixture.detectChanges();
    
    const cardElement = fixture.nativeElement.querySelector('.mission-card-light');
    cardElement.click();
    
    expect(emitSpy).toHaveBeenCalledWith(mockMission);
  });

  it('should calculate progress percentage correctly', () => {
    fixture.componentRef.setInput('progress', 2);
    fixture.detectChanges();
    
    expect(component.progressPercentage()).toBe(67);
  });
});