import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NearestPubsComponent } from './nearest-pubs.component';
import { CommonModule } from '@angular/common';
import { signal, WritableSignal } from '@angular/core';
import { CheckinStore } from '../../../check-in/data-access/check-in.store';
import type { PubDistance } from '../../utils/pub.models';
// NearestPubsItemComponent is imported by NearestPubsComponent, so it should be available.
// import { NearestPubsItemComponent } from '../nearest-pubs-item/nearest-pubs-item.component';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

// Mock CheckinStore
class MockCheckinStore {
  userCheckins: WritableSignal<string[]> = signal<string[]>([]);
}

describe('NearestPubsComponent', () => { // Corrected component name
  let component: NearestPubsComponent;
  let fixture: ComponentFixture<NearestPubsComponent>;
  let mockCheckinStore: MockCheckinStore;

  const mockPubsData: PubDistance[] = [
    { id: '1', name: 'Pub A', distance: 100, location: { lat: 1, lng: 1}, address: 'Addr A' },
    { id: '2', name: 'Pub B', distance: 200, location: { lat: 2, lng: 2}, address: 'Addr B' },
    { id: '3', name: 'Pub C', distance: 50,  location: { lat: 3, lng: 3}, address: 'Addr C' },
  ];

  beforeEach(async () => {
    mockCheckinStore = new MockCheckinStore();

    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        NearestPubsComponent, // This component imports NearestPubsItemComponent
      ],
      providers: [
        { provide: CheckinStore, useValue: mockCheckinStore }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NearestPubsComponent);
    component = fixture.componentInstance;
    // fixture.detectChanges() will be called in individual tests or describe blocks
  });

  it('should create', () => {
    fixture.detectChanges(); // Initial detection
    expect(component).toBeTruthy();
  });

  describe('filteredPubs Computed Signal', () => {
    beforeEach(() => {
      // Reset inputs before each test in this block
      component.pubs.set([]);
      component.filter.set('all');
      mockCheckinStore.userCheckins.set([]);
    });

    it("should return all pubs when filter is 'all'", () => {
      component.pubs.set(mockPubsData);
      mockCheckinStore.userCheckins.set(['1']); // User checked into Pub A
      // No need to set component.filter, defaults to 'all' or set explicitly for clarity
      component.filter.set('all');
      fixture.detectChanges(); // Not strictly needed for computed signal test itself, but good practice

      const filtered = component.filteredPubs();
      expect(filtered.length).toBe(mockPubsData.length);
      expect(filtered).toEqual(expect.arrayContaining(mockPubsData)); // Order might change due to sorting in component if any
    });

    it("should return only checked-in pubs when filter is 'checked-in'", () => {
      component.pubs.set(mockPubsData);
      component.filter.set('checked-in');
      mockCheckinStore.userCheckins.set(['1', '3']); // Checked into Pub A (id 1) and Pub C (id 3)
      fixture.detectChanges();

      const filtered = component.filteredPubs();
      expect(filtered.length).toBe(2);
      expect(filtered.map(p => p.id)).toEqual(expect.arrayContaining(['1', '3']));
    });

    it("should return only not-checked-in pubs when filter is 'not-checked-in'", () => {
      component.pubs.set(mockPubsData);
      component.filter.set('not-checked-in');
      mockCheckinStore.userCheckins.set(['1']); // Checked into Pub A
      fixture.detectChanges();

      const filtered = component.filteredPubs();
      expect(filtered.length).toBe(2); // Pub B and Pub C
      expect(filtered.map(p => p.id)).toEqual(expect.arrayContaining(['2', '3']));
    });

    it('should return empty array if pubs input is empty', () => {
      component.pubs.set([]);
      component.filter.set('all');
      mockCheckinStore.userCheckins.set(['1']);
      fixture.detectChanges();

      expect(component.filteredPubs().length).toBe(0);
    });

    it("should return empty array if filter is 'checked-in' and userCheckins is empty", () => {
      component.pubs.set(mockPubsData);
      component.filter.set('checked-in');
      mockCheckinStore.userCheckins.set([]);
      fixture.detectChanges();

      expect(component.filteredPubs().length).toBe(0);
    });

    it("should return all pubs if filter is 'not-checked-in' and userCheckins is empty", () => {
      component.pubs.set(mockPubsData);
      component.filter.set('not-checked-in');
      mockCheckinStore.userCheckins.set([]); // No check-ins means all are "not-checked-in"
      fixture.detectChanges();

      const filtered = component.filteredPubs();
      expect(filtered.length).toBe(mockPubsData.length);
      expect(filtered).toEqual(expect.arrayContaining(mockPubsData));
    });
  });

  describe('Template Rendering', () => {
    // Import NearestPubsItemComponent to query by directive and check its instance
    // This assumes NearestPubsItemComponent is simple enough or has its own tests.
    // If NearestPubsItemComponent is standalone, it's already imported by NearestPubsComponent.
    // No, NearestPubsItemComponent is imported by NearestPubsComponent in its template,
    // but for testing, we might need to import it here IF we want to query By.directive with the actual component class.
    // However, PubsListComponent imports PubCardComponent, and that worked.
    // NearestPubsComponent imports NearestPubsItemComponent in its `imports` array in the component decorator.
    // So, it should be available for querying.

    it('should render app-nearest-pubs-item for each pub in filteredPubs', () => {
      component.pubs.set(mockPubsData);
      component.filter.set('all'); // Ensure all pubs are in filteredPubs
      mockCheckinStore.userCheckins.set([]); // No checkins, so 'all' = all
      fixture.detectChanges();

      const itemDebugElements = fixture.debugElement.queryAll(By.css('app-nearest-pubs-item'));
      expect(itemDebugElements.length).toBe(mockPubsData.length);
    });

    it('should pass correct pub data to each app-nearest-pubs-item component', () => {
      // Use a subset of data to make it easier to verify, or use the full mockPubsData
      const testPubs = [mockPubsData[0], mockPubsData[1]];
      component.pubs.set(testPubs);
      component.filter.set('all');
      mockCheckinStore.userCheckins.set([]);
      fixture.detectChanges();

      const itemDebugElements = fixture.debugElement.queryAll(By.css('app-nearest-pubs-item'));

      expect(itemDebugElements.length).toBe(testPubs.length);

      for (let i = 0; i < testPubs.length; i++) {
        const itemInstance = itemDebugElements[i].componentInstance;
        // Make sure the 'pub' input property exists on NearestPubsItemComponent
        // and it's correctly assigned.
        // The actual component NearestPubsItemComponent needs to be available for this to work.
        // If NearestPubsItemComponent is not truly imported and compiled, itemDebugElements[i].componentInstance might be a generic object.
        // Given that NearestPubsComponent imports it in its 'imports' metadata, this should be fine.
        expect(itemInstance.pub).toEqual(testPubs[i]);
      }
    });

    it('should render no app-nearest-pubs-item if filteredPubs is empty', () => {
      component.pubs.set([]);
      fixture.detectChanges();

      const itemDebugElements = fixture.debugElement.queryAll(By.css('app-nearest-pubs-item'));
      expect(itemDebugElements.length).toBe(0);
    });
     it('should render "No pubs to display." when filteredPubs is empty', () => {
      component.pubs.set([]); // Ensure filteredPubs will be empty
      fixture.detectChanges();

      const noPubsMessageElement = fixture.debugElement.query(By.css('p'));
      expect(noPubsMessageElement).not.toBeNull();
      expect(noPubsMessageElement.nativeElement.textContent).toContain('No pubs to display.');

      const listElement = fixture.debugElement.query(By.css('ul'));
      expect(listElement).toBeNull(); // The list itself should not render
    });
  });
});
