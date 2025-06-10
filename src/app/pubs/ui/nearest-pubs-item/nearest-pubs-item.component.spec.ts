import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NearestPubsItemComponent } from './nearest-pubs-item.component'; // Assuming 'NearestPubsItemComponent'
import { CommonModule } from '@angular/common';
import { signal, WritableSignal } from '@angular/core';
import { CheckinStore } from '../../../check-in/data-access/check-in.store';
import { AuthStore } from '../../../shared/data-access/auth.store';
import { LandlordStore } from '../../../landlord/data-access/landlord.store';
import type { PubDistance } from '../../utils/pub.models';
import { By } from '@angular/platform-browser';

// Mock Stores
class MockCheckinStore {
  userCheckins: WritableSignal<string[]> = signal<string[]>([]);
}

class MockAuthStore {
  uid: WritableSignal<string | null> = signal<string | null>(null);
}

class MockLandlordStore {
  todayLandlord: WritableSignal<Record<string, { userId: string }>> = signal<Record<string, { userId: string }>>({});
}


describe('NearestPubsItemComponent', () => { // Corrected component name
  let component: NearestPubsItemComponent;
  let fixture: ComponentFixture<NearestPubsItemComponent>;
  let mockCheckinStore: MockCheckinStore;
  let mockAuthStore: MockAuthStore;
  let mockLandlordStore: MockLandlordStore;

  const mockPub: PubDistance = {
    id: '1',
    name: 'The Test Inn',
    distance: 123.45, // meters
    address: '1 Test Rd', // Added to satisfy PubDistance
    location: { lat: 0, lng: 0} // Added to satisfy PubDistance
  };

  beforeEach(async () => {
    mockCheckinStore = new MockCheckinStore();
    mockAuthStore = new MockAuthStore();
    mockLandlordStore = new MockLandlordStore();

    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        NearestPubsItemComponent
      ],
      providers: [
        { provide: CheckinStore, useValue: mockCheckinStore },
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: LandlordStore, useValue: mockLandlordStore },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NearestPubsItemComponent);
    component = fixture.componentInstance;
    // fixture.detectChanges() will be called in tests, especially after setting inputs
  });

  it('should create', () => {
    component.pub.set(mockPub); // Basic input for creation
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('Input and Basic Display', () => {
    it('should display pub name and formatted distance when pub input is set', () => {
      component.pub.set(mockPub);
      fixture.detectChanges();

      const nameElement = fixture.debugElement.query(By.css('h2'));
      expect(nameElement).not.toBeNull();
      expect(nameElement.nativeElement.textContent).toContain(mockPub.name);

      const distanceElement = fixture.debugElement.query(By.css('p')); // Assuming distance is in a <p>
      expect(distanceElement).not.toBeNull();
      // The component template uses {{ pub()!.distance.toFixed(0) }}m
      expect(distanceElement.nativeElement.textContent).toContain(`${mockPub.distance.toFixed(0)}m`);
    });

    it('should display nothing or default if pub input is not set (or null)', () => {
      // component.pub.set(null); // This is the default for a signal input if not required
      fixture.detectChanges();

      // Depending on template structure, it might have empty elements or ngIf might hide them
      const nameElement = fixture.debugElement.query(By.css('h2'));
      // If the h2 is wrapped in *ngIf="pub()"
      expect(nameElement).toBeNull(); // Or expect(nameElement.nativeElement.textContent).toBe('') if element exists but empty

      const distanceElement = fixture.debugElement.query(By.css('p'));
      expect(distanceElement).toBeNull(); // Or similar check for empty content
    });
  });

  describe('Landlord Status', () => {
    const landlordUserId = 'landlord123';
    const otherUserId = 'otherUser456';

    beforeEach(() => {
      // Set the pub input for all tests in this block
      component.pub.set(mockPub);
    });

    it('should return true for isLandlord and show badge if user is the landlord for the pub', () => {
      mockAuthStore.uid.set(landlordUserId);
      mockLandlordStore.todayLandlord.set({ [mockPub.id]: { userId: landlordUserId } });
      fixture.detectChanges();

      expect(component.isLandlord(mockPub.id)).toBe(true);
      const badgeElement = fixture.debugElement.query(By.css('.badge.badge-info')); // Assuming specific classes
      expect(badgeElement).not.toBeNull();
      expect(badgeElement.nativeElement.textContent).toContain("👑 You're the Landlord");
    });

    it('should return false for isLandlord and not show badge if another user is the landlord', () => {
      mockAuthStore.uid.set(otherUserId); // Current user is someone else
      mockLandlordStore.todayLandlord.set({ [mockPub.id]: { userId: landlordUserId } }); // Pub landlord is landlordUserId
      fixture.detectChanges();

      expect(component.isLandlord(mockPub.id)).toBe(false);
      const badgeElement = fixture.debugElement.query(By.css('.badge.badge-info'));
      expect(badgeElement).toBeNull();
    });

    it('should return false for isLandlord and not show badge if no landlord is listed for the pub', () => {
      mockAuthStore.uid.set(landlordUserId);
      mockLandlordStore.todayLandlord.set({}); // No landlord entry for this pub
      fixture.detectChanges();

      expect(component.isLandlord(mockPub.id)).toBe(false);
      const badgeElement = fixture.debugElement.query(By.css('.badge.badge-info'));
      expect(badgeElement).toBeNull();
    });

    it('should return false for isLandlord and not show badge if user is not logged in (uid is null)', () => {
      mockAuthStore.uid.set(null);
      mockLandlordStore.todayLandlord.set({ [mockPub.id]: { userId: landlordUserId } });
      fixture.detectChanges();

      expect(component.isLandlord(mockPub.id)).toBe(false);
      const badgeElement = fixture.debugElement.query(By.css('.badge.badge-info'));
      expect(badgeElement).toBeNull();
    });
  });

  describe('Check-in Status', () => {
    beforeEach(() => {
      // Set the pub input for all tests in this block
      component.pub.set(mockPub);
    });

    it('should return true for hasCheckedIn and show checkmark if user has checked into the pub', () => {
      mockCheckinStore.userCheckins.set([mockPub.id, 'anotherPubId']);
      fixture.detectChanges();

      expect(component.hasCheckedIn(mockPub.id)).toBe(true);
      // Assuming checkmark is a span with text content. Adjust selector if it's an icon/image.
      const checkmarkElement = fixture.debugElement.query(By.css('span.text-green-500')); // Or query by text
      expect(checkmarkElement).not.toBeNull();
      expect(checkmarkElement.nativeElement.textContent).toContain('✔️');
    });

    it('should return false for hasCheckedIn and not show checkmark if user has not checked into the pub', () => {
      mockCheckinStore.userCheckins.set(['anotherPubId', 'yetAnotherPubId']);
      fixture.detectChanges();

      expect(component.hasCheckedIn(mockPub.id)).toBe(false);
      const checkmarkElement = fixture.debugElement.query(By.css('span.text-green-500'));
      expect(checkmarkElement).toBeNull();
    });

    it('should return false for hasCheckedIn and not show checkmark if userCheckins is empty', () => {
      mockCheckinStore.userCheckins.set([]);
      fixture.detectChanges();

      expect(component.hasCheckedIn(mockPub.id)).toBe(false);
      const checkmarkElement = fixture.debugElement.query(By.css('span.text-green-500'));
      expect(checkmarkElement).toBeNull();
    });
  });
});
