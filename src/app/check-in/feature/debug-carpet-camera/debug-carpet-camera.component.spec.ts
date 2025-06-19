import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DebugCarpetCameraComponent } from './debug-carpet-camera.component';

describe('DebugCarpetCameraComponent', () => {
  let component: DebugCarpetCameraComponent;
  let fixture: ComponentFixture<DebugCarpetCameraComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DebugCarpetCameraComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DebugCarpetCameraComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
