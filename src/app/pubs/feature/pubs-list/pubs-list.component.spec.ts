import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PubsListComponent } from './pubs-list.component';
import { CommonModule } from '@angular/common';
import { signal, WritableSignal } from '@angular/core';
import { PubStore } from '../../data-access/pub.store';
import { PubCardComponent } from '../../ui/pub-card/pub-card.component';
import type { Pub } from '../../utils/pub.models';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

// Mock PubStore
class MockPubStore {
  loading: WritableSignal<boolean> = signal(false);
  sortedPubsByDistance: WritableSignal<Pub[]> = signal([]);
  getDistanceForPub = jest.fn();
  hasCheckedIn = jest.fn();
  loadOnce = jest.fn().mockResolvedValue(undefined); // Ensure it returns a Promise
}

describe('PubsListComponent', () => {
  let component: PubsListComponent;
  let fixture: ComponentFixture<PubsListComponent>;
  let mockPubStore: MockPubStore;

  const mockPubs: Pub[] = [
    { id: '1', name: 'The First Pub', address: '1 First St', location: { lat: 1, lng: 1 }, checkinHistory: [] },
    { id: '2', name: 'The Second Pub', address: '2 Second St', location: { lat: 2, lng: 2 }, checkinHistory: [] },
  ];

  beforeEach(async () => {
    mockPubStore = new MockPubStore();

    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        PubsListComponent, // Component being tested (imports PubCardComponent itself)
        // PubCardComponent, // Not needed here if PubsListComponent imports it
      ],
      providers: [
        { provide: PubStore, useValue: mockPubStore }
      ]
      // If PubCardComponent is standalone and NOT imported by PubsListComponent,
      // it would need to be in imports array.
      // If PubCardComponent has its own complex dependencies, NO_ERRORS_SCHEMA might be an alternative
      // or a more specific mock for PubCardComponent.
      // Given PubsListComponent imports PubCardComponent, TestBed should handle it.
    }).compileComponents();

    fixture = TestBed.createComponent(PubsListComponent);
    component = fixture.componentInstance;
    // fixture.detectChanges() will be called in tests
  });

  it('should create', () => {
    fixture.detectChanges(); // Initial detection
    expect(component).toBeTruthy();
  });

  describe('Component Initialization (ngOnInit)', () => {
    it('should call pubStore.loadOnce on initialization', () => {
      const loadOnceSpy = jest.spyOn(mockPubStore, 'loadOnce');
      fixture.detectChanges(); // Triggers ngOnInit
      expect(loadOnceSpy).toHaveBeenCalled();
    });
  });

  describe('Template Rendering', () => {
    describe('Loading State', () => {
      it('should display loading message and no pub list when loading is true', () => {
        mockPubStore.loading.set(true);
        fixture.detectChanges();

        const loadingElement = fixture.debugElement.query(By.css('p'));
        expect(loadingElement).not.toBeNull();
        expect(loadingElement.nativeElement.textContent).toContain('Loading pubs...');

        const ulElement = fixture.debugElement.query(By.css('ul'));
        expect(ulElement).toBeNull();
      });
    });

    describe('Data Display', () => {
      beforeEach(() => {
        // Setup for data display tests
        mockPubStore.loading.set(false);
        mockPubStore.sortedPubsByDistance.set(mockPubs);
        mockPubStore.getDistanceForPub.mockReturnValue(1.23); // Default mock value
        mockPubStore.hasCheckedIn.mockReturnValue(true);    // Default mock value
        fixture.detectChanges();
      });

      it('should not display loading message and show pub list when loading is false and pubs are available', () => {
        const loadingElement = fixture.debugElement.query(By.css('p.text-center.text-gray-500'));
        // This specific p element for loading should not exist or not contain 'Loading pubs...'
        // Depending on how the template is structured, it might be removed or hidden.
        // If it's removed, query will be null. If hidden, it would exist.
        // The template uses *ngIf="loading()"
        expect(loadingElement).toBeNull();

        const ulElement = fixture.debugElement.query(By.css('ul'));
        expect(ulElement).not.toBeNull();
      });

      it('should render app-pub-card elements for each pub', () => {
        const pubCardDebugElements = fixture.debugElement.queryAll(By.directive(PubCardComponent));
        expect(pubCardDebugElements.length).toBe(mockPubs.length);
      });

      it('should pass correct inputs to app-pub-card and call store methods', () => {
        // Test the first pub card
        const firstPub = mockPubs[0];
        const expectedDistance = 3.45;
        const expectedHasCheckedIn = false;

        // Override default mocks for specific calls if needed for this pub
        mockPubStore.getDistanceForPub.mockImplementation((pub: Pub) => pub.id === firstPub.id ? expectedDistance : 1.23);
        mockPubStore.hasCheckedIn.mockImplementation((pubId: string) => pubId === firstPub.id ? expectedHasCheckedIn : true);

        // Re-render with specific mocks for the first pub if necessary, or ensure trackBy allows this.
        // The component re-evaluates these in the template loop.
        // The current setup with jest.fn() should work per call in the template.
        fixture.detectChanges(); // Re-run change detection to apply new mock logic if it changed.


        const firstPubCardDebugElement = fixture.debugElement.query(By.directive(PubCardComponent));
        const firstPubCardInstance = firstPubCardDebugElement.componentInstance as PubCardComponent;

        expect(firstPubCardInstance.pub).toEqual(firstPub);
        expect(firstPubCardInstance.distanceInKm).toBe(expectedDistance);
        expect(firstPubCardInstance.hasCheckedIn).toBe(expectedHasCheckedIn);

        // Verify store methods were called for this pub
        // Note: In a loop, these might be called for all pubs.
        // We are checking if it was called correctly for the first pub.
        expect(mockPubStore.getDistanceForPub).toHaveBeenCalledWith(firstPub);
        expect(mockPubStore.hasCheckedIn).toHaveBeenCalledWith(firstPub.id);

        // Check for the second pub to ensure mocks are specific if needed
        if (mockPubs.length > 1) {
          const secondPub = mockPubs[1];
          // Default mocks should apply here
          mockPubStore.getDistanceForPub.mockImplementation((pub: Pub) => pub.id === secondPub.id ? 1.23 : expectedDistance);
          mockPubStore.hasCheckedIn.mockImplementation((pubId: string) => pubId === secondPub.id ? true : expectedHasCheckedIn);
          fixture.detectChanges();

          const pubCardDebugElements = fixture.debugElement.queryAll(By.directive(PubCardComponent));
          const secondPubCardInstance = pubCardDebugElements[1].componentInstance as PubCardComponent;

          expect(secondPubCardInstance.pub).toEqual(secondPub);
          expect(secondPubCardInstance.distanceInKm).toBe(1.23);
          expect(secondPubCardInstance.hasCheckedIn).toBe(true);
          expect(mockPubStore.getDistanceForPub).toHaveBeenCalledWith(secondPub);
          expect(mockPubStore.hasCheckedIn).toHaveBeenCalledWith(secondPub.id);
        }
      });

      it('should display "No pubs found" message when loading is false and no pubs are available', () => {
        mockPubStore.sortedPubsByDistance.set([]); // No pubs
        fixture.detectChanges();

        const noPubsMessageElement = fixture.debugElement.query(By.css('p.text-center.text-gray-500'));
        expect(noPubsMessageElement).not.toBeNull();
        expect(noPubsMessageElement.nativeElement.textContent).toContain('No pubs found. Try adjusting your search.');

        const ulElement = fixture.debugElement.query(By.css('ul'));
        expect(ulElement).toBeNull(); // Or it might exist but be empty
      });
    });
  });
});
