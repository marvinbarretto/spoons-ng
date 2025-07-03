import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { FeedbackStore } from './feedback.store';
import { FeedbackService } from './feedback.service';
import { ToastService } from '../../shared/data-access/toast.service';
import { AuthStore } from '../../auth/data-access/auth.store';
import { Feedback, CreateFeedbackInput, FeedbackType } from '../utils/feedback.model';

// Mock services
const mockFeedbackService = {
  submitFeedback: jest.fn(),
  getUserFeedback: jest.fn(),
  updateFeedbackStatus: jest.fn()
};

const mockToastService = {
  success: jest.fn(),
  error: jest.fn()
};

const mockAuthStore = {
  user: signal(null)
};

describe('FeedbackStore', () => {
  let store: FeedbackStore;

  const mockUser = {
    uid: 'test-user-id',
    displayName: 'Test User',
    email: 'test@example.com',
    isAnonymous: false
  };

  const mockFeedback: Feedback = {
    id: 'feedback-1',
    userId: 'test-user-id',
    userEmail: 'test@example.com',
    userDisplayName: 'Test User',
    type: 'bug',
    message: 'Test feedback message',
    context: {
      userAgent: 'test-agent',
      currentUrl: 'test-url',
      viewport: { width: 1920, height: 1080 },
      timestamp: new Date()
    },
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockCreateFeedbackInput: CreateFeedbackInput = {
    type: 'bug' as FeedbackType,
    message: 'Test feedback message',
    screenshot: new Blob(['fake screenshot'], { type: 'image/png' })
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        FeedbackStore,
        { provide: FeedbackService, useValue: mockFeedbackService },
        { provide: ToastService, useValue: mockToastService },
        { provide: AuthStore, useValue: mockAuthStore }
      ]
    });

    store = TestBed.inject(FeedbackStore);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });

  describe('fetchData', () => {
    it('should fetch user feedback when user is authenticated', async () => {
      const mockFeedbackList = [mockFeedback];
      mockFeedbackService.getUserFeedback.mockResolvedValue(mockFeedbackList);

      // Set authenticated user
      mockAuthStore.user.set(mockUser);

      const result = await (store as any).fetchData();

      expect(result).toEqual(mockFeedbackList);
      expect(mockFeedbackService.getUserFeedback).toHaveBeenCalledWith('test-user-id');
    });

    it('should return empty array when user is not authenticated', async () => {
      mockAuthStore.user.set(null);

      const result = await (store as any).fetchData();

      expect(result).toEqual([]);
      expect(mockFeedbackService.getUserFeedback).not.toHaveBeenCalled();
    });
  });

  describe('submitFeedback', () => {
    beforeEach(() => {
      mockAuthStore.user.set(mockUser);
    });

    it('should successfully submit feedback', async () => {
      mockFeedbackService.submitFeedback.mockResolvedValue({ id: 'new-feedback-id' });

      const result = await store.submitFeedback(mockCreateFeedbackInput);

      expect(result).toEqual({
        success: true,
        feedbackId: 'new-feedback-id'
      });

      expect(mockFeedbackService.submitFeedback).toHaveBeenCalledWith(
        mockCreateFeedbackInput,
        'test-user-id',
        'test@example.com',
        'Test User'
      );

      expect(mockToastService.success).toHaveBeenCalledWith('Feedback submitted successfully!');
    });

    it('should handle user without email', async () => {
      const userWithoutEmail = { ...mockUser, email: undefined };
      mockAuthStore.user.set(userWithoutEmail);
      mockFeedbackService.submitFeedback.mockResolvedValue({ id: 'new-feedback-id' });

      await store.submitFeedback(mockCreateFeedbackInput);

      expect(mockFeedbackService.submitFeedback).toHaveBeenCalledWith(
        mockCreateFeedbackInput,
        'test-user-id',
        '',
        'Test User'
      );
    });

    it('should handle user without display name', async () => {
      const userWithoutDisplayName = { ...mockUser, displayName: '' };
      mockAuthStore.user.set(userWithoutDisplayName);
      mockFeedbackService.submitFeedback.mockResolvedValue({ id: 'new-feedback-id' });

      await store.submitFeedback(mockCreateFeedbackInput);

      expect(mockFeedbackService.submitFeedback).toHaveBeenCalledWith(
        mockCreateFeedbackInput,
        'test-user-id',
        'test@example.com',
        'Anonymous'
      );
    });

    it('should return error when user is not authenticated', async () => {
      mockAuthStore.user.set(null);

      const result = await store.submitFeedback(mockCreateFeedbackInput);

      expect(result).toEqual({
        success: false,
        error: 'User not authenticated'
      });

      expect(mockFeedbackService.submitFeedback).not.toHaveBeenCalled();
      expect(mockToastService.success).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      mockFeedbackService.submitFeedback.mockRejectedValue(error);

      const result = await store.submitFeedback(mockCreateFeedbackInput);

      expect(result).toEqual({
        success: false,
        error: 'Service error'
      });

      expect(mockToastService.error).toHaveBeenCalledWith('Service error');
    });

    it('should add new feedback to local state optimistically', async () => {
      mockFeedbackService.submitFeedback.mockResolvedValue({ id: 'new-feedback-id' });

      // Spy on addItem to verify it's called
      const addItemSpy = jest.spyOn(store as any, 'addItem');

      await store.submitFeedback(mockCreateFeedbackInput);

      expect(addItemSpy).toHaveBeenCalledWith(expect.objectContaining({
        id: 'new-feedback-id',
        userId: 'test-user-id',
        type: 'bug',
        message: 'Test feedback message',
        status: 'pending'
      }));
    });
  });

  describe('updateFeedbackStatus', () => {
    const feedbackId = 'test-feedback-id';
    const newStatus = 'resolved';
    const adminNotes = 'Fixed in version 1.2.3';

    beforeEach(() => {
      // Set up some initial data
      (store as any)._data.set([mockFeedback]);
    });

    it('should successfully update feedback status', async () => {
      mockFeedbackService.updateFeedbackStatus.mockResolvedValue(undefined);

      await store.updateFeedbackStatus(feedbackId, newStatus, adminNotes);

      expect(mockFeedbackService.updateFeedbackStatus).toHaveBeenCalledWith(
        feedbackId,
        newStatus,
        adminNotes
      );

      expect(mockToastService.success).toHaveBeenCalledWith('Feedback status updated');
    });

    it('should handle service errors', async () => {
      const error = new Error('Update failed');
      mockFeedbackService.updateFeedbackStatus.mockRejectedValue(error);

      await store.updateFeedbackStatus(feedbackId, newStatus);

      expect(mockToastService.error).toHaveBeenCalledWith('Update failed');
    });
  });

  describe('computed signals', () => {
    beforeEach(() => {
      const mockFeedbackData: Feedback[] = [
        { ...mockFeedback, id: '1', type: 'bug', status: 'pending' },
        { ...mockFeedback, id: '2', type: 'suggestion', status: 'resolved' },
        { ...mockFeedback, id: '3', type: 'confusion', status: 'pending' },
        { ...mockFeedback, id: '4', type: 'bug', status: 'resolved' }
      ];

      (store as any)._data.set(mockFeedbackData);
    });

    it('should filter bug reports correctly', () => {
      const bugReports = store.bugReports();
      expect(bugReports).toHaveLength(2);
      expect(bugReports.every(f => f.type === 'bug')).toBe(true);
    });

    it('should filter suggestions correctly', () => {
      const suggestions = store.suggestions();
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].type).toBe('suggestion');
    });

    it('should filter confusions correctly', () => {
      const confusions = store.confusions();
      expect(confusions).toHaveLength(1);
      expect(confusions[0].type).toBe('confusion');
    });

    it('should filter pending feedback correctly', () => {
      const pending = store.pendingFeedback();
      expect(pending).toHaveLength(2);
      expect(pending.every(f => f.status === 'pending')).toBe(true);
    });

    it('should filter resolved feedback correctly', () => {
      const resolved = store.resolvedFeedback();
      expect(resolved).toHaveLength(2);
      expect(resolved.every(f => f.status === 'resolved')).toBe(true);
    });
  });
});
