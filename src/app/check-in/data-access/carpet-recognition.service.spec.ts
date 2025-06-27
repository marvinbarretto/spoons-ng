import { TestBed } from '@angular/core/testing';
import { CarpetRecognitionService } from './carpet-recognition.service';
import { CameraService } from '../../shared/data-access/camera.service';
import { LLMService } from '../../shared/data-access/llm.service';

// Mock services
const mockCameraService = {
  requestCamera: jest.fn(),
  attachToVideoElement: jest.fn(),
  releaseCamera: jest.fn()
};

const mockLLMService = {
  isCarpet: jest.fn()
};

// Mock DeviceOrientationEvent constructor since it's not available in test environment
global.DeviceOrientationEvent = jest.fn() as any;

describe('CarpetRecognitionService', () => {
  let service: CarpetRecognitionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CarpetRecognitionService,
        { provide: CameraService, useValue: mockCameraService },
        { provide: LLMService, useValue: mockLLMService }
      ]
    });
    service = TestBed.inject(CarpetRecognitionService);
    jest.clearAllMocks();
    
    // Reset Date.now mock
    jest.spyOn(Date, 'now').mockRestore();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('device stability detection', () => {
    beforeEach(() => {
      // Create a spy on the private _handleOrientation method by accessing it through the service
      jest.spyOn(service as any, '_updateData');
    });

    it('should detect device becomes stable when movement is within threshold', () => {
      const mockNow = jest.spyOn(Date, 'now');
      mockNow.mockReturnValue(1000);

      // First orientation event - device starts moving
      (service as any)._handleOrientation({
        alpha: 0,
        beta: 90,
        gamma: 0
      });

      mockNow.mockReturnValue(1100); // 100ms later

      // Second orientation event - similar position (within 5° threshold)
      (service as any)._handleOrientation({
        alpha: 0,
        beta: 92, // 2° difference - within threshold
        gamma: 1  // 1° difference - within threshold
      });

      // Should start stability timer but not be stable yet
      expect(service.data().deviceStable).toBe(false);
    });

    it('should mark device as stable after 3 seconds of stability', () => {
      const mockNow = jest.spyOn(Date, 'now');
      mockNow.mockReturnValue(1000);

      // First event - establish baseline
      (service as any)._handleOrientation({
        alpha: 0,
        beta: 90,
        gamma: 0
      });

      mockNow.mockReturnValue(1100); // 100ms later

      // Second event - similar position to start stability timer
      (service as any)._handleOrientation({
        alpha: 0,
        beta: 91, // 1° difference - starts stability tracking
        gamma: 1  // 1° difference
      });

      // Should not be stable yet
      expect(service.data().deviceStable).toBe(false);

      mockNow.mockReturnValue(4200); // 3100ms after stability started (> 3000ms threshold)

      // Third event - still stable
      (service as any)._handleOrientation({
        alpha: 0,
        beta: 92, // Still within threshold
        gamma: 2  // Still within threshold
      });

      // Should now be marked as stable
      expect(service.data().deviceStable).toBe(true);
    });

    it('should reset stability when device movement exceeds threshold', () => {
      const mockNow = jest.spyOn(Date, 'now');
      mockNow.mockReturnValue(1000);

      // Establish stable state (following same pattern as previous test)
      (service as any)._handleOrientation({
        alpha: 0,
        beta: 90,
        gamma: 0
      });

      mockNow.mockReturnValue(1100);

      (service as any)._handleOrientation({
        alpha: 0,
        beta: 91,
        gamma: 1
      });

      mockNow.mockReturnValue(4200); // 3100ms after stability started

      (service as any)._handleOrientation({
        alpha: 0,
        beta: 92,
        gamma: 2
      });

      expect(service.data().deviceStable).toBe(true);

      mockNow.mockReturnValue(2300);

      // Large movement - exceeds 5° threshold
      (service as any)._handleOrientation({
        alpha: 0,
        beta: 98, // 6° difference from last (92 -> 98)
        gamma: 8  // 6° difference from last (2 -> 8)
      });

      // Should reset stability
      expect(service.data().deviceStable).toBe(false);
    });
  });

  describe('LLM integration', () => {
    it('should trigger LLM detection when device becomes stable', async () => {
      mockLLMService.isCarpet.mockResolvedValue(true);
      
      const mockNow = jest.spyOn(Date, 'now');
      mockNow.mockReturnValue(1000);

      // Mock video element for LLM detection
      const mockVideoElement = {
        videoWidth: 640,
        videoHeight: 480
      };
      (service as any)._videoElement = mockVideoElement;

      // Mock canvas for image capture
      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: jest.fn().mockReturnValue({
          drawImage: jest.fn()
        }),
        toDataURL: jest.fn().mockReturnValue('data:image/jpeg;base64,fake-data')
      };
      jest.spyOn(document, 'createElement').mockReturnValue(mockCanvas as any);

      // Follow the correct flow to become stable
      (service as any)._handleOrientation({
        alpha: 0,
        beta: 90,
        gamma: 0
      });

      mockNow.mockReturnValue(1100);

      (service as any)._handleOrientation({
        alpha: 0,
        beta: 91,
        gamma: 1
      });

      mockNow.mockReturnValue(4200); // Device becomes stable

      (service as any)._handleOrientation({
        alpha: 0,
        beta: 92,
        gamma: 2
      });

      // Wait for async LLM detection to complete
      await new Promise(resolve => setTimeout(resolve, 0));

      // Should have completed LLM detection
      expect(mockLLMService.isCarpet).toHaveBeenCalled();
      expect(service.data().llmCarpetDetected).toBe(true);
    });

    it('should update LLM detection results', async () => {
      mockLLMService.isCarpet.mockResolvedValue(true);

      // Manually trigger LLM detection
      const mockVideoElement = {
        videoWidth: 640,
        videoHeight: 480
      };
      (service as any)._videoElement = mockVideoElement;

      // Mock canvas creation for image capture
      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: jest.fn().mockReturnValue({
          drawImage: jest.fn()
        }),
        toDataURL: jest.fn().mockReturnValue('data:image/jpeg;base64,fake-data')
      };
      jest.spyOn(document, 'createElement').mockReturnValue(mockCanvas as any);

      await (service as any)._triggerLLMDetection();

      expect(service.data().llmCarpetDetected).toBe(true);
      expect(service.data().llmProcessing).toBe(false);
      expect(service.data().llmLastResult).toBe('Carpet detected');
    });

    it('should handle LLM detection failure gracefully', async () => {
      mockLLMService.isCarpet.mockRejectedValue(new Error('API Error'));

      const mockVideoElement = {
        videoWidth: 640,
        videoHeight: 480
      };
      (service as any)._videoElement = mockVideoElement;

      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: jest.fn().mockReturnValue({
          drawImage: jest.fn()
        }),
        toDataURL: jest.fn().mockReturnValue('data:image/jpeg;base64,fake-data')
      };
      jest.spyOn(document, 'createElement').mockReturnValue(mockCanvas as any);

      await (service as any)._triggerLLMDetection();

      expect(service.data().llmCarpetDetected).toBe(false);
      expect(service.data().llmProcessing).toBe(false);
      expect(service.data().llmLastResult).toContain('Error: API Error');
    });
  });

  describe('decision logic', () => {
    it('should require all conditions for check-in: orientation, stability, and carpet detection', () => {
      // Set up good orientation
      (service as any)._updateData({
        isPhoneDown: true,
        orientationConfidence: 0.8,
        deviceStable: true,
        llmCarpetDetected: true,
        hasTexture: false,
        isSharp: true
      });

      (service as any)._calculateDecision();

      expect(service.data().canCheckIn).toBe(true);
    });

    it('should fail check-in when device is not stable', () => {
      (service as any)._updateData({
        isPhoneDown: true,
        orientationConfidence: 0.8,
        deviceStable: false, // Not stable
        llmCarpetDetected: true,
        hasTexture: true,
        isSharp: true
      });

      (service as any)._calculateDecision();

      expect(service.data().canCheckIn).toBe(false);
    });

    it('should fail check-in when no carpet detected', () => {
      (service as any)._updateData({
        isPhoneDown: true,
        orientationConfidence: 0.8,
        deviceStable: true,
        llmCarpetDetected: false, // No carpet
        hasTexture: false,
        isSharp: true
      });

      (service as any)._calculateDecision();

      expect(service.data().canCheckIn).toBe(false);
    });

    it('should use LLM detection over local texture analysis', () => {
      (service as any)._updateData({
        isPhoneDown: true,
        orientationConfidence: 0.8,
        deviceStable: true,
        llmCarpetDetected: true, // LLM says yes
        hasTexture: false, // Local analysis says no
        isSharp: true
      });

      (service as any)._calculateDecision();

      expect(service.data().canCheckIn).toBe(true);
    });
  });

  describe('resetCapture', () => {
    it('should reset all stability and LLM tracking state', () => {
      // Set up some state
      (service as any)._updateData({
        deviceStable: true,
        llmCarpetDetected: true,
        llmProcessing: true,
        llmLastResult: 'Previous result'
      });

      service.resetCapture();

      expect(service.data().deviceStable).toBe(false);
      expect(service.data().llmCarpetDetected).toBe(false);
      expect(service.data().llmProcessing).toBe(false);
      expect(service.data().llmLastResult).toBe(null);
    });
  });
});
