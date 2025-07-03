export * from './mock-auth.store';
export * from './mock-user.store';
export * from './mock-checkin.store';

// Factory functions for quick creation with defaults
import { MockAuthStore } from './mock-auth.store';
import { MockUserStore } from './mock-user.store';
import { MockCheckInStore } from './mock-checkin.store';
import type { User } from '../../users/utils/user.model';
import type { CheckIn } from '../../check-in/utils/check-in.models';

export function createMockAuthStore(user?: Partial<User>): MockAuthStore {
  const store = new MockAuthStore();
  if (user) {
    store.setUser(user as User);
  }
  return store;
}

export function createMockUserStore(user?: Partial<User>): MockUserStore {
  const store = new MockUserStore();
  if (user) {
    store.setUser(user as User);
  }
  return store;
}

export function createMockCheckInStore(checkins?: CheckIn[]): MockCheckInStore {
  const store = new MockCheckInStore();
  if (checkins) {
    store.setCheckins(checkins);
  }
  return store;
}