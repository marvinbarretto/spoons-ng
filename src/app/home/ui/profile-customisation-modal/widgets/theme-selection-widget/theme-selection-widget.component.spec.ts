import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThemeSelectionWidgetComponent } from './theme-selection-widget.component';

describe('ThemeSelectionWidgetComponent', () => {
  let component: ThemeSelectionWidgetComponent;
  let fixture: ComponentFixture<ThemeSelectionWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThemeSelectionWidgetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ThemeSelectionWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
