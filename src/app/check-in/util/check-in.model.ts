import { Timestamp } from "firebase/firestore";

export type Checkin = {
  id: string;
  userId: string;
  pubId: string;
  timestamp: Timestamp;
  photoUrl?: string;
  location?: { lat: number; lng: number };
  dateKey?: string;
  distanceMeters?: number;
};
