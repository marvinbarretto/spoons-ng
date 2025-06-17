import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MissionsWidgetComponent } from './missions-widget.component';

describe('MissionsWidgetComponent', () => {
  let component: MissionsWidgetComponent;
  let fixture: ComponentFixture<MissionsWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MissionsWidgetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MissionsWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
