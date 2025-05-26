import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EventsNavComponent } from './events-nav.component';

describe('EventsNavComponent', () => {
  let component: EventsNavComponent;
  let fixture: ComponentFixture<EventsNavComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventsNavComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EventsNavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
