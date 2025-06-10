import { Timestamp } from "firebase/firestore";
import { CheckIn } from "../../check-in/utils/check-in.model";

export type Badge = {
  id: string;
  name: string;
  description: string;
  category?: string;
  icon?: string;
  iconUrl?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  criteria?: string;
  emoji?: string;
};

export type BadgeTriggerContext = {
  userId: string;
  checkIn: CheckIn;
  userCheckIns: CheckIn[];
  userBadges: EarnedBadge[];
};

export type EarnedBadge = {
  id: string;           // Unique ID for this earned badge record
  userId: string;       // Who earned it
  badgeId: string;      // Which badge was earned (references Badge.id)
  awardedAt: number;    // When it was earned (timestamp)
  metadata?: Record<string, any>; // Optional context data
};

// For creating new earned badges (omit auto-generated fields)
export type CreateEarnedBadge = Omit<EarnedBadge, 'id' | 'awardedAt'>;
