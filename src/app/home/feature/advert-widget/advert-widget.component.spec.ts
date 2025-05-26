import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdvertWidgetComponent } from './advert-widget.component';

describe('AdvertWidgetComponent', () => {
  let component: AdvertWidgetComponent;
  let fixture: ComponentFixture<AdvertWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdvertWidgetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdvertWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
