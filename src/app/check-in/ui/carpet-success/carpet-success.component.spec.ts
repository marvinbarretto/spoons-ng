import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CarpetSuccessComponent } from './carpet-success.component';

describe('CarpetSuccessComponent', () => {
  let component: CarpetSuccessComponent;
  let fixture: ComponentFixture<CarpetSuccessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarpetSuccessComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CarpetSuccessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
