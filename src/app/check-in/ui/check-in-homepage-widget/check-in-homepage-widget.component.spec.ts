import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckInHomepageWidgetComponent } from './check-in-homepage-widget.component';

describe('CheckInHomepageWidgetComponent', () => {
  let component: CheckInHomepageWidgetComponent;
  let fixture: ComponentFixture<CheckInHomepageWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckInHomepageWidgetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CheckInHomepageWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
