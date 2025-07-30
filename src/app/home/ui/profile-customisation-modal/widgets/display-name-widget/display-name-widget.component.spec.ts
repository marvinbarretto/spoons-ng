import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DisplayNameWidgetComponent } from './display-name-widget.component';

describe('DisplayNameWidgetComponent', () => {
  let component: DisplayNameWidgetComponent;
  let fixture: ComponentFixture<DisplayNameWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisplayNameWidgetComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DisplayNameWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
