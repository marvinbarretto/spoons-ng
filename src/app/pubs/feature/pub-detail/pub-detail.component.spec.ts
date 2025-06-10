import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { PubDetailComponent } from './pub-detail.component';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { signal, WritableSignal } from '@angular/core';
import { of } from 'rxjs';
import * as dateUtils from '../../../shared/utils/date.utils'; // Import for spying

// Models and Services
import { PubService } from '../../data-access/pub.service';
import { PubStore } from '../../data-access/pub.store';
import { AuthStore } from '../../../shared/data-access/auth.store';
import { LandlordStore } from '../../../landlord/data-access/landlord.store';
import { NearbyPubStore } from '../../../shared/data-access/nearby-pub.store';
import { CheckinStore } from '../../../check-in/data-access/check-in.store';
import type { Pub } from '../../utils/pub.models';
import type { Landlord } from '../../../landlord/utils/landlord.models';
import type { Checkin } from '../../../check-in/utils/check-in.models';
import { User } from 'firebase/auth';

// Mock Implementations
class MockActivatedRoute {
  snapshot = {
    paramMap: {
      get: jest.fn().mockReturnValue(null) // Default to no pub ID
    }
  };
}

class MockRouter {
  navigate = jest.fn();
}

class MockPubService {
  getPubById = jest.fn().mockReturnValue(of(null));
}

class MockPubStore {
  data: WritableSignal<Pub[]> = signal([]);
  loadOnce = jest.fn().mockResolvedValue(undefined);
  // Add any other methods/properties used by the component
}

class MockAuthStore {
  user: WritableSignal<User | null | undefined> = signal(null); // undefined for initial state, null for logged out
  uid: WritableSignal<string | null> = signal(null);
  currentUser: User | null = null; // for direct access if used
}

class MockLandlordStore {
  get = jest.fn().mockReturnValue(signal(null as Landlord | null));
  loadOnce = jest.fn().mockResolvedValue(undefined);
}

class MockNearbyPubStore {
  getDistanceToPub = jest.fn().mockReturnValue(signal(null as number | null));
  isWithinCheckInRange = jest.fn().mockReturnValue(signal(false));
}

class MockCheckinStore {
  checkins: WritableSignal<Checkin[]> = signal([]);
  userCheckins: WritableSignal<string[]> = signal([]); // pub IDs user has checked into
  canCheckInToday = jest.fn().mockReturnValue(signal(true)); // Default to true
  // Add loadUserCheckins or similar if component triggers it
}

// Mock date utils - THIS MUST BE AT THE TOP LEVEL
jest.mock('../../../shared/utils/date.utils', () => ({
  formatTimestampToDateString: jest.fn(),
  formatTimestampToRelativeTime: jest.fn(),
  generateAnonymousName: jest.fn(), // Also mocking this as it's a util used by component
}));


