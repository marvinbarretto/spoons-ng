import { Timestamp } from 'firebase/firestore';
import { CheckIn } from '../../check-in/utils/check-in.models';
import { Landlord } from '../../landlord/utils/landlord.model';

export type Pub = {
  id: string;
  name: string;
  address: string;
  city?: string;
  region?: string;
  country?: string;

  location: { lat: number; lng: number };

  carpetUrl?: string;
  hasCarpet?: boolean; // 🆕 Flag indicating if pub has carpet stored
  carpetUpdatedAt?: Timestamp; // 🆕 When carpet status was last updated

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

// ✅ CLEAN TYPE: distance is always number
// - When location available: actual distance in meters
// - When no location: Infinity (sorts to bottom, filters work consistently)
export type PubWithDistance = Pub & {
  distance: number;
};

// ✅ Type guard for checking if pub has valid distance
export function hasValidDistance(pub: PubWithDistance): boolean {
  return pub.distance !== Infinity && pub.distance >= 0;
}

// ✅ Helper for formatting distance display
export function formatDistance(distance: number): string {
  if (distance === Infinity) {
    return 'Distance unknown';
  }

  if (distance < 1000) {
    return `${Math.round(distance)}m`;
  }

  return `${(distance / 1000).toFixed(1)}km`;
}
