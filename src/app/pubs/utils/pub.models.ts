import { Timestamp } from "firebase/firestore";

export type Pub = {
  id: string;
  name: string;
  address: string;
  city?: string;
  region?: string;
  country?: string;

  location: {
    lat: number;
    lng: number;
  };

  carpetUrl?: string;
  landlordId?: string; // ⛔️ can remove this if replaced by landlordToday

  lastCheckinAt?: Timestamp;
  checkinCount?: number;
  recordEarlyCheckinAt?: Timestamp;
  recordLatestCheckinAt?: Timestamp;
  longestStreak?: number;

  landlordToday?: {
    userId: string;
    date: string; // 'YYYY-MM-DD', local
  };

  landlordHistory?: {
    userId: string;
    date: string;
  }[];
};
