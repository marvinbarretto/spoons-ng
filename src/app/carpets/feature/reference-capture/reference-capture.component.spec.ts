import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReferenceCaptureComponent } from './reference-capture.component';

describe('ReferenceCaptureComponent', () => {
  let component: ReferenceCaptureComponent;
  let fixture: ComponentFixture<ReferenceCaptureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReferenceCaptureComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReferenceCaptureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
