// Safe landlord utilities
// src/app/landlord/utils/landlord.utils.ts
import { isToday, toDate } from '../../shared/utils/timestamp.utils';
import { Landlord } from './landlord.model';

export function isLandlordActive(landlord: Landlord): boolean {
  if (!landlord.isActive) return false;

  // Check if the landlord claim is from today
  const claimDate = toDate(landlord.claimedAt);
  return claimDate ? isToday(claimDate) : false;
}

export function getLandlordDisplayName(landlord: Landlord): string {
  // TODO: Replace with actual user name lookup
  return landlord.userId.substring(0, 8) + '...';
}

export function formatLandlordClaim(landlord: Landlord): string {
  const date = toDate(landlord.claimedAt);
  if (!date) return 'Unknown time';

  if (isToday(date)) {
    return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
