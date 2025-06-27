import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IconChipComponent } from './icon-chip.component';
import { IconComponent } from '../../icon/icon.component';

describe('IconChipComponent', () => {
  let component: IconChipComponent;
  let fixture: ComponentFixture<IconChipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IconChipComponent, IconComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(IconChipComponent);
    component = fixture.componentInstance;
    
    // Set required input
    fixture.componentRef.setInput('icon', 'star');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display icon', () => {
    const iconElement = fixture.nativeElement.querySelector('app-icon');
    expect(iconElement).toBeTruthy();
  });

  it('should display label when provided', () => {
    fixture.componentRef.setInput('label', 'Test Label');
    fixture.detectChanges();
    
    const labelElement = fixture.nativeElement.querySelector('.chip-text');
    expect(labelElement.textContent).toContain('Test Label');
  });

  it('should not display label when not provided', () => {
    const labelElement = fixture.nativeElement.querySelector('.chip-text');
    expect(labelElement).toBeFalsy();
  });

  it('should display count badge when count is provided', () => {
    fixture.componentRef.setInput('count', 5);
    fixture.detectChanges();
    
    const countBadge = fixture.nativeElement.querySelector('.count-badge');
    expect(countBadge).toBeTruthy();
    expect(countBadge.textContent).toContain('5');
  });

  it('should not display count badge when count is null', () => {
    fixture.componentRef.setInput('count', null);
    fixture.detectChanges();
    
    const countBadge = fixture.nativeElement.querySelector('.count-badge');
    expect(countBadge).toBeFalsy();
  });

  it('should format large counts correctly', () => {
    expect(component.formatCount(999)).toBe('999');
    expect(component.formatCount(1500)).toBe('1.5k');
    expect(component.formatCount(10000)).toBe('10k');
  });

  it('should apply correct size classes', () => {
    fixture.componentRef.setInput('size', 'lg');
    fixture.detectChanges();
    
    const chipElement = fixture.nativeElement.querySelector('.icon-chip');
    expect(chipElement.classList).toContain('size--lg');
  });

  it('should apply correct variant classes', () => {
    fixture.componentRef.setInput('variant', 'success');
    fixture.detectChanges();
    
    const chipElement = fixture.nativeElement.querySelector('.icon-chip');
    expect(chipElement.classList).toContain('variant--success');
  });

  it('should apply clickable class when clickable is true', () => {
    fixture.componentRef.setInput('clickable', true);
    fixture.detectChanges();
    
    const chipElement = fixture.nativeElement.querySelector('.icon-chip');
    expect(chipElement.classList).toContain('clickable');
  });

  it('should emit clicked event when clicked and clickable', () => {
    fixture.componentRef.setInput('clickable', true);
    fixture.detectChanges();
    
    spyOn(component.clicked, 'emit');
    
    const chipElement = fixture.nativeElement.querySelector('.icon-chip');
    chipElement.click();
    
    expect(component.clicked.emit).toHaveBeenCalledWith('star');
  });

  it('should not emit clicked event when not clickable', () => {
    fixture.componentRef.setInput('clickable', false);
    fixture.detectChanges();
    
    spyOn(component.clicked, 'emit');
    
    const chipElement = fixture.nativeElement.querySelector('.icon-chip');
    chipElement.click();
    
    expect(component.clicked.emit).not.toHaveBeenCalled();
  });

  it('should map chip size to icon size correctly', () => {
    fixture.componentRef.setInput('size', 'lg');
    fixture.detectChanges();
    
    expect(component.iconSize()).toBe('md');
  });

  it('should generate correct aria label with all properties', () => {
    fixture.componentRef.setInput('label', 'Test');
    fixture.componentRef.setInput('count', 5);
    fixture.componentRef.setInput('clickable', true);
    fixture.detectChanges();
    
    const ariaLabel = component.ariaLabel();
    expect(ariaLabel).toBe('Test, count 5, clickable');
  });

  it('should generate aria label with icon name when no label provided', () => {
    fixture.componentRef.setInput('clickable', true);
    fixture.detectChanges();
    
    const ariaLabel = component.ariaLabel();
    expect(ariaLabel).toBe('Icon star, clickable');
  });
});