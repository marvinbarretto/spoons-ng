import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckInStatusModalComponent } from './check-in-status-modal.component';

describe('CheckInStatusModalComponent', () => {
  let component: CheckInStatusModalComponent;
  let fixture: ComponentFixture<CheckInStatusModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckInStatusModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CheckInStatusModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
