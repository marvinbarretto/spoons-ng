// src/app/new-checkin/data-access/__tests__/new-checkin.store.spec.ts

import { TestBed } from '@angular/core/testing';
import { NewCheckinStore } from './new-checkin.store';
import { NewCheckinService } from './new-checkin.service';

describe('NewCheckinStore', () => {
  let store: NewCheckinStore;
  let mockService: jest.Mocked<NewCheckinService>;

  beforeEach(() => {
    // Create Jest mock for NewCheckinService
    const serviceMock = {
      canCheckIn: jest.fn(),
      createCheckin: jest.fn()
    } as jest.Mocked<Partial<NewCheckinService>>;

    TestBed.configureTestingModule({
      providers: [
        NewCheckinStore,
        { provide: NewCheckinService, useValue: serviceMock }
      ]
    });

    store = TestBed.inject(NewCheckinStore);
    mockService = TestBed.inject(NewCheckinService) as jest.Mocked<NewCheckinService>;
  });

  describe('🏗️ Store Setup', () => {
    it('should create store', () => {
      expect(store).toBeTruthy();
    });

    it('should initialize with processing = false', () => {
      expect(store.isProcessing()).toBe(false);
    });

    it('should inject NewCheckinService dependency', () => {
      expect(mockService).toBeTruthy();
    });
  });

  describe('🎯 checkinToPub() - Orchestration Flow', () => {
    it('should complete successful check-in flow', async () => {
      // Arrange
      const pubId = 'test-pub-123';
      mockService.canCheckIn.mockResolvedValue({ allowed: true });
      mockService.createCheckin.mockResolvedValue(undefined);

      // Act
      await store.checkinToPub(pubId);

      // Assert - Verify service calls
      expect(mockService.canCheckIn).toHaveBeenCalledWith(pubId);
      expect(mockService.createCheckin).toHaveBeenCalledWith(pubId);

      // Assert - Processing state returned to false
      expect(store.isProcessing()).toBe(false);
    });

    it('should handle validation failure correctly', async () => {
      // Arrange
      const pubId = 'test-pub-123';
      const validationError = { allowed: false, reason: 'Too far away' };
      mockService.canCheckIn.mockResolvedValue(validationError);

      // Act & Assert
      await expect(store.checkinToPub(pubId))
        .rejects.toThrow('Too far away');

      // Assert - Service calls
      expect(mockService.canCheckIn).toHaveBeenCalledWith(pubId);
      expect(mockService.createCheckin).not.toHaveBeenCalled(); // Should not proceed to creation

      // Assert - Processing state returned to false
      expect(store.isProcessing()).toBe(false);
    });

    it('should handle creation failure correctly', async () => {
      // Arrange
      const pubId = 'test-pub-123';
      mockService.canCheckIn.mockResolvedValue({ allowed: true });
      mockService.createCheckin.mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(store.checkinToPub(pubId))
        .rejects.toThrow('Network error');

      // Assert - Both service calls were made
      expect(mockService.canCheckIn).toHaveBeenCalledWith(pubId);
      expect(mockService.createCheckin).toHaveBeenCalledWith(pubId);

      // Assert - Processing state returned to false
      expect(store.isProcessing()).toBe(false);
    });
  });

  describe('🔄 Processing State Management', () => {
    it('should set processing to true during check-in', async () => {
      // Arrange
      const pubId = 'test-pub-123';
      let processingDuringCall = false;

      mockService.canCheckIn.mockImplementation(async () => {
        processingDuringCall = store.isProcessing();
        return { allowed: true };
      });
      mockService.createCheckin.mockResolvedValue(undefined);

      // Act
      await store.checkinToPub(pubId);

      // Assert
      expect(processingDuringCall).toBe(true);
      expect(store.isProcessing()).toBe(false); // Should be false after completion
    });

    it('should prevent concurrent check-ins', async () => {
      // Arrange
      const pubId = 'test-pub-123';
      mockService.canCheckIn.mockResolvedValue({ allowed: true });
      mockService.createCheckin.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100)) // Slow operation
      );

      // Act - Start first check-in
      const firstPromise = store.checkinToPub(pubId);

      // Act - Try to start second check-in immediately
      const secondPromise = store.checkinToPub(pubId);

      // Wait for both to complete
      await firstPromise;
      await secondPromise;

      // Assert - Service should only be called once
      expect(mockService.canCheckIn).toHaveBeenCalledTimes(1);
      expect(mockService.createCheckin).toHaveBeenCalledTimes(1);
    });

    it('should reset processing state even if validation fails', async () => {
      // Arrange
      const pubId = 'test-pub-123';
      mockService.canCheckIn.mockResolvedValue({
        allowed: false,
        reason: 'Already checked in today'
      });

      // Act
      try {
        await store.checkinToPub(pubId);
      } catch (error) {
        // Expected to throw
      }

      // Assert
      expect(store.isProcessing()).toBe(false);
    });

    it('should reset processing state even if creation fails', async () => {
      // Arrange
      const pubId = 'test-pub-123';
      mockService.canCheckIn.mockResolvedValue({ allowed: true });
      mockService.createCheckin.mockRejectedValue(new Error('Network error'));

      // Act
      try {
        await store.checkinToPub(pubId);
      } catch (error) {
        // Expected to throw
      }

      // Assert
      expect(store.isProcessing()).toBe(false);
    });
  });

  describe('🎯 Real-World Scenarios', () => {
    it('should handle Moon Under Water distance failure', async () => {
      // Arrange - Simulate your real testing scenario
      const pubId = 'moon-under-water-watford';
      mockService.canCheckIn.mockResolvedValue({
        allowed: false,
        reason: 'You are 729m away. Must be within 100m to check in.'
      });

      // Act & Assert
      await expect(store.checkinToPub(pubId))
        .rejects.toThrow('You are 729m away. Must be within 100m to check in.');

      expect(mockService.canCheckIn).toHaveBeenCalledWith(pubId);
      expect(mockService.createCheckin).not.toHaveBeenCalled();
    });

    it('should handle daily limit failure', async () => {
      // Arrange
      const pubId = 'test-pub-123';
      mockService.canCheckIn.mockResolvedValue({
        allowed: false,
        reason: 'You have already checked into this pub today'
      });

      // Act & Assert
      await expect(store.checkinToPub(pubId))
        .rejects.toThrow('You have already checked into this pub today');
    });

    it('should handle successful nearby check-in', async () => {
      // Arrange
      const pubId = 'nearby-pub-123';
      mockService.canCheckIn.mockResolvedValue({ allowed: true });
      mockService.createCheckin.mockResolvedValue(undefined);

      // Act & Assert - Should not throw
      await expect(store.checkinToPub(pubId)).resolves.toBeUndefined();

      expect(mockService.canCheckIn).toHaveBeenCalledWith(pubId);
      expect(mockService.createCheckin).toHaveBeenCalledWith(pubId);
    });
  });

  describe('🧪 Error Handling Edge Cases', () => {
    it('should handle service throwing unexpected errors', async () => {
      // Arrange
      const pubId = 'test-pub-123';
      mockService.canCheckIn.mockRejectedValue(new Error('Unexpected error'));

      // Act & Assert
      await expect(store.checkinToPub(pubId))
        .rejects.toThrow('Unexpected error');

      expect(store.isProcessing()).toBe(false);
    });

    it('should handle service returning malformed validation result', async () => {
      // Arrange
      const pubId = 'test-pub-123';
      // @ts-ignore - Intentionally malformed for testing
      mockService.canCheckIn.mockResolvedValue(null);

      // Act & Assert - Should handle gracefully
      await expect(store.checkinToPub(pubId)).rejects.toThrow();
      expect(store.isProcessing()).toBe(false);
    });

    it('should handle empty pubId', async () => {
      // Arrange
      const pubId = '';
      mockService.canCheckIn.mockResolvedValue({ allowed: true });
      mockService.createCheckin.mockResolvedValue(undefined);

      // Act & Assert - Should still call service (let service handle validation)
      await store.checkinToPub(pubId);

      expect(mockService.canCheckIn).toHaveBeenCalledWith('');
    });
  });

  describe('📊 Signal Reactivity', () => {
    it('should have reactive isProcessing signal', async () => {
      // Arrange
      const pubId = 'test-pub-123';
      const processingStates: boolean[] = [];

      // Create a simple signal subscription to track changes
      let currentProcessing = store.isProcessing();
      processingStates.push(currentProcessing);

      mockService.canCheckIn.mockImplementation(async () => {
        const processing = store.isProcessing();
        if (processing !== currentProcessing) {
          processingStates.push(processing);
          currentProcessing = processing;
        }
        return { allowed: true };
      });

      mockService.createCheckin.mockImplementation(async () => {
        const processing = store.isProcessing();
        if (processing !== currentProcessing) {
          processingStates.push(processing);
          currentProcessing = processing;
        }
      });

      // Act
      await store.checkinToPub(pubId);

      // Final state
      const finalProcessing = store.isProcessing();
      if (finalProcessing !== currentProcessing) {
        processingStates.push(finalProcessing);
      }

      // Assert - Should have seen: false → true → false
      expect(processingStates).toEqual([false, true, false]);
    });
  });

  describe('🔗 Service Integration Contract', () => {
    it('should call canCheckIn before createCheckin', async () => {
      // Arrange
      const pubId = 'test-pub-123';
      const callOrder: string[] = [];

      mockService.canCheckIn.mockImplementation(async () => {
        callOrder.push('validation');
        return { allowed: true };
      });

      mockService.createCheckin.mockImplementation(async () => {
        callOrder.push('creation');
      });

      // Act
      await store.checkinToPub(pubId);

      // Assert - Validation must come before creation
      expect(callOrder).toEqual(['validation', 'creation']);
    });

    it('should not call createCheckin if validation fails', async () => {
      // Arrange
      const pubId = 'test-pub-123';
      mockService.canCheckIn.mockResolvedValue({
        allowed: false,
        reason: 'Validation failed'
      });

      // Act
      try {
        await store.checkinToPub(pubId);
      } catch (error) {
        // Expected
      }

      // Assert
      expect(mockService.canCheckIn).toHaveBeenCalledTimes(1);
      expect(mockService.createCheckin).not.toHaveBeenCalled();
    });
  });

  describe('NewCheckinService - Query Methods', () => {
    let service: NewCheckinService;
    let mockFirestore: any;

    beforeEach(() => {
      const firestoreMock = {
        getDocsWhere: jest.fn()
      };

      TestBed.configureTestingModule({
        providers: [
          NewCheckinService,
          // Mock the inherited FirestoreService methods
          { provide: 'FirestoreService', useValue: firestoreMock }
        ]
      });

      service = TestBed.inject(NewCheckinService);
      // Manually assign mocked methods to service
      Object.assign(service, firestoreMock);
      mockFirestore = firestoreMock;
    });

    describe('📊 getUserTotalCheckinCount', () => {
      it('should return correct count for user with multiple check-ins', async () => {
        // Arrange
        const userId = 'test-user-123';
        const mockCheckins = [
          { id: '1', userId, pubId: 'pub1', dateKey: '2025-06-18' },
          { id: '2', userId, pubId: 'pub2', dateKey: '2025-06-19' },
          { id: '3', userId, pubId: 'pub1', dateKey: '2025-06-19' }
        ];
        mockFirestore.getDocsWhere.mockResolvedValue(mockCheckins);

        // Act
        const count = await service.getUserTotalCheckinCount(userId);

        // Assert
        expect(count).toBe(3);
        expect(mockFirestore.getDocsWhere).toHaveBeenCalledWith(
          'checkins',
          expect.any(Object) // where userId == test-user-123
        );
      });

      it('should return 0 for user with no check-ins', async () => {
        // Arrange
        const userId = 'new-user-123';
        mockFirestore.getDocsWhere.mockResolvedValue([]);

        // Act
        const count = await service.getUserTotalCheckinCount(userId);

        // Assert
        expect(count).toBe(0);
      });

      it('should handle Firestore errors gracefully', async () => {
        // Arrange
        const userId = 'test-user-123';
        mockFirestore.getDocsWhere.mockRejectedValue(new Error('Firestore unavailable'));

        // Act
        const count = await service.getUserTotalCheckinCount(userId);

        // Assert - Should return 0 on error
        expect(count).toBe(0);
      });
    });

    describe('🔍 isFirstEverCheckIn', () => {
      it('should return true for first visit to a pub', async () => {
        // Arrange
        const userId = 'test-user-123';
        const pubId = 'new-pub-123';

        // Mock getUserCheckinCount to return 1 (just created)
        mockFirestore.getDocsWhere.mockResolvedValue([
          { id: '1', userId, pubId, dateKey: '2025-06-19' }
        ]);

        // Act
        const isFirst = await service.isFirstEverCheckIn(userId, pubId);

        // Assert
        expect(isFirst).toBe(true);
      });

      it('should return false for repeat visit to a pub', async () => {
        // Arrange
        const userId = 'test-user-123';
        const pubId = 'visited-pub-123';

        // Mock getUserCheckinCount to return 2+ (multiple visits)
        mockFirestore.getDocsWhere.mockResolvedValue([
          { id: '1', userId, pubId, dateKey: '2025-06-18' },
          { id: '2', userId, pubId, dateKey: '2025-06-19' }
        ]);

        // Act
        const isFirst = await service.isFirstEverCheckIn(userId, pubId);

        // Assert
        expect(isFirst).toBe(false);
      });

      it('should handle errors gracefully and return false', async () => {
        // Arrange
        const userId = 'test-user-123';
        const pubId = 'test-pub-123';
        mockFirestore.getDocsWhere.mockRejectedValue(new Error('Network error'));

        // Act
        const isFirst = await service.isFirstEverCheckIn(userId, pubId);

        // Assert - Should return false on error
        expect(isFirst).toBe(false);
      });
    });

    describe('📚 getUserCheckinCount', () => {
      it('should return count for specific user-pub combination', async () => {
        // Arrange
        const userId = 'test-user-123';
        const pubId = 'test-pub-123';
        const mockCheckins = [
          { id: '1', userId, pubId, dateKey: '2025-06-18' },
          { id: '2', userId, pubId, dateKey: '2025-06-19' }
        ];
        mockFirestore.getDocsWhere.mockResolvedValue(mockCheckins);

        // Act
        const count = await service.getUserCheckinCount(userId, pubId);

        // Assert
        expect(count).toBe(2);
        expect(mockFirestore.getDocsWhere).toHaveBeenCalledWith(
          'checkins',
          expect.any(Object), // where userId == test-user-123
          expect.any(Object)  // where pubId == test-pub-123
        );
      });
    });

    describe('🔧 Integration Scenarios', () => {
      it('should correctly identify first-time vs repeat scenarios', async () => {
        // Arrange - First time user
        const newUserId = 'new-user-123';
        const pubId = 'test-pub-123';

        // Mock: 1 total check-in, 1 check-in to this pub
        mockFirestore.getDocsWhere
          .mockResolvedValueOnce([{ id: '1', userId: newUserId, pubId }]) // getUserCheckinCount
          .mockResolvedValueOnce([{ id: '1', userId: newUserId, pubId }]); // getUserTotalCheckinCount

        // Act
        const [isFirstVisit, totalCount] = await Promise.all([
          service.isFirstEverCheckIn(newUserId, pubId),
          service.getUserTotalCheckinCount(newUserId)
        ]);

        // Assert - Should be first visit and first ever
        expect(isFirstVisit).toBe(true);
        expect(totalCount).toBe(1);
      });

      it('should correctly identify experienced user scenarios', async () => {
        // Arrange - Experienced user
        const userId = 'experienced-user-123';
        const pubId = 'new-pub-for-them';

        // Mock: 1 check-in to this pub, but 10 total check-ins
        mockFirestore.getDocsWhere
          .mockResolvedValueOnce([{ id: '10', userId, pubId }]) // getUserCheckinCount: first visit to THIS pub
          .mockResolvedValueOnce(Array(10).fill(null).map((_, i) => ({ id: i, userId }))); // getUserTotalCheckinCount: 10 total

        // Act
        const [isFirstVisit, totalCount] = await Promise.all([
          service.isFirstEverCheckIn(userId, pubId),
          service.getUserTotalCheckinCount(userId)
        ]);

        // Assert - First visit to this pub, but not first ever
        expect(isFirstVisit).toBe(true);  // First time at THIS pub
        expect(totalCount).toBe(10);      // Experienced user overall
      });
    });
  });
});
