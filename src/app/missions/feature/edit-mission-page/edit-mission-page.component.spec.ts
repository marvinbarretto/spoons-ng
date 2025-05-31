import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditMissionPageComponent } from './edit-mission-page.component';

describe('EditMissionPageComponent', () => {
  let component: EditMissionPageComponent;
  let fixture: ComponentFixture<EditMissionPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditMissionPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditMissionPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
