import { EarnedBadge } from "../../badges/utils/badge.model";
import { getUserStage, UserStage } from "../../shared/utils/user-progression.models";

export type User = {
  uid: string;
  email: string | null;
  displayName: string;
  emailVerified: boolean;
  isAnonymous: boolean;
  photoURL: string | null;
  joinedAt: string;

  // Pub-related data
  checkedInPubIds: string[];
  streaks: Record<string, number>;
  joinedMissionIds: string[];

  // ✅ Badge summaries (for performance and quick queries)
  badgeCount: number;
  badgeIds: string[]; // For quick "has badge" checks

  // ✅ Landlord summaries (for performance and quick queries)
  landlordCount: number;
  landlordPubIds: string[]; // Current landlord positions

  // ✅ Remove the old badges array - this now comes from BadgeStore
  // The detailed badge data lives in the earnedBadges collection
};

// ✅ Type for user badge summary updates
export type UserBadgeSummary = {
  badgeCount: number;
  badgeIds: string[];
};

// ✅ Type for user landlord summary updates
export type UserLandlordSummary = {
  landlordCount: number;
  landlordPubIds: string[];
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
