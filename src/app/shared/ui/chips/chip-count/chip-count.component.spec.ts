import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChipCountComponent } from './chip-count.component';

describe('ChipCountComponent', () => {
  let component: ChipCountComponent;
  let fixture: ComponentFixture<ChipCountComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChipCountComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ChipCountComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('count', 0);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('formattedCount', () => {
    it('should format large numbers when formatLargeNumbers is true', () => {
      fixture.componentRef.setInput('count', 1500);
      fixture.componentRef.setInput('formatLargeNumbers', true);
      expect(component.formattedCount()).toBe('1.5k');

      fixture.componentRef.setInput('count', 10500);
      expect(component.formattedCount()).toBe('10k');

      fixture.componentRef.setInput('count', 1500000);
      expect(component.formattedCount()).toBe('1.5M');
    });

    it('should not format when formatLargeNumbers is false', () => {
      fixture.componentRef.setInput('count', 1500);
      fixture.componentRef.setInput('formatLargeNumbers', false);
      expect(component.formattedCount()).toBe('1500');
    });

    it('should show sign when showSign is true', () => {
      fixture.componentRef.setInput('count', 100);
      fixture.componentRef.setInput('showSign', true);
      expect(component.formattedCount()).toBe('+100');

      fixture.componentRef.setInput('count', -50);
      expect(component.formattedCount()).toBe('-50');
    });

    it('should handle zero and negative values', () => {
      fixture.componentRef.setInput('count', 0);
      expect(component.formattedCount()).toBe('0');

      fixture.componentRef.setInput('count', -100);
      expect(component.formattedCount()).toBe('-100');
    });
  });

  describe('chipClasses', () => {
    it('should include size and variant classes', () => {
      fixture.componentRef.setInput('count', 10);
      fixture.componentRef.setInput('size', 'md');
      fixture.componentRef.setInput('variant', 'primary');
      
      const classes = component.chipClasses();
      expect(classes).toContain('size--md');
      expect(classes).toContain('variant--primary');
    });

    it('should add zero-count class when count is 0', () => {
      fixture.componentRef.setInput('count', 0);
      expect(component.chipClasses()).toContain('zero-count');
    });

    it('should add negative-count class when count is negative', () => {
      fixture.componentRef.setInput('count', -5);
      expect(component.chipClasses()).toContain('negative-count');
    });

    it('should add clickable class when clickable is true', () => {
      fixture.componentRef.setInput('count', 10);
      fixture.componentRef.setInput('clickable', true);
      expect(component.chipClasses()).toContain('clickable');
    });
  });

  describe('ariaLabel', () => {
    it('should combine label, prefix, count, and suffix', () => {
      fixture.componentRef.setInput('count', 42);
      fixture.componentRef.setInput('label', 'Points');
      fixture.componentRef.setInput('prefix', '+');
      fixture.componentRef.setInput('suffix', 'pts');
      
      expect(component.ariaLabel()).toBe('Points + 42 pts');
    });

    it('should handle missing optional values', () => {
      fixture.componentRef.setInput('count', 10);
      expect(component.ariaLabel()).toBe('10');
    });

    it('should indicate clickable state', () => {
      fixture.componentRef.setInput('count', 5);
      fixture.componentRef.setInput('clickable', true);
      expect(component.ariaLabel()).toContain('clickable');
    });
  });

  describe('click handling', () => {
    it('should emit clicked event when clickable', () => {
      const clickedSpy = jest.fn();
      component.clicked.subscribe(clickedSpy);
      
      fixture.componentRef.setInput('count', 25);
      fixture.componentRef.setInput('clickable', true);
      
      component.handleClick();
      
      expect(clickedSpy).toHaveBeenCalledWith(25);
    });

    it('should not emit when not clickable', () => {
      const clickedSpy = jest.fn();
      component.clicked.subscribe(clickedSpy);
      
      fixture.componentRef.setInput('count', 25);
      fixture.componentRef.setInput('clickable', false);
      
      component.handleClick();
      
      expect(clickedSpy).not.toHaveBeenCalled();
    });
  });
});