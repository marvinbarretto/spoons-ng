// src/app/check-in/data-access/checkin-orchestrator.service.spec.ts

import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { LLMService } from '@shared/data-access/llm.service';
import { environment } from '../../../environments/environment';
import { CarpetStorageService } from '../../carpets/data-access/carpet-storage.service';
import { CheckInStore } from './check-in.store';
import { CheckinOrchestrator } from './checkin-orchestrator.service';

// Mock types for browser APIs
interface MockMediaStreamTrack {
  stop: jest.Mock;
  kind: string;
  label: string;
  readyState: string;
}

interface MockMediaStream {
  id: string;
  getTracks: jest.Mock;
  getVideoTracks: jest.Mock;
  getAudioTracks: jest.Mock;
}

interface MockMediaDevices {
  getUserMedia: jest.Mock;
}

interface MockHTMLVideoElement {
  srcObject: MediaStream | null;
  videoWidth: number;
  videoHeight: number;
  pause: jest.Mock;
  load: jest.Mock;
}

interface MockHTMLCanvasElement {
  width: number;
  height: number;
  getContext: jest.Mock;
  toDataURL: jest.Mock;
  toBlob: jest.Mock;
}

interface MockCanvasRenderingContext2D {
  drawImage: jest.Mock;
}

describe('CheckinOrchestrator', () => {
  let service: CheckinOrchestrator;
  let mockRouter: any;
  let mockCheckinStore: any;
  let mockLLMService: any;
  let mockCarpetStorageService: any;

  // Browser API mocks
  let mockMediaStreamTrack: MockMediaStreamTrack;
  let mockMediaStream: MockMediaStream;
  let mockMediaDevices: MockMediaDevices;
  let mockVideoElement: MockHTMLVideoElement;
  let mockCanvas: MockHTMLCanvasElement;
  let mockCanvasContext: MockCanvasRenderingContext2D;

  // Test utilities
  let originalEnvironment: any;
  let mockDeviceOrientationEvent: any;

  beforeEach(async () => {
    // Store original environment
    originalEnvironment = { ...environment };

    // Create browser API mocks
    setupBrowserAPIMocks();

    // Create service mocks
    mockRouter = {
      navigate: jest.fn(),
    };

    mockCheckinStore = {
      checkinToPub: jest.fn().mockResolvedValue(undefined),
    };

    mockLLMService = {
      detectCarpet: jest.fn(),
    };

    mockCarpetStorageService = {
      saveCarpetImage: jest.fn().mockResolvedValue('mock-key'),
    };

    await TestBed.configureTestingModule({
      providers: [
        CheckinOrchestrator,
        { provide: Router, useValue: mockRouter },
        { provide: CheckInStore, useValue: mockCheckinStore },
        { provide: LLMService, useValue: mockLLMService },
        { provide: CarpetStorageService, useValue: mockCarpetStorageService },
      ],
    }).compileComponents();

    service = TestBed.inject(CheckinOrchestrator);
  });

  function verifyTimerSetup(): void {
    if (!jest.isMockFunction(setTimeout)) {
      throw new Error('setTimeout is not mocked - jest.useFakeTimers() may not have been called');
    }
    if (!jest.isMockFunction(setInterval)) {
      throw new Error('setInterval is not mocked - jest.useFakeTimers() may not have been called');
    }
  }

  afterEach(() => {
    // Clean up any running operations
    service?.cleanup();

    // Restore environment
    Object.assign(environment, originalEnvironment);

    // Clear all mocks
    jest.clearAllMocks();

    // Clear any intervals/timeouts and restore real timers
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  function setupBrowserAPIMocks(): void {
    // Mock MediaStreamTrack
    mockMediaStreamTrack = {
      stop: jest.fn(),
      kind: 'video',
      label: 'mock-camera',
      readyState: 'live',
    };

    // Mock MediaStream
    mockMediaStream = {
      id: 'mock-stream-id',
      getTracks: jest.fn().mockReturnValue([mockMediaStreamTrack]),
      getVideoTracks: jest.fn().mockReturnValue([mockMediaStreamTrack]),
      getAudioTracks: jest.fn().mockReturnValue([]),
    };

    // Mock MediaDevices
    mockMediaDevices = {
      getUserMedia: jest.fn().mockResolvedValue(mockMediaStream),
    };

    // Mock global navigator
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: mockMediaDevices,
      writable: true,
    });

    // Mock HTMLVideoElement
    mockVideoElement = {
      srcObject: null,
      videoWidth: 1280,
      videoHeight: 720,
      pause: jest.fn(),
      load: jest.fn(),
    };

    // Mock Canvas and Context
    mockCanvasContext = {
      drawImage: jest.fn(),
    };

    mockCanvas = {
      width: 0,
      height: 0,
      getContext: jest.fn().mockReturnValue(mockCanvasContext),
      toDataURL: jest.fn().mockReturnValue('data:image/jpeg;base64,mock-data'),
      toBlob: jest.fn(),
    };

    // Store original createElement before mocking
    const originalCreateElement = document.createElement.bind(document);

    // Mock document.createElement for canvas
    jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return mockCanvas as any;
      }
      return originalCreateElement(tagName);
    });

    // Mock DeviceOrientationEvent
    mockDeviceOrientationEvent = {
      beta: 45,
      gamma: 10,
      alpha: 0,
    };

    // Mock DeviceOrientationEvent support
    Object.defineProperty(window, 'DeviceOrientationEvent', {
      value: function DeviceOrientationEvent() {},
      writable: true,
    });

    // Mock window.addEventListener/removeEventListener
    jest.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'deviceorientation') {
        // Store handler for manual triggering
        (window as any).__orientationHandler = handler;
      }
    });

    jest.spyOn(window, 'removeEventListener').mockImplementation(() => {
      delete (window as any).__orientationHandler;
    });

    // Mock setTimeout/setInterval for controlled testing
    jest.useFakeTimers();
  }

  function triggerDeviceOrientation(beta: number = 45, gamma: number = 10): void {
    const handler = (window as any).__orientationHandler;
    if (handler) {
      handler({ beta, gamma, alpha: 0 });
    }
  }

  // ===================================
  // 🏗️ SERVICE SETUP TESTS
  // ===================================

  describe('🏗️ Service Setup', () => {
    it('should create service with correct initial state', () => {
      expect(service).toBeTruthy();
      expect(service.stage()).toBe('INITIALIZING');
      expect(service.pubId()).toBeNull();
      expect(service.error()).toBeNull();
      expect(service.photoDataUrl()).toBeNull();
      expect(service.orientation()).toEqual({ beta: 0, gamma: 0 });
      expect(service.stability()).toEqual({ isStable: false, motionLevel: 0 });
    });

    it('should have correct computed signal defaults', () => {
      expect(service.showCamera()).toBe(false);
      expect(service.devicePointingDown()).toBe(true); // beta: 0 is within range
      expect(service.deviceStable()).toBe(false);
      expect(service.conditionsMet()).toBe(false);
      expect(service.statusMessage()).toBe('Initializing...');
    });
  });

  // ===================================
  // 🚀 CHECK-IN ORCHESTRATION TESTS
  // ===================================

  describe('🚀 Check-in Orchestration', () => {
    describe('startCheckin()', () => {
      it('should successfully start check-in with valid pub ID', async () => {
        const pubId = 'test-pub-123';

        await service.startCheckin(pubId);

        expect(service.pubId()).toBe(pubId);
        expect(service.error()).toBeNull();
        expect(service.stage()).toBe('SCANNING');
        expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      });

      it('should handle camera initialization failure', async () => {
        const cameraError = new Error('Camera access denied');
        mockMediaDevices.getUserMedia.mockRejectedValueOnce(cameraError);

        await service.startCheckin('test-pub-123');

        expect(service.stage()).toBe('FAILED');
        expect(service.error()).toBe('Camera access denied');
      });

      it('should reset error state when starting new check-in', async () => {
        // First, create an error state
        mockMediaDevices.getUserMedia.mockRejectedValueOnce(new Error('Initial error'));
        await service.startCheckin('test-pub-123');
        expect(service.error()).toBe('Camera access denied');

        // Reset mock and start again
        mockMediaDevices.getUserMedia.mockResolvedValueOnce(mockMediaStream);
        await service.startCheckin('test-pub-456');

        expect(service.error()).toBeNull();
        expect(service.pubId()).toBe('test-pub-456');
        expect(service.stage()).toBe('SCANNING');
      });
    });

    describe('stopCheckin()', () => {
      it('should cleanup and navigate to home', async () => {
        await service.startCheckin('test-pub-123');

        service.stopCheckin();

        expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
        expect(service.stage()).toBe('INITIALIZING');
        expect(service.pubId()).toBeNull();
        expect(service.error()).toBeNull();
      });
    });

    describe('retryCheckin()', () => {
      it('should restart camera and monitoring after failure', async () => {
        // Setup initial failure
        mockMediaDevices.getUserMedia.mockRejectedValueOnce(new Error('Initial error'));
        await service.startCheckin('test-pub-123');
        expect(service.stage()).toBe('FAILED');

        // Reset mock for retry
        mockMediaDevices.getUserMedia.mockResolvedValueOnce(mockMediaStream);

        await service.retryCheckin();

        expect(service.error()).toBeNull();
        expect(service.stage()).toBe('SCANNING');
        expect(mockMediaDevices.getUserMedia).toHaveBeenCalledTimes(2);
      });

      it('should handle retry failures', async () => {
        // Setup initial state
        await service.startCheckin('test-pub-123');

        // Mock retry failure
        mockMediaDevices.getUserMedia.mockRejectedValueOnce(new Error('Retry failed'));

        await service.retryCheckin();

        expect(service.stage()).toBe('FAILED');
        expect(service.error()).toBe('Failed to restart camera');
      });
    });
  });

  // ===================================
  // 📹 CAMERA MANAGEMENT TESTS
  // ===================================

  describe('📹 Camera Management', () => {
    describe('setVideoElement()', () => {
      it('should attach video element and set srcObject if stream exists', async () => {
        await service.startCheckin('test-pub-123');

        await service.setVideoElement(mockVideoElement as any);

        expect(mockVideoElement.srcObject).toBe(mockMediaStream);
      });

      it('should store video element even without existing stream', async () => {
        await service.setVideoElement(mockVideoElement as any);

        // Video element should be stored (tested indirectly through capturePhoto)
        expect(mockVideoElement.srcObject).toBeNull();
      });
    });

    describe('Camera initialization', () => {
      it('should request rear camera with correct constraints', async () => {
        await service.startCheckin('test-pub-123');

        expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      });

      it('should transition through correct stages during initialization', async () => {
        expect(service.stage()).toBe('INITIALIZING');

        await service.startCheckin('test-pub-123');

        expect(service.stage()).toBe('SCANNING');
      });

      it('should handle camera permission denied', async () => {
        const permissionError = new DOMException('Permission denied', 'NotAllowedError');
        mockMediaDevices.getUserMedia.mockRejectedValueOnce(permissionError);

        await service.startCheckin('test-pub-123');

        expect(service.stage()).toBe('FAILED');
        expect(service.error()).toBe('Camera access denied');
      });
    });
  });

  // ===================================
  // 🚦 DEVICE MONITORING TESTS
  // ===================================

  describe('🚦 Device Monitoring', () => {
    beforeEach(async () => {
      await service.startCheckin('test-pub-123');
    });

    describe('Orientation Detection', () => {
      it('should detect device orientation changes', () => {
        triggerDeviceOrientation(30, -15);

        expect(service.orientation()).toEqual({ beta: 30, gamma: -15 });
      });

      it('should calculate devicePointingDown correctly', () => {
        // Test within range (pointing down)
        triggerDeviceOrientation(20, 0);
        expect(service.devicePointingDown()).toBe(true);

        // Test outside range (too steep)
        triggerDeviceOrientation(60, 0);
        expect(service.devicePointingDown()).toBe(false);

        // Test negative range (tilted back)
        triggerDeviceOrientation(-10, 0);
        expect(service.devicePointingDown()).toBe(false);
      });

      it('should handle missing DeviceOrientationEvent support', async () => {
        // Remove DeviceOrientationEvent from window
        const originalDeviceOrientationEvent = (window as any).DeviceOrientationEvent;
        delete (window as any).DeviceOrientationEvent;

        // Create new service instance
        const newService = TestBed.inject(CheckinOrchestrator);
        await newService.startCheckin('test-pub-123');

        // Should use mock orientation for desktop
        expect(newService.orientation().beta).toBe(90); // Mock value for desktop

        // Cleanup
        newService.cleanup();

        // Restore
        (window as any).DeviceOrientationEvent = originalDeviceOrientationEvent;
      });
    });

    describe('Stability Detection', () => {
      it('should calculate stability based on motion', () => {
        // Start with initial orientation
        triggerDeviceOrientation(20, 0);

        // Fast forward to allow stability calculation
        jest.advanceTimersByTime(200);

        // Small movement (stable)
        triggerDeviceOrientation(21, 1);
        jest.advanceTimersByTime(200);

        expect(service.deviceStable()).toBe(true);
        expect(service.stability().motionLevel).toBeLessThan(5);
      });

      it('should detect unstable movement', () => {
        // Start with initial orientation
        triggerDeviceOrientation(20, 0);
        jest.advanceTimersByTime(200);

        // Large movement (unstable)
        triggerDeviceOrientation(35, 10);
        jest.advanceTimersByTime(200);

        expect(service.deviceStable()).toBe(false);
        expect(service.stability().motionLevel).toBeGreaterThanOrEqual(5);
      });

      it('should update stability continuously', () => {
        const initialStability = service.stability();

        // Trigger multiple orientation changes
        triggerDeviceOrientation(20, 0);
        jest.advanceTimersByTime(200);

        triggerDeviceOrientation(22, 1);
        jest.advanceTimersByTime(200);

        const finalStability = service.stability();

        // Stability should have been calculated
        expect(finalStability).toBeDefined();
        expect(typeof finalStability.motionLevel).toBe('number');
      });
    });

    describe('Conditions Detection', () => {
      it('should detect when all conditions are met', () => {
        // Set stable pointing down orientation
        triggerDeviceOrientation(20, 0);
        jest.advanceTimersByTime(200);

        // Small movement to trigger stability
        triggerDeviceOrientation(21, 1);
        jest.advanceTimersByTime(200);

        expect(service.conditionsMet()).toBe(true);
      });

      it('should not be met when device not pointing down', () => {
        triggerDeviceOrientation(60, 0); // Too steep
        jest.advanceTimersByTime(200);

        expect(service.conditionsMet()).toBe(false);
      });

      it('should not be met when device unstable', () => {
        // Pointing down but unstable
        triggerDeviceOrientation(20, 0);
        jest.advanceTimersByTime(200);

        triggerDeviceOrientation(35, 10); // Large movement
        jest.advanceTimersByTime(200);

        expect(service.conditionsMet()).toBe(false);
      });
    });
  });

  // ===================================
  // 📸 AUTO-CAPTURE LOGIC TESTS
  // ===================================

  describe('📸 Auto-Capture Logic', () => {
    beforeEach(async () => {
      await service.startCheckin('test-pub-123');
      await service.setVideoElement(mockVideoElement as any);
    });

    it('should trigger auto-capture when conditions are met', () => {
      // Set up stable pointing down conditions
      triggerDeviceOrientation(20, 0);
      jest.advanceTimersByTime(200);
      triggerDeviceOrientation(21, 1);
      jest.advanceTimersByTime(200);

      // Should transition to CONDITIONS_MET
      expect(service.stage()).toBe('CONDITIONS_MET');

      // Advance timer to trigger capture
      jest.advanceTimersByTime(500);

      expect(service.stage()).toBe('CAPTURING');
    });

    it('should not capture if conditions change before timeout', () => {
      // Set up conditions met
      triggerDeviceOrientation(20, 0);
      jest.advanceTimersByTime(200);
      triggerDeviceOrientation(21, 1);
      jest.advanceTimersByTime(200);

      expect(service.stage()).toBe('CONDITIONS_MET');

      // Change conditions before timeout
      triggerDeviceOrientation(60, 0);
      jest.advanceTimersByTime(200);

      // Advance past capture timeout
      jest.advanceTimersByTime(500);

      // Should not have captured
      expect(service.stage()).not.toBe('CAPTURING');
    });

    it('should prevent multiple simultaneous captures', () => {
      // Set up first capture
      triggerDeviceOrientation(20, 0);
      jest.advanceTimersByTime(200);
      triggerDeviceOrientation(21, 1);
      jest.advanceTimersByTime(200);
      jest.advanceTimersByTime(500);

      expect(service.stage()).toBe('CAPTURING');

      // Try to trigger another capture (should be ignored)
      const initialPhotoDataUrl = service.photoDataUrl();

      triggerDeviceOrientation(22, 1);
      jest.advanceTimersByTime(200);
      jest.advanceTimersByTime(500);

      // Should not have changed
      expect(service.photoDataUrl()).toBe(initialPhotoDataUrl);
    });
  });

  // ===================================
  // 📸 PHOTO PROCESSING TESTS
  // ===================================

  describe('📸 Photo Processing', () => {
    beforeEach(async () => {
      await service.startCheckin('test-pub-123');
      await service.setVideoElement(mockVideoElement as any);

      // Set up environment for processing
      environment.LLM_CHECK = false; // Skip LLM by default
    });

    describe('Photo Capture', () => {
      it('should capture photo and create data URL', async () => {
        // Trigger capture
        triggerDeviceOrientation(20, 0);
        jest.advanceTimersByTime(200);
        triggerDeviceOrientation(21, 1);
        jest.advanceTimersByTime(200);
        jest.advanceTimersByTime(500);

        // Wait for async operations
        await jest.runOnlyPendingTimers();

        expect(service.stage()).toBe('PROCESSING');
        expect(service.photoDataUrl()).toBe('data:image/jpeg;base64,mock-data');
        expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.8);
      });

      it('should handle missing video element', async () => {
        // Clear video element
        await service.setVideoElement(null as any);

        // Trigger capture
        triggerDeviceOrientation(20, 0);
        jest.advanceTimersByTime(200);
        triggerDeviceOrientation(21, 1);
        jest.advanceTimersByTime(200);
        jest.advanceTimersByTime(500);

        await jest.runOnlyPendingTimers();

        expect(service.stage()).toBe('FAILED');
        expect(service.error()).toBe('Failed to capture photo');
      });

      it('should set canvas dimensions from video', async () => {
        triggerDeviceOrientation(20, 0);
        jest.advanceTimersByTime(200);
        triggerDeviceOrientation(21, 1);
        jest.advanceTimersByTime(200);
        jest.advanceTimersByTime(500);

        await jest.runOnlyPendingTimers();

        expect(mockCanvas.width).toBe(1280);
        expect(mockCanvas.height).toBe(720);
        expect(mockCanvasContext.drawImage).toHaveBeenCalledWith(mockVideoElement, 0, 0);
      });
    });

    describe('LLM Integration', () => {
      beforeEach(() => {
        environment.LLM_CHECK = true; // Enable LLM checking
      });

      it('should check photo with LLM when enabled', async () => {
        mockLLMService.detectCarpet.mockResolvedValue({
          success: true,
          data: { isCarpet: true },
        });

        triggerDeviceOrientation(20, 0);
        jest.advanceTimersByTime(200);
        triggerDeviceOrientation(21, 1);
        jest.advanceTimersByTime(200);
        jest.advanceTimersByTime(500);

        await jest.runOnlyPendingTimers();

        expect(mockLLMService.detectCarpet).toHaveBeenCalledWith(
          'data:image/jpeg;base64,mock-data'
        );
        expect(service.stage()).toBe('PROCESSING');
      });

      it('should handle LLM rejection with auto-retry', async () => {
        mockLLMService.detectCarpet.mockResolvedValue({
          success: false,
          error: 'Not a carpet',
        });

        triggerDeviceOrientation(20, 0);
        jest.advanceTimersByTime(200);
        triggerDeviceOrientation(21, 1);
        jest.advanceTimersByTime(200);
        jest.advanceTimersByTime(500);

        await jest.runOnlyPendingTimers();

        expect(service.stage()).toBe('FAILED');
        expect(service.error()).toBe('Not a carpet: Not a carpet');

        // Should auto-retry after 3 seconds
        jest.advanceTimersByTime(3000);
        await jest.runOnlyPendingTimers();

        expect(mockMediaDevices.getUserMedia).toHaveBeenCalledTimes(2); // Initial + retry
      });

      it('should handle LLM service errors', async () => {
        mockLLMService.detectCarpet.mockRejectedValue(new Error('LLM service down'));

        triggerDeviceOrientation(20, 0);
        jest.advanceTimersByTime(200);
        triggerDeviceOrientation(21, 1);
        jest.advanceTimersByTime(200);
        jest.advanceTimersByTime(500);

        await jest.runOnlyPendingTimers();

        expect(service.stage()).toBe('FAILED');
        expect(service.error()).toBe('Failed to verify carpet');
      });
    });

    describe('Check-in Processing', () => {
      it('should process successful check-in', async () => {
        triggerDeviceOrientation(20, 0);
        jest.advanceTimersByTime(200);
        triggerDeviceOrientation(21, 1);
        jest.advanceTimersByTime(200);
        jest.advanceTimersByTime(500);

        await jest.runOnlyPendingTimers();

        expect(mockCarpetStorageService.saveCarpetImage).toHaveBeenCalled();
        expect(mockCheckinStore.checkinToPub).toHaveBeenCalledWith('test-pub-123');
        expect(service.stage()).toBe('SUCCESS');
      });

      it('should handle storage service errors', async () => {
        mockCarpetStorageService.saveCarpetImage.mockRejectedValue(new Error('Storage failed'));

        triggerDeviceOrientation(20, 0);
        jest.advanceTimersByTime(200);
        triggerDeviceOrientation(21, 1);
        jest.advanceTimersByTime(200);
        jest.advanceTimersByTime(500);

        await jest.runOnlyPendingTimers();

        expect(service.stage()).toBe('FAILED');
        expect(service.error()).toBe('Check-in failed');
      });

      it('should handle check-in store errors', async () => {
        mockCheckinStore.checkinToPub.mockRejectedValue(new Error('Check-in failed'));

        triggerDeviceOrientation(20, 0);
        jest.advanceTimersByTime(200);
        triggerDeviceOrientation(21, 1);
        jest.advanceTimersByTime(200);
        jest.advanceTimersByTime(500);

        await jest.runOnlyPendingTimers();

        expect(service.stage()).toBe('FAILED');
        expect(service.error()).toBe('Check-in failed');
      });
    });
  });

  // ===================================
  // 🚨 ERROR HANDLING TESTS
  // ===================================

  describe('🚨 Error Handling', () => {
    it('should set error state and stop monitoring on handleError', async () => {
      await service.startCheckin('test-pub-123');

      // Manually trigger error (testing private method through public interface)
      mockMediaDevices.getUserMedia.mockRejectedValueOnce(new Error('Test error'));
      await service.retryCheckin();

      expect(service.stage()).toBe('FAILED');
      expect(service.error()).toBe('Failed to restart camera');
    });

    it('should handle "not carpet" errors with auto-retry', async () => {
      environment.LLM_CHECK = true;
      mockLLMService.detectCarpet.mockResolvedValue({
        success: false,
        error: 'This is a shoe',
      });

      await service.startCheckin('test-pub-123');
      await service.setVideoElement(mockVideoElement as any);

      triggerDeviceOrientation(20, 0);
      jest.advanceTimersByTime(200);
      triggerDeviceOrientation(21, 1);
      jest.advanceTimersByTime(200);
      jest.advanceTimersByTime(500);

      await jest.runOnlyPendingTimers();

      expect(service.stage()).toBe('FAILED');
      expect(service.error()).toContain('This is a shoe');

      // Should auto-retry after 3 seconds
      mockLLMService.detectCarpet.mockResolvedValue({
        success: true,
        data: { isCarpet: true },
      });

      jest.advanceTimersByTime(3000);
      await jest.runOnlyPendingTimers();

      expect(service.stage()).toBe('SCANNING'); // Back to scanning after retry
    });

    it('should not auto-retry if stage changes from FAILED', async () => {
      environment.LLM_CHECK = true;
      mockLLMService.detectCarpet.mockResolvedValue({
        success: false,
        error: 'Not a carpet',
      });

      await service.startCheckin('test-pub-123');
      await service.setVideoElement(mockVideoElement as any);

      triggerDeviceOrientation(20, 0);
      jest.advanceTimersByTime(200);
      triggerDeviceOrientation(21, 1);
      jest.advanceTimersByTime(200);
      jest.advanceTimersByTime(500);

      await jest.runOnlyPendingTimers();

      expect(service.stage()).toBe('FAILED');

      // User manually stops before auto-retry
      service.stopCheckin();

      // Advance past auto-retry time
      jest.advanceTimersByTime(3000);
      await jest.runOnlyPendingTimers();

      // Should not have retried
      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
    });
  });

  // ===================================
  // 🧹 RESOURCE CLEANUP TESTS
  // ===================================

  describe('🧹 Resource Cleanup', () => {
    beforeEach(async () => {
      await service.startCheckin('test-pub-123');
      await service.setVideoElement(mockVideoElement as any);
    });

    it('should stop camera streams on cleanup', () => {
      service.cleanup();

      expect(mockMediaStreamTrack.stop).toHaveBeenCalled();
      expect(mockVideoElement.srcObject).toBeNull();
    });

    it('should remove event listeners on cleanup', async () => {
      await service.startCheckin('test-pub-123');

      service.cleanup();

      expect(window.removeEventListener).toHaveBeenCalled();
    });

    it('should clear monitoring intervals on cleanup', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      service.cleanup();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should reset all signals on cleanup', () => {
      // Set some state first
      expect(service.stage()).toBe('SCANNING');
      expect(service.pubId()).toBe('test-pub-123');

      service.cleanup();

      expect(service.stage()).toBe('INITIALIZING');
      expect(service.pubId()).toBeNull();
      expect(service.error()).toBeNull();
      expect(service.photoDataUrl()).toBeNull();
    });

    it('should handle cleanup when no resources are active', () => {
      const cleanService = TestBed.inject(CheckinOrchestrator);

      expect(() => cleanService.cleanup()).not.toThrow();
    });

    it('should cleanup on stopCheckin', () => {
      const cleanupSpy = jest.spyOn(service, 'cleanup');

      service.stopCheckin();

      expect(cleanupSpy).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
    });
  });

  // ===================================
  // 🧮 COMPUTED PROPERTIES TESTS
  // ===================================

  describe('🧮 Computed Properties', () => {
    describe('showCamera', () => {
      it('should show camera during active stages', async () => {
        expect(service.showCamera()).toBe(false); // INITIALIZING

        await service.startCheckin('test-pub-123');

        // Should show during SCANNING
        expect(service.showCamera()).toBe(true);
      });

      it('should not show camera during inactive stages', () => {
        // Test various inactive stages by simulating them
        expect(service.showCamera()).toBe(false); // INITIALIZING

        // SUCCESS and FAILED stages don't show camera
        // (These would be set through the orchestration flow)
      });
    });

    describe('statusMessage', () => {
      it('should return correct messages for each stage', () => {
        const messages = [
          { stage: 'INITIALIZING', expected: 'Initializing...' },
          { stage: 'CAMERA_STARTING', expected: 'Starting camera...' },
          { stage: 'CAPTURING', expected: 'Capturing photo...' },
          { stage: 'LLM_CHECKING', expected: 'Analyzing image...' },
          { stage: 'PROCESSING', expected: 'Processing check-in...' },
          { stage: 'SUCCESS', expected: 'Success!' },
        ];

        messages.forEach(({ stage, expected }) => {
          // Access private signal setter through service instance
          (service as any)._stage.set(stage);
          expect(service.statusMessage()).toBe(expected);
        });
      });

      it('should handle scanning stage messages based on conditions', async () => {
        await service.startCheckin('test-pub-123');
        expect(service.statusMessage()).toBe('Point device down at carpet');

        // Set pointing down but not stable
        triggerDeviceOrientation(20, 0);
        expect(service.statusMessage()).toBe('Hold steady...');

        // Set both conditions
        triggerDeviceOrientation(20, 0);
        jest.advanceTimersByTime(200);
        triggerDeviceOrientation(21, 1);
        jest.advanceTimersByTime(200);

        expect(service.statusMessage()).toBe('Ready to scan');
      });

      it('should show error message for FAILED stage', () => {
        (service as any)._stage.set('FAILED');
        (service as any)._error.set('Test error message');

        expect(service.statusMessage()).toBe('Test error message');
      });

      it('should show default failed message when no error set', () => {
        (service as any)._stage.set('FAILED');
        (service as any)._error.set(null);

        expect(service.statusMessage()).toBe('Something went wrong');
      });
    });
  });

  // ===================================
  // 🎯 INTEGRATION SCENARIO TESTS
  // ===================================

  describe('🎯 Integration Scenarios', () => {
    describe('Happy Path - Complete Success Flow', () => {
      it('should complete full check-in flow successfully', async () => {
        // Start check-in
        await service.startCheckin('test-pub-123');
        await service.setVideoElement(mockVideoElement as any);

        expect(service.stage()).toBe('SCANNING');

        // Simulate user meeting conditions
        triggerDeviceOrientation(20, 0);
        jest.advanceTimersByTime(200);
        triggerDeviceOrientation(21, 1);
        jest.advanceTimersByTime(200);
        jest.advanceTimersByTime(500);

        await jest.runOnlyPendingTimers();

        // Verify final state
        expect(service.stage()).toBe('SUCCESS');
        expect(mockCheckinStore.checkinToPub).toHaveBeenCalledWith('test-pub-123');
      });
    });

    describe('Error Recovery Scenarios', () => {
      it('should recover from camera error through retry', async () => {
        // Initial failure
        mockMediaDevices.getUserMedia.mockRejectedValueOnce(new Error('Camera busy'));
        await service.startCheckin('test-pub-123');
        expect(service.stage()).toBe('FAILED');

        // Successful retry
        mockMediaDevices.getUserMedia.mockResolvedValueOnce(mockMediaStream);
        await service.retryCheckin();
        expect(service.stage()).toBe('SCANNING');
      });

      it('should handle network interruption during processing', async () => {
        mockCheckinStore.checkinToPub.mockRejectedValueOnce(new Error('Network error'));

        await service.startCheckin('test-pub-123');
        await service.setVideoElement(mockVideoElement as any);

        triggerDeviceOrientation(20, 0);
        jest.advanceTimersByTime(200);
        triggerDeviceOrientation(21, 1);
        jest.advanceTimersByTime(200);
        jest.advanceTimersByTime(500);

        await jest.runOnlyPendingTimers();

        expect(service.stage()).toBe('FAILED');
        expect(service.error()).toBe('Check-in failed');
      });
    });

    describe('Edge Case Scenarios', () => {
      it('should handle rapid condition changes', async () => {
        await service.startCheckin('test-pub-123');

        // Rapidly change conditions
        for (let i = 0; i < 10; i++) {
          triggerDeviceOrientation(20 + i, i);
          jest.advanceTimersByTime(50);
        }

        // Should handle without errors
        expect(service.stage()).toBe('SCANNING');
      });

      it('should handle component destruction during operation', async () => {
        await service.startCheckin('test-pub-123');

        // Simulate conditions met
        triggerDeviceOrientation(20, 0);
        jest.advanceTimersByTime(200);
        triggerDeviceOrientation(21, 1);
        jest.advanceTimersByTime(200);

        // Destroy before capture completes
        service.cleanup();

        // Advance past capture timeout
        jest.advanceTimersByTime(500);
        await jest.runOnlyPendingTimers();

        // Should be in clean state
        expect(service.stage()).toBe('INITIALIZING');
        expect(service.pubId()).toBeNull();
      });
    });

    describe('Environment Flag Integration', () => {
      it('should skip LLM check in development mode', async () => {
        environment.LLM_CHECK = false;

        await service.startCheckin('test-pub-123');
        await service.setVideoElement(mockVideoElement as any);

        triggerDeviceOrientation(20, 0);
        jest.advanceTimersByTime(200);
        triggerDeviceOrientation(21, 1);
        jest.advanceTimersByTime(200);
        jest.advanceTimersByTime(500);

        await jest.runOnlyPendingTimers();

        expect(mockLLMService.detectCarpet).not.toHaveBeenCalled();
        expect(service.stage()).toBe('SUCCESS');
      });

      it('should use LLM check in production mode', async () => {
        environment.LLM_CHECK = true;
        mockLLMService.detectCarpet.mockResolvedValue({
          success: true,
          data: { isCarpet: true },
        });

        await service.startCheckin('test-pub-123');
        await service.setVideoElement(mockVideoElement as any);

        triggerDeviceOrientation(20, 0);
        jest.advanceTimersByTime(200);
        triggerDeviceOrientation(21, 1);
        jest.advanceTimersByTime(200);
        jest.advanceTimersByTime(500);

        await jest.runOnlyPendingTimers();

        // Allow additional async operations (storage, check-in processing) to complete
        jest.advanceTimersByTime(100);
        await jest.runOnlyPendingTimers();

        expect(mockLLMService.detectCarpet).toHaveBeenCalled();
        expect(service.stage()).toBe('SUCCESS');
      });
    });
  });
});
