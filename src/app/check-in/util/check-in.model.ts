import { Timestamp } from "firebase/firestore";

export type Checkin = {
  id: string;               // UUID or `${userId}_${pubId}_${yyyyMMdd}`
  userId: string;
  pubId: string;
  location: { lat: number; lng: number };
  timestamp: Timestamp;
  dateKey: string;          // '2025-05-27' — for uniqueness logic
  distanceMeters: number;
};
