import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateMissionPageComponent } from './create-mission-page.component';

describe('CreateMissionPageComponent', () => {
  let component: CreateMissionPageComponent;
  let fixture: ComponentFixture<CreateMissionPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateMissionPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateMissionPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
