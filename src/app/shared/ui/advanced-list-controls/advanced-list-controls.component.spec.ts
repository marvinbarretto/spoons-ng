import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdvancedListControlsComponent } from './advanced-list-controls.component';

describe('AdvancedListControlsComponent', () => {
  let component: AdvancedListControlsComponent;
  let fixture: ComponentFixture<AdvancedListControlsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdvancedListControlsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AdvancedListControlsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
