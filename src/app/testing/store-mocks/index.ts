export * from './mock-auth.store';
export * from './mock-checkin.store';
export * from './mock-user.store';

// Service mocks (Firebase best practices - mock at service level)
export * from './mock-cache-coherence.service';
export * from './mock-earned-badge.service';
export * from './mock-landlord.service';
export * from './mock-user.service';

// Factory functions for quick creation with defaults
import type { CheckIn } from '../../check-in/utils/check-in.models';
import type { User } from '../../users/utils/user.model';
import { MockAuthStore } from './mock-auth.store';
import { MockCheckInStore } from './mock-checkin.store';
import { MockUserStore } from './mock-user.store';

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
