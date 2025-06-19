import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckinButtonComponent } from './checkin-button.component';

describe('CheckinButtonComponent', () => {
  let component: CheckinButtonComponent;
  let fixture: ComponentFixture<CheckinButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckinButtonComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CheckinButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
