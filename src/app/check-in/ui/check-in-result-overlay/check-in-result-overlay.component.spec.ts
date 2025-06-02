import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckInResultOverlayComponent } from './check-in-result-overlay.component';

describe('CheckInResultOverlayComponent', () => {
  let component: CheckInResultOverlayComponent;
  let fixture: ComponentFixture<CheckInResultOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckInResultOverlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CheckInResultOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
