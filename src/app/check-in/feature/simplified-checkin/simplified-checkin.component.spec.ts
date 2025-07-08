import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimplifiedCheckinComponent } from './simplified-checkin.component';
import { SimplifiedCheckinOrchestrator } from '../../data-access/simplified-checkin-orchestrator.service';
import { NearbyPubStore } from '../../../pubs/data-access/nearby-pub.store';
import { PubStore } from '../../../pubs/data-access/pub.store';
import { CheckInStore } from '../../data-access/check-in.store';
import { signal } from '@angular/core';

describe('SimplifiedCheckinComponent', () => {
  let component: SimplifiedCheckinComponent;
  let fixture: ComponentFixture<SimplifiedCheckinComponent>;
  let mockOrchestrator: jasmine.SpyObj<SimplifiedCheckinOrchestrator>;
  let mockNearbyPubStore: jasmine.SpyObj<NearbyPubStore>;
  let mockPubStore: jasmine.SpyObj<PubStore>;
  let mockCheckinStore: jasmine.SpyObj<CheckInStore>;

  beforeEach(async () => {
    // Create mock services
    mockOrchestrator = jasmine.createSpyObj('SimplifiedCheckinOrchestrator', [
      'startCheckin',
      'stopCheckin',
      'retryCheckin',
      'cleanup',
      'setVideoElement'
    ], {
      stage: signal('INITIALIZING'),
      pubId: signal(null),
      error: signal(null),
      orientation: signal({ beta: 0, gamma: 0 }),
      devicePointingDown: signal(false),
      deviceStable: signal(false),
      stability: signal({ isStable: false, motionLevel: 0 }),
      conditionsMet: signal(false),
      showCamera: signal(false),
      photoDataUrl: signal(null)
    });

    mockNearbyPubStore = jasmine.createSpyObj('NearbyPubStore', ['closestPub'], {
      closestPub: signal({ id: 'test-pub-id', name: 'Test Pub' })
    });

    mockPubStore = jasmine.createSpyObj('PubStore', ['get']);
    mockPubStore.get.and.returnValue({ id: 'test-pub-id', name: 'Test Pub' });

    mockCheckinStore = jasmine.createSpyObj('CheckInStore', ['checkinToPub'], {
      checkinResults: signal({ success: true, points: { total: 100 }, badges: [] })
    });

    await TestBed.configureTestingModule({
      imports: [SimplifiedCheckinComponent],
      providers: [
        { provide: SimplifiedCheckinOrchestrator, useValue: mockOrchestrator },
        { provide: NearbyPubStore, useValue: mockNearbyPubStore },
        { provide: PubStore, useValue: mockPubStore },
        { provide: CheckInStore, useValue: mockCheckinStore }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SimplifiedCheckinComponent);
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
      mockNearbyPubStore.closestPub.and.returnValue(testPub);

      // Act
      component.ngOnInit();

      // Assert
      expect(mockOrchestrator.startCheckin).toHaveBeenCalledWith('test-pub-id');
    });

    it('should stop check-in when no nearby pub is available', () => {
      // Setup
      mockNearbyPubStore.closestPub.and.returnValue(null);

      // Act
      component.ngOnInit();

      // Assert
      expect(mockOrchestrator.stopCheckin).toHaveBeenCalled();
      expect(mockOrchestrator.startCheckin).not.toHaveBeenCalled();
    });
  });

  describe('Component Lifecycle', () => {
    it('should connect video element after view init', () => {
      // Setup
      const mockVideoElement = document.createElement('video');
      component.videoElement = { nativeElement: mockVideoElement } as any;

      // Act
      component.ngAfterViewInit();

      // Assert
      expect(mockOrchestrator.setVideoElement).toHaveBeenCalledWith(mockVideoElement);
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

    it('should call orchestrator.stopCheckin when onContinueClick is called', () => {
      // Act
      component.onContinueClick();

      // Assert
      expect(mockOrchestrator.stopCheckin).toHaveBeenCalled();
    });
  });

  describe('Computed Properties', () => {
    it('should return pub name when pub is available', () => {
      // Setup
      mockOrchestrator.pubId = signal('test-pub-id');

      // Act
      const result = component.pubName();

      // Assert
      expect(result).toBe('Test Pub');
    });

    it('should return "Unknown Pub" when pub is not found', () => {
      // Setup
      mockOrchestrator.pubId = signal('nonexistent-pub-id');
      mockPubStore.get.and.returnValue(null);

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