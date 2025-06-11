import { EarnedBadge } from "../../badges/utils/badge.model";

export type User = {
  uid: string;
  email?: string;
  displayName?: string;
  landlordOf: string[]; // Pub IDs where user is landlord
  claimedPubIds: string[];
  checkedInPubIds: string[];
  badges: EarnedBadge[]; // ✅ Using EarnedBadge type
  streaks: Record<string, number>;
  joinedMissionIds: string[];
  emailVerified: boolean;
  isAnonymous: boolean;
  photoURL?: string;
  joinedAt: string; // ISO string
};