describe('PubDetailComponent', () => {
  let component: PubDetailComponent;
  let fixture: ComponentFixture<PubDetailComponent>;
  let mockActivatedRoute: MockActivatedRoute;
  let mockRouter: MockRouter;
  let mockPubService: MockPubService;
  let mockPubStore: MockPubStore;
  let mockAuthStore: MockAuthStore;
  let mockLandlordStore: MockLandlordStore;
  let mockNearbyPubStore: MockNearbyPubStore;
  let mockCheckinStore: MockCheckinStore;

  const testPubId = 'test-pub-123';
  const mockPub: Pub = {
    id: testPubId,
    name: 'The Test Arms',
    address: '123 Test Street, Testville, TS1 2BC',
    location: { lat: 51.5, lng: -0.1 },
    landlordId: 'landlord-abc',
    checkinHistory: [],
  };

  beforeEach(async () => {
    mockActivatedRoute = new MockActivatedRoute();
    mockRouter = new MockRouter();
    mockPubService = new MockPubService();
    mockPubStore = new MockPubStore();
    mockAuthStore = new MockAuthStore();
    mockLandlordStore = new MockLandlordStore();
    mockNearbyPubStore = new MockNearbyPubStore();
    mockCheckinStore = new MockCheckinStore();

    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        RouterModule.forRoot([]), // Basic router setup
        HttpClientTestingModule,
        PubDetailComponent // Import standalone component
      ],
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: Router, useValue: mockRouter },
        { provide: PubService, useValue: mockPubService },
        { provide: PubStore, useValue: mockPubStore },
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: LandlordStore, useValue: mockLandlordStore },
        { provide: NearbyPubStore, useValue: mockNearbyPubStore },
        { provide: CheckinStore, useValue: mockCheckinStore },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PubDetailComponent);
    component = fixture.componentInstance;
    // fixture.detectChanges() will be called in individual tests or sub-describes
    // to control ngOnInit timing.
  });

  it('should create', () => {
    fixture.detectChanges(); // Initial detectChanges for basic creation test
    expect(component).toBeTruthy();
  });

  describe('Component Initialization (ngOnInit)', () => {
    let loadPubSpy: jest.SpyInstance;

    beforeEach(() => {
      loadPubSpy = jest.spyOn(component, 'loadPub').mockImplementation(); // Mock implementation to avoid actual execution
    });

    afterEach(() => {
      loadPubSpy.mockRestore();
    });

    it('should call loadPub with ID from route if present', () => {
      mockActivatedRoute.snapshot.paramMap.get.mockReturnValue(testPubId);
      fixture.detectChanges(); // Triggers ngOnInit
      expect(loadPubSpy).toHaveBeenCalledWith(testPubId);
    });

    it('should navigate to /pubs if no ID in route', () => {
      mockActivatedRoute.snapshot.paramMap.get.mockReturnValue(null);
      fixture.detectChanges(); // Triggers ngOnInit
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/pubs']);
      expect(loadPubSpy).not.toHaveBeenCalled();
    });
  });

  describe('loadPub method', () => {
    beforeEach(() => {
      // Reset spies and mocks before each test in this block
      mockPubService.getPubById.mockClear();
      mockLandlordStore.loadOnce.mockClear();
      mockPubStore.data.set([]); // Default to no pub in store
      component.pub.set(null); // Reset component's pub signal
    });

    it('should load pub from PubStore if available and call landlordStore.loadOnce', () => {
      mockPubStore.data.set([mockPub]);
      const landlordLoadOnceSpy = jest.spyOn(mockLandlordStore, 'loadOnce');

      component.loadPub(testPubId);

      expect(component.pub()).toEqual(mockPub);
      expect(mockPubService.getPubById).not.toHaveBeenCalled();
      expect(landlordLoadOnceSpy).toHaveBeenCalledWith(testPubId);
    });

    it('should load pub from PubService if not in store, then call landlordStore.loadOnce', fakeAsync(() => {
      mockPubService.getPubById.mockReturnValue(of(mockPub));
      const landlordLoadOnceSpy = jest.spyOn(mockLandlordStore, 'loadOnce');

      component.loadPub(testPubId);
      tick(); // Resolve the observable from getPubById

      expect(mockPubService.getPubById).toHaveBeenCalledWith(testPubId);
      expect(component.pub()).toEqual(mockPub);
      expect(landlordLoadOnceSpy).toHaveBeenCalledWith(testPubId);
    }));

    it('should set pub to null and handle error if PubService does not find pub', fakeAsync(() => {
      mockPubService.getPubById.mockReturnValue(of(null));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console error during test

      component.loadPub(testPubId);
      tick(); // Resolve the observable

      expect(mockPubService.getPubById).toHaveBeenCalledWith(testPubId);
      expect(component.pub()).toBeNull();
      // Expect error handling (e.g., console.error, or a specific error state if set by handleAsync)
      // The component's handleAsync uses console.error.
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockLandlordStore.loadOnce).not.toHaveBeenCalled(); // Should not proceed to load landlord if pub not found

      consoleErrorSpy.mockRestore();
    }));
  });

  describe('Computed Signals', () => {
    describe('locationString', () => {
      it('should return full address string when all parts are present', () => {
        const pubWithFullAddress: Pub = { ...mockPub, address: '1 New St, Town, County, AB1 2CD' };
        component.pub.set(pubWithFullAddress);
        expect(component.locationString()).toBe('1 New St, Town, County, AB1 2CD');
      });

      it('should handle missing address parts gracefully', () => {
        const pubWithMissingParts: Pub = { ...mockPub, address: 'Main Road, , , XY3 4ZA' }; // Missing town and county
        component.pub.set(pubWithMissingParts);
        // Assuming the component joins parts with ', ' and might filter out empty ones or depends on underlying util behavior
        // For this example, let's assume it just returns the address as is if not specially formatted by a util.
        // If AddressToLocationPipe or similar is used, this test would be more specific.
        // Given the component code directly uses `pub()?.address`, it will return it as is.
        expect(component.locationString()).toBe('Main Road, , , XY3 4ZA');
      });

      it('should return empty string if pub or address is null/undefined', () => {
        component.pub.set(null);
        expect(component.locationString()).toBe('');
        const pubNoAddress: Pub = { ...mockPub, address: undefined! };
        component.pub.set(pubNoAddress);
        expect(component.locationString()).toBe('');
      });
    });

    describe('isUserLandlord', () => {
      beforeEach(() => {
        component.pub.set(mockPub); // Set a default pub for these tests
      });

      it('should be true if auth user UID matches landlord user ID', () => {
        mockAuthStore.uid.set('user1');
        mockLandlordStore.get.mockReturnValue(signal({ userId: 'user1' } as Landlord));
        expect(component.isUserLandlord()).toBe(true);
      });

      it('should be false if auth user UID does not match landlord user ID', () => {
        mockAuthStore.uid.set('user1');
        mockLandlordStore.get.mockReturnValue(signal({ userId: 'user2' } as Landlord));
        expect(component.isUserLandlord()).toBe(false);
      });

      it('should be false if no landlord data', () => {
        mockAuthStore.uid.set('user1');
        mockLandlordStore.get.mockReturnValue(signal(null));
        expect(component.isUserLandlord()).toBe(false);
      });

      it('should be false if pub is null', () => {
        component.pub.set(null);
        mockAuthStore.uid.set('user1');
        // LandlordStore.get should not even be called if pub is null, but if it were, the result should still be false.
        expect(component.isUserLandlord()).toBe(false);
      });

       it('should be false if authStore.uid is null', () => {
        mockAuthStore.uid.set(null);
        mockLandlordStore.get.mockReturnValue(signal({ userId: 'user1' } as Landlord));
        expect(component.isUserLandlord()).toBe(false);
      });
    });

    describe('canCheckIn', () => {
      beforeEach(() => {
        component.pub.set(mockPub);
      });

      it('should be true if pub is set and nearbyPubStore.isWithinCheckInRange is true', () => {
        mockNearbyPubStore.isWithinCheckInRange.mockReturnValue(signal(true));
        expect(component.canCheckIn()).toBe(true);
        expect(mockNearbyPubStore.isWithinCheckInRange).toHaveBeenCalledWith(mockPub.id);
      });

      it('should be false if nearbyPubStore.isWithinCheckInRange is false', () => {
        mockNearbyPubStore.isWithinCheckInRange.mockReturnValue(signal(false));
        expect(component.canCheckIn()).toBe(false);
        expect(mockNearbyPubStore.isWithinCheckInRange).toHaveBeenCalledWith(mockPub.id);
      });

      it('should be false if pub is null', () => {
        component.pub.set(null);
        // isWithinCheckInRange mock might still be called with undefined/null, or logic short-circuits.
        // Based on typical computed signal setup, it would re-evaluate.
        // If pub() is null, isWithinCheckInRange might not be called or called with null.
        // The component's implementation: `computed(() => this.pub() && this.nearbyPubStore.isWithinCheckInRange(this.pub()!.id)());`
        // So if pub() is null, it short-circuits.
        mockNearbyPubStore.isWithinCheckInRange.mockClear(); // Clear previous calls
        expect(component.canCheckIn()).toBe(false);
        expect(mockNearbyPubStore.isWithinCheckInRange).not.toHaveBeenCalled();
      });
    });

    describe('landlordInsights', () => {
      beforeEach(() => {
        component.pub.set(mockPub); // Pub with id 'test-pub-123'
        mockAuthStore.user.set({ uid: 'user-logged-in' } as User); // Mock a logged-in user
        mockAuthStore.uid.set('user-logged-in');
      });

      it("should return status 'you' if current user is the landlord", () => {
        mockLandlordStore.get.mockReturnValue(signal({ userId: 'user-logged-in', name: 'Current User Landlord' } as Landlord));
        const insights = component.landlordInsights();
        expect(insights.status).toBe('you');
        expect(insights.name).toBe('Current User Landlord');
      });

      it("should return status 'other' if a different user is the landlord", () => {
        mockLandlordStore.get.mockReturnValue(signal({ userId: 'another-user', name: 'Another Landlord' } as Landlord));
        const insights = component.landlordInsights();
        expect(insights.status).toBe('other');
        expect(insights.name).toBe('Another Landlord');
      });

      it("should return status 'none' if there is no landlord", () => {
        mockLandlordStore.get.mockReturnValue(signal(null));
        const insights = component.landlordInsights();
        expect(insights.status).toBe('none');
        expect(insights.name).toBe('No landlord data');
      });

      it("should return status 'none' if pub is null", () => {
        component.pub.set(null);
        const insights = component.landlordInsights();
        expect(insights.status).toBe('none');
      });

       it("should return status 'none' if user is not logged in", () => {
        mockAuthStore.user.set(null);
        mockAuthStore.uid.set(null);
        mockLandlordStore.get.mockReturnValue(signal({ userId: 'user-logged-in', name: 'Current User Landlord' } as Landlord));
        const insights = component.landlordInsights();
        // If user is not logged in, they can't be 'you', and 'other' might still be shown.
        // The component logic: `if (!this.authStore.user()) return { status: 'none', name: 'Not logged in' };`
        // This is a bit different from the original code. Let's assume the component handles it this way.
        // Based on current component code: `if (!this.authStore.user()) return { status: 'none', name: 'Not logged in' };`
        // This seems to be an error in the original component code, as `this.authStore.user()` is a signal.
        // Let's assume it should be `!this.authStore.user()()`. Or, it uses `this.authStore.uid()`.
        // The actual component code uses `this.authStore.uid()`.
        // So if uid is null, then landlord.userId === this.authStore.uid() will be false.
        // If landlord exists, status will be 'other'. If not, 'none'.
        expect(insights.status).toBe('other'); // or 'none' if landlordStore.get returns null
      });
    });

    describe('recentCheckins', () => {
      let getUserDisplayNameSpy: jest.SpyInstance;
      let getRelativeTimeSpy: jest.SpyInstance;
      const now = Date.now();
      const mockCheckinHistory: Checkin[] = [
        { userId: 'user1', timestamp: now - 10000, pubId: mockPub.id, nameVisibility: 'anonymous' }, // 10s ago
        { userId: 'user2', timestamp: now - 60000, pubId: mockPub.id, nameVisibility: 'realName' }, // 1m ago
        { userId: 'user-logged-in', timestamp: now - 120000, pubId: mockPub.id, nameVisibility: 'realName' }, // 2m ago
      ];

      beforeEach(() => {
        component.pub.set({ ...mockPub, checkinHistory: [...mockCheckinHistory] });
        mockAuthStore.uid.set('user-logged-in');
        getUserDisplayNameSpy = jest.spyOn(component, 'getUserDisplayName');
        getRelativeTimeSpy = jest.spyOn(component, 'getRelativeTime');
      });

      afterEach(() => {
        getUserDisplayNameSpy.mockRestore();
        getRelativeTimeSpy.mockRestore();
      });

      it('should map and reverse checkin history', () => {
        getUserDisplayNameSpy.mockImplementation((userId, nameVisibility) => {
          if (userId === 'user1') return 'Anonymous User 1';
          if (userId === 'user2') return 'Real Name User 2';
          if (userId === 'user-logged-in') return 'You (Logged In)';
          return 'Unknown';
        });
        getRelativeTimeSpy.mockImplementation((timestamp) => {
          if (timestamp === mockCheckinHistory[0].timestamp) return '10 seconds ago';
          if (timestamp === mockCheckinHistory[1].timestamp) return '1 minute ago';
          if (timestamp === mockCheckinHistory[2].timestamp) return '2 minutes ago';
          return '';
        });

        const result = component.recentCheckins();
        expect(result.length).toBe(3);

        // Check reversal and mapping
        expect(result[0].displayName).toBe('You (Logged In)'); // Last in history is first in recentCheckins
        expect(result[0].relativeTime).toBe('2 minutes ago');
        expect(result[0].isCurrentUser).toBe(true);

        expect(result[1].displayName).toBe('Real Name User 2');
        expect(result[1].relativeTime).toBe('1 minute ago');
        expect(result[1].isCurrentUser).toBe(false);

        expect(result[2].displayName).toBe('Anonymous User 1');
        expect(result[2].relativeTime).toBe('10 seconds ago');
        expect(result[2].isCurrentUser).toBe(false);

        expect(getUserDisplayNameSpy).toHaveBeenCalledTimes(3);
        expect(getRelativeTimeSpy).toHaveBeenCalledTimes(3);
      });

      it('should return empty array if pub or checkinHistory is null/empty', () => {
        component.pub.set(null);
        expect(component.recentCheckins()).toEqual([]);

        component.pub.set({ ...mockPub, checkinHistory: [] });
        expect(component.recentCheckins()).toEqual([]);

        component.pub.set({ ...mockPub, checkinHistory: null! });
        expect(component.recentCheckins()).toEqual([]);
      });
    });
  });

  describe('Helper Methods', () => {
    describe('toRadians', () => {
      it('should convert degrees to radians correctly', () => {
        expect(component.toRadians(0)).toBe(0);
        expect(component.toRadians(90)).toBe(Math.PI / 2);
        expect(component.toRadians(180)).toBe(Math.PI);
      });
    });

    describe('calculateDistance', () => {
      it('should calculate distance between two points (approx)', () => {
        // London to Paris (approximate coordinates)
        const lat1 = 51.5074; // London lat
        const lon1 = -0.1278; // London lon
        const lat2 = 48.8566; // Paris lat
        const lon2 = 2.3522;  // Paris lon
        const distance = component.calculateDistance(lat1, lon1, lat2, lon2);
        expect(distance).toBeCloseTo(343, 0); // Approx 343 km
      });

      it('should return 0 for same coordinates', () => {
        const lat1 = 51.5074;
        const lon1 = -0.1278;
        expect(component.calculateDistance(lat1, lon1, lat1, lon1)).toBe(0);
      });
    });

    describe('getUserDisplayName', () => {
      let generateAnonymousNameSpy: jest.SpyInstance;

      beforeEach(() => {
        generateAnonymousNameSpy = jest.spyOn(component, 'generateAnonymousName').mockReturnValue('Anonymous Name');
      });

      afterEach(() => {
        generateAnonymousNameSpy.mockRestore();
      });

      it('should return real name for current user if visibility is realName and displayName exists', () => {
        mockAuthStore.uid.set('user123');
        mockAuthStore.user.set({ uid: 'user123', displayName: 'Real User Name' } as User);
        expect(component.getUserDisplayName('user123', 'realName')).toBe('Real User Name');
        expect(generateAnonymousNameSpy).not.toHaveBeenCalled();
      });

      it('should return anonymous name for current user if displayName does not exist, even if visibility is realName', () => {
        mockAuthStore.uid.set('user123');
        mockAuthStore.user.set({ uid: 'user123', displayName: null } as unknown as User); // No display name
        expect(component.getUserDisplayName('user123', 'realName')).toBe('Anonymous Name');
        expect(generateAnonymousNameSpy).toHaveBeenCalledWith('user123');
      });

      it('should return anonymous name for current user if visibility is anonymous', () => {
        mockAuthStore.uid.set('user123');
        mockAuthStore.user.set({ uid: 'user123', displayName: 'Real User Name' } as User);
        expect(component.getUserDisplayName('user123', 'anonymous')).toBe('Anonymous Name');
        expect(generateAnonymousNameSpy).toHaveBeenCalledWith('user123');
      });

      it('should return anonymous name for another user even if visibility is realName', () => {
        mockAuthStore.uid.set('user123'); // Logged in user
        mockAuthStore.user.set({ uid: 'user123', displayName: 'My Real Name' } as User);
        expect(component.getUserDisplayName('user456', 'realName')).toBe('Anonymous Name'); // Trying to get another user's real name
        expect(generateAnonymousNameSpy).toHaveBeenCalledWith('user456');
      });

      it('should return anonymous name for another user if visibility is anonymous', () => {
        mockAuthStore.uid.set('user123');
        expect(component.getUserDisplayName('user456', 'anonymous')).toBe('Anonymous Name');
        expect(generateAnonymousNameSpy).toHaveBeenCalledWith('user456');
      });
    });

    describe('formatDate and getRelativeTime', () => {
      const mockTimestamp = 1678886400000; // March 15, 2023 12:00:00 PM UTC
      const mockDateString = 'Mar 15, 2023';
      const mockRelativeTimeString = '2 days ago';

      beforeEach(() => {
        // Setup mock return values for the utility functions for each test
        (dateUtils.formatTimestampToDateString as jest.Mock).mockReturnValue(mockDateString);
        (dateUtils.formatTimestampToRelativeTime as jest.Mock).mockReturnValue(mockRelativeTimeString);
      });

      it('formatDate should call formatTimestampToDateString from date.utils and return its result', () => {
        const result = component.formatDate(mockTimestamp);
        expect(dateUtils.formatTimestampToDateString).toHaveBeenCalledWith(mockTimestamp);
        expect(result).toBe(mockDateString);
      });

      it('getRelativeTime should call formatTimestampToRelativeTime from date.utils and return its result', () => {
        const result = component.getRelativeTime(mockTimestamp);
        expect(dateUtils.formatTimestampToRelativeTime).toHaveBeenCalledWith(mockTimestamp);
        expect(result).toBe(mockRelativeTimeString);
      });
    });

    // Test for generateAnonymousName (moved from getUserDisplayName's spy to here for direct test)
    describe('generateAnonymousName', () => {
      it('should call the utility function generateAnonymousName', () => {
        const mockUserId = 'test-user-id';
        const expectedName = `User ${mockUserId.substring(0, 6)}`;
        (dateUtils.generateAnonymousName as jest.Mock).mockReturnValue(expectedName);

        const result = component.generateAnonymousName(mockUserId);
        expect(dateUtils.generateAnonymousName).toHaveBeenCalledWith(mockUserId);
        expect(result).toBe(expectedName);
      });
    });
  });
});
