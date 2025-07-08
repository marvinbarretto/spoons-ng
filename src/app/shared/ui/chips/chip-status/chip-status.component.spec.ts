import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChipStatusComponent } from './chip-status.component';
import { Component } from '@angular/core';

describe('ChipStatusComponent', () => {
  let component: ChipStatusComponent;
  let fixture: ComponentFixture<ChipStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChipStatusComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ChipStatusComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('statusIcon', () => {
    it('should use custom icon when provided', () => {
      fixture.componentRef.setInput('icon', '🚀');
      expect(component.statusIcon()).toBe('🚀');
    });

    it('should use default icon based on type', () => {
      fixture.componentRef.setInput('type', 'success');
      expect(component.statusIcon()).toBe('✅');
      
      fixture.componentRef.setInput('type', 'error');
      expect(component.statusIcon()).toBe('❌');
      
      fixture.componentRef.setInput('type', 'loading');
      expect(component.statusIcon()).toBe('⏱️');
    });
  });

  describe('chipClasses', () => {
    it('should include type and size classes', () => {
      fixture.componentRef.setInput('type', 'success');
      fixture.componentRef.setInput('size', 'md');
      expect(component.chipClasses()).toContain('type--success');
      expect(component.chipClasses()).toContain('size--md');
    });

    it('should add icon-only class when no text', () => {
      fixture.componentRef.setInput('text', '');
      expect(component.chipClasses()).toContain('icon-only');
    });

    it('should add animated class for loading type when animated is true', () => {
      fixture.componentRef.setInput('type', 'loading');
      fixture.componentRef.setInput('animated', true);
      expect(component.chipClasses()).toContain('animated');
    });

    it('should include custom class when provided', () => {
      fixture.componentRef.setInput('customClass', 'my-custom-class');
      expect(component.chipClasses()).toContain('my-custom-class');
    });
  });

  describe('ariaLabel', () => {
    it('should include type and text in aria label', () => {
      fixture.componentRef.setInput('type', 'success');
      fixture.componentRef.setInput('text', 'Operation complete');
      expect(component.ariaLabel()).toBe('success status: Operation complete');
    });

    it('should handle missing text', () => {
      fixture.componentRef.setInput('type', 'loading');
      fixture.componentRef.setInput('text', '');
      expect(component.ariaLabel()).toBe('loading status');
    });
  });
});

@Component({
  selector: 'app-test-host',
  imports: [ChipStatusComponent],
  template: `
    <app-chip-status 
      [type]="type"
      [text]="text"
      [size]="size"
      [showIcon]="showIcon"
      [animated]="animated"
    />
  `
})
class TestHostComponent {
  type = 'success';
  text = 'Test Status';
  size = 'md';
  showIcon = true;
  animated = false;
}

describe('ChipStatusComponent (with host)', () => {
  let hostComponent: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
  });

  it('should render status chip with correct content', () => {
    fixture.detectChanges();
    
    const chipElement = fixture.nativeElement.querySelector('.chip-status');
    expect(chipElement).toBeTruthy();
    expect(chipElement.classList).toContain('type--success');
    expect(chipElement.textContent).toContain('✅');
    expect(chipElement.textContent).toContain('Test Status');
  });

  it('should update when inputs change', () => {
    fixture.detectChanges();
    
    hostComponent.type = 'error';
    hostComponent.text = 'Error occurred';
    fixture.detectChanges();
    
    const chipElement = fixture.nativeElement.querySelector('.chip-status');
    expect(chipElement.classList).toContain('type--error');
    expect(chipElement.textContent).toContain('❌');
    expect(chipElement.textContent).toContain('Error occurred');
  });
});