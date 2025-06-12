import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LandlordStatusModalComponent } from './landlord-status-modal.component';

describe('LandlordStatusModalComponent', () => {
  let component: LandlordStatusModalComponent;
  let fixture: ComponentFixture<LandlordStatusModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandlordStatusModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LandlordStatusModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
