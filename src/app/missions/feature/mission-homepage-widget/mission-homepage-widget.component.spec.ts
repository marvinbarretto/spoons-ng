import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MissionHomepageWidgetComponent } from './mission-homepage-widget.component';

describe('MissionHomepageWidgetComponent', () => {
  let component: MissionHomepageWidgetComponent;
  let fixture: ComponentFixture<MissionHomepageWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MissionHomepageWidgetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MissionHomepageWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
