import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChipFilterComponent } from './chip-filter.component';

describe('ChipFilterComponent', () => {
  let component: ChipFilterComponent;
  let fixture: ComponentFixture<ChipFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChipFilterComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ChipFilterComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('label', 'Test Filter');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('formattedCount', () => {
    it('should format large numbers when formatNumbers is true', () => {
      fixture.componentRef.setInput('count', 1500);
      fixture.componentRef.setInput('formatNumbers', true);
      expect(component.formattedCount()).toBe('1.5k');
    });

    it('should not format when formatNumbers is false', () => {
      fixture.componentRef.setInput('count', 1500);
      fixture.componentRef.setInput('formatNumbers', false);
      expect(component.formattedCount()).toBe('1500');
    });

    it('should handle null and undefined counts', () => {
      fixture.componentRef.setInput('count', null);
      expect(component.formattedCount()).toBe('');
      
      fixture.componentRef.setInput('count', undefined);
      expect(component.formattedCount()).toBe('');
    });
  });

  describe('chipClasses', () => {
    it('should include size class', () => {
      fixture.componentRef.setInput('size', 'lg');
      expect(component.chipClasses()).toContain('size--lg');
    });

    it('should add active class when active', () => {
      fixture.componentRef.setInput('active', true);
      expect(component.chipClasses()).toContain('active');
    });

    it('should add disabled class when disabled', () => {
      fixture.componentRef.setInput('disabled', true);
      expect(component.chipClasses()).toContain('disabled');
    });

    it('should add removable class when removable and active', () => {
      fixture.componentRef.setInput('removable', true);
      fixture.componentRef.setInput('active', true);
      expect(component.chipClasses()).toContain('removable');
    });

    it('should not add removable class when not active', () => {
      fixture.componentRef.setInput('removable', true);
      fixture.componentRef.setInput('active', false);
      expect(component.chipClasses()).not.toContain('removable');
    });
  });

  describe('ariaLabel', () => {
    it('should include label and state', () => {
      fixture.componentRef.setInput('label', 'Visited');
      fixture.componentRef.setInput('active', true);
      expect(component.ariaLabel()).toContain('Visited');
      expect(component.ariaLabel()).toContain('selected');
    });

    it('should include count when provided', () => {
      fixture.componentRef.setInput('label', 'Visited');
      fixture.componentRef.setInput('count', 25);
      expect(component.ariaLabel()).toContain('25 items');
    });

    it('should indicate disabled state', () => {
      fixture.componentRef.setInput('disabled', true);
      expect(component.ariaLabel()).toContain('disabled');
    });
  });

  describe('click handling', () => {
    it('should emit clicked event when not disabled', () => {
      const clickedSpy = jest.fn();
      component.clicked.subscribe(clickedSpy);
      
      component.handleClick();
      
      expect(clickedSpy).toHaveBeenCalled();
    });

    it('should not emit when disabled', () => {
      const clickedSpy = jest.fn();
      component.clicked.subscribe(clickedSpy);
      
      fixture.componentRef.setInput('disabled', true);
      component.handleClick();
      
      expect(clickedSpy).not.toHaveBeenCalled();
    });
  });

  describe('remove handling', () => {
    it('should emit removed event and stop propagation', () => {
      const removedSpy = jest.fn();
      const event = { stopPropagation: jest.fn() } as any;
      component.removed.subscribe(removedSpy);
      
      component.handleRemove(event);
      
      expect(removedSpy).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
    });

    it('should not emit when disabled', () => {
      const removedSpy = jest.fn();
      const event = { stopPropagation: jest.fn() } as any;
      component.removed.subscribe(removedSpy);
      
      fixture.componentRef.setInput('disabled', true);
      component.handleRemove(event);
      
      expect(removedSpy).not.toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
    });
  });
});