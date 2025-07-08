import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChipBadgeComponent } from './chip-badge.component';
import type { Badge } from '@badges/utils/badge.model';

describe('ChipBadgeComponent', () => {
  let component: ChipBadgeComponent;
  let fixture: ComponentFixture<ChipBadgeComponent>;

  const mockBadge: Badge = {
    id: 'first-checkin',
    name: 'First Check-in',
    description: 'Complete your first pub check-in',
    emoji: '🌟'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChipBadgeComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ChipBadgeComponent);
    component = fixture.componentInstance;
    
    // Set required input
    fixture.componentRef.setInput('badge', mockBadge);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display badge icon', () => {
    const compiled = fixture.nativeElement;
    const iconElement = compiled.querySelector('.chip-icon');
    expect(iconElement.textContent).toContain('🌟');
  });

  it('should display badge short name when showName is true', () => {
    fixture.componentRef.setInput('showName', true);
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('FIRST');
  });

  it('should hide badge name when showName is false', () => {
    fixture.componentRef.setInput('showName', false);
    fixture.detectChanges();
    
    const nameElement = fixture.nativeElement.querySelector('.chip-text');
    expect(nameElement).toBeFalsy();
  });

  it('should show earned indicator when earned is true', () => {
    fixture.componentRef.setInput('earned', true);
    fixture.detectChanges();
    
    const earnedIndicator = fixture.nativeElement.querySelector('.earned-indicator');
    expect(earnedIndicator).toBeTruthy();
    expect(earnedIndicator.textContent).toContain('✓');
  });

  it('should not show earned indicator when earned is false', () => {
    fixture.componentRef.setInput('earned', false);
    fixture.detectChanges();
    
    const earnedIndicator = fixture.nativeElement.querySelector('.earned-indicator');
    expect(earnedIndicator).toBeFalsy();
  });

  it('should apply earned class when earned is true', () => {
    fixture.componentRef.setInput('earned', true);
    fixture.detectChanges();
    
    const chipElement = fixture.nativeElement.querySelector('.chip-badge');
    expect(chipElement.classList).toContain('earned');
  });

  it('should apply unearned class when earned is false', () => {
    fixture.componentRef.setInput('earned', false);
    fixture.detectChanges();
    
    const chipElement = fixture.nativeElement.querySelector('.chip-badge');
    expect(chipElement.classList).toContain('unearned');
  });

  it('should emit clicked event when clicked and clickable', () => {
    fixture.componentRef.setInput('clickable', true);
    fixture.detectChanges();
    
    const clickedSpy = jest.fn();
    component.clicked.subscribe(clickedSpy);
    
    const chipElement = fixture.nativeElement.querySelector('.chip-badge');
    chipElement.click();
    
    expect(clickedSpy).toHaveBeenCalledWith(mockBadge);
  });

  it('should fall back to icon mapping when badge has no emoji', () => {
    const badgeWithoutEmoji: Badge = {
      id: 'early-riser',
      name: 'Early Riser',
      description: 'Check in before 9 AM'
    };
    
    fixture.componentRef.setInput('badge', badgeWithoutEmoji);
    fixture.detectChanges();
    
    const iconText = component.badgeIcon();
    expect(iconText).toBe('🌞'); // Should map to early-riser icon
  });

  it('should generate correct tooltip text for earned badge', () => {
    fixture.componentRef.setInput('earned', true);
    fixture.detectChanges();
    
    const tooltipText = component.tooltipText();
    expect(tooltipText).toBe('First Check-in - Earned!');
  });

  it('should generate correct tooltip text for unearned badge', () => {
    fixture.componentRef.setInput('earned', false);
    fixture.detectChanges();
    
    const tooltipText = component.tooltipText();
    expect(tooltipText).toBe('First Check-in - Complete your first pub check-in');
  });
});