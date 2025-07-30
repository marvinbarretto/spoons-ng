import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  CheckinErrorDetails,
  ModalCheckinAttemptComponent,
} from './modal-checkin-attempt.component';

describe('ModalCheckinAttemptComponent', () => {
  let component: ModalCheckinAttemptComponent;
  let fixture: ComponentFixture<ModalCheckinAttemptComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalCheckinAttemptComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalCheckinAttemptComponent);
    component = fixture.componentInstance;

    // Set required input
    fixture.componentRef.setInput('errorDetails', {
      type: 'no-location',
      message: 'Test message',
    } as CheckinErrorDetails);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display error message', () => {
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('.error-message').textContent).toContain('Test message');
  });

  it('should emit retry action', () => {
    jest.spyOn(component.result, 'emit');
    component.handleRetry();
    expect(component.result.emit).toHaveBeenCalledWith('retry');
  });

  it('should emit close action', () => {
    jest.spyOn(component.result, 'emit');
    component.handleClose();
    expect(component.result.emit).toHaveBeenCalledWith('close');
  });

  it('should show correct icon for different error types', () => {
    expect(component.getIconName()).toBe('location_off');

    fixture.componentRef.setInput('errorDetails', {
      type: 'poor-accuracy',
      message: 'Test message',
    } as CheckinErrorDetails);
    fixture.detectChanges();

    expect(component.getIconName()).toBe('gps_not_fixed');
  });

  it('should show correct title for different error types', () => {
    expect(component.getTitle()).toBe('Location Access Needed');

    fixture.componentRef.setInput('errorDetails', {
      type: 'out-of-range',
      message: 'Test message',
    } as CheckinErrorDetails);
    fixture.detectChanges();

    expect(component.getTitle()).toBe('Too Far from Pub');
  });
});
