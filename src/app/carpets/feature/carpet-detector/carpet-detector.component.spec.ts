import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CarpetDetectorComponent } from './carpet-detector.component';

describe('CarpetDetectorComponent', () => {
  let component: CarpetDetectorComponent;
  let fixture: ComponentFixture<CarpetDetectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarpetDetectorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CarpetDetectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
