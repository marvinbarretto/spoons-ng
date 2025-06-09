import { Timestamp } from "firebase/firestore";

export type Badge = {
  id: string;              // slug or UUID
  name: string;
  description: string;
  icon?: string;
  iconUrl?: string;
  createdAt?: Timestamp;
  criteria?: string;
  emoji?: string;
};
