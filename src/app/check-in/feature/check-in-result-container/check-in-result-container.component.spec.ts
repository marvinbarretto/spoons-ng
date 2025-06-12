import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckInResultContainerComponent } from './check-in-result-container.component';

describe('CheckInResultContainerComponent', () => {
  let component: CheckInResultContainerComponent;
  let fixture: ComponentFixture<CheckInResultContainerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckInResultContainerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CheckInResultContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
