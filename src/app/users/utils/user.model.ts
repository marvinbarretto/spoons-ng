import {
  getUserExperienceLevel,
  UserExperienceLevel,
} from '../../shared/utils/user-progression.models';

export type User = {
  uid: string;
  email: string | null;
  displayName: string;
  emailVerified: boolean;
  isAnonymous: boolean;
  photoURL: string | null;
  joinedAt: string;
  accentColor?: string;

  // Pub-related data
  streaks: Record<string, number>;
  joinedMissionIds: string[];
  homePubId?: string; // User's designated home pub for bonus points

  // ✅ Badge summaries (for performance and quick queries)
  badgeCount: number;
  badgeIds: string[]; // For quick "has badge" checks

  // ✅ Landlord summaries (for performance and quick queries)
  landlordCount: number;
  landlordPubIds: string[]; // Current landlord positions

  // ✅ Remove the old badges array - this now comes from BadgeStore
  // The detailed badge data lives in the earnedBadges collection

  UserExperienceLevel?: UserExperienceLevel; // TODO: Rename this, its awful

  totalPoints?: number; // ✅ Add this

  // ✅ Pub tracking fields
  manuallyAddedPubIds: string[]; // Pubs user manually marked as visited
  verifiedPubCount: number; // Pubs visited through app check-ins
  unverifiedPubCount: number; // Pubs manually added by user
  totalPubCount: number; // verifiedPubCount + unverifiedPubCount

  // Onboarding flow
  onboardingCompleted?: boolean; // Flag to track if user has completed initial setup
  hasSeenSplash?: boolean; // Flag to track if user has seen the splash screen
  realUser?: boolean; // Flag to protect alpha users from deletion during dev updates

  // Admin permissions
  isAdmin?: boolean; // Flag to grant admin access to management features

  // Regional/Location data
  region?: string; // User's region (e.g., "London", "Manchester", "Scotland")
  country?: string; // User's country (e.g., "United Kingdom", "Ireland")
  timezone?: string; // User's timezone for local time calculations
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
 * ✅ Factory function to create User objects with computed UserExperienceLevel
 * Perfect for AuthStore, UserStore, tests, and anywhere else
 */
export function createUser(userData: Omit<User, 'UserExperienceLevel'>): User {
  return {
    ...userData,
    get UserExperienceLevel(): UserExperienceLevel {
      return getUserExperienceLevel(this);
    },
  };
}

/**
 * ✅ Type guard for null safety
 */
export function isUser(user: User | null): user is User {
  return user !== null && typeof user === 'object' && 'uid' in user;
}
