import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MissionsSectionComponent } from './missions-widget.component';

describe('MissionsSectionComponent', () => {
  let component: MissionsSectionComponent;
  let fixture: ComponentFixture<MissionsSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MissionsSectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MissionsSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
