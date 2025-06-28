import { TestBed } from '@angular/core/testing';

import { CheckInStore } from './check-in.store';
import { AuthStore } from '../../auth/data-access/auth.store';
import { PointsStore } from '../../points/data-access/points.store';
import { PubStore } from '../../pubs/data-access/pub.store';
import { CheckInService } from './check-in.service';

describe('CheckInStore', () => {
  let store: CheckInStore;
  let mockService: jest.Mocked<CheckInService>;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(CheckInStore);
    mockService = TestBed.inject(CheckInService) as jest.Mocked<CheckInService>;
  });


  describe('🎯 Points & Success Flow Integration', () => {
    beforeEach(() => {
      // Add additional mocks for new dependencies
      const pointsStoreMock = {
        awardCheckInPoints: jest.fn()
      };
      const authStoreMock = {
        uid: jest.fn(() => 'test-user-123')
      };
      const pubStoreMock = {
        get: jest.fn()
      };

      TestBed.configureTestingModule({
        providers: [
          CheckInStore,
          { provide: CheckInService, useValue: mockService },
          { provide: PointsStore, useValue: pointsStoreMock },
          { provide: AuthStore, useValue: authStoreMock },
          { provide: PubStore, useValue: pubStoreMock }
        ]
      });

      // Re-inject with new mocks
      store = TestBed.inject(CheckInStore);
      mockService = TestBed.inject(CheckInService) as jest.Mocked<CheckInService>;
    });

    it('should handle complete success flow with points integration', async () => {
      // Arrange
      const pubId = 'test-pub-123';
      const pub = { id: pubId, name: 'Test Pub', location: { lat: 51.5, lng: -0.1 } };

      mockService.canCheckIn.mockResolvedValue({ allowed: true });
      mockService.createCheckin.mockResolvedValue(undefined);

      // Mock new service methods
      mockService.getUserTotalCheckinCount = jest.fn().mockResolvedValue(1); // First ever!
      mockService.isFirstEverCheckIn = jest.fn().mockResolvedValue(true);

      const mockPointsStore = TestBed.inject(PointsStore) as any;
      const mockPubStore = TestBed.inject(PubStore) as any;

      mockPubStore.get.mockReturnValue(pub);
      mockPointsStore.awardCheckInPoints.mockResolvedValue({
        base: 5,
        bonus: 25, // First ever bonus
        distance: 0,
        total: 30
      });

      // Act
      await store.checkinToPub(pubId);

      // Assert - All the new integration calls
      expect(mockService.getUserTotalCheckinCount).toHaveBeenCalledWith('test-user-123');
      expect(mockService.isFirstEverCheckIn).toHaveBeenCalledWith('test-user-123', pubId);
      expect(mockPointsStore.awardCheckInPoints).toHaveBeenCalledWith({
        pubId,
        distanceFromHome: 0,
        isFirstVisit: true,
        isFirstEver: true,
        currentStreak: 0,
        hasPhoto: false,
        sharedSocial: false
      });
    });

    it('should handle first-ever check-in with home pub detection', async () => {
      // Arrange
      const pubId = 'first-pub-123';

      mockService.canCheckIn.mockResolvedValue({ allowed: true });
      mockService.createCheckin.mockResolvedValue(undefined);
      mockService.getUserTotalCheckinCount = jest.fn().mockResolvedValue(1); // First ever!

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await store.checkinToPub(pubId);

      // Assert - Home pub detection triggered
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[CheckInStore] 🏠 First ever check-in detected!')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[CheckInStore] 🏠 [TODO] Show overlay: "Is this your local pub?"')
      );

      consoleSpy.mockRestore();
    });

    it('should NOT trigger home pub flow for repeat users', async () => {
      // Arrange
      const pubId = 'test-pub-123';

      mockService.canCheckIn.mockResolvedValue({ allowed: true });
      mockService.createCheckin.mockResolvedValue(undefined);
      mockService.getUserTotalCheckinCount = jest.fn().mockResolvedValue(5); // Not first!

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await store.checkinToPub(pubId);

      // Assert - NO home pub detection
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('🏠 First ever check-in detected!')
      );

      consoleSpy.mockRestore();
    });

    it('should handle points calculation failure gracefully', async () => {
      // Arrange
      const pubId = 'test-pub-123';

      mockService.canCheckIn.mockResolvedValue({ allowed: true });
      mockService.createCheckin.mockResolvedValue(undefined);
      mockService.getUserTotalCheckinCount = jest.fn().mockResolvedValue(2);

      const mockPointsStore = TestBed.inject(PointsStore) as any;
      mockPointsStore.awardCheckInPoints.mockRejectedValue(new Error('Points service down'));

      // Act - Should not throw
      await store.checkinToPub(pubId);

      // Assert - Check-in still completes
      expect(mockService.createCheckin).toHaveBeenCalled();
      expect(store.isProcessing()).toBe(false);
    });
  });

  describe('🔧 Success Data Assembly', () => {
    it('should assemble complete success data with all context', async () => {
      // Arrange
      const pubId = 'test-pub-123';
      const pub = { id: pubId, name: 'Test Pub' };

      mockService.canCheckIn.mockResolvedValue({ allowed: true });
      mockService.createCheckin.mockResolvedValue(undefined);
      mockService.getUserTotalCheckinCount = jest.fn().mockResolvedValue(3);
      mockService.isFirstEverCheckIn = jest.fn().mockResolvedValue(false);

      const mockPointsStore = TestBed.inject(PointsStore) as any;
      const mockPubStore = TestBed.inject(PubStore) as any;

      mockPubStore.get.mockReturnValue(pub);
      mockPointsStore.awardCheckInPoints.mockResolvedValue({ total: 5, base: 5, bonus: 0 });

      // Spy on the showCheckInResults method
      const showResultsSpy = jest.spyOn(store as any, 'showCheckInResults').mockImplementation();

      // Act
      await store.checkinToPub(pubId);

      // Assert - Success data structure
      expect(showResultsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          checkin: expect.objectContaining({
            userId: 'test-user-123',
            pubId: 'test-pub-123'
          }),
          pub: expect.objectContaining({
            id: pubId,
            name: 'Test Pub'
          }),
          points: expect.objectContaining({
            total: 5
          }),
          isFirstEver: false,
          debugInfo: expect.objectContaining({
            flow: 'CheckInStore',
            userId: 'test-user-123',
            isFirstEver: false,
            totalCheckins: 3
          })
        })
      );

      showResultsSpy.mockRestore();
    });
  });
});
