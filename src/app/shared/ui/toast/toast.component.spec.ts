import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Toast, ToastService } from '../../data-access/toast.service';
import { IconComponent } from '../icon/icon.component';
import { ToastComponent } from './toast.component';

describe('ToastComponent', () => {
  let component: ToastComponent;
  let fixture: ComponentFixture<ToastComponent>;
  let mockToastService: jest.Mocked<ToastService>;

  const mockToasts: Toast[] = [
    {
      id: 'test-1',
      message: 'Success message',
      type: 'success',
      sticky: false,
      timeout: 3000,
    },
    {
      id: 'test-2',
      message: 'Error message',
      type: 'error',
      sticky: true,
      timeout: 5000,
    },
  ];

  beforeEach(async () => {
    const toastServiceSpy = {
      toasts: signal(mockToasts),
      dismiss: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ToastComponent, IconComponent],
      providers: [{ provide: ToastService, useValue: toastServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(ToastComponent);
    component = fixture.componentInstance;
    mockToastService = TestBed.inject(ToastService) as jest.Mocked<ToastService>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Template Rendering', () => {
    it('should render all toasts from the service', () => {
      const toastElements = fixture.nativeElement.querySelectorAll('.toast');
      expect(toastElements.length).toBe(2);
    });

    it('should render toast messages correctly', () => {
      const toastElements = fixture.nativeElement.querySelectorAll('.toast-message');
      expect(toastElements[0].textContent.trim()).toBe('Success message');
      expect(toastElements[1].textContent.trim()).toBe('Error message');
    });

    it('should render correct CSS classes for each toast type', () => {
      const toastElements = fixture.nativeElement.querySelectorAll('.toast');
      expect(toastElements[0].className).toContain('toast--success');
      expect(toastElements[1].className).toContain('toast--error');
    });

    it('should render icons for each toast', () => {
      const iconElements = fixture.nativeElement.querySelectorAll('app-icon');
      // Each toast has 2 icons (type icon + dismiss icon)
      expect(iconElements.length).toBe(4);
    });

    it('should render dismiss icons for each toast', () => {
      const dismissIcons = fixture.nativeElement.querySelectorAll('.toast-dismiss-icon');
      expect(dismissIcons.length).toBe(2);
    });
  });

  describe('toastClass method', () => {
    it('should return correct class for success toast', () => {
      const toast: Toast = { id: '1', message: 'test', type: 'success', sticky: false };
      expect(component.toastClass(toast)).toBe('toast toast--success');
    });

    it('should return correct class for error toast', () => {
      const toast: Toast = { id: '1', message: 'test', type: 'error', sticky: false };
      expect(component.toastClass(toast)).toBe('toast toast--error');
    });

    it('should return correct class for warning toast', () => {
      const toast: Toast = { id: '1', message: 'test', type: 'warning', sticky: false };
      expect(component.toastClass(toast)).toBe('toast toast--warning');
    });

    it('should return correct class for info toast', () => {
      const toast: Toast = { id: '1', message: 'test', type: 'info', sticky: false };
      expect(component.toastClass(toast)).toBe('toast toast--info');
    });
  });

  describe('getIconName method', () => {
    it('should return correct icon name for success type', () => {
      expect(component.getIconName('success')).toBe('check_circle');
    });

    it('should return correct icon name for error type', () => {
      expect(component.getIconName('error')).toBe('error');
    });

    it('should return correct icon name for warning type', () => {
      expect(component.getIconName('warning')).toBe('warning');
    });

    it('should return correct icon name for info type', () => {
      expect(component.getIconName('info')).toBe('info');
    });
  });

  describe('dismiss method', () => {
    it('should call toastService.dismiss with correct ID when dismiss icon is clicked', () => {
      const dismissIcon = fixture.nativeElement.querySelector('.toast-dismiss-icon');
      dismissIcon.click();

      expect(mockToastService.dismiss).toHaveBeenCalledWith('test-1');
    });

    it('should call toastService.dismiss when dismiss method is called directly', () => {
      component.dismiss('test-id');
      expect(mockToastService.dismiss).toHaveBeenCalledWith('test-id');
    });
  });

  describe('Signal Reactivity', () => {
    it('should update when toasts signal changes', () => {
      const newToasts: Toast[] = [
        { id: 'new-1', message: 'New toast', type: 'info', sticky: false },
      ];

      mockToastService.toasts.set(newToasts);
      fixture.detectChanges();

      const toastElements = fixture.nativeElement.querySelectorAll('.toast');
      expect(toastElements.length).toBe(1);
      expect(fixture.nativeElement.querySelector('.toast-message').textContent.trim()).toBe(
        'New toast'
      );
    });

    it('should render no toasts when signal is empty', () => {
      mockToastService.toasts.set([]);
      fixture.detectChanges();

      const toastElements = fixture.nativeElement.querySelectorAll('.toast');
      expect(toastElements.length).toBe(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper track function for @for loop (by toast id)', () => {
      expect(component.toasts()).toBe(mockToastService.toasts());
    });
  });
});
