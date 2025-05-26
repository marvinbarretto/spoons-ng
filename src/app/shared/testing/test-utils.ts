import { User } from '../../users/utils/user.model';

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
