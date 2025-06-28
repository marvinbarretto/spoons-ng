import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CarpetCollectionWidgetComponent } from './carpet-collection-widget.component';

describe('CarpetCollectionWidgetComponent', () => {
  let component: CarpetCollectionWidgetComponent;
  let fixture: ComponentFixture<CarpetCollectionWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarpetCollectionWidgetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CarpetCollectionWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});