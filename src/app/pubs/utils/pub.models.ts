
import { Timestamp } from "firebase/firestore";
import { CheckIn } from "../../check-in/utils/check-in.model";
import { Landlord } from "../../landlord/utils/landlord.model";

export type Pub = {
  id: string;
  name: string;
  address: string;
  city?: string;
  region?: string;
  country?: string;

  location: { lat: number; lng: number };

  carpetUrl?: string;

  lastCheckinAt?: Timestamp;
  checkinCount?: number;

  recordEarlyCheckinAt?: Timestamp;
  recordLatestCheckinAt?: Timestamp;
  longestStreak?: number;

  currentLandlord?: Landlord;
  todayLandlord?: Landlord;

  landlordHistory?: Landlord[];
  checkinHistory?: CheckIn[];
};
