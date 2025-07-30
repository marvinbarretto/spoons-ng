// src/app/shared/ui/button/button.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { watchSignal } from '../../testing/signal-test-utils.spec';
import { ButtonComponent } from './button.component';

describe('ButtonComponent', () => {
  let component: ButtonComponent;
  let fixture: ComponentFixture<ButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ButtonComponent);
    component = fixture.componentInstance;
  });

  describe('Signal-driven behavior', () => {
    it('should react to loading state changes', () => {
      // Arrange
      const loadingWatcher = watchSignal(component.loading).startWatching();

      // Act
      fixture.componentRef.setInput('loading', true);
      fixture.detectChanges();

      const button = fixture.debugElement.query(By.css('button'));

      // Assert
      expect(button.nativeElement.disabled).toBe(true);
      expect(button.nativeElement.classList.contains('is-loading')).toBe(true);
      loadingWatcher.expectCurrentValue(true);
    });

    it('should emit onClick when clicked and not disabled', () => {
      // Arrange
      jest.spyOn(component.onClick, 'emit');
      fixture.componentRef.setInput('disabled', false);
      fixture.detectChanges();

      // Act
      const button = fixture.debugElement.query(By.css('button'));
      button.triggerEventHandler('click', null);

      // Assert
      expect(component.onClick.emit).toHaveBeenCalledTimes(1);
    });

    it('should not emit onClick when disabled', () => {
      // Arrange
      jest.spyOn(component.onClick, 'emit');
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();

      // Act
      const button = fixture.debugElement.query(By.css('button'));
      button.triggerEventHandler('click', null);

      // Assert - button click should be prevented by disabled attribute
      expect(component.onClick.emit).not.toHaveBeenCalled();
    });
  });

  describe('Variant rendering', () => {
    it('should apply correct data-variant attribute', () => {
      // Arrange & Act
      fixture.componentRef.setInput('variant', 'primary');
      fixture.detectChanges();

      // Assert
      const button = fixture.debugElement.query(By.css('button'));
      expect(button.nativeElement.getAttribute('data-variant')).toBe('primary');
    });

    it('should render icon when provided', () => {
      // Arrange & Act
      fixture.componentRef.setInput('iconLeft', 'search');
      fixture.detectChanges();

      // Assert
      const icon = fixture.debugElement.query(By.css('.material-symbols-outlined'));
      expect(icon).toBeTruthy();
      expect(icon.nativeElement.textContent.trim()).toBe('search');
    });

    it('should render spinner instead of icon when loading', () => {
      // Arrange & Act
      fixture.componentRef.setInput('loading', true);
      fixture.componentRef.setInput('iconLeft', 'search');
      fixture.detectChanges();

      // Assert
      const spinner = fixture.debugElement.query(By.css('.btn__spinner'));
      const icon = fixture.debugElement.query(By.css('.material-symbols-outlined'));

      expect(spinner).toBeTruthy();
      expect(icon).toBeFalsy(); // Icon should not render when loading
    });
  });

  describe('Full width behavior', () => {
    it('should apply full-width class when fullWidth$$ is true', () => {
      // Arrange & Act
      fixture.componentRef.setInput('fullWidth', true);
      fixture.detectChanges();

      // Assert
      const button = fixture.debugElement.query(By.css('button'));
      expect(button.nativeElement.classList.contains('full-width')).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('should have correct aria-busy attribute when loading', () => {
      // Arrange & Act
      fixture.componentRef.setInput('loading', true);
      fixture.detectChanges();

      // Assert
      const button = fixture.debugElement.query(By.css('button'));
      expect(button.nativeElement.getAttribute('aria-busy')).toBe('true');
    });

    it('should have correct type attribute', () => {
      // Arrange & Act
      fixture.componentRef.setInput('type', 'submit');
      fixture.detectChanges();

      // Assert
      const button = fixture.debugElement.query(By.css('button'));
      expect(button.nativeElement.type).toBe('submit');
    });
  });
});
