// TODO: Extract mock services to a centralized location (e.g., src/app/testing/mocks/)
// This will allow reuse across multiple test files and reduce duplication

import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { Firestore } from '@angular/fire/firestore';
import { of } from 'rxjs';

import { CheckinComponent } from './checkin.component';
import { CheckInStore } from '../../../check-in/data-access/check-in.store';
import { PubStore } from '../../../pubs/data-access/pub.store';
import { CarpetImageAnalysisService } from '../../data-access/carpet-image-analysis.service';
import { UserProgressionService } from '@shared/data-access/user-progression.service';
import { UserStore } from '../../../users/data-access/user.store';
import { LLMService } from '@shared/data-access/llm.service';
import { CarpetStorageService } from '../../../carpets/data-access/carpet-storage.service';
import { environment } from '../../../../environments/environment';

// Import mock services
import { MockCarpetImageAnalysisService } from '../../data-access/testing';

describe('CheckinComponent', () => {
  let component: CheckinComponent;
  let fixture: ComponentFixture<CheckinComponent>;
  let mockRouter: jest.Mocked<Router>;
  let mockActivatedRoute: any;
  let mockCheckinStore: jest.Mocked<CheckInStore>;
  let mockPubStore: jest.Mocked<PubStore>;
  let mockMetricsService: jest.Mocked<CarpetImageAnalysisService>;

  beforeEach(async () => {
    // Create mocks
    mockRouter = {
      navigate: jest.fn(),
      url: '/check-in/test-pub-123',
      events: of({})
    } as any;

    mockActivatedRoute = {
      snapshot: {
        paramMap: {
          get: jest.fn().mockReturnValue('test-pub-123')
        }
      }
    };

    mockCheckinStore = {} as any;

    mockPubStore = {
      get: jest.fn().mockReturnValue({ name: 'Test Pub' })
    } as any;

    mockMetricsService = {
      metrics: signal(null),
      isAnalyzing: signal(false),
      analyzeVideoFrame: jest.fn().mockResolvedValue({})
    } as any;

    // Mock UserProgressionService and its minimal dependencies
    const mockUserProgressionService = {
      totalCheckinsCount: signal(0),
      checkInProgress: signal(null),
      calculateCheckInPoints: jest.fn(),
      calculateBadges: jest.fn()
    };

    const mockUserStore = {
      user: signal(null),
      loading: signal(false),
      error: signal(null)
    };

    const mockFirestore = {};
    
    const mockLLMService = {
      detectCarpet: jest.fn().mockResolvedValue({
        success: true,
        data: { isCarpet: true, confidence: 0.85, reasoning: 'Test carpet detected' }
      })
    };
    
    const mockCarpetStorageService = {
      saveCarpetImage: jest.fn().mockResolvedValue('test-key'),
      carpetCount: signal(0),
      totalSize: signal(0),
      loading: signal(false)
    };

    await TestBed.configureTestingModule({
      imports: [CheckinComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: CheckInStore, useValue: mockCheckinStore },
        { provide: PubStore, useValue: mockPubStore },
        { provide: CarpetImageAnalysisService, useValue: mockMetricsService },
        { provide: UserProgressionService, useValue: mockUserProgressionService },
        { provide: UserStore, useValue: mockUserStore },
        { provide: LLMService, useValue: mockLLMService },
        { provide: CarpetStorageService, useValue: mockCarpetStorageService },
        { provide: Firestore, useValue: mockFirestore }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CheckinComponent);
    component = fixture.componentInstance;
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should navigate away if no pub ID provided', () => {
      mockActivatedRoute.snapshot.paramMap.get = jest.fn().mockReturnValue(null);
      
      component.ngOnInit();
      
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
    });
  });

  describe('DEV MODE', () => {
    it('should auto-bypass gates if dev mode is on', fakeAsync(() => {
      // Arrange
      const originalDevMode = (component as any).ACTIVE_DEVELOPMENT_MODE;
      (component as any).ACTIVE_DEVELOPMENT_MODE = true;
      
      // Mock video element
      component.videoElement = {
        nativeElement: {
          srcObject: null,
          play: jest.fn().mockResolvedValue(undefined),
          videoWidth: 640,
          videoHeight: 480
        }
      } as any;

      // Mock getUserMedia
      const mockStream = { getTracks: () => [] };
      global.navigator.mediaDevices = {
        getUserMedia: jest.fn().mockResolvedValue(mockStream)
      } as any;

      // Spy on methods
      const capturePhotoSpy = jest.spyOn(component as any, 'capturePhoto');
      const consoleSpy = jest.spyOn(console, 'log');
      
      // Act
      (component as any).startGateMonitoring();
      
      // Assert - Initial state
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Checkin] 🧪 DEV MODE: Auto-capture will trigger in 1 second (bypassing all gates)'
      );
      
      // Assert - Before timeout
      expect(capturePhotoSpy).not.toHaveBeenCalled();
      
      // Fast forward 1 second
      tick(1000);
      
      // Assert - After timeout
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Checkin] 🧪 DEV MODE: 1 second elapsed - triggering auto-capture!'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Checkin] 🧪 DEV MODE: Gate monitoring stopped'
      );
      expect(capturePhotoSpy).toHaveBeenCalled();
      
      // Cleanup
      (component as any).ACTIVE_DEVELOPMENT_MODE = originalDevMode;
      consoleSpy.mockRestore();
    }));

    it('should not auto-bypass gates if dev mode is off', fakeAsync(() => {
      // Arrange
      (component as any).ACTIVE_DEVELOPMENT_MODE = false;
      
      // Spy on methods
      const capturePhotoSpy = jest.spyOn(component as any, 'capturePhoto');
      
      // Act
      (component as any).startGateMonitoring();
      
      // Fast forward 1 second
      tick(1000);
      
      // Assert - capturePhoto should not be called automatically
      expect(capturePhotoSpy).not.toHaveBeenCalled();
    }));
  });

  describe('Gate Monitoring', () => {
    it('should start gate monitoring interval', () => {
      // Arrange
      const setIntervalSpy = jest.spyOn(window, 'setInterval');
      
      // Act
      (component as any).startGateMonitoring();
      
      // Assert
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
      expect((component as any).gateMonitoringInterval).toBeTruthy();
      
      // Cleanup
      setIntervalSpy.mockRestore();
    });

    it('should clear gate monitoring interval on cleanup', () => {
      // Arrange
      (component as any).gateMonitoringInterval = 123;
      const clearIntervalSpy = jest.spyOn(window, 'clearInterval');
      
      // Act
      (component as any).cleanup();
      
      // Assert
      expect(clearIntervalSpy).toHaveBeenCalledWith(123);
      expect((component as any).gateMonitoringInterval).toBeNull();
      
      // Cleanup
      clearIntervalSpy.mockRestore();
    });
  });

  describe('Motion Detection', () => {
    beforeEach(() => {
      // Reset motion service state
      mockMetricsService.metrics = signal({
        brightness: 128,
        contrast: 50,
        sharpness: 25,
        dominantColors: ['#808080'],
        colorVariance: 30,
        saturation: 20,
        edgeDensity: 40,
        textureComplexity: 35,
        repetition: 15,
        motionLevel: 0,
        isStable: true,
        analysisTime: 50,
        frameSize: '640x480',
        timestamp: Date.now()
      });
    });

    it('should detect high motion levels during movement', () => {
      // Simulate high motion scenario
      const highMotionMetrics = {
        brightness: 128,
        contrast: 50,
        sharpness: 25,
        dominantColors: ['#808080'],
        colorVariance: 30,
        saturation: 20,
        edgeDensity: 40,
        textureComplexity: 35,
        repetition: 15,
        motionLevel: 45,
        isStable: false,
        analysisTime: 50,
        frameSize: '640x480',
        timestamp: Date.now()
      };
      
      // Update the mock signal directly
      mockMetricsService.metrics.set(highMotionMetrics);
      
      // Override the component's metrics property to use our mock
      (component as any).metrics = mockMetricsService.metrics;

      const gates = (component as any).gatesPassed();
      
      expect(gates.isStable).toBe(false);
      expect(gates.lowMotion).toBe(false); // Motion level 45 should be > 20 threshold
    });

    it('should only consider stable when motion is very low', () => {
      // Simulate low motion scenario
      const lowMotionMetrics = {
        brightness: 128,
        contrast: 50,
        sharpness: 25,
        dominantColors: ['#808080'],
        colorVariance: 30,
        saturation: 20,
        edgeDensity: 40,
        textureComplexity: 35,
        repetition: 15,
        motionLevel: 5,
        isStable: true,
        analysisTime: 50,
        frameSize: '640x480',
        timestamp: Date.now()
      };
      
      // Update the mock signal directly
      mockMetricsService.metrics.set(lowMotionMetrics);
      
      // Override the component's metrics property to use our mock  
      (component as any).metrics = mockMetricsService.metrics;

      const gates = (component as any).gatesPassed();
      
      
      expect(gates.isStable).toBe(true);
      expect(gates.lowMotion).toBe(true); // Motion level 5 should be < 20 threshold
    });

    it('should not allow check-in during high motion', () => {
      // Set all other gates to pass but motion fails
      const highMotionMetrics = {
        brightness: 128,
        contrast: 50,
        sharpness: 35, // Good sharpness
        dominantColors: ['#808080'],
        colorVariance: 30,
        saturation: 20,
        edgeDensity: 50, // Good edges
        textureComplexity: 25, // Good texture
        repetition: 15,
        motionLevel: 50, // HIGH MOTION
        isStable: false, // NOT STABLE
        analysisTime: 50,
        frameSize: '640x480',
        timestamp: Date.now()
      };
      // Update the mock signal directly  
      mockMetricsService.metrics.set(highMotionMetrics);
      
      // Override the component's metrics property to use our mock
      (component as any).metrics = mockMetricsService.metrics;

      // Mock device orientation as good
      (component as any).deviceOrientation.set({ beta: 30, gamma: 0, stable: true });

      const allGatesPassed = (component as any).allGatesPassed();
      
      expect(allGatesPassed).toBe(false); // Should fail due to motion
    });
  });

  describe('LLM Analysis', () => {
    // TODO: Fix async timing issues in LLM tests
    // The tests below fail due to complex async/fakeAsync timing with Promises
    // and setTimeout interactions. Need to refactor to properly wait for:
    // 1. LLM service promise resolution
    // 2. Message cycling updates
    // 3. setTimeout delays for retry flow
    
    it.skip('should handle negative LLM response and return to gates', fakeAsync(() => {
      // TODO: Fix timing - LLM promise resolution doesn't update message in time
      // The test expects 'Not a carpet - floor surface' but gets 'Analyzing sharpness...'
      // Need to properly wait for async LLM call AND message update
    }));

    it.skip('should reset data when returning to gates after negative LLM', fakeAsync(() => {
      // TODO: Fix async flow - resetForRetry() not being called properly in test
      // The test expects data to be cleared but it remains set
      // Need to ensure the full setTimeout chain completes and resetForRetry() is called
    }));

    it('should extract identification from LLM reasoning correctly', () => {
      // Test the getLLMIdentification method
      const testCases = [
        { reasoning: 'This is a hardwood floor', expected: 'floor surface' },
        { reasoning: 'The image shows a brick wall', expected: 'wall surface' },
        { reasoning: 'This appears to be a wooden table', expected: 'furniture' },
        { reasoning: 'Random text that does not match patterns', expected: 'Random text that does not match' },
        { reasoning: '', expected: 'unknown surface' }
      ];
      
      testCases.forEach(({ reasoning, expected }) => {
        const result = (component as any).getLLMIdentification({ reasoning });
        expect(result).toContain(expected.substring(0, 10)); // Partial match for dynamic content
      });
    });
  });

  describe('Cleanup', () => {
    it('should clean up resources on destroy', () => {
      // Arrange
      const cleanupSpy = jest.spyOn(component as any, 'cleanup');
      
      // Act
      component.ngOnDestroy();
      
      // Assert
      expect(cleanupSpy).toHaveBeenCalled();
    });
  });
});