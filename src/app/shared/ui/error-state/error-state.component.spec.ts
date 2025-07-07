import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErrorStateComponent } from './error-state.component';

describe('ErrorStateComponent', () => {
  let component: ErrorStateComponent;
  let fixture: ComponentFixture<ErrorStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorStateComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ErrorStateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display default error message and icon', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.error-icon')?.textContent).toContain('⚠️');
    expect(compiled.querySelector('.error-message')?.textContent).toContain('An error occurred');
  });

  it('should display custom error message and icon', () => {
    fixture.componentRef.setInput('icon', '🚨');
    fixture.componentRef.setInput('message', 'Custom error message');
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.error-icon')?.textContent).toContain('🚨');
    expect(compiled.querySelector('.error-message')?.textContent).toContain('Custom error message');
  });

  it('should show retry button when showRetry is true', () => {
    fixture.componentRef.setInput('showRetry', true);
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement as HTMLElement;
    const retryButton = compiled.querySelector('.retry-button');
    expect(retryButton).toBeTruthy();
    expect(retryButton?.textContent).toContain('Retry');
  });

  it('should not show retry button by default', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const retryButton = compiled.querySelector('.retry-button');
    expect(retryButton).toBeFalsy();
  });

  it('should emit retry event when retry button is clicked', () => {
    fixture.componentRef.setInput('showRetry', true);
    fixture.detectChanges();
    
    let retryEmitted = false;
    component.retry.subscribe(() => {
      retryEmitted = true;
    });
    
    const compiled = fixture.nativeElement as HTMLElement;
    const retryButton = compiled.querySelector('.retry-button') as HTMLButtonElement;
    retryButton.click();
    
    expect(retryEmitted).toBe(true);
  });

  it('should have proper accessibility attributes', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const errorDiv = compiled.querySelector('.widget-error');
    expect(errorDiv?.getAttribute('aria-live')).toBe('assertive');
    
    const icon = compiled.querySelector('.error-icon');
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
  });
});