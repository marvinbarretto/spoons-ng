import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalCheckinSuccessComponent } from './modal-checkin-success.component';

describe('ModalCheckinSuccessComponent', () => {
  let component: ModalCheckinSuccessComponent;
  let fixture: ComponentFixture<ModalCheckinSuccessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalCheckinSuccessComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalCheckinSuccessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
