import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckInResultModalComponent } from './check-in-result-modal.component';

describe('CheckInResultModalComponent', () => {
  let component: CheckInResultModalComponent;
  let fixture: ComponentFixture<CheckInResultModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckInResultModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CheckInResultModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
