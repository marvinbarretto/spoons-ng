import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InlineSvgComponent } from './inline-svg.component';

describe('InlineSvgComponent', () => {
  let component: InlineSvgComponent;
  let fixture: ComponentFixture<InlineSvgComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InlineSvgComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InlineSvgComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
