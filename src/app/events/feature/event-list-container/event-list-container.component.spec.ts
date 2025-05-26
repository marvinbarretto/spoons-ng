import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventListContainerComponent } from './event-list-container.component';
import { createMockAuthStore } from '../../../shared/testing/mock-store.spec';
import { createMockEventStore } from '../../../shared/testing/mock-store.spec';
import { EventStore } from '../../data-access/event.store';
import { AuthStore } from '../../../auth/data-access/auth.store';
import { provideRouter } from '@angular/router';

describe('EventListComponent', () => {
  let component: EventListContainerComponent;
  let fixture: ComponentFixture<EventListContainerComponent>;

  let mockEventStore: ReturnType<typeof createMockEventStore>;
  let mockAuthStore: ReturnType<typeof createMockAuthStore>;

  beforeEach(async () => {
    mockEventStore = createMockEventStore();
    mockAuthStore = createMockAuthStore();

    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: EventStore, useValue: mockEventStore },
        { provide: AuthStore, useValue: mockAuthStore },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EventListContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
