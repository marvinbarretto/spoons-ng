/**
 * @fileoverview User model definitions for Cloud Functions
 * Mirrors the client-side user models in src/app/users/utils/user.model.ts
 */

export interface User {
  uid: string;
  email: string | null;
  photoURL: string | null;
  displayName: string | null;
  isAnonymous: boolean;
  emailVerified: boolean;
  
  // User metadata
  joinedAt: string;
  realUser?: boolean;
  
  // Stats tracking
  totalPoints: number;
  verifiedPubCount: number;
  unverifiedPubCount: number;
  totalPubCount: number;
  lastStatsUpdate?: string;
  
  // Gamification
  badgeCount: number;
  badgeIds: string[];
  landlordCount: number;
  landlordPubIds: string[];
  
  // User preferences  
  streaks: Record<string, any>;
  joinedMissionIds: string[];
  manuallyAddedPubIds: string[];
  
  // Onboarding
  onboardingCompleted?: boolean;
  homePubId?: string;
  homePubLocation?: any;
  homePubSetAt?: any;
}

export interface UserStats {
  totalPoints: number;
  verifiedPubCount: number;
  unverifiedPubCount: number;
  totalPubCount: number;
  totalCheckins: number;
  badgeCount: number;
  landlordCount: number;
  lastCalculatedAt: string;
}