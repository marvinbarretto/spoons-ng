import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListFilterControlsComponent } from './list-filter-controls.component';

describe('ListFilterControlsComponent', () => {
  let component: ListFilterControlsComponent;
  let fixture: ComponentFixture<ListFilterControlsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListFilterControlsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListFilterControlsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
