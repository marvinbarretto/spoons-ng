import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { signal } from '@angular/core';
import { of } from 'rxjs';

// Services under test
import { DataAggregatorService } from '../../data-access/data-aggregator.service';
import { UserStore } from '../../../users/data-access/user.store';

// Dependencies
import { AuthStore } from '../../../auth/data-access/auth.store';
import { GlobalCheckInStore } from '../../../check-in/data-access/global-check-in.store';
import { PubStore } from '../../../pubs/data-access/pub.store';
import { UserService } from '../../../users/data-access/user.service';
import { CheckInService } from '../../../check-in/data-access/check-in.service';
import { CacheCoherenceService } from '../../data-access/cache-coherence.service';
import { ErrorLoggingService } from '../../data-access/error-logging.service';
import { DebugService } from '../../utils/debug.service';
import { Firestore } from '@angular/fire/firestore';

// Test utilities
import { createTestUser, createTestCheckIn, createTestPub } from '../test-data';

describe('UserStore + DataAggregator - Points Calculation Consistency', () => {
  let dataAggregator: DataAggregatorService;
  let userStore: UserStore;

  // Mock dependencies
  let mockAuthStore: any;
  let mockGlobalCheckInStore: any;
  let mockPubStore: any;
  let mockUserService: any;
  let mockCheckInService: any;
  let mockCacheCoherence: any;
  let mockErrorLoggingService: any;
  let mockDebugService: any;

  // Test data
  const testAuthUser = {
    uid: 'test-user-123',
    displayName: 'Test User',
    email: 'test@test.com',
    photoURL: 'https://test.com/avatar.jpg',
    isAnonymous: false,
  };

  const testUser = createTestUser({
    uid: 'test-user-123',
    displayName: 'Test User',
    email: 'test@test.com',
    photoURL: 'https://test.com/avatar.jpg',
    totalPoints: 1000, // This value should be ignored by the system
  });

  const testUsers = [testUser];

  const testCheckIns = [
    createTestCheckIn({ userId: 'test-user-123', pointsEarned: 10 }),
    createTestCheckIn({ userId: 'test-user-123', pointsEarned: 20 }),
    createTestCheckIn({ userId: 'test-user-123', pointsEarned: 30 }),
  ];

  const testPubs = [createTestPub({ id: 'test-pub-1' })];

  beforeEach(async () => {
    mockAuthStore = {
      user: signal(testAuthUser),
      uid: signal(testAuthUser.uid),
      refreshCurrentUser: vi.fn(),
    };

    mockGlobalCheckInStore = {
      allCheckIns: signal(testCheckIns),
      loading: signal(false),
    };

    mockPubStore = {
      totalCount: signal(testPubs.length),
      loading: signal(false),
      get: vi.fn((id: string) => testPubs.find(p => p.id === id)),
    };

    mockUserService = {
      allUsers: signal(testUsers),
      getUser: vi.fn(() => of(testUser)),
      updateUser: vi.fn().mockResolvedValue(testUser),
      loadAllUsers: vi.fn().mockResolvedValue(testUsers),
      getAllUsers: vi.fn().mockResolvedValue(testUsers),
    };

    mockCheckInService = {
      allCheckIns: signal(testCheckIns),
      loadAllCheckIns: vi.fn().mockResolvedValue(testCheckIns),
    };

    mockCacheCoherence = {
      invalidations: signal(null),
      invalidate: vi.fn(),
      invalidateMultiple: vi.fn(),
    };

    mockErrorLoggingService = {
      logError: vi.fn().mockResolvedValue(undefined),
    };

    mockDebugService = {
      standard: vi.fn(),
      extreme: vi.fn()
    };

    const firestoreMock = {
      collection: vi.fn(() => ({
        valueChanges: () => of([]),
      })),
      doc: vi.fn(() => ({
        valueChanges: () => of({}),
      })),
      updateDoc: vi.fn(() => Promise.resolve()),
    };

    await TestBed.configureTestingModule({
      providers: [
        DataAggregatorService,
        UserStore,
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: GlobalCheckInStore, useValue: mockGlobalCheckInStore },
        { provide: PubStore, useValue: mockPubStore },
        { provide: UserService, useValue: mockUserService },
        { provide: CheckInService, useValue: mockCheckInService },
        { provide: CacheCoherenceService, useValue: mockCacheCoherence },
        { provide: ErrorLoggingService, useValue: mockErrorLoggingService },
        { provide: DebugService, useValue: mockDebugService },
        { provide: Firestore, useValue: firestoreMock },
      ]
    }).compileComponents();

    dataAggregator = TestBed.inject(DataAggregatorService);
    userStore = TestBed.inject(UserStore);

    userStore._data.set(testUsers);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should ensure points are calculated consistently between UserStore and DataAggregatorService', () => {
    // 1. Calculate expected points from the source of truth (check-ins)
    const expectedPoints = testCheckIns.reduce((sum, checkin) => sum + (checkin.pointsEarned ?? 0), 0);
    expect(expectedPoints).toBe(60); // 10 + 20 + 30

    // 2. Get points directly from DataAggregatorService
    const aggregatorPoints = dataAggregator.calculateUserPointsFromCheckins(testAuthUser.uid);

    // 3. Get points from UserStore's reactive `totalPoints` signal
    const userStorePoints = userStore.totalPoints();

    // 4. Get points from UserStore's `scoreboardData` signal
    const scoreboardPoints = userStore.scoreboardData().totalPoints;

    // 5. Assert all values are consistent and correct
    expect(aggregatorPoints).toBe(expectedPoints);
    expect(userStorePoints).toBe(expectedPoints);
    expect(scoreboardPoints).toBe(expectedPoints);

    // 6. Log for clarity
    console.log('✅ Points Consistency Test Passed:', {
      expected: expectedPoints,
      dataAggregator: aggregatorPoints,
      userStoreSignal: userStorePoints,
      scoreboardSignal: scoreboardPoints
    });
  });
});
