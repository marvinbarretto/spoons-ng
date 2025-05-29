import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckInContainerComponent } from './check-in-container.component';

describe('CheckInContainerComponent', () => {
  let component: CheckInContainerComponent;
  let fixture: ComponentFixture<CheckInContainerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckInContainerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CheckInContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
