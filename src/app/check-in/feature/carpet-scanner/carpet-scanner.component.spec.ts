import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CarpetScannerComponent } from './carpet-scanner.component';

describe('CarpetScannerComponent', () => {
  let component: CarpetScannerComponent;
  let fixture: ComponentFixture<CarpetScannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarpetScannerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CarpetScannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
