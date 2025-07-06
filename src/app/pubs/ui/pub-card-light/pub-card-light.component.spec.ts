import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PubCardLightComponent } from './pub-card-light.component';
import { LocationService } from '../../../shared/data-access/location.service';
import type { Pub } from '../../utils/pub.models';

// Mock LocationService
class MockLocationService {
  isMoving = jest.fn().mockReturnValue(false);
}

// Mock pub data
const mockPub: Pub = {
  id: 'test-pub-1',
  name: 'The Test Pub',
  address: '123 Test Street',
  city: 'Test City',
  region: 'Test Region',
  postcode: 'TE5T 1NG',
  location: {
    lat: 51.5074,
    lng: -0.1278
  },
  carpetImageUrl: 'test-carpet.jpg',
  thumbnailImageUrl: 'test-thumb.jpg',
  websiteUrl: 'https://testpub.com'
};

describe('PubCardLightComponent', () => {
  let component: PubCardLightComponent;
  let fixture: ComponentFixture<PubCardLightComponent>;
  let mockLocationService: MockLocationService;

  beforeEach(async () => {
    mockLocationService = new MockLocationService();

    await TestBed.configureTestingModule({
      imports: [PubCardLightComponent],
      providers: [
        { provide: LocationService, useValue: mockLocationService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PubCardLightComponent);
    component = fixture.componentInstance;
    
    // Set required inputs
    fixture.componentRef.setInput('pub', mockPub);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display pub name', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const pubName = compiled.querySelector('.pub-name');
    expect(pubName?.textContent?.trim()).toBe('The Test Pub');
  });

  it('should display home icon when isLocalPub is true', () => {
    fixture.componentRef.setInput('isLocalPub', true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const homeIcon = compiled.querySelector('.pub-home-icon');
    expect(homeIcon?.textContent?.trim()).toBe('🏠');
  });

  it('should not display home icon when isLocalPub is false', () => {
    fixture.componentRef.setInput('isLocalPub', false);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const homeIcon = compiled.querySelector('.pub-home-icon');
    expect(homeIcon).toBeNull();
  });

  it('should display address when showAddress is true', () => {
    fixture.componentRef.setInput('showAddress', true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const address = compiled.querySelector('.pub-address');
    expect(address?.textContent?.trim()).toBe('123 Test Street');
  });

  it('should not display address when showAddress is false', () => {
    fixture.componentRef.setInput('showAddress', false);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const address = compiled.querySelector('.pub-address');
    expect(address).toBeNull();
  });

  it('should display location when showLocation is true', () => {
    fixture.componentRef.setInput('showLocation', true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const location = compiled.querySelector('.pub-location');
    expect(location?.textContent?.trim()).toContain('Test City, Test Region');
  });

  it('should display distance when showDistance is true and distance is provided', () => {
    fixture.componentRef.setInput('showDistance', true);
    fixture.componentRef.setInput('distance', 500);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const distance = compiled.querySelector('.pub-distance');
    expect(distance?.textContent?.trim()).toContain('500m away');
  });

  it('should format distance in kilometers when > 1000m', () => {
    fixture.componentRef.setInput('showDistance', true);
    fixture.componentRef.setInput('distance', 1500);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const distance = compiled.querySelector('.pub-distance');
    expect(distance?.textContent?.trim()).toContain('1.5km away');
  });

  it('should apply compact variant class', () => {
    fixture.componentRef.setInput('variant', 'compact');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const card = compiled.querySelector('.pub-card-light');
    expect(card?.classList.contains('pub-card-light--compact')).toBe(true);
  });

  it('should apply overlay variant class', () => {
    fixture.componentRef.setInput('variant', 'overlay');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const card = compiled.querySelector('.pub-card-light');
    expect(card?.classList.contains('pub-card-light--overlay')).toBe(true);
  });

  it('should emit pubClick when clicked', () => {
    const clickSpy = jest.fn();
    component.pubClick.subscribe(clickSpy);

    const compiled = fixture.nativeElement as HTMLElement;
    const card = compiled.querySelector('.pub-card-light') as HTMLElement;
    card.click();

    expect(clickSpy).toHaveBeenCalledWith(mockPub);
  });

  it('should show pulsing animation when moving and distance is shown', () => {
    mockLocationService.isMoving.mockReturnValue(true);
    fixture.componentRef.setInput('showDistance', true);
    fixture.componentRef.setInput('distance', 500);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const distance = compiled.querySelector('.pub-distance');
    expect(distance?.classList.contains('distance-pulsing')).toBe(true);
  });

  describe('locationText computed', () => {
    it('should return city and region when both available', () => {
      expect(component.locationText()).toBe('Test City, Test Region');
    });

    it('should return only city when region is not available', () => {
      const pubWithoutRegion = { ...mockPub, region: '' };
      fixture.componentRef.setInput('pub', pubWithoutRegion);
      fixture.detectChanges();
      
      expect(component.locationText()).toBe('Test City');
    });

    it('should return empty string when neither city nor region available', () => {
      const pubWithoutLocation = { ...mockPub, city: '', region: '' };
      fixture.componentRef.setInput('pub', pubWithoutLocation);
      fixture.detectChanges();
      
      expect(component.locationText()).toBe('');
    });
  });
});