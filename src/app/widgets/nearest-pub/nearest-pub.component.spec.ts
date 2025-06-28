import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NearestPubComponent } from './nearest-pub.component';
import { NearbyPubStore } from '../../pubs/data-access/nearby-pub.store';
import { DataAggregatorService } from '../../shared/data-access/data-aggregator.service';
import { LocationService } from '../../shared/data-access/location.service';
import { Router } from '@angular/router';
import { signal } from '@angular/core';

describe('NearestPubComponent', () => {
  let component: NearestPubComponent;
  let fixture: ComponentFixture<NearestPubComponent>;
  let mockNearbyPubStore: any;
  let mockDataAggregatorService: any;
  let mockLocationService: any;
  let mockRouter: any;

  beforeEach(async () => {
    // Mock stores and services
    mockNearbyPubStore = {
      nearbyPubs: signal([]),
      hasNearbyPubs: signal(false),
      location: signal(null)
    };

    mockDataAggregatorService = {
      hasVisitedPub: jest.fn().mockReturnValue(false),
      getVisitCountForPub: jest.fn().mockReturnValue(0)
    };

    mockLocationService = {
      loading: signal(false),
      error: signal(null)
    };

    mockRouter = {
      navigate: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [NearestPubComponent],
      providers: [
        { provide: NearbyPubStore, useValue: mockNearbyPubStore },
        { provide: DataAggregatorService, useValue: mockDataAggregatorService },
        { provide: LocationService, useValue: mockLocationService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NearestPubComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show loading state', () => {
    component.loading.set(true);
    fixture.detectChanges();
    
    const element = fixture.nativeElement;
    expect(element.querySelector('.widget-loading')).toBeTruthy();
    expect(element.textContent).toContain('Finding nearby pubs...');
  });

  it('should show error state', () => {
    component.error.set('Location access denied');
    fixture.detectChanges();
    
    const element = fixture.nativeElement;
    expect(element.querySelector('.widget-error')).toBeTruthy();
    expect(element.textContent).toContain('Location access denied');
  });

  it('should show empty state when no nearby pubs', () => {
    mockNearbyPubStore.hasNearbyPubs.set(false);
    fixture.detectChanges();
    
    const element = fixture.nativeElement;
    expect(element.querySelector('.widget-empty')).toBeTruthy();
    expect(element.textContent).toContain('No pubs within 50km');
  });

  it('should display nearby pubs with visit status', () => {
    const mockPubs = [
      {
        id: '1',
        name: 'The Red Lion',
        address: '123 Main St',
        distance: 150,
        location: { lat: 51.5, lng: -0.1 }
      },
      {
        id: '2',
        name: 'The Blue Anchor',
        address: '456 High St',
        distance: 2500,
        location: { lat: 51.51, lng: -0.11 }
      }
    ];

    mockNearbyPubStore.nearbyPubs.set(mockPubs);
    mockNearbyPubStore.hasNearbyPubs.set(true);
    mockDataAggregatorService.hasVisitedPub.mockImplementation((id: string) => id === '1');
    mockDataAggregatorService.getVisitCountForPub.mockImplementation((id: string) => id === '1' ? 3 : 0);

    fixture.detectChanges();

    const element = fixture.nativeElement;
    const pubCards = element.querySelectorAll('.pub-card');
    
    expect(pubCards.length).toBe(2);
    expect(pubCards[0].textContent).toContain('The Red Lion');
    expect(pubCards[0].textContent).toContain('150m');
    expect(pubCards[0].textContent).toContain('Visited 3x');
    expect(pubCards[0].classList.contains('visited')).toBe(true);
    
    expect(pubCards[1].textContent).toContain('The Blue Anchor');
    expect(pubCards[1].textContent).toContain('2.5km');
    expect(pubCards[1].querySelector('.visited-badge')).toBeFalsy();
  });

  it('should format distances correctly', () => {
    expect(component['formatDistance'](50)).toBe('50m');
    expect(component['formatDistance'](999)).toBe('999m');
    expect(component['formatDistance'](1000)).toBe('1.0km');
    expect(component['formatDistance'](2500)).toBe('2.5km');
  });

  it('should navigate to pub detail', () => {
    const pubId = 'pub-123';
    component['navigateToPub'](pubId);

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/pubs', pubId]);
  });

  it('should show View button for all pubs', () => {
    const mockPubs = [{
      id: '1',
      name: 'Test Pub',
      address: '123 Main St',
      distance: 50,
      location: { lat: 51.5, lng: -0.1 }
    }];

    mockNearbyPubStore.nearbyPubs.set(mockPubs);
    mockNearbyPubStore.hasNearbyPubs.set(true);
    fixture.detectChanges();

    const element = fixture.nativeElement;
    expect(element.querySelector('.navigate-btn')).toBeTruthy();
    expect(element.querySelector('.navigate-btn').textContent).toContain('View');
  });

  it('should handle location errors on init', () => {
    mockLocationService.loading.set(false);
    mockLocationService.error.set('Geolocation not supported');
    mockNearbyPubStore.location.set(null);

    component.ngOnInit();

    expect(component.error()).toBe('Geolocation not supported');
  });
});