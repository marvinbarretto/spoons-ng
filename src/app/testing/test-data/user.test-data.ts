import type { User } from '../../users/utils/user.model';

export function createMockUser(overrides?: Partial<User>): User {
  return {
    uid: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
    emailVerified: true,
    isAnonymous: false,
    photoURL: null,
    joinedAt: new Date().toISOString(),
    totalPoints: 0,
    badgeCount: 0,
    badgeIds: [],
    landlordCount: 0,
    landlordPubIds: [],
    streaks: {},
    joinedMissionIds: [],
    ...overrides
  };
}

export function createAnonymousUser(uid: string = 'anon-user-id'): User {
  return createMockUser({
    uid,
    email: null,
    displayName: `Anonymous User ${uid.slice(0, 8)}`,
    isAnonymous: true,
    emailVerified: false
  });
}

export function createAuthenticatedUser(overrides?: Partial<User>): User {
  return createMockUser({
    uid: 'auth-user-id',
    email: 'authenticated@example.com',
    displayName: 'Authenticated User',
    emailVerified: true,
    isAnonymous: false,
    totalPoints: 100,
    badgeCount: 3,
    badgeIds: ['badge1', 'badge2', 'badge3'],
    ...overrides
  });
}