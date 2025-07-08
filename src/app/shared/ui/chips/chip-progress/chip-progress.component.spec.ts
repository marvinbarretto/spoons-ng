import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChipProgressComponent } from './chip-progress.component';

describe('ChipProgressComponent', () => {
  let component: ChipProgressComponent;
  let fixture: ComponentFixture<ChipProgressComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChipProgressComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ChipProgressComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('stateIcon', () => {
    it('should use custom icon when provided', () => {
      fixture.componentRef.setInput('customIcon', '🚀');
      expect(component.stateIcon()).toBe('🚀');
    });

    it('should use default icon based on state', () => {
      fixture.componentRef.setInput('state', 'completed');
      expect(component.stateIcon()).toBe('✅');
      
      fixture.componentRef.setInput('state', 'failed');
      expect(component.stateIcon()).toBe('❌');
      
      fixture.componentRef.setInput('state', 'in-progress');
      expect(component.stateIcon()).toBe('🔄');
    });

    it('should fallback to pending icon for unknown states', () => {
      fixture.componentRef.setInput('state', 'unknown' as any);
      expect(component.stateIcon()).toBe('⏳');
    });
  });

  describe('displayValue', () => {
    it('should return empty string when value is null or undefined', () => {
      fixture.componentRef.setInput('value', null);
      expect(component.displayValue()).toBe('');
      
      fixture.componentRef.setInput('value', undefined);
      expect(component.displayValue()).toBe('');
    });

    it('should display simple value', () => {
      fixture.componentRef.setInput('value', 42);
      expect(component.displayValue()).toBe('42');
    });

    it('should display value with max value', () => {
      fixture.componentRef.setInput('value', 5);
      fixture.componentRef.setInput('maxValue', 10);
      expect(component.displayValue()).toBe('5/10');
    });

    it('should display value with unit', () => {
      fixture.componentRef.setInput('value', 75);
      fixture.componentRef.setInput('unit', '%');
      expect(component.displayValue()).toBe('75 %');
    });

    it('should display value with max value and unit', () => {
      fixture.componentRef.setInput('value', 8);
      fixture.componentRef.setInput('maxValue', 12);
      fixture.componentRef.setInput('unit', 'steps');
      expect(component.displayValue()).toBe('8/12 steps');
    });
  });

  describe('chipClasses', () => {
    it('should include state and size classes', () => {
      fixture.componentRef.setInput('state', 'completed');
      fixture.componentRef.setInput('size', 'lg');
      
      const classes = component.chipClasses();
      expect(classes).toContain('state--completed');
      expect(classes).toContain('size--lg');
    });

    it('should add active class when isActive is true', () => {
      fixture.componentRef.setInput('isActive', true);
      expect(component.chipClasses()).toContain('active');
    });

    it('should add animated class for in-progress state with showProgress', () => {
      fixture.componentRef.setInput('state', 'in-progress');
      fixture.componentRef.setInput('showProgress', true);
      expect(component.chipClasses()).toContain('animated');
    });

    it('should not add animated class for other states', () => {
      fixture.componentRef.setInput('state', 'completed');
      fixture.componentRef.setInput('showProgress', true);
      expect(component.chipClasses()).not.toContain('animated');
    });

    it('should include custom class when provided', () => {
      fixture.componentRef.setInput('customClass', 'my-custom-class');
      expect(component.chipClasses()).toContain('my-custom-class');
    });
  });

  describe('ariaLabel', () => {
    it('should include label and state', () => {
      fixture.componentRef.setInput('label', 'Upload');
      fixture.componentRef.setInput('state', 'in-progress');
      
      const ariaLabel = component.ariaLabel();
      expect(ariaLabel).toContain('Upload');
      expect(ariaLabel).toContain('in-progress');
    });

    it('should include value when showValue is true', () => {
      fixture.componentRef.setInput('label', 'Progress');
      fixture.componentRef.setInput('value', 75);
      fixture.componentRef.setInput('showValue', true);
      
      expect(component.ariaLabel()).toContain('value: 75');
    });

    it('should indicate current step when active', () => {
      fixture.componentRef.setInput('isActive', true);
      expect(component.ariaLabel()).toContain('current step');
    });

    it('should handle missing label', () => {
      fixture.componentRef.setInput('state', 'pending');
      expect(component.ariaLabel()).toBe('pending');
    });
  });
});