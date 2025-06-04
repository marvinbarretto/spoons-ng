// Update the landlord model to be more flexible
// src/app/landlord/utils/landlord.model.ts
import { Timestamp } from "firebase/firestore";

export interface Landlord {
  id: string;
  userId: string;
  pubId: string;
  claimedAt: Timestamp | { seconds: number; nanoseconds?: number } | string | number;
  dateKey: string; // YYYY-MM-DD format
  isActive: boolean;
  streakDays?: number;
}
