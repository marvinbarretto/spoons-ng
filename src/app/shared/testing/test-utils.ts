import { createUser, User } from '../../users/utils/user.model';

export function getMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    documentId: 'doc-mock',
    username: 'mockuser',
    email: 'mock@example.com',
    provider: 'local',
    confirmed: true,
    blocked: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    locale: null,
    role: {
      id: 1,
      name: 'Authenticated',
      description: 'Mock role',
      type: 'authenticated',
    },
    ...overrides,
  };
}


// TODO: Mend and updatethis...
export function createTestUser(overrides: Partial<Omit<User, 'userStage'>> = {}): User {
  const defaultData: Omit<User, 'userStage'> = {
    uid: `test-user-${Math.random().toString(36).substr(2, 9)}`,
    email: 'test@example.com',
    displayName: 'Test User',
    landlordOf: [],
    claimedPubIds: [],
    checkedInPubIds: [],
    badges: [],
    streaks: {},
    emailVerified: true,
    isAnonymous: false,
    joinedAt: new Date().toISOString(),
    ...overrides
  };

  return createUser(defaultData);
}
