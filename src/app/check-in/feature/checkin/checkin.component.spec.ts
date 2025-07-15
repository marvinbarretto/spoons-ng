import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CheckinComponent } from './checkin.component';
import { CheckinOrchestrator } from '../../data-access/checkin-orchestrator.service';
import { NearbyPubStore } from '../../../pubs/data-access/nearby-pub.store';
import { PubStore } from '../../../pubs/data-access/pub.store';
import { CheckInStore } from '../../data-access/check-in.store';
import { signal } from '@angular/core';

describe('CheckinComponent', () => {
  let component: CheckinComponent;
  let fixture: ComponentFixture<CheckinComponent>;
  let mockOrchestrator: any;
  let mockNearbyPubStore: any;
  let mockPubStore: any;
  let mockCheckinStore: any;

  beforeEach(async () => {
    // Create mock services using Jest
    mockOrchestrator = {
      startCheckin: jest.fn(),
      stopCheckin: jest.fn(),
      retryCheckin: jest.fn(),
      cleanup: jest.fn(),
      setFileInputElement: jest.fn(),
      triggerPhotoCapture: jest.fn(),
      retakePhoto: jest.fn(),
      stage: signal('INITIALIZING'),
      pubId: signal(null),
      error: signal(null),
      showCameraButton: signal(false),
      showRetakeButton: signal(false),
      photoDataUrl: signal(null),
      photoFile: signal(null)
    };

    mockNearbyPubStore = {
      closestPub: signal({ id: 'test-pub-id', name: 'Test Pub' })
    };

    mockPubStore = {
      get: jest.fn().mockReturnValue({ id: 'test-pub-id', name: 'Test Pub' })
    };

    mockCheckinStore = {
      checkinToPub: jest.fn(),
      checkinResults: signal({ success: true, points: { total: 100 }, badges: [] })
    };

    await TestBed.configureTestingModule({
      imports: [CheckinComponent],
      providers: [
        { provide: CheckinOrchestrator, useValue: mockOrchestrator },
        { provide: NearbyPubStore, useValue: mockNearbyPubStore },
        { provide: PubStore, useValue: mockPubStore },
        { provide: CheckInStore, useValue: mockCheckinStore }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CheckinComponent);
    component = fixture.componentInstance;
  });

  describe('Component Creation', () => {
    it('should create successfully', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with correct dependencies', () => {
      expect(component).toBeDefined();
      expect(component['orchestrator']).toBe(mockOrchestrator);
      expect(component['nearbyPubStore']).toBe(mockNearbyPubStore);
      expect(component['pubStore']).toBe(mockPubStore);
      expect(component['checkinStore']).toBe(mockCheckinStore);
    });
  });

  describe('Pub Detection', () => {
    it('should start check-in when nearby pub is available', () => {
      // Setup
      const testPub = { id: 'test-pub-id', name: 'Test Pub' };
      mockNearbyPubStore.closestPub.set(testPub);

      // Act
      component.ngOnInit();

      // Assert
      expect(mockOrchestrator.startCheckin).toHaveBeenCalledWith('test-pub-id');
    });

    it('should stop check-in when no nearby pub is available', () => {
      // Setup
      mockNearbyPubStore.closestPub.set(null);

      // Act
      component.ngOnInit();

      // Assert
      expect(mockOrchestrator.stopCheckin).toHaveBeenCalled();
      expect(mockOrchestrator.startCheckin).not.toHaveBeenCalled();
    });
  });

  describe('Component Lifecycle', () => {
    it('should connect file input element after view init', () => {
      // Setup
      const mockFileInput = document.createElement('input');
      component.fileInput = { nativeElement: mockFileInput } as any;

      // Act
      component.ngAfterViewInit();

      // Assert
      expect(mockOrchestrator.setFileInputElement).toHaveBeenCalledWith(mockFileInput);
    });

    it('should cleanup orchestrator on destroy', () => {
      // Act
      component.ngOnDestroy();

      // Assert
      expect(mockOrchestrator.cleanup).toHaveBeenCalled();
    });
  });

  describe('Template Methods', () => {
    it('should call orchestrator.stopCheckin when onExitClick is called', () => {
      // Act
      component.onExitClick();

      // Assert
      expect(mockOrchestrator.stopCheckin).toHaveBeenCalled();
    });

    it('should call orchestrator.retryCheckin when onRetryClick is called', () => {
      // Act
      component.onRetryClick();

      // Assert
      expect(mockOrchestrator.retryCheckin).toHaveBeenCalled();
    });

    it('should call orchestrator.triggerPhotoCapture when onTakePhotoClick is called', () => {
      // Act
      component.onTakePhotoClick();

      // Assert
      expect(mockOrchestrator.triggerPhotoCapture).toHaveBeenCalled();
    });

    it('should call orchestrator.retakePhoto when onRetakePhotoClick is called', () => {
      // Act
      component.onRetakePhotoClick();

      // Assert
      expect(mockOrchestrator.retakePhoto).toHaveBeenCalled();
    });
  });

  describe('Computed Properties', () => {
    it('should return pub name when pub is available', () => {
      // Setup
      mockOrchestrator.pubId.set('test-pub-id');

      // Act
      const result = component.pubName();

      // Assert
      expect(result).toBe('Test Pub');
    });

    it('should return "Unknown Pub" when pub is not found', () => {
      // Setup
      mockOrchestrator.pubId.set('nonexistent-pub-id');
      mockPubStore.get.mockReturnValue(null);

      // Act
      const result = component.pubName();

      // Assert
      expect(result).toBe('Unknown Pub');
    });

    it('should return points earned from check-in results', () => {
      // Act
      const result = component.pointsEarned();

      // Assert
      expect(result).toBe(100);
    });

    it('should return badges earned from check-in results', () => {
      // Act
      const result = component.badgesEarned();

      // Assert
      expect(result).toEqual([]);
    });
  });
});