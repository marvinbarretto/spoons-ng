import { Timestamp } from "firebase/firestore";

export type Badge = {
  id: string;              // slug or UUID
  name: string;
  description: string;
  emoji: string;

  criteria: string;        // short machine-readable key e.g. 'first-checkin'
  createdAt: Timestamp;    // optional for ordering

  iconUrl?: string;
};
