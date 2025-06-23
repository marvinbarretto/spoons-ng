import { TestBed } from '@angular/core/testing';
import { CameraService, CameraState } from './camera.service';

describe('CameraService', () => {
  let service: CameraService;
  let mockMediaDevices: jest.Mocked<MediaDevices>;
  let mockStream: jest.Mocked<MediaStream>;
  let mockTrack: jest.Mocked<MediaStreamTrack>;
  let mockVideoElement: jest.Mocked<HTMLVideoElement>;

  beforeEach(() => {
    // Mock MediaStreamTrack
    mockTrack = {
      stop: jest.fn(),
      kind: 'video',
      label: 'mock-camera',
      readyState: 'live'
    } as any;

    // Mock MediaStream
    mockStream = {
      id: 'mock-stream-id',
      getTracks: jest.fn().mockReturnValue([mockTrack]),
      getVideoTracks: jest.fn().mockReturnValue([mockTrack]),
      getAudioTracks: jest.fn().mockReturnValue([])
    } as any;

    // Mock MediaDevices
    mockMediaDevices = {
      getUserMedia: jest.fn().mockResolvedValue(mockStream)
    } as any;

    // Mock HTMLVideoElement
    mockVideoElement = {
      srcObject: null,
      pause: jest.fn(),
      load: jest.fn()
    } as any;

    // Mock global navigator
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: mockMediaDevices,
      writable: true
    });

    TestBed.configureTestingModule({});
    service = TestBed.inject(CameraService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should be created with correct initial state', () => {
      expect(service).toBeTruthy();
      expect(service.currentState).toEqual({
        isActive: false,
        hasPermission: false,
        error: null,
        streamId: null
      });
      expect(service.currentStream).toBeNull();
      expect(service.isActive).toBe(false);
    });
  });

  describe('requestCamera()', () => {
    it('should successfully request camera access', async () => {
      const result = await service.requestCamera();

      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: true,
        audio: false
      });
      expect(result).toBe(mockStream);
      expect(service.currentStream).toBe(mockStream);
      expect(service.currentState).toEqual({
        isActive: true,
        hasPermission: true,
        error: null,
        streamId: 'mock-stream-id'
      });
    });

    it('should reuse existing stream when already active', async () => {
      // First request
      await service.requestCamera();
      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledTimes(1);

      // Second request should reuse stream
      const result = await service.requestCamera();
      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledTimes(1); // Not called again
      expect(result).toBe(mockStream);
    });

    it('should handle camera access errors', async () => {
      const error = new Error('Camera not found');
      mockMediaDevices.getUserMedia.mockRejectedValueOnce(error);

      await expect(service.requestCamera()).rejects.toThrow('Camera not found');
      
      expect(service.currentState).toEqual({
        isActive: false,
        hasPermission: false,
        error: 'Camera not found',
        streamId: null
      });
    });

    it('should accept custom constraints', async () => {
      const customConstraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 }
        },
        audio: true
      };

      await service.requestCamera(customConstraints);

      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith(customConstraints);
    });
  });

  describe('releaseCamera()', () => {
    beforeEach(async () => {
      // Set up active camera
      await service.requestCamera();
      jest.clearAllMocks();
    });

    it('should stop all tracks when releasing camera', async () => {
      await service.releaseCamera();

      expect(mockTrack.stop).toHaveBeenCalled();
      expect(service.currentStream).toBeNull();
      expect(service.currentState.isActive).toBe(false);
    });

    it('should handle release when no stream is active', async () => {
      // Release the stream first
      await service.releaseCamera();
      jest.clearAllMocks();

      // Try to release again
      await service.releaseCamera();

      // Should exit early without attempting cleanup
      expect(mockTrack.stop).not.toHaveBeenCalled();
    });

    it('should force cleanup when force=true', async () => {
      // Release the stream first
      await service.releaseCamera();
      jest.clearAllMocks();

      // Force release should proceed even without active stream
      await expect(service.releaseCamera(true)).resolves.toBeUndefined();
    });

    it('should properly stop stream tracks', async () => {
      await service.releaseCamera();

      expect(mockTrack.stop).toHaveBeenCalled();
      expect(service.currentStream).toBeNull();
    });

    it('should handle cleanup errors gracefully', async () => {
      mockTrack.stop.mockImplementation(() => {
        throw new Error('Stop failed');
      });

      await service.releaseCamera();

      // Should still update state even if cleanup fails
      expect(service.currentState.isActive).toBe(false);
      expect(service.currentState.hasPermission).toBe(false);
      expect(service.currentState.error).toBe('Stop failed');
    });
  });

  describe('attachToVideoElement()', () => {
    beforeEach(async () => {
      await service.requestCamera();
    });

    it('should attach stream to video element', () => {
      service.attachToVideoElement(mockVideoElement, mockStream);

      expect(mockVideoElement.srcObject).toBe(mockStream);
    });

    it('should clean up previous video element when attaching new one', () => {
      const oldVideoElement = {
        srcObject: mockStream,
        pause: jest.fn(),
        load: jest.fn()
      } as any;

      // Attach to first element
      service.attachToVideoElement(oldVideoElement, mockStream);
      
      // Attach to second element
      service.attachToVideoElement(mockVideoElement, mockStream);

      expect(oldVideoElement.pause).toHaveBeenCalled();
      expect(oldVideoElement.srcObject).toBeNull();
      expect(mockVideoElement.srcObject).toBe(mockStream);
    });
  });

  describe('emergencyCleanup()', () => {
    it('should perform emergency cleanup', async () => {
      await service.emergencyCleanup();

      // Should call getUserMedia for emergency stream and immediately stop it
      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: true,
        audio: false
      });
      expect(mockTrack.stop).toHaveBeenCalled();
      
      // Should reset all state
      expect(service.currentStream).toBeNull();
      expect(service.currentState).toEqual({
        isActive: false,
        hasPermission: false,
        error: null,
        streamId: null
      });
    });

    it('should handle emergency cleanup failure', async () => {
      mockMediaDevices.getUserMedia.mockRejectedValueOnce(new Error('Emergency failed'));

      // Should not throw error
      await expect(service.emergencyCleanup()).resolves.toBeUndefined();
    });
  });

  describe('State Management', () => {
    it('should emit state changes through observable', (done) => {
      const states: CameraState[] = [];
      
      service.state$.subscribe(state => {
        states.push(state);
        
        if (states.length === 2) {
          // Initial state
          expect(states[0]).toEqual({
            isActive: false,
            hasPermission: false,
            error: null,
            streamId: null
          });
          
          // After camera request
          expect(states[1]).toEqual({
            isActive: true,
            hasPermission: true,
            error: null,
            streamId: 'mock-stream-id'
          });
          
          done();
        }
      });

      service.requestCamera();
    });
  });

  describe('Multiple Cleanup Attempts', () => {
    beforeEach(async () => {
      await service.requestCamera();
    });

    it('should limit emergency cleanup attempts', async () => {
      // Perform multiple release attempts to test the limit
      await service.releaseCamera(true); // Attempt 1
      await service.releaseCamera(true); // Attempt 2  
      await service.releaseCamera(true); // Attempt 3
      
      // Clear mocks to test 4th attempt
      jest.clearAllMocks();
      
      // 4th attempt should not trigger emergency cleanup (exceeds MAX_CLEANUP_ATTEMPTS)
      await service.releaseCamera(true); // Attempt 4
      
      // Should not call getUserMedia for emergency cleanup on 4th attempt
      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledTimes(0);
    });
  });

  describe('Stream Reuse Prevention', () => {
    it('should reuse stream when already active', async () => {
      // First request
      const stream1 = await service.requestCamera();
      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
      
      // Second request should reuse existing stream
      const stream2 = await service.requestCamera();
      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledTimes(1); // Still 1
      
      expect(stream1).toBe(stream2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing navigator.mediaDevices', async () => {
      // Override the mock to simulate missing mediaDevices
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: undefined,
        writable: true
      });

      await expect(service.requestCamera()).rejects.toThrow();
    });

    it('should handle stream with no tracks gracefully', async () => {
      // Mock a stream with no tracks
      const emptyStream = {
        id: 'empty-stream',
        getTracks: jest.fn().mockReturnValue([])
      } as any;
      
      mockMediaDevices.getUserMedia.mockResolvedValueOnce(emptyStream);
      
      const stream = await service.requestCamera();
      expect(stream).toBe(emptyStream);
      
      // Should handle cleanup of empty stream without errors
      await expect(service.releaseCamera()).resolves.toBeUndefined();
    });
  });
});