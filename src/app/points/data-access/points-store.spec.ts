import { TestBed } from '@angular/core/testing';
import { PointsStore } from './points.store';
import { PointsService } from './points.service';
import { AuthStore } from '@auth/data-access/auth.store';
import { PubStore } from '@pubs/data-access/pub.store';
import { CacheCoherenceService } from '@shared/data-access/cache-coherence.service';
import { ErrorLoggingService } from '@shared/data-access/error-logging.service';
import { signal } from '@angular/core';
import { PointsBreakdown, PointsTransaction } from '../utils/points.models';
import { Pub } from '@pubs/utils/pub.model';
import { vi } from 'vitest';
import { 
  createFirebaseAuthMock, 
  waitForEffects, 
  createMockUser,
  simulateAuthChange,
  expectInitialStoreState 
} from '@shared/testing';

const MOCK_USER = createMockUser();
const MOCK_TRANSACTIONS: PointsTransaction[] = [
    { id: 'tx1', points: 100, type: 'check-in', action: 'check-in', createdAt: Date.now(), userId: MOCK_USER.uid, pubId: 'pub1' }
];
const MOCK_PUBS: Pub[] = [
    { id: 'pub1', name: 'Test Pub', location: { latitude: 0, longitude: 0 } } as Pub,
];
const MOCK_POINTS_BREAKDOWN: PointsBreakdown = { base: 100, bonus: 20, distance: 10, multiplier: 1, total: 130, reason: 'test' };

