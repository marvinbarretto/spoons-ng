import { Timestamp } from "firebase/firestore";

export type Pub = {
  id: string;
  name: string;
  address: string;
  city?: string;
  region?: string;
  country?: string; // to add
  location: {
    lat: number;
    lng: number;
  };
  carpetUrl?: string;
  landlordId?: string;
  lastCheckinAt?: Timestamp;

  checkinCount?: number;
  recordEarlyCheckinAt?: Timestamp;
  recordLatestCheckinAt?: Timestamp;
  longestStreak?: number;
};
