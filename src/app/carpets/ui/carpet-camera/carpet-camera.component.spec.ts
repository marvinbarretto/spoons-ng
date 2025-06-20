import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CarpetCameraComponent } from './carpet-camera.component';

describe('CarpetCameraComponent', () => {
  let component: CarpetCameraComponent;
  let fixture: ComponentFixture<CarpetCameraComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarpetCameraComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CarpetCameraComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
