import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalCheckinLandlordComponent } from './modal-checkin-landlord.component';
import { getStandardTestProviders } from '../../../testing/test-providers';

describe('ModalCheckinLandlordComponent', () => {
  let component: ModalCheckinLandlordComponent;
  let fixture: ComponentFixture<ModalCheckinLandlordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalCheckinLandlordComponent],
      providers: getStandardTestProviders()
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalCheckinLandlordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
