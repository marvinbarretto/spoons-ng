import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateEventComponent } from './create-event.component';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EventStore } from '../../data-access/event.store';
import { EventService } from '../../data-access/event.service';
import { createMockEventStore } from '../../../shared/testing/mock-store.spec';
import { provideRouter, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { EventStatus } from '../../utils/event.model';

describe('CreateEventComponent', () => {
  let component: CreateEventComponent;
  let fixture: ComponentFixture<CreateEventComponent>;

  let mockEventStore: ReturnType<typeof createMockEventStore>;
  let mockRouter: Router;

  beforeEach(async () => {
    mockEventStore = createMockEventStore();

    await TestBed.configureTestingModule({
      imports: [CreateEventComponent, ReactiveFormsModule],
      providers: [
        { provide: EventStore, useValue: mockEventStore },
        EventService,
        FormBuilder,
        provideRouter([]),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateEventComponent);
    component = fixture.componentInstance;
    mockRouter = TestBed.inject(Router);
    jest.spyOn(mockRouter, 'navigate');

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Test if the form is invalid when empty
  it('should have an invalid form when required fields are empty', () => {
    expect(component.eventForm.invalid).toBe(true);
  });

  it('should call createEvent on form submit when the form is valid', () => {
    component.eventForm.setValue({
      title: 'New Event',
      description: 'An awesome event!',
      date: '2024-10-01',
      location: 'Some Place',
      locale: '',
      eventStatus: EventStatus.PENDING,
    });

    expect(component.eventForm.valid).toBe(true); // Ensure the form is valid

    // Spy on createEvent method
    jest.spyOn(mockEventStore, 'createEvent');

    // Trigger form submission
    component.onSubmit();

    // Ensure createEvent was called with the correct data
    expect(mockEventStore.createEvent).toHaveBeenCalledWith({
      title: 'New Event',
      description: 'An awesome event!',
      date: '2024-10-01',
      location: 'Some Place',
      locale: '',
      eventStatus: EventStatus.PENDING,
      slug: 'new-event', // slug should also be added
    });

    // Test that the user is redirected after submission
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/events']);
  });

  // TODO: Firm up unit tests
});
