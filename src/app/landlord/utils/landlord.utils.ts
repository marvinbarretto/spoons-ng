// Safe landlord utilities
// src/app/landlord/utils/landlord.utils.ts
import { Landlord } from './landlord.model';
import { toDate, isToday } from '../../shared/utils/timestamp.utils';

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
    minute: '2-digit'
  });
}
