import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CarpetCheckinComponent } from './carpet-checkin.component';

describe('CarpetCheckinComponent', () => {
  let component: CarpetCheckinComponent;
  let fixture: ComponentFixture<CarpetCheckinComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarpetCheckinComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CarpetCheckinComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
