import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Timestamp } from 'firebase/firestore';
import { 
  beforeEach, 
  describe, 
  expect, 
  it, 
  vi,
  setupBrowserMocks,
  createMockBlob,
  type BrowserMocks 
} from '@shared/testing';
import { WidgetCheckInGalleryComponent } from './widget-check-in-gallery.component';
import { AuthStore } from '@auth/data-access/auth.store';
import { CheckInStore } from '@check-in/data-access/check-in.store';
import { CarpetStorageService } from '@carpets/data-access/carpet-storage.service';
import { PubStore } from '@pubs/data-access/pub.store';
import type { CheckIn } from '@check-in/utils/check-in.models';
import type { Pub } from '@pubs/utils/pub.models';

describe('WidgetCheckInGalleryComponent - Fallback Logic', () => {
  let component: WidgetCheckInGalleryComponent;
  let fixture: ComponentFixture<WidgetCheckInGalleryComponent>;
  let mockAuthStore: any;
  let mockCheckInStore: any;
  let mockCarpetStorageService: any;
  let mockPubStore: any;
  let browserMocks: BrowserMocks;

  // Test data
  const mockUserId = 'test-user-123';
  const mockCheckins: CheckIn[] = [
    {
      id: 'checkin-1',
      userId: mockUserId,
      pubId: 'pub-1',
      timestamp: Timestamp.fromDate(new Date('2024-01-01')),
      dateKey: '2024-01-01',
      carpetImageKey: 'carpet-key-1', // Has carpet key
      pointsEarned: 10,
      badgeName: 'First Timer',
    },
    {
      id: 'checkin-2',
      userId: mockUserId,
      pubId: 'pub-2',
      timestamp: Timestamp.fromDate(new Date('2024-01-02')),
      dateKey: '2024-01-02',
      // No carpetImageKey - should get placeholder
      pointsEarned: 5,
    },
    {
      id: 'checkin-3',
      userId: mockUserId,
      pubId: 'pub-3',
      timestamp: Timestamp.fromDate(new Date('2024-01-03')),
      dateKey: '2024-01-03',
      carpetImageKey: 'carpet-key-3', // Has carpet key
      pointsEarned: 15,
      missionUpdated: true,
    },
  ];

  const mockPubs: Pub[] = [
    { id: 'pub-1', name: 'The Crown', address: '123 High St', location: { lat: 51.5, lng: -0.1 } },
    { id: 'pub-2', name: 'The Rose', address: '456 Main St', location: { lat: 51.6, lng: -0.2 } },
    { id: 'pub-3', name: 'The Lion', address: '789 King St', location: { lat: 51.7, lng: -0.3 } },
  ];

  const mockCarpetImages = [
    {
      userId: mockUserId,
      pubId: 'pub-1',
      pubName: 'The Crown',
      date: '2024-01-01T10:00:00Z',
      blob: createMockBlob('fake-image-data', 'image/jpeg'),
      size: 1000,
      type: 'image/jpeg',
      width: 400,
      height: 400,
    },
    // Note: No image for pub-2 (should get placeholder)
    {
      userId: mockUserId,
      pubId: 'pub-3',
      pubName: 'The Lion',
      date: '2024-01-03T15:00:00Z',
      blob: createMockBlob('fake-image-data-2', 'image/jpeg'),
      size: 1200,
      type: 'image/jpeg',
      width: 400,
      height: 400,
    },
  ];

  beforeEach(async () => {
    // Setup browser API mocks (URL.createObjectURL, etc.)
    browserMocks = setupBrowserMocks();

    // Create mocks
    mockAuthStore = {
      uid: vi.fn().mockReturnValue(mockUserId),
      user: vi.fn().mockReturnValue({ uid: mockUserId, displayName: 'Test User' }),
    };

    mockCheckInStore = {
      checkins: signal(mockCheckins),
    };

    mockCarpetStorageService = {
      initialize: vi.fn().mockResolvedValue(undefined),
      getUserCarpets: vi.fn().mockResolvedValue(mockCarpetImages),
    };

    mockPubStore = {
      get: vi.fn().mockImplementation((pubId: string) => {
        return mockPubs.find(pub => pub.id === pubId);
      }),
    };

    await TestBed.configureTestingModule({
      imports: [WidgetCheckInGalleryComponent],
      providers: [
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: CheckInStore, useValue: mockCheckInStore },
        { provide: CarpetStorageService, useValue: mockCarpetStorageService },
        { provide: PubStore, useValue: mockPubStore },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WidgetCheckInGalleryComponent);
    component = fixture.componentInstance;
  });

  describe('Fallback Image Logic', () => {
    it('should show real images for check-ins with stored carpet data', async () => {
      // Arrange - component is already set up with mock data

      // Act
      await component['loadUserImages']();
      fixture.detectChanges();

      // Assert
      const images = component.images();
      const realImages = images.filter(img => !img.isPlaceholder);
      
      expect(realImages).toHaveLength(2); // pub-1 and pub-3 have stored images
      expect(realImages[0].pubId).toBe('pub-1');
      expect(realImages[1].pubId).toBe('pub-3');
      expect(realImages[0].imageUrl).toContain('blob:');
      expect(realImages[1].imageUrl).toContain('blob:');
    });

    it('should show placeholder images for check-ins without stored carpet data', async () => {
      // Arrange - component is already set up with mock data

      // Act
      await component['loadUserImages']();
      fixture.detectChanges();

      // Assert
      const images = component.images();
      const placeholderImages = images.filter(img => img.isPlaceholder);
      
      expect(placeholderImages).toHaveLength(1); // pub-2 has no stored image
      expect(placeholderImages[0].pubId).toBe('pub-2');
      expect(placeholderImages[0].imageUrl).toContain('data:image/svg+xml');
      expect(placeholderImages[0].isPlaceholder).toBe(true);
    });

    it('should display all check-ins even when no images are stored', async () => {
      // Arrange - simulate no stored images
      mockCarpetStorageService.getUserCarpets.mockResolvedValue([]);

      // Act
      await component['loadUserImages']();
      fixture.detectChanges();

      // Assert
      const images = component.images();
      
      expect(images).toHaveLength(3); // All 3 check-ins should show
      expect(images.every(img => img.isPlaceholder)).toBe(true); // All should be placeholders
      expect(images.every(img => img.imageUrl.includes('data:image/svg+xml'))).toBe(true);
    });

    it('should include badge and mission data from check-ins', async () => {
      // Act
      await component['loadUserImages']();
      fixture.detectChanges();

      // Assert
      const images = component.images();
      
      const checkinWithBadge = images.find(img => img.pubId === 'pub-1');
      expect(checkinWithBadge?.badgeName).toBe('First Timer');
      
      const checkinWithMission = images.find(img => img.pubId === 'pub-3');
      expect(checkinWithMission?.missionUpdated).toBe(true);
    });

    it('should sort images by date (newest first)', async () => {
      // Act
      await component['loadUserImages']();
      fixture.detectChanges();

      // Assert
      const images = component.images();
      
      expect(images).toHaveLength(3);
      expect(images[0].date).toContain('2024-01-03'); // pub-3 (newest)
      expect(images[1].date).toContain('2024-01-02'); // pub-2 (middle)
      expect(images[2].date).toContain('2024-01-01'); // pub-1 (oldest)
    });

    it('should calculate pub visit numbers correctly', async () => {
      // Act
      await component['loadUserImages']();
      fixture.detectChanges();

      // Assert
      const images = component.images();
      
      // All should have valid visit numbers (1, 2, 3 based on chronological order)
      const sortedByOriginalDate = images.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      expect(sortedByOriginalDate[0].pubVisitNumber).toBe(1); // First pub visited
      expect(sortedByOriginalDate[1].pubVisitNumber).toBe(2); // Second pub visited
      expect(sortedByOriginalDate[2].pubVisitNumber).toBe(3); // Third pub visited
    });
  });

  describe('Template Rendering', () => {
    it('should render placeholder indicators for placeholder images', async () => {
      // Act
      await component['loadUserImages']();
      fixture.detectChanges();

      // Assert
      const placeholderItems = fixture.debugElement.nativeElement.querySelectorAll('.image-item.placeholder');
      expect(placeholderItems.length).toBe(1); // pub-2 should be placeholder

      const placeholderOverlay = fixture.debugElement.nativeElement.querySelector('.placeholder-overlay');
      expect(placeholderOverlay).toBeTruthy();
      expect(placeholderOverlay.textContent).toContain('No Image');

      const placeholderIndicator = fixture.debugElement.nativeElement.querySelector('.placeholder-indicator');
      expect(placeholderIndicator).toBeTruthy();
      expect(placeholderIndicator.textContent).toContain('Check-in only');
    });

    it('should not render placeholder indicators for real images', async () => {
      // Act
      await component['loadUserImages']();
      fixture.detectChanges();

      // Assert
      const realImageItems = fixture.debugElement.nativeElement.querySelectorAll('.image-item:not(.placeholder)');
      expect(realImageItems.length).toBe(2); // pub-1 and pub-3 should be real images

      // These should not have placeholder overlays
      realImageItems.forEach((item: HTMLElement) => {
        const overlay = item.querySelector('.placeholder-overlay');
        expect(overlay).toBeFalsy();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle storage service errors gracefully', async () => {
      // Arrange
      mockCarpetStorageService.getUserCarpets.mockRejectedValue(new Error('Storage failed'));

      // Act
      await component['loadUserImages']();

      // Assert
      expect(component.error()).toBeTruthy();
      expect(component.loading()).toBe(false);
    });

    it('should handle empty check-ins list', async () => {
      // Arrange
      mockCheckInStore.checkins = signal([]);

      // Act
      await component['loadUserImages']();
      fixture.detectChanges();

      // Assert
      expect(component.images()).toHaveLength(0);
      expect(component.error()).toBeFalsy();
    });
  });
});