import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  let component: EmptyStateComponent;
  let fixture: ComponentFixture<EmptyStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyStateComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EmptyStateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display default empty state', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.empty-icon')?.textContent).toContain('📭');
    expect(compiled.querySelector('.empty-title')?.textContent).toContain('No items found');
  });

  it('should display custom empty state', () => {
    fixture.componentRef.setInput('icon', '🎯');
    fixture.componentRef.setInput('title', 'No missions');
    fixture.componentRef.setInput('subtitle', 'Start your first mission');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.empty-icon')?.textContent).toContain('🎯');
    expect(compiled.querySelector('.empty-title')?.textContent).toContain('No missions');
    expect(compiled.querySelector('.empty-subtitle')?.textContent).toContain(
      'Start your first mission'
    );
  });

  it('should show action button when showAction is true', () => {
    fixture.componentRef.setInput('showAction', true);
    fixture.componentRef.setInput('actionText', 'Get Started');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const actionButton = compiled.querySelector('.action-button');
    expect(actionButton).toBeTruthy();
    expect(actionButton?.textContent).toContain('Get Started');
  });

  it('should not show action button by default', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const actionButton = compiled.querySelector('.action-button');
    expect(actionButton).toBeFalsy();
  });

  it('should not show subtitle when not provided', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const subtitle = compiled.querySelector('.empty-subtitle');
    expect(subtitle).toBeFalsy();
  });

  it('should emit action event when action button is clicked', () => {
    fixture.componentRef.setInput('showAction', true);
    fixture.detectChanges();

    let actionEmitted = false;
    component.action.subscribe(() => {
      actionEmitted = true;
    });

    const compiled = fixture.nativeElement as HTMLElement;
    const actionButton = compiled.querySelector('.action-button') as HTMLButtonElement;
    actionButton.click();

    expect(actionEmitted).toBe(true);
  });

  it('should have proper accessibility attributes', () => {
    fixture.componentRef.setInput('showAction', true);
    fixture.componentRef.setInput('actionLabel', 'Start new mission');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const icon = compiled.querySelector('.empty-icon');
    expect(icon?.getAttribute('aria-hidden')).toBe('true');

    const actionButton = compiled.querySelector('.action-button');
    expect(actionButton?.getAttribute('aria-label')).toContain('Start new mission');
  });
});