describe('PointsStore', () => {
    let store: PointsStore;
    let pointsService: vi.Mocked<PointsService>;
    let mockAuth: ReturnType<typeof createFirebaseAuthMock>;
    let pubStore: vi.Mocked<PubStore>;
    let cacheCoherenceService: vi.Mocked<CacheCoherenceService>;
    let errorLoggingService: vi.Mocked<ErrorLoggingService>;

    beforeEach(() => {
        // Create fresh mock for each test
        mockAuth = createFirebaseAuthMock();

        TestBed.configureTestingModule({
            providers: [
                PointsStore,
                { provide: PointsService, useValue: {
                    getUserTotalPoints: vi.fn(),
                    getUserTransactions: vi.fn(),
                    createTransaction: vi.fn(),
                    updateUserTotalPoints: vi.fn(),
                    calculateCheckInPoints: vi.fn(),
                    calculateSocialPoints: vi.fn(),
                } },
                { provide: AuthStore, useValue: {
                    user: mockAuth.currentUser,
                    uid: signal(null),
                } },
                { provide: PubStore, useValue: {
                    data: vi.fn().mockReturnValue(signal(MOCK_PUBS)()),
                } },
                { provide: CacheCoherenceService, useValue: {
                    invalidate: vi.fn(),
                } },
                { provide: ErrorLoggingService, useValue: {
                    logPointsError: vi.fn(),
                } },
            ],
        });

        pointsService = TestBed.inject(PointsService) as vi.Mocked<PointsService>;
        pubStore = TestBed.inject(PubStore) as vi.Mocked<PubStore>;
        cacheCoherenceService = TestBed.inject(CacheCoherenceService) as vi.Mocked<CacheCoherenceService>;
        errorLoggingService = TestBed.inject(ErrorLoggingService) as vi.Mocked<ErrorLoggingService>;

        store = TestBed.inject(PointsStore);
    });

    it('should be created', () => {
        expect(store).toBeTruthy();
        expect(store.totalPoints()).toBe(0);
        expect(store.recentTransactions()).toEqual([]);
        expect(store.loading()).toBe(false);
        expect(store.error()).toBe(null);
    });

    describe('Auth-Reactive Behavior', () => {
        it('should load data when a new user logs in', async () => {
            // ARRANGE: Set up service mocks to return test data
            pointsService.getUserTotalPoints.mockResolvedValue(500);
            pointsService.getUserTransactions.mockResolvedValue(MOCK_TRANSACTIONS);

            // ARRANGE: Start with no authenticated user
            await simulateAuthChange(mockAuth, null);

            // ACT: Simulate user login - triggers automatic loading via auth effects
            await simulateAuthChange(mockAuth, MOCK_USER, 2); // Auth + loading cycles

            // ASSERT: Verify auth-reactive loading was triggered
            expect(pointsService.getUserTotalPoints).toHaveBeenCalledWith(MOCK_USER.uid);
            expect(pointsService.getUserTransactions).toHaveBeenCalledWith(MOCK_USER.uid, 20);
            expect(store.totalPoints()).toBe(500);
            expect(store.recentTransactions()).toEqual(MOCK_TRANSACTIONS);
        });

        it('should reset data when user logs out', async () => {
            // ARRANGE: Start with authenticated user and load data
            await simulateAuthChange(mockAuth, MOCK_USER);
            pointsService.getUserTotalPoints.mockResolvedValue(300);
            pointsService.getUserTransactions.mockResolvedValue(MOCK_TRANSACTIONS);

            // ACT: Load data to establish baseline
            await store.load();
            expect(store.totalPoints()).toBe(300);
            expect(store.recentTransactions()).toEqual(MOCK_TRANSACTIONS);

            // ACT: Simulate user logout - triggers automatic data clearing
            await simulateAuthChange(mockAuth, null);

            // ASSERT: Data should be cleared by auth-reactive reset
            expect(store.totalPoints()).toBe(0);
            expect(store.recentTransactions()).toEqual([]);
        });

        it('should not load data when no user is authenticated', async () => {
            // ARRANGE & ACT: No authenticated user from start
            await simulateAuthChange(mockAuth, null);

            // ACT: Try to load data
            store.loadOnce();
            await waitForEffects();

            // ASSERT: Service should not be called
            expect(pointsService.getUserTotalPoints).not.toHaveBeenCalled();
            expect(pointsService.getUserTransactions).not.toHaveBeenCalled();
            expect(store.totalPoints()).toBe(0);
        });
    });

    describe('Points calculation and awarding', () => {
        it('should award check-in points correctly', async () => {
            // ARRANGE: Set up authenticated user and service mocks
            await simulateAuthChange(mockAuth, MOCK_USER);

            const mockCheckInData = {
                pubId: 'pub1',
                distance: 1000,
                isFirstVisit: true,
                streakBonus: 0
            };

            pointsService.calculateCheckInPoints.mockReturnValue(MOCK_POINTS_BREAKDOWN);
            pointsService.createTransaction.mockResolvedValue({
                id: 'tx123',
                ...mockCheckInData,
                points: 130,
                userId: MOCK_USER.uid,
                type: 'check-in',
                action: 'check-in',
                createdAt: Date.now()
            } as any);
            pointsService.updateUserTotalPoints.mockResolvedValue();

            // ACT: Award points
            await store.awardCheckInPoints(mockCheckInData);

            // ASSERT: Verify points calculation and awarding
            expect(pointsService.calculateCheckInPoints).toHaveBeenCalledWith(
                mockCheckInData,
                expect.any(Object), // checkInPub
                null // homePub
            );
            expect(store.totalPoints()).toBe(130);
        });

        it('should handle points calculation errors gracefully', async () => {
            // ARRANGE: Set up authenticated user and error scenario
            await simulateAuthChange(mockAuth, MOCK_USER);

            const mockCheckInData = { pubId: 'pub1', distance: 1000, isFirstVisit: true, streakBonus: 0 };
            const error = new Error('Calculation failed');
            pointsService.calculateCheckInPoints.mockImplementation(() => { throw error; });

            // ACT & ASSERT: Verify error handling
            await expect(store.awardCheckInPoints(mockCheckInData)).rejects.toThrow('Calculation failed');
            expect(store.error()).toContain('Calculation failed');
        });
    });
});
