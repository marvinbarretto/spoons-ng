import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CarpetGridComponent } from './carpet-grid.component';

describe('CarpetGridComponent', () => {
  let component: CarpetGridComponent;
  let fixture: ComponentFixture<CarpetGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarpetGridComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CarpetGridComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
