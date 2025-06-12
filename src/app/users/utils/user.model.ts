import { EarnedBadge } from "../../badges/utils/badge.model";
import { getUserStage, UserStage } from "../../shared/utils/user-progression.models";

export type User = {
  uid: string;
  email?: string;
  displayName?: string;
  landlordOf: string[];
  claimedPubIds: string[];
  checkedInPubIds: string[];
  badges: EarnedBadge[];
  streaks: Record<string, number>;
  emailVerified: boolean;
  isAnonymous: boolean;
  photoURL?: string;
  joinedAt: string;
  readonly userStage: UserStage; // computed so readonly
};

/**
 * ✅ Factory function to create User objects with computed userStage
 * Perfect for AuthStore, UserStore, tests, and anywhere else
 */
export function createUser(userData: Omit<User, 'userStage'>): User {
  return {
    ...userData,
    get userStage(): UserStage {
      return getUserStage(this);
    }
  };
}

/**
 * ✅ Type guard for null safety
 */
export function isUser(user: User | null): user is User {
  return user !== null && typeof user === 'object' && 'uid' in user;
}
