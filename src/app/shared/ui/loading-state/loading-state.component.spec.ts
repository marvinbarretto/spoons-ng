import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoadingStateComponent } from './loading-state.component';

describe('LoadingStateComponent', () => {
  let component: LoadingStateComponent;
  let fixture: ComponentFixture<LoadingStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingStateComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoadingStateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display default loading text', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.loading-text')?.textContent).toContain('Loading...');
  });

  it('should display custom loading text', () => {
    fixture.componentRef.setInput('text', 'Loading custom data...');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.loading-text')?.textContent).toContain(
      'Loading custom data...'
    );
  });

  it('should have proper accessibility attributes', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const loadingDiv = compiled.querySelector('.widget-loading');
    expect(loadingDiv?.getAttribute('aria-live')).toBe('polite');

    const spinner = compiled.querySelector('.loading-spinner');
    expect(spinner?.getAttribute('aria-hidden')).toBe('true');
  });
});
