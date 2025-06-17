import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AvatarSelectionWidgetComponent } from './avatar-selection-widget.component';

describe('AvatarSelectionWidgetComponent', () => {
  let component: AvatarSelectionWidgetComponent;
  let fixture: ComponentFixture<AvatarSelectionWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvatarSelectionWidgetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AvatarSelectionWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
