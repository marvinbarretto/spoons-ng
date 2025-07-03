import { TestBed } from '@angular/core/testing';
import { FeedbackService } from './feedback.service';
import { FirestoreCrudService } from '../../shared/data-access/firestore-crud.service';
import { Feedback, CreateFeedbackInput, FeedbackType } from '../utils/feedback.model';

// Mock FirestoreCrudService
const mockFirestoreCrudService = {
  create: jest.fn(),
  getDocsWhere: jest.fn(),
  update: jest.fn()
};

describe('FeedbackService', () => {
  let service: FeedbackService;

  const mockUserId = 'test-user-id';
  const mockUserEmail = 'test@example.com';
  const mockUserDisplayName = 'Test User';

  const mockCreateFeedbackInput: CreateFeedbackInput = {
    type: 'bug' as FeedbackType,
    message: 'Test feedback message',
    screenshot: new Blob(['fake screenshot'], { type: 'image/png' })
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        FeedbackService,
        { provide: FirestoreCrudService, useValue: mockFirestoreCrudService }
      ]
    });

    service = TestBed.inject(FeedbackService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('submitFeedback', () => {
    beforeEach(() => {
      mockFirestoreCrudService.create.mockResolvedValue(undefined);
      jest.spyOn(service as any, 'uploadScreenshot').mockResolvedValue('mock-screenshot-url');
    });

    it('should create feedback with all required fields', async () => {
      const result = await service.submitFeedback(
        mockCreateFeedbackInput,
        mockUserId,
        mockUserEmail,
        mockUserDisplayName
      );

      expect(result).toEqual({ id: expect.any(String) });
      expect(mockFirestoreCrudService.create).toHaveBeenCalledTimes(1);

      const createdFeedback = mockFirestoreCrudService.create.mock.calls[0][0] as Feedback;
      expect(createdFeedback).toEqual(expect.objectContaining({
        id: expect.any(String),
        userId: mockUserId,
        userEmail: mockUserEmail,
        userDisplayName: mockUserDisplayName,
        type: 'bug',
        message: 'Test feedback message',
        screenshotUrl: 'mock-screenshot-url',
        context: expect.objectContaining({
          userAgent: expect.any(String),
          currentUrl: expect.any(String),
          viewport: expect.objectContaining({
            width: expect.any(Number),
            height: expect.any(Number)
          }),
          timestamp: expect.any(Date)
        }),
        status: 'pending',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      }));
    });

    it('should handle feedback without screenshot', async () => {
      const inputWithoutScreenshot: CreateFeedbackInput = {
        type: 'suggestion',
        message: 'Test suggestion'
      };

      const result = await service.submitFeedback(
        inputWithoutScreenshot,
        mockUserId,
        mockUserEmail,
        mockUserDisplayName
      );

      expect(result).toEqual({ id: expect.any(String) });
      const createdFeedback = mockFirestoreCrudService.create.mock.calls[0][0] as Feedback;
      expect(createdFeedback.screenshotUrl).toBeUndefined();
    });

    it('should handle empty user email', async () => {
      await service.submitFeedback(
        mockCreateFeedbackInput,
        mockUserId,
        undefined,
        mockUserDisplayName
      );

      const createdFeedback = mockFirestoreCrudService.create.mock.calls[0][0] as Feedback;
      expect(createdFeedback.userEmail).toBe('');
    });

    it('should generate unique feedback IDs', async () => {
      const result1 = await service.submitFeedback(
        mockCreateFeedbackInput,
        mockUserId,
        mockUserEmail,
        mockUserDisplayName
      );

      const result2 = await service.submitFeedback(
        mockCreateFeedbackInput,
        mockUserId,
        mockUserEmail,
        mockUserDisplayName
      );

      expect(result1.id).not.toBe(result2.id);
    });
  });

  describe('getUserFeedback', () => {
    const mockFeedbackList: Feedback[] = [
      {
        id: 'feedback-1',
        userId: mockUserId,
        userEmail: mockUserEmail,
        userDisplayName: mockUserDisplayName,
        type: 'bug',
        message: 'Test bug report',
        context: {
          userAgent: 'test-agent',
          currentUrl: 'test-url',
          viewport: { width: 1920, height: 1080 },
          timestamp: new Date()
        },
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    it('should return user feedback ordered by creation date', async () => {
      mockFirestoreCrudService.getDocsWhere.mockResolvedValue(mockFeedbackList);

      const result = await service.getUserFeedback(mockUserId);

      expect(result).toEqual(mockFeedbackList);
      expect(mockFirestoreCrudService.getDocsWhere).toHaveBeenCalledWith(
        'feedback',
        expect.any(Object), // where clause
        expect.any(Object)  // orderBy clause
      );
    });
  });

  describe('getPendingFeedback', () => {
    it('should return pending feedback ordered by creation date', async () => {
      const mockPendingFeedback = [
        { id: '1', status: 'pending' },
        { id: '2', status: 'pending' }
      ] as Feedback[];

      mockFirestoreCrudService.getDocsWhere.mockResolvedValue(mockPendingFeedback);

      const result = await service.getPendingFeedback();

      expect(result).toEqual(mockPendingFeedback);
      expect(mockFirestoreCrudService.getDocsWhere).toHaveBeenCalledWith(
        'feedback',
        expect.any(Object), // where clause
        expect.any(Object)  // orderBy clause
      );
    });
  });

  describe('updateFeedbackStatus', () => {
    const feedbackId = 'test-feedback-id';
    const newStatus = 'resolved';
    const adminNotes = 'Fixed in version 1.2.3';

    it('should update feedback status without admin notes', async () => {
      mockFirestoreCrudService.update.mockResolvedValue(undefined);

      await service.updateFeedbackStatus(feedbackId, newStatus);

      expect(mockFirestoreCrudService.update).toHaveBeenCalledWith(feedbackId, {
        status: newStatus,
        updatedAt: expect.any(Date)
      });
    });

    it('should update feedback status with admin notes', async () => {
      mockFirestoreCrudService.update.mockResolvedValue(undefined);

      await service.updateFeedbackStatus(feedbackId, newStatus, adminNotes);

      expect(mockFirestoreCrudService.update).toHaveBeenCalledWith(feedbackId, {
        status: newStatus,
        updatedAt: expect.any(Date),
        adminNotes: adminNotes
      });
    });
  });

  describe('uploadScreenshot', () => {
    it('should convert blob to base64 data URL', async () => {
      const mockBlob = new Blob(['test content'], { type: 'image/png' });
      const mockDataUrl = 'data:image/png;base64,dGVzdCBjb250ZW50';

      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: jest.fn(),
        result: mockDataUrl,
        onloadend: null as any,
        onerror: null as any
      };

      global.FileReader = jest.fn(() => mockFileReader) as any;

      const uploadPromise = (service as any).uploadScreenshot(mockBlob, mockUserId);

      // Simulate successful file read
      if (mockFileReader.onloadend) {
        mockFileReader.onloadend();
      }

      const result = await uploadPromise;

      expect(result).toBe(mockDataUrl);
      expect(mockFileReader.readAsDataURL).toHaveBeenCalledWith(mockBlob);
    });

    it('should handle file reader errors', async () => {
      const mockBlob = new Blob(['test content'], { type: 'image/png' });
      const mockError = new Error('File read error');

      const mockFileReader = {
        readAsDataURL: jest.fn(),
        result: null,
        onloadend: null as any,
        onerror: null as any
      };

      global.FileReader = jest.fn(() => mockFileReader) as any;

      const uploadPromise = (service as any).uploadScreenshot(mockBlob, mockUserId);

      // Simulate file read error
      if (mockFileReader.onerror) {
        mockFileReader.onerror(mockError);
      }

      await expect(uploadPromise).rejects.toBe(mockError);
    });
  });
});
